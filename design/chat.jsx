/* Ballast Chat — interactive prototype of the core conversation */
const { useEffect, useState, useRef, useMemo } = React;
const { AnchorMark, fmtEUR, useTypewriter, AgentAvatar, UserAvatar,
        AgentMessage, UserMessage, StreamingText, InlineStat,
        PlanCard, ExecutionCard, AutopilotCard, ChipRow, Thinking } = window;

/* ---------- Sample data ---------- */
const PROPOSED_HOLDINGS = [
  { ticker: 'AAPL', name: 'Apple',     pct: 35, color: '#E4C887',
    why: 'Largest cap · steady cash flow' },
  { ticker: 'MSFT', name: 'Microsoft', pct: 25, color: '#A8B8C5',
    why: 'Cloud + AI growth, lower volatility' },
  { ticker: 'AMZN', name: 'Amazon',    pct: 20, color: '#5FA7A0',
    why: 'Diversified retail + AWS' },
  { ticker: 'NFLX', name: 'Netflix',   pct: 12, color: '#C09063',
    why: 'Steady subscription revenue' },
  { ticker: 'TSLA', name: 'Tesla',     pct: 8,  color: '#D6B36A',
    why: 'Smaller — higher beta exposure' },
];

const RATIONALE = "Heavy on Apple and Microsoft because they're the steadiest of the bunch — lower volatility, big cash piles. Amazon adds breadth across retail + AWS. Netflix and a smaller Tesla bring growth without dominating the basket. You can change any of these.";

/* =================================================================
   TOP BAR
   ================================================================= */
function TopBar() {
  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 30,
      padding: '16px 32px',
      borderBottom: '1px solid var(--line)',
      background: 'rgba(8,24,38,0.85)',
      backdropFilter: 'blur(16px) saturate(120%)',
      display: 'flex', alignItems: 'center', gap: 28,
    }}>
      <a href="dashboard.html" style={{
        display: 'flex', alignItems: 'center', gap: 10,
        color: 'var(--mist)', textDecoration: 'none',
      }}>
        <AnchorMark size={22} />
        <span className="display" style={{ fontWeight: 700, fontSize: 19, letterSpacing: '-0.02em' }}>Ballast</span>
      </a>

      <nav style={{ display: 'flex', gap: 6, marginLeft: 16 }}>
        {[
          ['Chat',     'chat.html',      true],
          ['Portfolio','dashboard.html', false],
          ['Activity', '#',              false],
          ['Settings', '#',              false],
        ].map(([t, href, active]) => (
          <a key={t} href={href} style={{
            background: active ? 'rgba(214,179,106,0.10)' : 'transparent',
            color: active ? 'var(--gold)' : 'rgba(246,245,242,0.7)',
            padding: '8px 16px', borderRadius: 8,
            fontSize: 13.5, fontWeight: active ? 600 : 500,
            textDecoration: 'none',
          }}>{t}</a>
        ))}
      </nav>

      <div style={{ flex: 1 }} />

      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 14px 8px 8px',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid var(--line)',
        borderRadius: 999, color: 'var(--mist)', fontSize: 13,
      }}>
        <span style={{
          width: 26, height: 26, borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--gold), var(--teal))',
        }}></span>
        <span className="mono" style={{ fontSize: 12 }}>0x4a2b…8f93</span>
      </div>
    </header>
  );
}

/* =================================================================
   SIDE RAIL — conversation history + suggested
   ================================================================= */
