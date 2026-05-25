/* Chat — shared primitives + message types */
const { useEffect, useState, useRef, useMemo } = React;

/* ---------- Anchor ---------- */
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

function fmtEUR(n) {
  return new Intl.NumberFormat('en-IE', {
    style: 'currency', currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(n);
}

/* ---------- Typewriter hook ---------- */
function useTypewriter(text, speed = 14, startDelay = 80, trigger = true, onDone) {
  const [out, setOut] = useState('');
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!trigger) return;
    setOut('');
    setDone(false);
    let i = 0;
    const start = setTimeout(() => {
      const iv = setInterval(() => {
        i++;
        setOut(text.slice(0, i));
        if (i >= text.length) {
          clearInterval(iv);
          setDone(true);
          if (onDone) onDone();
        }
      }, speed);
    }, startDelay);
    return () => clearTimeout(start);
  }, [text, trigger, speed, startDelay]);
  return [out, done];
}

/* ---------- Agent avatar ---------- */
function AgentAvatar({ size = 36 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: 10,
      background: 'linear-gradient(135deg, var(--midnight), var(--deep-ocean))',
      border: '1px solid var(--line-strong)',
      display: 'grid', placeItems: 'center',
      flexShrink: 0,
    }}>
      <AnchorMark size={size * 0.55} />
    </div>
  );
}

function UserAvatar({ size = 36 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: 10,
      background: 'linear-gradient(135deg, var(--gold), var(--teal))',
      display: 'grid', placeItems: 'center',
      flexShrink: 0,
      color: 'var(--deep-ocean)', fontWeight: 700, fontSize: size * 0.4,
      fontFamily: 'Manrope',
    }}>L</div>
  );
}

