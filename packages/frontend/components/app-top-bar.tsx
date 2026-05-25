'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi';
import { CHAIN_ID, EXPLORER_URL } from '@ballast/shared';
import { AnchorMark } from './anchor-mark';

const NAV: Array<{ label: string; href: string; disabled?: boolean }> = [
  { label: 'Chat', href: '/chat' },
  { label: 'Portfolio', href: '/portfolio' },
  { label: 'Activity', href: '/portfolio#activity' },
  { label: 'Settings', href: '#', disabled: true },
];

function truncate(addr?: string) {
  if (!addr) return '';
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function WalletBadge() {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();

  if (!isConnected) {
    const injected = connectors[0];
    return (
      <button
        onClick={() => injected && connect({ connector: injected })}
        disabled={isPending || !injected}
        style={{
          background: 'var(--gold)',
          color: 'var(--deep-ocean)',
          border: 'none',
          borderRadius: 999,
          padding: '9px 18px',
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
          fontFamily: 'inherit',
          opacity: isPending ? 0.5 : 1,
        }}
      >
        {isPending ? 'Connecting…' : 'Connect Wallet'}
      </button>
    );
  }

  if (chainId !== CHAIN_ID) {
    return (
      <button
        onClick={() => switchChain({ chainId: CHAIN_ID })}
        style={{
          background: 'rgba(227,119,119,0.15)',
          color: '#E37777',
          border: '1px solid rgba(227,119,119,0.4)',
          borderRadius: 999,
          padding: '8px 14px',
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        Switch to Robinhood Chain
      </button>
    );
  }

  return <ConnectedDropdown address={address!} disconnect={() => disconnect()} />;
}

function ConnectedDropdown({
  address,
  disconnect,
}: {
  address: `0x${string}`;
  disconnect: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* ignore */
    }
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '8px 14px 8px 8px',
          background: open ? 'rgba(214,179,106,0.08)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${open ? 'var(--line-strong)' : 'var(--line)'}`,
          borderRadius: 999,
          color: 'var(--mist)',
          fontSize: 13,
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        <span
          style={{
            width: 26,
            height: 26,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--gold), var(--teal))',
          }}
        />
        <span className="mono" style={{ fontSize: 12 }}>
          {truncate(address)}
        </span>
        <span
          style={{
            fontSize: 9,
            color: 'var(--slate)',
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform .2s',
          }}
        >
          ▼
        </span>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            minWidth: 260,
            background: 'rgba(8,24,38,0.95)',
            backdropFilter: 'blur(16px)',
            border: '1px solid var(--line-strong)',
            borderRadius: 14,
            boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
            padding: 6,
            zIndex: 40,
            animation: 'fadeUp .2s ease-out',
          }}
        >
          <div
            style={{
              padding: '12px 14px',
              borderBottom: '1px solid var(--line)',
            }}
          >
            <div
              className="mono"
              style={{
                fontSize: 10,
                color: 'var(--gold)',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                marginBottom: 4,
              }}
            >
              Connected wallet
            </div>
            <div
              className="mono"
              style={{
                fontSize: 12,
                color: 'var(--mist)',
                wordBreak: 'break-all',
                lineHeight: 1.4,
              }}
            >
              {address}
            </div>
          </div>

          <MenuItem onClick={copy}>
            <span style={{ flex: 1 }}>{copied ? 'Copied ✓' : 'Copy address'}</span>
            <span style={{ fontSize: 11, color: 'var(--slate)' }}>⌘C</span>
          </MenuItem>

          <a
            href={`${EXPLORER_URL}/address/${address}`}
            target="_blank"
            rel="noopener noreferrer"
            style={menuItemStyle}
          >
            <span style={{ flex: 1 }}>View on explorer</span>
            <span style={{ fontSize: 11, color: 'var(--slate)' }}>↗</span>
          </a>

          <div style={{ height: 1, background: 'var(--line)', margin: '6px 0' }} />

          <MenuItem
            danger
            onClick={() => {
              disconnect();
              setOpen(false);
            }}
          >
            <span style={{ flex: 1 }}>Disconnect</span>
            <span style={{ fontSize: 11, color: 'rgba(227,119,119,0.7)' }}>↪</span>
          </MenuItem>
        </div>
      )}
    </div>
  );
}

const menuItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '11px 14px',
  borderRadius: 9,
  color: 'var(--mist)',
  fontSize: 13,
  cursor: 'pointer',
  textDecoration: 'none',
  fontFamily: 'inherit',
  background: 'transparent',
  border: 'none',
  width: '100%',
  textAlign: 'left',
  transition: 'background .15s',
};

function MenuItem({
  children,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        ...menuItemStyle,
        color: danger ? '#E37777' : 'var(--mist)',
        background: hover
          ? danger
            ? 'rgba(227,119,119,0.08)'
            : 'rgba(214,179,106,0.08)'
          : 'transparent',
      }}
    >
      {children}
    </button>
  );
}

export function AppTopBar() {
  const path = usePathname();
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 30,
        padding: '16px 32px',
        borderBottom: '1px solid var(--line)',
        background: 'rgba(8,24,38,0.85)',
        backdropFilter: 'blur(16px) saturate(120%)',
        display: 'flex',
        alignItems: 'center',
        gap: 28,
      }}
    >
      <Link
        href="/"
        title="Back to home"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          color: 'var(--mist)',
          textDecoration: 'none',
        }}
      >
        <AnchorMark size={22} />
        <span className="display" style={{ fontWeight: 700, fontSize: 19, letterSpacing: '-0.02em' }}>
          Ballast
        </span>
      </Link>

      <nav style={{ display: 'flex', gap: 6, marginLeft: 16 }}>
        {NAV.map((item) => {
          if (item.disabled) {
            return (
              <span
                key={item.label}
                title="Coming soon"
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  fontSize: 13.5,
                  fontWeight: 500,
                  color: 'rgba(246,245,242,0.3)',
                  cursor: 'not-allowed',
                  userSelect: 'none',
                }}
              >
                {item.label}
              </span>
            );
          }
          const active =
            item.href === '/chat'
              ? path?.startsWith('/chat')
              : item.href.startsWith('/portfolio')
                ? path?.startsWith('/portfolio')
                : false;
          return (
            <Link
              key={item.label}
              href={item.href}
              style={{
                background: active ? 'rgba(214,179,106,0.10)' : 'transparent',
                color: active ? 'var(--gold)' : 'rgba(246,245,242,0.7)',
                padding: '8px 16px',
                borderRadius: 8,
                fontSize: 13.5,
                fontWeight: active ? 600 : 500,
                textDecoration: 'none',
              }}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div style={{ flex: 1 }} />

      <WalletBadge />
    </header>
  );
}
