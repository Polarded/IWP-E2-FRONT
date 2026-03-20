'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { expensesApi, tripsApi, type Expense, type Trip } from '@/lib/api';
import { useSessionUser } from '@/lib/useSessionUser';
import { getTripSelection } from '@/lib/tripSelection';

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('No se pudo leer la imagen del ticket'));
    reader.readAsDataURL(file);
  });

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

export default function ExpensesPage() {
  const params = useParams();
  const tripId = typeof params.id === 'string' ? params.id : params.id?.[0] ?? '';
  const { user } = useSessionUser();
  const role = user?.role ?? 'USER';

  const [trip, setTrip] = useState<Trip | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // New expense form
  const [showForm, setShowForm] = useState(false);
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [ticketFile, setTicketFile] = useState<File | null>(null);
  const [previewTicketUrl, setPreviewTicketUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const loadExpenses = () =>
    expensesApi.list(tripId)
      .then(r => setExpenses(r.data))
      .catch(e => setError(e.message));

  useEffect(() => {
    (async () => {
      try {
        const [tripsRes, expRes] = await Promise.all([
          tripsApi.list(),
          expensesApi.list(tripId),
        ]);
        const found = tripsRes.data.find(t => t.id === tripId) ?? null;
        setTrip(found);
        setExpenses(expRes.data);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Error al cargar datos');
      } finally {
        setLoading(false);
      }
    })();
  }, [tripId]);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) {
      setFormError('El monto debe ser un número positivo');
      return;
    }
    setSaving(true);
    try {
      let ticketImageUrl: string | undefined;
      if (ticketFile) {
        ticketImageUrl = await readFileAsDataUrl(ticketFile);
      }

      await expensesApi.create(tripId, { description: desc, amount: parsed, ticketImageUrl });
      setDesc('');
      setAmount('');
      setTicketFile(null);
      setShowForm(false);
      await loadExpenses();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Error al agregar gasto');
    } finally {
      setSaving(false);
    }
  };

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  const selection = getTripSelection(tripId);
  const flightCost = selection?.flight?.price ?? 0;
  const hotelGrossCost = parseCurrencyValue(selection?.hotel?.total_rate);
  const hotelDiscount = selection?.hotel?.agreementDiscountPct ?? 0;
  const hotelNetCost = hotelGrossCost * (1 - hotelDiscount / 100);
  const travelTotal = flightCost + hotelNetCost + total;
  const canAddExpense = role === 'USER' || role === 'GESTOR';

  return (
    <div className="max-w-6xl">
      <div className="window-shell">
        <div className="window-header">
          <Link href="/dashboard/trips" className="text-xs font-semibold" style={{ color: '#2a78ce' }}>
            ← Volver a solicitudes
          </Link>
          <p className="text-xs font-semibold" style={{ color: '#35537b' }}>VER GASTOS DE VIAJE</p>
          <span className="status-chip ok">Total viaje ${travelTotal.toFixed(2)}</span>
        </div>

        <div className="p-5 sm:p-6">
          <h1 className="text-2xl font-semibold" style={{ color: '#143b75' }}>Gastos del viaje</h1>
          {trip && (
            <p className="text-sm mt-1" style={{ color: '#6282ad' }}>
              {trip.destination} · {trip.startDate} → {trip.endDate}
            </p>
          )}

          {loading ? (
            <div className="text-sm mt-6" style={{ color: '#6282ad' }}>Cargando...</div>
          ) : error ? (
            <div className="text-sm mt-6" style={{ color: '#c9284b' }}>{error}</div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 mb-6">
                <div className="card p-4">
                  <p className="section-title">Vuelo</p>
                  <p className="metric-value mt-2">${flightCost.toFixed(2)}</p>
                </div>
                <div className="card p-4">
                  <p className="section-title">Hotel (neto)</p>
                  <p className="metric-value mt-2">${hotelNetCost.toFixed(2)}</p>
                  {selection?.hotel?.hasAgreement && (
                    <p className="text-xs mt-2" style={{ color: '#2a78ce' }}>
                      Convenio: {selection.hotel.agreementDiscountPct ?? 0}%
                    </p>
                  )}
                </div>
                <div className="card p-4">
                  <p className="section-title">Gastos adicionales</p>
                  <p className="metric-value mt-2">${total.toFixed(2)}</p>
                </div>
                <div className="card p-4">
                  <p className="section-title">Total viaje</p>
                  <p className="metric-value mt-2">${travelTotal.toFixed(2)}</p>
                </div>
              </div>

              <div className="card p-4 mb-6" style={{ background: '#f5f9ff', border: '1px solid #d8e6fb' }}>
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#35537b' }}>
                  Formula financiera
                </p>
                <p className="text-sm mt-1" style={{ color: '#143b75' }}>
                  Vuelo (${flightCost.toFixed(2)}) + Hotel (${hotelNetCost.toFixed(2)}) + Gastos (${total.toFixed(2)}) = <strong>${travelTotal.toFixed(2)}</strong>
                </p>
              </div>

              {canAddExpense && (
                <div className="mb-5">
                  {!showForm ? (
                    <button onClick={() => setShowForm(true)} className="btn-gold px-4 py-2.5 text-sm">
                      + Agregar gasto
                    </button>
                  ) : (
                    <div className="card p-5">
                      <h3 className="text-sm font-semibold mb-4" style={{ color: '#143b75' }}>Nuevo gasto</h3>
                      <form onSubmit={handleAddExpense} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#35537b' }}>
                              Descripcion *
                            </label>
                            <input
                              type="text"
                              value={desc}
                              onChange={e => setDesc(e.target.value)}
                              placeholder="Vuelo de ida"
                              required
                              className="input-field"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#35537b' }}>
                              Monto (MXN) *
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={amount}
                              onChange={e => setAmount(e.target.value)}
                              placeholder="0.00"
                              required
                              className="input-field"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#35537b' }}>
                              Foto del ticket (opcional)
                            </label>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={e => setTicketFile(e.target.files?.[0] ?? null)}
                              className="input-field"
                            />
                            <p className="text-xs mt-1" style={{ color: '#6282ad' }}>
                              Se guarda como evidencia para finanzas.
                            </p>
                          </div>
                        </div>

                        {formError && (
                          <div className="text-sm px-3 py-2 rounded-lg" style={{ background: '#ffeef0', color: '#c9284b', border: '1px solid #f1bdc7' }}>
                            {formError}
                          </div>
                        )}

                        <div className="flex gap-3">
                          <button type="submit" disabled={saving} className="btn-gold px-5 py-2 text-sm">
                            {saving ? 'Guardando...' : 'Guardar'}
                          </button>
                          <button type="button" onClick={() => setShowForm(false)} className="btn-outline px-5 py-2 text-sm">
                            Cancelar
                          </button>
                        </div>
                      </form>
                    </div>
                  )}
                </div>
              )}

              {expenses.length === 0 ? (
                <div className="card p-10 text-center">
                  <div className="mx-auto mb-2 inline-flex h-10 w-10 items-center justify-center rounded-md" style={{ border: '1px solid #d8e6fb', background: '#f5f9ff', color: '#35537b' }}>
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
                      <path d="M7 3h10v18l-2-1.2L13 21l-2-1.2L9 21l-2-1.2L5 21V5a2 2 0 0 1 2-2z" />
                      <path d="M9 8h6M9 12h6" />
                    </svg>
                  </div>
                  <p className="text-sm" style={{ color: '#6282ad' }}>No hay gastos registrados para este viaje.</p>
                </div>
              ) : (
                <div className="card overflow-hidden">
                  <table className="data-table">
                    <thead>
                      <tr>
                        {['Descripcion', 'Monto (MXN)', 'Ticket', 'Fecha'].map(h => (
                          <th key={h}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {expenses.map(exp => (
                        <tr key={exp.id}>
                          <td style={{ color: '#143b75' }}>{exp.description}</td>
                          <td className="font-semibold" style={{ color: '#1f5da8' }}>${exp.amount.toFixed(2)}</td>
                          <td>
                            {exp.ticketImageUrl ? (
                              exp.ticketImageUrl.startsWith('data:image/') ? (
                                <button
                                  type="button"
                                  onClick={() => setPreviewTicketUrl(exp.ticketImageUrl ?? null)}
                                  className="text-xs font-semibold"
                                  style={{ color: '#2a78ce' }}
                                >
                                  Ver ticket
                                </button>
                              ) : (
                                <a href={exp.ticketImageUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold" style={{ color: '#2a78ce' }}>
                                  Ver ticket
                                </a>
                              )
                            ) : (
                              <span className="text-xs" style={{ color: '#6282ad' }}>Sin imagen</span>
                            )}
                          </td>
                          <td style={{ color: '#6282ad', fontSize: '0.75rem' }}>
                            {new Date(exp.createdAt).toLocaleDateString('es-MX')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ borderTop: '1px solid #c8daf6', background: '#f5f9ff' }}>
                        <td className="px-4 py-3 font-semibold text-xs uppercase" style={{ color: '#35537b' }}>Gastos adicionales</td>
                        <td className="px-4 py-3 font-bold" style={{ color: '#1f5da8' }}>${total.toFixed(2)}</td>
                        <td />
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {previewTicketUrl && (
        <div className="modal-backdrop" onClick={() => setPreviewTicketUrl(null)}>
          <div className="modal-window" onClick={e => e.stopPropagation()}>
            <div className="window-header">
              <p className="text-xs font-semibold" style={{ color: '#35537b' }}>PREVIEW TICKET</p>
              <button onClick={() => setPreviewTicketUrl(null)} className="btn-ghost px-2 py-1 text-xs">X</button>
            </div>
            <div className="p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewTicketUrl}
                alt="Ticket de gasto"
                className="w-full rounded-md"
                style={{ maxHeight: '70vh', objectFit: 'contain', background: '#f5f9ff', border: '1px solid #d8e6fb' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
