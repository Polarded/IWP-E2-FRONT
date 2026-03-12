'use client';

import { useSyncExternalStore } from 'react';
import { getUser, type SessionUser } from '@/lib/session';

const subscribe = () => () => {};

export function useSessionUser() {
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const user: SessionUser | null = hydrated ? getUser() : null;

  return { user, hydrated };
}
