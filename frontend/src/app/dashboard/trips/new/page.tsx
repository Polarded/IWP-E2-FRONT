'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { tripsApi } from '@/lib/api';

export default function NewTripPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    destination: '',
    reason: '',
    startDate: '',
    endDate: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.endDate < form.startDate) {
      setError('La fecha de fin no puede ser anterior a la de inicio');
      return;
    }
    setLoading(true);
    try {
      await tripsApi.create(form);
      router.push('/dashboard/trips');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al crear el viaje');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl">
      <div className="window-shell">
        <div className="window-header">
          <Link href="/dashboard/trips" className="text-xs font-semibold" style={{ color: '#2a78ce' }}>
            ← Volver a viajes
          </Link>
          <p className="text-xs font-semibold" style={{ color: '#35537b' }}>SOLICITAR VIAJE</p>
          <span className="status-chip pending">Nuevo</span>
        </div>

        <div className="p-5 sm:p-6">
          <h1 className="text-2xl font-semibold" style={{ color: '#143b75' }}>Solicitud nueva</h1>
          <p className="text-sm mt-1" style={{ color: '#6282ad' }}>Ingresa la información requerida</p>

          <form onSubmit={handleSubmit} className="space-y-5 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#35537b' }}>
                  Destino *
                </label>
                <input
                  type="text"
                  value={form.destination}
                  onChange={set('destination')}
                  placeholder="Ej: Ciudad de Mexico"
                  required
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#35537b' }}>
                  Motivo *
                </label>
                <input
                  type="text"
                  value={form.reason}
                  onChange={set('reason')}
                  placeholder="Reunion con cliente"
                  required
                  className="input-field"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#35537b' }}>
                  Fecha salida *
                </label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={set('startDate')}
                  required
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#35537b' }}>
                  Fecha regreso *
                </label>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={set('endDate')}
                  required
                  className="input-field"
                />
              </div>
            </div>

            {error && (
              <div
                className="px-4 py-3 rounded-lg text-sm"
                style={{ background: '#ffeef0', border: '1px solid #f1bdc7', color: '#c9284b' }}
              >
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={loading} className="btn-gold px-6 py-2.5 text-sm">
                {loading ? 'Enviando...' : 'Enviar solicitud'}
              </button>
              <Link href="/dashboard/trips" className="btn-outline px-6 py-2.5 text-sm inline-flex items-center">
                Cancelar
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
