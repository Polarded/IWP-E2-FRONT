'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { clearSession } from '@/lib/session';
import { useSessionUser } from '@/lib/useSessionUser';

const navItems = {
  USER: [
    { href: '/dashboard', label: 'Dashboard', icon: '🏠' },
    { href: '/dashboard/trips', label: 'Mis Viajes', icon: '✈️' },
    { href: '/dashboard/search', label: 'Buscar Vuelos/Hoteles', icon: '🔍' },
  ],
  GESTOR: [
    { href: '/dashboard', label: 'Dashboard', icon: '🏠' },
    { href: '/dashboard/trips', label: 'Solicitudes', icon: '📋' },
    { href: '/dashboard/search', label: 'Buscar Vuelos/Hoteles', icon: '🔍' },
  ],
  FINANZAS: [
    { href: '/dashboard', label: 'Dashboard', icon: '🏠' },
    { href: '/dashboard/trips', label: 'Solicitudes Financieras', icon: '💼' },
    { href: '/dashboard/search', label: 'Buscar Vuelos/Hoteles', icon: '🔍' },
  ],
};

const roleLabel: Record<string, string> = {
  USER: 'Colaborador',
  GESTOR: 'Gestor de Viajes',
  FINANZAS: 'Finanzas',
};

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, hydrated } = useSessionUser();
  const role = user?.role ?? 'USER';
  const items = navItems[role] ?? navItems.USER;

  const handleLogout = () => {
    clearSession();
    router.push('/login');
  };

  return (
    <aside
      className="flex flex-col w-full sm:w-64"
      style={{
        background: 'linear-gradient(180deg, #1f5da8 0%, #174b8a 100%)',
        borderRight: '1px solid rgba(255,255,255,0.25)',
      }}
    >
      <div className="flex items-center gap-3 px-5 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.18)' }}>
        <div
          className="flex items-center justify-center w-9 h-9 rounded-lg flex-shrink-0"
          style={{ background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.35)' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
        <div>
          <p className="font-semibold text-sm" style={{ color: '#ffffff' }}>Gestor de viajes</p>
          <p className="text-xs" style={{ color: '#d7e8ff' }}>Portal corporativo</p>
        </div>
      </div>

      <div className="px-4 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.16)' }}>
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ background: '#ffffff', color: '#1f5da8' }}
          >
            {hydrated ? user?.email?.charAt(0).toUpperCase() ?? '?' : '?'}
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-medium truncate" style={{ color: '#f5f9ff' }}>{hydrated ? user?.email ?? '—' : '—'}</p>
            <p className="text-xs" style={{ color: '#d7e8ff' }}>{hydrated ? roleLabel[role] ?? role : 'Cargando...'}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1.5">
        {items.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-link ${pathname === item.href ? 'active' : ''}`}
          >
            <span className="text-base">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="px-3 pb-5" style={{ borderTop: '1px solid rgba(255,255,255,0.16)', paddingTop: '1rem' }}>
        <button onClick={handleLogout} className="nav-link w-full text-left">
          <span>🚪</span>
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}
