import {
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { CHAIN_ID, EXPLORER_URL } from '@ballast/shared';
import { ENV } from '../env.js';

export const robinhoodTestnet = defineChain({
  id: CHAIN_ID,
  name: 'Robinhood Chain Testnet',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: [ENV.ALCHEMY_RPC_URL] } },
  blockExplorers: { default: { name: 'Explorer', url: EXPLORER_URL } },
  testnet: true,
});

export const backendAccount = privateKeyToAccount(ENV.DEPLOYER_PRIVATE_KEY);

export const publicClient = createPublicClient({
  chain: robinhoodTestnet,
  transport: http(),
});

export const walletClient = createWalletClient({
  chain: robinhoodTestnet,
  account: backendAccount,
  transport: http(),
});

export function explorerTx(hash: `0x${string}`): string {
  return `${EXPLORER_URL}/tx/${hash}`;
}

export function explorerAddress(addr: `0x${string}`): string {
  return `${EXPLORER_URL}/address/${addr}`;
}
