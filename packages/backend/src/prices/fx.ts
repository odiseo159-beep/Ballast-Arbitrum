/**
 * FX rates for converting USD → user's local currency.
 *
 * Default provider: exchangerate.host (free, no key required).
 * If the call fails we fall back to a small static table so the demo
 * never gets stuck on a network blip.
 */

const STATIC_FALLBACK: Record<string, number> = {
  USD: 1.0,
  EUR: 0.92,
  GBP: 0.79,
  ARS: 1024.5,
  BRL: 5.78,
  MXN: 18.45,
  COP: 4012.0,
  PEN: 3.78,
  CLP: 950.0,
  NGN: 1600.0,
  TRY: 38.5,
  INR: 84.3,
  PHP: 58.7,
  IDR: 15800.0,
  ZAR: 18.9,
  PLN: 3.97,
  JPY: 156.2,
};

export interface FxRate {
  /** ISO 4217 code, e.g. "EUR". */
  currency: string;
  /** How many units of `currency` equal 1 USD. */
  usdToLocal: number;
  asOf: string;
  source: 'live' | 'fallback';
}

let cache: { rate: FxRate; expiresAt: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 min

export async function getFxRate(currency: string): Promise<FxRate> {
  const code = currency.toUpperCase();
  const now = Date.now();
  if (cache && cache.rate.currency === code && cache.expiresAt > now) {
    return cache.rate;
  }

  try {
    const url = `https://api.exchangerate.host/latest?base=USD&symbols=${code}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      const json = (await res.json()) as { rates?: Record<string, number>; date?: string };
      const rate = json.rates?.[code];
      if (typeof rate === 'number' && rate > 0) {
        const fx: FxRate = {
          currency: code,
          usdToLocal: rate,
          asOf: json.date ?? new Date().toISOString(),
          source: 'live',
        };
        cache = { rate: fx, expiresAt: now + CACHE_TTL_MS };
        return fx;
      }
    }
  } catch {
    // fall through to static
  }

  const fallback = STATIC_FALLBACK[code] ?? 1.0;
  const fx: FxRate = {
    currency: code,
    usdToLocal: fallback,
    asOf: new Date().toISOString(),
    source: 'fallback',
  };
  cache = { rate: fx, expiresAt: now + CACHE_TTL_MS };
  return fx;
}

export function formatLocal(amountUsd: number, fx: FxRate): string {
  const local = amountUsd * fx.usdToLocal;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: fx.currency,
    maximumFractionDigits: 2,
  }).format(local);
}
