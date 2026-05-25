/* Remaining sections + App mount */
const { useEffect, useState, useRef, useMemo } = React;
const { AnchorMark, WaveLayer, useTypewriter, useDecayingValue, useGrowingValue,
        useInView, fmtARS, fmtEUR, fmtUSD, Divider, StockChip,
        Nav, Hero, Drift, Conversation, primaryBtn, ghostBtn } = window;

/* =================================================================
   PORTFOLIO PREVIEW — animated comparison chart
   ================================================================= */
function PortfolioPreview() {
  const [ref, inView] = useInView({ threshold: 0.2 });
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let raf;
    const start = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - start) / 2400);
      setProgress(p);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView]);

  return (
    <section ref={ref} id="product" style={{
      position: 'relative',
      padding: '160px 40px',
      background: 'linear-gradient(180deg, var(--deep-ocean), #061726)',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <Divider label="03 · the view" />
        <h2 className="display" style={{
          fontSize: 'clamp(38px, 4.4vw, 64px)', fontWeight: 300, lineHeight: 1.04,
          marginTop: 24, marginBottom: 22, letterSpacing: '-0.03em', maxWidth: 900,
        }}>
          A dashboard that weighs what you hold —
          <span style={{ fontStyle: 'italic', color: 'var(--gold-soft)' }}> in your currency.</span>
        </h2>
        <p style={{ color: 'rgba(246,245,242,0.7)', fontSize: 17, lineHeight: 1.6, maxWidth: 620 }}>
          Your tokenized US stocks. Your total value. And the line that matters:
          how much you'd have left it in your savings account instead.
        </p>

        <div style={{
          marginTop: 64,
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid var(--line)',
          borderRadius: 24,
          padding: 32,
          display: 'grid',
          gridTemplateColumns: '1fr 1.4fr',
          gap: 32,
          boxShadow: '0 30px 80px rgba(0,0,0,0.3)',
        }}>
          {/* Left — total + holdings */}
          <div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--gold)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
              total value
            </div>
            <div className="display" style={{ fontSize: 'clamp(34px, 3.4vw, 48px)', fontWeight: 300, marginTop: 6, letterSpacing: '-0.03em', color: 'var(--mist)', whiteSpace: 'nowrap' }}>
              {fmtEUR(24527)}
            </div>
            <div style={{ marginTop: 4, color: 'var(--teal)', fontSize: 14 }}>
              ↑ 18.6% &nbsp;<span style={{ color: 'var(--slate)' }}>all-time</span>
            </div>

            <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <StockChip ticker="AAPL" name="Apple" weight={40} color="#E4C887" />
              <StockChip ticker="AMZN" name="Amazon" weight={30} color="#5FA7A0" />
              <StockChip ticker="MSFT" name="Microsoft" weight={20} color="#A8B8C5" />
              <StockChip ticker="TSLA" name="Tesla" weight={10} color="#D6B36A" />
            </div>
          </div>

          {/* Right — chart */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <div className="mono" style={{ fontSize: 11, color: 'var(--gold)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                  your money vs. leaving it alone
                </div>
                <div style={{ fontSize: 13, color: 'var(--slate)', marginTop: 4 }}>Past 12 months · EUR</div>
              </div>
              <div style={{ display: 'flex', gap: 14, fontSize: 12 }}>
                <span style={{ color: 'var(--gold)' }}>● With Ballast</span>
                <span style={{ color: 'var(--slate)' }}>● Cash only</span>
              </div>
            </div>
            <ComparisonChart progress={progress} />
          </div>
        </div>
      </div>
    </section>
  );
}

function ComparisonChart({ progress }) {
  // Two lines: Ballast climbs, Cash declines (real-value)
  const months = ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May'];
  const ballastPoints = useMemo(() => {
    const pts = [];
    for (let i = 0; i < 12; i++) {
      const x = (i / 11) * 100;
      const base = 70 - i * 4.5 - Math.sin(i * 1.4) * 1.5;
      pts.push([x, base]);
    }
    return pts;
  }, []);
  const cashPoints = useMemo(() => {
    const pts = [];
    for (let i = 0; i < 12; i++) {
      const x = (i / 11) * 100;
      const base = 70 + i * 1.8 + Math.sin(i * 2.1) * 0.6;
      pts.push([x, base]);
    }
    return pts;
  }, []);

  const sliceAt = (arr) => {
    const cut = arr.length * progress;
    return arr.slice(0, Math.ceil(cut)).map(p => p.join(',')).join(' ');
  };

  // Last point coords
  const lastBallast = ballastPoints[Math.max(0, Math.min(11, Math.ceil(progress * 11) - 1))];
  const lastCash    = cashPoints[Math.max(0, Math.min(11, Math.ceil(progress * 11) - 1))];

  return (
    <div style={{ position: 'relative', height: 280 }}>
      <svg viewBox="0 0 100 80" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
        {/* Grid */}
        {[0, 20, 40, 60, 80].map(y => (
          <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="0.15" />
        ))}
        {/* Cash area */}
        <polyline
          points={`0,80 ${sliceAt(cashPoints)} ${lastCash[0]},80`}
          fill="rgba(122,132,142,0.10)" stroke="none"
        />
        {/* Cash line */}
        <polyline
          points={sliceAt(cashPoints)}
          fill="none" stroke="rgba(122,132,142,0.7)" strokeWidth="0.5"
          strokeDasharray="0.8 0.8"
        />
        {/* Ballast area */}
        <polyline
          points={`0,80 ${sliceAt(ballastPoints)} ${lastBallast[0]},80`}
          fill="rgba(214,179,106,0.12)" stroke="none"
        />
        {/* Ballast line */}
        <polyline
          points={sliceAt(ballastPoints)}
          fill="none" stroke="var(--gold)" strokeWidth="0.6"
        />
        {/* Dot at end */}
        {progress > 0.1 && (
          <circle cx={lastBallast[0]} cy={lastBallast[1]} r="0.9" fill="var(--gold)" />
        )}
      </svg>

      {/* End labels */}
      {progress >= 1 && (
        <>
          <div style={{
            position: 'absolute', right: -8, top: '8%',
            fontSize: 11, color: 'var(--gold)', fontFamily: 'JetBrains Mono',
            animation: 'fadeUp .5s ease-out',
          }}>
            +18.6%
          </div>
          <div style={{
            position: 'absolute', right: -8, top: '78%',
            fontSize: 11, color: 'var(--slate)', fontFamily: 'JetBrains Mono',
            animation: 'fadeUp .5s ease-out',
          }}>
            +1.5%
          </div>
        </>
      )}

      {/* X-axis */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8,
                    fontSize: 10, color: 'var(--slate)', fontFamily: 'JetBrains Mono' }}>
        {months.map(m => <span key={m}>{m}</span>)}
      </div>
    </div>
  );
}

/* =================================================================
   AUTONOMOUS LOOP — the money shot
   ================================================================= */
function Autonomous() {
  const [ref, inView] = useInView({ threshold: 0.3 });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const iv = setInterval(() => setTick(t => t + 1), 1800);
    return () => clearInterval(iv);
  }, [inView]);

  const feed = [
    { ticker: 'AAPL', name: 'Apple',     amount: 50, color: '#E4C887' },
    { ticker: 'AMZN', name: 'Amazon',    amount: 50, color: '#5FA7A0' },
    { ticker: 'MSFT', name: 'Microsoft', amount: 50, color: '#A8B8C5' },
    { ticker: 'TSLA', name: 'Tesla',     amount: 50, color: '#D6B36A' },
    { ticker: 'NFLX', name: 'Netflix',   amount: 50, color: '#C09063' },
  ];

  return (
    <section ref={ref} id="how" style={{
      position: 'relative',
      padding: '160px 40px',
      background: 'linear-gradient(180deg, #061726, #050f1a)',
      overflow: 'hidden',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <Divider label="04 · the autopilot" />
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 60, alignItems: 'start', marginTop: 24 }}>
          <div>
            <h2 className="display" style={{
              fontSize: 'clamp(38px, 4.4vw, 64px)', fontWeight: 300, lineHeight: 1.04,
              marginTop: 0, marginBottom: 22, letterSpacing: '-0.03em',
            }}>
              Tell it <span style={{ fontStyle: 'italic', color: 'var(--gold-soft)' }}>once.</span>
              <br />
              It works forever.
            </h2>
            <p style={{ color: 'rgba(246,245,242,0.7)', fontSize: 17, lineHeight: 1.6, maxWidth: 460 }}>
              "Invest €250 every week." Done. The agent sets the plan, fires the
              transactions, and logs every move. See for yourself —
              it's executing right now.
            </p>

            <div style={{
              marginTop: 36,
              padding: 24,
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid var(--line)',
              borderRadius: 16,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                <div className="mono" style={{ fontSize: 11, color: 'var(--gold)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                  active plan
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--teal)' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--teal)',
                                 animation: 'pulse-gold 1.5s ease-in-out infinite' }}></span>
                  LIVE
                </div>
              </div>
              <div style={{ fontSize: 16, color: 'var(--mist)', lineHeight: 1.5 }}>
                Invest <span style={{ color: 'var(--gold)' }}>€250</span> every
                week · split across 5 stocks · next execution in
                <span className="mono" style={{ color: 'var(--gold)' }}> 3d 14h</span>
              </div>

              <div style={{ marginTop: 18, display: 'flex', gap: 24, fontSize: 12 }}>
                <div>
                  <div style={{ color: 'var(--slate)' }}>Executions</div>
                  <div className="display" style={{ fontSize: 26, color: 'var(--mist)', fontWeight: 400 }}>34</div>
                </div>
                <div>
                  <div style={{ color: 'var(--slate)' }}>Total invested</div>
                  <div className="display" style={{ fontSize: 26, color: 'var(--mist)', fontWeight: 400 }}>€8,500</div>
                </div>
                <div>
                  <div style={{ color: 'var(--slate)' }}>On-chain</div>
                  <div className="display" style={{ fontSize: 26, color: 'var(--teal)', fontWeight: 400 }}>100%</div>
                </div>
              </div>
            </div>
          </div>

          {/* Activity feed — animated */}
          <ActivityFeed feed={feed} tick={tick} />
        </div>
      </div>
    </section>
  );
}

function ActivityFeed({ feed, tick }) {
  // Generate a growing list of executions
  const items = useMemo(() => {
    const arr = [];
    const baseTime = new Date('2026-05-24T09:41:00');
    for (let i = 0; i < 5; i++) {
      const f = feed[(tick + i) % feed.length];
      const time = new Date(baseTime.getTime() - i * 86400000 * (i === 0 ? 0 : 1));
      arr.push({
        ...f,
        timeLabel: i === 0 ? '12 seconds ago' : i === 1 ? 'Monday 9:41' : `${i + 1} days ago`,
        txHash: `0x${(Math.random() * 16e15).toString(16).slice(0, 10)}...${(Math.random() * 16e15).toString(16).slice(0, 4)}`,
      });
    }
    return arr;
  }, [tick]);

  return (
    <div style={{
      position: 'relative',
      background: 'rgba(8,24,38,0.4)',
      border: '1px solid var(--line)',
      borderRadius: 18,
      padding: 22,
      backdropFilter: 'blur(20px)',
      boxShadow: '0 30px 80px rgba(0,0,0,0.35)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <AnchorMark size={14} />
          <span className="mono" style={{ fontSize: 11, color: 'var(--gold)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
            activity feed
          </span>
        </div>
        <span className="mono" style={{ fontSize: 11, color: 'var(--slate)' }}>chain · 46630</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map((item, i) => (
          <div key={`${item.ticker}-${tick}-${i}`} style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '14px 16px',
            background: i === 0 ? 'rgba(214,179,106,0.06)' : 'rgba(255,255,255,0.02)',
            border: `1px solid ${i === 0 ? 'var(--line-strong)' : 'rgba(255,255,255,0.04)'}`,
            borderRadius: 12,
            animation: i === 0 ? 'fadeUp .5s ease-out' : undefined,
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10, background: item.color,
              display: 'grid', placeItems: 'center',
              color: 'var(--deep-ocean)', fontWeight: 700, fontSize: 11,
              fontFamily: 'JetBrains Mono',
            }}>{item.ticker}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, color: 'var(--mist)' }}>
                Auto-invest executed · <span style={{ color: 'var(--gold)' }}>{item.name}</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--slate)', marginTop: 2, fontFamily: 'JetBrains Mono' }}>
                {fmtEUR(item.amount)} · {item.txHash}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: i === 0 ? 'var(--teal)' : 'var(--slate)' }}>{item.timeLabel}</div>
              {i === 0 && (
                <div style={{ fontSize: 10, color: 'var(--teal)', marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--teal)' }}></span>
                  agent · no intervention
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--line)',
                    fontSize: 11, color: 'var(--slate)', textAlign: 'center', fontFamily: 'JetBrains Mono' }}>
        every action logged on-chain · auditable · irreversible
      </div>
    </div>
  );
}

