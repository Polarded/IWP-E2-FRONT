'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { searchApi, tripsApi, type Trip, type TripStatus } from '@/lib/api';
import { useSessionUser } from '@/lib/useSessionUser';
import { clearTripSelection, getTripSelection, saveTripSelection } from '@/lib/tripSelection';

const statusLabel: Record<string, string> = {
  PENDING: 'Pendiente',
  GESTOR_APPROVED: 'Pendiente Finanzas',
  GESTOR_REJECTED: 'Rechazado por Gestor',
  FINANCE_APPROVED: 'Aprobado por Finanzas',
  FINANCE_REJECTED: 'Rechazado por Finanzas',
  CORRECTION_REQUIRED: 'Requiere Corrección',
};

const statusBadge: Record<string, string> = {
  PENDING: 'badge-pending',
  GESTOR_APPROVED: 'badge-approved',
  GESTOR_REJECTED: 'badge-rejected',
  FINANCE_APPROVED: 'badge-approved',
  FINANCE_REJECTED: 'badge-rejected',
  CORRECTION_REQUIRED: 'badge-correction',
};

const GESTOR_SEEN_PENDING_KEY = 'viajesapp_gestor_seen_pending_v1';

interface FlightOption {
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
}

interface HotelOption {
  name?: string;
  type?: string;
  total_rate?: { lowest?: string };
  rate_per_night?: { lowest?: string };
  overall_rating?: number;
  reviews?: number;
  link?: string;
  booking_link?: string;
  property_token?: string;
}

interface SearchResults {
  best_flights?: FlightOption[];
  flights?: FlightOption[];
  properties?: HotelOption[];
}

interface AirportSpec {
  city: string;
  country: string;
  notes: string;
}

interface HotelAgreement {
  code: string;
  name: string;
  discountPct: number;
  matchers: string[];
}

const HOTEL_AGREEMENTS: HotelAgreement[] = [
  {
    code: 'HV-MARRIOTT-2026',
    name: 'Convenio Marriott Corporativo',
    discountPct: 12,
    matchers: ['marriott', 'courtyard', 'fairfield']
  },
  {
    code: 'HV-HILTON-2026',
    name: 'Convenio Hilton Negocios',
    discountPct: 10,
    matchers: ['hilton', 'hampton', 'doubletree']
  },
  {
    code: 'HV-HYATT-2026',
    name: 'Convenio Hyatt Empresa',
    discountPct: 9,
    matchers: ['hyatt', 'grand hyatt', 'hyatt regency']
  },
];

const resolveHotelAgreement = (hotelName?: string): HotelAgreement | null => {
  if (!hotelName) return null;
  const normalized = hotelName.toLowerCase();
  return HOTEL_AGREEMENTS.find(agreement =>
    agreement.matchers.some(matcher => normalized.includes(matcher))
  ) ?? null;
};

const IATA_SUGGESTIONS: Array<{ code: string; label: string }> = [
  { code: 'CDMX', label: 'Ciudad de Mexico (multi-aeropuerto: MEX, NLU, TLC)' },
  { code: 'CUU', label: 'Chihuahua, MX' },
  { code: 'MTY', label: 'Monterrey, MX' },
  { code: 'GDL', label: 'Guadalajara, MX' },
  { code: 'MEX', label: 'Ciudad de Mexico, MX' },
  { code: 'NLU', label: 'Felipe Angeles (AIFA), MX' },
  { code: 'TLC', label: 'Toluca, MX' },
  { code: 'TIJ', label: 'Tijuana, MX' },
  { code: 'CUN', label: 'Cancun, MX' },
  { code: 'PVR', label: 'Puerto Vallarta, MX' },
  { code: 'BJX', label: 'Leon/Bajio, MX' },
  { code: 'QRO', label: 'Queretaro, MX' },
  { code: 'HMO', label: 'Hermosillo, MX' },
  { code: 'JFK', label: 'New York JFK, US' },
  { code: 'LAX', label: 'Los Angeles, US' },
  { code: 'ORD', label: 'Chicago O Hare, US' },
  { code: 'DFW', label: 'Dallas/Fort Worth, US' },
  { code: 'ATL', label: 'Atlanta, US' },
  { code: 'IAH', label: 'Houston, US' },
  { code: 'MIA', label: 'Miami, US' },
  { code: 'MAD', label: 'Madrid, ES' },
  { code: 'CDG', label: 'Paris Charles de Gaulle, FR' },
  { code: 'LHR', label: 'London Heathrow, UK' },
  { code: 'FRA', label: 'Frankfurt, DE' },
  { code: 'AMS', label: 'Amsterdam, NL' },
  { code: 'NRT', label: 'Tokyo Narita, JP' },
  { code: 'SFO', label: 'San Francisco, US' },
  { code: 'YYZ', label: 'Toronto Pearson, CA' },
  { code: 'BOG', label: 'Bogota, CO' },
  { code: 'LIM', label: 'Lima, PE' },
  { code: 'EZE', label: 'Buenos Aires Ezeiza, AR' },
  { code: 'GRU', label: 'Sao Paulo Guarulhos, BR' },
];

