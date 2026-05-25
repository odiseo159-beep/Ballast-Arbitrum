/**
 * Canonical deployment manifest for the Robinhood Chain testnet.
 *
 * Source of truth: deployment.testnet.json (committed). The deploy script
 * (packages/contracts/scripts/deploy.ts) overwrites the JSON after each
 * deployment, so this file always reflects the live testnet address.
 */
import raw from './deployment.testnet.json';

export interface TestnetDeployment {
  chainId: number;
  /** AllocationDesk contract address. `null` until first deploy. */
  allocationDesk: `0x${string}` | null;
  usdg: `0x${string}`;
  stocks: Record<string, `0x${string}`>;
  /** ISO-8601 timestamp of the last successful deploy. */
  deployedAt: string | null;
  /** Block number at deploy time. */
  blockNumber: number | null;
  /** Address that broadcast the deploy tx. */
  deployer: `0x${string}` | null;
}

export const TESTNET_DEPLOYMENT = raw as TestnetDeployment;

/** Throws if the desk has not been deployed yet. */
export function requireAllocationDesk(): `0x${string}` {
  const addr = TESTNET_DEPLOYMENT.allocationDesk;
  if (!addr) {
    throw new Error(
      'AllocationDesk is not deployed yet. Run `pnpm contracts:deploy` first.'
    );
  }
  return addr;
}
