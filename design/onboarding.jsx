/* Ballast onboarding — multi-step interactive flow */
const { useEffect, useState, useRef, useMemo } = React;

/* ---------- Anchor mark (same as landing) ---------- */
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

/* ---------- Background horizon ---------- */
function Horizon() {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', left: '50%', bottom: -200, transform: 'translateX(-50%)',
        width: 900, height: 900, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(228,200,135,0.10) 0%, rgba(228,200,135,0.04) 35%, transparent 65%)',
      }} />
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: '32%', height: 1,
        background: 'linear-gradient(90deg, transparent, rgba(214,179,106,0.25) 30%, rgba(214,179,106,0.25) 70%, transparent)',
      }} />
      {/* Wave lines */}
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          position: 'absolute', left: 0, right: 0, bottom: `${15 + i * 6}%`,
          height: 30, overflow: 'hidden',
        }}>
          <svg viewBox="0 0 1200 30" preserveAspectRatio="none"
               style={{ width: '200%', height: '100%',
                        animation: `drift ${22 + i * 6}s linear infinite`,
                        opacity: 0.25 - i * 0.06 }}>
            <path d={`M0,15 ${[...Array(40)].map((_, j) =>
              `Q ${j * 30 + 15},${15 + Math.sin(j + i) * (3 + i)} ${j * 30 + 30},15`).join(' ')}`}
              fill="none" stroke="rgba(95,167,160,0.5)" strokeWidth="1" />
          </svg>
        </div>
      ))}
    </div>
  );
}

/* ---------- Top bar with progress ---------- */
function TopBar({ step, total, onBack, onSkip }) {
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
      padding: '24px 32px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: step === 0 ? 0.3 : 1, transition: 'opacity .3s' }}>
        <button onClick={onBack} disabled={step === 0} style={{
          background: 'transparent', border: '1px solid var(--line)', borderRadius: 999,
          padding: '8px 14px', color: 'var(--mist)', fontSize: 13,
          opacity: step === 0 ? 0 : 1,
        }}>← Back</button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <AnchorMark size={18} />
        <span className="display" style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.02em' }}>Ballast</span>
        <div style={{ width: 1, height: 16, background: 'var(--line)', marginLeft: 8, marginRight: 8 }} />
        <div style={{ display: 'flex', gap: 6 }}>
          {Array.from({ length: total }).map((_, i) => (
            <div key={i} style={{
              width: i === step ? 20 : 6, height: 4, borderRadius: 2,
              background: i <= step ? 'var(--gold)' : 'rgba(214,179,106,0.2)',
              transition: 'all .4s ease',
            }} />
          ))}
        </div>
      </div>

      <div>
        {step < total - 1 && (
          <button onClick={onSkip} style={{
            background: 'transparent', border: 'none', color: 'var(--slate)', fontSize: 13,
          }}>Skip</button>
        )}
      </div>
    </div>
  );
}

/* ---------- Shared step shell ---------- */
function StepShell({ children, keyId }) {
  return (
    <div key={keyId} style={{
      width: '100%', maxWidth: 520, padding: '0 28px',
      animation: 'fadeUp .55s ease-out',
    }}>
      {children}
    </div>
  );
}

