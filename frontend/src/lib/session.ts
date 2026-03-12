export type UserRole = 'USER' | 'GESTOR' | 'FINANZAS';

export interface SessionUser {
  id: string;
  email: string;
  role: UserRole;
}

const TOKEN_KEY = 'viajesapp_token';
const USER_KEY = 'viajesapp_user';

export function saveSession(token: string, user: SessionUser): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  // Also set a cookie so the Next.js middleware can read it
  document.cookie = `viajesapp_token=${token}; path=/; SameSite=Strict`;
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser(): SessionUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  document.cookie = 'viajesapp_token=; path=/; max-age=0';
}

export function isAuthenticated(): boolean {
  return !!getToken();
}
