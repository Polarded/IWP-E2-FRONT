import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

interface SerpFlight {
  booking_token?: string;
  departure_token?: string;
}

const getApiKeys = (): string[] =>
  [process.env.SERPAPI_KEY, process.env.SERPAPI_API_KEY].filter(
    (value, index, self): value is string => Boolean(value) && self.indexOf(value) === index
  );

const fetchSerp = async (params: URLSearchParams, apiKeys: string[]): Promise<Record<string, unknown>> => {
  let lastError: Record<string, unknown> | null = null;

  for (const key of apiKeys) {
    const current = new URLSearchParams(params);
    current.set('api_key', key);

    const response = await fetch(`https://serpapi.com/search.json?${current.toString()}`, {
      cache: 'no-store',
    });

    const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;

    if (response.ok && payload) {
      return payload;
    }

    lastError = payload;
  }

  throw new Error(String(lastError?.error ?? lastError?.message ?? 'No se pudo consultar SerpApi'));
};

const pickFlightWithBookingToken = (payload: Record<string, unknown>): SerpFlight | null => {
  const best = Array.isArray(payload.best_flights) ? (payload.best_flights as SerpFlight[]) : [];
  const regular = Array.isArray(payload.flights) ? (payload.flights as SerpFlight[]) : [];
  const candidates = [...best, ...regular];

  return candidates.find(item => Boolean(item.booking_token)) ?? null;
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const departureId = url.searchParams.get('departure_id') ?? '';
  const arrivalId = url.searchParams.get('arrival_id') ?? '';
  const outboundDate = url.searchParams.get('outbound_date') ?? '';
  const returnDate = url.searchParams.get('return_date') ?? '';
  const departureToken = url.searchParams.get('departure_token') ?? '';

  if (!departureId || !arrivalId || !outboundDate) {
    return NextResponse.json({ ok: false, error: 'Faltan parámetros para resolver compra de vuelo.' }, { status: 400 });
  }

  const apiKeys = getApiKeys();
  if (apiKeys.length === 0) {
    return NextResponse.json({ ok: false, error: 'Falta SERPAPI_KEY o SERPAPI_API_KEY.' }, { status: 500 });
  }

  const base = new URLSearchParams({
    engine: 'google_flights',
    departure_id: departureId,
    arrival_id: arrivalId,
    outbound_date: outboundDate,
    hl: 'es',
    gl: 'mx',
  });

  if (returnDate) {
    base.set('return_date', returnDate);
    base.set('type', '1');
  } else {
    base.set('type', '2');
  }

  try {
    let searchPayload = await fetchSerp(base, apiKeys);

    if (departureToken) {
      const withDeparture = new URLSearchParams(base);
      withDeparture.set('departure_token', departureToken);
      searchPayload = await fetchSerp(withDeparture, apiKeys);
    }

    const selected = pickFlightWithBookingToken(searchPayload);

    if (!selected?.booking_token) {
      const fallback =
        (searchPayload.search_metadata as { google_flights_url?: string } | undefined)?.google_flights_url ??
        'https://www.google.com/travel/flights?hl=es&curr=MXN';

      return NextResponse.json({ ok: true, url: fallback, source: 'fallback_search' }, { status: 200 });
    }

    const bookingParams = new URLSearchParams(base);
    bookingParams.set('booking_token', selected.booking_token);
    const bookingPayload = await fetchSerp(bookingParams, apiKeys);

    const bookingOptions = Array.isArray(bookingPayload.booking_options)
      ? (bookingPayload.booking_options as Array<{ together?: { booking_request?: { url?: string; post_data?: string } } }>)
      : [];

    const request = bookingOptions[0]?.together?.booking_request;
    if (request?.url && request?.post_data) {
      return NextResponse.json(
        {
          ok: true,
          url: `${request.url}?${request.post_data}`,
          source: 'booking_request',
        },
        { status: 200 }
      );
    }

    const fallback =
      (bookingPayload.search_metadata as { google_flights_url?: string } | undefined)?.google_flights_url ??
      (searchPayload.search_metadata as { google_flights_url?: string } | undefined)?.google_flights_url ??
      'https://www.google.com/travel/flights?hl=es&curr=MXN';

    return NextResponse.json({ ok: true, url: fallback, source: 'fallback_booking' }, { status: 200 });
  } catch (error) {
    const fallback = new URL('https://www.google.com/travel/flights');
    fallback.searchParams.set('hl', 'es');
    fallback.searchParams.set('curr', 'MXN');
    fallback.searchParams.set('from', departureId);
    fallback.searchParams.set('to', arrivalId);
    fallback.searchParams.set('departure', outboundDate);
    if (returnDate) fallback.searchParams.set('return', returnDate);

    return NextResponse.json(
      {
        ok: true,
        url: fallback.toString(),
        source: 'hard_fallback',
        error: error instanceof Error ? error.message : 'Error al resolver link de compra',
      },
      { status: 200 }
    );
  }
}
