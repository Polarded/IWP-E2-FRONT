import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const apiKeys = [process.env.SERPAPI_KEY, process.env.SERPAPI_API_KEY].filter(
    (value, index, self): value is string => Boolean(value) && self.indexOf(value) === index
  );

  if (apiKeys.length === 0) {
    return NextResponse.json(
      { ok: false, error: 'Falta SERPAPI_KEY o SERPAPI_API_KEY en el entorno del frontend' },
      { status: 500 }
    );
  }

  const baseParams = new URLSearchParams();
  baseParams.set('engine', 'google_hotels');

  for (const [k, v] of url.searchParams.entries()) {
    if (v) baseParams.set(k, v);
  }

  if (!baseParams.has('hl')) baseParams.set('hl', 'es');
  if (!baseParams.has('gl')) baseParams.set('gl', 'mx');

  let lastStatus = 500;
  let lastData: Record<string, unknown> | null = null;

  for (const key of apiKeys) {
    const params = new URLSearchParams(baseParams);
    params.set('api_key', key);

    const upstream = await fetch(`https://serpapi.com/search.json?${params.toString()}`, {
      cache: 'no-store',
    });

    const data = (await upstream.json().catch(() => null)) as Record<string, unknown> | null;

    if (upstream.ok) {
      return NextResponse.json({ ok: true, data }, { status: 200 });
    }

    lastStatus = upstream.status;
    lastData = data;

    const errorText = String(data?.error ?? data?.message ?? '').toLowerCase();
    const invalidKey = errorText.includes('invalid api key') || errorText.includes('invalid key');
    if (!invalidKey) {
      const msg = data?.error ?? data?.message ?? 'Error consultando SerpAPI (hoteles)';
      return NextResponse.json({ ok: false, error: msg, details: data }, { status: upstream.status });
    }
  }

  const msg = lastData?.error ?? lastData?.message ?? 'Clave de SerpAPI inválida';
  return NextResponse.json({ ok: false, error: msg, details: lastData }, { status: lastStatus });
}
