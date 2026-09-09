import { ApiConfig, Preset } from '@/types';

export interface StreamParams {
  rawInput: string;
  preset: Preset | null;
  config: ApiConfig;
  signal: AbortSignal;
  onChunk: (chunk: string) => void;
  onError: (error: string) => void;
  onComplete: () => void;
}

/**
 * Normalizes an OpenAI-compatible base URL into the full chat completions endpoint.
 * e.g. "https://api.openai.com/v1" -> "https://api.openai.com/v1/chat/completions"
 * e.g. "http://localhost:11434/v1" -> "http://localhost:11434/v1/chat/completions"
 */
export function normalizeEndpoint(baseUrl: string): string {
  let url = (baseUrl || '').trim();
  if (!url) {
    url = 'https://api.openai.com/v1';
  }

  // Remove trailing slashes
  while (url.endsWith('/')) {
    url = url.slice(0, -1);
  }

  if (url.endsWith('/chat/completions')) {
    return url;
  }

  if (url.endsWith('/v1')) {
    return `${url}/chat/completions`;
  }

  return `${url}/v1/chat/completions`;
}

/**
 * Normalizes an OpenAI-compatible base URL into the models endpoint.
 * e.g. "https://api.openai.com/v1" -> "https://api.openai.com/v1/models"
 * e.g. "https://api.openai.com/v1/chat/completions" -> "https://api.openai.com/v1/models"
 * e.g. "http://localhost:11434/v1" -> "http://localhost:11434/v1/models"
 */
export function normalizeModelsEndpoint(baseUrl: string): string {
  let url = (baseUrl || '').trim();
  if (!url) {
    url = 'https://api.openai.com/v1';
  }

  while (url.endsWith('/')) {
    url = url.slice(0, -1);
  }

  if (url.endsWith('/chat/completions')) {
    return url.replace(/\/chat\/completions$/, '/models');
  }

  if (url.endsWith('/v1')) {
    return `${url}/models`;
  }

  return `${url}/v1/models`;
}

function parseModelsFromJson(json: unknown): string[] {
  const modelIds: string[] = [];

  if (Array.isArray(json)) {
    for (const item of json) {
      if (typeof item === 'string') modelIds.push(item);
      else if (item && typeof item === 'object') {
        const id = (item as Record<string, unknown>).id ||
                   (item as Record<string, unknown>).name ||
                   (item as Record<string, unknown>).model;
        if (typeof id === 'string') modelIds.push(id);
      }
    }
  } else if (json && typeof json === 'object') {
    const record = json as Record<string, unknown>;
    const list = Array.isArray(record.data)
      ? record.data
      : Array.isArray(record.models)
      ? record.models
      : Array.isArray(record.items)
      ? record.items
      : [];

    for (const item of list) {
      if (typeof item === 'string') modelIds.push(item);
      else if (item && typeof item === 'object') {
        const id = (item as Record<string, unknown>).id ||
                   (item as Record<string, unknown>).name ||
                   (item as Record<string, unknown>).model;
        if (typeof id === 'string') modelIds.push(id);
      }
    }
  }

  return Array.from(new Set(modelIds.map((m) => m.trim()).filter(Boolean))).sort();
}

/**
 * Queries an OpenAI-compatible /v1/models endpoint to retrieve all available model identifiers.
 * Uses the server proxy /api/models for remote endpoints to eliminate browser CORS blocks.
 */
