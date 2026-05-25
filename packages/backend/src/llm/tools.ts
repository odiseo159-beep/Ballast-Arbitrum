import { betaZodTool } from '@anthropic-ai/sdk/helpers/beta/zod';
import { parseUnits, formatUnits } from 'viem';
import { z } from 'zod';
import { STOCK_SYMBOLS, TOKENS, type StockSymbol } from '@ballast/shared';
import {
  getAllHoldings,
  prepareUserApproveUsdgTx,
  prepareUserExecuteTx,
  pushPrices,
} from '../chain/desk.js';
import { publicClient } from '../chain/client.js';
import { erc20Abi } from 'viem';
import { getStockPrices } from '../prices/stocks.js';
import { formatLocal, getFxRate } from '../prices/fx.js';
import { proposeBasket } from './allocations.js';
import { schedulePlan } from '../dca/store.js';
import type { PendingTx, UserContext } from '../types.js';

const ADDR_REGEX = /^0x[a-fA-F0-9]{40}$/;

const StockSymbolSchema = z.enum(STOCK_SYMBOLS as unknown as [StockSymbol, ...StockSymbol[]]);
// Explicit-keys object schema (z.record with enum keys serializes to a permissive
// JSON Schema that the model may interpret as "any keys allowed"). With each
// ticker as an optional integer field, the model is constrained to our universe.
const WeightsSchema = z
  .object({
    TSLA: z.number().int().min(0).max(10_000).optional(),
    AMZN: z.number().int().min(0).max(10_000).optional(),
    PLTR: z.number().int().min(0).max(10_000).optional(),
    NFLX: z.number().int().min(0).max(10_000).optional(),
    AMD:  z.number().int().min(0).max(10_000).optional(),
  })
  .strict()
  .describe('Per-ticker weight in basis points. Only TSLA/AMZN/PLTR/NFLX/AMD are valid. MUST sum to 10000.');

/**
 * Per-request context the orchestrator collects from tool side-effects.
 * `pendingTxs` is the set of transactions the frontend should ask the user
 * to sign (in order). `scheduledPlanId` is set when the agent created a DCA
 * plan during this turn.
 */
export class RunContext {
  pendingTxs: PendingTx[] = [];
  scheduledPlanId: string | null = null;
  toolEvents: Array<{ name: string; input: unknown; output: unknown }> = [];
}

function recordEvent(ctx: RunContext, name: string, input: unknown, output: unknown) {
  ctx.toolEvents.push({ name, input, output });
}

