'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import Link from 'next/link';
import {
  useAccount,
  useSendTransaction,
  useWaitForTransactionReceipt,
} from 'wagmi';
import { EXPLORER_URL } from '@ballast/shared';
import { AnchorMark } from '@/components/anchor-mark';
import { useBallastUser } from '@/components/ballast-context';
import { api, type ChatMessage, type PendingTx } from '@/lib/api';

// ─────────────────────────── Types ───────────────────────────

interface ExecutionState {
  pendingTxs: PendingTx[];
  approveHash?: `0x${string}`;
  executeHash?: `0x${string}`;
  /** 0=prices pushed (auto), 1=approve, 2=execute, 3=done */
  phase: 0 | 1 | 2 | 3;
}

interface AutopilotState {
  planId: string;
  cadence: string;
  cadenceSeconds: number;
}

interface DisplayedMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
  execution?: ExecutionState;
  autopilot?: AutopilotState;
}

const uid = () => Math.random().toString(36).slice(2);

// ─────────────────────────── Currency helper ───────────────────────────

function makeFmt(currency: string) {
  return (n: number) => {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        maximumFractionDigits: 0,
      }).format(n);
    } catch {
      return `${n.toFixed(0)} ${currency}`;
    }
  };
}

// ─────────────────────────── Avatars ───────────────────────────

function AgentAvatar({ size = 36 }: { size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 10,
        background: 'linear-gradient(135deg, var(--midnight), var(--deep-ocean))',
        border: '1px solid var(--line-strong)',
        display: 'grid',
        placeItems: 'center',
        flexShrink: 0,
      }}
    >
      <AnchorMark size={Math.round(size * 0.55)} />
    </div>
  );
}

function UserAvatar({ size = 36, initial = 'L' }: { size?: number; initial?: string }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 10,
        background: 'linear-gradient(135deg, var(--gold), var(--teal))',
        display: 'grid',
        placeItems: 'center',
        flexShrink: 0,
        color: 'var(--deep-ocean)',
        fontWeight: 700,
        fontSize: size * 0.4,
        fontFamily: 'var(--font-manrope), system-ui, sans-serif',
      }}
    >
      {initial}
    </div>
  );
}

// ─────────────────────────── Typewriter ───────────────────────────

function useTypewriter(text: string, speed = 14, startDelay = 80, trigger = true) {
  const [out, setOut] = useState('');
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!trigger) return;
    setOut('');
    setDone(false);
    let i = 0;
    const startId = setTimeout(() => {
      const iv = setInterval(() => {
        i++;
        setOut(text.slice(0, i));
        if (i >= text.length) {
          clearInterval(iv);
          setDone(true);
        }
      }, speed);
    }, startDelay);
    return () => clearTimeout(startId);
  }, [text, trigger, speed, startDelay]);
  return [out, done] as const;
}

function StreamingText({ text, speed = 14 }: { text: string; speed?: number }) {
  const [out, done] = useTypewriter(text, speed, 80, true);
  return (
    <span style={{ whiteSpace: 'pre-wrap' }}>
      {out}
      {!done && <span className="blink-cursor" />}
    </span>
  );
}

// ─────────────────────────── Messages ───────────────────────────