export async function fetchEndpointModels(
  baseUrl: string,
  apiKey?: string,
  signal?: AbortSignal
): Promise<string[]> {
  const isLocal = baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1');

  if (isLocal) {
    try {
      const endpoint = normalizeModelsEndpoint(baseUrl);
      const headers: Record<string, string> = {
        Accept: 'application/json',
      };
      if (apiKey && apiKey.trim().length > 0) {
        headers['Authorization'] = `Bearer ${apiKey.trim()}`;
      }
      const localRes = await fetch(endpoint, { method: 'GET', headers, signal });
      if (localRes.ok) {
        const json = await localRes.json();
        return parseModelsFromJson(json);
      }
    } catch {
      // Fallback to proxy
    }
  }

  // Use server-side proxy to bypass CORS restrictions
  const res = await fetch('/api/models', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ baseUrl, apiKey }),
    signal,
  });

  if (!res.ok) {
    let errorMsg = `HTTP ${res.status}: ${res.statusText}`;
    try {
      const errJson = await res.json();
      if (errJson?.error) {
        errorMsg = errJson.error;
      }
    } catch {
      // Ignore
    }
    throw new Error(errorMsg);
  }

  const json = await res.json();
  return Array.isArray(json.models) ? json.models : [];
}

/**
 * Extracts delta text from an OpenAI /v1 chunk, supporting both standard content
 * and reasoning/thinking tokens from models like DeepSeek-R1, QwQ, etc.
 */
function extractDeltaContent(json: unknown): string {
  if (!json || typeof json !== 'object') return '';
  const obj = json as Record<string, unknown>;
  const choices = Array.isArray(obj.choices) ? obj.choices : [];
  if (choices.length === 0 || !choices[0] || typeof choices[0] !== 'object') {
    return '';
  }

  const choice = choices[0] as Record<string, unknown>;
  const delta = choice.delta && typeof choice.delta === 'object' 
    ? (choice.delta as Record<string, unknown>) 
    : null;

  if (delta) {
    // In deepseek / xKiro reasoning models, delta.content has the actual prompt text.
    // delta.reasoning_content has the hidden internal thought chain.
    // We return delta.content to ensure the user gets pure, production-ready prompts.
    if (typeof delta.content === 'string') {
      return delta.content;
    }
  }

  // Legacy completion format fallback
  if (typeof choice.text === 'string' && choice.text.length > 0) {
    return choice.text;
  }

  return '';
}

/**
 * Robust, production-grade SSE Parser and Stream Engine for OpenAI /v1 endpoints.
 * Routes remote endpoints through /api/chat to bypass browser CORS constraints.
 * Handles CRLF/LF line chunking, multi-byte UTF-8, immediate reader cancellation,
 * and memory cleanup without leaking AbortSignal listeners.
 */