/* ---------- STEP 0 — Welcome ---------- */
function StepWelcome({ onNext }) {
  return (
    <StepShell keyId="welcome">
      <div style={{ marginBottom: 36, display: 'flex', justifyContent: 'center' }}>
        <div style={{
          width: 88, height: 88, borderRadius: 22,
          background: 'linear-gradient(180deg, var(--midnight), var(--deep-ocean))',
          border: '1px solid var(--line-strong)',
          display: 'grid', placeItems: 'center',
          boxShadow: '0 30px 80px rgba(0,0,0,0.4)',
          animation: 'glow 3s ease-in-out infinite',
        }}>
          <AnchorMark size={52} />
        </div>
      </div>

      <div className="mono" style={{
        textAlign: 'center', fontSize: 11, letterSpacing: '0.25em', color: 'var(--gold)',
        textTransform: 'uppercase', marginBottom: 18,
      }}>
        ◢ Welcome aboard
      </div>

      <h1 className="display" style={{
        fontSize: 'clamp(40px, 5.5vw, 68px)', fontWeight: 300, lineHeight: 1.0,
        margin: 0, textAlign: 'center', letterSpacing: '-0.04em',
      }}>
        Let's get your savings
        <br />
        <span style={{ fontStyle: 'italic', color: 'var(--gold)' }}>to safer waters.</span>
      </h1>

      <p style={{
        marginTop: 24, fontSize: 16.5, lineHeight: 1.55,
        color: 'rgba(246,245,242,0.7)', textAlign: 'center', maxWidth: 420, marginLeft: 'auto', marginRight: 'auto',
      }}>
        Four steps. Five minutes. After that, your money quietly works while you sleep.
      </p>

      <div style={{ marginTop: 48, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        <button onClick={onNext} style={primaryBtn}>
          Begin
          <span style={{ marginLeft: 10 }}>→</span>
        </button>
        <div style={{ fontSize: 11, color: 'var(--slate)', fontFamily: 'JetBrains Mono' }}>
          NO BANK ACCOUNT · NO PAPERWORK · NO EMAIL
        </div>
      </div>
    </StepShell>
  );
}

/* ---------- STEP 1 — Country picker ---------- */
const COUNTRIES = [
  { code: 'IE', name: 'Ireland',     flag: '🇮🇪', currency: 'EUR', narrative: 'access' },
  { code: 'DE', name: 'Germany',     flag: '🇩🇪', currency: 'EUR', narrative: 'access' },
  { code: 'ES', name: 'Spain',       flag: '🇪🇸', currency: 'EUR', narrative: 'access' },
  { code: 'FR', name: 'France',      flag: '🇫🇷', currency: 'EUR', narrative: 'access' },
  { code: 'IT', name: 'Italy',       flag: '🇮🇹', currency: 'EUR', narrative: 'access' },
  { code: 'PT', name: 'Portugal',    flag: '🇵🇹', currency: 'EUR', narrative: 'access' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱', currency: 'EUR', narrative: 'access' },
  { code: 'BE', name: 'Belgium',     flag: '🇧🇪', currency: 'EUR', narrative: 'access' },
  { code: 'AT', name: 'Austria',     flag: '🇦🇹', currency: 'EUR', narrative: 'access' },
  { code: 'GR', name: 'Greece',      flag: '🇬🇷', currency: 'EUR', narrative: 'access' },
  { code: 'FI', name: 'Finland',     flag: '🇫🇮', currency: 'EUR', narrative: 'access' },
  { code: 'PL', name: 'Poland',      flag: '🇵🇱', currency: 'PLN', narrative: 'access' },
];

function StepCountry({ onNext, selected, setSelected }) {
  const [query, setQuery] = useState('');
  const filtered = COUNTRIES.filter(c => c.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <StepShell keyId="country">
      <div className="mono" style={mutedLabel}>02 · YOUR LOCATION</div>
      <h2 className="display" style={stepTitle}>
        Where are you,
        <br />
        <span style={{ fontStyle: 'italic', color: 'var(--gold-soft)' }}>roughly?</span>
      </h2>
      <p style={stepBody}>
        We use this to show every value in your local currency — and to tailor what the
        agent says first. We never share it.
      </p>

      <div style={{ marginTop: 28 }}>
        <input
          type="text"
          placeholder="Search countries..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            width: '100%', padding: '14px 18px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--line)', borderRadius: 12,
            color: 'var(--mist)', fontSize: 14,
            outline: 'none', fontFamily: 'inherit',
          }}
        />
        <div style={{
          marginTop: 14,
          maxHeight: 280, overflowY: 'auto',
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
          padding: 2,
        }}>
          {filtered.map(c => (
            <button key={c.code}
              onClick={() => setSelected(c)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px',
                background: selected?.code === c.code ? 'rgba(214,179,106,0.12)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${selected?.code === c.code ? 'var(--gold)' : 'rgba(255,255,255,0.06)'}`,
                borderRadius: 10, color: 'var(--mist)',
                textAlign: 'left', fontSize: 14,
                transition: 'all .2s',
              }}>
              <span style={{ fontSize: 20 }}>{c.flag}</span>
              <span style={{ flex: 1 }}>{c.name}</span>
              <span className="mono" style={{ fontSize: 10, color: 'var(--slate)' }}>{c.currency}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 32, display: 'flex', justifyContent: 'center' }}>
        <button onClick={onNext} disabled={!selected} style={{
          ...primaryBtn,
          opacity: selected ? 1 : 0.4,
          pointerEvents: selected ? 'auto' : 'none',
        }}>
          Continue
          <span style={{ marginLeft: 10 }}>→</span>
        </button>
      </div>
    </StepShell>
  );
}

/* ---------- STEP 2 — Goals ---------- */
const GOALS = [
  { id: 'protect',  title: 'Protect my savings',     subtitle: "Move part of my cash into something that holds value over time." },
  { id: 'access',   title: 'Access US blue-chips',   subtitle: 'Own Tesla, Amazon, Microsoft directly — without a broker.' },
  { id: 'auto',     title: 'Invest on autopilot',    subtitle: "Set a recurring amount. Let the agent run it without me." },
  { id: 'learn',    title: 'Just exploring',         subtitle: "I'm curious. Walk me through it." },
];

function StepGoals({ onNext, goals, setGoals }) {
  const toggle = (id) => {
    setGoals(g => g.includes(id) ? g.filter(x => x !== id) : [...g, id]);
  };

  return (
    <StepShell keyId="goals">
      <div className="mono" style={mutedLabel}>03 · WHAT BRINGS YOU HERE</div>
      <h2 className="display" style={stepTitle}>
        What do you want
        <br />
        <span style={{ fontStyle: 'italic', color: 'var(--gold-soft)' }}>your money to do?</span>
      </h2>
      <p style={stepBody}>
        Pick whatever sounds like you. You can change this any time — and the agent will adapt.
      </p>

      <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {GOALS.map((g, i) => {
          const on = goals.includes(g.id);
          return (
            <button key={g.id} onClick={() => toggle(g.id)} style={{
              padding: '18px 20px',
              background: on ? 'rgba(214,179,106,0.08)' : 'rgba(255,255,255,0.02)',
              border: `1px solid ${on ? 'var(--gold)' : 'rgba(255,255,255,0.06)'}`,
              borderRadius: 14, textAlign: 'left',
              color: 'var(--mist)', display: 'flex', gap: 16, alignItems: 'flex-start',
              transition: 'all .2s',
            }}>
              <div style={{
                width: 22, height: 22, borderRadius: 7, flexShrink: 0,
                border: `1.5px solid ${on ? 'var(--gold)' : 'var(--slate)'}`,
                background: on ? 'var(--gold)' : 'transparent',
                display: 'grid', placeItems: 'center', marginTop: 2,
                color: 'var(--deep-ocean)', fontSize: 13, fontWeight: 700,
              }}>{on ? '✓' : ''}</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>{g.title}</div>
                <div style={{ fontSize: 13.5, color: 'var(--slate)', lineHeight: 1.5 }}>{g.subtitle}</div>
              </div>
            </button>
          );
        })}
      </div>

      <div style={{ marginTop: 32, display: 'flex', justifyContent: 'center' }}>
        <button onClick={onNext} disabled={goals.length === 0} style={{
          ...primaryBtn,
          opacity: goals.length > 0 ? 1 : 0.4,
          pointerEvents: goals.length > 0 ? 'auto' : 'none',
        }}>
          Continue
          <span style={{ marginLeft: 10 }}>→</span>
        </button>
      </div>
    </StepShell>
  );
}

/* ---------- STEP 3 — Connect wallet ---------- */
const WALLETS = [
  { id: 'metamask',  name: 'MetaMask',         hint: 'Most popular browser wallet', glyph: '🦊', recommended: true  },
  { id: 'wc',        name: 'WalletConnect',    hint: 'Scan to connect any wallet',  glyph: '◇',  recommended: false },
  { id: 'coinbase',  name: 'Coinbase Wallet',  hint: 'For Coinbase users',          glyph: '◯',  recommended: false },
  { id: 'rabby',     name: 'Rabby',            hint: 'Power-user choice',           glyph: '◐',  recommended: false },
];

function StepWallet({ onNext, wallet, setWallet }) {
  return (
    <StepShell keyId="wallet">
      <div className="mono" style={mutedLabel}>04 · CONNECT YOUR WALLET</div>
      <h2 className="display" style={stepTitle}>
        Your keys.
        <br />
        <span style={{ fontStyle: 'italic', color: 'var(--gold-soft)' }}>Your money.</span>
      </h2>
      <p style={stepBody}>
        Ballast never holds your funds. The agent only executes what you sign from your own wallet.
        Don't have one? <a href="#" style={linkS}>Set one up in 2 minutes →</a>
      </p>

      <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {WALLETS.map(w => {
          const on = wallet === w.id;
          return (
            <button key={w.id} onClick={() => setWallet(w.id)} style={{
              padding: '16px 18px',
              background: on ? 'rgba(214,179,106,0.08)' : 'rgba(255,255,255,0.02)',
              border: `1px solid ${on ? 'var(--gold)' : 'rgba(255,255,255,0.06)'}`,
              borderRadius: 14, textAlign: 'left',
              color: 'var(--mist)', display: 'flex', gap: 16, alignItems: 'center',
              transition: 'all .2s',
            }}>
              <div style={{
                width: 42, height: 42, borderRadius: 10, fontSize: 22,
                background: 'rgba(255,255,255,0.04)',
                display: 'grid', placeItems: 'center',
              }}>{w.glyph}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14.5, display: 'flex', alignItems: 'center', gap: 8 }}>
                  {w.name}
                  {w.recommended && (
                    <span className="mono" style={{
                      fontSize: 9.5, padding: '2px 6px', borderRadius: 4,
                      background: 'rgba(214,179,106,0.2)', color: 'var(--gold)',
                      letterSpacing: '0.1em',
                    }}>RECOMMENDED</span>
                  )}
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--slate)', marginTop: 2 }}>{w.hint}</div>
              </div>
              <div style={{ color: on ? 'var(--gold)' : 'var(--slate)', fontSize: 18 }}>
                {on ? '●' : '○'}
              </div>
            </button>
          );
        })}
      </div>

      <div style={{
        marginTop: 22, padding: '12px 16px',
        background: 'rgba(95,167,160,0.06)',
        border: '1px solid rgba(95,167,160,0.18)',
        borderRadius: 10, fontSize: 12, color: 'rgba(246,245,242,0.75)', lineHeight: 1.5,
      }}>
        <strong style={{ color: 'var(--teal)' }}>🛡  Self-custody:</strong> Ballast cannot move your funds without your signature.
        Your keys never leave your wallet.
      </div>

      <div style={{ marginTop: 28, display: 'flex', justifyContent: 'center' }}>
        <button onClick={onNext} disabled={!wallet} style={{
          ...primaryBtn,
          opacity: wallet ? 1 : 0.4,
          pointerEvents: wallet ? 'auto' : 'none',
        }}>
          Connect
          <span style={{ marginLeft: 10 }}>→</span>
        </button>
      </div>
    </StepShell>
  );
}