/* ---------- Agent message (text + streaming) ---------- */
function AgentMessage({ children, isLast }) {
  return (
    <div style={{
      display: 'flex', gap: 14, alignItems: 'flex-start',
      animation: 'fadeUp .4s ease-out',
      marginBottom: 28,
    }}>
      <AgentAvatar />
      <div style={{ flex: 1, minWidth: 0, paddingTop: 6 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
          <span style={{ fontWeight: 600, fontSize: 13.5 }}>Ballast</span>
          <span className="mono" style={{ fontSize: 10.5, color: 'var(--slate)' }}>AI · just now</span>
        </div>
        <div style={{ fontSize: 15, lineHeight: 1.65, color: 'rgba(246,245,242,0.9)' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

/* ---------- User message (right-aligned bubble) ---------- */
function UserMessage({ text }) {
  return (
    <div style={{
      display: 'flex', gap: 14, alignItems: 'flex-start',
      flexDirection: 'row-reverse',
      animation: 'fadeUp .35s ease-out',
      marginBottom: 28,
    }}>
      <UserAvatar />
      <div style={{ flex: 1, minWidth: 0, paddingTop: 6, textAlign: 'right' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4, justifyContent: 'flex-end' }}>
          <span className="mono" style={{ fontSize: 10.5, color: 'var(--slate)' }}>You · just now</span>
          <span style={{ fontWeight: 600, fontSize: 13.5 }}>Lucía</span>
        </div>
        <div style={{
          display: 'inline-block', textAlign: 'left',
          background: 'rgba(214,179,106,0.10)',
          border: '1px solid var(--line-strong)',
          padding: '12px 16px', borderRadius: '14px 14px 4px 14px',
          fontSize: 15, lineHeight: 1.55, color: 'var(--mist)',
          maxWidth: '78%',
        }}>{text}</div>
      </div>
    </div>
  );
}

/* ---------- Streaming text wrapper ---------- */
function StreamingText({ text, speed = 14, onDone }) {
  const [out, done] = useTypewriter(text, speed, 80, true, onDone);
  return <span>{out}{!done && <span className="blink-cursor"></span>}</span>;
}

/* ---------- Inline comparison stat ---------- */
function InlineStat({ label, primary, secondary, accent = 'var(--gold)' }) {
  return (
    <div style={{
      display: 'inline-flex', flexDirection: 'column', gap: 2,
      padding: '8px 14px',
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid var(--card-border)',
      borderRadius: 10,
      marginRight: 8, marginTop: 8,
    }}>
      <span style={{ fontSize: 10, color: 'var(--slate)', letterSpacing: '0.1em',
                      textTransform: 'uppercase' }}>{label}</span>
      <span className="display" style={{ fontSize: 18, fontWeight: 500, color: accent, lineHeight: 1.1 }}>{primary}</span>
      {secondary && <span style={{ fontSize: 11, color: 'var(--slate)' }}>{secondary}</span>}
    </div>
  );
}

/* ---------- Plan card (allocation proposal) ---------- */
function PlanCard({ amount, holdings, rationale, onConfirm, onAdjust, confirmed }) {
  return (
    <div style={{
      marginTop: 14, marginBottom: 6,
      background: 'rgba(8,24,38,0.6)',
      border: '1px solid var(--line-strong)',
      borderRadius: 16,
      overflow: 'hidden',
      animation: 'fadeUp .5s ease-out',
    }}>
      <div style={{
        padding: '14px 18px',
        borderBottom: '1px solid var(--line)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: 'linear-gradient(90deg, rgba(214,179,106,0.06), transparent)',
      }}>
        <div>
          <div className="mono" style={{ fontSize: 10.5, letterSpacing: '0.22em',
                                          color: 'var(--gold)', textTransform: 'uppercase' }}>
            proposed plan
          </div>
          <div style={{ fontSize: 13, color: 'var(--slate)', marginTop: 2 }}>
            Balanced US blue-chips · long-term protection
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="display" style={{ fontSize: 24, fontWeight: 500, color: 'var(--gold)' }}>
            {fmtEUR(amount)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--slate)' }}>to allocate</div>
        </div>
      </div>

      {/* Allocation bar */}
      <div style={{ display: 'flex', height: 6, width: '100%' }}>
        {holdings.map(h => (
          <div key={h.ticker} style={{
            width: `${h.pct}%`, background: h.color,
          }} />
        ))}
      </div>

      {/* Holdings list */}
      <div style={{ padding: '14px 18px' }}>
        {holdings.map(h => (
          <div key={h.ticker} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 0',
            borderBottom: '1px solid rgba(255,255,255,0.04)',
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: h.color, display: 'grid', placeItems: 'center',
              color: 'var(--deep-ocean)', fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: 10.5,
            }}>{h.ticker}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, color: 'var(--mist)', fontWeight: 500 }}>{h.name}</div>
              <div style={{ fontSize: 11.5, color: 'var(--slate)' }}>{h.why}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="mono" style={{ fontSize: 13, color: 'var(--gold)', fontWeight: 600 }}>
                {h.pct}%
              </div>
              <div style={{ fontSize: 11, color: 'var(--slate)' }}>
                ≈ {fmtEUR(amount * h.pct / 100)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Rationale */}
      <div style={{
        padding: '14px 18px',
        background: 'rgba(255,255,255,0.02)',
        borderTop: '1px solid var(--line)',
        fontSize: 13, color: 'rgba(246,245,242,0.7)', lineHeight: 1.6,
      }}>
        <span style={{ color: 'var(--gold)', fontWeight: 600 }}>Why this mix · </span>
        {rationale}
      </div>

      {/* Action bar */}
      {!confirmed ? (
        <div style={{
          padding: '14px 18px',
          display: 'flex', gap: 10, justifyContent: 'space-between', alignItems: 'center',
          borderTop: '1px solid var(--line)',
        }}>
          <div style={{ fontSize: 11, color: 'var(--slate)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: 'var(--teal)' }}>●</span>
            Quoted at live oracle price · refreshes when you confirm
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onAdjust} style={{
              background: 'transparent', color: 'var(--mist)',
              border: '1px solid var(--line)', borderRadius: 10,
              padding: '10px 16px', fontSize: 13, fontWeight: 500,
            }}>Adjust</button>
            <button onClick={onConfirm} style={{
              background: 'var(--gold)', color: 'var(--deep-ocean)',
              border: 'none', borderRadius: 10,
              padding: '10px 20px', fontSize: 13, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>Confirm & execute <span>→</span></button>
          </div>
        </div>
      ) : (
        <div style={{
          padding: '14px 18px',
          display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center',
          borderTop: '1px solid var(--line)',
          background: 'rgba(95,167,160,0.06)',
          color: 'var(--teal)', fontSize: 13, fontWeight: 500,
        }}>
          <span style={{ fontSize: 16 }}>✓</span> Confirmed · executing on chain
        </div>
      )}
    </div>
  );
}

/* ---------- Execution card (live tx state) ---------- */
function ExecutionCard({ done }) {
  const [phase, setPhase] = useState(0);
  // phases: 0 prepare prices, 1 sign tx, 2 mining, 3 done
  useEffect(() => {
    if (done) { setPhase(3); return; }
    const t1 = setTimeout(() => setPhase(1), 900);
    const t2 = setTimeout(() => setPhase(2), 1800);
    const t3 = setTimeout(() => setPhase(3), 3200);
    return () => [t1, t2, t3].forEach(clearTimeout);
  }, [done]);

  const steps = [
    'Fetching live oracle prices',
    'Calling AllocationDesk.execute()',
    'Waiting for block confirmation',
    'Stock tokens delivered to your wallet',
  ];

  return (
    <div style={{
      marginTop: 14, marginBottom: 6,
      padding: 20,
      background: 'rgba(8,24,38,0.6)',
      border: '1px solid var(--line)',
      borderRadius: 14,
      animation: 'fadeUp .5s ease-out',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div className="mono" style={{ fontSize: 10.5, letterSpacing: '0.22em',
                                        color: 'var(--gold)', textTransform: 'uppercase' }}>
          on-chain execution
        </div>
        <div className="mono" style={{ fontSize: 10.5, color: 'var(--slate)' }}>
          chain · 46630
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {steps.map((s, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 12px',
            background: 'rgba(255,255,255,0.02)',
            borderRadius: 8,
            opacity: phase >= i ? 1 : 0.35,
            transition: 'opacity .4s',
          }}>
            <div style={{ width: 16, height: 16, display: 'grid', placeItems: 'center' }}>
              {phase > i ? (
                <span style={{ color: 'var(--teal)', fontSize: 14 }}>✓</span>
              ) : phase === i ? (
                <div style={{
                  width: 12, height: 12, borderRadius: '50%',
                  border: '2px solid rgba(214,179,106,0.3)',
                  borderTopColor: 'var(--gold)',
                  animation: 'spin 0.8s linear infinite',
                }} />
              ) : (
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
              )}
            </div>
            <span style={{ fontSize: 13, color: phase >= i ? 'var(--mist)' : 'var(--slate)' }}>{s}</span>
          </div>
        ))}
      </div>

      {phase >= 3 && (
        <div style={{
          marginTop: 14, padding: '12px 14px',
          background: 'rgba(95,167,160,0.06)',
          border: '1px solid rgba(95,167,160,0.2)',
          borderRadius: 10,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          fontSize: 12,
        }}>
          <span style={{ color: 'var(--teal)' }}>● Settled</span>
          <a href="#" style={{ color: 'var(--gold)', textDecoration: 'none', fontFamily: 'JetBrains Mono', fontSize: 11.5 }}>
            tx · 0x7b9a…3f21 ↗
          </a>
        </div>
      )}
    </div>
  );
}

/* ---------- Autopilot card ---------- */
function AutopilotCard({ amount, cadence, onConfirm, confirmed }) {
  return (
    <div style={{
      marginTop: 14, marginBottom: 6,
      padding: 20,
      background: 'linear-gradient(135deg, rgba(214,179,106,0.06), rgba(95,167,160,0.04))',
      border: '1px solid var(--line-strong)',
      borderRadius: 14,
      animation: 'fadeUp .5s ease-out',
    }}>
      <div className="mono" style={{ fontSize: 10.5, letterSpacing: '0.22em',
                                      color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 10 }}>
        autopilot · proposed
      </div>
      <div style={{ fontSize: 17, lineHeight: 1.5, color: 'var(--mist)' }}>
        Invest <span style={{ color: 'var(--gold)', fontWeight: 600 }}>{fmtEUR(amount)}</span> every
        <span style={{ color: 'var(--gold)', fontWeight: 600 }}> {cadence}</span>,
        split using your current allocation. I'll handle every execution. You'll see each one
        in your activity feed.
      </div>

      <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        <MiniStat label="Per year" value={fmtEUR(amount * 52)} />
        <MiniStat label="First run" value="Next Monday" />
        <MiniStat label="Pausable" value="Anytime" />
      </div>

      {!confirmed ? (
        <button onClick={onConfirm} style={{
          marginTop: 16, width: '100%',
          background: 'var(--gold)', color: 'var(--deep-ocean)',
          border: 'none', borderRadius: 10,
          padding: '12px', fontSize: 13.5, fontWeight: 600,
        }}>Set up autopilot →</button>
      ) : (
        <div style={{
          marginTop: 14, padding: '12px',
          background: 'rgba(95,167,160,0.08)',
          border: '1px solid rgba(95,167,160,0.2)',
          borderRadius: 10,
          color: 'var(--teal)', fontSize: 13, fontWeight: 500, textAlign: 'center',
        }}>
          ✓ Autopilot active · first run next Monday 9:41
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div style={{
      padding: '10px 12px',
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.05)',
      borderRadius: 8,
    }}>
      <div style={{ fontSize: 10, color: 'var(--slate)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</div>
      <div className="display" style={{ fontSize: 15, fontWeight: 500, color: 'var(--mist)', marginTop: 2 }}>{value}</div>
    </div>
  );
}

/* ---------- Quick chips (suggested replies) ---------- */
function ChipRow({ chips, onPick }) {
  return (
    <div style={{
      display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 28, paddingLeft: 50,
      animation: 'fadeUp .35s ease-out',
    }}>
      {chips.map((c, i) => (
        <button key={i} onClick={() => onPick(c)} style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--line)',
          color: 'var(--mist)', borderRadius: 999,
          padding: '8px 16px', fontSize: 13,
        }}>{c.label}</button>
      ))}
    </div>
  );
}

/* ---------- Thinking indicator ---------- */
function Thinking() {
  return (
    <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 28,
                  animation: 'fadeUp .3s ease-out' }}>
      <AgentAvatar />
      <div style={{ paddingTop: 14, display: 'flex', gap: 4 }}>
        {[0, 1, 2].map(i => (
          <span key={i} style={{
            width: 6, height: 6, borderRadius: '50%',
            background: 'var(--gold)',
            animation: `pulse-gold 1.1s ease-in-out infinite ${i * 0.18}s`,
          }} />
        ))}
      </div>
    </div>
  );
}

Object.assign(window, {
  AnchorMark, fmtEUR, useTypewriter, AgentAvatar, UserAvatar,
  AgentMessage, UserMessage, StreamingText, InlineStat,
  PlanCard, ExecutionCard, AutopilotCard, ChipRow, Thinking,
});
