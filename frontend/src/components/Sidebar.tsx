'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { clearSession } from '@/lib/session';
import { useSessionUser } from '@/lib/useSessionUser';

const navItems = {
  USER: [
    { href: '/dashboard', label: 'Dashboard', icon: 'home' },
    { href: '/dashboard/trips', label: 'Mis Viajes', icon: 'trips' },
  ],
  GESTOR: [
    { href: '/dashboard', label: 'Dashboard', icon: 'home' },
    { href: '/dashboard/trips', label: 'Solicitudes', icon: 'clipboard' },
  ],
  FINANZAS: [
    { href: '/dashboard', label: 'Dashboard', icon: 'home' },
    { href: '/dashboard/trips', label: 'Solicitudes Financieras', icon: 'briefcase' },
    { href: '/dashboard/finanzas', label: 'Reporte Mensual', icon: 'chart' },
  ],
};

const roleLabel: Record<string, string> = {
  USER: 'Colaborador',
  GESTOR: 'Gestor de Viajes',
  FINANZAS: 'Finanzas',
};

function renderNavIcon(icon: string) {
  const baseProps = {
    width: 16,
    height: 16,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.9,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };

  if (icon === 'home') {
    return (
      <svg {...baseProps}>
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5 9.5V20h14V9.5" />
      </svg>
    );
  }

  if (icon === 'trips') {
    return (
      <svg {...baseProps}>
        <path d="M3 12h18" />
        <path d="M6 15h12" />
        <path d="m9 12 3-7 3 7" />
      </svg>
    );
  }

  if (icon === 'clipboard') {
    return (
      <svg {...baseProps}>
        <rect x="6" y="4" width="12" height="16" rx="2" />
        <path d="M9 4.5h6" />
        <path d="M9 10h6M9 14h6" />
      </svg>
    );
  }

  if (icon === 'briefcase') {
    return (
      <svg {...baseProps}>
        <rect x="3" y="7" width="18" height="12" rx="2" />
        <path d="M9 7V5h6v2" />
        <path d="M3 12h18" />
      </svg>
    );
  }

  if (icon === 'chart') {
    return (
      <svg {...baseProps}>
        <path d="M4 19h16" />
        <rect x="6" y="11" width="3" height="6" rx="1" />
        <rect x="11" y="8" width="3" height="9" rx="1" />
        <rect x="16" y="5" width="3" height="12" rx="1" />
      </svg>
    );
  }

  return (
    <svg {...baseProps}>
      <path d="M7 7l10 10M17 7 7 17" />
    </svg>
  );
}

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
          <p className="font-semibold text-sm" style={{ color: '#ffffff' }}>Hawk Solutions</p>
          <p className="text-xs" style={{ color: '#d7e8ff' }}>Gestión de viajes corporativos</p>
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
            <span className="inline-flex items-center justify-center" style={{ width: 18, height: 18 }}>
              {renderNavIcon(item.icon)}
            </span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="px-3 pb-5" style={{ borderTop: '1px solid rgba(255,255,255,0.16)', paddingTop: '1rem' }}>
        <button onClick={handleLogout} className="nav-link w-full text-left">
          <span className="inline-flex items-center justify-center" style={{ width: 18, height: 18 }}>
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
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <path d="M10 17l5-5-5-5" />
              <path d="M15 12H3" />
            </svg>
          </span>
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}
