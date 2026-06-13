'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import Link from 'next/link';
import { AnchorMark } from '@/components/anchor-mark';
import { StockIcon } from '@/components/stock-icon';

// ─────────────────────────── Helpers ───────────────────────────

const fmtEUR = (n: number) =>
  new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(Math.round(n));

function useGrowingValue(initial: number, annualRate: number, timeMultiplier = 86400) {
  const [val, setVal] = useState(initial);
  const startRef = useRef<number | null>(null);
  useEffect(() => {
    let raf = 0;
    const perSecond = annualRate / (365.25 * 24 * 3600);
    const tick = (t: number) => {
      if (startRef.current === null) startRef.current = t;
      const dt = (t - startRef.current) / 1000;
      const simSecs = dt * timeMultiplier;
      setVal(initial * Math.pow(1 + perSecond, simSecs));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [initial, annualRate, timeMultiplier]);
  return val;
}

function useInView<T extends HTMLElement>(opts: IntersectionObserverInit = { threshold: 0.25 }) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver(([e]) => {
      if (e?.isIntersecting) setInView(true);
    }, opts);
    io.observe(ref.current);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return [ref, inView] as const;
}

function useTypewriter(text: string, speed = 22, startDelay = 0, trigger = true) {
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

// ─────────────────────────── Shared styles ───────────────────────────

const navLink: CSSProperties = {
  color: 'var(--mist)',
  opacity: 0.72,
  textDecoration: 'none',
  fontWeight: 500,
};
const ghostBtn: CSSProperties = {
  background: 'transparent',
  color: 'var(--mist)',
  border: '1px solid var(--line)',
  borderRadius: 999,
  padding: '8px 16px',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
  fontFamily: 'inherit',
};
const primaryBtn: CSSProperties = {
  background: 'var(--gold)',
  color: 'var(--deep-ocean)',
  border: 'none',
  borderRadius: 999,
  padding: '9px 18px',
  fontSize: 13.5,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
  display: 'inline-flex',
  alignItems: 'center',
  textDecoration: 'none',
};

// ─────────────────────────── Small reusable bits ───────────────────────────

function Divider({ label }: { label: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 18,
        color: 'var(--gold)',
        fontFamily: 'var(--font-mono), ui-monospace, monospace',
        fontSize: 11,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        opacity: 0.7,
      }}
    >
      <span style={{ height: 1, flex: '0 0 56px', background: 'var(--line-strong)' }} />
      <span>{label}</span>
      <span style={{ height: 1, flex: 1, background: 'var(--line)' }} />
    </div>
  );
}

function StockChip({
  ticker,
  name,
  weight,
  color,
}: {
  ticker: string;
  name: string;
  weight: number;
  color: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 14px',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 12,
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: color,
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <StockIcon ticker={ticker} size={18} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 13 }}>{name}</div>
        <div style={{ fontSize: 11, color: 'var(--slate)' }}>{ticker}</div>
      </div>
      <div style={{ fontFamily: 'var(--font-mono), ui-monospace, monospace', fontSize: 14, color: 'var(--gold)' }}>
        {weight}%
      </div>
    </div>
  );
}

function WaveLayer({
  amplitude = 6,
  speed = 18,
  opacity = 0.4,
  y = 0,
  color = 'rgba(95,167,160,0.3)',
}: {
  amplitude?: number;
  speed?: number;
  opacity?: number;
  y?: number;
  color?: string;
}) {
  const points = useMemo(() => {
    const w = 2400;
    const segs = 120;
    const pts: string[] = [];
    for (let i = 0; i <= segs; i++) {
      const x = (i / segs) * w;
      const yy = Math.sin((i / segs) * Math.PI * 8) * amplitude;
      pts.push(`${x.toFixed(1)},${yy.toFixed(1)}`);
    }
    return pts.join(' ');
  }, [amplitude]);

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: y,
        height: amplitude * 2 + 4,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      <svg
        viewBox={`0 ${-amplitude - 2} 1200 ${amplitude * 2 + 4}`}
        preserveAspectRatio="none"
        style={{
          width: '200%',
          height: '100%',
          animation: `drift ${speed}s linear infinite`,
          opacity,
        }}
      >
        <polyline points={points} fill="none" stroke={color} strokeWidth={1.2} strokeLinecap="round" />
      </svg>
    </div>
  );
}

// ─────────────────────────── NAV ───────────────────────────

function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        padding: scrolled ? '14px 32px' : '22px 32px',
        transition: 'all .3s ease',
        background: scrolled ? 'rgba(8,24,38,0.78)' : 'transparent',
        backdropFilter: scrolled ? 'blur(16px) saturate(120%)' : 'none',
        borderBottom: scrolled ? '1px solid var(--line)' : '1px solid transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <AnchorMark size={22} />
        <span className="display" style={{ fontWeight: 700, fontSize: 19, letterSpacing: '-0.02em' }}>
          Ballast
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 28, fontSize: 13.5 }}>
        <a href="#product" style={navLink}>Product</a>
        <a href="#how" style={navLink}>How it works</a>
        <a href="#agent" style={navLink}>Agent</a>
        <a href="#security" style={navLink}>Security</a>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button style={ghostBtn}>Sign in</button>
        <Link href="/onboarding" style={primaryBtn}>
          Connect wallet
          <span style={{ marginLeft: 8 }}>→</span>
        </Link>
      </div>
    </nav>
  );
}

// ─────────────────────────── HERO ───────────────────────────

