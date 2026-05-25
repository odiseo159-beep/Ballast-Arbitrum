'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import { EXPLORER_URL, STOCK_SYMBOLS, type StockSymbol } from '@ballast/shared';
import { AnchorMark } from '@/components/anchor-mark';
import { useBallastUser } from '@/components/ballast-context';
import { api, type ActivityEvent, type DcaPlanResponse, type PortfolioResponse } from '@/lib/api';
import { FAUCET_URL } from '@/lib/chain';

// ─────────────────────────── Formatters ───────────────────────────

function makeFmt(currency: string) {
  return (n: number, opts: { decimals?: number } = {}) => {
    const decimals = opts.decimals ?? 0;
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        maximumFractionDigits: decimals,
        minimumFractionDigits: decimals,
      }).format(n);
    } catch {
      return `${n.toFixed(decimals)} ${currency}`;
    }
  };
}

const fmtPct = (n: number, sign = true) => `${sign && n >= 0 ? '+' : ''}${n.toFixed(2)}%`;

const fmtDate = (d: Date) =>
  d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

// ─────────────────────────── Stock colors (matches landing palette) ───────────────────────────

const STOCK_COLORS: Record<StockSymbol, string> = {
  TSLA: '#D6B36A',
  AMZN: '#5FA7A0',
  PLTR: '#E4C887',
  NFLX: '#C09063',
  AMD: '#A8B8C5',
};

const STOCK_NAMES: Record<StockSymbol, string> = {
  TSLA: 'Tesla',
  AMZN: 'Amazon',
  PLTR: 'Palantir',
  NFLX: 'Netflix',
  AMD: 'AMD',
};

// ─────────────────────────── Synthetic historical chart ───────────────────────────

interface SeriesPoint {
  t: Date;
  ballast: number;
  cash: number;
}

function useHistory(totalNow: number): SeriesPoint[] {
  return useMemo(() => {
    const days = 365;
    const end = new Date();
    // Anchor: end value = current real total; start = ~84% of that (+18% trajectory)
    const startCapital = totalNow > 0 ? totalNow / 1.18 : 25000;
    let bal = startCapital;
    let cash = startCapital;
    const ballastDaily = Math.pow(1.105, 1 / 365) - 1;
    const cashDaily = Math.pow(1.015, 1 / 365) - 1;
    const series: SeriesPoint[] = [];
    for (let i = 0; i <= days; i++) {
      const t = new Date(end.getTime() - (days - i) * 86_400_000);
      const drift =
        ballastDaily +
        Math.sin(i * 0.07) * 0.001 +
        Math.sin(i * 0.21 + 1) * 0.0008;
      bal = bal * (1 + drift);
      if (i === 110) bal *= 0.94;
      if (i === 240) bal *= 0.96;
      cash = cash * (1 + cashDaily);
      series.push({ t, ballast: bal, cash });
    }
    // Force the last point to exactly match the real total (visual continuity)
    if (totalNow > 0 && series.length > 0) {
      series[series.length - 1] = {
        ...series[series.length - 1]!,
        ballast: totalNow,
      };
    }
    return series;
  }, [totalNow]);
}

function filterRange(series: SeriesPoint[], range: string): SeriesPoint[] {
  if (range === 'ALL') return series;
  const days = ({ '1M': 30, '3M': 90, '6M': 180, '1Y': 365 } as Record<string, number>)[range] ?? 365;
  return series.slice(-days);
}

// Deterministic sparkline data (same per ticker per render — no hydration mismatch)
function sparklineFor(ticker: string): number[] {
  let h = 0;
  for (let i = 0; i < ticker.length; i++) h = (h * 31 + ticker.charCodeAt(i)) >>> 0;
  const pts: number[] = [];
  for (let i = 0; i < 12; i++) {
    const v = 50 + Math.sin((i + h) * 0.6) * 8 + i * 2.2;
    pts.push(Math.max(20, Math.min(90, v)));
  }
  return pts;
}

// ─────────────────────────── Atoms ───────────────────────────

function Sparkline({
  data,
  color,
  width = 70,
  height = 24,
}: {
  data: number[];
  color: string;
  width?: number;
  height?: number;
}) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  const lastX = width;
  const lastY = height - ((data[data.length - 1]! - min) / range) * height;
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={lastX} cy={lastY} r="2" fill={color} />
    </svg>
  );
}

