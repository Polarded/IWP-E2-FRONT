'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { expensesApi, tripsApi, type Trip } from '@/lib/api';
import { getTripSelection } from '@/lib/tripSelection';
import { useSessionUser } from '@/lib/useSessionUser';

interface MonthFinance {
  monthKey: string;
  flight: number;
  hotel: number;
  extras: number;
  total: number;
  trips: number;
}

const parseCurrencyValue = (raw?: string): number => {
  if (!raw) return 0;
  const normalized = raw.replace(/[^\d.,-]/g, '').trim();
  if (!normalized) return 0;

  const commaCount = (normalized.match(/,/g) ?? []).length;
  const dotCount = (normalized.match(/\./g) ?? []).length;

  let canonical = normalized;

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
    if (commaCount > 1 || lastPart.length === 3) {
      canonical = normalized.replace(/,/g, '');
    } else {
      canonical = normalized.replace(',', '.');
    }
  } else if (dotCount > 0) {
    const parts = normalized.split('.');
    const lastPart = parts[parts.length - 1] ?? '';
    if (dotCount > 1 || lastPart.length === 3) {
      canonical = normalized.replace(/\./g, '');
    }
  }

  const value = Number(canonical);
  return Number.isFinite(value) ? value : 0;
};

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(value);

const monthLabel = (monthKey: string): string => {
  const date = new Date(`${monthKey}-01T00:00:00`);
  return new Intl.DateTimeFormat('es-MX', { month: 'short', year: 'numeric' }).format(date);
};

function calculateMonthData(trips: Trip[], extrasByTrip: Record<string, number>): MonthFinance[] {
  const byMonth = new Map<string, MonthFinance>();

  for (const trip of trips) {
    const monthKey = trip.startDate.slice(0, 7);
    const selection = getTripSelection(trip.id);
    const flight = selection?.flight?.price ?? 0;
    const hotelGross = parseCurrencyValue(selection?.hotel?.total_rate);
    const hotelDiscount = selection?.hotel?.agreementDiscountPct ?? 0;
    const hotel = hotelGross * (1 - hotelDiscount / 100);
    const extras = extrasByTrip[trip.id] ?? 0;

    const current = byMonth.get(monthKey) ?? {
      monthKey,
      flight: 0,
      hotel: 0,
      extras: 0,
      total: 0,
      trips: 0,
    };

    current.flight += flight;
    current.hotel += hotel;
    current.extras += extras;
    current.total += flight + hotel + extras;
    current.trips += 1;

    byMonth.set(monthKey, current);
  }

  return [...byMonth.values()].sort((a, b) => a.monthKey.localeCompare(b.monthKey));
}

