'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { expensesApi, tripsApi, type Expense, type Trip } from '@/lib/api';
import { useSessionUser } from '@/lib/useSessionUser';

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
      await expensesApi.create(tripId, { description: desc, amount: parsed });
      setDesc('');
      setAmount('');
      setShowForm(false);
      await loadExpenses();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Error al agregar gasto');
    } finally {
      setSaving(false);
    }
  };

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  const canAddExpense = role === 'USER' || role === 'GESTOR';

  return (
    <div className="max-w-6xl">
      <div className="window-shell">
        <div className="window-header">
          <Link href="/dashboard/trips" className="text-xs font-semibold" style={{ color: '#2a78ce' }}>
            ← Volver a solicitudes
          </Link>
          <p className="text-xs font-semibold" style={{ color: '#35537b' }}>VER GASTOS DE VIAJE</p>
          <span className="status-chip ok">Total ${total.toFixed(2)}</span>
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 mb-6">
                <div className="card p-4">
                  <p className="section-title">Total de gastos</p>
                  <p className="metric-value mt-2">${total.toFixed(2)}</p>
                </div>
                <div className="card p-4">
                  <p className="section-title">Registros</p>
                  <p className="metric-value mt-2">{expenses.length}</p>
                </div>
                <div className="card p-4">
                  <p className="section-title">Promedio</p>
                  <p className="metric-value mt-2">
                    ${expenses.length ? (total / expenses.length).toFixed(2) : '0.00'}
                  </p>
                </div>
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
                              Monto (USD) *
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
                        {['Descripcion', 'Monto', 'Fecha'].map(h => (
                          <th key={h}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {expenses.map(exp => (
                        <tr key={exp.id}>
                          <td style={{ color: '#143b75' }}>{exp.description}</td>
                          <td className="font-semibold" style={{ color: '#1f5da8' }}>${exp.amount.toFixed(2)}</td>
                          <td style={{ color: '#6282ad', fontSize: '0.75rem' }}>
                            {new Date(exp.createdAt).toLocaleDateString('es-MX')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ borderTop: '1px solid #c8daf6', background: '#f5f9ff' }}>
                        <td className="px-4 py-3 font-semibold text-xs uppercase" style={{ color: '#35537b' }}>Total</td>
                        <td className="px-4 py-3 font-bold" style={{ color: '#1f5da8' }}>${total.toFixed(2)}</td>
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
    </div>
  );
}
