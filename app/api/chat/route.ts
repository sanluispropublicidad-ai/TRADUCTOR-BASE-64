import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Normalizes an OpenAI-compatible base URL into the full chat completions endpoint.
 */
function normalizeEndpoint(baseUrl?: string): string {
  let url = (baseUrl || '').trim();
  if (!url) {
    url = 'https://api.xkiro.com/v1';
  }

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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      endpoint: rawEndpoint,
      baseUrl,
      apiKey,
      model,
      messages,
      stream = true,
      temperature,
      max_tokens,
    } = body;

    const targetUrl = rawEndpoint && rawEndpoint.trim() 
      ? rawEndpoint.trim() 
      : normalizeEndpoint(baseUrl);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': stream ? 'text/event-stream, application/json' : 'application/json',
    };

    const trimmedKey = (apiKey || '').trim();
    if (trimmedKey) {
      headers['Authorization'] = `Bearer ${trimmedKey}`;
      headers['x-api-key'] = trimmedKey;
    }

    if (targetUrl.includes('openrouter.ai')) {
      headers['HTTP-Referer'] = 'https://prompt-translator.app';
      headers['X-Title'] = 'Prompt Translator';
    }

    const payload: Record<string, unknown> = {
      model: model || 'deepseek/deepseek-v4-flash',
      messages: Array.isArray(messages) ? messages : [],
      stream: Boolean(stream),
    };

    if (typeof temperature === 'number' && Number.isFinite(temperature)) {
      payload.temperature = temperature;
    }

    if (typeof max_tokens === 'number' && max_tokens > 0) {
      payload.max_tokens = max_tokens;
    }

    const startTime = Date.now();
    console.log(`[Prompt Translator] [POST /api/chat] Inbound request -> target: ${targetUrl} | model: ${payload.model} | stream: ${Boolean(stream)} | messages: ${(messages || []).length}`);

    // Call upstream server from Node.js (bypasses browser CORS completely)
    const upstreamRes = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const elapsedMs = Date.now() - startTime;
    console.log(`[Prompt Translator] [POST /api/chat] Upstream response HTTP ${upstreamRes.status} in ${elapsedMs}ms`);

    if (!upstreamRes.ok) {
      let errDesc = `HTTP ${upstreamRes.status}: ${upstreamRes.statusText}`;
      try {
        const errJson = await upstreamRes.json();
        if (errJson?.error?.message) {
          errDesc = errJson.error.message;
        } else if (typeof errJson?.message === 'string') {
          errDesc = errJson.message;
        }
      } catch {
        try {
          const rawText = await upstreamRes.text();
          if (rawText) errDesc = rawText.slice(0, 300);
        } catch {
          // Ignore
        }
      }
      console.error(`[Prompt Translator] [POST /api/chat] Upstream error: ${errDesc}`);
      return NextResponse.json({ error: errDesc }, { status: upstreamRes.status });
    }

    if (stream) {
      if (!upstreamRes.body) {
        return NextResponse.json(
          { error: 'Upstream response has no body for streaming.' },
          { status: 502 }
        );
      }

      return new Response(upstreamRes.body, {
        status: upstreamRes.status,
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no',
        },
      });
    }

    const data = await upstreamRes.json();
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
