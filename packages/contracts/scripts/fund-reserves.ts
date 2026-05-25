/**
 * Seed the deployed AllocationDesk with USDG + stock-token liquidity from
 * the deployer's wallet (which must hold faucet tokens).
 *
 * Standalone tsx script — see deploy.ts for the rationale.
 *
 * Run: pnpm contracts:fund-reserves
 */
import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';
dotenvConfig({ path: resolve(__dirname, '../../../.env') });

import {
  createPublicClient,
  createWalletClient,
  defineChain,
  erc20Abi,
  formatUnits,
  http,
  parseUnits,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { AllocationDeskAbi } from '../../shared/src/abis/AllocationDesk.js';
import deployment from '../../shared/src/deployment.testnet.json';

// Calibrated to fit the Paxos USDG faucet (100 USDG/day) + the Robinhood
// Chain stock faucet (5 of each stock). Leaves ~70 USDG + 3 of each stock
// in the deployer wallet for interactive allocations + DCA ticks.
const RESERVE_TARGETS_HUMAN: Record<string, string> = {
  USDG: '30',
  TSLA: '2',
  AMZN: '2',
  PLTR: '2',
  NFLX: '2',
  AMD: '2',
};

const EXPLORER_URL = 'https://explorer.testnet.chain.robinhood.com';
const CHAIN_ID = 46630;
const RPC_URL = process.env.ALCHEMY_RPC_URL;
const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY as `0x${string}` | undefined;

if (!RPC_URL || RPC_URL.includes('REPLACE_ME')) {
  throw new Error('ALCHEMY_RPC_URL missing or placeholder in .env');
}
if (!PRIVATE_KEY || PRIVATE_KEY.includes('REPLACE_ME')) {
  throw new Error('DEPLOYER_PRIVATE_KEY missing or placeholder in .env');
}

const robinhoodTestnet = defineChain({
  id: CHAIN_ID,
  name: 'Robinhood Chain Testnet',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
  blockExplorers: { default: { name: 'Explorer', url: EXPLORER_URL } },
  testnet: true,
});

const account = privateKeyToAccount(PRIVATE_KEY);
const publicClient = createPublicClient({ chain: robinhoodTestnet, transport: http() });
const walletClient = createWalletClient({ chain: robinhoodTestnet, account, transport: http() });

async function main() {
  if (!deployment.allocationDesk) {
    throw new Error('AllocationDesk not deployed yet. Run `pnpm contracts:deploy` first.');
  }
  const desk = deployment.allocationDesk as `0x${string}`;

  console.log(`Funding desk ${desk}`);
  console.log(`From       ${account.address}`);
  console.log('');

  const targets: { sym: string; addr: `0x${string}` }[] = [
    { sym: 'USDG', addr: deployment.usdg as `0x${string}` },
    ...Object.entries(deployment.stocks).map(([sym, addr]) => ({
      sym,
      addr: addr as `0x${string}`,
    })),
  ];

  for (const { sym, addr } of targets) {
    const targetHuman = RESERVE_TARGETS_HUMAN[sym];
    if (!targetHuman) {
      console.log(`  ${sym.padEnd(5)} skipped (no target)`);
      continue;
    }

    const decimals = (await publicClient.readContract({
      address: addr,
      abi: erc20Abi,
      functionName: 'decimals',
    })) as number;
    const targetRaw = parseUnits(targetHuman, decimals);

    const balance = (await publicClient.readContract({
      address: addr,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [account.address],
    })) as bigint;

    if (balance < targetRaw) {
      console.log(
        `  ${sym.padEnd(5)} skipped — wallet has ${formatUnits(
          balance,
          decimals
        )} (need ${targetHuman}). Top up from faucet.`
      );
      continue;
    }

    console.log(`  ${sym.padEnd(5)} approving + depositing ${targetHuman}...`);

    const approveHash = await walletClient.writeContract({
      address: addr,
      abi: erc20Abi,
      functionName: 'approve',
      args: [desk, targetRaw],
    });
    await publicClient.waitForTransactionReceipt({ hash: approveHash });

    const depositHash = await walletClient.writeContract({
      address: desk,
      abi: AllocationDeskAbi,
      functionName: 'depositReserve',
      args: [addr, targetRaw],
    });
    await publicClient.waitForTransactionReceipt({ hash: depositHash });

    console.log(`  ${sym.padEnd(5)} ✓ deposited (tx ${depositHash})`);
  }

  console.log('');
  console.log('Done. The desk reserve is funded and ready to settle allocations.');
}

main().catch((err) => {
  console.error('\n💥 fund-reserves failed:');
  console.error(err);
  process.exit(1);
});
