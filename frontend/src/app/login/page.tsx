'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import { saveSession, type SessionUser } from '@/lib/session';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authApi.login(email, password);
      saveSession(res.data.token, res.data.user as SessionUser);
      router.push('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="window-shell w-full max-w-5xl grid grid-cols-1 md:grid-cols-[1.2fr_1fr]">
        <section className="hidden md:flex flex-col justify-between p-8" style={{ background: 'linear-gradient(165deg, #1f5da8 0%, #2a78ce 100%)' }}>
          <div>
            <p className="text-xs uppercase tracking-widest" style={{ color: '#d7e8ff' }}>Hawk Solutions</p>
            <h1 className="text-4xl font-bold mt-3" style={{ color: '#ffffff', lineHeight: 1.1 }}>
              Controla solicitudes, gastos y aprobaciones.
            </h1>
          </div>

          <div className="space-y-3">
            {[
              'Flujo de aprobación por roles',
              'Registro detallado de gastos',
              'Búsqueda de vuelos y hoteles',
            ].map(item => (
              <div
                key={item}
                className="text-sm px-3 py-2 rounded-md"
                style={{ color: '#eff6ff', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)' }}
              >
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="p-6 sm:p-8 bg-white">
          <div className="window-header -mx-6 sm:-mx-8 -mt-6 sm:-mt-8 mb-6 sm:mb-8 rounded-none">
            <p className="text-xs font-semibold" style={{ color: '#35537b' }}>LOGIN</p>
            <div className="flex items-center gap-1.5">
              <span className="window-dot" />
              <span className="window-dot" />
            </div>
          </div>

          <h2 className="text-2xl font-semibold" style={{ color: '#143b75' }}>Iniciar sesión</h2>
          <p className="text-sm mt-1" style={{ color: '#6282ad' }}>Accede con tu correo corporativo</p>

          <form onSubmit={handleSubmit} className="space-y-4 mt-6">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#35537b' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="mail@empresa.com"
                required
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#35537b' }}>
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="********"
                required
                className="input-field"
              />
            </div>

            {error && (
              <div
                className="px-4 py-3 rounded-lg text-sm"
                style={{ background: '#ffeef0', border: '1px solid #f1bdc7', color: '#c9284b' }}
              >
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-gold w-full py-3 text-sm">
              {loading ? 'Ingresando...' : 'Entrar'}
            </button>
          </form>

          <p className="text-xs text-center mt-6" style={{ color: '#6282ad' }}>
            © {new Date().getFullYear()} Hawk Solutions
          </p>
        </section>
      </div>
    </div>
  );
}
