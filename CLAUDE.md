# CLAUDE.md — Ballast

> This file is the master context for Claude Code. Read it fully before writing any code.
> Working project name: **Ballast** (placeholder — easy to rename later).
> Full details live in `docs/SPEC.md` and `docs/BUILD_PLAN.md`. Read those before starting a layer.

---

## What we are building (one paragraph)

Ballast is an **AI agent** that lets anyone *outside the United States* protect and grow their savings by moving them — through natural-language conversation — into a basket of **tokenized US blue-chip stocks** on **Robinhood Chain**. The user talks to the agent in plain language ("my savings are losing value to inflation, move 200 into a defensive US basket"); the agent interprets intent, proposes an allocation, explains it simply, and **executes it on-chain**. It then keeps working **autonomously**, making small recurring contributions (DCA) on a schedule without further prompting. Everything is framed in the user's **local currency** so the value is felt, not just stated.

This is a submission for the **Arbitrum Open House London Online Buildathon**. We are targeting the **Best Agentic Project** track and deploying on **Robinhood Chain** (where competition is structurally lower — see "Strategy" below).

---

## Who it is for (important — recently refined)

The target user is **global retail outside the US**, NOT only Latin America. Two value props, and the agent adapts which one it leads with based on the user's region:

1. **Access** — people who cannot easily buy US equities (friction, minimums, FX, brokerage access). Applies to Europe, LATAM, Asia, Africa. Note: US users are currently restricted from trading these tokenized assets by regulation; non-US users are the addressable market.
2. **Inflation / devaluation hedge** — people in unstable-currency economies (much of LATAM, parts of Africa/Asia) for whom holding savings in local currency is a slow loss. For them, US blue chips are a "safe-haven" store of value.

The agent should detect or ask the user's country, then frame everything in local currency and emphasize the relevant value prop (hedge for high-inflation regions, access/diversification for stable-currency regions).

---

## HARD TECHNICAL CONSTRAINTS (read this twice — it shapes the whole architecture)

These were verified against Robinhood Chain docs. **Re-verify addresses against the live docs before relying on them — testnets change.** Source: https://docs.robinhood.com/chain/contracts

### The network
- **Robinhood Chain Testnet** — an Arbitrum Orbit L2. EVM-compatible, standard Ethereum tooling works (Solidity, Hardhat/Foundry, ethers/viem).
- **Chain ID:** `46630`
- **Gas token:** ETH (native)
- **RPC (Alchemy recommended):** `https://robinhood-testnet.g.alchemy.com/v2/<YOUR_API_KEY>`
- **Block explorer:** `https://explorer.testnet.chain.robinhood.com`
- **Faucet:** `https://faucet.testnet.chain.robinhood.com/` (gives test ETH for gas + stock tokens)

### Deployed tokens (all ERC-20) on the testnet
| Token | Address |
| --- | --- |
| USDG (stablecoin) | `0x7E955252E15c84f5768B83c41a71F9eba181802F` |
| WETH | `0x7943e237c7F95DA44E0301572D358911207852Fa` |
| TSLA | `0xC9f9c86933092BbbfFF3CCb4b105A4A94bf3Bd4E` |
| AMZN | `0x5884aD2f920c162CFBbACc88C9C51AA75eC09E02` |
| PLTR | `0x1FBE1a0e43594b3455993B5dE5Fd0A7A266298d0` |
| NFLX | `0x3b8262A63d25f0477c4DDE23F83cfe22Cb768C93` |
| AMD  | `0x71178BAc73cBeb415514eB542a8995b82669778d` |

> ⚠️ The stablecoin is **USDG**, not USDC. The hackathon resource sheet links a Circle USDC faucet — that is for Arbitrum Sepolia, a different chain. On Robinhood Chain we use USDG.

### THE KEY CONSTRAINT — there is no DEX and no price oracle
The testnet has **no DEX/AMM deployed and no Chainlink price feed deployed.** This means:
- We **cannot** do a real market swap of USDG → TSLA. There is no on-chain liquidity to trade against.
- We **cannot** read a live on-chain price for the stock tokens.

**Design implication (this is the core architectural decision):**
We build a contract called **`AllocationDesk`** that acts as a **settlement desk**, not a market. It holds a reserve of USDG and stock tokens (funded from the faucet). When the agent calls `execute(...)`, the desk takes the user's USDG and transfers out the corresponding stock tokens, priced using a value the **backend injects as a trusted oracle** (the backend fetches real US stock prices + FX off-chain). 

We frame this honestly to judges: *"On testnet there is no liquidity, so the desk simulates settlement at a backend-provided oracle price. On mainnet this same interface routes to Robinhood Chain's real liquidity."* This is a clean, defensible architecture — not a hack.

