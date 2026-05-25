import { encodeFunctionData, erc20Abi, formatUnits, parseUnits } from 'viem';
import {
  AllocationDeskAbi,
  STOCK_ADDRESSES,
  STOCK_SYMBOLS,
  TESTNET_DEPLOYMENT,
  TOKENS,
  type StockSymbol,
} from '@ballast/shared';
import { publicClient, walletClient, backendAccount, explorerTx } from './client.js';

// ─────────────────────────── Helpers ───────────────────────────

function deskAddress(): `0x${string}` {
  const addr = TESTNET_DEPLOYMENT.allocationDesk;
  if (!addr) {
    throw new Error(
      'AllocationDesk not deployed yet. Run `pnpm contracts:deploy` first.'
    );
  }
  return addr;
}

const PRICE_SCALE = 10n ** 18n; // USDG-per-stock fixed-point scale on the desk

/** Convert a human price ("180.50") to the desk's 1e18 fixed-point. */
export function priceToScaled(human: string): bigint {
  return parseUnits(human, 18);
}

/** Format a 1e18-scaled price back to a human-readable string. */
export function priceFromScaled(scaled: bigint): string {
  return formatUnits(scaled, 18);
}

// ─────────────────────────── Reads ───────────────────────────

export async function getStockBalance(
  owner: `0x${string}`,
  stock: StockSymbol
): Promise<{ raw: bigint; human: string; decimals: number }> {
  const addr = STOCK_ADDRESSES[stock];
  const [raw, decimals] = await Promise.all([
    publicClient.readContract({
      address: addr,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [owner],
    }),
    publicClient.readContract({
      address: addr,
      abi: erc20Abi,
      functionName: 'decimals',
    }),
  ]);
  return { raw, decimals, human: formatUnits(raw, decimals) };
}

export async function getUsdgBalance(
  owner: `0x${string}`
): Promise<{ raw: bigint; human: string; decimals: number }> {
  const [raw, decimals] = await Promise.all([
    publicClient.readContract({
      address: TOKENS.USDG,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [owner],
    }),
    publicClient.readContract({
      address: TOKENS.USDG,
      abi: erc20Abi,
      functionName: 'decimals',
    }),
  ]);
  return { raw, decimals, human: formatUnits(raw, decimals) };
}

export async function getAllHoldings(owner: `0x${string}`) {
  const [usdg, ...stocks] = await Promise.all([
    getUsdgBalance(owner),
    ...STOCK_SYMBOLS.map((s) => getStockBalance(owner, s)),
  ]);
  const stockEntries = STOCK_SYMBOLS.map((sym, i) => ({
    symbol: sym,
    ...stocks[i]!,
  }));
  return { usdg, stocks: stockEntries };
}

export async function getOnChainPrice(stock: StockSymbol): Promise<bigint> {
  return publicClient.readContract({
    address: deskAddress(),
    abi: AllocationDeskAbi,
    functionName: 'priceUsdgPerStock',
    args: [STOCK_ADDRESSES[stock]],
  });
}

// ─────────────────────────── Writes (backend signer) ───────────────────────────

/**
 * Push fresh prices to the desk. Only the oracle (backend) may call this.
 * `prices` is a map of stock symbol → human price string (e.g. "180.50").
 */
export async function pushPrices(
  prices: Partial<Record<StockSymbol, string>>
): Promise<`0x${string}`> {
  const entries = (Object.entries(prices) as [StockSymbol, string][]).filter(
    ([, p]) => p !== undefined && p !== ''
  );
  if (entries.length === 0) throw new Error('pushPrices: no prices provided');

  const stocks = entries.map(([s]) => STOCK_ADDRESSES[s]);
  const pricesScaled = entries.map(([, p]) => priceToScaled(p));

  const hash = await walletClient.writeContract({
    address: deskAddress(),
    abi: AllocationDeskAbi,
    functionName: 'setPrices',
    args: [stocks, pricesScaled],
  });
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

/**
 * Backend-executed allocation (used by autonomous DCA). msg.sender is the
 * backend, so USDG comes from the backend's wallet (which must be pre-funded
 * and pre-approved to the desk for at least `usdgAmount`).
 */
export async function executeAllocationBackend(args: {
  beneficiary: `0x${string}`;
  usdgAmount: bigint;
  weights: Partial<Record<StockSymbol, number>>; // bps, must sum to 10_000
}): Promise<{ hash: `0x${string}`; explorer: string }> {
  const entries = (Object.entries(args.weights) as [StockSymbol, number][])
    .filter(([, w]) => w !== undefined && w > 0);
  const stocks = entries.map(([s]) => STOCK_ADDRESSES[s]);
  const bps = entries.map(([, w]) => BigInt(w));

  const hash = await walletClient.writeContract({
    address: deskAddress(),
    abi: AllocationDeskAbi,
    functionName: 'execute',
    args: [args.beneficiary, args.usdgAmount, stocks, bps],
  });
  await publicClient.waitForTransactionReceipt({ hash });
  return { hash, explorer: explorerTx(hash) };
}

/**
 * Approve the desk to pull USDG from the backend's wallet. One-time per
 * cumulative DCA budget. Returns tx hash or null if allowance already covers.
 */
export async function approveDeskUsdgFromBackend(
  amount: bigint
): Promise<`0x${string}` | null> {
  const current = (await publicClient.readContract({
    address: TOKENS.USDG,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [backendAccount.address, deskAddress()],
  })) as bigint;
  if (current >= amount) return null;

  const hash = await walletClient.writeContract({
    address: TOKENS.USDG,
    abi: erc20Abi,
    functionName: 'approve',
    args: [deskAddress(), amount],
  });
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

// ─────────────────────────── Tx prep for frontend signing ───────────────────────────

/**
 * Build the calldata + target the frontend needs to ask the user's wallet
 * to sign for an `execute()` call. msg.sender will be the USER, so USDG
 * comes from their wallet and stocks land in `beneficiary` (typically the
 * user themselves). The user must `approve(desk, usdgAmount)` on USDG first.
 */
export function prepareUserExecuteTx(args: {
  beneficiary: `0x${string}`;
  usdgAmount: bigint;
  weights: Partial<Record<StockSymbol, number>>;
}): { to: `0x${string}`; data: `0x${string}`; value: '0x0' } {
  const entries = (Object.entries(args.weights) as [StockSymbol, number][])
    .filter(([, w]) => w !== undefined && w > 0);
  const stocks = entries.map(([s]) => STOCK_ADDRESSES[s]);
  const bps = entries.map(([, w]) => BigInt(w));

  const data = encodeFunctionData({
    abi: AllocationDeskAbi,
    functionName: 'execute',
    args: [args.beneficiary, args.usdgAmount, stocks, bps],
  });
  return { to: deskAddress(), data, value: '0x0' };
}

/** Same for the USDG `approve()` call. */
export function prepareUserApproveUsdgTx(
  amount: bigint
): { to: `0x${string}`; data: `0x${string}`; value: '0x0' } {
  const data = encodeFunctionData({
    abi: erc20Abi,
    functionName: 'approve',
    args: [deskAddress(), amount],
  });
  return { to: TOKENS.USDG, data, value: '0x0' };
}