function Hero() {
  const [t, setT] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      setT((now - start) / 1000);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const fx = 1.084 + Math.sin(t * 0.5) * 0.0008 + t * 0.000004;

  return (
    <section
      style={{
        position: 'relative',
        minHeight: '100vh',
        paddingTop: 92,
        paddingBottom: 0,
        overflow: 'hidden',
        background:
          'radial-gradient(ellipse 1100px 700px at 70% 30%, rgba(214,179,106,0.10), transparent 60%), linear-gradient(180deg, var(--midnight) 0%, var(--deep-ocean) 65%, #050f1a 100%)',
      }}
    >
      {/* Top FX ticker */}
      <div
        style={{
          position: 'absolute',
          top: 76,
          left: 0,
          right: 0,
          padding: '8px 32px',
          borderTop: '1px solid var(--line)',
          borderBottom: '1px solid var(--line)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
          flexWrap: 'nowrap',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          fontFamily: 'var(--font-mono), ui-monospace, monospace',
          fontSize: 11,
          color: 'var(--slate)',
          background: 'rgba(8,24,38,0.4)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <span style={{ flexShrink: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          SES. 25·05·26 · ROBINHOOD CHAIN
        </span>
        <span style={{ display: 'flex', gap: 18, flexShrink: 0 }}>
          <span>
            EUR/USD <span style={{ color: 'var(--mist)' }}>{fx.toFixed(4)}</span>{' '}
            <span style={{ color: 'var(--teal)' }}>▲</span>
          </span>
          <span>
            EU CPI 12M <span style={{ color: '#E37777' }}>+2.4%</span>
          </span>
          <span>
            S&amp;P 500 <span style={{ color: 'var(--teal)' }}>+18.6%</span>
          </span>
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'var(--teal)',
              animation: 'pulse-gold 2s ease-in-out infinite',
            }}
          />
          MARKETS LIVE
        </span>
      </div>

      {/* Sun glow */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '58%',
          transform: 'translate(-50%, -50%)',
          width: 540,
          height: 540,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(228,200,135,0.22) 0%, rgba(228,200,135,0.08) 35%, transparent 65%)',
          pointerEvents: 'none',
        }}
      />
      {/* Horizon line */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: '68%',
          height: 1,
          background:
            'linear-gradient(90deg, transparent, var(--line-strong) 20%, var(--line-strong) 80%, transparent)',
        }}
      />
      {/* Wave layers */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, top: '68%', overflow: 'hidden' }}>
        <WaveLayer amplitude={4} y={210} speed={32} opacity={0.5} color="rgba(95,167,160,0.5)" />
        <WaveLayer amplitude={7} y={150} speed={24} opacity={0.4} color="rgba(95,167,160,0.4)" />
        <WaveLayer amplitude={10} y={90} speed={18} opacity={0.35} color="rgba(95,167,160,0.35)" />
        <WaveLayer amplitude={14} y={40} speed={14} opacity={0.3} color="rgba(95,167,160,0.3)" />
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: 220,
            background: 'linear-gradient(180deg, transparent, #050f1a 70%)',
          }}
        />
      </div>

      {/* Hero text */}
      <div
        style={{
          position: 'relative',
          zIndex: 5,
          maxWidth: 1200,
          margin: '0 auto',
          padding: '120px 40px 0',
          display: 'grid',
          gridTemplateColumns: '1.2fr 0.9fr',
          gap: 60,
          alignItems: 'start',
        }}
      >
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 32,
              fontFamily: 'var(--font-mono), ui-monospace, monospace',
              fontSize: 11,
              letterSpacing: '0.2em',
              color: 'var(--gold)',
              textTransform: 'uppercase',
              animation: 'fadeUp 1s ease-out',
            }}
          >
            <span style={{ width: 24, height: 1, background: 'var(--gold)' }} />
            AI financial agent · Robinhood Chain
          </div>

          <h1
            className="display"
            style={{
              fontSize: 'clamp(56px, 7.2vw, 112px)',
              fontWeight: 300,
              lineHeight: 0.95,
              margin: 0,
              color: 'var(--mist)',
              letterSpacing: '-0.04em',
              animation: 'fadeUp 1.1s ease-out',
            }}
          >
            Your financial <br />
            <span style={{ fontStyle: 'italic', fontWeight: 400, color: 'var(--gold)' }}>ballast.</span>
          </h1>

          <p
            style={{
              marginTop: 28,
              maxWidth: 520,
              fontSize: 19,
              lineHeight: 1.55,
              color: 'rgba(246,245,242,0.78)',
              fontWeight: 300,
              animation: 'fadeUp 1.3s ease-out',
            }}
          >
            Your savings shouldn&apos;t be locked out of the world&apos;s best market. Ballast anchors
            your money in US blue-chip stocks — through a simple conversation. You speak. The agent
            acts. Even while you sleep.
          </p>

          <div
            style={{
              marginTop: 40,
              display: 'flex',
              gap: 14,
              alignItems: 'center',
              animation: 'fadeUp 1.5s ease-out',
            }}
          >
            <Link
              href="/onboarding"
              style={{
                ...primaryBtn,
                padding: '14px 26px',
                fontSize: 14.5,
                animation: 'glow 3s ease-in-out infinite',
              }}
            >
              Start a conversation
              <span style={{ marginLeft: 10 }}>→</span>
            </Link>
            <button style={{ ...ghostBtn, padding: '13px 22px', fontSize: 14 }}>
              Watch demo · 3 min
            </button>
          </div>

          <div
            style={{
              marginTop: 52,
              display: 'flex',
              gap: 32,
              opacity: 0.7,
              animation: 'fadeUp 1.7s ease-out',
            }}
          >
            {(
              [
                ['TSLA', 'Tesla'],
                ['AMZN', 'Amazon'],
                ['NFLX', 'Netflix'],
                ['PLTR', 'Palantir'],
                ['AMD', 'AMD'],
              ] as const
            ).map(([ticker, name]) => (
              <div key={ticker} style={{ textAlign: 'left' }}>
                <div
                  className="mono"
                  style={{ fontSize: 11, color: 'var(--gold)', letterSpacing: '0.1em' }}
                >
                  {ticker}
                </div>
                <div style={{ fontSize: 11, color: 'var(--slate)' }}>{name}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right side — image placeholder + floating data card */}
        <div style={{ position: 'relative', height: 480, animation: 'fadeUp 1.5s ease-out' }}>
          <div style={{ position: 'absolute', inset: 0, animation: 'bob 8s ease-in-out infinite' }}>
            <div
              style={{
                width: '100%',
                height: '100%',
                borderRadius: 18,
                background:
                  'linear-gradient(135deg, rgba(214,179,106,0.18) 0%, rgba(95,167,160,0.10) 40%, rgba(8,24,38,0.6) 100%), radial-gradient(circle at 60% 35%, rgba(228,200,135,0.25), transparent 55%)',
                border: '1px solid var(--line-strong)',
                display: 'grid',
                placeItems: 'center',
                color: 'var(--gold-soft)',
                fontFamily: 'var(--font-mono), ui-monospace, monospace',
                fontSize: 11,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                opacity: 0.55,
              }}
            >
              ⛵ a steady ship at sunrise
            </div>
          </div>
          <div
            style={{
              position: 'absolute',
              bottom: -30,
              left: -30,
              background: 'rgba(8,24,38,0.92)',
              backdropFilter: 'blur(20px)',
              border: '1px solid var(--line-strong)',
              borderRadius: 14,
              padding: '16px 20px',
              boxShadow: '0 24px 60px rgba(0,0,0,0.4)',
              minWidth: 260,
            }}
          >
            <div
              className="mono"
              style={{
                fontSize: 10,
                color: 'var(--gold)',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
              }}
            >
              your portfolio · today
            </div>
            <div
              className="display"
              style={{ fontSize: 28, marginTop: 6, fontWeight: 600, color: 'var(--mist)' }}
            >
              {fmtEUR(24527 + t * 0.012)}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              <span style={{ color: 'var(--teal)', fontSize: 12.5 }}>↑ 18.6% past year</span>
              <span
                style={{
                  color: 'var(--slate)',
                  fontSize: 11,
                  fontFamily: 'var(--font-mono), ui-monospace, monospace',
                }}
              >
                live
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll hint */}
      <div
        style={{
          position: 'absolute',
          bottom: 28,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
          color: 'var(--slate)',
          fontSize: 11,
          fontFamily: 'var(--font-mono), ui-monospace, monospace',
          letterSpacing: '0.15em',
          zIndex: 5,
        }}
      >
        <span>scroll</span>
        <div
          style={{
            width: 1,
            height: 28,
            background: 'linear-gradient(180deg, var(--line-strong), transparent)',
          }}
        />
      </div>
    </section>
  );
}