function SideRail({ portfolio }) {
  return (
    <aside style={{
      padding: '32px 24px',
      borderRight: '1px solid var(--line)',
      display: 'flex', flexDirection: 'column', gap: 28,
      background: 'rgba(8,24,38,0.4)',
    }}>
      <div>
        <div className="mono" style={{ fontSize: 10.5, letterSpacing: '0.22em',
                                        color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 10 }}>
          conversation
        </div>
        <button style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 12px',
          background: 'var(--gold)', color: 'var(--deep-ocean)',
          border: 'none', borderRadius: 10,
          fontSize: 13, fontWeight: 600,
        }}>+ New conversation</button>

        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {[
            { title: 'Protect my savings', when: 'Now', active: true },
            { title: 'What is a stable currency?', when: 'Mon' },
            { title: 'Set up weekly DCA', when: '13 May' },
            { title: 'Why Apple over Google?', when: '02 May' },
          ].map((c, i) => (
            <a key={i} href="#" style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 12px', borderRadius: 8,
              background: c.active ? 'rgba(214,179,106,0.06)' : 'transparent',
              border: c.active ? '1px solid var(--line)' : '1px solid transparent',
              color: c.active ? 'var(--mist)' : 'rgba(246,245,242,0.7)',
              fontSize: 13, textDecoration: 'none',
            }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis',
                             whiteSpace: 'nowrap', maxWidth: 180 }}>{c.title}</span>
              <span style={{ fontSize: 11, color: 'var(--slate)',
                             fontFamily: 'JetBrains Mono' }}>{c.when}</span>
            </a>
          ))}
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--line)', paddingTop: 24 }}>
        <div className="mono" style={{ fontSize: 10.5, letterSpacing: '0.22em',
                                        color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 10 }}>
          your context
        </div>
        <div style={{
          padding: 14,
          background: 'rgba(255,255,255,0.025)',
          border: '1px solid var(--card-border)',
          borderRadius: 10,
        }}>
          <div style={{ fontSize: 11, color: 'var(--slate)' }}>Total portfolio</div>
          <div className="display" style={{ fontSize: 22, fontWeight: 500, color: 'var(--mist)',
                                             marginTop: 2, lineHeight: 1 }}>
            {fmtEUR(portfolio.total)}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--teal)', marginTop: 4 }}>
            ↑ {fmtEUR(portfolio.total - 25000)} all-time
          </div>

          <div style={{
            marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--line)',
            display: 'flex', flexDirection: 'column', gap: 6,
          }}>
            <Row label="Cash to invest" value={fmtEUR(portfolio.cash)} />
            <Row label="In stocks" value={fmtEUR(portfolio.total - portfolio.cash)} />
            <Row label="Autopilot" value={portfolio.autopilot} accent={portfolio.autopilot === 'Active' ? 'var(--teal)' : 'var(--slate)'} />
          </div>
        </div>

        <a href="dashboard.html" style={{
          marginTop: 10, display: 'block', textAlign: 'center',
          fontSize: 12, color: 'var(--slate)', textDecoration: 'none',
        }}>Open full dashboard →</a>
      </div>

      <div style={{ marginTop: 'auto', fontSize: 10.5, color: 'var(--slate)',
                    fontFamily: 'JetBrains Mono', letterSpacing: '0.1em', textAlign: 'center', lineHeight: 1.6 }}>
        Ballast is an educational<br />
        and automation tool.<br />
        Not financial advice.
      </div>
    </aside>
  );
}

function Row({ label, value, accent = 'var(--mist)' }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
      <span style={{ color: 'var(--slate)' }}>{label}</span>
      <span style={{ color: accent, fontWeight: 500 }}>{value}</span>
    </div>
  );
}

/* =================================================================
   CHAT INPUT
   ================================================================= */
function ChatInput({ onSend, suggestions, disabled }) {
  const [text, setText] = useState('');
  const submit = () => {
    if (!text.trim() || disabled) return;
    onSend(text.trim());
    setText('');
  };
  return (
    <div style={{
      position: 'sticky', bottom: 0,
      padding: '16px 0 24px',
      background: 'linear-gradient(180deg, transparent, var(--deep-ocean) 30%)',
    }}>
      {suggestions && suggestions.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          {suggestions.map((s, i) => (
            <button key={i} onClick={() => onSend(s)} style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--line)',
              color: 'rgba(246,245,242,0.85)', borderRadius: 999,
              padding: '7px 14px', fontSize: 12.5,
            }}>{s}</button>
          ))}
        </div>
      )}

      <div style={{
        display: 'flex', alignItems: 'flex-end', gap: 10,
        padding: '14px 16px',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid var(--line)',
        borderRadius: 16,
      }}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
          }}
          placeholder={disabled ? "Agent is working..." : "Ask anything · type to direct the agent..."}
          disabled={disabled}
          rows={1}
          style={{
            flex: 1, resize: 'none',
            background: 'transparent', border: 'none', outline: 'none',
            color: 'var(--mist)', fontFamily: 'inherit', fontSize: 14,
            lineHeight: 1.5, maxHeight: 120,
            opacity: disabled ? 0.5 : 1,
          }}
        />
        <button onClick={submit} disabled={!text.trim() || disabled} style={{
          width: 38, height: 38, borderRadius: 10,
          background: text.trim() && !disabled ? 'var(--gold)' : 'rgba(255,255,255,0.06)',
          color: text.trim() && !disabled ? 'var(--deep-ocean)' : 'var(--slate)',
          border: 'none', fontSize: 18, fontWeight: 600,
          flexShrink: 0,
        }}>↑</button>
      </div>
      <div style={{ marginTop: 8, fontSize: 11, color: 'var(--slate)',
                    fontFamily: 'JetBrains Mono', letterSpacing: '0.1em', textAlign: 'center' }}>
        ENTER TO SEND · SHIFT+ENTER FOR NEW LINE · TESTNET · CLAUDE-SONNET-4-6
      </div>
    </div>
  );
}

