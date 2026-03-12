'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { tripsApi, type Trip, type TripStatus } from '@/lib/api';
import { useSessionUser } from '@/lib/useSessionUser';

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
      await tripsApi.updateStatus(trip.id, status, comment || undefined);
      onSuccess();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <div className="max-w-6xl">
      <div className="window-shell">
        <div className="window-header">
          <p className="text-xs font-semibold" style={{ color: '#35537b' }}>SOLICITUDES DE VIAJE</p>
          <div className="flex gap-2">
            <span className="tab-button active">Pendientes</span>
            <span className="tab-button">Aceptados</span>
            <span className="tab-button">Denegados</span>
          </div>
        </div>

        <div className="p-5 sm:p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h1 className="text-2xl font-semibold" style={{ color: '#143b75' }}>
            {role === 'USER' ? 'Mis Viajes' : 'Solicitudes de Viaje'}
              </h1>
              <p className="text-sm mt-1" style={{ color: '#6282ad' }}>
                {trips.length} solicitud{trips.length !== 1 ? 'es' : ''} registrada{trips.length !== 1 ? 's' : ''}
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
          ) : trips.length === 0 ? (
            <div className="card p-12 text-center">
              <p className="text-2xl mb-3">✈️</p>
              <p className="text-sm" style={{ color: '#6282ad' }}>No hay solicitudes de viaje aún.</p>
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
                  {trips.map(trip => (
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