function AgentMessage({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 14,
        alignItems: 'flex-start',
        animation: 'fadeUp .4s ease-out',
        marginBottom: 28,
      }}
    >
      <AgentAvatar />
      <div style={{ flex: 1, minWidth: 0, paddingTop: 6 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
          <span style={{ fontWeight: 600, fontSize: 13.5 }}>Ballast</span>
          <span className="mono" style={{ fontSize: 10.5, color: 'var(--slate)' }}>
            AI · just now
          </span>
        </div>
        <div style={{ fontSize: 15, lineHeight: 1.65, color: 'rgba(246,245,242,0.9)' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function UserMessage({ text, initial }: { text: string; initial: string }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 14,
        alignItems: 'flex-start',
        flexDirection: 'row-reverse',
        animation: 'fadeUp .35s ease-out',
        marginBottom: 28,
      }}
    >
      <UserAvatar initial={initial} />
      <div style={{ flex: 1, minWidth: 0, paddingTop: 6, textAlign: 'right' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 8,
            marginBottom: 4,
            justifyContent: 'flex-end',
          }}
        >
          <span className="mono" style={{ fontSize: 10.5, color: 'var(--slate)' }}>
            You · just now
          </span>
          <span style={{ fontWeight: 600, fontSize: 13.5 }}>You</span>
        </div>
        <div
          style={{
            display: 'inline-block',
            textAlign: 'left',
            background: 'rgba(214,179,106,0.10)',
            border: '1px solid var(--line-strong)',
            padding: '12px 16px',
            borderRadius: '14px 14px 4px 14px',
            fontSize: 15,
            lineHeight: 1.55,
            color: 'var(--mist)',
            maxWidth: '78%',
            whiteSpace: 'pre-wrap',
          }}
        >
          {text}
        </div>
      </div>
    </div>
  );
}

function Thinking() {
  return (
    <div
      style={{
        display: 'flex',
        gap: 14,
        alignItems: 'flex-start',
        marginBottom: 28,
        animation: 'fadeUp .3s ease-out',
      }}
    >
      <AgentAvatar />
      <div style={{ paddingTop: 14, display: 'flex', gap: 4 }}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'var(--gold)',
              animation: `pulse-gold 1.1s ease-in-out infinite ${i * 0.18}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────── Execution card (real wagmi) ───────────────────────────

function ExecutionCard({
  execution,
  onPhaseUpdate,
}: {
  execution: ExecutionState;
  onPhaseUpdate: (next: Partial<ExecutionState>) => void;
}) {
  const approveTx = execution.pendingTxs[0];
  const executeTx = execution.pendingTxs[1];

  const { sendTransactionAsync: sendApprove, isPending: approveSigning } = useSendTransaction();
  const { sendTransactionAsync: sendExecute, isPending: executeSigning } = useSendTransaction();

  const approveReceipt = useWaitForTransactionReceipt({
    hash: execution.approveHash,
    query: { enabled: !!execution.approveHash },
  });
  const executeReceipt = useWaitForTransactionReceipt({
    hash: execution.executeHash,
    query: { enabled: !!execution.executeHash },
  });

  // Phase transitions
  useEffect(() => {
    if (execution.phase === 1 && approveReceipt.isSuccess) {
      onPhaseUpdate({ phase: 2 });
    }
    if (execution.phase === 2 && executeReceipt.isSuccess) {
      onPhaseUpdate({ phase: 3 });
    }
  }, [
    execution.phase,
    approveReceipt.isSuccess,
    executeReceipt.isSuccess,
    onPhaseUpdate,
  ]);

  async function signApprove() {
    if (!approveTx) return;
    try {
      const hash = await sendApprove({ to: approveTx.to, data: approveTx.data, value: 0n });
      onPhaseUpdate({ approveHash: hash });
    } catch (e) {
      console.warn('approve rejected', e);
    }
  }
  async function signExecute() {
    if (!executeTx) return;
    try {
      const hash = await sendExecute({ to: executeTx.to, data: executeTx.data, value: 0n });
      onPhaseUpdate({ executeHash: hash });
    } catch (e) {
      console.warn('execute rejected', e);
    }
  }

  const steps: Array<{ label: string; status: 'done' | 'active' | 'pending'; action?: ReactNode }> = [
    {
      label: 'Live oracle prices pushed on-chain',
      status: 'done',
    },
    {
      label: approveReceipt.isLoading
        ? 'Approving USDG (waiting confirmation…)'
        : execution.approveHash
          ? 'USDG approved'
          : 'Sign USDG approve in your wallet',
      status:
        execution.phase > 1 ? 'done' : execution.phase === 1 ? 'active' : 'pending',
      action:
        execution.phase === 1 && !execution.approveHash ? (
          <button
            onClick={signApprove}
            disabled={approveSigning}
            style={signBtn}
          >
            {approveSigning ? 'Signing…' : 'Sign approve'}
          </button>
        ) : execution.approveHash ? (
          <a
            href={`${EXPLORER_URL}/tx/${execution.approveHash}`}
            target="_blank"
            rel="noopener noreferrer"
            style={txLink}
          >
            {execution.approveHash.slice(0, 8)}… ↗
          </a>
        ) : null,
    },
    {
      label: executeReceipt.isLoading
        ? 'Executing allocation (waiting confirmation…)'
        : execution.executeHash
          ? 'Allocation executed — stocks delivered'
          : 'Sign AllocationDesk.execute() in your wallet',
      status:
        execution.phase > 2 ? 'done' : execution.phase === 2 ? 'active' : 'pending',
      action:
        execution.phase === 2 && !execution.executeHash ? (
          <button
            onClick={signExecute}
            disabled={executeSigning}
            style={signBtn}
          >
            {executeSigning ? 'Signing…' : 'Sign execute'}
          </button>
        ) : execution.executeHash ? (
          <a
            href={`${EXPLORER_URL}/tx/${execution.executeHash}`}
            target="_blank"
            rel="noopener noreferrer"
            style={txLink}
          >
            {execution.executeHash.slice(0, 8)}… ↗
          </a>
        ) : null,
    },
  ];

  return (
    <div
      style={{
        marginTop: 14,
        marginBottom: 6,
        padding: 20,
        background: 'rgba(8,24,38,0.6)',
        border: '1px solid var(--line)',
        borderRadius: 14,
        animation: 'fadeUp .5s ease-out',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <div
          className="mono"
          style={{
            fontSize: 10.5,
            letterSpacing: '0.22em',
            color: 'var(--gold)',
            textTransform: 'uppercase',
          }}
        >
          on-chain execution
        </div>
        <div className="mono" style={{ fontSize: 10.5, color: 'var(--slate)' }}>
          chain · 46630
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {steps.map((s, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 12px',
              background: 'rgba(255,255,255,0.02)',
              borderRadius: 8,
              opacity: s.status === 'pending' ? 0.35 : 1,
              transition: 'opacity .4s',
            }}
          >
            <div style={{ width: 16, height: 16, display: 'grid', placeItems: 'center' }}>
              {s.status === 'done' ? (
                <span style={{ color: 'var(--teal)', fontSize: 14 }}>✓</span>
              ) : s.status === 'active' ? (
                <div
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    border: '2px solid rgba(214,179,106,0.3)',
                    borderTopColor: 'var(--gold)',
                    animation: 'spin 0.8s linear infinite',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.1)',
                  }}
                />
              )}
            </div>
            <span style={{ fontSize: 13, color: s.status === 'pending' ? 'var(--slate)' : 'var(--mist)', flex: 1 }}>
              {s.label}
            </span>
            {s.action}
          </div>
        ))}
      </div>
      {execution.phase === 3 && (
        <div
          style={{
            marginTop: 14,
            padding: '12px 14px',
            background: 'rgba(95,167,160,0.06)',
            border: '1px solid rgba(95,167,160,0.2)',
            borderRadius: 10,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 12,
          }}
        >
          <span style={{ color: 'var(--teal)' }}>● Settled — visit your portfolio to see the new holdings.</span>
          <Link href="/portfolio" style={{ color: 'var(--gold)', textDecoration: 'none', fontSize: 12 }}>
            Open portfolio →
          </Link>
        </div>
      )}
    </div>
  );
}

const signBtn: CSSProperties = {
  background: 'var(--gold)',
  color: 'var(--deep-ocean)',
  border: 'none',
  borderRadius: 8,
  padding: '6px 14px',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
};
const txLink: CSSProperties = {
  color: 'var(--gold)',
  fontSize: 11,
  fontFamily: 'var(--font-mono), ui-monospace, monospace',
  textDecoration: 'none',
};

// ─────────────────────────── Autopilot card ───────────────────────────

function AutopilotCard({ plan, fmt }: { plan: AutopilotState; fmt: (n: number) => string }) {
  return (
    <div
      style={{
        marginTop: 14,
        marginBottom: 6,
        padding: 20,
        background: 'linear-gradient(135deg, rgba(214,179,106,0.06), rgba(95,167,160,0.04))',
        border: '1px solid var(--line-strong)',
        borderRadius: 14,
        animation: 'fadeUp .5s ease-out',
      }}
    >
      <div
        className="mono"
        style={{
          fontSize: 10.5,
          letterSpacing: '0.22em',
          color: 'var(--gold)',
          textTransform: 'uppercase',
          marginBottom: 10,
        }}
      >
        autopilot · active
      </div>
      <div style={{ fontSize: 17, lineHeight: 1.5, color: 'var(--mist)' }}>
        Recurring allocation running every{' '}
        <span style={{ color: 'var(--gold)', fontWeight: 600 }}>{plan.cadence}</span>. I&apos;ll
        handle every execution. Watch each one land in your activity feed.
      </div>
      <div
        style={{
          marginTop: 14,
          padding: '12px',
          background: 'rgba(95,167,160,0.08)',
          border: '1px solid rgba(95,167,160,0.2)',
          borderRadius: 10,
          color: 'var(--teal)',
          fontSize: 13,
          fontWeight: 500,
          textAlign: 'center',
        }}
      >
        ✓ Plan {plan.planId.slice(0, 8)}… active · first tick in {plan.cadenceSeconds}s
      </div>
    </div>
  );
}

// ─────────────────────────── ChipRow ───────────────────────────

function ChipRow({
  chips,
  onPick,
}: {
  chips: Array<{ label: string; id: string }>;
  onPick: (c: { label: string; id: string }) => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 8,
        flexWrap: 'wrap',
        marginBottom: 28,
        paddingLeft: 50,
        animation: 'fadeUp .35s ease-out',
      }}
    >
      {chips.map((c) => (
        <button
          key={c.id}
          onClick={() => onPick(c)}
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--line)',
            color: 'var(--mist)',
            borderRadius: 999,
            padding: '8px 16px',
            fontSize: 13,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────── SideRail ───────────────────────────

function SideRail({ fmt }: { fmt: (n: number) => string }) {
  const { address } = useAccount();

  const [portfolio, setPortfolio] = useState<{ total: number; cash: number; autopilot: string } | null>(
    null
  );

  useEffect(() => {
    if (!address) return;
    let cancelled = false;
    const fetchIt = async () => {
      try {
        const [p, dca] = await Promise.all([
          api.portfolio(address, useBallastUserCurrency()),
          api.listDca(address),
        ]);
        if (cancelled) return;
        const active = dca.plans.filter((x) => x.status === 'active');
        setPortfolio({
          total: p.total_value_usd,
          cash: Number(p.usdg_balance),
          autopilot: active.length > 0 ? 'Active' : 'Off',
        });
      } catch {
        /* silent */
      }
    };
    fetchIt();
    const iv = setInterval(fetchIt, 15_000);
    return () => {
      cancelled = true;
      clearInterval(iv);
    };
  }, [address]);

  const hist = [
    { title: 'Protect my savings', when: 'Now', active: true },
    { title: 'What is a tokenized stock?', when: 'Mon' },
    { title: 'Set up weekly DCA', when: '13 May' },
  ];

  return (
    <aside
      style={{
        padding: '32px 24px',
        borderRight: '1px solid var(--line)',
        display: 'flex',
        flexDirection: 'column',
        gap: 28,
        background: 'rgba(8,24,38,0.4)',
      }}
    >
      <div>
        <div
          className="mono"
          style={{
            fontSize: 10.5,
            letterSpacing: '0.22em',
            color: 'var(--gold)',
            textTransform: 'uppercase',
            marginBottom: 10,
          }}
        >
          conversation
        </div>
        <button
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            padding: '10px 12px',
            background: 'var(--gold)',
            color: 'var(--deep-ocean)',
            border: 'none',
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          + New conversation
        </button>
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {hist.map((c, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 12px',
                borderRadius: 8,
                background: c.active ? 'rgba(214,179,106,0.06)' : 'transparent',
                border: c.active ? '1px solid var(--line)' : '1px solid transparent',
                color: c.active ? 'var(--mist)' : 'rgba(246,245,242,0.7)',
                fontSize: 13,
              }}
            >
              <span
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: 180,
                }}
              >
                {c.title}
              </span>
              <span
                style={{
                  fontSize: 11,
                  color: 'var(--slate)',
                  fontFamily: 'var(--font-mono), ui-monospace, monospace',
                }}
              >
                {c.when}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--line)', paddingTop: 24 }}>
        <div
          className="mono"
          style={{
            fontSize: 10.5,
            letterSpacing: '0.22em',
            color: 'var(--gold)',
            textTransform: 'uppercase',
            marginBottom: 10,
          }}
        >
          your context
        </div>
        <div
          style={{
            padding: 14,
            background: 'rgba(255,255,255,0.025)',
            border: '1px solid var(--card-border)',
            borderRadius: 10,
          }}
        >
          <div style={{ fontSize: 11, color: 'var(--slate)' }}>Total portfolio</div>
          <div
            className="display"
            style={{ fontSize: 22, fontWeight: 500, color: 'var(--mist)', marginTop: 2, lineHeight: 1 }}
          >
            {portfolio ? fmt(portfolio.total) : '—'}
          </div>
          <div
            style={{
              marginTop: 14,
              paddingTop: 14,
              borderTop: '1px solid var(--line)',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            <Row label="Cash to invest" value={portfolio ? fmt(portfolio.cash) : '—'} />
            <Row
              label="In stocks"
              value={portfolio ? fmt(portfolio.total - portfolio.cash) : '—'}
            />
            <Row
              label="Autopilot"
              value={portfolio?.autopilot ?? '—'}
              accent={portfolio?.autopilot === 'Active' ? 'var(--teal)' : 'var(--slate)'}
            />
          </div>
        </div>
        <Link
          href="/portfolio"
          style={{
            marginTop: 10,
            display: 'block',
            textAlign: 'center',
            fontSize: 12,
            color: 'var(--slate)',
            textDecoration: 'none',
          }}
        >
          Open full dashboard →
        </Link>
      </div>

      <div
        style={{
          marginTop: 'auto',
          fontSize: 10.5,
          color: 'var(--slate)',
          fontFamily: 'var(--font-mono), ui-monospace, monospace',
          letterSpacing: '0.1em',
          textAlign: 'center',
          lineHeight: 1.6,
        }}
      >
        Ballast is an educational
        <br />
        and automation tool.
        <br />
        Not financial advice.
      </div>
    </aside>
  );
}

function Row({
  label,
  value,
  accent = 'var(--mist)',
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
      <span style={{ color: 'var(--slate)' }}>{label}</span>
      <span style={{ color: accent, fontWeight: 500 }}>{value}</span>
    </div>
  );
}

// Hook used by SideRail (cannot call useBallastUser inline inside an effect)
function useBallastUserCurrency() {
  return useBallastUser().currency;
}

// ─────────────────────────── ChatInput ───────────────────────────

function ChatInput({
  onSend,
  suggestions,
  disabled,
}: {
  onSend: (msg: string) => void;
  suggestions: string[];
  disabled: boolean;
}) {
  const [text, setText] = useState('');
  const submit = () => {
    if (!text.trim() || disabled) return;
    onSend(text.trim());
    setText('');
  };
  return (
    <div
      style={{
        position: 'sticky',
        bottom: 0,
        padding: '16px 0 24px',
        background: 'linear-gradient(180deg, transparent, var(--deep-ocean) 30%)',
      }}
    >
      {suggestions.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => onSend(s)}
              disabled={disabled}
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--line)',
                color: 'rgba(246,245,242,0.85)',
                borderRadius: 999,
                padding: '7px 14px',
                fontSize: 12.5,
                cursor: 'pointer',
                fontFamily: 'inherit',
                opacity: disabled ? 0.4 : 1,
              }}
            >
              {s}
            </button>
          ))}
        </div>
      )}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 10,
          padding: '14px 16px',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid var(--line)',
          borderRadius: 16,
        }}
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={disabled ? 'Agent is working…' : 'Ask anything · type to direct the agent…'}
          disabled={disabled}
          rows={1}
          style={{
            flex: 1,
            resize: 'none',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--mist)',
            fontFamily: 'inherit',
            fontSize: 14,
            lineHeight: 1.5,
            maxHeight: 120,
            opacity: disabled ? 0.5 : 1,
          }}
        />
        <button
          onClick={submit}
          disabled={!text.trim() || disabled}
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background:
              text.trim() && !disabled ? 'var(--gold)' : 'rgba(255,255,255,0.06)',
            color: text.trim() && !disabled ? 'var(--deep-ocean)' : 'var(--slate)',
            border: 'none',
            fontSize: 18,
            fontWeight: 600,
            flexShrink: 0,
            cursor: text.trim() && !disabled ? 'pointer' : 'default',
            fontFamily: 'inherit',
          }}
        >
          ↑
        </button>
      </div>
      <div
        style={{
          marginTop: 8,
          fontSize: 11,
          color: 'var(--slate)',
          fontFamily: 'var(--font-mono), ui-monospace, monospace',
          letterSpacing: '0.1em',
          textAlign: 'center',
        }}
      >
        ENTER TO SEND · SHIFT+ENTER FOR NEW LINE · TESTNET · CLAUDE-SONNET-4-6
      </div>
    </div>
  );
}

// ─────────────────────────── App ───────────────────────────

export default function ChatPage() {
  const { address } = useAccount();
  const { region, currency } = useBallastUser();
  const fmt = useMemo(() => makeFmt(currency), [currency]);

  const greeting = useMemo(
    () =>
      `Welcome back. You're connected from ${region}, amounts will show in ${currency}. What would you like to do today?`,
    [region, currency]
  );

  const [messages, setMessages] = useState<DisplayedMessage[]>([
    { id: 'greet', role: 'assistant', content: greeting, streaming: true },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, loading]);

  const startingSuggestions = [
    'Tengo 50 USDG y quiero protegerlos de la inflación',
    '¿Qué es una acción tokenizada?',
    'Compra 30 USDG en stocks de manera automática cada 30 segundos',
  ];
  const suggestions = messages.some((m) => m.role === 'user') ? [] : startingSuggestions;

  async function send(text: string) {
    if (loading) return;
    setError(null);
    const userMsg: DisplayedMessage = { id: uid(), role: 'user', content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setLoading(true);
    try {
      const payload: ChatMessage[] = next.map(({ role, content }) => ({ role, content }));
      const res = await api.chat(payload, {
        wallet: address ?? null,
        currency,
        region,
      });
      const assistant: DisplayedMessage = {
        id: uid(),
        role: 'assistant',
        content: res.text,
        streaming: true,
        execution:
          res.pending_txs.length >= 2
            ? { pendingTxs: res.pending_txs, phase: 1 }
            : undefined,
        autopilot: res.scheduled_plan_id
          ? {
              planId: res.scheduled_plan_id,
              cadence: 'every cycle',
              cadenceSeconds: 30,
            }
          : undefined,
      };
      setMessages((m) => [...m, assistant]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  function updateExecution(messageId: string, patch: Partial<ExecutionState>) {
    setMessages((msgs) =>
      msgs.map((m) =>
        m.id === messageId && m.execution
          ? { ...m, execution: { ...m.execution, ...patch } }
          : m
      )
    );
  }

  const initial = region.slice(0, 1).toUpperCase();

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '300px minmax(0, 1fr)',
        minHeight: 'calc(100vh - 65px)',
      }}
    >
      <SideRail fmt={fmt} />

      <main
        ref={scrollRef}
        style={{
          maxHeight: 'calc(100vh - 65px)',
          overflowY: 'auto',
          padding: '32px 0 0',
        }}
      >
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 32px' }}>
          <div
            style={{
              textAlign: 'center',
              marginBottom: 36,
              fontSize: 11,
              color: 'var(--slate)',
              fontFamily: 'var(--font-mono), ui-monospace, monospace',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
            }}
          >
            ─── new conversation · {region} · {currency} ───
          </div>

          {messages.map((m) =>
            m.role === 'user' ? (
              <UserMessage key={m.id} text={m.content} initial={initial} />
            ) : (
              <AgentMessage key={m.id}>
                {m.streaming ? <StreamingText text={m.content} /> : m.content}
                {m.execution && (
                  <ExecutionCard
                    execution={m.execution}
                    onPhaseUpdate={(patch) => updateExecution(m.id, patch)}
                  />
                )}
                {m.autopilot && <AutopilotCard plan={m.autopilot} fmt={fmt} />}
              </AgentMessage>
            )
          )}

          {loading && <Thinking />}

          {error && (
            <div
              style={{
                padding: '12px 16px',
                background: 'rgba(227,119,119,0.08)',
                border: '1px solid rgba(227,119,119,0.3)',
                borderRadius: 10,
                color: '#E37777',
                fontSize: 13,
                marginBottom: 28,
              }}
            >
              {error}
            </div>
          )}

          <div style={{ height: 40 }} />
        </div>

        <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 32px' }}>
          <ChatInput onSend={send} suggestions={suggestions} disabled={loading} />
        </div>
      </main>
    </div>
  );
}