const AIRPORT_SPECS: Record<string, AirportSpec> = {
  MEX: { city: 'Ciudad de Mexico', country: 'MX', notes: 'AICM; considera trafico alto y tiempos de migracion.' },
  NLU: { city: 'Zumpango', country: 'MX', notes: 'AIFA; traslado terrestre mas largo a CDMX.' },
  TLC: { city: 'Toluca', country: 'MX', notes: 'Ideal para zona poniente; valida transporte nocturno.' },
  MTY: { city: 'Monterrey', country: 'MX', notes: 'Terminal principal para negocios en Nuevo Leon.' },
  GDL: { city: 'Guadalajara', country: 'MX', notes: 'Conectividad alta; valida terminal en vuelos regionales.' },
  JFK: { city: 'New York', country: 'US', notes: 'Llegadas internacionales; revisa tiempos de aduana.' },
  LAX: { city: 'Los Angeles', country: 'US', notes: 'Aeropuerto grande; prioriza traslados con tiempo.' },
  MAD: { city: 'Madrid', country: 'ES', notes: 'Barajas; terminales separadas, revisa puerta de conexion.' },
  LHR: { city: 'London', country: 'UK', notes: 'Heathrow; alto flujo internacional.' },
  CDG: { city: 'Paris', country: 'FR', notes: 'Charles de Gaulle; contempla tiempo para conexiones.' },
};

const getAirportSpec = (code?: string, name?: string): AirportSpec => {
  if (code && AIRPORT_SPECS[code]) {
    return AIRPORT_SPECS[code];
  }

  return {
    city: name?.split(',')[0]?.trim() || 'Ciudad por confirmar',
    country: 'N/A',
    notes: 'Valida terminal, transporte y requisitos locales al llegar.'
  };
};

const getAirlineBookingUrl = (
  flight: FlightOption,
  airline: string | undefined,
  fromId: string,
  toId: string,
  outboundDate: string,
  returnDate?: string
): string => {
  const directLink =
    (flight as { booking_link?: string; deep_link?: string; link?: string }).booking_link ??
    (flight as { booking_link?: string; deep_link?: string; link?: string }).deep_link ??
    (flight as { booking_link?: string; deep_link?: string; link?: string }).link;

  if (directLink && /^https?:\/\//i.test(directLink)) {
    return directLink;
  }

  const resolver = new URL('/api/search/flights/book', window.location.origin);
  resolver.searchParams.set('departure_id', fromId);
  resolver.searchParams.set('arrival_id', toId);
  resolver.searchParams.set('outbound_date', outboundDate);
  if (returnDate) resolver.searchParams.set('return_date', returnDate);
  if (flight.departure_token) resolver.searchParams.set('departure_token', flight.departure_token);
  if (airline) resolver.searchParams.set('airline', airline);

  return resolver.toString();
};

const getHotelBookingUrl = (
  hotel: HotelOption,
  query: string,
  checkInDate: string,
  checkOutDate: string
): string => {
  const directLink =
    (hotel as { booking_link?: string; link?: string; property_link?: string }).booking_link ??
    (hotel as { booking_link?: string; link?: string; property_link?: string }).link ??
    (hotel as { booking_link?: string; link?: string; property_link?: string }).property_link;

  if (directLink && /^https?:\/\//i.test(directLink)) {
    return directLink;
  }

  const googleHotels = new URL('https://www.google.com/travel/hotels');
  googleHotels.searchParams.set('hl', 'es');
  googleHotels.searchParams.set('gl', 'mx');
  googleHotels.searchParams.set('curr', 'MXN');
  googleHotels.searchParams.set('q', hotel.name ?? query);
  if (checkInDate) googleHotels.searchParams.set('checkin', checkInDate);
  if (checkOutDate) googleHotels.searchParams.set('checkout', checkOutDate);
  return googleHotels.toString();
};

