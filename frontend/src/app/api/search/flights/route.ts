import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const CITY_AIRPORT_GROUPS: Record<string, string[]> = {
  CDMX: ['MEX', 'NLU', 'TLC'],
  MEXICO_CITY: ['MEX', 'NLU', 'TLC'],
  CIUDAD_DE_MEXICO: ['MEX', 'NLU', 'TLC'],
  NYC: ['JFK', 'LGA', 'EWR'],
};

const normalizeAirportCodes = (raw: string | null): string[] => {
  if (!raw) return [];

  const tokens = raw
    .split(/[\s,;|]+/)
    .map(token => token.trim().toUpperCase())
    .filter(Boolean);

  const expanded = tokens.flatMap(token => CITY_AIRPORT_GROUPS[token] ?? [token]);
  const onlyIata = expanded.filter(code => /^[A-Z]{3}$/.test(code));
  return Array.from(new Set(onlyIata));
};

const extractPrice = (item: unknown): number => {
  if (!item || typeof item !== 'object') return Number.MAX_SAFE_INTEGER;
  const value = (item as { price?: unknown }).price;
  return typeof value === 'number' && Number.isFinite(value) ? value : Number.MAX_SAFE_INTEGER;
};

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
  baseParams.set('engine', 'google_flights');

  for (const [k, v] of url.searchParams.entries()) {
    if (v) baseParams.set(k, v);
  }

  // If return_date is missing, force one-way search to avoid SerpAPI round-trip validation errors.
  if (!baseParams.has('type')) {
    baseParams.set('type', baseParams.has('return_date') ? '1' : '2');
  }

  // Defaults that usually help for LATAM searches; can be overridden by querystring.
  if (!baseParams.has('hl')) baseParams.set('hl', 'es');
  if (!baseParams.has('gl')) baseParams.set('gl', 'mx');

  const departureIds = normalizeAirportCodes(baseParams.get('departure_id'));
  const arrivalIds = normalizeAirportCodes(baseParams.get('arrival_id'));

  if (departureIds.length > 0) {
    baseParams.set('departure_id', departureIds[0]);
  }

  if (arrivalIds.length > 0) {
    baseParams.set('arrival_id', arrivalIds[0]);
  }

  const departures = departureIds.length > 0 ? departureIds : [baseParams.get('departure_id')].filter((v): v is string => Boolean(v));
  const arrivals = arrivalIds.length > 0 ? arrivalIds : [baseParams.get('arrival_id')].filter((v): v is string => Boolean(v));

  if (departures.length === 0 || arrivals.length === 0) {
    return NextResponse.json(
      { ok: false, error: 'Debes indicar departure_id y arrival_id válidos (código IATA o alias de ciudad como CDMX).' },
      { status: 400 }
    );
  }

  const routeCombinations = departures.flatMap(from => arrivals.map(to => ({ from, to })));

  if (routeCombinations.length > 9) {
    return NextResponse.json(
      { ok: false, error: 'Demasiadas combinaciones de aeropuertos. Usa máximo 3 origenes y 3 destinos.' },
      { status: 400 }
    );
  }

  let lastStatus = 500;
  let lastData: Record<string, unknown> | null = null;
  const successfulPayloads: Array<Record<string, unknown>> = [];
  const searchedRoutes: string[] = [];

  for (const route of routeCombinations) {
    let comboSucceeded = false;

    for (const key of apiKeys) {
      const params = new URLSearchParams(baseParams);
      params.set('departure_id', route.from);
      params.set('arrival_id', route.to);
      params.set('api_key', key);

      const upstream = await fetch(`https://serpapi.com/search.json?${params.toString()}`, {
        // Avoid caching potentially sensitive corporate travel data
        cache: 'no-store',
      });

      const data = (await upstream.json().catch(() => null)) as Record<string, unknown> | null;

      if (upstream.ok && data) {
        successfulPayloads.push(data);
        searchedRoutes.push(`${route.from}-${route.to}`);
        comboSucceeded = true;
        break;
      }

      lastStatus = upstream.status;
      lastData = data;

      const errorText = String(data?.error ?? data?.message ?? '').toLowerCase();
      const invalidKey = errorText.includes('invalid api key') || errorText.includes('invalid key');
      if (!invalidKey) {
        const msg = data?.error ?? data?.message ?? 'Error consultando SerpAPI (vuelos)';
        return NextResponse.json({ ok: false, error: msg, details: data }, { status: upstream.status });
      }
    }

    if (!comboSucceeded && successfulPayloads.length === 0) {
      const msg = lastData?.error ?? lastData?.message ?? 'Clave de SerpAPI inválida';
      return NextResponse.json({ ok: false, error: msg, details: lastData }, { status: lastStatus });
    }
  }

  if (successfulPayloads.length === 0) {
    const msg = lastData?.error ?? lastData?.message ?? 'No se encontraron resultados para los aeropuertos indicados';
    return NextResponse.json({ ok: false, error: msg, details: lastData }, { status: lastStatus });
  }

  if (successfulPayloads.length === 1) {
    return NextResponse.json({ ok: true, data: successfulPayloads[0] }, { status: 200 });
  }

  const first = successfulPayloads[0];
  const mergedBestFlights = successfulPayloads
    .flatMap(payload => (Array.isArray(payload.best_flights) ? payload.best_flights : []))
    .sort((a, b) => extractPrice(a) - extractPrice(b))
    .slice(0, 20);

  const mergedFlights = successfulPayloads
    .flatMap(payload => (Array.isArray(payload.flights) ? payload.flights : []))
    .sort((a, b) => extractPrice(a) - extractPrice(b))
    .slice(0, 20);

  const mergedData: Record<string, unknown> = {
    ...first,
    best_flights: mergedBestFlights,
    flights: mergedFlights,
    searched_routes: searchedRoutes,
  };

  return NextResponse.json({ ok: true, data: mergedData }, { status: 200 });
}
