import { http, createConfig } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { robinhoodTestnet } from './chain';

export const wagmiConfig = createConfig({
  chains: [robinhoodTestnet],
  connectors: [injected({ shimDisconnect: true })],
  transports: {
    [robinhoodTestnet.id]: http(),
  },
  ssr: true,
});

declare module 'wagmi' {
  interface Register {
    config: typeof wagmiConfig;
  }
}
