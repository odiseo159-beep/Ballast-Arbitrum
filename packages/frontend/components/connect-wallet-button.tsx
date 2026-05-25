'use client';

import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi';
import { CHAIN_ID } from '@ballast/shared';
import clsx from 'clsx';

function truncate(addr?: string) {
  if (!addr) return '';
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function ConnectWalletButton({ className }: { className?: string }) {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();

  const onWrongNetwork = isConnected && chainId !== CHAIN_ID;

  if (!isConnected) {
    const injected = connectors[0]; // injected() — MetaMask / Rabby / Brave
    return (
      <button
        onClick={() => injected && connect({ connector: injected })}
        disabled={isPending || !injected}
        className={clsx(
          'rounded-full bg-gold px-5 py-2 text-sm font-semibold text-deep-ocean',
          'hover:bg-gold-soft transition-colors disabled:opacity-50',
          className
        )}
      >
        {isPending ? 'Conectando…' : 'Connect Wallet'}
      </button>
    );
  }

  if (onWrongNetwork) {
    return (
      <button
        onClick={() => switchChain({ chainId: CHAIN_ID })}
        className={clsx(
          'rounded-full bg-amber-500/90 px-5 py-2 text-sm font-semibold text-deep-ocean',
          'hover:bg-amber-400 transition-colors',
          className
        )}
      >
        Switch to Robinhood Chain
      </button>
    );
  }

  return (
    <button
      onClick={() => disconnect()}
      className={clsx(
        'flex items-center gap-3 rounded-full border border-line bg-surface-2 px-3 py-2',
        'text-sm hover:border-line-strong transition-colors',
        className
      )}
    >
      <span className="h-6 w-6 rounded-full bg-gradient-to-br from-gold to-teal" />
      <span className="mono text-xs">{truncate(address)}</span>
    </button>
  );
}
