/* Dashboard shared primitives */
const { useEffect, useState, useRef, useMemo } = React;

/* ---------- Anchor mark ---------- */
function AnchorMark({ size = 28, color = "var(--gold)" }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round">
      <circle cx="32" cy="12" r="5" />
      <line x1="32" y1="17" x2="32" y2="52" />
      <line x1="22" y1="24" x2="42" y2="24" />
      <path d="M14 38 C 14 50, 24 56, 32 56 C 40 56, 50 50, 50 38" />
      <line x1="14" y1="38" x2="10" y2="34" />
      <line x1="50" y1="38" x2="54" y2="34" />
    </svg>
  );
}

/* ---------- Format helpers ---------- */
function fmtEUR(n, opts = {}) {
  const { decimals = 0 } = opts;
  return new Intl.NumberFormat('en-IE', {
    style: 'currency', currency: 'EUR',
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  }).format(n);
}
function fmtPct(n, sign = true) {
  const s = sign && n >= 0 ? '+' : '';
  return `${s}${n.toFixed(2)}%`;
}
function fmtDate(d) {
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/* ---------- Generate portfolio history ---------- */
// Returns array of { t: Date, ballast: number, cash: number }
function useHistory() {
  return useMemo(() => {
    const end = new Date('2026-05-24T09:41:00');
    const startCapital = 25000;
    const days = 365;

    // S&P 500-like trajectory: ~10.5% annual growth with realistic noise + a couple of dips
    let bal = startCapital;
    let cash = startCapital;
    const ballastDaily = Math.pow(1.105, 1/365) - 1; // ~0.0274%/day
    const cashDaily    = Math.pow(1.015, 1/365) - 1; // ~0.0041%/day

    const series = [];
    for (let i = 0; i <= days; i++) {
      const t = new Date(end.getTime() - (days - i) * 86400000);
      // Add Brownian noise
      const drift = ballastDaily + (Math.sin(i * 0.07) * 0.001) + (Math.sin(i * 0.21 + 1) * 0.0008);
      bal = bal * (1 + drift);
      // Simulate two pullbacks
      if (i === 110) bal *= 0.94;
      if (i === 240) bal *= 0.96;
      cash = cash * (1 + cashDaily);
      series.push({ t, ballast: bal, cash });
    }
    return series;
  }, []);
}

/* ---------- Range filter ---------- */
function filterRange(series, range) {
  if (range === 'ALL') return series;
  const days = { '1M': 30, '3M': 90, '6M': 180, '1Y': 365 }[range] || 365;
  return series.slice(-days);
}

/* ---------- Holdings static data ---------- */
const HOLDINGS = [
  { ticker: 'AAPL', name: 'Apple',     pct: 40, value: 11136, change: 9.2,  color: '#E4C887',
    sparkline: [50, 52, 48, 51, 55, 53, 58, 62, 59, 64, 68, 72] },
  { ticker: 'AMZN', name: 'Amazon',    pct: 25, value: 6960,  change: 14.1, color: '#5FA7A0',
    sparkline: [50, 49, 53, 56, 54, 58, 62, 66, 64, 68, 74, 78] },
  { ticker: 'MSFT', name: 'Microsoft', pct: 15, value: 4176,  change: 6.8,  color: '#A8B8C5',
    sparkline: [50, 51, 52, 50, 53, 55, 54, 57, 56, 58, 60, 62] },
  { ticker: 'TSLA', name: 'Tesla',     pct: 12, value: 3341,  change: 18.4, color: '#D6B36A',
    sparkline: [50, 47, 52, 56, 53, 60, 66, 62, 70, 74, 78, 82] },
  { ticker: 'NFLX', name: 'Netflix',   pct: 8,  value: 2227,  change: 11.7, color: '#C09063',
    sparkline: [50, 53, 51, 55, 58, 56, 60, 63, 61, 65, 68, 70] },
];

/* ---------- Activity feed static data ---------- */
const ACTIVITY = [
  { type: 'auto',     ticker: 'AAPL', name: 'Apple',     amount: 50, time: '12 seconds ago', date: 'Today', tx: '0x4a2b...8f93', live: true  },
  { type: 'auto',     ticker: 'AMZN', name: 'Amazon',    amount: 50, time: 'Monday 9:41',    date: 'This week', tx: '0x7c3d...1a04', live: false },
  { type: 'auto',     ticker: 'MSFT', name: 'Microsoft', amount: 50, time: 'Monday 9:41',    date: 'This week', tx: '0x9f1e...c2b7', live: false },
  { type: 'auto',     ticker: 'TSLA', name: 'Tesla',     amount: 50, time: 'Monday 9:41',    date: 'This week', tx: '0x3a8c...e5d2', live: false },
  { type: 'auto',     ticker: 'NFLX', name: 'Netflix',   amount: 50, time: 'Monday 9:41',    date: 'This week', tx: '0x6b4f...a019', live: false },
  { type: 'deposit',  ticker: '',     name: 'Deposit',   amount: 1000, time: '17 May, 14:22', date: 'Last week', tx: '0x8e2c...3f56', live: false },
  { type: 'auto',     ticker: 'AAPL', name: 'Apple',     amount: 50, time: '13 May, 9:41',   date: 'Last week', tx: '0x1f7a...b834', live: false },
  { type: 'auto',     ticker: 'AMZN', name: 'Amazon',    amount: 50, time: '13 May, 9:41',   date: 'Last week', tx: '0x5c9b...2e10', live: false },
];

const COLOR_BY_TICKER = Object.fromEntries(HOLDINGS.map(h => [h.ticker, h.color]));

/* ---------- Sparkline (mini chart) ---------- */
function Sparkline({ data, color, width = 80, height = 28 }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const last = data[data.length - 1];
  const lastX = width;
  const lastY = height - ((last - min) / range) * height;
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastX} cy={lastY} r="2" fill={color} />
    </svg>
  );
}

/* ---------- Donut allocation ---------- */
function Donut({ holdings, size = 160, thickness = 14 }) {
  const radius = (size - thickness) / 2;
  const circ = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {holdings.map((h, i) => {
        const len = (h.pct / 100) * circ;
        const arc = (
          <circle
            key={h.ticker}
            cx={size/2} cy={size/2} r={radius}
            fill="none" stroke={h.color} strokeWidth={thickness}
            strokeDasharray={`${len} ${circ - len}`}
            strokeDashoffset={-offset}
            transform={`rotate(-90 ${size/2} ${size/2})`}
            strokeLinecap="butt"
          />
        );
        offset += len + 1; // 1px gap between segments
        return arc;
      })}
    </svg>
  );
}

Object.assign(window, {
  AnchorMark, fmtEUR, fmtPct, fmtDate, useHistory, filterRange,
  HOLDINGS, ACTIVITY, COLOR_BY_TICKER, Sparkline, Donut,
});