/* ---------- STEP 4 — Connecting animation ---------- */
function StepConnecting({ onNext, wallet }) {
  const w = WALLETS.find(x => x.id === wallet) || WALLETS[0];
  const [phase, setPhase] = useState(0);
  // phases: 0 = handshake, 1 = network check, 2 = signed
  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 1400);
    const t2 = setTimeout(() => setPhase(2), 2800);
    const t3 = setTimeout(() => onNext(), 3800);
    return () => [t1, t2, t3].forEach(clearTimeout);
  }, []);

  const steps = [
    'Opening wallet handshake',
    'Verifying Robinhood Chain network (46630)',
    'Reading wallet address (read-only)',
  ];

  return (
    <StepShell keyId="connecting">
      <div className="mono" style={mutedLabel}>04 · CONNECTING</div>
      <h2 className="display" style={stepTitle}>
        Saying hello to
        <br />
        <span style={{ fontStyle: 'italic', color: 'var(--gold-soft)' }}>your wallet.</span>
      </h2>

      <div style={{ marginTop: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 32 }}>
        {/* Ballast */}
        <div style={{
          width: 84, height: 84, borderRadius: 20,
          background: 'linear-gradient(180deg, var(--midnight), var(--deep-ocean))',
          border: '1px solid var(--line-strong)',
          display: 'grid', placeItems: 'center',
          boxShadow: '0 0 60px rgba(214,179,106,0.2)',
        }}>
          <AnchorMark size={42} />
        </div>

        {/* Animated dots between */}
        <div style={{ display: 'flex', gap: 6 }}>
          {[0,1,2].map(i => (
            <div key={i} style={{
              width: 8, height: 8, borderRadius: '50%',
              background: 'var(--gold)',
              animation: `pulse-gold 1.2s ease-in-out infinite ${i * 0.2}s`,
            }} />
          ))}
        </div>

        {/* Wallet */}
        <div style={{
          width: 84, height: 84, borderRadius: 20,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          display: 'grid', placeItems: 'center',
          fontSize: 40,
        }}>{w.glyph}</div>
      </div>

      <div style={{ marginTop: 48, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {steps.map((s, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '12px 18px',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid var(--line)', borderRadius: 10,
            opacity: phase >= i ? 1 : 0.3,
            transition: 'opacity .4s',
          }}>
            <div style={{ width: 18, height: 18, display: 'grid', placeItems: 'center' }}>
              {phase > i ? (
                <span style={{ color: 'var(--teal)', fontSize: 16 }}>✓</span>
              ) : phase === i ? (
                <div style={{
                  width: 14, height: 14, borderRadius: '50%',
                  border: '2px solid rgba(214,179,106,0.3)',
                  borderTopColor: 'var(--gold)',
                  animation: 'spin 0.8s linear infinite',
                }} />
              ) : (
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
              )}
            </div>
            <div style={{ fontSize: 13.5, color: phase >= i ? 'var(--mist)' : 'var(--slate)' }}>{s}</div>
          </div>
        ))}
      </div>
    </StepShell>
  );
}

