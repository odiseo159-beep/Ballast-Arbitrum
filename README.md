# Ballast

> An **AI agent** that lets people **outside the United States** protect their savings and access **US blue-chip stocks** by chatting in plain language. It runs on **Robinhood Chain** but hides the crypto complexity behind a calm, trustworthy conversation.

**Built for the [Arbitrum Open House London Online Buildathon](https://hackquest.io/), targeting the Best Agentic Project track on Robinhood Chain.**

---

## The problem

Two real problems for billions of non-US retail savers:

1. **Exclusion.** Buying US blue-chip equities from outside the US is painful — brokerage access, minimums, FX, paperwork, regulation. Most of the world is effectively locked out of the best-performing equity market of the last century.
2. **Devaluation.** In many economies (much of LATAM, Africa, Asia, parts of Eastern Europe), the local currency erodes steadily. Savings held in local cash slowly disappear.

Tokenized US stocks on a self-custodial, 24/7, globally accessible chain solve both — *if* the experience is simple enough for non-crypto-natives. Today it isn't. Ballast is that experience.

You tell the agent what you want in your own words ("protect my savings from inflation", "buy a small basket of US stocks every week"). It interprets, proposes an allocation, **explains it in your local currency**, and executes on-chain. Then it keeps working **autonomously**, making small recurring contributions on a schedule — no signing every time.

## Why Robinhood Chain

Robinhood Chain is an Arbitrum Orbit L2 purpose-built for tokenized real-world assets — self-custody, 24/7 access, EVM compatibility. The five US stock tokens we use (TSLA, AMZN, PLTR, NFLX, AMD) are already live on its testnet. The missing piece is an interface a normal person can actually use. Ballast is that interface.

---

## Architecture

Three intentionally minimal layers:

```
┌─────────────────────────────────────────────────────────────┐
│  Frontend — Next.js 14 + wagmi v2 + Tailwind                │
│  Landing · onboarding · chat · portfolio (local currency)   │
└───────────────▲─────────────────────────────────────────────┘
                │ HTTP (Hono)
┌───────────────┴─────────────────────────────────────────────┐
│  Backend — Node/TS + Claude Sonnet 4.6 (tool runner)        │
│  7 tools · autonomous DCA scheduler · off-chain price oracle│
└───────────────▲─────────────────────────────────────────────┘
                │ setPrices() / execute() / redeem()
┌───────────────┴─────────────────────────────────────────────┐
│  Contract — AllocationDesk.sol (Solidity 0.8.27 + OZ)       │
│  ~230 lines. Settlement desk, NOT a DEX. 18/18 tests pass.  │
└─────────────────────────────────────────────────────────────┘
```

## The "no DEX" architectural choice (the most interesting decision in this repo)

Robinhood Chain testnet has **no DEX/AMM** and **no on-chain price feed** deployed. That ruled out the obvious approach (build a DEX wrapper, route swaps through it). Our response:

`AllocationDesk` is a **settlement contract**, not a market. It holds reserves of USDG and stock tokens. When `execute()` is called, it transfers stocks to the beneficiary at a price the off-chain agent backend (oracle role) pushes via `setPrices()` immediately before each execute. The backend fetches real US-stock prices + FX from off-chain sources.

We frame this honestly: on testnet there is no liquidity, so the desk simulates settlement at a backend-provided oracle price. On mainnet, the same `execute()` interface would route through Robinhood Chain's real liquidity venues. This is a clean, defensible architecture — not a hack.

We chose this over (a) deploying our own minimal AMM (over-builds the contract beyond the ~200-line budget and adds attack surface for no demo value), and (b) faking prices inside the contract (loses the oracle/agent story).

## The agentic centerpiece — autonomous DCA

The model in this repo is honest about what's "agentic":

- **Interactive turns** (chat → propose → confirm → execute): the user signs from their wallet. The agent only prepares calldata and pushes prices. This is human-in-the-loop.
- **Recurring contributions** (DCA): the user schedules a plan once. From that point the backend signs and executes on its own, every cadence tick, with **no further user input**. The plan lives in the backend, the scheduler fires on an interval, prices are refreshed on-chain, the allocation runs.

The demo recording captures this last part — a 30-second cadence (`demo_30s`) fires repeatedly on screen with nobody touching the keyboard.

---

## Demo loop (what the 3-minute video shows)

1. Landing → **Get started** → onboarding picks country (e.g. **Argentina / ARS**) → connect MetaMask (Robinhood Chain Testnet, chainId 46630).
2. User in chat: *"tengo 200 USDG y quiero protegerlos de la inflación"*.
3. Agent calls `get_user_context`, `get_prices`, `propose_allocation` — proposes 60% AMZN / 40% NFLX (the `safe` preset, inferred from "protect"). Every amount shown in **ARS** first, USD second.
4. User confirms. Agent calls `prepare_execute` → backend pushes fresh prices on-chain → returns calldata.
5. Frontend asks MetaMask to sign two transactions: (1) USDG `approve`, (2) `AllocationDesk.execute`. Stocks land in user's wallet.
6. User: *"hazlo cada 30 segundos por 3 veces para verlo correr"*.
7. Agent calls `schedule_dca` with `cadence: demo_30s`.
8. **The autonomous money shot:** no further user input. Every 30 seconds the backend scheduler ticks → `setPrices` → `execute` → activity feed and portfolio update live.

---

## Tech stack

- **Contract:** Solidity 0.8.27 + OpenZeppelin (`Ownable`, `SafeERC20`, `ReentrancyGuard`, `Math.mulDiv`). Hardhat 2 + viem-based tests.
- **Backend:** Node/TS + Anthropic SDK (Claude Sonnet 4.6, beta tool runner with Zod 4 schemas) + Hono + viem. In-memory DCA store + interval scheduler. Activity feed.
- **Frontend:** Next.js 14 App Router + Tailwind + wagmi v2 + viem. Fonts: Manrope (display), Inter (body), JetBrains Mono (code/addresses).
- **Shared workspace package:** auto-generated AllocationDesk ABI (`pnpm contracts:build` extracts it), versioned `deployment.testnet.json`, addresses + chain config.
- **Monorepo:** pnpm workspaces.

## Repo layout

```
packages/
  contracts/    AllocationDesk.sol + Hardhat + tests + deploy scripts
  backend/      agent + 7 tools + DCA scheduler + Hono API
  frontend/     Next.js app (landing, onboarding, chat, portfolio)
  shared/       addresses, ABIs (auto-generated), deployment manifest, chain config
scripts/
  derisk.ts     Phase 0 connectivity check (no deploy needed)
docs/
  SPEC.md       full product + technical spec
  BUILD_PLAN.md ordered checklist by phase
  DESIGN_BRIEF.md  visual / brand direction
design/         original React mockups for the four screens
```

## Deployed addresses (Robinhood Chain Testnet, chainId `46630`)

| Token | Address |
| --- | --- |
| USDG | `0x7E955252E15c84f5768B83c41a71F9eba181802F` |
| TSLA | `0xC9f9c86933092BbbfFF3CCb4b105A4A94bf3Bd4E` |
| AMZN | `0x5884aD2f920c162CFBbACc88C9C51AA75eC09E02` |
| PLTR | `0x1FBE1a0e43594b3455993B5dE5Fd0A7A266298d0` |
| NFLX | `0x3b8262A63d25f0477c4DDE23F83cfe22Cb768C93` |
| AMD  | `0x71178BAc73cBeb415514eB542a8995b82669778d` |
| **AllocationDesk** | _filled by `pnpm contracts:deploy` → see `packages/shared/src/deployment.testnet.json`_ |

Explorer: <https://explorer.testnet.chain.robinhood.com>

---

## Run it locally

Prereqs: Node ≥ 20, pnpm ≥ 10, a MetaMask (or other injected) wallet, and accounts on [Alchemy](https://alchemy.com) (for the RPC) and [console.anthropic.com](https://console.anthropic.com) (for the LLM key).

```sh
# 1. Install
pnpm install

# 2. Configure secrets at the repo root
cp .env.example .env
# Fill in:
#   ALCHEMY_RPC_URL=https://robinhood-testnet.g.alchemy.com/v2/<your_key>
#   DEPLOYER_PRIVATE_KEY=0x<fresh testnet wallet key, NO real funds>
#   ANTHROPIC_API_KEY=sk-ant-...

# 3. De-risk the testnet connection (transfers 1 base unit of a faucet stock)
pnpm derisk          # expected: ✅ DE-RISK PASSED

# 4. Deploy + fund the desk reserves
pnpm contracts:build       # compiles + extracts ABI to shared
pnpm contracts:deploy      # writes packages/shared/src/deployment.testnet.json
pnpm contracts:fund-reserves

# 5. Backend (terminal 1)
pnpm backend:dev           # http://localhost:3001/health

# 6. Frontend (terminal 2)
cp packages/frontend/.env.local.example packages/frontend/.env.local
# Fill in NEXT_PUBLIC_RPC_URL (same Alchemy URL).
pnpm frontend:dev          # http://localhost:3000
```

## Test the contract

```sh
pnpm contracts:test
```

**18/18 tests passing.** Coverage:

- Constructor wiring (owner, oracle, USDG, supported stocks, zero-address revert).
- `setOracle` (only owner, emits event).
- `setPrices` (oracle only, zero price rejected, unsupported stock rejected).
- `execute` (50/30/20 happy path, 100/0/0 boundary, `WeightsMismatch`, `InsufficientReserve`, `PriceNotSet`, **reentrancy attempt blocked by `ReentrancyGuard`**, **event emission with correct args**).
- `redeem` (round-trip: execute then redeem half back to USDG).
- **Decimals math** with a 6-decimal USDG paired against an 18-decimal stock token.
- `depositReserve` / `withdrawReserve` admin paths, including `UnknownToken` rejection.

---

## What's deliberately not in scope

- ❌ No real DEX/AMM. The desk is a settlement contract.
- ❌ No KYC, compliance, inheritance engine.
- ❌ No multi-chain, no mainnet, no real money.
- ❌ No backend auth — single-tenant demo. For any public deploy, gate `/chat` with a shared-secret header or wallet-signed auth (≈5 lines, noted as a follow-up).
- ❌ The mockups in `design/` use AAPL/MSFT placeholders — those tokens don't exist on this testnet. The live frontend uses the deployed set (TSLA/AMZN/PLTR/NFLX/AMD).

## Disclaimer

Educational + automation tool. **Testnet only — no real money is moved. Not financial advice.**

---

🤖 Built with [Claude Code](https://claude.com/claude-code).