/* =================================================================
   LIGHTHOUSE — closing trust + CTA
   ================================================================= */
function Lighthouse() {
  return (
    <section id="security" style={{
      position: 'relative',
      padding: '140px 40px 100px',
      background: 'linear-gradient(180deg, #050f1a, var(--deep-ocean))',
      overflow: 'hidden',
    }}>
      {/* Subtle horizontal line */}
      <div style={{
        position: 'absolute', left: 0, right: 0, top: '60%', height: 1,
        background: 'linear-gradient(90deg, transparent, var(--line), transparent)',
      }} />

      <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 2 }}>
        <Divider label="05 · the lighthouse" />

        <div style={{ marginTop: 28, display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 60, alignItems: 'end' }}>
          <div>
            <h2 className="display" style={{
              fontSize: 'clamp(48px, 6vw, 96px)', fontWeight: 300, lineHeight: 0.98,
              letterSpacing: '-0.04em', margin: 0,
            }}>
              When the seas
              <br />
              turn rough,
              <br />
              <span style={{ fontStyle: 'italic', color: 'var(--gold-soft)' }}>you have a harbor.</span>
            </h2>

            <div style={{ marginTop: 48, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24, maxWidth: 540 }}>
              {[
                ['Self-custody', 'You hold the keys. No one else can move your money.'],
                ['100% on-chain', 'Every action recorded on Robinhood Chain. Auditable.'],
                ['No custodian', "Ballast never touches your funds. It only executes what you sign."],
                ['Educational', "Ask the agent what any term means. No tricks."],
              ].map(([t, d]) => (
                <div key={t}>
                  <div style={{ fontWeight: 600, fontSize: 14.5, color: 'var(--gold)', marginBottom: 6 }}>{t}</div>
                  <div style={{ fontSize: 13.5, color: 'rgba(246,245,242,0.7)', lineHeight: 1.55 }}>{d}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Lighthouse image slot */}
          <div style={{ position: 'relative', height: 500 }}>
            <image-slot
              id="lighthouse"
              shape="rounded"
              radius="18"
              placeholder="Lighthouse photo (from brand sheet)"
              style={{ width: '100%', height: '100%' }}
            ></image-slot>
            {/* Floating "beam" indicator */}
            <div style={{
              position: 'absolute', bottom: 28, left: 28,
              background: 'rgba(8,24,38,0.92)',
              backdropFilter: 'blur(20px)',
              border: '1px solid var(--line-strong)',
              borderRadius: 12,
              padding: '14px 18px',
            }}>
              <div className="mono" style={{ fontSize: 10, color: 'var(--gold)', letterSpacing: '0.18em' }}>
                ● STATUS
              </div>
              <div style={{ fontSize: 14, marginTop: 4, color: 'var(--mist)' }}>
                Contract verified · OZ audited
              </div>
            </div>
          </div>
        </div>

        {/* Final CTA */}
        <div style={{
          marginTop: 120,
          padding: '60px 48px',
          border: '1px solid var(--line-strong)',
          borderRadius: 24,
          background: 'linear-gradient(135deg, rgba(214,179,106,0.06), rgba(95,167,160,0.04))',
          display: 'grid', gridTemplateColumns: '1fr auto', gap: 48, alignItems: 'center',
        }}>
          <div>
            <h3 className="display" style={{
              fontSize: 'clamp(32px, 3.6vw, 52px)', fontWeight: 300, margin: 0,
              letterSpacing: '-0.03em', lineHeight: 1.05,
            }}>
              Start anchoring your future.
              <br />
              <span style={{ fontStyle: 'italic', color: 'var(--gold-soft)', fontSize: '0.7em' }}>
                No bank account. No paperwork. Five minutes.
              </span>
            </h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button style={{ ...primaryBtn, padding: '16px 28px', fontSize: 15, animation: 'glow 3s ease-in-out infinite' }}
                    onClick={() => window.location.href = 'onboarding.html'}>
              Connect wallet
              <span style={{ marginLeft: 10 }}>→</span>
            </button>
            <a href="#" style={{ fontSize: 12.5, color: 'var(--slate)', textAlign: 'center', textDecoration: 'none' }}>
              or try the demo without connecting
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* =================================================================
   FOOTER
   ================================================================= */
function Footer() {
  return (
    <footer style={{
      padding: '80px 40px 40px',
      background: 'var(--deep-ocean)',
      borderTop: '1px solid var(--line)',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr', gap: 48 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <AnchorMark size={28} />
              <span className="display" style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em' }}>Ballast</span>
            </div>
            <div style={{ color: 'rgba(246,245,242,0.5)', fontSize: 13.5, maxWidth: 320, lineHeight: 1.55 }}>
              Stability in uncertain economies. An AI agent that anchors your savings
              in US blue-chip stocks — directly from your wallet.
            </div>
          </div>

          {[
            ['Product', ['Chat', 'Portfolio', 'Auto-invest', 'Education']],
            ['Company', ['About', 'Manifesto', 'Press', 'Contact']],
            ['Resources', ['Documentation', 'Contract (explorer)', 'Security', 'Status']],
          ].map(([title, items]) => (
            <div key={title}>
              <div className="mono" style={{ fontSize: 11, color: 'var(--gold)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 16 }}>
                {title}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {items.map(it => (
                  <a key={it} href="#" style={{ color: 'rgba(246,245,242,0.65)', fontSize: 13.5, textDecoration: 'none' }}>
                    {it}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{
          marginTop: 64, paddingTop: 28, borderTop: '1px solid var(--line)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          fontSize: 12, color: 'var(--slate)', fontFamily: 'JetBrains Mono',
        }}>
          <div>© 2026 BALLAST · DEPLOYED ON ROBINHOOD CHAIN · CHAIN ID 46630</div>
          <div style={{ display: 'flex', gap: 24 }}>
            <a href="#" style={{ color: 'var(--slate)', textDecoration: 'none' }}>TERMS</a>
            <a href="#" style={{ color: 'var(--slate)', textDecoration: 'none' }}>PRIVACY</a>
            <a href="#" style={{ color: 'var(--slate)', textDecoration: 'none' }}>DISCLAIMER</a>
          </div>
        </div>

        <div style={{
          marginTop: 32,
          padding: '14px 18px',
          background: 'rgba(214,179,106,0.04)',
          border: '1px solid var(--line)',
          borderRadius: 10,
          fontSize: 12, color: 'rgba(246,245,242,0.55)', lineHeight: 1.55,
        }}>
          <strong style={{ color: 'var(--gold)' }}>Disclaimer:</strong> Ballast is an
          educational and automation tool. It is not financial advice. Testnet assets are
          simulated; past results don't guarantee future returns. Tokenized stocks are not
          available to US residents.
        </div>
      </div>
    </footer>
  );
}

/* =================================================================
   APP
   ================================================================= */
function App() {
  return (
    <>
      <Nav />
      <Hero />
      <Drift />
      <Conversation />
      <PortfolioPreview />
      <Autonomous />
      <Lighthouse />
      <Footer />
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
