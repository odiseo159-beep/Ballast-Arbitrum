/**
 * Phase 0 — De-risk script.
 *
 * Verifies that we can:
 *   1. Reach Robinhood Chain Testnet via the Alchemy RPC.
 *   2. Read the wallet's ETH + token balances.
 *   3. Send an ERC-20 transfer that confirms on-chain.
 *
 * If this script prints "DE-RISK PASSED", the project is viable and we can
 * proceed to Phase 1 (AllocationDesk contract).
 *
 * Run:  pnpm derisk
 */

/* eslint-disable no-console */
import 'dotenv/config';
import {
  createPublicClient,
  createWalletClient,
  defineChain,
  erc20Abi,
  formatUnits,
  http,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import {
  CHAIN_ID,
  EXPLORER_URL,
  STOCK_ADDRESSES,
  STOCK_SYMBOLS,
  TOKENS,
} from '@ballast/shared';

// ─────────────────────────────────────────────────────────────
// Env
// ─────────────────────────────────────────────────────────────

const rpcUrl = process.env.ALCHEMY_RPC_URL;
const deployerKey = process.env.DEPLOYER_PRIVATE_KEY as `0x${string}` | undefined;
const customTarget = process.env.TARGET_ADDRESS as `0x${string}` | undefined;

function fail(msg: string): never {
  console.error(`\n❌ ${msg}\n`);
  process.exit(1);
}

if (!rpcUrl || rpcUrl.includes('REPLACE_ME')) {
  fail('ALCHEMY_RPC_URL missing or still placeholder. Copy .env.example → .env and fill it in.');
}
if (!deployerKey || deployerKey.includes('REPLACE_ME')) {
  fail('DEPLOYER_PRIVATE_KEY missing or still placeholder.');
}

// Deterministic throwaway recipient — well-known Hardhat test key #1.
// You can import this into MetaMask to recover the tokens if you want.
const TEST_RECIPIENT_KEY =
  '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d' as const;
const fallbackRecipient = privateKeyToAccount(TEST_RECIPIENT_KEY).address;
const recipient = customTarget ?? fallbackRecipient;

// ─────────────────────────────────────────────────────────────
// Chain + clients
// ─────────────────────────────────────────────────────────────

const robinhoodTestnet = defineChain({
  id: CHAIN_ID,
  name: 'Robinhood Chain Testnet',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: [rpcUrl] } },
  blockExplorers: { default: { name: 'Explorer', url: EXPLORER_URL } },
  testnet: true,
});

const account = privateKeyToAccount(deployerKey);
const publicClient = createPublicClient({ chain: robinhoodTestnet, transport: http() });
const walletClient = createWalletClient({ account, chain: robinhoodTestnet, transport: http() });

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

async function readTokenBalance(token: `0x${string}`, label: string) {
  const [decimals, balance] = await Promise.all([
    publicClient.readContract({ address: token, abi: erc20Abi, functionName: 'decimals' }),
    publicClient.readContract({
      address: token,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [account.address],
    }),
  ]);
  return {
    label,
    token,
    decimals,
    raw: balance,
    formatted: formatUnits(balance, decimals),
  };
}

function redactedRpc(url: string): string {
  return url.replace(/\/v2\/.+$/, '/v2/<REDACTED>');
}

// ─────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🚢  Ballast — Phase 0 de-risk');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Chain        : Robinhood Chain Testnet (id ${CHAIN_ID})`);
  console.log(`RPC          : ${redactedRpc(rpcUrl!)}`);
  console.log(`Wallet       : ${account.address}`);
  console.log(`Recipient    : ${recipient}${customTarget ? ' (TARGET_ADDRESS)' : ' (default test recipient)'}`);
  console.log('');

  // 1) Chain liveness
  const block = await publicClient.getBlockNumber();
  console.log(`✓ Chain reachable. Current block: ${block}`);

  // 2) ETH balance for gas
  const ethBalance = await publicClient.getBalance({ address: account.address });
  console.log(`✓ ETH balance: ${formatUnits(ethBalance, 18)}`);
  if (ethBalance === 0n) {
    fail('No ETH for gas. Get some from https://faucet.testnet.chain.robinhood.com/');
  }

  // 3) All token balances
  console.log('');
  console.log('Token balances:');
  const tokenChecks: ReadonlyArray<readonly [string, `0x${string}`]> = [
    ['USDG', TOKENS.USDG] as const,
    ...STOCK_SYMBOLS.map((s) => [s, STOCK_ADDRESSES[s]] as const),
  ];
  const balances = await Promise.all(
    tokenChecks.map(([label, addr]) => readTokenBalance(addr, label))
  );
  for (const b of balances) {
    console.log(`  ${b.label.padEnd(6)} ${b.formatted.padStart(22)}  (${b.token})`);
  }

  // 4) Pick the first stock with non-zero balance and transfer 1 base unit.
  const fundedStock = balances.find((b) => b.label !== 'USDG' && b.raw > 0n);
  if (!fundedStock) {
    fail(
      'No stock tokens in wallet. Visit the faucet and pull TSLA / AMZN / PLTR / NFLX / AMD, then re-run.'
    );
  }

  const transferAmount = 1n; // smallest possible unit — visible on-chain, invisible in UI
  console.log('');
  console.log(`Transferring ${transferAmount} base unit of ${fundedStock!.label} → ${recipient}`);
  const hash = await walletClient.writeContract({
    address: fundedStock!.token,
    abi: erc20Abi,
    functionName: 'transfer',
    args: [recipient, transferAmount],
  });
  console.log(`  tx hash   : ${hash}`);
  console.log(`  explorer  : ${EXPLORER_URL}/tx/${hash}`);

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log('');
  if (receipt.status === 'success') {
    console.log(`✅  DE-RISK PASSED — confirmed in block ${receipt.blockNumber}`);
    console.log('    The project is viable. Proceed to Phase 1 (AllocationDesk).');
  } else {
    fail('Transfer reverted. Inspect the explorer link above.');
  }
}

main().catch((err) => {
  console.error('\n💥 de-risk failed:');
  console.error(err);
  process.exit(1);
});
