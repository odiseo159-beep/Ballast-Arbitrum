# Ballast — Product & Technical Spec

This is the deep reference. `CLAUDE.md` is the quick orientation; this document is where Claude Code looks up details when implementing a layer.

---

# Part 1 — Product

## 1.1 Problem

Two real, large, connected problems for retail investors **outside the US**:

- **Exclusion:** Buying US blue-chip equities from much of the world is hard — brokerage access, minimums, FX conversion, paperwork, and regulation create friction. Billions of people are effectively locked out of the best-performing equity market of the last century.
- **Devaluation:** In many economies (large parts of LATAM, Africa, Asia), the local currency loses value steadily. Savings held in local cash erode. People lack an easy, low-friction way to move into a hard store of value.

Tokenized US stocks on a self-custodial, 24/7, globally accessible chain solve both — *if* the experience is simple enough for non-crypto-natives. Today it is not. That gap is Ballast.

## 1.2 Why now / why this chain

Robinhood Chain is purpose-built for tokenized real-world assets, self-custody, and 24/7 access, with a mission to democratize global access to financial markets. Tokenized US stocks (TSLA, AMZN, PLTR, NFLX, AMD) are already live on its testnet. The missing piece is an interface a normal person can actually use. An AI agent is that interface.

## 1.3 Target users & framing logic

The agent adapts to the user's region:

- **High-inflation / unstable currency (e.g. Argentina, Nigeria, Turkey, etc.):** lead with the **hedge** narrative. "Your cash is losing ~X% a year. Here's how to anchor part of it in US blue chips."
- **Stable currency but limited access (e.g. much of Europe/Asia):** lead with **access & diversification**. "Own a slice of Amazon and Tesla directly, in minutes, from your wallet."

The agent asks the user's country early (or infers from locale) and frames all amounts in local currency.

## 1.4 Core demo loop (this is what the 3-minute video shows)

1. User connects wallet, opens chat. Agent greets, asks region/goal.
2. User (natural language): *"I have about 200 in savings and prices keep rising here. Help me protect it with US stocks."*
3. Agent interprets → proposes an allocation (e.g. 40% AMZN / 30% TSLA / 30% NFLX), explains *why* in plain language, shows it in the user's local currency.
4. User confirms. Agent executes on-chain via `AllocationDesk` → user's wallet now holds the stock tokens.
5. User: *"Do this every week automatically."* → Agent sets up an autonomous DCA plan.
6. **Time-skip in demo:** show the scheduler firing on its own and executing the next buy with NO user action — this is the agentic money shot.
7. Dashboard shows portfolio value in local currency + a "what your cash would have done vs. what Ballast did" comparison.

## 1.5 User stories

- As a non-US saver, I can describe my goal in my own words and get a concrete, explained plan.
- As a user, I can confirm and have the agent execute on-chain without me touching contract details.
- As a user, I can set "invest X every week/month" and the agent does it autonomously.
- As a user, I can see my holdings and their value in my local currency at any time.
- As a user, I can ask "what is a tokenized stock?" and get a clear, honest answer (educational layer).

---

# Part 2 — Technical

## 2.1 Layer 1 — `AllocationDesk` smart contract

**Purpose:** a minimal settlement desk. It is NOT a market maker and NOT a DEX. It holds reserves and settles allocations at a price provided by the trusted backend oracle (a testnet simplification, clearly documented).

**State:**
- `owner` / oracle signer (the backend). Use OpenZeppelin `Ownable` or a dedicated `oracle` role.
- `mapping(address => bool) supportedStock` — the 5 stock token addresses.
- `IERC20 usdg` — the stablecoin.
- `mapping(address => uint256) priceUsdgPerStock` — last price pushed by the oracle, scaled (document decimals clearly).

**Key external functions (sketch — Claude Code to finalize with NatSpec + custom errors):**

```solidity
// Oracle (backend) pushes latest prices. Testnet simplification.
function setPrices(address[] calldata stocks, uint256[] calldata prices) external onlyOracle;

// Core: user (or backend on user's behalf) allocates `usdgAmount` across stocks by weight.
// weightsBps must sum to 10_000. Pulls USDG from payer, transfers out stock tokens from reserve.
function execute(
    address beneficiary,
    uint256 usdgAmount,
    address[] calldata stocks,
    uint256[] calldata weightsBps
) external nonReentrant;

// User redeems stock tokens back to USDG at current oracle price.
function redeem(address stock, uint256 stockAmount) external nonReentrant;

// Admin reserve management (fund the desk from faucet holdings).
function depositReserve(address token, uint256 amount) external onlyOwner;
function withdrawReserve(address token, uint256 amount) external onlyOwner;

// Views
function quote(uint256 usdgAmount, address[] calldata stocks, uint256[] calldata weightsBps)
    external view returns (uint256[] memory stockAmountsOut);
```