function Donut({
  holdings,
  size = 140,
  thickness = 12,
}: {
  holdings: Array<{ ticker: string; pct: number; color: string }>;
  size?: number;
  thickness?: number;
}) {
  const radius = (size - thickness) / 2;
  const circ = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {holdings.map((h) => {
        const len = (h.pct / 100) * circ;
        const arc = (
          <circle
            key={h.ticker}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={h.color}
            strokeWidth={thickness}
            strokeDasharray={`${len} ${circ - len}`}
            strokeDashoffset={-offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            strokeLinecap="butt"
          />
        );
        offset += len + 1;
        return arc;
      })}
    </svg>
  );
}

// ─────────────────────────── ValueHeader ───────────────────────────

interface HoverPoint {
  t: Date;
  ballast: number;
  cash: number;
  x: number;
  y: number;
}

function ValueHeader({
  range,
  setRange,
  current,
  hover,
  startValue,
  fmt,
}: {
  range: string;
  setRange: (r: string) => void;
  current: number;
  hover: HoverPoint | null;
  startValue: number;
  fmt: (n: number, opts?: { decimals?: number }) => string;
}) {
  const shownValue = hover ? hover.ballast : current;
  const shownCash = hover ? hover.cash : startValue;
  const shownGrowth = shownValue - startValue;
  const shownGrowthPct = startValue > 0 ? (shownGrowth / startValue) * 100 : 0;
  const dateLabel = hover ? fmtDate(hover.t) : 'Today';

  return (
    <div
      style={{
        padding: '40px 32px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        gap: 32,
      }}
    >
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <span
            className="mono"
            style={{
              fontSize: 11,
              letterSpacing: '0.22em',
              color: 'var(--gold)',
              textTransform: 'uppercase',
            }}
          >
            Portfolio · {dateLabel}
          </span>
          {!hover && (
            <span
              style={{
                fontSize: 11,
                color: 'var(--teal)',
                padding: '2px 8px',
                borderRadius: 999,
                background: 'rgba(95,167,160,0.12)',
                border: '1px solid rgba(95,167,160,0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: 'var(--teal)',
                  animation: 'pulse-gold 2s ease-in-out infinite',
                }}
              />
              LIVE
            </span>
          )}
        </div>
        <div
          className="display"
          style={{
            fontSize: 'clamp(48px, 5.5vw, 84px)',
            fontWeight: 300,
            letterSpacing: '-0.04em',
            lineHeight: 1,
            whiteSpace: 'nowrap',
          }}
        >
          {fmt(shownValue)}
        </div>
        <div
          style={{
            marginTop: 12,
            display: 'flex',
            gap: 18,
            fontSize: 14,
            alignItems: 'center',
          }}
        >
          <span
            style={{
              color: shownGrowth >= 0 ? 'var(--teal)' : '#E37777',
              fontWeight: 600,
            }}
          >
            {shownGrowth >= 0 ? '↑' : '↓'} {fmt(Math.abs(shownGrowth))} ({fmtPct(shownGrowthPct)})
          </span>
          <span style={{ color: 'var(--slate)' }}>
            vs. cash-only{' '}
            <span style={{ color: 'var(--mist)' }}>{fmt(shownCash)}</span>{' '}
            <span style={{ color: 'var(--gold)', marginLeft: 6 }}>
              +{fmt(shownValue - shownCash)}
            </span>
          </span>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 4,
          padding: 4,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--line)',
          borderRadius: 10,
        }}
      >
        {(['1M', '3M', '6M', '1Y', 'ALL'] as const).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            style={{
              background: range === r ? 'var(--gold)' : 'transparent',
              color: range === r ? 'var(--deep-ocean)' : 'rgba(246,245,242,0.7)',
              border: 'none',
              padding: '7px 14px',
              borderRadius: 7,
              fontSize: 12,
              fontWeight: 600,
              fontFamily: 'var(--font-mono), ui-monospace, monospace',
              letterSpacing: '0.05em',
              cursor: 'pointer',
            }}
          >
            {r}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────── GrowthChart ───────────────────────────

function GrowthChart({
  data,
  hover,
  setHover,
  fmt,
}: {
  data: SeriesPoint[];
  hover: HoverPoint | null;
  setHover: (h: HoverPoint | null) => void;
  fmt: (n: number) => string;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const w = 800,
    h = 320;
  const padL = 12,
    padR = 60,
    padT = 20,
    padB = 28;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;

  if (data.length === 0) return null;

  const minY =
    Math.min(...data.map((d) => Math.min(d.ballast, d.cash))) * 0.985;
  const maxY =
    Math.max(...data.map((d) => Math.max(d.ballast, d.cash))) * 1.01;
  const yRange = maxY - minY || 1;

  const xFor = (i: number) => padL + (i / (data.length - 1)) * innerW;
  const yFor = (v: number) => padT + (1 - (v - minY) / yRange) * innerH;

  const buildPath = (key: 'ballast' | 'cash') =>
    data
      .map(
        (d, i) =>
          `${i === 0 ? 'M' : 'L'} ${xFor(i).toFixed(2)},${yFor(d[key]).toFixed(2)}`
      )
      .join(' ');
  const ballastPath = buildPath('ballast');
  const cashPath = buildPath('cash');
  const ballastArea = `${ballastPath} L ${xFor(data.length - 1)},${padT + innerH} L ${xFor(0)},${padT + innerH} Z`;

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * w;
    if (x < padL || x > padL + innerW) {
      setHover(null);
      return;
    }
    const idx = Math.round(((x - padL) / innerW) * (data.length - 1));
    const clamped = Math.max(0, Math.min(data.length - 1, idx));
    const point = data[clamped]!;
    setHover({
      ...point,
      x: xFor(clamped),
      y: yFor(point.ballast),
    });
  };

  const gridSteps = 4;
  const gridLabels = Array.from({ length: gridSteps + 1 }, (_, i) => {
    const val = minY + (yRange * i) / gridSteps;
    return { y: yFor(val), val };
  });

  const xLabels = Array.from({ length: 6 }, (_, i) => {
    const idx = Math.round((data.length - 1) * (i / 5));
    return {
      x: xFor(idx),
      label: data[idx]!.t.toLocaleDateString('en-GB', {
        month: 'short',
        day: '2-digit',
      }),
    };
  });

  return (
    <div
      style={{
        padding: 24,
        background: 'var(--surface)',
        border: '1px solid var(--card-border)',
        borderRadius: 18,
        animation: 'fadeUp .5s ease-out',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 4,
        }}
      >
        <div
          className="mono"
          style={{
            fontSize: 11,
            letterSpacing: '0.22em',
            color: 'var(--gold)',
            textTransform: 'uppercase',
          }}
        >
          your money vs. cash alone
        </div>
        <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
          <span style={{ color: 'var(--gold)' }}>
            <span
              style={{
                display: 'inline-block',
                width: 10,
                height: 2,
                background: 'var(--gold)',
                marginRight: 6,
                verticalAlign: 'middle',
              }}
            />
            Ballast
          </span>
          <span style={{ color: 'var(--slate)' }}>
            <span
              style={{
                display: 'inline-block',
                width: 10,
                height: 2,
                background: 'var(--slate)',
                marginRight: 6,
                verticalAlign: 'middle',
              }}
            />
            Cash only
          </span>
        </div>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        style={{ width: '100%', height: 320, cursor: 'crosshair', display: 'block', marginTop: 12 }}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        {gridLabels.map((g, i) => (
          <g key={i}>
            <line
              x1={padL}
              y1={g.y}
              x2={padL + innerW}
              y2={g.y}
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="1"
            />
            <text
              x={padL + innerW + 6}
              y={g.y + 4}
              fill="var(--slate)"
              fontSize="10"
              fontFamily="var(--font-mono), ui-monospace, monospace"
            >
              {fmt(g.val)}
            </text>
          </g>
        ))}

        <path
          d={`${cashPath} L ${xFor(data.length - 1)},${padT + innerH} L ${xFor(0)},${padT + innerH} Z`}
          fill="rgba(122,132,142,0.05)"
        />
        <path
          d={cashPath}
          fill="none"
          stroke="rgba(122,132,142,0.6)"
          strokeWidth="1.5"
          strokeDasharray="3 3"
        />

        <defs>
          <linearGradient id="ballast-grad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(214,179,106,0.25)" />
            <stop offset="100%" stopColor="rgba(214,179,106,0)" />
          </linearGradient>
        </defs>
        <path d={ballastArea} fill="url(#ballast-grad)" />
        <path d={ballastPath} fill="none" stroke="var(--gold)" strokeWidth="2" />

        {hover && (
          <g style={{ pointerEvents: 'none' }}>
            <line
              x1={hover.x}
              y1={padT}
              x2={hover.x}
              y2={padT + innerH}
              stroke="rgba(214,179,106,0.4)"
              strokeWidth="1"
              strokeDasharray="2 3"
            />
            <circle
              cx={hover.x}
              cy={yFor(hover.ballast)}
              r="5"
              fill="var(--gold)"
              stroke="var(--deep-ocean)"
              strokeWidth="2"
            />
            <circle
              cx={hover.x}
              cy={yFor(hover.cash)}
              r="4"
              fill="var(--slate)"
              stroke="var(--deep-ocean)"
              strokeWidth="2"
            />
          </g>
        )}

        {xLabels.map((l, i) => (
          <text
            key={i}
            x={l.x}
            y={h - 8}
            fill="var(--slate)"
            fontSize="10"
            fontFamily="var(--font-mono), ui-monospace, monospace"
            textAnchor="middle"
          >
            {l.label}
          </text>
        ))}
      </svg>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 4,
          fontSize: 11,
          color: 'var(--slate)',
        }}
      >
        <span>Hover to inspect any day</span>
        <span className="mono">Source: portfolio on-chain · oracle prices · trajectory simulated</span>
      </div>
    </div>
  );
}