function StatusModal({
  trip,
  role,
  onClose,
  onSuccess,
}: {
  trip: Trip;
  role: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selection, setSelection] = useState(() => getTripSelection(trip.id));

  const [searchType, setSearchType] = useState<'flights' | 'hotels'>('flights');
  const [searchLoading, setSearchLoading] = useState(false);
  const [openingPurchaseKey, setOpeningPurchaseKey] = useState<string | null>(null);
  const [searchError, setSearchError] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [flightVisibleCount, setFlightVisibleCount] = useState(8);
  const [showSearchPanel, setShowSearchPanel] = useState(() => role === 'GESTOR');

  const [flightParams, setFlightParams] = useState({
    departure_id: '',
    arrival_id: '',
    outbound_date: trip.startDate?.slice(0, 10) ?? '',
    return_date: trip.endDate?.slice(0, 10) ?? '',
    currency: 'MXN',
  });

  const [hotelParams, setHotelParams] = useState({
    q: trip.destination ?? '',
    check_in_date: trip.startDate?.slice(0, 10) ?? '',
    check_out_date: trip.endDate?.slice(0, 10) ?? '',
    currency: 'MXN',
  });

  const gestorActions: { label: string; status: TripStatus; danger?: boolean }[] = [
    { label: 'Aprobar', status: 'GESTOR_APPROVED' },
    { label: 'Rechazar', status: 'GESTOR_REJECTED', danger: true },
    { label: 'Solicitar Corrección', status: 'CORRECTION_REQUIRED' },
  ];

  const financeActions: { label: string; status: TripStatus; danger?: boolean }[] = [
    { label: 'Aprobar Financieramente', status: 'FINANCE_APPROVED' },
    { label: 'Rechazar Financieramente', status: 'FINANCE_REJECTED', danger: true },
    { label: 'Solicitar Corrección', status: 'CORRECTION_REQUIRED' },
  ];

  const actions = role === 'GESTOR' ? gestorActions : financeActions;

  const handleAction = async (status: TripStatus) => {
    setLoading(true);
    setError('');
    try {
      if (role === 'GESTOR' && status === 'GESTOR_APPROVED') {
        const current = getTripSelection(trip.id);
        if (!current?.flight || !current?.hotel) {
          setError('Antes de aprobar, selecciona un vuelo y un hospedaje para este viaje.');
          setLoading(false);
          return;
        }
      }
      if (role === 'FINANZAS' && status === 'FINANCE_APPROVED') {
        const current = getTripSelection(trip.id);
        if (!current?.flight || !current?.hotel) {
          setError('Antes de aprobar financieramente, verifica o ajusta vuelo y hospedaje.');
          setLoading(false);
          return;
        }
      }
      await tripsApi.updateStatus(trip.id, status, comment || undefined);
      onSuccess();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError('');
    setResults(null);
    setSearchLoading(true);
    try {
      const params =
        searchType === 'flights'
          ? Object.fromEntries(Object.entries(flightParams).filter(([, v]) => v))
          : Object.fromEntries(Object.entries(hotelParams).filter(([, v]) => v));
      const res =
        searchType === 'flights'
          ? await searchApi.flights(params as Record<string, string>)
          : await searchApi.hotels(params as Record<string, string>);
      setResults((res.data ?? null) as SearchResults | null);
      setFlightVisibleCount(8);
    } catch (e: unknown) {
      setSearchError(e instanceof Error ? e.message : 'Error al buscar');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleOpenPurchase = async (resolverUrl: string, key: string) => {
    setOpeningPurchaseKey(key);
    try {
      const parsed = new URL(resolverUrl, window.location.origin);
      const isInternalFlightResolver =
        parsed.origin === window.location.origin && parsed.pathname.startsWith('/api/search/flights/book');

      if (!isInternalFlightResolver) {
        window.open(parsed.toString(), '_blank', 'noopener,noreferrer');
        return;
      }

      const response = await fetch(resolverUrl, { cache: 'no-store' });
      const payload = (await response.json().catch(() => null)) as { url?: string; error?: string } | null;
      const finalUrl = payload?.url;

      if (!response.ok || !finalUrl) {
        throw new Error(payload?.error ?? 'No se pudo resolver la compra del vuelo');
      }

      window.open(finalUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : 'No se pudo abrir la compra del vuelo');
    } finally {
      setOpeningPurchaseKey(null);
    }
  };

  const displayFlights = results?.best_flights ?? results?.flights ?? [];
  const displayHotels = results?.properties ?? [];

  const normalizeFlight = (flight: FlightOption) => {
    const segments = Array.isArray(flight?.flights) ? flight.flights : [];
    const firstSegment = segments[0];
    const lastSegment = segments[segments.length - 1];
    const airlines = segments
      .map(segment => segment?.airline)
      .filter((value: unknown): value is string => Boolean(value));

    return {
      fromId: flight?.departure_airport?.id ?? firstSegment?.departure_airport?.id ?? '—',
      toId: flight?.arrival_airport?.id ?? lastSegment?.arrival_airport?.id ?? '—',
      fromName: flight?.departure_airport?.name ?? firstSegment?.departure_airport?.name ?? '',
      toName: flight?.arrival_airport?.name ?? lastSegment?.arrival_airport?.name ?? '',
      airline: flight?.airline ?? flight?.airline_name ?? airlines.join(' + ') ?? '',
      airlineLogo: flight?.airline_logo ?? firstSegment?.airline_logo,
      price: flight?.price,
      departureToken: flight?.departure_token,
    };
  };

  const formatPriceMXN = (value: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(value);

  const parseCurrencyValue = (raw?: string): number => {
    if (!raw) return 0;
    const normalized = raw.replace(/[^\d.,-]/g, '').trim();
    if (!normalized) return 0;

    const commaCount = (normalized.match(/,/g) ?? []).length;
    const dotCount = (normalized.match(/\./g) ?? []).length;

    let canonical = normalized;

    // When both separators exist, assume the last one is decimal separator.
    if (commaCount > 0 && dotCount > 0) {
      const lastComma = normalized.lastIndexOf(',');
      const lastDot = normalized.lastIndexOf('.');
      if (lastComma > lastDot) {
        canonical = normalized.replace(/\./g, '').replace(',', '.');
      } else {
        canonical = normalized.replace(/,/g, '');
      }
    } else if (commaCount > 0) {
      const parts = normalized.split(',');
      const lastPart = parts[parts.length - 1] ?? '';
      // e.g. 1,171 or 12,345,678 => thousands separators
      if (commaCount > 1 || lastPart.length === 3) {
        canonical = normalized.replace(/,/g, '');
      } else {
        canonical = normalized.replace(',', '.');
      }
    } else if (dotCount > 0) {
      const parts = normalized.split('.');
      const lastPart = parts[parts.length - 1] ?? '';
      // e.g. 1.171 or 12.345.678 => thousands separators
      if (dotCount > 1 || lastPart.length === 3) {
        canonical = normalized.replace(/\./g, '');
      }
    }

    const value = Number(canonical);
    return Number.isFinite(value) ? value : 0;
  };

  const selectedFlightPrice = selection?.flight?.price ?? 0;
  const selectedHotelPrice = parseCurrencyValue(selection?.hotel?.total_rate);
  const selectedHotelDiscount = selection?.hotel?.agreementDiscountPct ?? 0;
  const selectedHotelNetPrice = selectedHotelPrice * (1 - selectedHotelDiscount / 100);
  const selectedTotalPrice = selectedFlightPrice + selectedHotelNetPrice;
  const tripTypeLabel = flightParams.return_date ? 'Viaje redondo' : 'Solo ida';

  return (
    <div className="modal-backdrop">
      <div className="modal-window">
        <div className="window-header">
          <p className="text-xs font-semibold" style={{ color: '#35537b' }}>VER SOLICITUD</p>
          <button onClick={onClose} className="btn-ghost px-2 py-1 text-xs">X</button>
        </div>

        <div className="p-5">
          <h3 className="text-base font-semibold mb-1" style={{ color: '#143b75' }}>Actualizar estado</h3>
          <p className="text-xs mb-4" style={{ color: '#6282ad' }}>Viaje: <strong style={{ color: '#1f5da8' }}>{trip.destination}</strong></p>

          {role === 'GESTOR' && (
            <div className="card p-4 mb-4" style={{ background: '#fffdf6', border: '1px solid #f2dfb0' }}>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#7b5a12' }}>
                Comentarios del usuario
              </p>
              <p
                className="text-sm mt-2 whitespace-pre-line"
                style={{ color: '#5f4b1f' }}
              >
                {trip.reason || 'Sin comentarios del usuario.'}
              </p>
            </div>
          )}

          {(role === 'GESTOR' || role === 'FINANZAS') && (
            <div className="card p-4 mb-4" style={{ background: '#f5f9ff', border: '1px solid #d8e6fb' }}>
              <div className="flex items-center justify-between gap-3 mb-3">
                <p className="text-sm font-semibold" style={{ color: '#143b75' }}>Vuelos y hospedaje</p>
                <div className="flex gap-2">
                  {role === 'FINANZAS' && !showSearchPanel && (
                    <button
                      className="btn-outline px-3 py-1 text-xs"
                      type="button"
                      onClick={() => {
                        setShowSearchPanel(true);
                        setSearchType('flights');
                        setResults(null);
                        setSearchError('');
                      }}
                    >
                      Modificar selección
                    </button>
                  )}
                  <button
                    className="btn-ghost px-3 py-1 text-xs"
                    onClick={() => {
                      clearTripSelection(trip.id);
                      setSelection(null);
                      setShowSearchPanel(true);
                      setSearchType('flights');
                      setResults(null);
                      setSearchError('');
                    }}
                  >
                    Limpiar selección
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                <div className="p-3 rounded-md" style={{ background: '#ffffff', border: '1px solid #d8e6fb' }}>
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#35537b' }}>Vuelo seleccionado</p>
                  {selection?.flight ? (
                    <div>
                      <p className="text-sm mt-1" style={{ color: '#143b75' }}>
                        {selection.flight.from ?? '—'} → {selection.flight.to ?? '—'}
                        {selection.flight.price !== undefined ? ` · ${formatPriceMXN(selection.flight.price)}` : ''}
                      </p>
                      <p className="text-xs mt-1" style={{ color: '#6282ad' }}>
                        {selection.flight.tripType === 'ROUND_TRIP' ? 'Viaje redondo' : 'Solo ida'}
                      </p>
                      {selection.flight.bookingUrl && (
                        <a href={selection.flight.bookingUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold" style={{ color: '#2a78ce' }}>
                          Comprar en app/web de aerolínea
                        </a>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs mt-1" style={{ color: '#6282ad' }}>Aún no has seleccionado un vuelo.</p>
                  )}
                </div>
                <div className="p-3 rounded-md" style={{ background: '#ffffff', border: '1px solid #d8e6fb' }}>
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#35537b' }}>Hospedaje seleccionado</p>
                  {selection?.hotel ? (
                    <p className="text-sm mt-1" style={{ color: '#143b75' }}>
                      {selection.hotel.name ?? 'Hotel'}
                      {selection.hotel.total_rate ? ` · ${selection.hotel.total_rate}` : ''}
                      {selection.hotel.hasAgreement ? ` · Convenio ${selection.hotel.agreementDiscountPct ?? 0}%` : ''}
                    </p>
                  ) : (
                    <p className="text-xs mt-1" style={{ color: '#6282ad' }}>Aún no has seleccionado un hospedaje.</p>
                  )}
                </div>
              </div>

              {role === 'FINANZAS' && (
                <div className="p-3 rounded-md mb-4" style={{ background: '#ffffff', border: '1px solid #d8e6fb' }}>
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#35537b' }}>Total estimado (vuelo + hotel)</p>
                  <p className="text-lg font-bold mt-1" style={{ color: '#1f5da8' }}>
                    {formatPriceMXN(selectedTotalPrice)}
                  </p>
                  <p className="text-xs mt-1" style={{ color: '#6282ad' }}>
                    Vuelo: {formatPriceMXN(selectedFlightPrice)} · Hotel neto: {formatPriceMXN(selectedHotelNetPrice)}
                  </p>
                  {selection?.hotel?.hasAgreement && (
                    <p className="text-xs mt-1" style={{ color: '#2a78ce' }}>
                      {selection.hotel.agreementName} ({selection.hotel.agreementCode})
                    </p>
                  )}
                </div>
              )}

              {showSearchPanel ? (
                <>
                  <div className="flex gap-2 mb-3">
                    {(['flights', 'hotels'] as const).map(t => (
                      <button
                        key={t}
                        onClick={() => { setSearchType(t); setResults(null); setSearchError(''); setFlightVisibleCount(8); }}
                        className={`tab-button ${searchType === t ? 'active' : ''}`}
                        type="button"
                      >
                        {t === 'flights' ? 'Vuelos' : 'Hoteles'}
                      </button>
                    ))}
                  </div>

                  <form onSubmit={handleSearch} className="space-y-3">
                {searchType === 'flights' ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#35537b' }}>
                          Aeropuerto origen (IATA)
                        </label>
                        <input
                          type="text"
                          value={flightParams.departure_id}
                          onChange={e => setFlightParams(p => ({ ...p, departure_id: e.target.value.toUpperCase() }))}
                          placeholder="MEX o CDMX"
                          required
                          maxLength={40}
                          className="input-field"
                          list="iata-suggest"
                        />
                        <datalist id="iata-suggest">
                          {IATA_SUGGESTIONS.map(airport => (
                            <option key={airport.code} value={airport.code}>
                              {airport.label} ({airport.code})
                            </option>
                          ))}
                        </datalist>
                        <p className="text-xs mt-1" style={{ color: '#6282ad' }}>
                          Tip: puedes usar IATA (MEX) o alias de ciudad (CDMX). También permite lista: MEX,NLU.
                        </p>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#35537b' }}>
                          Aeropuerto destino (IATA)
                        </label>
                        <input
                          type="text"
                          value={flightParams.arrival_id}
                          onChange={e => setFlightParams(p => ({ ...p, arrival_id: e.target.value.toUpperCase() }))}
                          placeholder="JFK o NYC"
                          required
                          maxLength={40}
                          className="input-field"
                          list="iata-suggest"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                        Ciudad / zona / hotel
                      </label>
                      <input
                        type="text"
                        value={hotelParams.q}
                        onChange={e => setHotelParams(p => ({ ...p, q: e.target.value }))}
                        placeholder="Ej: Ciudad de México, Polanco, Marriott..."
                        required
                        className="input-field"
                        list="city-suggest"
                      />
                      <datalist id="city-suggest">
                        <option value={trip.destination ?? ''} />
                        <option value={`${trip.destination ?? ''} centro`} />
                        <option value={`${trip.destination ?? ''} cerca del aeropuerto`} />
                      </datalist>
                      <p className="text-xs mt-1" style={{ color: '#6282ad' }}>Escribe y elige una sugerencia (ciudad o zona).</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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

                    <button type="submit" disabled={searchLoading} className="btn-gold px-5 py-2 text-sm">
                      {searchLoading ? 'Buscando...' : 'Buscar opciones'}
                    </button>
                  </form>

                  {searchError && (
                    <div className="text-sm mt-3 px-3 py-2 rounded-lg" style={{ background: '#ffeef0', color: '#c9284b', border: '1px solid #f1bdc7' }}>
                      {searchError}
                    </div>
                  )}

                  {searchType === 'flights' && Array.isArray(displayFlights) && displayFlights.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {role === 'GESTOR' && (
                        <div className="flex items-center justify-between p-2 rounded-md" style={{ background: '#eef5ff', border: '1px solid #d8e6fb' }}>
                          <p className="text-xs" style={{ color: '#35537b' }}>
                            Mostrando {Math.min(flightVisibleCount, displayFlights.length)} de {displayFlights.length} vuelos
                          </p>
                          <button
                            type="button"
                            className="btn-outline px-3 py-1 text-xs"
                            disabled={flightVisibleCount >= displayFlights.length}
                            onClick={() => setFlightVisibleCount(current => current + 8)}
                            style={flightVisibleCount >= displayFlights.length ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
                          >
                            {flightVisibleCount < displayFlights.length
                              ? `Ver más opciones (${displayFlights.length - flightVisibleCount} restantes)`
                              : 'No hay más opciones'}
                          </button>
                        </div>
                      )}

                      {displayFlights.slice(0, flightVisibleCount).map((flight, i: number) => (
                        (() => {
                          const normalized = normalizeFlight(flight);
                          const arrivalSpec = getAirportSpec(normalized.toId, normalized.toName);
                          const cardKey = `${normalized.fromId}-${normalized.toId}-${normalized.airline ?? 'airline'}-${i}`;
                          const bookingUrl = getAirlineBookingUrl(
                            flight,
                            normalized.airline,
                            normalized.fromId,
                            normalized.toId,
                            flightParams.outbound_date,
                            flightParams.return_date || undefined
                          );
                          return (
                    <div key={i} className="card p-3 flex items-center justify-between gap-3">
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
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.9"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden
                            >
                              <path d="M3 12h18" />
                              <path d="M6 15h12" />
                              <path d="m9 12 3-7 3 7" />
                            </svg>
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-semibold" style={{ color: '#143b75' }}>
                            {normalized.fromId} → {normalized.toId}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: '#e8f2ff', color: '#1f5da8' }}>
                              {tripTypeLabel}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: '#eef7f0', color: '#2d7f3b' }}>
                              Llegada: {arrivalSpec.city}
                            </span>
                          </div>
                          <p className="text-xs mt-0.5" style={{ color: '#6282ad' }}>
                            {normalized.fromName} → {normalized.toName}
                          </p>
                          <p className="text-xs mt-0.5" style={{ color: '#35537b' }}>
                            {normalized.airline || 'Aerolínea no especificada'}
                          </p>
                          <p className="text-xs mt-0.5" style={{ color: '#6282ad' }}>
                            {arrivalSpec.notes}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {normalized.price !== undefined && (
                          <p className="text-sm font-bold" style={{ color: '#1f5da8' }}>
                            MXN {formatPriceMXN(normalized.price).replace('$', '').trim()}
                          </p>
                        )}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenPurchase(bookingUrl, cardKey)}
                            className="btn-ghost px-3 py-1 text-xs"
                          >
                            {openingPurchaseKey === cardKey ? 'Abriendo...' : 'Comprar vuelo (MXN)'}
                          </button>
                          <button
                            type="button"
                            className="btn-outline px-3 py-1 text-xs"
                            onClick={() => {
                              const next = saveTripSelection(trip.id, {
                                flight: {
                                  airline: normalized.airline,
                                  from: normalized.fromId === '—' ? undefined : normalized.fromId,
                                  to: normalized.toId === '—' ? undefined : normalized.toId,
                                  price: normalized.price,
                                  departure_token: normalized.departureToken,
                                  tripType: flightParams.return_date ? 'ROUND_TRIP' : 'ONE_WAY',
                                  bookingUrl,
                                  arrivalAirportName: normalized.toName,
                                },
                              });
                              setSelection(next);
                              setSearchType('hotels');
                              setResults(null);
                              setSearchError('');
                            }}
                          >
                            Seleccionar
                          </button>
                        </div>
                      </div>
                    </div>
                          );
                        })()
                      ))}

                      {role !== 'GESTOR' && flightVisibleCount < displayFlights.length && (
                        <div className="pt-2">
                          <button
                            type="button"
                            className="btn-outline px-4 py-2 text-xs"
                            onClick={() => setFlightVisibleCount(current => current + 8)}
                          >
                            Ver más opciones de vuelo ({displayFlights.length - flightVisibleCount} restantes)
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {searchType === 'hotels' && Array.isArray(displayHotels) && displayHotels.length > 0 && (
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                      {displayHotels.slice(0, 8).map((hotel, i: number) => (
                        (() => {
                          const agreement = resolveHotelAgreement(hotel.name);
                          const hotelBookingUrl = getHotelBookingUrl(
                            hotel,
                            hotelParams.q,
                            hotelParams.check_in_date,
                            hotelParams.check_out_date
                          );
                          const hotelCardKey = `hotel-${hotel.name ?? 'hotel'}-${i}`;
                          return (
                        <div key={i} className="card p-3">
                      <p className="text-sm font-semibold" style={{ color: '#143b75' }}>{hotel.name ?? 'Hotel'}</p>
                      <p className="text-xs mt-0.5" style={{ color: '#6282ad' }}>{hotel.type ?? ''}</p>
                      {agreement && (
                        <p className="text-xs mt-1" style={{ color: '#2a78ce' }}>
                          {agreement.name} · {agreement.discountPct}% descuento
                        </p>
                      )}
                      {hotel.overall_rating !== undefined && (
                        <p className="text-xs mt-1" style={{ color: '#35537b' }}>
                          Rating {hotel.overall_rating} {hotel.reviews !== undefined ? `· ${hotel.reviews} reseñas` : ''}
                        </p>
                      )}
                      {hotel.total_rate?.lowest && (
                        <p className="text-sm font-bold mt-2" style={{ color: '#1f5da8' }}>
                          MXN {hotel.total_rate.lowest.replace('$', '').trim()}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-3">
                        <button
                          type="button"
                          className="btn-ghost px-3 py-1 text-xs flex-1"
                          onClick={() => handleOpenPurchase(hotelBookingUrl, hotelCardKey)}
                        >
                          {openingPurchaseKey === hotelCardKey ? 'Abriendo...' : 'Comprar hospedaje (MXN)'}
                        </button>
                        <button
                          type="button"
                          className="btn-outline px-3 py-1 text-xs flex-1"
                          onClick={() => {
                            const next = saveTripSelection(trip.id, {
                              hotel: {
                                name: hotel.name,
                                type: hotel.type,
                                total_rate: hotel.total_rate?.lowest,
                                rate_per_night: hotel.rate_per_night?.lowest,
                                overall_rating: hotel.overall_rating,
                                reviews: hotel.reviews,
                                hasAgreement: Boolean(agreement),
                                agreementName: agreement?.name,
                                agreementCode: agreement?.code,
                                agreementDiscountPct: agreement?.discountPct,
                              },
                            });
                            setSelection(next);
                            setSearchType('flights');
                            setResults(null);
                            setSearchError('');
                            setShowSearchPanel(false);
                          }}
                        >
                          Seleccionar hospedaje
                        </button>
                      </div>
                        </div>
                          );
                        })()
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="mt-1 mb-1 text-xs" style={{ color: '#6282ad' }}>
                  Selección completada. Ahora puedes aprobar, rechazar o solicitar corrección.
                </div>
              )}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-xs font-medium mb-1.5 uppercase tracking-wider" style={{ color: '#35537b' }}>
              Comentario (opcional)
            </label>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              className="input-field resize-none"
              rows={3}
              placeholder="Agrega un comentario..."
            />
          </div>

          {error && (
            <div className="text-sm mb-3 px-3 py-2 rounded-lg" style={{ background: '#ffeef0', color: '#c9284b', border: '1px solid #f1bdc7' }}>
              {error}
            </div>
          )}

          <div className="flex flex-wrap gap-2 mb-4">
            {actions.map(a => (
              <button
                key={a.status}
                onClick={() => handleAction(a.status)}
                disabled={loading}
                className={a.danger ? 'btn-ghost px-4 py-2 text-sm' : 'btn-gold px-4 py-2 text-sm'}
                style={a.danger ? { borderColor: '#f1bdc7', color: '#c9284b', background: '#fff7f8' } : {}}
              >
                {a.label}
              </button>
            ))}
          </div>

          <button onClick={onClose} className="btn-outline px-4 py-2 text-sm w-full">Cancelar</button>
        </div>
      </div>
    </div>
  );
}

export default function TripsPage() {
  const { user } = useSessionUser();
  const role = user?.role ?? 'USER';
  const [trips, setTrips] = useState<Trip[]>([]);
  const [seenPendingIds, setSeenPendingIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Trip | null>(null);
  const [filter, setFilter] = useState<'PENDING' | 'ACCEPTED' | 'REJECTED'>('PENDING');

  const load = () => {
    setLoading(true);
    tripsApi.list()
      .then(r => setTrips(r.data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    tripsApi.list()
      .then(r => setTrips(r.data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (role !== 'GESTOR') return;
    try {
      const raw = localStorage.getItem(GESTOR_SEEN_PENDING_KEY);
      if (!raw) {
        setSeenPendingIds([]);
        return;
      }
      const parsed = JSON.parse(raw) as string[];
      setSeenPendingIds(Array.isArray(parsed) ? parsed : []);
    } catch {
      setSeenPendingIds([]);
    }
  }, [role]);

  const canApprove = role === 'GESTOR' || role === 'FINANZAS';
  const pendingByRole: Record<string, TripStatus[]> = {
    USER: ['PENDING', 'GESTOR_APPROVED', 'CORRECTION_REQUIRED'],
    GESTOR: ['PENDING', 'CORRECTION_REQUIRED'],
    FINANZAS: ['GESTOR_APPROVED', 'CORRECTION_REQUIRED'],
  };
  const acceptedByRole: Record<string, TripStatus[]> = {
    USER: ['FINANCE_APPROVED'],
    GESTOR: ['FINANCE_APPROVED'],
    FINANZAS: ['FINANCE_APPROVED'],
  };
  const rejectedByRole: Record<string, TripStatus[]> = {
    USER: ['GESTOR_REJECTED', 'FINANCE_REJECTED'],
    GESTOR: ['GESTOR_REJECTED', 'FINANCE_REJECTED'],
    FINANZAS: ['GESTOR_REJECTED', 'FINANCE_REJECTED'],
  };

  const filteredTrips = trips.filter(t => {
    if (filter === 'PENDING') return (pendingByRole[role] ?? pendingByRole.USER).includes(t.status);
    if (filter === 'ACCEPTED') return (acceptedByRole[role] ?? acceptedByRole.USER).includes(t.status);
    return (rejectedByRole[role] ?? rejectedByRole.USER).includes(t.status);
  });

  const unseenPendingTripsForGestor = useMemo(() => {
    if (role !== 'GESTOR') return [];
    return trips.filter(
      trip => trip.status === 'PENDING' && !seenPendingIds.includes(trip.id)
    );
  }, [role, trips, seenPendingIds]);

  const markPendingAsSeen = () => {
    const pendingIds = trips.filter(trip => trip.status === 'PENDING').map(trip => trip.id);
    const merged = Array.from(new Set([...seenPendingIds, ...pendingIds]));
    setSeenPendingIds(merged);
    localStorage.setItem(GESTOR_SEEN_PENDING_KEY, JSON.stringify(merged));
  };

  return (
    <div className="max-w-6xl">
      <div className="window-shell">
        <div className="window-header">
          <p className="text-xs font-semibold" style={{ color: '#35537b' }}>SOLICITUDES DE VIAJE</p>
          <div className="tab-scroll-row">
            <button type="button" onClick={() => setFilter('PENDING')} className={`tab-button ${filter === 'PENDING' ? 'active' : ''}`}>
              Pendientes
            </button>
            <button type="button" onClick={() => setFilter('ACCEPTED')} className={`tab-button ${filter === 'ACCEPTED' ? 'active' : ''}`}>
              Aceptados
            </button>
            <button type="button" onClick={() => setFilter('REJECTED')} className={`tab-button ${filter === 'REJECTED' ? 'active' : ''}`}>
              Denegados
            </button>
          </div>
        </div>

        <div className="p-5 sm:p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h1 className="text-2xl font-semibold" style={{ color: '#143b75' }}>
            {role === 'USER' ? 'Mis Viajes' : 'Solicitudes de Viaje'}
              </h1>
              <p className="text-sm mt-1" style={{ color: '#6282ad' }}>
                {filteredTrips.length} solicitud{filteredTrips.length !== 1 ? 'es' : ''} en esta vista
              </p>
            </div>
            {role === 'USER' && (
              <Link href="/dashboard/trips/new" className="btn-gold px-4 py-2.5 text-sm">
                + Nueva solicitud
              </Link>
            )}
          </div>

          {role === 'GESTOR' && unseenPendingTripsForGestor.length > 0 && (
            <div className="card p-4 mb-5" style={{ background: '#fff7e8', border: '1px solid #f2dfb0' }}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#7b5a12' }}>
                    Notificación interna
                  </p>
                  <p className="text-sm mt-1" style={{ color: '#5f4b1f' }}>
                    Tienes {unseenPendingTripsForGestor.length} solicitud{unseenPendingTripsForGestor.length === 1 ? '' : 'es'} nueva{unseenPendingTripsForGestor.length === 1 ? '' : 's'} pendiente{unseenPendingTripsForGestor.length === 1 ? '' : 's'} de revisar.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={markPendingAsSeen}
                  className="btn-outline px-3 py-1 text-xs"
                >
                  Marcar como vistas
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-sm" style={{ color: '#6282ad' }}>Cargando...</div>
          ) : error ? (
            <div className="text-sm" style={{ color: '#c9284b' }}>{error}</div>
          ) : filteredTrips.length === 0 ? (
            <div className="card p-12 text-center">
              <div className="mx-auto mb-3 inline-flex h-10 w-10 items-center justify-center rounded-md" style={{ border: '1px solid #d8e6fb', background: '#f5f9ff', color: '#35537b' }}>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M3 12h18" />
                  <path d="M6 15h12" />
                  <path d="m9 12 3-7 3 7" />
                </svg>
              </div>
              <p className="text-sm" style={{ color: '#6282ad' }}>No hay solicitudes para este filtro.</p>
              {role === 'USER' && (
                <Link href="/dashboard/trips/new" className="btn-gold mt-4 inline-block px-5 py-2.5 text-sm">
                  Crear primera solicitud
                </Link>
              )}
            </div>
          ) : (
            <div className="card overflow-hidden">
              <table className="data-table">
                <thead>
                  <tr>
                    {['Destino', 'Motivo', 'Fechas', 'Estado', 'Acciones'].map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredTrips.map(trip => (
                    <tr key={trip.id}>
                      <td className="font-semibold" style={{ color: '#143b75' }}>{trip.destination}</td>
                      <td className="max-w-xs truncate" style={{ color: '#35537b' }}>{trip.reason}</td>
                      <td className="whitespace-nowrap" style={{ color: '#6282ad', fontSize: '0.75rem' }}>
                        {trip.startDate}<br />{trip.endDate}
                      </td>
                      <td>
                        <span className={`badge ${statusBadge[trip.status] ?? 'badge-pending'}`}>
                          {statusLabel[trip.status] ?? trip.status}
                        </span>
                        {role !== 'USER' && (() => {
                          const sel = getTripSelection(trip.id);
                          if (!sel?.flight && !sel?.hotel) return null;
                          return (
                            <p className="text-xs mt-1" style={{ color: '#6282ad' }}>
                              {sel.flight ? 'Vuelo ✔' : 'Vuelo —'} · {sel.hotel ? 'Hotel ✔' : 'Hotel —'}
                            </p>
                          );
                        })()}
                        {trip.comment && (
                          <p className="text-xs mt-1 max-w-xs truncate" style={{ color: '#6282ad' }} title={trip.comment}>
                            {trip.comment}
                          </p>
                        )}
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <Link
                            href={`/dashboard/trips/${trip.id}/expenses`}
                            className="btn-ghost px-3 py-1 text-xs"
                          >
                            Gastos
                          </Link>
                          {canApprove && (
                            <button
                              onClick={() => setSelected(trip)}
                              className="btn-outline px-3 py-1 text-xs"
                            >
                              Gestionar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 text-xs" style={{ color: '#6282ad' }}>
            Tip: usa &quot;Gestionar&quot; para aprobar, rechazar o pedir correcciones.
          </div>
        </div>
      </div>

      {selected && (
        <StatusModal
          trip={selected}
          role={role}
          onClose={() => setSelected(null)}
          onSuccess={() => { setSelected(null); load(); }}
        />
      )}
    </div>
  );
}
