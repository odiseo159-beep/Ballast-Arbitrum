/* Main landing — composes sections from landing-parts.jsx */
const { useEffect, useState, useRef, useMemo } = React;
const { AnchorMark, WaveLayer, useTypewriter, useDecayingValue, useGrowingValue,
        useInView, fmtARS, fmtEUR, fmtUSD, Divider, StockChip } = window;

/* =================================================================
   NAV
   ================================================================= */
function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      padding: scrolled ? '14px 32px' : '22px 32px',
      transition: 'all .3s ease',
      background: scrolled ? 'rgba(8,24,38,0.78)' : 'transparent',
      backdropFilter: scrolled ? 'blur(16px) saturate(120%)' : 'none',
      borderBottom: scrolled ? '1px solid var(--line)' : '1px solid transparent',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <AnchorMark size={22} />
        <span className="display" style={{ fontWeight: 700, fontSize: 19, letterSpacing: '-0.02em' }}>Ballast</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 28, fontSize: 13.5 }}>
        <a href="#product" style={navLink}>Product</a>
        <a href="#how" style={navLink}>How it works</a>
        <a href="#agent" style={navLink}>Agent</a>
        <a href="#security" style={navLink}>Security</a>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button style={ghostBtn}>Sign in</button>
        <button style={primaryBtn} onClick={() => window.location.href = 'onboarding.html'}>
          Connect wallet
          <span style={{ marginLeft: 8 }}>→</span>
        </button>
      </div>
    </nav>
  );
}
const navLink = { color: 'var(--mist)', opacity: 0.72, textDecoration: 'none', fontWeight: 500 };
const ghostBtn = {
  background: 'transparent', color: 'var(--mist)',
  border: '1px solid var(--line)', borderRadius: 999,
  padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer',
  fontFamily: 'inherit',
};
const primaryBtn = {
  background: 'var(--gold)', color: 'var(--deep-ocean)',
  border: 'none', borderRadius: 999, padding: '9px 18px',
  fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
  fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center',
};

/* =================================================================
   HERO — animated horizon + cinematic typography
   ================================================================= */
