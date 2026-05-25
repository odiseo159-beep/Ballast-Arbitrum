/* Shared primitives — exported to window for landing.jsx */
const { useEffect, useState, useRef, useMemo } = React;

/* ---------- Anchor brand mark (simple geometric) ---------- */
function AnchorMark({ size = 28, color = "var(--gold)" }) {
  // Built from primitive shapes: circle (ring), rect (shank), arc path for fluke
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

/* ---------- Wave layer (sine path, animated) ---------- */
function WaveLayer({ amplitude = 6, speed = 18, opacity = 0.4, y = 0, color = "rgba(95,167,160,0.3)", stroke = false }) {
  // Build a wide repeating sine path
  const points = useMemo(() => {
    const w = 2400;
    const segs = 120;
    const pts = [];
    for (let i = 0; i <= segs; i++) {
      const x = (i / segs) * w;
      const yy = Math.sin((i / segs) * Math.PI * 8) * amplitude;
      pts.push(`${x.toFixed(1)},${yy.toFixed(1)}`);
    }
    return pts.join(' ');
  }, [amplitude]);

  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: y, height: amplitude * 2 + 4,
      overflow: 'hidden', pointerEvents: 'none',
    }}>
      <svg viewBox={`0 ${-amplitude - 2} 1200 ${amplitude * 2 + 4}`}
           preserveAspectRatio="none"
           style={{
             width: '200%', height: '100%',
             animation: `drift ${speed}s linear infinite`,
             opacity,
           }}>
        <polyline points={points}
                  fill="none"
                  stroke={color}
                  strokeWidth={stroke ? 1.2 : 1}
                  strokeLinecap="round" />
      </svg>
    </div>
  );
}

/* ---------- Type-on text (for chat) ---------- */
function useTypewriter(text, speed = 22, startDelay = 0, trigger = true) {
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
        }
      }, speed);
    }, startDelay);
    return () => clearTimeout(start);
  }, [text, trigger, speed, startDelay]);
  return [out, done];
}

/* ---------- Format helpers ---------- */
function fmtARS(n) {
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(Math.round(n));
}
function fmtEUR(n) {
  return new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Math.round(n));
}
function fmtUSD(n) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(n);
}

/* ---------- Counter that decays (peso losing value live) ---------- */
function useDecayingValue(initial, annualRate, timeMultiplier = 86400) {
  // annualRate is annualized loss (e.g. 0.211 = 21.1% per year).
  // timeMultiplier: simulated seconds per real second (default 86400 = 1 day/sec).
  const [val, setVal] = useState(initial);
  const startRef = useRef(performance.now());
  useEffect(() => {
    let raf;
    const perSecond = annualRate / (365.25 * 24 * 3600);
    const tick = (t) => {
      const dt = (t - startRef.current) / 1000;
      const simSecs = dt * timeMultiplier;
      const factor = Math.pow(1 - perSecond, simSecs);
      setVal(initial * factor);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [initial, annualRate, timeMultiplier]);
  return val;
}

/* ---------- Counter that grows (ballast steady appreciation) ---------- */
function useGrowingValue(initial, annualRate, timeMultiplier = 86400) {
  const [val, setVal] = useState(initial);
  const startRef = useRef(performance.now());
  useEffect(() => {
    let raf;
    const perSecond = annualRate / (365.25 * 24 * 3600);
    const tick = (t) => {
      const dt = (t - startRef.current) / 1000;
      const simSecs = dt * timeMultiplier;
      const factor = Math.pow(1 + perSecond, simSecs);
      setVal(initial * factor);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [initial, annualRate, timeMultiplier]);
  return val;
}

/* ---------- Intersection observer hook ---------- */
function useInView(opts = { threshold: 0.25 }) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) setInView(true);
    }, opts);
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  return [ref, inView];
}

/* ---------- Decorative divider with hash mark ---------- */
function Divider({ label }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 18,
      color: 'var(--gold)', fontFamily: 'JetBrains Mono', fontSize: 11,
      letterSpacing: '0.18em', textTransform: 'uppercase',
      opacity: 0.7,
    }}>
      <span style={{ height: 1, flex: '0 0 56px', background: 'var(--line-strong)' }}></span>
      <span>{label}</span>
      <span style={{ height: 1, flex: 1, background: 'var(--line)' }}></span>
    </div>
  );
}

/* ---------- Stock icon (text-based, no SVG illustrations) ---------- */
function StockChip({ ticker, name, weight, color }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 14px',
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 12,
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8,
        background: color,
        display: 'grid', placeItems: 'center',
        color: 'var(--deep-ocean)', fontWeight: 700, fontSize: 11,
        fontFamily: 'JetBrains Mono',
      }}>{ticker.slice(0, 4)}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 13 }}>{name}</div>
        <div style={{ fontSize: 11, color: 'var(--slate)' }}>{ticker}</div>
      </div>
      <div style={{
        fontFamily: 'JetBrains Mono', fontSize: 14, color: 'var(--gold)',
      }}>{weight}%</div>
    </div>
  );
}

Object.assign(window, {
  AnchorMark, WaveLayer, useTypewriter, useDecayingValue, useGrowingValue,
  useInView, fmtARS, fmtEUR, fmtUSD, Divider, StockChip,
});
