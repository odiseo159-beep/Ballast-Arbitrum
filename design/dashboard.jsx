/* Ballast Dashboard — main composition */
const { useEffect, useState, useRef, useMemo } = React;
const { AnchorMark, fmtEUR, fmtPct, fmtDate, useHistory, filterRange,
        HOLDINGS, ACTIVITY, COLOR_BY_TICKER, Sparkline, Donut } = window;

/* =================================================================
   TOP BAR — nav + wallet pill
   ================================================================= */
function TopBar({ tab, setTab }) {
  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 30,
      padding: '18px 32px',
      borderBottom: '1px solid var(--line)',
      background: 'rgba(8,24,38,0.85)',
      backdropFilter: 'blur(16px) saturate(120%)',
      display: 'flex', alignItems: 'center', gap: 32,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <AnchorMark size={22} />
        <span className="display" style={{ fontWeight: 700, fontSize: 19, letterSpacing: '-0.02em' }}>Ballast</span>
      </div>

      <nav style={{ display: 'flex', gap: 6, marginLeft: 16 }}>
        {['Chat', 'Portfolio', 'Activity', 'Settings'].map(t => (
          <button key={t} onClick={() => {
            if (t === 'Chat') window.location.href = 'chat.html';
            else setTab(t);
          }}
            style={{
              background: tab === t ? 'rgba(214,179,106,0.10)' : 'transparent',
              color: tab === t ? 'var(--gold)' : 'rgba(246,245,242,0.7)',
              border: 'none', padding: '8px 16px', borderRadius: 8,
              fontSize: 13.5, fontWeight: tab === t ? 600 : 500,
            }}>{t}</button>
        ))}
      </nav>

      <div style={{ flex: 1 }} />

      <button style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 14px 8px 8px',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid var(--line)',
        borderRadius: 999, color: 'var(--mist)', fontSize: 13,
      }}>
        <span style={{
          width: 26, height: 26, borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--gold), var(--teal))',
          display: 'inline-block',
        }}></span>
        <span className="mono" style={{ fontSize: 12 }}>0x4a2b…8f93</span>
        <span style={{ color: 'var(--slate)', fontSize: 10 }}>▼</span>
      </button>

      <button style={{
        background: 'var(--gold)', color: 'var(--deep-ocean)',
        border: 'none', borderRadius: 999, padding: '9px 18px',
        fontSize: 13.5, fontWeight: 600,
      }}>+ Deposit</button>
    </header>
  );
}

/* =================================================================
   VALUE HEADER — total value, change, range picker
   ================================================================= */
function ValueHeader({ range, setRange, current, vsCash, growth, growthPct, hover }) {
  // If hovering on chart, show hovered values
  const shownValue = hover ? hover.ballast : current;
  const shownCash  = hover ? hover.cash : vsCash;
  const shownGrowth = shownValue - 25000;
  const shownGrowthPct = (shownGrowth / 25000) * 100;
  const dateLabel = hover ? fmtDate(hover.t) : 'Today';

  return (
    <div style={{
      padding: '40px 32px 24px',
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 32,
    }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <span className="mono" style={{
            fontSize: 11, letterSpacing: '0.22em', color: 'var(--gold)', textTransform: 'uppercase',
          }}>Portfolio · {dateLabel}</span>
          {!hover && (
            <span style={{
              fontSize: 11, color: 'var(--teal)',
              padding: '2px 8px', borderRadius: 999,
              background: 'rgba(95,167,160,0.12)',
              border: '1px solid rgba(95,167,160,0.3)',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--teal)',
                             animation: 'pulse-gold 2s ease-in-out infinite' }}></span>
              LIVE
            </span>
          )}
        </div>
        <div className="display" style={{
          fontSize: 'clamp(48px, 5.5vw, 84px)', fontWeight: 300,
          letterSpacing: '-0.04em', lineHeight: 1,
          whiteSpace: 'nowrap',
        }}>
          {fmtEUR(shownValue)}
        </div>
        <div style={{ marginTop: 12, display: 'flex', gap: 18, fontSize: 14, alignItems: 'center' }}>
          <span style={{ color: shownGrowth >= 0 ? 'var(--teal)' : '#E37777', fontWeight: 600 }}>
            {shownGrowth >= 0 ? '↑' : '↓'} {fmtEUR(Math.abs(shownGrowth))} ({fmtPct(shownGrowthPct)})
          </span>
          <span style={{ color: 'var(--slate)' }}>
            vs. cash-only <span style={{ color: 'var(--mist)' }}>{fmtEUR(shownCash)}</span>
            <span style={{ color: 'var(--gold)', marginLeft: 6 }}>+{fmtEUR(shownValue - shownCash)}</span>
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4, padding: 4, background: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--line)', borderRadius: 10 }}>
        {['1M','3M','6M','1Y','ALL'].map(r => (
          <button key={r} onClick={() => setRange(r)}
            style={{
              background: range === r ? 'var(--gold)' : 'transparent',
              color: range === r ? 'var(--deep-ocean)' : 'rgba(246,245,242,0.7)',
              border: 'none', padding: '7px 14px', borderRadius: 7,
              fontSize: 12, fontWeight: 600,
              fontFamily: 'JetBrains Mono', letterSpacing: '0.05em',
            }}>{r}</button>
        ))}
      </div>
    </div>
  );
}