function Hero() {
  const [t, setT] = useState(0);
  useEffect(() => {
    let raf;
    const start = performance.now();
    const tick = (now) => { setT((now - start) / 1000); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Live FX micro-ticker at top
  const fx = 1.084 + Math.sin(t * 0.5) * 0.0008 + t * 0.000004;

  return (
    <section style={{
      position: 'relative',
      minHeight: '100vh',
      paddingTop: 92,
      paddingBottom: 0,
      overflow: 'hidden',
      background: 'radial-gradient(ellipse 1100px 700px at 70% 30%, rgba(214,179,106,0.10), transparent 60%), linear-gradient(180deg, var(--midnight) 0%, var(--deep-ocean) 65%, #050f1a 100%)',
    }}>

      {/* Top FX ticker strip */}
      <div style={{
        position: 'absolute', top: 76, left: 0, right: 0,
        padding: '8px 32px',
        borderTop: '1px solid var(--line)',
        borderBottom: '1px solid var(--line)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        gap: 16, flexWrap: 'nowrap', whiteSpace: 'nowrap', overflow: 'hidden',
        fontFamily: 'JetBrains Mono', fontSize: 11, color: 'var(--slate)',
        background: 'rgba(8,24,38,0.4)',
        backdropFilter: 'blur(10px)',
      }}>
        <span style={{ flexShrink: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>SES. 24·05·26 · DUBLIN</span>
        <span style={{ display: 'flex', gap: 18, flexShrink: 0 }}>
          <span>EUR/USD <span style={{ color: 'var(--mist)' }}>{fx.toFixed(4)}</span> <span style={{ color: 'var(--teal)' }}>▲</span></span>
          <span>EU CPI 12M <span style={{ color: '#E37777' }}>+2.4%</span></span>
          <span>S&amp;P 500 <span style={{ color: 'var(--teal)' }}>+18.6%</span></span>
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--teal)', animation: 'pulse-gold 2s ease-in-out infinite' }}></span>
          MARKETS LIVE
        </span>
      </div>

      {/* Horizon "sun" / glow */}
      <div style={{
        position: 'absolute',
        left: '50%', top: '58%',
        transform: 'translate(-50%, -50%)',
        width: 540, height: 540,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(228,200,135,0.22) 0%, rgba(228,200,135,0.08) 35%, transparent 65%)',
        pointerEvents: 'none',
      }} />

      {/* Horizon line */}
      <div style={{
        position: 'absolute', left: 0, right: 0, top: '68%',
        height: 1, background: 'linear-gradient(90deg, transparent, var(--line-strong) 20%, var(--line-strong) 80%, transparent)',
      }} />

      {/* Wave layers */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, top: '68%', overflow: 'hidden' }}>
        <WaveLayer amplitude={4}  y={210} speed={32} opacity={0.5} color="rgba(95,167,160,0.5)" />
        <WaveLayer amplitude={7}  y={150} speed={24} opacity={0.4} color="rgba(95,167,160,0.4)" />
        <WaveLayer amplitude={10} y={90}  speed={18} opacity={0.35} color="rgba(95,167,160,0.35)" />
        <WaveLayer amplitude={14} y={40}  speed={14} opacity={0.3} color="rgba(95,167,160,0.3)" />
        {/* Bottom dark gradient */}
        <div style={{
          position: 'absolute', left: 0, right: 0, bottom: 0, height: 220,
          background: 'linear-gradient(180deg, transparent, #050f1a 70%)',
        }} />
      </div>

      {/* Hero text block */}
      <div style={{
        position: 'relative', zIndex: 5,
        maxWidth: 1200, margin: '0 auto',
        padding: '120px 40px 0',
        display: 'grid', gridTemplateColumns: '1.2fr 0.9fr', gap: 60, alignItems: 'start',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32,
                        fontFamily: 'JetBrains Mono', fontSize: 11, letterSpacing: '0.2em', color: 'var(--gold)',
                        textTransform: 'uppercase', animation: 'fadeUp 1s ease-out' }}>
            <span style={{ width: 24, height: 1, background: 'var(--gold)' }}></span>
            AI financial agent · Robinhood Chain
          </div>

          <h1 className="display" style={{
            fontSize: 'clamp(56px, 7.2vw, 112px)',
            fontWeight: 300,
            lineHeight: 0.95,
            margin: 0,
            color: 'var(--mist)',
            letterSpacing: '-0.04em',
            animation: 'fadeUp 1.1s ease-out',
          }}>
            Your financial <br />
            <span style={{ fontStyle: 'italic', fontWeight: 400, color: 'var(--gold)' }}>ballast.</span>
          </h1>

          <p style={{
            marginTop: 28, maxWidth: 520, fontSize: 19, lineHeight: 1.55,
            color: 'rgba(246,245,242,0.78)', fontWeight: 300,
            animation: 'fadeUp 1.3s ease-out',
          }}>
            Your savings shouldn't be locked out of the world's best market.
            Ballast anchors your money in US blue-chip stocks — through a simple
            conversation. You speak. The agent acts. Even while you sleep.
          </p>

          <div style={{ marginTop: 40, display: 'flex', gap: 14, alignItems: 'center',
                        animation: 'fadeUp 1.5s ease-out' }}>
            <button style={{ ...primaryBtn, padding: '14px 26px', fontSize: 14.5, animation: 'glow 3s ease-in-out infinite' }}
                    onClick={() => window.location.href = 'onboarding.html'}>
              Start a conversation
              <span style={{ marginLeft: 10 }}>→</span>
            </button>
            <button style={{ ...ghostBtn, padding: '13px 22px', fontSize: 14 }}>
              Watch demo · 3 min
            </button>
          </div>

          <div style={{ marginTop: 52, display: 'flex', gap: 32, opacity: 0.7,
                        animation: 'fadeUp 1.7s ease-out' }}>
            {[
              ['TSLA', 'Tesla'],
              ['AMZN', 'Amazon'],
              ['NFLX', 'Netflix'],
              ['PLTR', 'Palantir'],
              ['AMD',  'AMD'],
            ].map(([t, n]) => (
              <div key={t} style={{ textAlign: 'left' }}>
                <div className="mono" style={{ fontSize: 11, color: 'var(--gold)', letterSpacing: '0.1em' }}>{t}</div>
                <div style={{ fontSize: 11, color: 'var(--slate)' }}>{n}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right side: ship photo slot floating above horizon */}
        <div style={{ position: 'relative', height: 480, animation: 'fadeUp 1.5s ease-out' }}>
          <div style={{ position: 'absolute', inset: 0, animation: 'bob 8s ease-in-out infinite' }}>
            <image-slot
              id="hero-ship"
              shape="rounded"
              radius="18"
              placeholder="Sailboat at sunrise (from brand sheet)"
              style={{ width: '100%', height: '100%' }}
            ></image-slot>
          </div>
          {/* Floating data card over image */}
          <div style={{
            position: 'absolute', bottom: -30, left: -30,
            background: 'rgba(8,24,38,0.92)',
            backdropFilter: 'blur(20px)',
            border: '1px solid var(--line-strong)',
            borderRadius: 14, padding: '16px 20px',
            boxShadow: '0 24px 60px rgba(0,0,0,0.4)',
            minWidth: 260,
          }}>
            <div className="mono" style={{ fontSize: 10, color: 'var(--gold)', letterSpacing: '0.18em', textTransform: 'uppercase' }}>
              your portfolio · today
            </div>
            <div className="display" style={{ fontSize: 28, marginTop: 6, fontWeight: 600, color: 'var(--mist)' }}>
              {fmtEUR(24527 + t * 0.012)}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              <span style={{ color: 'var(--teal)', fontSize: 12.5 }}>↑ 18.6% past year</span>
              <span style={{ color: 'var(--slate)', fontSize: 11, fontFamily: 'JetBrains Mono' }}>live</span>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll hint */}
      <div style={{
        position: 'absolute', bottom: 28, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        color: 'var(--slate)', fontSize: 11, fontFamily: 'JetBrains Mono', letterSpacing: '0.15em',
        zIndex: 5,
      }}>
        <span>scroll</span>
        <div style={{ width: 1, height: 28, background: 'linear-gradient(180deg, var(--line-strong), transparent)' }}></div>
      </div>
    </section>
  );
}

/* =================================================================
   DRIFT — live devaluation vs anchored growth
   ================================================================= */
function Drift() {
  const [ref, inView] = useInView({ threshold: 0.2 });
  // Speed up time so opportunity cost is visible: 1 real sec = ~60 simulated days
  const cashOnly = useGrowingValue(10000, 0.015, 86400 * 60);  // EU savings 1.5% APY
  const ballast  = useGrowingValue(10000, 0.105, 86400 * 60);  // S&P 500 long-term avg 10.5%

  return (
    <section ref={ref} style={{
      position: 'relative',
      padding: '160px 40px 140px',
      background: 'linear-gradient(180deg, #050f1a 0%, var(--deep-ocean) 100%)',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <Divider label="01 · the drift" />
        <h2 className="display" style={{
          fontSize: 'clamp(40px, 5vw, 76px)', fontWeight: 300, lineHeight: 1.02,
          marginTop: 24, marginBottom: 18, maxWidth: 920,
          letterSpacing: '-0.03em',
        }}>
          Your savings can do more
          <span style={{ color: 'var(--gold-soft)', fontStyle: 'italic' }}> than sit there.</span>
        </h2>
        <p style={{ maxWidth: 600, color: 'rgba(246,245,242,0.7)', fontSize: 17, lineHeight: 1.6 }}>
          €10,000 in a European savings account barely keeps up with inflation.
          The same money in US blue-chips has historically done many times more work.
          Watch the gap, live:
        </p>

        <div style={{ marginTop: 72, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

          {/* Cash only — slow growth */}
          <div style={{
            position: 'relative',
            padding: 36,
            border: '1px solid rgba(122,132,142,0.18)',
            borderRadius: 18,
            background: 'linear-gradient(180deg, rgba(122,132,142,0.04), rgba(122,132,142,0.0))',
            overflow: 'hidden',
            minHeight: 320,
          }}>
            <div className="mono" style={{ fontSize: 11, letterSpacing: '0.2em', color: 'var(--slate)', textTransform: 'uppercase' }}>
              · Savings account
            </div>
            <div style={{ fontSize: 13, color: 'rgba(246,245,242,0.6)', marginTop: 8 }}>
              €10,000 sitting in cash · average EU savings yield 1.5%
            </div>

            <div style={{ marginTop: 36 }}>
              <div className="mono" style={{ fontSize: 11, color: 'var(--slate)' }}>VALUE TODAY</div>
              <div className="display" style={{ fontSize: 'clamp(36px, 3.8vw, 52px)', fontWeight: 300, color: '#E8E5DD', letterSpacing: '-0.03em', lineHeight: 1.05, marginTop: 4, whiteSpace: 'nowrap' }}>
                {fmtEUR(cashOnly)}
              </div>
              <div style={{ marginTop: 10, fontSize: 13.5, color: 'var(--slate)', fontFamily: 'JetBrains Mono' }}>
                + {fmtEUR(cashOnly - 10000)} earned (simulated)
              </div>
            </div>

            <SinkingLine inView={inView} mode="flat" />
          </div>

          {/* Ballast — anchored */}
          <div style={{
            position: 'relative',
            padding: 36,
            border: '1px solid var(--line-strong)',
            borderRadius: 18,
            background: 'linear-gradient(180deg, rgba(214,179,106,0.06), rgba(95,167,160,0.02))',
            overflow: 'hidden',
            minHeight: 320,
          }}>
            <div className="mono" style={{ fontSize: 11, letterSpacing: '0.2em', color: 'var(--gold)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 8 }}>
              <AnchorMark size={14} />
              With Ballast
            </div>
            <div style={{ fontSize: 13, color: 'rgba(246,245,242,0.6)', marginTop: 8 }}>
              €10,000 anchored in US blue-chips · S&amp;P 500 long-term avg 10.5%
            </div>

            <div style={{ marginTop: 36 }}>
              <div className="mono" style={{ fontSize: 11, color: 'var(--slate)' }}>VALUE TODAY</div>
              <div className="display" style={{ fontSize: 'clamp(36px, 3.8vw, 52px)', fontWeight: 300, color: 'var(--gold-soft)', letterSpacing: '-0.03em', lineHeight: 1.05, marginTop: 4, whiteSpace: 'nowrap' }}>
                {fmtEUR(ballast)}
              </div>
              <div style={{ marginTop: 10, fontSize: 13.5, color: 'var(--teal)', fontFamily: 'JetBrains Mono' }}>
                ▲ {fmtEUR(ballast - 10000)} growth (simulated)
              </div>
            </div>

            <SinkingLine inView={inView} mode="rise" />
          </div>
        </div>

        <p style={{ marginTop: 32, fontSize: 12, color: 'var(--slate)', maxWidth: 700, fontFamily: 'JetBrains Mono' }}>
          * Accelerated-time simulation · based on EU savings yields and S&amp;P 500 long-term averages ·
          educational tool, not financial advice.
        </p>
      </div>
    </section>
  );
}

function SinkingLine({ inView, mode }) {
  // small animated mini-chart in the bottom area of each card
  const points = useMemo(() => {
    const pts = [];
    for (let i = 0; i <= 30; i++) {
      const x = (i / 30) * 100;
      const noise = (Math.sin(i * 0.9) + Math.sin(i * 1.7)) * 0.6;
      let y;
      if (mode === 'sink')      y = 30 + i * 1.5 + noise;
      else if (mode === 'flat') y = 62 - i * 0.18 + noise;
      else                      y = 70 - i * 1.3 + noise;
      pts.push(`${x},${y}`);
    }
    return pts.join(' ');
  }, [mode]);

  const color = mode === 'sink' ? '#E37777'
              : mode === 'flat' ? 'rgba(122,132,142,0.7)'
              : 'var(--teal)';

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none"
         style={{
           position: 'absolute', left: 0, right: 0, bottom: 0, width: '100%', height: 120,
           opacity: inView ? 0.7 : 0,
           transition: 'opacity 1.2s ease',
         }}>
      <polyline points={points} fill="none" stroke={color} strokeWidth="0.8" />
      <polyline points={`0,100 ${points} 100,100`} fill={color} opacity="0.07" stroke="none" />
    </svg>
  );
}

/* =================================================================
   CONVERSATION — typewriter chat demo
   ================================================================= */
function Conversation() {
  const [ref, inView] = useInView({ threshold: 0.25 });
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const t1 = setTimeout(() => setStep(1), 600);
    const t2 = setTimeout(() => setStep(2), 3200);
    const t3 = setTimeout(() => setStep(3), 6800);
    const t4 = setTimeout(() => setStep(4), 9200);
    return () => [t1, t2, t3, t4].forEach(clearTimeout);
  }, [inView]);

  return (
    <section ref={ref} id="agent" style={{
      position: 'relative',
      padding: '160px 40px',
      background: 'var(--deep-ocean)',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '0.9fr 1.1fr', gap: 80, alignItems: 'center' }}>
          <div>
            <Divider label="02 · the conversation" />
            <h2 className="display" style={{
              fontSize: 'clamp(38px, 4.4vw, 64px)', fontWeight: 300, lineHeight: 1.04,
              marginTop: 24, marginBottom: 22, letterSpacing: '-0.03em',
            }}>
              Speak the way you speak.
              <br />
              <span style={{ fontStyle: 'italic', color: 'var(--gold-soft)' }}>No forms. No jargon.</span>
            </h2>
            <p style={{ color: 'rgba(246,245,242,0.7)', fontSize: 17, lineHeight: 1.6, maxWidth: 460 }}>
              Tell the agent what you want — in English, Spanish, German, or whatever
              comes naturally. It proposes a clear plan, explains the reasoning, and
              executes only when you say yes.
            </p>

            <div style={{ marginTop: 36, display: 'flex', flexDirection: 'column', gap: 18 }}>
              {[
                ['Understands intent', 'No rigid commands. Your goal, in your words.'],
                ['Proposes, never imposes', 'Every plan with its rationale in one line.'],
                ['Asks before acting', 'Nothing executes until you confirm.'],
              ].map(([t, d], i) => (
                <div key={i} style={{ display: 'flex', gap: 14 }}>
                  <div className="mono" style={{ color: 'var(--gold)', fontSize: 12, minWidth: 24 }}>0{i+1}</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--mist)' }}>{t}</div>
                    <div style={{ fontSize: 13.5, color: 'var(--slate)', marginTop: 2 }}>{d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Phone chat mockup */}
          <ChatPhone step={step} />
        </div>
      </div>
    </section>
  );
}

function ChatPhone({ step }) {
  return (
    <div style={{
      position: 'relative',
      width: 420, maxWidth: '100%',
      margin: '0 auto',
      borderRadius: 36,
      background: 'linear-gradient(180deg, #1a2f44, #0c1e2e)',
      padding: 14,
      boxShadow: '0 40px 100px rgba(0,0,0,0.45), 0 0 0 1px var(--line)',
    }}>
      {/* Phone screen */}
      <div style={{
        background: 'var(--mist)',
        borderRadius: 24,
        overflow: 'hidden',
        height: 640,
        display: 'flex', flexDirection: 'column',
        color: 'var(--graphite)',
      }}>
        {/* Status bar */}
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          padding: '12px 22px 4px',
          fontSize: 12, fontWeight: 600,
        }}>
          <span>9:41</span>
          <span style={{ fontSize: 10 }}>●●●●● 5G ▮▮▮</span>
        </div>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 18px',
          borderBottom: '1px solid #E8E5DD',
        }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--deep-ocean)',
                        display: 'grid', placeItems: 'center' }}>
            <AnchorMark size={18} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Ballast</div>
            <div style={{ fontSize: 11, color: '#5FA7A0', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#5FA7A0' }}></span>
              Assistant online
            </div>
          </div>
          <div style={{ fontSize: 18, color: 'var(--slate)' }}>⋯</div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflow: 'hidden', padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>

          {step >= 1 && (
            <UserBubble text="I have €8,000 sitting in my savings account doing nothing. Help me put it into US stocks." />
          )}

          {step >= 2 && (
            <AgentMessage>
              <AgentTyped text="Got it. I'd anchor it across five US blue-chips — historically much higher long-term returns than a savings account." trigger={step >= 2} />
            </AgentMessage>
          )}

          {step >= 3 && (
            <AgentPlanCard />
          )}

          {step >= 4 && (
            <AgentMessage>
              <AgentTyped text="Confirm the plan and run it weekly on auto-pilot?" trigger={step >= 4} />
            </AgentMessage>
          )}
        </div>

        {/* Input */}
        <div style={{
          padding: '12px 16px 18px', borderTop: '1px solid #E8E5DD',
          display: 'flex', gap: 10, alignItems: 'center',
        }}>
          <div style={{
            flex: 1, background: '#F0EEE8', borderRadius: 999,
            padding: '11px 18px', fontSize: 13, color: 'var(--slate)',
          }}>Type something...</div>
          <div style={{
            width: 38, height: 38, borderRadius: '50%',
            background: 'var(--deep-ocean)', color: 'var(--gold)',
            display: 'grid', placeItems: 'center', fontSize: 16,
          }}>↑</div>
        </div>
      </div>
    </div>
  );
}

function UserBubble({ text }) {
  return (
    <div style={{ alignSelf: 'flex-end', maxWidth: '78%', animation: 'fadeUp .4s ease-out' }}>
      <div style={{
        background: 'var(--deep-ocean)', color: 'var(--mist)',
        padding: '11px 15px', borderRadius: '18px 18px 4px 18px',
        fontSize: 13.5, lineHeight: 1.45,
      }}>{text}</div>
    </div>
  );
}

function AgentMessage({ children }) {
  return (
    <div style={{ alignSelf: 'flex-start', maxWidth: '88%', animation: 'fadeUp .4s ease-out' }}>
      <div style={{
        background: '#F0EEE8',
        padding: '11px 15px', borderRadius: '18px 18px 18px 4px',
        fontSize: 13.5, lineHeight: 1.5, color: 'var(--graphite)',
      }}>{children}</div>
    </div>
  );
}

function AgentTyped({ text, trigger }) {
  const [out, done] = useTypewriter(text, 20, 200, trigger);
  return <span>{out}{!done && <span className="blink-cursor"></span>}</span>;
}

function AgentPlanCard() {
  return (
    <div style={{ alignSelf: 'flex-start', maxWidth: '92%', animation: 'fadeUp .5s ease-out' }}>
      <div style={{
        background: 'white', border: '1px solid #E8E5DD',
        borderRadius: 14, padding: 14, fontSize: 12,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontWeight: 600, color: 'var(--graphite)' }}>Proposed plan</span>
          <span style={{ color: 'var(--slate)', fontSize: 11 }}>Long-term</span>
        </div>
        {[
          ['40%', 'Apple', 'AAPL'],
          ['30%', 'Microsoft', 'MSFT'],
          ['20%', 'Amazon', 'AMZN'],
          ['10%', 'Tesla', 'TSLA'],
        ].map(([w, n, t]) => (
          <div key={t} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: '1px solid #F0EEE8' }}>
            <span style={{ color: 'var(--graphite)' }}>
              <span className="mono" style={{ color: 'var(--gold)', marginRight: 10 }}>{w}</span>
              {n} <span style={{ color: 'var(--slate)' }}>({t})</span>
            </span>
          </div>
        ))}
        <button style={{
          width: '100%', marginTop: 12, padding: '10px',
          background: 'var(--deep-ocean)', color: 'var(--gold)',
          border: 'none', borderRadius: 8, fontSize: 12.5, fontWeight: 600,
          fontFamily: 'inherit', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8,
        }}>Confirm plan <span>→</span></button>
      </div>
    </div>
  );
}

Object.assign(window, { Nav, Hero, Drift, Conversation, primaryBtn, ghostBtn });