export async function streamPromptTransformation({
  rawInput,
  preset,
  config,
  signal,
  onChunk,
  onError,
  onComplete,
}: StreamParams): Promise<void> {
  const endpoint = normalizeEndpoint(config.baseUrl);

  // Guard against early cancellation
  if (signal.aborted) {
    onComplete();
    return;
  }

  // Construct message payload
  const systemDirective = preset?.system_prompt?.trim() || 
    'You are an elite prompt engineering specialist. Translate the user raw input into a highly structured, effective prompt for frontier LLMs. Output ONLY the optimized prompt without any meta commentary.';

  const messages: Array<{ role: 'system' | 'user'; content: string }> = [
    { role: 'system', content: systemDirective },
    { role: 'user', content: rawInput.trim() },
  ];

  const effectiveTemperature = typeof preset?.temperature === 'number' 
    ? preset.temperature 
    : (typeof config.temperature === 'number' ? config.temperature : 0.7);

  const isLocal = config.baseUrl.includes('localhost') || config.baseUrl.includes('127.0.0.1');

  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  let abortHandler: (() => void) | null = null;

  try {
    let response: Response;

    if (isLocal) {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream, application/json',
      };
      if (config.apiKey && config.apiKey.trim().length > 0) {
        headers['Authorization'] = `Bearer ${config.apiKey.trim()}`;
      }
      response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: config.model || 'deepseek/deepseek-v4-flash',
          messages,
          stream: true,
          temperature: effectiveTemperature,
          max_tokens: config.maxTokens,
        }),
        signal,
      });
    } else {
      // Remote endpoint (xKiro, OpenAI, OpenRouter, etc.) -> route through /api/chat server proxy
      response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint,
          baseUrl: config.baseUrl,
          apiKey: config.apiKey,
          model: config.model || 'deepseek/deepseek-v4-flash',
          messages,
          stream: true,
          temperature: effectiveTemperature,
          max_tokens: config.maxTokens,
        }),
        signal,
      });
    }

    if (signal.aborted) {
      onComplete();
      return;
    }

    if (!response.ok) {
      let errorMessage = `HTTP Error ${response.status}: ${response.statusText}`;
      try {
        const errorJson = await response.json();
        if (errorJson?.error?.message) {
          errorMessage = errorJson.error.message;
        } else if (typeof errorJson?.message === 'string') {
          errorMessage = errorJson.message;
        } else if (typeof errorJson === 'string') {
          errorMessage = errorJson;
        }
      } catch {
        try {
          const rawText = await response.text();
          if (rawText && rawText.length < 300) {
            errorMessage = rawText;
          }
        } catch {
          // Ignore
        }
      }

      if (response.status === 401) {
        errorMessage = 'Invalid or missing API key. Please check your API configuration in Settings.';
      } else if (response.status === 404) {
        errorMessage = `Endpoint not found (${endpoint}). Check your Base URL and model identifier.`;
      } else if (response.status === 429) {
        errorMessage = 'Rate limit or quota exceeded on the target provider.';
      }

      onError(errorMessage);
      return;
    }

    if (!response.body) {
      onError('The response body is empty or streaming is unsupported by the remote server.');
      return;
    }

    reader = response.body.getReader();

    // Hook instant reader cancellation on abort
    abortHandler = () => {
      if (reader) {
        reader.cancel().catch(() => {});
      }
    };
    signal.addEventListener('abort', abortHandler, { once: true });

    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process complete lines, handling CRLF (\r\n) or LF (\n)
      let lineEndIndex: number;
      while ((lineEndIndex = buffer.indexOf('\n')) !== -1) {
        let line = buffer.slice(0, lineEndIndex);
        buffer = buffer.slice(lineEndIndex + 1);

        if (line.endsWith('\r')) {
          line = line.slice(0, -1);
        }

        const trimmed = line.trim();
        // Skip empty lines and SSE comments
        if (!trimmed || trimmed.startsWith(':')) {
          continue;
        }

        if (trimmed.startsWith('data:')) {
          const dataContent = trimmed.slice(5).trim();
          if (dataContent === '[DONE]') {
            continue;
          }

          try {
            const parsed = JSON.parse(dataContent);
            const chunkText = extractDeltaContent(parsed);
            if (chunkText) {
              onChunk(chunkText);
            }
          } catch {
            // Ignore incomplete or non-JSON heartbeats
          }
        }
      }
    }

    // Flush any remaining characters in decoder
    buffer += decoder.decode();
    if (buffer.trim()) {
      const trimmed = buffer.trim();
      if (trimmed.startsWith('data:')) {
        const dataContent = trimmed.slice(5).trim();
        if (dataContent !== '[DONE]') {
          try {
            const parsed = JSON.parse(dataContent);
            const chunkText = extractDeltaContent(parsed);
            if (chunkText) {
              onChunk(chunkText);
            }
          } catch {
            // Ignore
          }
        }
      }
    }

    onComplete();
  } catch (err: unknown) {
    if (signal.aborted) {
      onComplete();
    } else {
      let msg = err instanceof Error ? err.message : 'Failed to connect to API endpoint.';
      if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
        msg = `Network or CORS error. If using a local provider (Ollama/LM Studio), verify CORS is allowed. If remote, check connectivity to: ${endpoint}`;
      }
      onError(msg);
    }
  } finally {
    // Remove abort listener to prevent memory leaks
    if (abortHandler) {
      signal.removeEventListener('abort', abortHandler);
    }
    // Clean up reader lock safely
    if (reader) {
      try {
        reader.releaseLock();
      } catch {
        // Reader was cancelled or closed
      }
    }
  }
}
