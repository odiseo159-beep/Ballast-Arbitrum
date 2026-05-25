const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

// ─────────────────────────── Types matching backend shapes ───────────────────────────

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface UserContext {
  wallet: `0x${string}` | null;
  currency: string;
  region: string;
}

export interface PendingTx {
  kind: 'approve_usdg' | 'execute_allocation';
  to: `0x${string}`;
  data: `0x${string}`;
  value: '0x0';
  description: string;
}

export interface ChatResponse {
  text: string;
  pending_txs: PendingTx[];
  scheduled_plan_id: string | null;
  tool_events: Array<{ name: string }>;
}

export interface StockPosition {
  symbol: string;
  balance: string;
  price_usd: number;
  value_usd: number;
  value_local: number;
  value_local_formatted: string;
}

export interface PortfolioResponse {
  wallet: `0x${string}`;
  currency: string;
  fx_usd_to_local: number;
  fx_source: 'live' | 'fallback';
  usdg_balance: string;
  stock_positions: StockPosition[];
  total_value_usd: number;
  total_value_local: number;
  total_value_local_formatted: string;
  as_of: string;
}

export interface DcaPlanResponse {
  id: string;
  wallet: `0x${string}`;
  beneficiary: `0x${string}`;
  usdg_per_tick: string;
  cadence: string;
  cadence_seconds: number;
  weights_bps: Record<string, number>;
  remaining_ticks: number;
  next_due_at: string;
  created_at: string;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
}

export interface ActivityEvent {
  id: string;
  type: string;
  wallet: `0x${string}`;
  timestamp: string;
  summary: string;
  data: Record<string, unknown>;
}

// ─────────────────────────── Client ───────────────────────────

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${path} ${res.status}: ${body}`);
  }
  return (await res.json()) as T;
}

export const api = {
  health: () => call<{ ok: boolean; ts: string; allocation_desk: string | null }>('/health'),
  chat: (messages: ChatMessage[], userContext: UserContext) =>
    call<ChatResponse>('/chat', {
      method: 'POST',
      body: JSON.stringify({ messages, userContext }),
    }),
  portfolio: (wallet: `0x${string}`, currency = 'USD') =>
    call<PortfolioResponse>(`/portfolio?wallet=${wallet}&currency=${currency}`),
  listDca: (wallet: `0x${string}`) =>
    call<{ plans: DcaPlanResponse[] }>(`/dca?wallet=${wallet}`),
  cancelDca: (id: string) => call<{ cancelled: boolean }>(`/dca/${id}`, { method: 'DELETE' }),
  activity: (wallet?: `0x${string}`, limit = 50) =>
    call<{ events: ActivityEvent[] }>(
      `/activity?${wallet ? `wallet=${wallet}&` : ''}limit=${limit}`
    ),
};
