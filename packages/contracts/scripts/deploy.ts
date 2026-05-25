/**
 * Deploy AllocationDesk to Robinhood Chain Testnet.
 *
 * Standalone tsx script — bypasses hardhat-viem's chain registry, which
 * doesn't know about chain 46630. Uses the compiled artifact directly.
 *
 * Run: pnpm contracts:deploy
 */
import { config as dotenvConfig } from 'dotenv';
import { resolve, join } from 'path';
import { writeFileSync } from 'fs';

dotenvConfig({ path: resolve(__dirname, '../../../.env') });

import {
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import deployment from '../../shared/src/deployment.testnet.json';
import artifact from '../artifacts/contracts/AllocationDesk.sol/AllocationDesk.json';

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
  const stocksList = Object.values(deployment.stocks) as `0x${string}`[];

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Deploying AllocationDesk');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Deployer   : ${account.address}`);
  console.log(`USDG       : ${deployment.usdg}`);
  console.log('Stocks     :');
  for (const [sym, addr] of Object.entries(deployment.stocks)) {
    console.log(`  ${sym.padEnd(5)} ${addr}`);
  }
  console.log('');

  const hash = await walletClient.deployContract({
    abi: artifact.abi,
    bytecode: artifact.bytecode as `0x${string}`,
    args: [
      account.address,                 // owner
      account.address,                 // oracle (single signer for the hackathon)
      deployment.usdg as `0x${string}`,
      stocksList,
    ],
  });
  console.log(`Deploy tx  : ${hash}`);
  console.log('Waiting for confirmation...');

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  const deskAddress = receipt.contractAddress;
  if (!deskAddress) throw new Error('Deploy receipt has no contractAddress');

  const updated = {
    ...deployment,
    allocationDesk: deskAddress,
    deployedAt: new Date().toISOString(),
    blockNumber: Number(receipt.blockNumber),
    deployer: account.address,
  };
  const outPath = join(__dirname, '..', '..', 'shared', 'src', 'deployment.testnet.json');
  writeFileSync(outPath, JSON.stringify(updated, null, 2) + '\n');

  console.log('');
  console.log('✅ AllocationDesk deployed');
  console.log(`   Address : ${deskAddress}`);
  console.log(`   Block   : ${receipt.blockNumber}`);
  console.log(`   Saved to: packages/shared/src/deployment.testnet.json`);
  console.log('');
  console.log(`Explorer: ${EXPLORER_URL}/address/${deskAddress}`);
  console.log('');
  console.log('Next: `pnpm contracts:fund-reserves` to seed the desk reserve.');
}

main().catch((err) => {
  console.error('\n💥 Deploy failed:');
  console.error(err);
  process.exit(1);
});
