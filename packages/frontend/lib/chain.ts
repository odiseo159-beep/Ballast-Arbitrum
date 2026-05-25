import { defineChain } from 'viem';
import { CHAIN_ID, EXPLORER_URL } from '@ballast/shared';

// Public RPC URL for the frontend (browser-bundled). Defaults to an
// Alchemy URL passed via NEXT_PUBLIC_RPC_URL. The user can override
// by adding the network manually in their wallet.
const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL ?? 'https://robinhood-testnet.g.alchemy.com/v2/demo';

export const robinhoodTestnet = defineChain({
  id: CHAIN_ID,
  name: 'Robinhood Chain Testnet',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
  blockExplorers: { default: { name: 'Explorer', url: EXPLORER_URL } },
  testnet: true,
});

export const FAUCET_URL = 'https://faucet.testnet.chain.robinhood.com/';
