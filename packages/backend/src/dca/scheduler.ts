import type { StockSymbol } from '@ballast/shared';
import { ENV } from '../env.js';
import {
  approveDeskUsdgFromBackend,
  executeAllocationBackend,
  pushPrices,
} from '../chain/desk.js';
import { getStockPrices } from '../prices/stocks.js';
import { getDuePlans, markTickFailure, markTickSuccess } from './store.js';
import type { DcaPlan } from '../types.js';

let timer: NodeJS.Timeout | null = null;
let tickInFlight = false;

export function startScheduler() {
  if (timer) return;
  // eslint-disable-next-line no-console
  console.log(
    `[scheduler] starting (tick interval ${ENV.DCA_TICK_INTERVAL_MS}ms; demo plans fire every 30s)`
  );
  timer = setInterval(() => {
    runTick().catch((e) => {
      // eslint-disable-next-line no-console
      console.error('[scheduler] tick error:', e);
    });
  }, ENV.DCA_TICK_INTERVAL_MS);
  // Initial tick shortly after startup so demo plans created during boot can fire.
  setTimeout(() => runTick().catch(() => {}), 1500);
}

export function stopScheduler() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

async function runTick() {
  if (tickInFlight) return; // protect against overlapping ticks
  tickInFlight = true;
  try {
    const due = getDuePlans();
    if (due.length === 0) return;
    for (const plan of due) {
      await executeOnePlan(plan);
    }
  } finally {
    tickInFlight = false;
  }
}

async function executeOnePlan(plan: DcaPlan) {
  try {
    // 1) Push fresh prices for every stock in the plan
    const stocks = (Object.entries(plan.weightsBps) as [StockSymbol, number][])
      .filter(([, w]) => (w ?? 0) > 0)
      .map(([s]) => s);
    const quotes = await getStockPrices();
    const pricesToPush: Partial<Record<StockSymbol, string>> = {};
    for (const s of stocks) pricesToPush[s] = String(quotes[s].priceUsd);
    await pushPrices(pricesToPush);

    // 2) Ensure backend allowance covers the tick
    await approveDeskUsdgFromBackend(plan.usdgPerTick);

    // 3) Execute the allocation — backend signs, USDG from backend wallet,
    //    stocks land in plan.beneficiary
    const { hash } = await executeAllocationBackend({
      beneficiary: plan.beneficiary,
      usdgAmount: plan.usdgPerTick,
      weights: plan.weightsBps,
    });
    markTickSuccess(plan.id, hash);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    markTickFailure(plan.id, msg);
  }
}
