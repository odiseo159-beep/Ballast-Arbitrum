import { Hono } from 'hono';
import { formatUnits } from 'viem';
import { cancelPlan, listPlans } from '../dca/store.js';
import type { DcaPlan } from '../types.js';

function serialize(p: DcaPlan) {
  return {
    id: p.id,
    wallet: p.wallet,
    beneficiary: p.beneficiary,
    usdg_per_tick: formatUnits(p.usdgPerTick, 18),
    cadence: p.cadenceLabel,
    cadence_seconds: p.cadenceSeconds,
    weights_bps: p.weightsBps,
    remaining_ticks: p.remainingTicks,
    next_due_at: new Date(p.nextDueAt).toISOString(),
    created_at: p.createdAt,
    status: p.status,
  };
}

export const dcaRoute = new Hono();

dcaRoute.get('/', (c) => {
  const wallet = c.req.query('wallet') as `0x${string}` | undefined;
  if (wallet && !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
    return c.json({ error: 'invalid wallet' }, 400);
  }
  const plans = listPlans(wallet);
  return c.json({ plans: plans.map(serialize) });
});

dcaRoute.delete('/:id', (c) => {
  const id = c.req.param('id');
  const ok = cancelPlan(id);
  if (!ok) return c.json({ error: 'plan not found or already cancelled/completed' }, 404);
  return c.json({ cancelled: true });
});