export default function FinanzasReportPage() {
  const { user } = useSessionUser();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [extrasByTrip, setExtrasByTrip] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const tripsResponse = await tripsApi.list();
        const loadedTrips = tripsResponse.data;
        setTrips(loadedTrips);

        const extrasEntries = await Promise.all(
          loadedTrips.map(async trip => {
            const expenseResponse = await expensesApi.list(trip.id);
            const total = expenseResponse.data.reduce((sum, exp) => sum + exp.amount, 0);
            return [trip.id, total] as const;
          })
        );

        setExtrasByTrip(Object.fromEntries(extrasEntries));
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Error al cargar reporte');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const monthData = useMemo(() => calculateMonthData(trips, extrasByTrip), [trips, extrasByTrip]);
  const maxMonthTotal = Math.max(1, ...monthData.map(month => month.total));

  const totals = useMemo(() => {
    return monthData.reduce(
      (acc, month) => {
        acc.flight += month.flight;
        acc.hotel += month.hotel;
        acc.extras += month.extras;
        acc.total += month.total;
        acc.trips += month.trips;
        return acc;
      },
      { flight: 0, hotel: 0, extras: 0, total: 0, trips: 0 }
    );
  }, [monthData]);

  const categoryPercentages = {
    flight: totals.total > 0 ? (totals.flight / totals.total) * 100 : 0,
    hotel: totals.total > 0 ? (totals.hotel / totals.total) * 100 : 0,
    extras: totals.total > 0 ? (totals.extras / totals.total) * 100 : 0,
  };

  if (user?.role !== 'FINANZAS') {
    return (
      <div className="max-w-5xl">
        <div className="window-shell p-6">
          <h1 className="text-xl font-semibold" style={{ color: '#143b75' }}>Reporte financiero</h1>
          <p className="text-sm mt-2" style={{ color: '#6282ad' }}>
            Esta sección es exclusiva para el rol de Finanzas.
          </p>
          <Link href="/dashboard" className="btn-outline mt-4 inline-block px-4 py-2 text-sm">
            Volver al dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl">
      <div className="window-shell">
        <div className="window-header">
          <p className="text-xs font-semibold" style={{ color: '#35537b' }}>REPORTE FINANCIERO</p>
          <span className="status-chip ok">Mensual</span>
        </div>

        <div className="p-5 sm:p-6">
          <h1 className="text-2xl font-semibold" style={{ color: '#143b75' }}>Gastos mensuales de viajes</h1>
          <p className="text-sm mt-1" style={{ color: '#6282ad' }}>
            Incluye vuelo, hotel neto (aplicando convenio) y gastos adicionales registrados.
          </p>

          {loading ? (
            <div className="text-sm mt-5" style={{ color: '#6282ad' }}>Cargando reporte...</div>
          ) : error ? (
            <div className="text-sm mt-5" style={{ color: '#c9284b' }}>{error}</div>
          ) : monthData.length === 0 ? (
            <div className="text-sm mt-5" style={{ color: '#6282ad' }}>No hay datos para generar el reporte.</div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 mb-6">
                <div className="card p-4">
                  <p className="section-title">Total mensual acumulado</p>
                  <p className="metric-value mt-2">{formatCurrency(totals.total)}</p>
                </div>
                <div className="card p-4">
                  <p className="section-title">Vuelos</p>
                  <p className="metric-value mt-2">{formatCurrency(totals.flight)}</p>
                </div>
                <div className="card p-4">
                  <p className="section-title">Hoteles</p>
                  <p className="metric-value mt-2">{formatCurrency(totals.hotel)}</p>
                </div>
                <div className="card p-4">
                  <p className="section-title">Gastos extra</p>
                  <p className="metric-value mt-2">{formatCurrency(totals.extras)}</p>
                </div>
              </div>

              <div className="card p-4 mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold" style={{ color: '#143b75' }}>Grafica mensual (total por mes)</h2>
                  <p className="text-xs" style={{ color: '#6282ad' }}>{totals.trips} viajes</p>
                </div>
                <div className="space-y-3">
                  {monthData.map(month => (
                    <div key={month.monthKey}>
                      <div className="flex justify-between text-xs mb-1" style={{ color: '#35537b' }}>
                        <span>{monthLabel(month.monthKey)}</span>
                        <span>{formatCurrency(month.total)}</span>
                      </div>
                      <div className="h-3 rounded-full overflow-hidden" style={{ background: '#e7eefb' }}>
                        <div
                          className="h-full"
                          style={{
                            width: `${Math.max(6, (month.total / maxMonthTotal) * 100)}%`,
                            background: 'linear-gradient(90deg, #2a78ce 0%, #1f5da8 100%)',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="card p-4">
                  <h2 className="text-sm font-semibold mb-3" style={{ color: '#143b75' }}>Distribución por categoría</h2>
                  <div className="space-y-2">
                    <p className="text-xs" style={{ color: '#35537b' }}>
                      Vuelo: {categoryPercentages.flight.toFixed(1)}% · Hotel: {categoryPercentages.hotel.toFixed(1)}% · Extras: {categoryPercentages.extras.toFixed(1)}%
                    </p>
                    <div className="h-4 rounded-full overflow-hidden flex" style={{ background: '#e7eefb' }}>
                      <div style={{ width: `${categoryPercentages.flight}%`, background: '#1f5da8' }} />
                      <div style={{ width: `${categoryPercentages.hotel}%`, background: '#2a78ce' }} />
                      <div style={{ width: `${categoryPercentages.extras}%`, background: '#7baee8' }} />
                    </div>
                  </div>
                </div>

                <div className="card p-4">
                  <h2 className="text-sm font-semibold mb-3" style={{ color: '#143b75' }}>Detalle mensual</h2>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Mes</th>
                        <th>Viajes</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthData.map(month => (
                        <tr key={month.monthKey}>
                          <td style={{ color: '#143b75' }}>{monthLabel(month.monthKey)}</td>
                          <td style={{ color: '#6282ad' }}>{month.trips}</td>
                          <td className="font-semibold" style={{ color: '#1f5da8' }}>{formatCurrency(month.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