**Security must-haves:** `SafeERC20` for all transfers, `ReentrancyGuard` on state-changing token functions, custom errors, checks that weights sum to 10_000, checks that stocks are supported, checks reserve sufficiency (revert clearly if the desk lacks tokens). Emit events (`Executed`, `Redeemed`, `PricesUpdated`) — the frontend and demo rely on them.

**Tests (Foundry):** happy-path execute, weight-sum validation, unsupported-stock revert, insufficient-reserve revert, reentrancy guard, redeem round-trip, only-oracle on setPrices.

**Decimals warning:** USDG and stock tokens may have different decimals. Read `decimals()` from each token; do not assume 18. Document the price scaling math explicitly.

## 2.2 Layer 2 — Agent backend

**Runtime:** Node/TypeScript service. Holds the backend signer (oracle + executor). Exposes an API the frontend calls (e.g. `/chat`, `/portfolio`, `/dca`).

**LLM:** Claude `claude-sonnet-4-6` via Anthropic API with tool-calling. Pull current tool-use syntax from https://docs.claude.com/en/docs/build-with-claude/tool-use — do not hardcode from memory.

**System prompt (intent):** "You are Ballast, a calm, trustworthy financial-automation assistant for people outside the US who want to protect savings and access US blue-chip stocks. You explain everything simply, in the user's local currency. You never give individualized financial advice or guarantees; you educate and automate the user's own stated intent. You always confirm before executing on-chain." Include a hard rule: surface a disclaimer, never promise returns.

**Tools the LLM can call:**
- `getUserContext()` → region, local currency, existing portfolio.
- `getPrices()` → current real US stock prices + FX rate (from an off-chain finance/FX API). Backend also pushes these on-chain via `setPrices`.
- `proposeAllocation(goal, amount, riskHint)` → returns a weighted basket + rationale (deterministic logic the LLM narrates; don't let the LLM invent numbers).
- `executeAllocation(usdgAmount, weights)` → calls the desk's `execute`, returns tx hash.
- `scheduleDCA(amount, cadence, weights)` → registers an autonomous recurring plan.
- `getPortfolio()` → holdings + value in local currency + vs-cash comparison.
- `explainConcept(topic)` → educational answers.

**Autonomous DCA scheduler:** a separate interval/cron worker in this service. On each tick it checks due plans and calls `executeAllocation` on its own — no user in the loop. This is the behavior that earns the "agentic" score, so make it visible (log it, surface it in the UI activity feed, and design the demo to show it firing).

**Oracle duty:** before each execute, backend fetches fresh prices and calls `setPrices` so the on-chain settlement matches real-world prices.

## 2.3 Layer 3 — Frontend

**Stack:** Next.js + React + Tailwind + viem/wagmi. Wallet connect for Robinhood Chain testnet (add network: chainId 46630, the RPC, explorer).

**Screens:**
- **Chat** — the primary surface. Streaming agent responses, confirm/execute buttons inline.
- **Dashboard** — holdings as cards (TSLA, AMZN, …), total value in local currency, the "your cash vs. Ballast" comparison chart, and an **activity feed** that shows autonomous DCA executions (proof of agency).
- **Onboarding** — pick country/currency, connect wallet, get testnet tokens (link the faucet).

**Local-currency layer:** everything the user sees is converted to their local currency using the FX rate. This is the emotional core; do not skip it.

**Disclaimer:** persistent, clear: educational/automation tool, testnet, not financial advice.

## 2.4 Data flow for one allocation

```
User types intent
  → Frontend POST /chat
    → Agent (LLM) interprets, calls getPrices + proposeAllocation
    → Agent returns proposal + rationale (in local currency)
  → User confirms in UI
    → Frontend POST /execute
      → Backend fetches fresh prices → setPrices() on AllocationDesk
      → Backend execute() on AllocationDesk (pulls USDG, sends stock tokens to user)
      → returns tx hash
  → Frontend shows confirmation + updates dashboard (reads holdings on-chain)
```

## 2.5 Risks & mitigations

- **Faucet limits / reserve runs dry** → request tokens early, keep allocation sizes small in the demo, add a clear revert + UI message.
- **No live price oracle** → backend is the oracle; document as testnet simplification (already designed for).
- **Token decimals mismatch** → read `decimals()` dynamically; unit-test the math.
- **Scope creep** → obey the guardrails in `CLAUDE.md`. Cut features, not the autonomous-DCA demo.
- **Addresses change on testnet** → keep them in one config file; re-verify against live docs at start of each week.
