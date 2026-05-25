'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { WagmiProvider } from 'wagmi';
import { wagmiConfig } from '@/lib/wagmi-config';
import { BallastProvider } from './ballast-context';

export function Providers({ children }: { children: ReactNode }) {
  // useState so the QueryClient is stable across renders but per-tab
  const [queryClient] = useState(() => new QueryClient());
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <BallastProvider>{children}</BallastProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