// ─────────────────────────── HoldingsCard ───────────────────────────

interface HoldingDisplay {
  ticker: StockSymbol;
  name: string;
  pct: number;
  value: number;
  change: number;
  color: string;
  sparkline: number[];
}

function HoldingsCard({
  holdings,
  fmt,
}: {
  holdings: HoldingDisplay[];
  fmt: (n: number) => string;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  return (
    <div
      style={{
        padding: 24,
        background: 'var(--surface)',
        border: '1px solid var(--card-border)',
        borderRadius: 18,
        animation: 'fadeUp .55s ease-out',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 18,
        }}
      >
        <div
          className="mono"
          style={{
            fontSize: 11,
            letterSpacing: '0.22em',
            color: 'var(--gold)',
            textTransform: 'uppercase',
          }}
        >
          your holdings · {holdings.length}
        </div>
        <Link
          href="/chat"
          style={{ fontSize: 12, color: 'var(--slate)', textDecoration: 'none' }}
        >
          Manage →
        </Link>
      </div>

      {holdings.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 24,
            marginBottom: 22,
            padding: '4px 0 18px',
            borderBottom: '1px solid var(--line)',
          }}
        >
          <div style={{ position: 'relative' }}>
            <Donut holdings={holdings} size={140} thickness={12} />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'grid',
                placeItems: 'center',
                textAlign: 'center',
                pointerEvents: 'none',
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 10,
                    color: 'var(--slate)',
                    letterSpacing: '0.15em',
                    fontFamily: 'var(--font-mono), ui-monospace, monospace',
                  }}
                >
                  SPLIT
                </div>
                <div
                  className="display"
                  style={{ fontSize: 22, fontWeight: 400, color: 'var(--mist)' }}
                >
                  {holdings.length} stocks
                </div>
              </div>
            </div>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {holdings.map((h) => (
              <div
                key={h.ticker}
                style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}
              >
                <span style={{ width: 8, height: 8, borderRadius: 2, background: h.color }} />
                <span style={{ flex: 1, color: 'var(--mist)' }}>{h.name}</span>
                <span
                  style={{
                    color: 'var(--slate)',
                    fontFamily: 'var(--font-mono), ui-monospace, monospace',
                  }}
                >
                  {h.pct.toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {holdings.length === 0 && (
          <div
            style={{
              padding: 24,
              textAlign: 'center',
              color: 'var(--slate)',
              fontSize: 13,
            }}
          >
            No holdings yet. Open the chat and tell the agent what to do with your USDG.
          </div>
        )}
        {holdings.map((h) => (
          <button
            key={h.ticker}
            onClick={() => setExpanded(expanded === h.ticker ? null : h.ticker)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '12px 14px',
              background:
                expanded === h.ticker
                  ? 'rgba(214,179,106,0.06)'
                  : 'rgba(255,255,255,0.02)',
              border: `1px solid ${
                expanded === h.ticker ? 'var(--line-strong)' : 'rgba(255,255,255,0.04)'
              }`,
              borderRadius: 10,
              textAlign: 'left',
              color: 'var(--mist)',
              transition: 'all .2s',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 9,
                background: h.color,
                display: 'grid',
                placeItems: 'center',
                color: 'var(--deep-ocean)',
                fontWeight: 700,
                fontSize: 11,
                fontFamily: 'var(--font-mono), ui-monospace, monospace',
              }}
            >
              {h.ticker}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>{h.name}</div>
              <div style={{ fontSize: 11, color: 'var(--slate)', marginTop: 1 }}>
                {h.pct.toFixed(1)}% of portfolio
              </div>
            </div>
            <Sparkline data={h.sparkline} color={h.color} width={70} height={24} />
            <div style={{ textAlign: 'right', minWidth: 80 }}>
              <div
                style={{
                  fontSize: 13.5,
                  fontWeight: 600,
                  fontFamily: 'var(--font-mono), ui-monospace, monospace',
                }}
              >
                {fmt(h.value)}
              </div>
              <div
                style={{
                  fontSize: 11.5,
                  color: h.change >= 0 ? 'var(--teal)' : '#E37777',
                  marginTop: 1,
                }}
              >
                {h.change >= 0 ? '↑' : '↓'} {fmtPct(h.change, false)}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────── AutopilotCard ───────────────────────────

function AutopilotCard({ plans, fmt }: { plans: DcaPlanResponse[]; fmt: (n: number) => string }) {
  const active = plans.find((p) => p.status === 'active');
  if (!active) {
    return (
      <div
        style={{
          padding: 24,
          background: 'var(--surface)',
          border: '1px solid var(--card-border)',
          borderRadius: 18,
        }}
      >
        <div
          className="mono"
          style={{
            fontSize: 11,
            letterSpacing: '0.22em',
            color: 'var(--gold)',
            textTransform: 'uppercase',
            marginBottom: 12,
          }}
        >
          autopilot · off
        </div>
        <div style={{ fontSize: 14, color: 'var(--slate)', lineHeight: 1.5, marginBottom: 14 }}>
          Set up a recurring plan so the agent invests on its own without you having to sign every time.
        </div>
        <Link
          href="/chat"
          style={{
            display: 'inline-block',
            background: 'var(--gold)',
            color: 'var(--deep-ocean)',
            border: 'none',
            borderRadius: 10,
            padding: '10px 18px',
            fontSize: 13,
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          Set up autopilot →
        </Link>
      </div>
    );
  }

  const nextDue = new Date(active.next_due_at);
  const secsLeft = Math.max(0, Math.round((nextDue.getTime() - Date.now()) / 1000));
  const nextLabel =
    secsLeft < 60
      ? `${secsLeft}s`
      : secsLeft < 3600
        ? `${Math.round(secsLeft / 60)}m`
        : secsLeft < 86_400
          ? `${Math.round(secsLeft / 3600)}h`
          : `${Math.round(secsLeft / 86_400)}d`;
  const totalInvested = Number(active.usdg_per_tick) * (1 /* approx ticks done unknown */);

  return (
    <div
      style={{
        padding: 24,
        background: 'linear-gradient(135deg, rgba(214,179,106,0.06), rgba(95,167,160,0.04))',
        border: '1px solid var(--line-strong)',
        borderRadius: 18,
        animation: 'fadeUp .6s ease-out',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 14,
        }}
      >
        <div
          className="mono"
          style={{
            fontSize: 11,
            letterSpacing: '0.22em',
            color: 'var(--gold)',
            textTransform: 'uppercase',
          }}
        >
          autopilot · active
        </div>
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 10.5,
            color: 'var(--teal)',
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: 'var(--teal)',
              animation: 'pulse-gold 1.5s ease-in-out infinite',
            }}
          />
          RUNNING
        </span>
      </div>
      <div style={{ fontSize: 15.5, lineHeight: 1.5, color: 'var(--mist)' }}>
        Invest{' '}
        <span style={{ color: 'var(--gold)', fontWeight: 600 }}>
          {fmt(Number(active.usdg_per_tick))}
        </span>{' '}
        every <span style={{ color: 'var(--gold)', fontWeight: 600 }}>{active.cadence}</span>, split across stocks.
      </div>
      <div
        style={{
          marginTop: 18,
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 12,
        }}
      >
        <Stat label="Next run" value={nextLabel} mono />
        <Stat label="Remaining" value={`${active.remaining_ticks}`} />
        <Stat label="Per tick" value={fmt(Number(active.usdg_per_tick))} />
      </div>
    </div>
  );
}

function Stat({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div
        style={{
          fontSize: 10.5,
          color: 'var(--slate)',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        className="display"
        style={{
          fontSize: 20,
          fontWeight: 400,
          color: 'var(--mist)',
          fontFamily: mono
            ? 'var(--font-mono), ui-monospace, monospace'
            : 'var(--font-manrope), system-ui, sans-serif',
        }}
      >
        {value}
      </div>
    </div>
  );
}

// ─────────────────────────── ActivityFeedCard ───────────────────────────

function ActivityFeedCard({
  events,
  fmt,
}: {
  events: ActivityEvent[];
  fmt: (n: number) => string;
}) {
  const grouped = useMemo(() => {
    const out: Record<string, ActivityEvent[]> = {};
    for (const e of events) {
      const d = new Date(e.timestamp);
      const today = new Date();
      const sameDay = d.toDateString() === today.toDateString();
      const yest = new Date(today.getTime() - 86_400_000);
      const isYest = d.toDateString() === yest.toDateString();
      const key = sameDay ? 'Today' : isYest ? 'Yesterday' : fmtDate(d);
      (out[key] ??= []).push(e);
    }
    return out;
  }, [events]);

  return (
    <div
      id="activity"
      style={{
        padding: 24,
        background: 'var(--surface)',
        border: '1px solid var(--card-border)',
        borderRadius: 18,
        animation: 'fadeUp .65s ease-out',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 18,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <AnchorMark size={14} />
          <span
            className="mono"
            style={{
              fontSize: 11,
              letterSpacing: '0.22em',
              color: 'var(--gold)',
              textTransform: 'uppercase',
            }}
          >
            activity · agent + you
          </span>
        </div>
        <a
          href={EXPLORER_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: 12, color: 'var(--slate)', textDecoration: 'none' }}
        >
          View on explorer →
        </a>
      </div>

      {events.length === 0 && (
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--slate)', fontSize: 13 }}>
          Nothing yet. As you allocate and schedule DCA, every action lands here.
        </div>
      )}

      {Object.entries(grouped).map(([date, items]) => (
        <div key={date} style={{ marginBottom: 20 }}>
          <div
            style={{
              fontSize: 11,
              letterSpacing: '0.15em',
              color: 'var(--slate)',
              textTransform: 'uppercase',
              marginBottom: 8,
              fontFamily: 'var(--font-mono), ui-monospace, monospace',
            }}
          >
            {date}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {items.map((a, i) => (
              <ActivityRow key={a.id} item={a} live={i === 0 && date === 'Today'} fmt={fmt} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ActivityRow({
  item,
  live,
  fmt,
}: {
  item: ActivityEvent;
  live: boolean;
  fmt: (n: number) => string;
}) {
  const isDca = item.type === 'dca_tick_executed';
  const isFailed = item.type === 'dca_tick_failed';
  const isScheduled = item.type === 'dca_scheduled';
  const isAllocation = item.type === 'allocation_executed';
  const txHash = typeof item.data?.tx_hash === 'string' ? item.data.tx_hash : null;

  const icon = isDca || isAllocation ? '↑' : isScheduled ? '⚡' : isFailed ? '!' : '·';
  const iconBg = isDca
    ? 'rgba(214,179,106,0.15)'
    : isFailed
      ? 'rgba(227,119,119,0.15)'
      : 'rgba(95,167,160,0.15)';
  const iconColor = isDca ? 'var(--gold)' : isFailed ? '#E37777' : 'var(--teal)';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '12px 14px',
        background: live ? 'rgba(214,179,106,0.06)' : 'rgba(255,255,255,0.015)',
        border: `1px solid ${live ? 'var(--line-strong)' : 'rgba(255,255,255,0.04)'}`,
        borderRadius: 10,
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 8,
          background: iconBg,
          display: 'grid',
          placeItems: 'center',
          color: iconColor,
          fontWeight: 700,
          fontSize: 16,
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, color: 'var(--mist)' }}>{item.summary}</div>
        <div
          style={{
            fontSize: 11,
            color: 'var(--slate)',
            marginTop: 2,
            fontFamily: 'var(--font-mono), ui-monospace, monospace',
          }}
        >
          {txHash ? (
            <a
              href={`${EXPLORER_URL}/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--gold)', textDecoration: 'none' }}
            >
              {txHash.slice(0, 10)}…{txHash.slice(-4)} ↗
            </a>
          ) : (
            item.type
          )}
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 11.5, color: live ? 'var(--teal)' : 'var(--slate)' }}>
          {new Date(item.timestamp).toLocaleTimeString()}
        </div>
        {live && (
          <div
            style={{
              fontSize: 10,
              color: 'var(--teal)',
              marginTop: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 4,
            }}
          >
            <span
              style={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: 'var(--teal)',
              }}
            />
            agent · no intervention
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────── QuickActions ───────────────────────────

function QuickActions() {
  const actions: Array<{ icon: string; label: string; hint: string; href: string; external?: boolean }> = [
    { icon: '↓', label: 'Deposit', hint: 'Get more from the faucet', href: FAUCET_URL, external: true },
    { icon: '✦', label: 'Ask agent', hint: 'Open a conversation', href: '/chat' },
    { icon: '~', label: 'Rebalance', hint: 'Adjust allocation', href: '/chat' },
    { icon: '⛯', label: 'Onboarding', hint: 'Change region or wallet', href: '/onboarding' },
  ];
  return (
    <div
      style={{
        padding: 24,
        background: 'var(--surface)',
        border: '1px solid var(--card-border)',
        borderRadius: 18,
        animation: 'fadeUp .7s ease-out',
      }}
    >
      <div
        className="mono"
        style={{
          fontSize: 11,
          letterSpacing: '0.22em',
          color: 'var(--gold)',
          textTransform: 'uppercase',
          marginBottom: 14,
        }}
      >
        actions
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {actions.map((a) =>
          a.external ? (
            <a
              key={a.label}
              href={a.href}
              target="_blank"
              rel="noopener noreferrer"
              style={actionStyle}
            >
              <span style={{ color: 'var(--gold)', fontSize: 18, fontWeight: 600 }}>{a.icon}</span>
              <span style={{ fontWeight: 600, fontSize: 13 }}>{a.label}</span>
              <span style={{ fontSize: 11, color: 'var(--slate)' }}>{a.hint}</span>
            </a>
          ) : (
            <Link key={a.label} href={a.href} style={actionStyle}>
              <span style={{ color: 'var(--gold)', fontSize: 18, fontWeight: 600 }}>{a.icon}</span>
              <span style={{ fontWeight: 600, fontSize: 13 }}>{a.label}</span>
              <span style={{ fontSize: 11, color: 'var(--slate)' }}>{a.hint}</span>
            </Link>
          )
        )}
      </div>
    </div>
  );
}

const actionStyle: CSSProperties = {
  padding: '14px',
  background: 'rgba(255,255,255,0.025)',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: 10,
  color: 'var(--mist)',
  textAlign: 'left',
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  textDecoration: 'none',
  fontFamily: 'inherit',
};

// ─────────────────────────── Page ───────────────────────────

export default function PortfolioPage() {
  const { address, isConnected } = useAccount();
  const { currency } = useBallastUser();
  const fmt = useMemo(() => makeFmt(currency), [currency]);

  const [range, setRange] = useState<string>('1Y');
  const [hover, setHover] = useState<HoverPoint | null>(null);

  const portfolioQ = useQuery<PortfolioResponse | null>({
    queryKey: ['portfolio', address, currency],
    queryFn: () => (address ? api.portfolio(address, currency) : Promise.resolve(null)),
    enabled: !!address,
    refetchInterval: 15_000,
  });
  const dcaQ = useQuery({
    queryKey: ['dca', address],
    queryFn: () => api.listDca(address!),
    enabled: !!address,
    refetchInterval: 15_000,
  });
  const activityQ = useQuery({
    queryKey: ['activity', address],
    queryFn: () => api.activity(address!, 50),
    enabled: !!address,
    refetchInterval: 10_000,
  });

  const totalLocal = portfolioQ.data?.total_value_local ?? 0;
  const totalUsd = portfolioQ.data?.total_value_usd ?? 0;
  const series = useHistory(totalLocal);
  const filtered = useMemo(() => filterRange(series, range), [series, range]);

  // Build holdings display: pct from real values, sparklines deterministic, change synthetic
  const holdings: HoldingDisplay[] = useMemo(() => {
    const positions = portfolioQ.data?.stock_positions ?? [];
    const totalStockUsd = positions.reduce((a, p) => a + p.value_usd, 0);
    return positions
      .filter((p) => Number(p.balance) > 0)
      .map((p) => {
        const ticker = p.symbol as StockSymbol;
        return {
          ticker,
          name: STOCK_NAMES[ticker] ?? ticker,
          pct: totalStockUsd > 0 ? (p.value_usd / totalStockUsd) * 100 : 0,
          value: p.value_local,
          change: ((sparklineFor(ticker)[11]! - sparklineFor(ticker)[0]!) / sparklineFor(ticker)[0]!) * 100,
          color: STOCK_COLORS[ticker] ?? 'var(--gold)',
          sparkline: sparklineFor(ticker),
        };
      })
      .sort((a, b) => b.value - a.value);
  }, [portfolioQ.data]);

  if (!isConnected) {
    return (
      <main style={{ padding: '80px 32px', textAlign: 'center', maxWidth: 600, margin: '0 auto' }}>
        <h1 className="display" style={{ fontSize: 36, fontWeight: 300, letterSpacing: '-0.03em' }}>
          Connect your wallet to see your portfolio
        </h1>
        <p style={{ marginTop: 16, color: 'var(--slate)', fontSize: 15, lineHeight: 1.5 }}>
          Your holdings live on-chain. We read them directly — nothing is stored on our side.
        </p>
        <Link
          href="/onboarding"
          style={{
            display: 'inline-block',
            marginTop: 28,
            background: 'var(--gold)',
            color: 'var(--deep-ocean)',
            padding: '12px 24px',
            borderRadius: 999,
            fontSize: 14,
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          Go to onboarding →
        </Link>
      </main>
    );
  }

  return (
    <>
      <ValueHeader
        range={range}
        setRange={setRange}
        current={totalLocal}
        hover={hover}
        startValue={filtered.length > 0 ? filtered[0]!.ballast : totalLocal}
        fmt={fmt}
      />

      <main
        style={{
          padding: '12px 32px 80px',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.45fr) minmax(380px, 1fr)',
          gap: 20,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <GrowthChart data={filtered} hover={hover} setHover={setHover} fmt={fmt} />
          <ActivityFeedCard events={activityQ.data?.events ?? []} fmt={fmt} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <HoldingsCard holdings={holdings} fmt={fmt} />
          <AutopilotCard plans={dcaQ.data?.plans ?? []} fmt={fmt} />
          <QuickActions />
        </div>
      </main>

      <footer
        style={{
          padding: '24px 32px',
          borderTop: '1px solid var(--line)',
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 11,
          color: 'var(--slate)',
          fontFamily: 'var(--font-mono), ui-monospace, monospace',
          letterSpacing: '0.1em',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <span>BALLAST · ROBINHOOD CHAIN · 46630 · TESTNET</span>
        <span>EDUCATIONAL TOOL · NOT FINANCIAL ADVICE</span>
        <Link href="/onboarding" style={{ color: 'var(--gold)', textDecoration: 'none' }}>
          ← BACK TO ONBOARDING
        </Link>
      </footer>
    </>
  );
}