/* =================================================================
   GROWTH CHART — interactive, hover to inspect
   ================================================================= */
function GrowthChart({ data, hover, setHover }) {
  const svgRef = useRef(null);
  const w = 800, h = 320;
  const padL = 12, padR = 60, padT = 20, padB = 28;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;

  // Scales
  const minY = Math.min(...data.map(d => Math.min(d.ballast, d.cash))) * 0.985;
  const maxY = Math.max(...data.map(d => Math.max(d.ballast, d.cash))) * 1.01;
  const yRange = maxY - minY;

  const xFor = (i) => padL + (i / (data.length - 1)) * innerW;
  const yFor = (v) => padT + (1 - (v - minY) / yRange) * innerH;

  // Path strings
  const buildPath = (key) => {
    return data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i).toFixed(2)},${yFor(d[key]).toFixed(2)}`).join(' ');
  };
  const ballastPath = buildPath('ballast');
  const cashPath = buildPath('cash');
  // Area under ballast
  const ballastArea = `${ballastPath} L ${xFor(data.length - 1)},${padT + innerH} L ${xFor(0)},${padT + innerH} Z`;

  // Mouse interaction
  const onMove = (e) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * w;
    if (x < padL || x > padL + innerW) { setHover(null); return; }
    const idx = Math.round(((x - padL) / innerW) * (data.length - 1));
    const clamped = Math.max(0, Math.min(data.length - 1, idx));
    setHover({ ...data[clamped], idx: clamped, x: xFor(clamped), y: yFor(data[clamped].ballast) });
  };
  const onLeave = () => setHover(null);

  // Y-axis grid values
  const gridSteps = 4;
  const gridLabels = Array.from({ length: gridSteps + 1 }, (_, i) => {
    const val = minY + (yRange * i / gridSteps);
    return { y: yFor(val), val };
  });

  // X-axis: 6 evenly-spaced date labels
  const xLabels = Array.from({ length: 6 }, (_, i) => {
    const idx = Math.round((data.length - 1) * (i / 5));
    return { x: xFor(idx), label: data[idx].t.toLocaleDateString('en-GB', { month: 'short', day: '2-digit' }) };
  });

  return (
    <div style={{
      padding: 24,
      background: 'var(--surface)',
      border: '1px solid var(--card-border)',
      borderRadius: 18,
      animation: 'fadeUp .5s ease-out',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <div className="mono" style={{ fontSize: 11, letterSpacing: '0.22em', color: 'var(--gold)', textTransform: 'uppercase' }}>
          your money vs. cash alone
        </div>
        <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
          <span style={{ color: 'var(--gold)' }}>
            <span style={{ display: 'inline-block', width: 10, height: 2, background: 'var(--gold)', marginRight: 6, verticalAlign: 'middle' }}></span>
            Ballast
          </span>
          <span style={{ color: 'var(--slate)' }}>
            <span style={{ display: 'inline-block', width: 10, height: 2, background: 'var(--slate)', marginRight: 6, verticalAlign: 'middle', borderTop: '1px dashed var(--slate)' }}></span>
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
        onMouseLeave={onLeave}
      >
        {/* Y-grid */}
        {gridLabels.map((g, i) => (
          <g key={i}>
            <line x1={padL} y1={g.y} x2={padL + innerW} y2={g.y}
                  stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
            <text x={padL + innerW + 6} y={g.y + 4}
                  fill="var(--slate)" fontSize="10" fontFamily="JetBrains Mono">
              €{Math.round(g.val / 1000)}k
            </text>
          </g>
        ))}

        {/* Cash area / line */}
        <path d={`${cashPath} L ${xFor(data.length - 1)},${padT + innerH} L ${xFor(0)},${padT + innerH} Z`}
              fill="rgba(122,132,142,0.05)" />
        <path d={cashPath}
              fill="none" stroke="rgba(122,132,142,0.6)" strokeWidth="1.5"
              strokeDasharray="3 3" />

        {/* Ballast area gradient */}
        <defs>
          <linearGradient id="ballast-grad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%"   stopColor="rgba(214,179,106,0.25)" />
            <stop offset="100%" stopColor="rgba(214,179,106,0)" />
          </linearGradient>
        </defs>
        <path d={ballastArea} fill="url(#ballast-grad)" />
        {/* Ballast line */}
        <path d={ballastPath}
              fill="none" stroke="var(--gold)" strokeWidth="2" />

        {/* Hover indicator */}
        {hover && (
          <g style={{ pointerEvents: 'none' }}>
            <line x1={hover.x} y1={padT} x2={hover.x} y2={padT + innerH}
                  stroke="rgba(214,179,106,0.4)" strokeWidth="1" strokeDasharray="2 3" />
            <circle cx={hover.x} cy={yFor(hover.ballast)} r="5" fill="var(--gold)" stroke="var(--deep-ocean)" strokeWidth="2" />
            <circle cx={hover.x} cy={yFor(hover.cash)}    r="4" fill="var(--slate)" stroke="var(--deep-ocean)" strokeWidth="2" />
          </g>
        )}

        {/* X labels */}
        {xLabels.map((l, i) => (
          <text key={i} x={l.x} y={h - 8} fill="var(--slate)" fontSize="10"
                fontFamily="JetBrains Mono" textAnchor="middle">{l.label}</text>
        ))}
      </svg>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 11, color: 'var(--slate)' }}>
        <span>Hover to inspect any day</span>
        <span className="mono">Source: portfolio on-chain · oracle prices</span>
      </div>
    </div>
  );
}

/* =================================================================
   HOLDINGS LIST
   ================================================================= */
function HoldingsCard() {
  const [expanded, setExpanded] = useState(null);
  return (
    <div style={{
      padding: 24,
      background: 'var(--surface)',
      border: '1px solid var(--card-border)',
      borderRadius: 18,
      animation: 'fadeUp .55s ease-out',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <div className="mono" style={{ fontSize: 11, letterSpacing: '0.22em', color: 'var(--gold)', textTransform: 'uppercase' }}>
          your holdings · 5
        </div>
        <a href="#" style={{ fontSize: 12, color: 'var(--slate)', textDecoration: 'none' }}>
          Manage →
        </a>
      </div>

      {/* Allocation donut */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 22,
                    padding: '4px 0 18px', borderBottom: '1px solid var(--line)' }}>
        <div style={{ position: 'relative' }}>
          <Donut holdings={HOLDINGS} size={140} thickness={12} />
          <div style={{
            position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
            textAlign: 'center', pointerEvents: 'none',
          }}>
            <div>
              <div style={{ fontSize: 10, color: 'var(--slate)', letterSpacing: '0.15em', fontFamily: 'JetBrains Mono' }}>SPLIT</div>
              <div className="display" style={{ fontSize: 22, fontWeight: 400, color: 'var(--mist)' }}>5 stocks</div>
            </div>
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {HOLDINGS.map(h => (
            <div key={h.ticker} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: h.color }}></span>
              <span style={{ flex: 1, color: 'var(--mist)' }}>{h.name}</span>
              <span style={{ color: 'var(--slate)', fontFamily: 'JetBrains Mono' }}>{h.pct}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Holdings rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {HOLDINGS.map(h => (
          <button key={h.ticker}
            onClick={() => setExpanded(expanded === h.ticker ? null : h.ticker)}
            style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '12px 14px',
              background: expanded === h.ticker ? 'rgba(214,179,106,0.06)' : 'rgba(255,255,255,0.02)',
              border: `1px solid ${expanded === h.ticker ? 'var(--line-strong)' : 'rgba(255,255,255,0.04)'}`,
              borderRadius: 10, textAlign: 'left',
              color: 'var(--mist)', transition: 'all .2s',
            }}>
            <div style={{
              width: 38, height: 38, borderRadius: 9, background: h.color,
              display: 'grid', placeItems: 'center',
              color: 'var(--deep-ocean)', fontWeight: 700, fontSize: 11,
              fontFamily: 'JetBrains Mono',
            }}>{h.ticker}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>{h.name}</div>
              <div style={{ fontSize: 11, color: 'var(--slate)', marginTop: 1 }}>{h.pct}% of portfolio</div>
            </div>
            <Sparkline data={h.sparkline} color={h.color} width={70} height={24} />
            <div style={{ textAlign: 'right', minWidth: 80 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, fontFamily: 'JetBrains Mono' }}>
                {fmtEUR(h.value)}
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--teal)', marginTop: 1 }}>
                ↑ {fmtPct(h.change, false)}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* =================================================================
   AUTOPILOT CARD
   ================================================================= */
function AutopilotCard() {
  const [paused, setPaused] = useState(false);
  return (
    <div style={{
      padding: 24,
      background: 'linear-gradient(135deg, rgba(214,179,106,0.06), rgba(95,167,160,0.04))',
      border: '1px solid var(--line-strong)',
      borderRadius: 18,
      animation: 'fadeUp .6s ease-out',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div className="mono" style={{ fontSize: 11, letterSpacing: '0.22em', color: 'var(--gold)', textTransform: 'uppercase' }}>
          autopilot · {paused ? 'paused' : 'active'}
        </div>
        {!paused && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10.5, color: 'var(--teal)' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--teal)',
                           animation: 'pulse-gold 1.5s ease-in-out infinite' }}></span>
            RUNNING
          </span>
        )}
      </div>

      <div style={{ fontSize: 15.5, lineHeight: 1.5, color: 'var(--mist)' }}>
        Invest <span style={{ color: 'var(--gold)', fontWeight: 600 }}>€250</span> every Monday, split across all 5 stocks.
      </div>

      <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <Stat label="Next run" value="3d 14h" mono />
        <Stat label="Executions" value="34" />
        <Stat label="Invested" value="€8,500" />
      </div>

      <button onClick={() => setPaused(!paused)} style={{
        marginTop: 18, width: '100%',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid var(--line)', color: 'var(--mist)',
        borderRadius: 10, padding: '11px',
        fontSize: 13, fontWeight: 500,
      }}>{paused ? '▶ Resume autopilot' : '❚❚ Pause autopilot'}</button>
    </div>
  );
}

function Stat({ label, value, mono }) {
  return (
    <div>
      <div style={{ fontSize: 10.5, color: 'var(--slate)', letterSpacing: '0.1em',
                    textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
      <div className="display" style={{
        fontSize: 20, fontWeight: 400, color: 'var(--mist)',
        fontFamily: mono ? 'JetBrains Mono' : 'Manrope',
      }}>{value}</div>
    </div>
  );
}

/* =================================================================
   ACTIVITY FEED
   ================================================================= */
function ActivityFeedCard() {
  const grouped = useMemo(() => {
    const out = {};
    ACTIVITY.forEach(a => {
      if (!out[a.date]) out[a.date] = [];
      out[a.date].push(a);
    });
    return out;
  }, []);

  return (
    <div style={{
      padding: 24,
      background: 'var(--surface)',
      border: '1px solid var(--card-border)',
      borderRadius: 18,
      animation: 'fadeUp .65s ease-out',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <AnchorMark size={14} />
          <span className="mono" style={{ fontSize: 11, letterSpacing: '0.22em', color: 'var(--gold)', textTransform: 'uppercase' }}>
            activity · agent + you
          </span>
        </div>
        <a href="#" style={{ fontSize: 12, color: 'var(--slate)', textDecoration: 'none' }}>View all on explorer →</a>
      </div>

      {Object.entries(grouped).map(([date, items]) => (
        <div key={date} style={{ marginBottom: 20 }}>
          <div style={{
            fontSize: 11, letterSpacing: '0.15em', color: 'var(--slate)',
            textTransform: 'uppercase', marginBottom: 8, fontFamily: 'JetBrains Mono',
          }}>{date}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {items.map((a, i) => <ActivityRow key={`${date}-${i}`} item={a} />)}
          </div>
        </div>
      ))}
    </div>
  );
}

function ActivityRow({ item }) {
  const color = COLOR_BY_TICKER[item.ticker] || 'var(--teal)';
  const isDeposit = item.type === 'deposit';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '12px 14px',
      background: item.live ? 'rgba(214,179,106,0.06)' : 'rgba(255,255,255,0.015)',
      border: `1px solid ${item.live ? 'var(--line-strong)' : 'rgba(255,255,255,0.04)'}`,
      borderRadius: 10,
    }}>
      <div style={{
        width: 34, height: 34, borderRadius: 8,
        background: isDeposit ? 'rgba(95,167,160,0.15)' : color,
        display: 'grid', placeItems: 'center',
        color: isDeposit ? 'var(--teal)' : 'var(--deep-ocean)',
        fontWeight: 700, fontSize: 11,
        fontFamily: 'JetBrains Mono',
      }}>{isDeposit ? '↓' : item.ticker}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5 }}>
          {isDeposit ? 'Wallet deposit' : <>Auto-invest · <span style={{ color: 'var(--gold)' }}>{item.name}</span></>}
        </div>
        <div style={{ fontSize: 11, color: 'var(--slate)', marginTop: 2, fontFamily: 'JetBrains Mono' }}>
          {fmtEUR(item.amount)} · {item.tx}
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 11.5, color: item.live ? 'var(--teal)' : 'var(--slate)' }}>{item.time}</div>
        {item.live && (
          <div style={{ fontSize: 10, color: 'var(--teal)', marginTop: 2, display: 'flex',
                        alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--teal)' }}></span>
            agent · no intervention
          </div>
        )}
      </div>
    </div>
  );
}

/* =================================================================
   QUICK ACTIONS
   ================================================================= */
function QuickActions() {
  const actions = [
    { icon: '↓', label: 'Deposit',  hint: 'Add funds from wallet' },
    { icon: '↑', label: 'Withdraw', hint: 'Send to your wallet' },
    { icon: '~', label: 'Rebalance',hint: 'Adjust allocation' },
    { icon: '✦', label: 'Ask agent',hint: 'Open a conversation' },
  ];
  return (
    <div style={{
      padding: 24,
      background: 'var(--surface)',
      border: '1px solid var(--card-border)',
      borderRadius: 18,
      animation: 'fadeUp .7s ease-out',
    }}>
      <div className="mono" style={{ fontSize: 11, letterSpacing: '0.22em', color: 'var(--gold)',
                                      textTransform: 'uppercase', marginBottom: 14 }}>
        actions
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {actions.map(a => (
          <button key={a.label} style={{
            padding: '14px 14px',
            background: 'rgba(255,255,255,0.025)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 10, color: 'var(--mist)',
            textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 4,
          }}>
            <span style={{ color: 'var(--gold)', fontSize: 18, fontWeight: 600 }}>{a.icon}</span>
            <span style={{ fontWeight: 600, fontSize: 13 }}>{a.label}</span>
            <span style={{ fontSize: 11, color: 'var(--slate)' }}>{a.hint}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* =================================================================
   APP
   ================================================================= */
function App() {
  const [tab, setTab] = useState('Portfolio');
  const [range, setRange] = useState('1Y');
  const [hover, setHover] = useState(null);

  const series = useHistory();
  const filtered = useMemo(() => filterRange(series, range), [series, range]);
  const latest = series[series.length - 1];

  return (
    <>
      <TopBar tab={tab} setTab={setTab} />

      <ValueHeader
        range={range}
        setRange={setRange}
        current={latest.ballast}
        vsCash={latest.cash}
        growth={latest.ballast - 25000}
        growthPct={((latest.ballast - 25000) / 25000) * 100}
        hover={hover}
      />

      <main style={{
        padding: '12px 32px 80px',
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.45fr) minmax(380px, 1fr)',
        gap: 20,
      }}>
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <GrowthChart data={filtered} hover={hover} setHover={setHover} />
          <ActivityFeedCard />
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <HoldingsCard />
          <AutopilotCard />
          <QuickActions />
        </div>
      </main>

      <footer style={{
        padding: '24px 32px',
        borderTop: '1px solid var(--line)',
        display: 'flex', justifyContent: 'space-between',
        fontSize: 11, color: 'var(--slate)', fontFamily: 'JetBrains Mono', letterSpacing: '0.1em',
      }}>
        <span>BALLAST · ROBINHOOD CHAIN · 46630 · TESTNET</span>
        <span>EDUCATIONAL TOOL · NOT FINANCIAL ADVICE</span>
        <a href="onboarding.html" style={{ color: 'var(--gold)', textDecoration: 'none' }}>← BACK TO ONBOARDING</a>
      </footer>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
