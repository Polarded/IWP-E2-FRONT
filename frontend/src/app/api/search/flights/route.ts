import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const apiKey = process.env.SERPAPI_KEY ?? process.env.SERPAPI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: 'Falta SERPAPI_KEY o SERPAPI_API_KEY en el entorno del frontend' },
      { status: 500 }
    );
  }

  const params = new URLSearchParams();
  params.set('engine', 'google_flights');
  params.set('api_key', apiKey);

  for (const [k, v] of url.searchParams.entries()) {
    if (v) params.set(k, v);
  }

  // Defaults that usually help for LATAM searches; can be overridden by querystring.
  if (!params.has('hl')) params.set('hl', 'es');
  if (!params.has('gl')) params.set('gl', 'mx');

  const upstream = await fetch(`https://serpapi.com/search.json?${params.toString()}`, {
    // Avoid caching potentially sensitive corporate travel data
    cache: 'no-store',
  });

  const data = await upstream.json().catch(() => null);

  if (!upstream.ok) {
    const msg = data?.error ?? data?.message ?? 'Error consultando SerpAPI (vuelos)';
    return NextResponse.json({ ok: false, error: msg, details: data }, { status: upstream.status });
  }

  return NextResponse.json({ ok: true, data }, { status: 200 });
}
