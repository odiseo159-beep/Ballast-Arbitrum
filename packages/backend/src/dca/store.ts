import { randomUUID } from 'crypto';
import { parseUnits } from 'viem';
import type { DcaPlan } from '../types.js';
import { logActivity } from '../activity/feed.js';

const CADENCE_SECONDS: Record<string, number> = {
  demo_30s: 30,
  hourly: 3600,
  daily: 86_400,
  weekly: 604_800,
  monthly: 2_592_000,
};

const plans = new Map<string, DcaPlan>();

export function schedulePlan(args: {
  wallet: `0x${string}`;
  beneficiary: `0x${string}`;
  usdgPerTickHuman: number;
  cadence: keyof typeof CADENCE_SECONDS;
  weightsBps: DcaPlan['weightsBps'];
  totalTicks: number;
}): DcaPlan {
  const cadenceSeconds = CADENCE_SECONDS[args.cadence];
  if (cadenceSeconds === undefined) throw new Error(`Unknown cadence ${args.cadence}`);

  const id = randomUUID();
  const nextDueAt = Date.now() + cadenceSeconds * 1000;
  const plan: DcaPlan = {
    id,
    wallet: args.wallet,
    beneficiary: args.beneficiary,
    usdgPerTick: parseUnits(String(args.usdgPerTickHuman), 18),
    cadenceSeconds,
    cadenceLabel: args.cadence,
    weightsBps: args.weightsBps,
    remainingTicks: args.totalTicks,
    nextDueAt,
    createdAt: new Date().toISOString(),
    status: 'active',
  };
  plans.set(id, plan);

  logActivity({
    type: 'dca_scheduled',
    wallet: args.wallet,
    summary: `Scheduled DCA: ${args.usdgPerTickHuman} USDG × ${args.totalTicks} ticks (${args.cadence})`,
    data: {
      plan_id: id,
      cadence: args.cadence,
      cadence_seconds: cadenceSeconds,
      total_ticks: args.totalTicks,
      total_commitment_usdg: args.usdgPerTickHuman * args.totalTicks,
      beneficiary: args.beneficiary,
      weights_bps: args.weightsBps,
    },
  });

  return plan;
}

export function listPlans(wallet?: `0x${string}`): DcaPlan[] {
  const all = Array.from(plans.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return wallet ? all.filter((p) => p.wallet.toLowerCase() === wallet.toLowerCase()) : all;
}

export function getPlan(id: string): DcaPlan | undefined {
  return plans.get(id);
}

export function cancelPlan(id: string): boolean {
  const p = plans.get(id);
  if (!p || p.status !== 'active') return false;
  p.status = 'cancelled';
  logActivity({
    type: 'dca_cancelled',
    wallet: p.wallet,
    summary: `Cancelled DCA plan ${id}`,
    data: { plan_id: id },
  });
  return true;
}

export function getDuePlans(): DcaPlan[] {
  const now = Date.now();
  return Array.from(plans.values()).filter(
    (p) => p.status === 'active' && p.remainingTicks > 0 && p.nextDueAt <= now
  );
}

export function markTickSuccess(id: string, hash: `0x${string}`) {
  const p = plans.get(id);
  if (!p) return;
  p.remainingTicks -= 1;
  p.nextDueAt = Date.now() + p.cadenceSeconds * 1000;
  if (p.remainingTicks === 0) p.status = 'completed';
  logActivity({
    type: 'dca_tick_executed',
    wallet: p.wallet,
    summary: `DCA tick executed (plan ${p.id.slice(0, 8)}…, ${p.remainingTicks} remaining)`,
    data: {
      plan_id: p.id,
      tx_hash: hash,
      remaining_ticks: p.remainingTicks,
      status: p.status,
    },
  });
}

export function markTickFailure(id: string, error: string) {
  const p = plans.get(id);
  if (!p) return;
  // Don't decrement remainingTicks — retry on the next cadence tick.
  p.nextDueAt = Date.now() + p.cadenceSeconds * 1000;
  logActivity({
    type: 'dca_tick_failed',
    wallet: p.wallet,
    summary: `DCA tick failed (plan ${p.id.slice(0, 8)}…): ${error.slice(0, 80)}`,
    data: { plan_id: p.id, error, will_retry_at: new Date(p.nextDueAt).toISOString() },
  });
}