/* ---------- STEP 5 — Welcome aboard / handoff ---------- */
function StepDone({ country, goals, wallet, onChat }) {
  const w = WALLETS.find(x => x.id === wallet);
  return (
    <StepShell keyId="done">
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
        <div style={{
          width: 84, height: 84, borderRadius: 22,
          background: 'rgba(95,167,160,0.12)',
          border: '1px solid var(--teal)',
          display: 'grid', placeItems: 'center',
          color: 'var(--teal)', fontSize: 38, fontWeight: 600,
          animation: 'fadeUp .8s ease-out',
        }}>✓</div>
      </div>

      <div className="mono" style={{ ...mutedLabel, textAlign: 'center' }}>YOU'RE ANCHORED</div>
      <h2 className="display" style={{ ...stepTitle, textAlign: 'center' }}>
        Welcome aboard,
        <br />
        <span style={{ fontStyle: 'italic', color: 'var(--gold-soft)' }}>navigator.</span>
      </h2>
      <p style={{ ...stepBody, textAlign: 'center' }}>
        Everything's set. The agent is ready to talk whenever you are.
      </p>

      {/* Summary card */}
      <div style={{
        marginTop: 30, padding: 20,
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid var(--line)', borderRadius: 14,
      }}>
        <SummaryRow label="Region" value={country ? `${country.flag} ${country.name}` : '—'} />
        <SummaryRow label="Currency" value={country?.currency || 'EUR'} />
        <SummaryRow label="Wallet" value={w ? `${w.glyph}  ${w.name}` : '—'} />
        <SummaryRow label="Address" value="0x4a2b…8f93" mono />
        <SummaryRow label="Network" value="Robinhood Chain · 46630" mono last />
      </div>

      <div style={{ marginTop: 30, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
        <button onClick={onChat} style={{ ...primaryBtn, animation: 'glow 3s ease-in-out infinite' }}>
          Start your first conversation
          <span style={{ marginLeft: 10 }}>→</span>
        </button>
        <a href="#" style={{ fontSize: 12.5, color: 'var(--slate)', textDecoration: 'none' }}>
          Get testnet tokens (faucet) ↗
        </a>
      </div>
    </StepShell>
  );
}

function SummaryRow({ label, value, mono, last }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '10px 0',
      borderBottom: last ? 'none' : '1px solid rgba(255,255,255,0.04)',
    }}>
      <span style={{ fontSize: 12.5, color: 'var(--slate)' }}>{label}</span>
      <span style={{
        fontSize: 13.5, color: 'var(--mist)',
        fontFamily: mono ? 'JetBrains Mono' : 'inherit',
      }}>{value}</span>
    </div>
  );
}