---

## Architecture (3 layers)

```
┌─────────────────────────────────────────────────────────────┐
│  LAYER 3 — Frontend (chat UI + portfolio dashboard)          │
│  React/Next + viem/wagmi. Shows value in LOCAL CURRENCY.     │
└───────────────▲─────────────────────────────────────────────┘
                │ user messages / portfolio reads
┌───────────────┴─────────────────────────────────────────────┐
│  LAYER 2 — Agent backend (the "intelligence")                │
│  LLM with tool-calling. Perceives (prices, FX, inflation),   │
│  reasons (allocation, when to DCA), acts (calls the desk).   │
│  Also runs the AUTONOMOUS DCA scheduler (cron/interval).     │
│  Acts as the trusted price oracle for the desk.              │
└───────────────▲─────────────────────────────────────────────┘
                │ execute() / setPrice() / reads
┌───────────────┴─────────────────────────────────────────────┐
│  LAYER 1 — AllocationDesk smart contract (on Robinhood Chain)│
│  Minimal. OpenZeppelin. Holds reserves, settles allocations. │
└─────────────────────────────────────────────────────────────┘
```

Full interface and tool definitions are in `docs/SPEC.md`.

---

## Recommended tech stack

- **Contract:** Solidity + **Foundry** (fast tests; or Hardhat if preferred). OpenZeppelin contracts (ERC20 interfaces, Ownable, ReentrancyGuard, SafeERC20).
- **Agent backend:** Node/TypeScript. LLM with tool-calling — recommended **Claude (`claude-sonnet-4-6`)** via the Anthropic API. Tool-use docs: https://docs.claude.com/en/docs/build-with-claude/tool-use (pull current syntax from here — do not rely on memory).
- **Frontend:** Next.js + React + Tailwind + **viem/wagmi** for chain interaction. shadcn/ui optional.
- **Chain libs:** viem preferred over ethers for new code.

---

## Build order (do NOT reorder — Layer 1 unblocks everything)

1. **Day 1–2 — De-risk.** Connect to testnet via Alchemy, get USDG + stock tokens + gas ETH from faucet, confirm you can transfer ERC-20s programmatically. If this works, the project is viable.
2. **Week 1 — Layer 1.** Build, test, deploy `AllocationDesk`. This is the hardest part for a frontend/AI dev, so it goes first.
3. **Week 2 — Layer 2.** Agent backend (tool-calling) + autonomous DCA scheduler + wiring to the desk.
4. **Week 3 — Layer 3 + polish.** Frontend chat + dashboard, local-currency narrative, README, 3-min demo video, deploy, submit. Keep 2 days of buffer for bugs.

Submission deadline: **June 14, 2026.** (Registration closed May 25 — make sure you registered.)

---

## SCOPE GUARDRAILS — what NOT to build (protect the timeline)

- ❌ No real DEX/AMM. The desk is a settlement contract, not a market.
- ❌ No compliance/KYC/inheritance engine. We deliberately dropped that idea as too legally risky.
- ❌ No multi-chain. Robinhood Chain testnet only.
- ❌ No real money / no mainnet. Testnet only; all assets are simulated.
- ❌ No complex contract. If the contract exceeds ~200 lines, we are over-building. Intelligence lives in Layer 2, not Layer 1.
- ❌ This is NOT financial advice. Frame the product as an educational/automation tool. Include a clear disclaimer in the UI.

When in doubt, cut scope. A polished narrow demo beats a broken broad one.

---

## Judging criteria we are optimizing for

1. **Smart contract quality** → keep `AllocationDesk` minimal, use OpenZeppelin, SafeERC20, ReentrancyGuard, NatSpec comments, and write Foundry tests.
2. **Product-Market Fit** → billions of non-US retail users; the local-currency framing makes PMF visceral.
3. **Innovation & creativity** → an agent for *protecting savings / financial inclusion*, not for crypto-native yield farming. No one is doing this (verified via research).
4. **Real problem solving** → currency devaluation and exclusion from US markets are genuine, large problems.

Plus: **deployed on Robinhood Chain** → at least 1 of 3 prizes per track is reserved for Robinhood Chain projects, and most competitors will default to plain Arbitrum. This is our edge.

---

## Coding conventions

- TypeScript strict mode. No `any` unless justified.
- Contract: NatSpec on every external function. Custom errors over `require` strings.
- Secrets (Alchemy key, Anthropic key, deployer private key) in `.env`, never committed. Provide `.env.example`.
- Keep the agent's price-oracle authority clearly isolated (only the backend signer can call `setPrice`/`execute` as oracle) and documented as a testnet simplification.
- Commit in small logical units. Write a clear README as you go — judges read it.
