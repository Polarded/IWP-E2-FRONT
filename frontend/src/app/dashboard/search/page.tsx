'use client';
import { useState } from 'react';
import { searchApi } from '@/lib/api';

type SearchType = 'flights' | 'hotels';

interface FlightResult {
  flights?: Array<{
    airline?: string;
    airline_name?: string;
    airline_logo?: string;
    departure_airport?: { name?: string; id?: string };
    arrival_airport?: { name?: string; id?: string };
    departure_token?: string;
    price?: number;
    flights?: Array<{
      airline?: string;
      airline_logo?: string;
      departure_airport?: { name?: string; id?: string };
      arrival_airport?: { name?: string; id?: string };
    }>;
  }>;
  best_flights?: FlightResult['flights'];
}

interface HotelResult {
  properties?: Array<{
    name?: string;
    type?: string;
    check_in_time?: string;
    check_out_time?: string;
    rate_per_night?: { lowest?: string };
    total_rate?: { lowest?: string };
    overall_rating?: number;
    reviews?: number;
    images?: Array<{ thumbnail?: string }>;
  }>;
}

export default function SearchPage() {
  const [type, setType] = useState<SearchType>('flights');

  // Flight params
  const [flightParams, setFlightParams] = useState({
    departure_id: '',
    arrival_id: '',
    outbound_date: '',
    return_date: '',
    currency: 'MXN',
  });

  // Hotel params
  const [hotelParams, setHotelParams] = useState({
    q: '',
    check_in_date: '',
    check_out_date: '',
    currency: 'MXN',
  });

  const [results, setResults] = useState<FlightResult | HotelResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResults(null);
    setLoading(true);
    try {
      const params = type === 'flights'
        ? Object.fromEntries(Object.entries(flightParams).filter(([, v]) => v))
        : Object.fromEntries(Object.entries(hotelParams).filter(([, v]) => v));

      const res = type === 'flights'
        ? await searchApi.flights(params)
        : await searchApi.hotels(params);
      setResults(res.data as FlightResult | HotelResult);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error en la búsqueda');
    } finally {
      setLoading(false);
    }
  };

  const flightData = results as FlightResult | null;
  const hotelData = results as HotelResult | null;
  const displayFlights = flightData?.best_flights ?? flightData?.flights ?? [];
  const displayHotels = hotelData?.properties ?? [];

  const normalizeFlight = (flight: NonNullable<FlightResult['flights']>[number]) => {
    const segments = Array.isArray(flight.flights) ? flight.flights : [];
    const firstSegment = segments[0];
    const lastSegment = segments[segments.length - 1];
    const airlines = segments
      .map(segment => segment.airline)
      .filter((value): value is string => Boolean(value));

    return {
      fromId: flight.departure_airport?.id ?? firstSegment?.departure_airport?.id ?? '—',
      toId: flight.arrival_airport?.id ?? lastSegment?.arrival_airport?.id ?? '—',
      fromName: flight.departure_airport?.name ?? firstSegment?.departure_airport?.name ?? '',
      toName: flight.arrival_airport?.name ?? lastSegment?.arrival_airport?.name ?? '',
      airline: flight.airline ?? flight.airline_name ?? airlines.join(' + ') ?? '',
      airlineLogo: flight.airline_logo ?? firstSegment?.airline_logo,
    };
  };

  const formatPriceMXN = (value: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(value);

  return (
    <div className="max-w-6xl">
      <div className="window-shell">
        <div className="window-header">
          <p className="text-xs font-semibold" style={{ color: '#35537b' }}>BUSQUEDA</p>
          <div className="flex gap-2">
            {(['flights', 'hotels'] as const).map(t => (
              <button
                key={t}
                onClick={() => { setType(t); setResults(null); setError(''); }}
                className={`tab-button ${type === t ? 'active' : ''}`}
              >
                {t === 'flights' ? 'Vuelos' : 'Hoteles'}
              </button>
            ))}
          </div>
        </div>

        <div className="p-5 sm:p-6">
          <h1 className="text-2xl font-semibold" style={{ color: '#143b75' }}>Buscar vuelos y hoteles</h1>
          <p className="text-sm mt-1" style={{ color: '#6282ad' }}>Encuentra opciones para el viaje</p>

          <div className="card p-5 mt-6 mb-6">
            <form onSubmit={handleSearch} className="space-y-4">
              {type === 'flights' ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#35537b' }}>
                        Aeropuerto origen
                      </label>
                      <input
                        type="text"
                        value={flightParams.departure_id}
                        onChange={e => setFlightParams(p => ({ ...p, departure_id: e.target.value.toUpperCase() }))}
                        placeholder="MEX"
                        required
                        maxLength={3}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#35537b' }}>
                        Aeropuerto destino
                      </label>
                      <input
                        type="text"
                        value={flightParams.arrival_id}
                        onChange={e => setFlightParams(p => ({ ...p, arrival_id: e.target.value.toUpperCase() }))}
                        placeholder="JFK"
                        required
                        maxLength={3}
                        className="input-field"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#35537b' }}>
                        Fecha salida
                      </label>
                      <input
                        type="date"
                        value={flightParams.outbound_date}
                        onChange={e => setFlightParams(p => ({ ...p, outbound_date: e.target.value }))}
                        required
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#35537b' }}>
                        Fecha regreso
                      </label>
                      <input
                        type="date"
                        value={flightParams.return_date}
                        onChange={e => setFlightParams(p => ({ ...p, return_date: e.target.value }))}
                        className="input-field"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#35537b' }}>
                      Ciudad u hotel
                    </label>
                    <input
                      type="text"
                      value={hotelParams.q}
                      onChange={e => setHotelParams(p => ({ ...p, q: e.target.value }))}
                      placeholder="Marriott Ciudad de Mexico"
                      required
                      className="input-field"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#35537b' }}>
                        Check-in
                      </label>
                      <input
                        type="date"
                        value={hotelParams.check_in_date}
                        onChange={e => setHotelParams(p => ({ ...p, check_in_date: e.target.value }))}
                        required
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#35537b' }}>
                        Check-out
                      </label>
                      <input
                        type="date"
                        value={hotelParams.check_out_date}
                        onChange={e => setHotelParams(p => ({ ...p, check_out_date: e.target.value }))}
                        required
                        className="input-field"
                      />
                    </div>
                  </div>
                </>
              )}

              <button type="submit" disabled={loading} className="btn-gold px-6 py-2.5 text-sm">
                {loading ? 'Buscando...' : 'Buscar'}
              </button>
            </form>
          </div>

          {error && (
            <div className="px-4 py-3 rounded-lg text-sm mb-4" style={{ background: '#ffeef0', border: '1px solid #f1bdc7', color: '#c9284b' }}>
              {error}
            </div>
          )}

          {type === 'flights' && displayFlights.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold mb-3" style={{ color: '#143b75' }}>
                {displayFlights.length} vuelo{displayFlights.length !== 1 ? 's' : ''} encontrado{displayFlights.length !== 1 ? 's' : ''}
              </h2>
              <div className="space-y-3">
                {displayFlights.map((flight, i) => (
                  (() => {
                    const normalized = normalizeFlight(flight);
                    return (
                  <div key={i} className="card p-4 flex items-center justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      {normalized.airlineLogo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={normalized.airlineLogo}
                          alt={normalized.airline || 'Logo aerolínea'}
                          className="w-8 h-8 rounded-sm border"
                          style={{ borderColor: '#d8e6fb', background: '#ffffff', objectFit: 'contain' }}
                        />
                      ) : (
                        <div
                          className="w-8 h-8 rounded-sm border flex items-center justify-center text-xs"
                          style={{ borderColor: '#d8e6fb', background: '#ffffff', color: '#6282ad' }}
                        >
                          ✈
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-semibold" style={{ color: '#143b75' }}>
                          {normalized.fromId} → {normalized.toId}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: '#6282ad' }}>
                          {normalized.fromName} → {normalized.toName}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: '#35537b' }}>
                          {normalized.airline || 'Aerolínea no especificada'}
                        </p>
                      </div>
                    </div>
                    {flight.price !== undefined && (
                      <p className="text-lg font-bold shrink-0" style={{ color: '#1f5da8' }}>
                        {formatPriceMXN(flight.price)}
                      </p>
                    )}
                  </div>
                    );
                  })()
                ))}
              </div>
            </div>
          )}

          {type === 'hotels' && displayHotels.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold mb-3" style={{ color: '#143b75' }}>
                {displayHotels.length} hotel{displayHotels.length !== 1 ? 'es' : ''} encontrado{displayHotels.length !== 1 ? 's' : ''}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {displayHotels.map((hotel, i) => (
                  <div key={i} className="card p-4">
                    <p className="text-sm font-semibold" style={{ color: '#143b75' }}>{hotel.name ?? 'Hotel'}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#6282ad' }}>{hotel.type ?? ''}</p>
                    {hotel.overall_rating !== undefined && (
                      <p className="text-xs mt-1" style={{ color: '#35537b' }}>
                        Rating {hotel.overall_rating} {hotel.reviews !== undefined ? `· ${hotel.reviews} reseñas` : ''}
                      </p>
                    )}
                    {hotel.check_in_time && (
                      <p className="text-xs mt-1" style={{ color: '#6282ad' }}>
                        Check-in: {hotel.check_in_time} · Check-out: {hotel.check_out_time}
                      </p>
                    )}
                    {hotel.rate_per_night?.lowest && (
                      <p className="text-base font-bold mt-2" style={{ color: '#1f5da8' }}>
                        {hotel.rate_per_night.lowest} <span className="text-xs font-normal" style={{ color: '#6282ad' }}>/ noche</span>
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {results !== null && displayFlights.length === 0 && displayHotels.length === 0 && (
            <div className="card p-10 text-center">
              <p className="text-2xl mb-2">🔎</p>
              <p className="text-sm" style={{ color: '#6282ad' }}>No se encontraron resultados para tu búsqueda.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