// ─────────────────────────── DRIFT (cash vs Ballast) ───────────────────────────

function SinkingLine({ inView, mode }: { inView: boolean; mode: 'sink' | 'flat' | 'rise' }) {
  const points = useMemo(() => {
    const pts: string[] = [];
    for (let i = 0; i <= 30; i++) {
      const x = (i / 30) * 100;
      const noise = (Math.sin(i * 0.9) + Math.sin(i * 1.7)) * 0.6;
      let y;
      if (mode === 'sink') y = 30 + i * 1.5 + noise;
      else if (mode === 'flat') y = 62 - i * 0.18 + noise;
      else y = 70 - i * 1.3 + noise;
      pts.push(`${x},${y}`);
    }
    return pts.join(' ');
  }, [mode]);

  const color =
    mode === 'sink' ? '#E37777' : mode === 'flat' ? 'rgba(122,132,142,0.7)' : 'var(--teal)';

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: 120,
        opacity: inView ? 0.7 : 0,
        transition: 'opacity 1.2s ease',
      }}
    >
      <polyline points={points} fill="none" stroke={color} strokeWidth="0.8" />
      <polyline points={`0,100 ${points} 100,100`} fill={color} opacity="0.07" stroke="none" />
    </svg>
  );
}

function Drift() {
  const [ref, inView] = useInView<HTMLElement>({ threshold: 0.2 });
  const cashOnly = useGrowingValue(10000, 0.015, 86400 * 60);
  const ballast = useGrowingValue(10000, 0.105, 86400 * 60);

  return (
    <section
      ref={ref}
      style={{
        position: 'relative',
        padding: '160px 40px 140px',
        background: 'linear-gradient(180deg, #050f1a 0%, var(--deep-ocean) 100%)',
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <Divider label="01 · the drift" />
        <h2
          className="display"
          style={{
            fontSize: 'clamp(40px, 5vw, 76px)',
            fontWeight: 300,
            lineHeight: 1.02,
            marginTop: 24,
            marginBottom: 18,
            maxWidth: 920,
            letterSpacing: '-0.03em',
          }}
        >
          Your savings can do more
          <span style={{ color: 'var(--gold-soft)', fontStyle: 'italic' }}> than sit there.</span>
        </h2>
        <p
          style={{
            maxWidth: 600,
            color: 'rgba(246,245,242,0.7)',
            fontSize: 17,
            lineHeight: 1.6,
          }}
        >
          €10,000 in a European savings account barely keeps up with inflation. The same money in US
          blue-chips has historically done many times more work. Watch the gap, live:
        </p>

        <div style={{ marginTop: 72, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {/* Cash only */}
          <div
            style={{
              position: 'relative',
              padding: 36,
              border: '1px solid rgba(122,132,142,0.18)',
              borderRadius: 18,
              background: 'linear-gradient(180deg, rgba(122,132,142,0.04), rgba(122,132,142,0.0))',
              overflow: 'hidden',
              minHeight: 320,
            }}
          >
            <div
              className="mono"
              style={{
                fontSize: 11,
                letterSpacing: '0.2em',
                color: 'var(--slate)',
                textTransform: 'uppercase',
              }}
            >
              · Savings account
            </div>
            <div style={{ fontSize: 13, color: 'rgba(246,245,242,0.6)', marginTop: 8 }}>
              €10,000 sitting in cash · average EU savings yield 1.5%
            </div>

            <div style={{ marginTop: 36 }}>
              <div className="mono" style={{ fontSize: 11, color: 'var(--slate)' }}>
                VALUE TODAY
              </div>
              <div
                className="display"
                style={{
                  fontSize: 'clamp(36px, 3.8vw, 52px)',
                  fontWeight: 300,
                  color: '#E8E5DD',
                  letterSpacing: '-0.03em',
                  lineHeight: 1.05,
                  marginTop: 4,
                  whiteSpace: 'nowrap',
                }}
              >
                {fmtEUR(cashOnly)}
              </div>
              <div
                style={{
                  marginTop: 10,
                  fontSize: 13.5,
                  color: 'var(--slate)',
                  fontFamily: 'var(--font-mono), ui-monospace, monospace',
                }}
              >
                + {fmtEUR(cashOnly - 10000)} earned (simulated)
              </div>
            </div>
            <SinkingLine inView={inView} mode="flat" />
          </div>

          {/* Ballast */}
          <div
            style={{
              position: 'relative',
              padding: 36,
              border: '1px solid var(--line-strong)',
              borderRadius: 18,
              background: 'linear-gradient(180deg, rgba(214,179,106,0.06), rgba(95,167,160,0.02))',
              overflow: 'hidden',
              minHeight: 320,
            }}
          >
            <div
              className="mono"
              style={{
                fontSize: 11,
                letterSpacing: '0.2em',
                color: 'var(--gold)',
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <AnchorMark size={14} />
              With Ballast
            </div>
            <div style={{ fontSize: 13, color: 'rgba(246,245,242,0.6)', marginTop: 8 }}>
              €10,000 anchored in US blue-chips · S&amp;P 500 long-term avg 10.5%
            </div>

            <div style={{ marginTop: 36 }}>
              <div className="mono" style={{ fontSize: 11, color: 'var(--slate)' }}>
                VALUE TODAY
              </div>
              <div
                className="display"
                style={{
                  fontSize: 'clamp(36px, 3.8vw, 52px)',
                  fontWeight: 300,
                  color: 'var(--gold-soft)',
                  letterSpacing: '-0.03em',
                  lineHeight: 1.05,
                  marginTop: 4,
                  whiteSpace: 'nowrap',
                }}
              >
                {fmtEUR(ballast)}
              </div>
              <div
                style={{
                  marginTop: 10,
                  fontSize: 13.5,
                  color: 'var(--teal)',
                  fontFamily: 'var(--font-mono), ui-monospace, monospace',
                }}
              >
                ▲ {fmtEUR(ballast - 10000)} growth (simulated)
              </div>
            </div>
            <SinkingLine inView={inView} mode="rise" />
          </div>
        </div>

        <p
          style={{
            marginTop: 32,
            fontSize: 12,
            color: 'var(--slate)',
            maxWidth: 700,
            fontFamily: 'var(--font-mono), ui-monospace, monospace',
          }}
        >
          * Accelerated-time simulation · based on EU savings yields and S&amp;P 500 long-term
          averages · educational tool, not financial advice.
        </p>
      </div>
    </section>
  );
}

// ─────────────────────────── CONVERSATION (phone mockup) ───────────────────────────

function AgentTyped({ text, trigger }: { text: string; trigger: boolean }) {
  const [out, done] = useTypewriter(text, 20, 200, trigger);
  return (
    <span>
      {out}
      {!done && <span className="blink-cursor" />}
    </span>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <div style={{ alignSelf: 'flex-end', maxWidth: '78%', animation: 'fadeUp .4s ease-out' }}>
      <div
        style={{
          background: 'var(--deep-ocean)',
          color: 'var(--mist)',
          padding: '11px 15px',
          borderRadius: '18px 18px 4px 18px',
          fontSize: 13.5,
          lineHeight: 1.45,
        }}
      >
        {text}
      </div>
    </div>
  );
}

function AgentMessage({ children }: { children: ReactNode }) {
  return (
    <div style={{ alignSelf: 'flex-start', maxWidth: '88%', animation: 'fadeUp .4s ease-out' }}>
      <div
        style={{
          background: '#F0EEE8',
          padding: '11px 15px',
          borderRadius: '18px 18px 18px 4px',
          fontSize: 13.5,
          lineHeight: 1.5,
          color: 'var(--graphite)',
        }}
      >
        {children}
      </div>
    </div>
  );
}

function AgentPlanCard() {
  return (
    <div style={{ alignSelf: 'flex-start', maxWidth: '92%', animation: 'fadeUp .5s ease-out' }}>
      <div
        style={{
          background: 'white',
          border: '1px solid #E8E5DD',
          borderRadius: 14,
          padding: 14,
          fontSize: 12,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontWeight: 600, color: 'var(--graphite)' }}>Proposed plan</span>
          <span style={{ color: 'var(--slate)', fontSize: 11 }}>Long-term</span>
        </div>
        {(
          [
            ['40%', 'Amazon', 'AMZN'],
            ['25%', 'Netflix', 'NFLX'],
            ['20%', 'Palantir', 'PLTR'],
            ['15%', 'Tesla', 'TSLA'],
          ] as const
        ).map(([w, n, t]) => (
          <div
            key={t}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '6px 0',
              borderTop: '1px solid #F0EEE8',
            }}
          >
            <span style={{ color: 'var(--graphite)' }}>
              <span
                className="mono"
                style={{ color: 'var(--gold)', marginRight: 10 }}
              >
                {w}
              </span>
              {n} <span style={{ color: 'var(--slate)' }}>({t})</span>
            </span>
          </div>
        ))}
        <button
          style={{
            width: '100%',
            marginTop: 12,
            padding: '10px',
            background: 'var(--deep-ocean)',
            color: 'var(--gold)',
            border: 'none',
            borderRadius: 8,
            fontSize: 12.5,
            fontWeight: 600,
            fontFamily: 'inherit',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 8,
          }}
        >
          Confirm plan <span>→</span>
        </button>
      </div>
    </div>
  );
}

function ChatPhone({ step }: { step: number }) {
  return (
    <div
      style={{
        position: 'relative',
        width: 420,
        maxWidth: '100%',
        margin: '0 auto',
        borderRadius: 36,
        background: 'linear-gradient(180deg, #1a2f44, #0c1e2e)',
        padding: 14,
        boxShadow: '0 40px 100px rgba(0,0,0,0.45), 0 0 0 1px var(--line)',
      }}
    >
      <div
        style={{
          background: 'var(--mist)',
          borderRadius: 24,
          overflow: 'hidden',
          height: 640,
          display: 'flex',
          flexDirection: 'column',
          color: 'var(--graphite)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '12px 22px 4px',
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          <span>9:41</span>
          <span style={{ fontSize: 10 }}>●●●●● 5G ▮▮▮</span>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 18px',
            borderBottom: '1px solid #E8E5DD',
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'var(--deep-ocean)',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <AnchorMark size={18} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Ballast</div>
            <div
              style={{
                fontSize: 11,
                color: '#5FA7A0',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#5FA7A0' }} />
              Assistant online
            </div>
          </div>
          <div style={{ fontSize: 18, color: 'var(--slate)' }}>⋯</div>
        </div>
        <div
          style={{
            flex: 1,
            overflow: 'hidden',
            padding: '18px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          {step >= 1 && (
            <UserBubble text="I have €8,000 sitting in my savings account doing nothing. Help me put it into US stocks." />
          )}
          {step >= 2 && (
            <AgentMessage>
              <AgentTyped
                text="Got it. I'd anchor it across four US blue-chips — historically much higher long-term returns than a savings account."
                trigger={step >= 2}
              />
            </AgentMessage>
          )}
          {step >= 3 && <AgentPlanCard />}
          {step >= 4 && (
            <AgentMessage>
              <AgentTyped
                text="Confirm the plan and run it weekly on auto-pilot?"
                trigger={step >= 4}
              />
            </AgentMessage>
          )}
        </div>
        <div
          style={{
            padding: '12px 16px 18px',
            borderTop: '1px solid #E8E5DD',
            display: 'flex',
            gap: 10,
            alignItems: 'center',
          }}
        >
          <div
            style={{
              flex: 1,
              background: '#F0EEE8',
              borderRadius: 999,
              padding: '11px 18px',
              fontSize: 13,
              color: 'var(--slate)',
            }}
          >
            Type something...
          </div>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              background: 'var(--deep-ocean)',
              color: 'var(--gold)',
              display: 'grid',
              placeItems: 'center',
              fontSize: 16,
            }}
          >
            ↑
          </div>
        </div>
      </div>
    </div>
  );
}

function Conversation() {
  const [ref, inView] = useInView<HTMLElement>({ threshold: 0.25 });
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const timers = [
      setTimeout(() => setStep(1), 600),
      setTimeout(() => setStep(2), 3200),
      setTimeout(() => setStep(3), 6800),
      setTimeout(() => setStep(4), 9200),
    ];
    return () => timers.forEach(clearTimeout);
  }, [inView]);

  return (
    <section
      ref={ref}
      id="agent"
      style={{ position: 'relative', padding: '160px 40px', background: 'var(--deep-ocean)' }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '0.9fr 1.1fr',
            gap: 80,
            alignItems: 'center',
          }}
        >
          <div>
            <Divider label="02 · the conversation" />
            <h2
              className="display"
              style={{
                fontSize: 'clamp(38px, 4.4vw, 64px)',
                fontWeight: 300,
                lineHeight: 1.04,
                marginTop: 24,
                marginBottom: 22,
                letterSpacing: '-0.03em',
              }}
            >
              Speak the way you speak.
              <br />
              <span style={{ fontStyle: 'italic', color: 'var(--gold-soft)' }}>
                No forms. No jargon.
              </span>
            </h2>
            <p
              style={{
                color: 'rgba(246,245,242,0.7)',
                fontSize: 17,
                lineHeight: 1.6,
                maxWidth: 460,
              }}
            >
              Tell the agent what you want — in English, Spanish, German, or whatever comes
              naturally. It proposes a clear plan, explains the reasoning, and executes only when
              you say yes.
            </p>
            <div style={{ marginTop: 36, display: 'flex', flexDirection: 'column', gap: 18 }}>
              {(
                [
                  ['Understands intent', 'No rigid commands. Your goal, in your words.'],
                  ['Proposes, never imposes', 'Every plan with its rationale in one line.'],
                  ['Asks before acting', 'Nothing executes until you confirm.'],
                ] as const
              ).map(([t, d], i) => (
                <div key={t} style={{ display: 'flex', gap: 14 }}>
                  <div
                    className="mono"
                    style={{ color: 'var(--gold)', fontSize: 12, minWidth: 24 }}
                  >
                    0{i + 1}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--mist)' }}>{t}</div>
                    <div style={{ fontSize: 13.5, color: 'var(--slate)', marginTop: 2 }}>{d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <ChatPhone step={step} />
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────── PORTFOLIO PREVIEW ───────────────────────────

function ComparisonChart({ progress }: { progress: number }) {
  const months = ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May'];
  const ballastPoints = useMemo(() => {
    const pts: Array<[number, number]> = [];
    for (let i = 0; i < 12; i++) {
      const x = (i / 11) * 100;
      const base = 70 - i * 4.5 - Math.sin(i * 1.4) * 1.5;
      pts.push([x, base]);
    }
    return pts;
  }, []);
  const cashPoints = useMemo(() => {
    const pts: Array<[number, number]> = [];
    for (let i = 0; i < 12; i++) {
      const x = (i / 11) * 100;
      const base = 70 + i * 1.8 + Math.sin(i * 2.1) * 0.6;
      pts.push([x, base]);
    }
    return pts;
  }, []);

  const sliceAt = (arr: Array<[number, number]>) => {
    const cut = arr.length * progress;
    return arr.slice(0, Math.ceil(cut)).map((p) => p.join(',')).join(' ');
  };

  const idx = Math.max(0, Math.min(11, Math.ceil(progress * 11) - 1));
  const lastBallast = ballastPoints[idx]!;
  const lastCash = cashPoints[idx]!;

  return (
    <div style={{ position: 'relative', height: 280 }}>
      <svg viewBox="0 0 100 80" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
        {[0, 20, 40, 60, 80].map((y) => (
          <line
            key={y}
            x1="0"
            y1={y}
            x2="100"
            y2={y}
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="0.15"
          />
        ))}
        <polyline
          points={`0,80 ${sliceAt(cashPoints)} ${lastCash[0]},80`}
          fill="rgba(122,132,142,0.10)"
          stroke="none"
        />
        <polyline
          points={sliceAt(cashPoints)}
          fill="none"
          stroke="rgba(122,132,142,0.7)"
          strokeWidth="0.5"
          strokeDasharray="0.8 0.8"
        />
        <polyline
          points={`0,80 ${sliceAt(ballastPoints)} ${lastBallast[0]},80`}
          fill="rgba(214,179,106,0.12)"
          stroke="none"
        />
        <polyline points={sliceAt(ballastPoints)} fill="none" stroke="var(--gold)" strokeWidth="0.6" />
        {progress > 0.1 && (
          <circle cx={lastBallast[0]} cy={lastBallast[1]} r="0.9" fill="var(--gold)" />
        )}
      </svg>
      {progress >= 1 && (
        <>
          <div
            style={{
              position: 'absolute',
              right: -8,
              top: '8%',
              fontSize: 11,
              color: 'var(--gold)',
              fontFamily: 'var(--font-mono), ui-monospace, monospace',
              animation: 'fadeUp .5s ease-out',
            }}
          >
            +18.6%
          </div>
          <div
            style={{
              position: 'absolute',
              right: -8,
              top: '78%',
              fontSize: 11,
              color: 'var(--slate)',
              fontFamily: 'var(--font-mono), ui-monospace, monospace',
              animation: 'fadeUp .5s ease-out',
            }}
          >
            +1.5%
          </div>
        </>
      )}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 8,
          fontSize: 10,
          color: 'var(--slate)',
          fontFamily: 'var(--font-mono), ui-monospace, monospace',
        }}
      >
        {months.map((m) => (
          <span key={m}>{m}</span>
        ))}
      </div>
    </div>
  );
}

function PortfolioPreview() {
  const [ref, inView] = useInView<HTMLElement>({ threshold: 0.2 });
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 2400);
      setProgress(p);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView]);

  return (
    <section
      ref={ref}
      id="product"
      style={{
        position: 'relative',
        padding: '160px 40px',
        background: 'linear-gradient(180deg, var(--deep-ocean), #061726)',
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <Divider label="03 · the view" />
        <h2
          className="display"
          style={{
            fontSize: 'clamp(38px, 4.4vw, 64px)',
            fontWeight: 300,
            lineHeight: 1.04,
            marginTop: 24,
            marginBottom: 22,
            letterSpacing: '-0.03em',
            maxWidth: 900,
          }}
        >
          A dashboard that weighs what you hold —
          <span style={{ fontStyle: 'italic', color: 'var(--gold-soft)' }}> in your currency.</span>
        </h2>
        <p
          style={{ color: 'rgba(246,245,242,0.7)', fontSize: 17, lineHeight: 1.6, maxWidth: 620 }}
        >
          Your tokenized US stocks. Your total value. And the line that matters: how much you&apos;d
          have left it in your savings account instead.
        </p>

        <div
          style={{
            marginTop: 64,
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid var(--line)',
            borderRadius: 24,
            padding: 32,
            display: 'grid',
            gridTemplateColumns: '1fr 1.4fr',
            gap: 32,
            boxShadow: '0 30px 80px rgba(0,0,0,0.3)',
          }}
        >
          <div>
            <div
              className="mono"
              style={{
                fontSize: 11,
                color: 'var(--gold)',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
              }}
            >
              total value
            </div>
            <div
              className="display"
              style={{
                fontSize: 'clamp(34px, 3.4vw, 48px)',
                fontWeight: 300,
                marginTop: 6,
                letterSpacing: '-0.03em',
                color: 'var(--mist)',
                whiteSpace: 'nowrap',
              }}
            >
              {fmtEUR(24527)}
            </div>
            <div style={{ marginTop: 4, color: 'var(--teal)', fontSize: 14 }}>
              ↑ 18.6% &nbsp;<span style={{ color: 'var(--slate)' }}>all-time</span>
            </div>
            <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <StockChip ticker="AMZN" name="Amazon" weight={35} color="#5FA7A0" />
              <StockChip ticker="NFLX" name="Netflix" weight={25} color="#C09063" />
              <StockChip ticker="TSLA" name="Tesla" weight={20} color="#D6B36A" />
              <StockChip ticker="AMD" name="AMD" weight={12} color="#A8B8C5" />
              <StockChip ticker="PLTR" name="Palantir" weight={8} color="#E4C887" />
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <div
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: 'var(--gold)',
                    letterSpacing: '0.2em',
                    textTransform: 'uppercase',
                  }}
                >
                  your money vs. leaving it alone
                </div>
                <div style={{ fontSize: 13, color: 'var(--slate)', marginTop: 4 }}>
                  Past 12 months · EUR
                </div>
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

// ─────────────────────────── AUTONOMOUS (activity feed) ───────────────────────────

function ActivityFeedLanding({
  feed,
  tick,
}: {
  feed: Array<{ ticker: string; name: string; amount: number; color: string }>;
  tick: number;
}) {
  const items = useMemo(() => {
    // Deterministic pseudo-hash so SSR and client render identical output
    // (Math.random would mismatch and trigger a hydration error).
    const seed = (s: string) => {
      let h = 0;
      for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
      return (h.toString(16) + (h * 17 >>> 0).toString(16)).padStart(16, '0');
    };
    const arr = [];
    for (let i = 0; i < 5; i++) {
      const f = feed[(tick + i) % feed.length]!;
      const hash = seed(`${f.ticker}-${tick}-${i}`);
      arr.push({
        ...f,
        timeLabel:
          i === 0 ? '12 seconds ago' : i === 1 ? 'Monday 9:41' : `${i + 1} days ago`,
        txHash: `0x${hash.slice(0, 10)}…${hash.slice(-4)}`,
      });
    }
    return arr;
  }, [tick, feed]);

  return (
    <div
      style={{
        position: 'relative',
        background: 'rgba(8,24,38,0.4)',
        border: '1px solid var(--line)',
        borderRadius: 18,
        padding: 22,
        backdropFilter: 'blur(20px)',
        boxShadow: '0 30px 80px rgba(0,0,0,0.35)',
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
              color: 'var(--gold)',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
            }}
          >
            activity feed
          </span>
        </div>
        <span className="mono" style={{ fontSize: 11, color: 'var(--slate)' }}>
          chain · 46630
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map((item, i) => (
          <div
            key={`${item.ticker}-${tick}-${i}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '14px 16px',
              background: i === 0 ? 'rgba(214,179,106,0.06)' : 'rgba(255,255,255,0.02)',
              border: `1px solid ${i === 0 ? 'var(--line-strong)' : 'rgba(255,255,255,0.04)'}`,
              borderRadius: 12,
              animation: i === 0 ? 'fadeUp .5s ease-out' : undefined,
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: item.color,
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <StockIcon ticker={item.ticker} size={22} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, color: 'var(--mist)' }}>
                Auto-invest executed · <span style={{ color: 'var(--gold)' }}>{item.name}</span>
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--slate)',
                  marginTop: 2,
                  fontFamily: 'var(--font-mono), ui-monospace, monospace',
                }}
              >
                {fmtEUR(item.amount)} · {item.txHash}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: i === 0 ? 'var(--teal)' : 'var(--slate)' }}>
                {item.timeLabel}
              </div>
              {i === 0 && (
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
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--teal)' }} />
                  agent · no intervention
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      <div
        style={{
          marginTop: 16,
          paddingTop: 16,
          borderTop: '1px solid var(--line)',
          fontSize: 11,
          color: 'var(--slate)',
          textAlign: 'center',
          fontFamily: 'var(--font-mono), ui-monospace, monospace',
        }}
      >
        every action logged on-chain · auditable · irreversible
      </div>
    </div>
  );
}

function Autonomous() {
  const [ref, inView] = useInView<HTMLElement>({ threshold: 0.3 });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const iv = setInterval(() => setTick((t) => t + 1), 1800);
    return () => clearInterval(iv);
  }, [inView]);

  const feed = [
    { ticker: 'AMZN', name: 'Amazon', amount: 50, color: '#5FA7A0' },
    { ticker: 'NFLX', name: 'Netflix', amount: 50, color: '#C09063' },
    { ticker: 'TSLA', name: 'Tesla', amount: 50, color: '#D6B36A' },
    { ticker: 'AMD', name: 'AMD', amount: 50, color: '#A8B8C5' },
    { ticker: 'PLTR', name: 'Palantir', amount: 50, color: '#E4C887' },
  ];

  return (
    <section
      ref={ref}
      id="how"
      style={{
        position: 'relative',
        padding: '160px 40px',
        background: 'linear-gradient(180deg, #061726, #050f1a)',
        overflow: 'hidden',
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <Divider label="04 · the autopilot" />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.1fr 0.9fr',
            gap: 60,
            alignItems: 'start',
            marginTop: 24,
          }}
        >
          <div>
            <h2
              className="display"
              style={{
                fontSize: 'clamp(38px, 4.4vw, 64px)',
                fontWeight: 300,
                lineHeight: 1.04,
                marginTop: 0,
                marginBottom: 22,
                letterSpacing: '-0.03em',
              }}
            >
              Tell it <span style={{ fontStyle: 'italic', color: 'var(--gold-soft)' }}>once.</span>
              <br />
              It works forever.
            </h2>
            <p
              style={{
                color: 'rgba(246,245,242,0.7)',
                fontSize: 17,
                lineHeight: 1.6,
                maxWidth: 460,
              }}
            >
              &ldquo;Invest €250 every week.&rdquo; Done. The agent sets the plan, fires the
              transactions, and logs every move. See for yourself — it&apos;s executing right now.
            </p>
            <div
              style={{
                marginTop: 36,
                padding: 24,
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--line)',
                borderRadius: 16,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                <div
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: 'var(--gold)',
                    letterSpacing: '0.2em',
                    textTransform: 'uppercase',
                  }}
                >
                  active plan
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 11,
                    color: 'var(--teal)',
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: 'var(--teal)',
                      animation: 'pulse-gold 1.5s ease-in-out infinite',
                    }}
                  />
                  LIVE
                </div>
              </div>
              <div style={{ fontSize: 16, color: 'var(--mist)', lineHeight: 1.5 }}>
                Invest <span style={{ color: 'var(--gold)' }}>€250</span> every week · split across
                5 stocks · next execution in
                <span className="mono" style={{ color: 'var(--gold)' }}> 3d 14h</span>
              </div>
              <div style={{ marginTop: 18, display: 'flex', gap: 24, fontSize: 12 }}>
                <div>
                  <div style={{ color: 'var(--slate)' }}>Executions</div>
                  <div
                    className="display"
                    style={{ fontSize: 26, color: 'var(--mist)', fontWeight: 400 }}
                  >
                    34
                  </div>
                </div>
                <div>
                  <div style={{ color: 'var(--slate)' }}>Total invested</div>
                  <div
                    className="display"
                    style={{ fontSize: 26, color: 'var(--mist)', fontWeight: 400 }}
                  >
                    €8,500
                  </div>
                </div>
                <div>
                  <div style={{ color: 'var(--slate)' }}>On-chain</div>
                  <div
                    className="display"
                    style={{ fontSize: 26, color: 'var(--teal)', fontWeight: 400 }}
                  >
                    100%
                  </div>
                </div>
              </div>
            </div>
          </div>
          <ActivityFeedLanding feed={feed} tick={tick} />
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────── LIGHTHOUSE (closing CTA) ───────────────────────────

function Lighthouse() {
  return (
    <section
      id="security"
      style={{
        position: 'relative',
        padding: '140px 40px 100px',
        background: 'linear-gradient(180deg, #050f1a, var(--deep-ocean))',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: '60%',
          height: 1,
          background: 'linear-gradient(90deg, transparent, var(--line), transparent)',
        }}
      />
      <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 2 }}>
        <Divider label="05 · the lighthouse" />
        <div
          style={{
            marginTop: 28,
            display: 'grid',
            gridTemplateColumns: '1.1fr 0.9fr',
            gap: 60,
            alignItems: 'end',
          }}
        >
          <div>
            <h2
              className="display"
              style={{
                fontSize: 'clamp(48px, 6vw, 96px)',
                fontWeight: 300,
                lineHeight: 0.98,
                letterSpacing: '-0.04em',
                margin: 0,
              }}
            >
              When the seas
              <br />
              turn rough,
              <br />
              <span style={{ fontStyle: 'italic', color: 'var(--gold-soft)' }}>you have a harbor.</span>
            </h2>
            <div
              style={{
                marginTop: 48,
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 24,
                maxWidth: 540,
              }}
            >
              {(
                [
                  ['Self-custody', 'You hold the keys. No one else can move your money.'],
                  ['100% on-chain', 'Every action recorded on Robinhood Chain. Auditable.'],
                  ['No custodian', "Ballast never touches your funds. It only executes what you sign."],
                  ['Educational', 'Ask the agent what any term means. No tricks.'],
                ] as const
              ).map(([t, d]) => (
                <div key={t}>
                  <div
                    style={{ fontWeight: 600, fontSize: 14.5, color: 'var(--gold)', marginBottom: 6 }}
                  >
                    {t}
                  </div>
                  <div
                    style={{ fontSize: 13.5, color: 'rgba(246,245,242,0.7)', lineHeight: 1.55 }}
                  >
                    {d}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ position: 'relative', height: 500 }}>
            <div
              style={{
                width: '100%',
                height: '100%',
                borderRadius: 18,
                background:
                  'radial-gradient(circle at 70% 30%, rgba(214,179,106,0.30), transparent 55%), linear-gradient(180deg, rgba(8,24,38,0.5), rgba(8,24,38,0.95))',
                border: '1px solid var(--line-strong)',
                display: 'grid',
                placeItems: 'center',
                color: 'var(--gold-soft)',
                fontFamily: 'var(--font-mono), ui-monospace, monospace',
                fontSize: 11,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                opacity: 0.55,
              }}
            >
              ⛯ lighthouse · steady beam
            </div>
            <div
              style={{
                position: 'absolute',
                bottom: 28,
                left: 28,
                background: 'rgba(8,24,38,0.92)',
                backdropFilter: 'blur(20px)',
                border: '1px solid var(--line-strong)',
                borderRadius: 12,
                padding: '14px 18px',
              }}
            >
              <div
                className="mono"
                style={{ fontSize: 10, color: 'var(--gold)', letterSpacing: '0.18em' }}
              >
                ● STATUS
              </div>
              <div style={{ fontSize: 14, marginTop: 4, color: 'var(--mist)' }}>
                Contract verified · OZ audited
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 120,
            padding: '60px 48px',
            border: '1px solid var(--line-strong)',
            borderRadius: 24,
            background:
              'linear-gradient(135deg, rgba(214,179,106,0.06), rgba(95,167,160,0.04))',
            display: 'grid',
            gridTemplateColumns: '1fr auto',
            gap: 48,
            alignItems: 'center',
          }}
        >
          <div>
            <h3
              className="display"
              style={{
                fontSize: 'clamp(32px, 3.6vw, 52px)',
                fontWeight: 300,
                margin: 0,
                letterSpacing: '-0.03em',
                lineHeight: 1.05,
              }}
            >
              Start anchoring your future.
              <br />
              <span
                style={{ fontStyle: 'italic', color: 'var(--gold-soft)', fontSize: '0.7em' }}
              >
                No bank account. No paperwork. Five minutes.
              </span>
            </h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Link
              href="/onboarding"
              style={{
                ...primaryBtn,
                padding: '16px 28px',
                fontSize: 15,
                animation: 'glow 3s ease-in-out infinite',
              }}
            >
              Connect wallet
              <span style={{ marginLeft: 10 }}>→</span>
            </Link>
            <Link
              href="/chat"
              style={{
                fontSize: 12.5,
                color: 'var(--slate)',
                textAlign: 'center',
                textDecoration: 'none',
              }}
            >
              or try the demo without connecting
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────── FOOTER ───────────────────────────

function Footer() {
  return (
    <footer
      style={{
        padding: '80px 40px 40px',
        background: 'var(--deep-ocean)',
        borderTop: '1px solid var(--line)',
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr', gap: 48 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <AnchorMark size={28} />
              <span
                className="display"
                style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em' }}
              >
                Ballast
              </span>
            </div>
            <div
              style={{
                color: 'rgba(246,245,242,0.5)',
                fontSize: 13.5,
                maxWidth: 320,
                lineHeight: 1.55,
              }}
            >
              Stability in uncertain economies. An AI agent that anchors your savings in US
              blue-chip stocks — directly from your wallet.
            </div>
          </div>
          {(
            [
              ['Product', ['Chat', 'Portfolio', 'Auto-invest', 'Education']],
              ['Company', ['About', 'Manifesto', 'Press', 'Contact']],
              ['Resources', ['Documentation', 'Contract (explorer)', 'Security', 'Status']],
            ] as const
          ).map(([title, items]) => (
            <div key={title}>
              <div
                className="mono"
                style={{
                  fontSize: 11,
                  color: 'var(--gold)',
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  marginBottom: 16,
                }}
              >
                {title}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {items.map((it) => (
                  <a
                    key={it}
                    href="#"
                    style={{
                      color: 'rgba(246,245,242,0.65)',
                      fontSize: 13.5,
                      textDecoration: 'none',
                    }}
                  >
                    {it}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div
          style={{
            marginTop: 64,
            paddingTop: 28,
            borderTop: '1px solid var(--line)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 12,
            color: 'var(--slate)',
            fontFamily: 'var(--font-mono), ui-monospace, monospace',
          }}
        >
          <div>© 2026 BALLAST · DEPLOYED ON ROBINHOOD CHAIN · CHAIN ID 46630</div>
          <div style={{ display: 'flex', gap: 24 }}>
            <a href="#" style={{ color: 'var(--slate)', textDecoration: 'none' }}>
              TERMS
            </a>
            <a href="#" style={{ color: 'var(--slate)', textDecoration: 'none' }}>
              PRIVACY
            </a>
            <a href="#" style={{ color: 'var(--slate)', textDecoration: 'none' }}>
              DISCLAIMER
            </a>
          </div>
        </div>
        <div
          style={{
            marginTop: 32,
            padding: '14px 18px',
            background: 'rgba(214,179,106,0.04)',
            border: '1px solid var(--line)',
            borderRadius: 10,
            fontSize: 12,
            color: 'rgba(246,245,242,0.55)',
            lineHeight: 1.55,
          }}
        >
          <strong style={{ color: 'var(--gold)' }}>Disclaimer:</strong> Ballast is an educational
          and automation tool. It is not financial advice. Testnet assets are simulated; past
          results don&apos;t guarantee future returns. Tokenized stocks are not available to US
          residents.
        </div>
      </div>
    </footer>
  );
}

// ─────────────────────────── APP ───────────────────────────

export default function Landing() {
  return (
    <main>
      <Nav />
      <Hero />
      <Drift />
      <Conversation />
      <PortfolioPreview />
      <Autonomous />
      <Lighthouse />
      <Footer />
    </main>
  );
}