export function buildTools(userCtx: UserContext, runCtx: RunContext) {
  // ─────────────── get_user_context ───────────────
  const getUserContext = betaZodTool({
    name: 'get_user_context',
    description:
      "Get the current user's region, local currency, and connected wallet address. Call this first on every new conversation so you can frame amounts in the right currency and address them appropriately.",
    inputSchema: z.object({}).strict(),
    run: async () => {
      const output = {
        region: userCtx.region,
        currency: userCtx.currency,
        wallet: userCtx.wallet,
        wallet_connected: userCtx.wallet !== null,
      };
      recordEvent(runCtx, 'get_user_context', {}, output);
      return JSON.stringify(output);
    },
  });

  // ─────────────── get_prices ───────────────
  const getPrices = betaZodTool({
    name: 'get_prices',
    description:
      "Get current real US stock prices (TSLA, AMZN, PLTR, NFLX, AMD) and the FX rate from USD to the user's local currency. Use the user's currency from get_user_context.",
    inputSchema: z
      .object({
        currency: z
          .string()
          .length(3)
          .describe('ISO 4217 currency code, e.g. "EUR", "ARS", "USD".')
          .optional(),
      })
      .strict(),
    run: async ({ currency }) => {
      const ccy = (currency ?? userCtx.currency ?? 'USD').toUpperCase();
      const [prices, fx] = await Promise.all([getStockPrices(), getFxRate(ccy)]);
      const stocks = (Object.entries(prices) as [StockSymbol, (typeof prices)[StockSymbol]][])
        .map(([sym, q]) => ({
          symbol: sym,
          price_usd: q.priceUsd,
          price_local: +(q.priceUsd * fx.usdToLocal).toFixed(2),
          price_local_formatted: formatLocal(q.priceUsd, fx),
          change_24h_pct: q.change24hPct ?? 0,
        }));
      const output = {
        currency: ccy,
        fx_usd_to_local: fx.usdToLocal,
        fx_source: fx.source,
        as_of: fx.asOf,
        stocks,
      };
      recordEvent(runCtx, 'get_prices', { currency: ccy }, output);
      return JSON.stringify(output);
    },
  });

  // ─────────────── propose_allocation ───────────────
  const proposeAllocation = betaZodTool({
    name: 'propose_allocation',
    description:
      "Compute a basket of US stocks for the user's stated goal and amount. Deterministic — you must call this rather than inventing weights. Returns weights in basis points (sum=10000) plus a plain-language rationale you should adapt and present to the user in their language.",
    inputSchema: z
      .object({
        goal: z.string().describe("User's stated goal in their own words."),
        usdg_amount: z.number().positive().describe('Total USDG amount to allocate.'),
        risk: z
          .enum(['safe', 'balanced', 'growth'])
          .describe(
            'Risk preset. Omit to infer from the goal text. Use "safe" for inflation-hedge / preservation; "growth" for explicit upside-seeking; otherwise "balanced".'
          )
          .optional(),
      })
      .strict(),
    run: async ({ goal, usdg_amount, risk }) => {
      const proposal = proposeBasket(goal, usdg_amount, risk);
      const breakdown = (Object.entries(proposal.weightsBps) as [StockSymbol, number][])
        .filter(([, bps]) => bps > 0)
        .map(([sym, bps]) => ({
          symbol: sym,
          weight_pct: bps / 100,
          weight_bps: bps,
          usdg_amount: +((usdg_amount * bps) / 10_000).toFixed(2),
        }));
      const output = {
        risk: proposal.risk,
        weights_bps: proposal.weightsBps,
        rationale: proposal.rationale,
        breakdown,
        total_usdg: usdg_amount,
      };
      recordEvent(runCtx, 'propose_allocation', { goal, usdg_amount, risk }, output);
      return JSON.stringify(output);
    },
  });

  // ─────────────── prepare_execute ───────────────
  const prepareExecute = betaZodTool({
    name: 'prepare_execute',
    description:
      "Prepare an on-chain allocation that the USER will sign from their wallet. This pushes fresh prices to the desk (oracle duty), then returns the calldata for the user's wallet to sign. Use ONLY after the user has explicitly confirmed the proposal. The user must approve USDG to the desk first if they haven't — the returned transactions include the approve step when needed.",
    inputSchema: z
      .object({
        beneficiary: z
          .string()
          .regex(ADDR_REGEX)
          .describe("0x address receiving the stock tokens, usually the user's own wallet."),
        usdg_amount: z.number().positive(),
        weights: WeightsSchema,
      })
      .strict(),
    run: async ({ beneficiary, usdg_amount, weights }) => {
      if (!userCtx.wallet) {
        return JSON.stringify({ error: 'No wallet connected. Ask the user to connect first.' });
      }

      // 1) Validate weights sum to 10000
      const sum = Object.values(weights).reduce((a, b) => a + (b ?? 0), 0);
      if (sum !== 10_000) {
        return JSON.stringify({
          error: `Weights sum to ${sum} bps; must equal 10000. Re-run propose_allocation.`,
        });
      }

      // 2) Push fresh prices for every stock with a non-zero weight
      const stocksToPrice = (Object.entries(weights) as [StockSymbol, number][])
        .filter(([, bps]) => bps > 0)
        .map(([sym]) => sym);
      const liveQuotes = await getStockPrices();
      const pricesToPush: Partial<Record<StockSymbol, string>> = {};
      for (const sym of stocksToPrice) {
        pricesToPush[sym] = String(liveQuotes[sym].priceUsd);
      }
      const setPricesTx = await pushPrices(pricesToPush);

      // 3) USDG is 18-decimal on Robinhood Chain (verify dynamically just in case)
      const usdgDecimals = (await publicClient.readContract({
        address: TOKENS.USDG,
        abi: erc20Abi,
        functionName: 'decimals',
      })) as number;
      const usdgAmountRaw = parseUnits(String(usdg_amount), usdgDecimals);

      // 4) Build calldata for the user to sign
      const approveTx = prepareUserApproveUsdgTx(usdgAmountRaw);
      const executeTx = prepareUserExecuteTx({
        beneficiary: beneficiary as `0x${string}`,
        usdgAmount: usdgAmountRaw,
        weights,
      });

      const pending: PendingTx[] = [
        {
          kind: 'approve_usdg',
          ...approveTx,
          description: `Approve the AllocationDesk to spend ${usdg_amount} USDG`,
        },
        {
          kind: 'execute_allocation',
          ...executeTx,
          description: `Execute allocation: ${usdg_amount} USDG → stock basket`,
        },
      ];
      runCtx.pendingTxs.push(...pending);

      const output = {
        oracle_setprices_tx: setPricesTx,
        pending_user_signatures: pending.length,
        steps: pending.map((p, i) => ({ step: i + 1, kind: p.kind, description: p.description })),
        message:
          'Prices pushed on-chain. The user now needs to sign 2 transactions in their wallet: approve USDG, then execute.',
      };
      recordEvent(runCtx, 'prepare_execute', { beneficiary, usdg_amount, weights }, output);
      return JSON.stringify(output);
    },
  });

  // ─────────────── schedule_dca ───────────────
  const scheduleDca = betaZodTool({
    name: 'schedule_dca',
    description:
      "Schedule a recurring autonomous allocation (Dollar-Cost Averaging). Once scheduled, the backend wallet executes the allocation on each cadence tick with NO user signature required — this is the autonomous behavior the user signed up for. Use ONLY after confirming cadence, per-tick amount, and total commitment with the user. The backend wallet must be pre-funded with USDG ≥ usdg_per_tick × total_ticks; mention this to the user. CADENCE NOTE: 'demo_30s' fires every 30 seconds and exists ONLY for the recorded demo / live walkthrough — do NOT select it for a real DCA plan unless the user explicitly says 'demo' or asks for a fast cadence to watch the scheduler fire.",
    inputSchema: z
      .object({
        beneficiary: z.string().regex(ADDR_REGEX),
        usdg_per_tick: z.number().positive(),
        cadence: z.enum(['demo_30s', 'hourly', 'daily', 'weekly', 'monthly']),
        weights: WeightsSchema,
        total_ticks: z.number().int().positive().max(520),
      })
      .strict(),
    run: async ({ beneficiary, usdg_per_tick, cadence, weights, total_ticks }) => {
      if (!userCtx.wallet) {
        return JSON.stringify({ error: 'No wallet connected.' });
      }
      const sum = Object.values(weights).reduce((a, b) => a + (b ?? 0), 0);
      if (sum !== 10_000) {
        return JSON.stringify({ error: `Weights sum to ${sum} bps; must equal 10000.` });
      }
      const plan = schedulePlan({
        wallet: userCtx.wallet,
        beneficiary: beneficiary as `0x${string}`,
        usdgPerTickHuman: usdg_per_tick,
        cadence,
        weightsBps: weights,
        totalTicks: total_ticks,
      });
      runCtx.scheduledPlanId = plan.id;
      const output = {
        plan_id: plan.id,
        cadence_seconds: plan.cadenceSeconds,
        cadence_label: plan.cadenceLabel,
        next_due_at: new Date(plan.nextDueAt).toISOString(),
        remaining_ticks: plan.remainingTicks,
        total_commitment_usdg: usdg_per_tick * total_ticks,
        message: `DCA plan ${plan.id} active. First tick at ${new Date(
          plan.nextDueAt
        ).toISOString()}.`,
      };
      recordEvent(
        runCtx,
        'schedule_dca',
        { beneficiary, usdg_per_tick, cadence, weights, total_ticks },
        output
      );
      return JSON.stringify(output);
    },
  });

  // ─────────────── get_portfolio ───────────────
  const getPortfolio = betaZodTool({
    name: 'get_portfolio',
    description:
      "Get the user's current holdings (USDG + each stock token) with values converted to their local currency. Includes a comparison vs. holding only cash.",
    inputSchema: z
      .object({
        wallet: z.string().regex(ADDR_REGEX).optional(),
        currency: z.string().length(3).optional(),
      })
      .strict(),
    run: async ({ wallet, currency }) => {
      const addr = (wallet ?? userCtx.wallet) as `0x${string}` | null;
      if (!addr) return JSON.stringify({ error: 'No wallet provided or connected.' });
      const ccy = (currency ?? userCtx.currency ?? 'USD').toUpperCase();

      const [holdings, prices, fx] = await Promise.all([
        getAllHoldings(addr),
        getStockPrices(),
        getFxRate(ccy),
      ]);

      const stockPositions = holdings.stocks.map((h) => {
        const priceUsd = prices[h.symbol].priceUsd;
        const valueUsd = parseFloat(h.human) * priceUsd;
        return {
          symbol: h.symbol,
          balance: h.human,
          price_usd: priceUsd,
          value_usd: +valueUsd.toFixed(2),
          value_local: +(valueUsd * fx.usdToLocal).toFixed(2),
          value_local_formatted: formatLocal(valueUsd, fx),
        };
      });

      const totalStocksUsd = stockPositions.reduce((a, p) => a + p.value_usd, 0);
      const usdgValueUsd = parseFloat(holdings.usdg.human); // USDG ≈ $1
      const totalUsd = totalStocksUsd + usdgValueUsd;

      const output = {
        wallet: addr,
        currency: ccy,
        fx_usd_to_local: fx.usdToLocal,
        usdg_balance: holdings.usdg.human,
        usdg_value_usd: usdgValueUsd,
        stock_positions: stockPositions,
        total_value_usd: +totalUsd.toFixed(2),
        total_value_local_formatted: formatLocal(totalUsd, fx),
        as_of: new Date().toISOString(),
      };
      recordEvent(runCtx, 'get_portfolio', { wallet: addr, currency: ccy }, output);
      return JSON.stringify(output);
    },
  });

  // ─────────────── explain_concept ───────────────
  const EXPLANATIONS: Record<string, string> = {
    'tokenized stock':
      "A tokenized stock is a digital token on a blockchain that represents one share of a real US company. When you hold the token, you have economic exposure to that company's stock price. The token settles 24/7 and you can hold it in any wallet — no broker needed.",
    'usdg':
      'USDG is a stablecoin: a digital token pegged 1:1 to the US dollar. It is the "cash" of the Ballast app — you bring USDG, and the desk swaps it into US stock tokens at the current price.',
    'robinhood chain':
      'Robinhood Chain is an Arbitrum-based blockchain built specifically for tokenized real-world assets. The US stock tokens we use live there. It is cheap (low gas) and fast.',
    'dca':
      'DCA stands for Dollar-Cost Averaging — investing a fixed amount on a regular schedule (e.g. $50 every week) instead of all at once. This smooths out the price you pay and removes the question of "when is the right time to buy". The Ballast agent runs your DCA plan automatically on its own.',
    'arbitrum':
      'Arbitrum is a Layer 2 blockchain built on top of Ethereum. It runs the same kind of smart contracts but much cheaper and faster. Robinhood Chain is an "Orbit" chain built using Arbitrum technology.',
    'basis points':
      'Basis points (bps) are a finance unit: 100 bps = 1%, 10000 bps = 100%. We use them for portfolio weights so percentages add up cleanly without rounding errors.',
  };

  const explainConcept = betaZodTool({
    name: 'explain_concept',
    description:
      'Get a plain-language explanation of a concept the user asks about (e.g. "tokenized stock", "USDG", "Robinhood Chain", "DCA"). Use the returned text as a starting point and adapt it to the user\'s language and what they already know.',
    inputSchema: z
      .object({
        topic: z.string().describe('What to explain — short phrase like "tokenized stock".'),
      })
      .strict(),
    run: async ({ topic }) => {
      const key = topic.trim().toLowerCase();
      const match = EXPLANATIONS[key];
      const output = match
        ? { topic: key, explanation: match }
        : {
            topic: key,
            explanation: null,
            note: 'No canned explanation. Use your own knowledge and the user\'s language to answer clearly.',
          };
      recordEvent(runCtx, 'explain_concept', { topic }, output);
      return JSON.stringify(output);
    },
  });

  return [
    getUserContext,
    getPrices,
    proposeAllocation,
    prepareExecute,
    scheduleDca,
    getPortfolio,
    explainConcept,
  ];
}
