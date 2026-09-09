import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function normalizeModelsEndpoint(baseUrl?: string): string {
  let url = (baseUrl || '').trim();
  if (!url) {
    url = 'https://api.xkiro.com/v1';
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { baseUrl, apiKey } = body;

    const endpoint = normalizeModelsEndpoint(baseUrl);
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };

    const trimmedKey = (apiKey || '').trim();
    if (trimmedKey) {
      headers['Authorization'] = `Bearer ${trimmedKey}`;
      headers['x-api-key'] = trimmedKey;
    }

    const startTime = Date.now();
    console.log(`[Prompt Translator] [POST /api/models] Fetching models list from: ${endpoint}`);

    const upstreamRes = await fetch(endpoint, {
      method: 'GET',
      headers,
    });

    const elapsedMs = Date.now() - startTime;
    console.log(`[Prompt Translator] [POST /api/models] Upstream response HTTP ${upstreamRes.status} in ${elapsedMs}ms`);

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
        // Ignore
      }
      console.error(`[Prompt Translator] [POST /api/models] Upstream error: ${errDesc}`);
      return NextResponse.json({ error: errDesc }, { status: upstreamRes.status });
    }

    const json = await upstreamRes.json();
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

    const unique = Array.from(new Set(modelIds.map((m) => m.trim()).filter(Boolean)));
    return NextResponse.json({ models: unique.sort() });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch models';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
