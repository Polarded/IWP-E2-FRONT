'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { searchApi, tripsApi, type Trip, type TripStatus } from '@/lib/api';
import { useSessionUser } from '@/lib/useSessionUser';
import { clearTripSelection, getTripSelection, saveTripSelection } from '@/lib/tripSelection';

const statusLabel: Record<string, string> = {
  PENDING: 'Pendiente',
  GESTOR_APPROVED: 'Aprobado por Gestor',
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
}

interface SearchResults {
  best_flights?: FlightOption[];
  flights?: FlightOption[];
  properties?: HotelOption[];
}

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
  const [searchError, setSearchError] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);

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
      setResults(res.data);
    } catch (e: unknown) {
      setSearchError(e instanceof Error ? e.message : 'Error al buscar');
    } finally {
      setSearchLoading(false);
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
            <div className="card p-4 mb-4" style={{ background: '#f5f9ff', border: '1px solid #d8e6fb' }}>
              <div className="flex items-center justify-between gap-3 mb-3">
                <p className="text-sm font-semibold" style={{ color: '#143b75' }}>Vuelos y hospedaje</p>
                <button
                  className="btn-ghost px-3 py-1 text-xs"
                  onClick={() => {
                    clearTripSelection(trip.id);
                    setSelection(null);
                  }}
                >
                  Limpiar selección
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                <div className="p-3 rounded-md" style={{ background: '#ffffff', border: '1px solid #d8e6fb' }}>
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#35537b' }}>Vuelo seleccionado</p>
                  {selection?.flight ? (
                    <p className="text-sm mt-1" style={{ color: '#143b75' }}>
                      {selection.flight.from ?? '—'} → {selection.flight.to ?? '—'}
                      {selection.flight.price !== undefined ? ` · ${formatPriceMXN(selection.flight.price)}` : ''}
                    </p>
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
                    </p>
                  ) : (
                    <p className="text-xs mt-1" style={{ color: '#6282ad' }}>Aún no has seleccionado un hospedaje.</p>
                  )}
                </div>
              </div>

              <div className="flex gap-2 mb-3">
                {(['flights', 'hotels'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => { setSearchType(t); setResults(null); setSearchError(''); }}
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
                          placeholder="MEX"
                          required
                          maxLength={3}
                          className="input-field"
                          list="iata-suggest"
                        />
                        <datalist id="iata-suggest">
                          <option value="MEX" />
                          <option value="GDL" />
                          <option value="MTY" />
                          <option value="JFK" />
                          <option value="LAX" />
                        </datalist>
                        <p className="text-xs mt-1" style={{ color: '#6282ad' }}>Tip: escribe 3 letras (ej. MEX, JFK).</p>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#35537b' }}>
                          Aeropuerto destino (IATA)
                        </label>
                        <input
                          type="text"
                          value={flightParams.arrival_id}
                          onChange={e => setFlightParams(p => ({ ...p, arrival_id: e.target.value.toUpperCase() }))}
                          placeholder="JFK"
                          required
                          maxLength={3}
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
                  {displayFlights.slice(0, 8).map((flight, i: number) => (
                    (() => {
                      const normalized = normalizeFlight(flight);
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
                      <div className="flex items-center gap-2">
                        {normalized.price !== undefined && (
                          <p className="text-sm font-bold" style={{ color: '#1f5da8' }}>{formatPriceMXN(normalized.price)}</p>
                        )}
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
                              },
                            });
                            setSelection(next);
                            onClose();
                          }}
                        >
                          Seleccionar
                        </button>
                      </div>
                    </div>
                      );
                    })()
                  ))}
                </div>
              )}

              {searchType === 'hotels' && Array.isArray(displayHotels) && displayHotels.length > 0 && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {displayHotels.slice(0, 8).map((hotel, i: number) => (
                    <div key={i} className="card p-3">
                      <p className="text-sm font-semibold" style={{ color: '#143b75' }}>{hotel.name ?? 'Hotel'}</p>
                      <p className="text-xs mt-0.5" style={{ color: '#6282ad' }}>{hotel.type ?? ''}</p>
                      {hotel.overall_rating !== undefined && (
                        <p className="text-xs mt-1" style={{ color: '#35537b' }}>
                          Rating {hotel.overall_rating} {hotel.reviews !== undefined ? `· ${hotel.reviews} reseñas` : ''}
                        </p>
                      )}
                      {hotel.total_rate?.lowest && (
                        <p className="text-sm font-bold mt-2" style={{ color: '#1f5da8' }}>
                          {hotel.total_rate.lowest}
                        </p>
                      )}
                      <button
                        type="button"
                        className="btn-outline px-3 py-1 text-xs mt-3 w-full"
                        onClick={() => {
                          const next = saveTripSelection(trip.id, {
                            hotel: {
                              name: hotel.name,
                              type: hotel.type,
                              total_rate: hotel.total_rate?.lowest,
                              rate_per_night: hotel.rate_per_night?.lowest,
                              overall_rating: hotel.overall_rating,
                              reviews: hotel.reviews,
                            },
                          });
                          setSelection(next);
                          onClose();
                        }}
                      >
                        Seleccionar hospedaje
                      </button>
                    </div>
                  ))}
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

  const canApprove = role === 'GESTOR' || role === 'FINANZAS';
  const filteredTrips = trips.filter(t => {
    if (filter === 'PENDING') return t.status === 'PENDING' || t.status === 'CORRECTION_REQUIRED';
    if (filter === 'ACCEPTED') return t.status.includes('APPROVED');
    return t.status.includes('REJECTED');
  });

  return (
    <div className="max-w-6xl">
      <div className="window-shell">
        <div className="window-header">
          <p className="text-xs font-semibold" style={{ color: '#35537b' }}>SOLICITUDES DE VIAJE</p>
          <div className="flex gap-2">
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

          {loading ? (
            <div className="text-sm" style={{ color: '#6282ad' }}>Cargando...</div>
          ) : error ? (
            <div className="text-sm" style={{ color: '#c9284b' }}>{error}</div>
          ) : filteredTrips.length === 0 ? (
            <div className="card p-12 text-center">
              <p className="text-2xl mb-3">✈️</p>
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
