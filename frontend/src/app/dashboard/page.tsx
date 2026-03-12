'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { tripsApi, type Trip } from '@/lib/api';
import { useSessionUser } from '@/lib/useSessionUser';

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

function StatCard({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="card p-4">
      <p className="section-title">{label}</p>
      <p className="metric-value mt-2">{value}</p>
      {sub && <p className="text-xs mt-2" style={{ color: '#6282ad' }}>{sub}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const { user, hydrated } = useSessionUser();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    tripsApi.list()
      .then(r => setTrips(r.data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const pending = trips.filter(t => t.status === 'PENDING').length;
  const approved = trips.filter(t => t.status === 'FINANCE_APPROVED').length;
  const rejected = trips.filter(t => t.status.includes('REJECTED')).length;
  const recent = [...trips].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);

  const roleLabel: Record<string, string> = {
    USER: 'Colaborador',
    GESTOR: 'Gestor de Viajes',
    FINANZAS: 'Finanzas',
  };

  return (
    <div className="max-w-6xl">
      <div className="window-shell">
        <div className="window-header">
          <p className="text-xs font-semibold" style={{ color: '#35537b' }}>PRINCIPAL</p>
          <div className="flex items-center gap-2">
            <span className="status-chip ok">Sistema activo</span>
          </div>
        </div>

        <div className="p-5 sm:p-6">
          <h1 className="text-2xl font-semibold" style={{ color: '#143b75' }}>
          Bienvenido, {hydrated ? user?.email?.split('@')[0] ?? 'Usuario' : 'Usuario'}
          </h1>
          <p className="text-sm mt-1" style={{ color: '#6282ad' }}>
            {roleLabel[user?.role ?? ''] ?? user?.role} · Resumen general
          </p>

          <div className="flex flex-wrap gap-2 mt-5 mb-4">
            <span className="tab-button active">Solicitudes</span>
          </div>

          {loading ? (
            <div className="text-sm" style={{ color: '#6282ad' }}>Cargando estadísticas...</div>
          ) : error ? (
            <div className="text-sm" style={{ color: '#c9284b' }}>{error}</div>
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard label="Total viajes" value={trips.length} />
                <StatCard label="Pendientes" value={pending} />
                <StatCard label="Aprobados" value={approved} />
                <StatCard label="Rechazados" value={rejected} />
              </div>

              <div className="card overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #c8daf6' }}>
                  <h2 className="text-sm font-semibold" style={{ color: '#143b75' }}>Solicitudes recientes</h2>
                  <Link href="/dashboard/trips" className="text-xs font-semibold" style={{ color: '#2a78ce' }}>Ver todas</Link>
                </div>
                {recent.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm" style={{ color: '#6282ad' }}>
                    No hay viajes registrados aún.
                  </div>
                ) : (
                  <div className="divide-y" style={{ borderColor: '#e4eefc' }}>
                    {recent.map(trip => (
                      <div
                        key={trip.id}
                        className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                      >
                        <div>
                          <p className="text-sm font-semibold" style={{ color: '#143b75' }}>{trip.destination}</p>
                          <p className="text-xs" style={{ color: '#6282ad' }}>
                            {trip.startDate} · {trip.endDate}
                          </p>
                        </div>
                        <span className={`badge ${statusBadge[trip.status] ?? 'badge-pending'}`}>
                          {statusLabel[trip.status] ?? trip.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-5 flex gap-3 flex-wrap">
                {user?.role === 'USER' && (
                  <Link href="/dashboard/trips/new" className="btn-gold px-5 py-2.5 text-sm">
                    + Nueva solicitud
                  </Link>
                )}
                <Link href="/dashboard/trips" className="btn-outline px-5 py-2.5 text-sm">
                  Ver solicitudes
                </Link>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="card mt-5 p-4 sm:p-5">
        <h3 className="text-sm font-semibold" style={{ color: '#143b75' }}>Indicadores rápidos</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
          <div className="p-3 rounded-md" style={{ background: '#f5f9ff', border: '1px solid #d8e6fb' }}>
            <p className="text-xs" style={{ color: '#6282ad' }}>Tasa de aprobación</p>
            <p className="text-lg font-bold" style={{ color: '#143b75' }}>
              {trips.length ? Math.round((approved / trips.length) * 100) : 0}%
            </p>
          </div>
          <div className="p-3 rounded-md" style={{ background: '#f5f9ff', border: '1px solid #d8e6fb' }}>
            <p className="text-xs" style={{ color: '#6282ad' }}>En revisión</p>
            <p className="text-lg font-bold" style={{ color: '#143b75' }}>{pending}</p>
          </div>
          <div className="p-3 rounded-md" style={{ background: '#f5f9ff', border: '1px solid #d8e6fb' }}>
            <p className="text-xs" style={{ color: '#6282ad' }}>Total histórico</p>
            <p className="text-lg font-bold" style={{ color: '#143b75' }}>{trips.length}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