/* ---------- Shared styles ---------- */
const stepTitle = {
  fontSize: 'clamp(36px, 5vw, 56px)',
  fontWeight: 300, lineHeight: 1.02, letterSpacing: '-0.035em',
  margin: '8px 0 18px',
};
const stepBody = {
  fontSize: 16, lineHeight: 1.55,
  color: 'rgba(246,245,242,0.7)',
};
const mutedLabel = {
  fontSize: 11, letterSpacing: '0.22em', color: 'var(--gold)',
  textTransform: 'uppercase', marginBottom: 4,
};
const primaryBtn = {
  background: 'var(--gold)', color: 'var(--deep-ocean)',
  border: 'none', borderRadius: 999, padding: '14px 28px',
  fontSize: 14.5, fontWeight: 600, display: 'inline-flex', alignItems: 'center',
  fontFamily: 'inherit',
};
const linkS = {
  color: 'var(--gold)', textDecoration: 'none', borderBottom: '1px solid var(--line-strong)',
};

/* ---------- App ---------- */
function App() {
  const [step, setStep] = useState(0);
  const [country, setCountry] = useState(null);
  const [goals, setGoals] = useState([]);
  const [wallet, setWallet] = useState(null);

  const TOTAL = 5;  // welcome, country, goals, wallet/connecting, done
  // (Connecting screen counts within the wallet step visually)

  const next = () => setStep(s => Math.min(s + 1, 5));
  const back = () => setStep(s => Math.max(s - 1, 0));
  const skip = () => setStep(s => Math.min(s + 1, 5));

  const goChat = () => {
    window.location.href = 'chat.html';
  };

  // map sub-steps -> top-bar progress dots
  // step 0 -> dot 0 (welcome)
  // step 1 -> dot 1 (country)
  // step 2 -> dot 2 (goals)
  // step 3 -> dot 3 (wallet picker)
  // step 4 -> dot 3 (connecting, same as wallet)
  // step 5 -> dot 4 (done)
  const progressStep = step <= 3 ? step : step === 4 ? 3 : 4;

  return (
    <>
      <Horizon />
      <TopBar step={progressStep} total={TOTAL} onBack={back} onSkip={skip} />

      <main style={{
        minHeight: '100vh', position: 'relative', zIndex: 1,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '100px 0 80px',
      }}>
        {step === 0 && <StepWelcome onNext={next} />}
        {step === 1 && <StepCountry onNext={next} selected={country} setSelected={setCountry} />}
        {step === 2 && <StepGoals onNext={next} goals={goals} setGoals={setGoals} />}
        {step === 3 && <StepWallet onNext={next} wallet={wallet} setWallet={setWallet} />}
        {step === 4 && <StepConnecting onNext={next} wallet={wallet} />}
        {step === 5 && <StepDone country={country} goals={goals} wallet={wallet} onChat={goChat} />}
      </main>

      {/* Footer disclaimer */}
      <div style={{
        position: 'fixed', bottom: 18, left: 0, right: 0, zIndex: 10,
        textAlign: 'center', fontSize: 11, color: 'var(--slate)',
        fontFamily: 'JetBrains Mono', letterSpacing: '0.1em',
        pointerEvents: 'none',
      }}>
        TESTNET · ROBINHOOD CHAIN · EDUCATIONAL TOOL — NOT FINANCIAL ADVICE
      </div>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
