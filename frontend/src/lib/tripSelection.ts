export interface SelectedFlight {
  airline?: string;
  from?: string;
  to?: string;
  price?: number;
  departure_token?: string;
}

export interface SelectedHotel {
  name?: string;
  type?: string;
  total_rate?: string;
  rate_per_night?: string;
  overall_rating?: number;
  reviews?: number;
}

export interface TripSelection {
  flight?: SelectedFlight;
  hotel?: SelectedHotel;
  updatedAt: string;
}

const KEY = 'viajesapp_trip_selection_v1';

function readAll(): Record<string, TripSelection> {
  if (typeof window === 'undefined') return {};
  const raw = localStorage.getItem(KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, TripSelection>;
  } catch {
    return {};
  }
}

function writeAll(map: Record<string, TripSelection>) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY, JSON.stringify(map));
}

export function getTripSelection(tripId: string): TripSelection | null {
  const all = readAll();
  return all[tripId] ?? null;
}

export function saveTripSelection(tripId: string, patch: Omit<TripSelection, 'updatedAt'>): TripSelection {
  const all = readAll();
  const prev = all[tripId] ?? { updatedAt: new Date(0).toISOString() };
  const next: TripSelection = {
    ...prev,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  all[tripId] = next;
  writeAll(all);
  return next;
}

export function clearTripSelection(tripId: string) {
  const all = readAll();
  if (!(tripId in all)) return;
  delete all[tripId];
  writeAll(all);
}
