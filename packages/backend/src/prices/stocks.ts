import type { StockSymbol } from '@ballast/shared';
import { ENV } from '../env.js';

export interface StockQuote {
  symbol: StockSymbol;
  /** USD per share, human-readable (e.g. 245.30). */
  priceUsd: number;
  /** ISO-8601 timestamp of the quote. */
  asOf: string;
  /** Optional 24h change percentage for display. */
  change24hPct?: number;
}

/**
 * Mock provider. Returns plausible blue-chip prices with a tiny random
 * walk so each call differs slightly — useful for demos and tests when no
 * FINANCE_API_KEY is set.
 */
function mockProvider(): Record<StockSymbol, StockQuote> {
  const baseline: Record<StockSymbol, number> = {
    TSLA: 245.30,
    AMZN: 195.40,
    PLTR:  28.15,
    NFLX: 685.50,
    AMD:  178.90,
  };
  const now = new Date().toISOString();
  const result = {} as Record<StockSymbol, StockQuote>;
  for (const sym of Object.keys(baseline) as StockSymbol[]) {
    const base = baseline[sym];
    // ±0.5% jitter — small enough to look real, big enough to be visible
    const jitter = (Math.random() - 0.5) * 0.01;
    const price = +(base * (1 + jitter)).toFixed(2);
    const change = +((Math.random() - 0.5) * 4).toFixed(2);
    result[sym] = { symbol: sym, priceUsd: price, asOf: now, change24hPct: change };
  }
  return result;
}

/**
 * Fetch current prices for the supported stocks. Real provider can be wired
 * in here later (Finnhub, Twelve Data, Alpha Vantage, etc.). For Phase 2
 * we use the mock unless FINANCE_API_KEY is set.
 */
export async function getStockPrices(): Promise<Record<StockSymbol, StockQuote>> {
  if (!ENV.FINANCE_API_KEY) {
    return mockProvider();
  }
  // TODO(phase-3): wire a real provider. For now mock even with a key set.
  return mockProvider();
}