/* =================================================================
   APP — conversation state machine
   ================================================================= */
function App() {
  // Each step in the canned conversation
  const [step, setStep] = useState(0);
  const [planConfirmed, setPlanConfirmed] = useState(false);
  const [autopilotConfirmed, setAutopilotConfirmed] = useState(false);
  const [portfolio, setPortfolio] = useState({
    total: 24527, cash: 4527, autopilot: 'Off',
  });
  const scrollRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [step, planConfirmed, autopilotConfirmed]);

  // Sequence handler
  const advance = (to) => setStep(to);

  // Free-form user input handler
  const handleSend = (msg) => {
    if (step === 0 || step === 1) {
      advance(2); // jump to "user wants to invest"
    } else if (step === 6) {
      advance(7);  // user typed something instead of chip
    } else if (step === 10) {
      advance(11);
    }
  };

  // Suggestions for the input bar
  const suggestions = useMemo(() => {
    if (step === 0) return ['Protect my €5,000', 'How does Ballast work?', "What's a tokenized stock?"];
    if (step === 6) return ['Yes, every week', 'Just this once', 'Maybe later'];
    if (step === 10) return ['Open my dashboard', 'Ask another question'];
    return [];
  }, [step]);

  return (
    <>
      <TopBar />

      <div style={{
        display: 'grid',
        gridTemplateColumns: '300px minmax(0, 1fr)',
        minHeight: 'calc(100vh - 60px)',
      }}>
        <SideRail portfolio={portfolio} />

        {/* Chat column */}
        <main ref={scrollRef} style={{
          maxHeight: 'calc(100vh - 60px)',
          overflowY: 'auto',
          padding: '32px 0 0',
        }}>
          <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 32px' }}>

            {/* Conversation start banner */}
            <div style={{
              textAlign: 'center', marginBottom: 36,
              fontSize: 11, color: 'var(--slate)',
              fontFamily: 'JetBrains Mono', letterSpacing: '0.18em',
              textTransform: 'uppercase',
            }}>
              ─── 24 May 2026 · 09:41 · DUBLIN ───
            </div>

            {/* MESSAGE 1 — Agent greeting */}
            <AgentMessage>
              <StreamingText text="Welcome back, Lucía. Markets opened twenty minutes ago. Your portfolio is up €312 this week — nothing to worry about. What's on your mind today?" onDone={() => step === 0 && advance(1)} />
            </AgentMessage>

            {step >= 1 && step < 2 && (
              <ChipRow chips={[
                { label: 'Protect my €5,000',           id: 'protect' },
                { label: 'How does Ballast work?',      id: 'how' },
                { label: "What's a tokenized stock?",   id: 'what' },
              ]} onPick={(c) => advance(2)} />
            )}

            {/* MESSAGE 2 — User */}
            {step >= 2 && (
              <UserMessage text="I have €5,000 just sitting in my account. I want it to do something. What would you do?" />
            )}

            {/* MESSAGE 3 — Agent thinking + response */}
            {step >= 2 && step < 3 && <Thinking />}
            {step >= 2 && (
              <AgentMessage>
                <StreamingText
                  speed={12}
                  text="Good question. €5,000 in a typical EU savings account earns about €75 a year. The same amount in a balanced US blue-chip basket has averaged around €525 a year over the last decade — about seven times more. Past returns aren't guarantees, but the gap is real."
                  onDone={() => step === 2 && advance(3)}
                />
                {step >= 3 && (
                  <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 0 }}>
                    <InlineStat label="Savings account" primary="€75/yr" secondary="1.5% APY · ~€10k EU avg" accent="var(--slate)" />
                    <InlineStat label="US blue-chips" primary="€525/yr" secondary="10.5% S&P 500 long-term avg" accent="var(--gold)" />
                  </div>
                )}
              </AgentMessage>
            )}

            {/* MESSAGE 4 — Agent: here's a plan */}
            {step >= 3 && (
              <AgentMessage>
                <StreamingText
                  speed={12}
                  text="Here's what I'd anchor your €5,000 in. Conservative tilt — heavy on the steadiest names."
                  onDone={() => step === 3 && advance(4)}
                />
                {step >= 4 && (
                  <PlanCard
                    amount={5000}
                    holdings={PROPOSED_HOLDINGS}
                    rationale={RATIONALE}
                    confirmed={planConfirmed}
                    onConfirm={() => {
                      setPlanConfirmed(true);
                      setTimeout(() => advance(5), 600);
                    }}
                    onAdjust={() => advance(99)}  // would open adjustment UI
                  />
                )}
              </AgentMessage>
            )}

            {/* MESSAGE 5 — Execution */}
            {step >= 5 && (
              <AgentMessage>
                <StreamingText
                  speed={14}
                  text="Got it. Running on chain now."
                  onDone={() => {}}
                />
                <ExecutionCard done={false} />
              </AgentMessage>
            )}
            {step >= 5 && (
              <ExecutionWatcher onDone={() => {
                if (step === 5) {
                  setPortfolio(p => ({ ...p, total: p.total + 5000, cash: p.cash - 0 })); // visually bump total
                  advance(6);
                }
              }} />
            )}

            {/* MESSAGE 6 — Agent: anything else? autopilot? */}
            {step >= 6 && (
              <AgentMessage>
                <StreamingText
                  speed={12}
                  text="Done — €5,000 anchored. Your wallet now holds those tokens. Want me to keep adding small amounts on a schedule? Many people set €50–€200 a week and let it run."
                  onDone={() => {}}
                />
              </AgentMessage>
            )}
            {step >= 6 && step < 7 && (
              <ChipRow chips={[
                { label: 'Yes, €100 every Monday', id: 'yes100' },
                { label: 'Just this once',         id: 'no' },
                { label: 'How does autopilot work?', id: 'how-auto' },
              ]} onPick={(c) => {
                if (c.id === 'no') advance(10);
                else if (c.id === 'how-auto') advance(7); // for prototype, advance
                else advance(7);
              }} />
            )}

            {/* MESSAGE 7 — User: yes auto */}
            {step >= 7 && (
              <UserMessage text="Yes — let's do €100 every Monday." />
            )}

            {/* MESSAGE 8 — Agent: autopilot proposal */}
            {step >= 7 && (
              <AgentMessage>
                <StreamingText
                  speed={12}
                  text="Easy. Here's the plan — you can pause or stop it any time from your dashboard."
                  onDone={() => step === 7 && advance(8)}
                />
                {step >= 8 && (
                  <AutopilotCard
                    amount={100}
                    cadence="Monday"
                    confirmed={autopilotConfirmed}
                    onConfirm={() => {
                      setAutopilotConfirmed(true);
                      setPortfolio(p => ({ ...p, autopilot: 'Active' }));
                      setTimeout(() => advance(9), 800);
                    }}
                  />
                )}
              </AgentMessage>
            )}

            {/* MESSAGE 9 — Agent: confirmation + handoff */}
            {step >= 9 && (
              <AgentMessage>
                <StreamingText
                  speed={12}
                  text="Done. Next Monday at 9:41 I'll move the first €100 — and every Monday after. I'll log every execution to your activity feed so you can audit it any time. Anything else?"
                  onDone={() => step === 9 && advance(10)}
                />
              </AgentMessage>
            )}

            {step >= 10 && step < 11 && (
              <ChipRow chips={[
                { label: 'Open my dashboard',     id: 'dash' },
                { label: 'Show me my holdings',   id: 'holdings' },
                { label: 'What if I want to pause?', id: 'pause' },
              ]} onPick={(c) => {
                if (c.id === 'dash') window.location.href = 'dashboard.html';
                else advance(11);
              }} />
            )}

            {/* MESSAGE 11 — final */}
            {step >= 11 && (
              <AgentMessage>
                <StreamingText
                  speed={12}
                  text="Of course. You can pause or change the plan at any moment — open the dashboard and use the autopilot card. No penalties, no waiting period. Your money stays yours."
                />
              </AgentMessage>
            )}

            <div style={{ height: 40 }}></div>
          </div>

          {/* Input */}
          <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 32px' }}>
            <ChatInput onSend={handleSend} suggestions={suggestions} disabled={false} />
          </div>
        </main>
      </div>
    </>
  );
}

/* Helper: fires onDone after execution card finishes */
function ExecutionWatcher({ onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3600);
    return () => clearTimeout(t);
  }, []);
  return null;
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
