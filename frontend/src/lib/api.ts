import { getToken } from '@/lib/session';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  const json = await res.json();

  if (!res.ok) {
    throw new Error(json?.message ?? json?.error ?? 'Error en la solicitud');
  }
  return json;
}

// ──────────────────────────────────────────────────────────────────────────────
// Auth
// ──────────────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    request<{ ok: boolean; data: { token: string; user: { id: string; email: string; role: string } } }>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify({ email, password }) }
    ),
  register: (email: string, password: string, role?: string) =>
    request<{ ok: boolean; data: { token: string; user: { id: string; email: string; role: string } } }>(
      '/auth/register',
      { method: 'POST', body: JSON.stringify({ email, password, role }) }
    ),
};

// ──────────────────────────────────────────────────────────────────────────────
// Trips
// ──────────────────────────────────────────────────────────────────────────────
export type TripStatus =
  | 'PENDING'
  | 'GESTOR_APPROVED'
  | 'GESTOR_REJECTED'
  | 'FINANCE_APPROVED'
  | 'FINANCE_REJECTED'
  | 'CORRECTION_REQUIRED';

export interface Trip {
  id: string;
  requesterId: string;
  destination: string;
  reason: string;
  startDate: string;
  endDate: string;
  status: TripStatus;
  comment?: string;
  createdAt: string;
  updatedAt: string;
}

export const tripsApi = {
  list: () =>
    request<{ ok: boolean; data: Trip[] }>('/trips'),
  create: (payload: { destination: string; reason: string; startDate: string; endDate: string }) =>
    request<{ ok: boolean; data: Trip }>('/trips', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateStatus: (id: string, status: TripStatus, comment?: string) =>
    request<{ ok: boolean; data: Trip }>(`/trips/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, comment }),
    }),
};

// ──────────────────────────────────────────────────────────────────────────────
// Expenses
// ──────────────────────────────────────────────────────────────────────────────
export interface Expense {
  id: string;
  tripId: string;
  description: string;
  amount: number;
  createdAt: string;
}

export const expensesApi = {
  list: (tripId: string) =>
    request<{ ok: boolean; data: Expense[] }>(`/trips/${tripId}/expenses`),
  create: (tripId: string, payload: { description: string; amount: number }) =>
    request<{ ok: boolean; data: Expense }>(`/trips/${tripId}/expenses`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};

// ──────────────────────────────────────────────────────────────────────────────
// Search
// ──────────────────────────────────────────────────────────────────────────────
export const searchApi = {
  flights: (params: Record<string, string>) => {
    const qs = new URLSearchParams(params).toString();
    return request<{ ok: boolean; data: unknown }>(`/search/flights?${qs}`);
  },
  hotels: (params: Record<string, string>) => {
    const qs = new URLSearchParams(params).toString();
    return request<{ ok: boolean; data: unknown }>(`/search/hotels?${qs}`);
  },
};
