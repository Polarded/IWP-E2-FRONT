'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { isAuthenticated } from '@/lib/session';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen p-3 sm:p-5">
      <div className="window-shell min-h-[calc(100vh-1.5rem)] sm:min-h-[calc(100vh-2.5rem)] flex flex-col">
        <div className="window-header">
          <div className="flex items-center gap-2">
            <span className="window-dot" />
            <span className="window-dot" />
            <span className="window-dot" />
          </div>
          <p className="text-xs font-semibold" style={{ color: '#35537b', letterSpacing: '0.03em' }}>
            PANEL PRINCIPAL
          </p>
          <div className="text-xs" style={{ color: '#6282ad' }}>v2.0</div>
        </div>

        <div className="flex-1 flex flex-col sm:flex-row min-h-0">
          <Sidebar />
          <main className="flex-1 p-4 sm:p-6 overflow-auto" style={{ background: '#f5f9ff' }}>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
