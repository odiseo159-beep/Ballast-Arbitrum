import type { StockSymbol } from '@ballast/shared';
import type { AllocationProposal } from '../types.js';

/**
 * Deterministic basket logic. The LLM only narrates these — it does NOT
 * invent the numbers. Risk preset → weights in basis points (sum = 10_000).
 *
 * Universe is constrained to the five tokens deployed on Robinhood Chain
 * testnet: TSLA, AMZN, PLTR, NFLX, AMD.
 */

const BASKETS: Record<
  'safe' | 'balanced' | 'growth',
  { weights: Partial<Record<StockSymbol, number>>; rationale: string }
> = {
  safe: {
    weights: { AMZN: 6000, NFLX: 4000 },
    rationale:
      'Concentrated in two of the steadiest names available: Amazon (diversified retail + AWS) and Netflix (subscription revenue). Lower volatility, fewer moving parts. A good fit when the goal is to anchor savings, not to chase returns.',
  },
  balanced: {
    weights: { AMZN: 3500, NFLX: 2500, AMD: 2500, TSLA: 1500 },
    rationale:
      'A mix tilted toward steadier names (Amazon, Netflix) with a meaningful slice of semiconductors (AMD) and a smaller Tesla position for upside. Spreads risk across consumer, cloud, semis, and EVs.',
  },
  growth: {
    weights: { TSLA: 4000, AMD: 3000, PLTR: 3000 },
    rationale:
      'Higher-beta basket focused on growth: Tesla (EVs + energy), AMD (semis), and Palantir (AI/data). More upside in good markets, more drawdown in bad ones. Best when the user explicitly wants growth exposure and is comfortable with volatility.',
  },
};

const RISK_KEYWORDS: Record<'safe' | 'balanced' | 'growth', RegExp> = {
  safe: /\b(safe|protect|conserve|conservative|inflation|hedge|stable|anchor|preserve)\b/i,
  growth: /\b(grow|growth|aggressive|upside|moonshot|speculative|maximum returns?|10x|big returns?)\b/i,
  balanced: /./, // fallback
};

/** Infer a risk preset from free-form user wording. */
export function inferRisk(goal: string): 'safe' | 'balanced' | 'growth' {
  if (RISK_KEYWORDS.safe.test(goal)) return 'safe';
  if (RISK_KEYWORDS.growth.test(goal)) return 'growth';
  return 'balanced';
}

export function proposeBasket(
  goal: string,
  usdgAmount: number,
  riskOverride?: 'safe' | 'balanced' | 'growth'
): AllocationProposal {
  const risk = riskOverride ?? inferRisk(goal);
  const basket = BASKETS[risk];
  // Defensive: ensure weights sum to 10_000 (mistakes here would revert on-chain).
  const sum = Object.values(basket.weights).reduce((a, b) => a + (b ?? 0), 0);
  if (sum !== 10_000) {
    throw new Error(`Basket "${risk}" weights sum to ${sum}, expected 10000.`);
  }
  return {
    risk,
    weightsBps: basket.weights,
    rationale: basket.rationale,
  };
}

/** Pretty per-stock dollar breakdown for the agent to narrate. */
export function breakdownUsd(
  weightsBps: Partial<Record<StockSymbol, number>>,
  usdgAmount: number
): Array<{ symbol: StockSymbol; bps: number; pct: string; usd: string }> {
  return (Object.entries(weightsBps) as [StockSymbol, number][])
    .filter(([, bps]) => bps > 0)
    .map(([symbol, bps]) => ({
      symbol,
      bps,
      pct: `${(bps / 100).toFixed(0)}%`,
      usd: ((usdgAmount * bps) / 10_000).toFixed(2),
    }));
}
