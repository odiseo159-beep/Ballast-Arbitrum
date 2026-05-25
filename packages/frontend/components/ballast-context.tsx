'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export interface BallastUser {
  /** ISO 4217 currency code, e.g. "EUR", "ARS". */
  currency: string;
  /** Human label of the region, e.g. "Argentina", "Spain". */
  region: string;
  /** True once the user finished the onboarding flow at least once. */
  onboarded: boolean;
}

const DEFAULT_USER: BallastUser = { currency: 'USD', region: 'Global', onboarded: false };
const STORAGE_KEY = 'ballast.user.v2';

interface Ctx extends BallastUser {
  setUser: (next: Partial<BallastUser>) => void;
}

const BallastCtx = createContext<Ctx | null>(null);

export function BallastProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<BallastUser>(DEFAULT_USER);

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
      if (raw) setUserState({ ...DEFAULT_USER, ...(JSON.parse(raw) as BallastUser) });
    } catch {
      /* ignore */
    }
  }, []);

  const setUser = useCallback((next: Partial<BallastUser>) => {
    setUserState((prev) => {
      const merged = { ...prev, ...next };
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        }
      } catch {
        /* ignore */
      }
      return merged;
    });
  }, []);

  const value = useMemo<Ctx>(() => ({ ...user, setUser }), [user, setUser]);
  return <BallastCtx.Provider value={value}>{children}</BallastCtx.Provider>;
}

export function useBallastUser(): Ctx {
  const v = useContext(BallastCtx);
  if (!v) throw new Error('useBallastUser must be inside <BallastProvider>');
  return v;
}
