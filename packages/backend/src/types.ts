import type { StockSymbol } from '@ballast/shared';

export interface UserContext {
  /** The user's connected wallet address. `null` if not connected yet. */
  wallet: `0x${string}` | null;
  /** ISO 4217 currency code used for local-currency display. */
  currency: string;
  /** Human-readable region label, e.g. "Argentina". */
  region: string;
}

export interface AllocationProposal {
  weightsBps: Partial<Record<StockSymbol, number>>;
  rationale: string;
  risk: 'safe' | 'balanced' | 'growth';
}

export interface PendingTx {
  kind: 'approve_usdg' | 'execute_allocation';
  to: `0x${string}`;
  data: `0x${string}`;
  value: '0x0';
  description: string;
}

export interface DcaPlan {
  id: string;
  wallet: `0x${string}`;
  beneficiary: `0x${string}`;
  usdgPerTick: bigint;
  cadenceSeconds: number;
  cadenceLabel: string;
  weightsBps: Partial<Record<StockSymbol, number>>;
  remainingTicks: number;
  nextDueAt: number; // epoch ms
  createdAt: string;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
}

export interface ActivityEvent {
  id: string;
  type:
    | 'dca_scheduled'
    | 'dca_tick_executed'
    | 'dca_tick_failed'
    | 'dca_cancelled'
    | 'allocation_executed';
  wallet: `0x${string}`;
  timestamp: string;
  summary: string;
  data: Record<string, unknown>;
}
