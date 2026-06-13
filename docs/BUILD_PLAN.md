# Ballast — Build Plan

Actionable, ordered checklist. Submission deadline: **June 14, 2026**. Solo developer. Do phases in order — Layer 1 unblocks everything. Keep ~2 days of buffer at the end.

---

## Phase 0 — De-risk (Day 1–2) ⚠️ do this before anything else — ✅ DONE

- [x] Create Alchemy account, make an app on **Robinhood Chain Testnet**, get RPC URL + API key.
- [x] Add the network to your wallet (chainId `46630`, RPC, explorer `explorer.testnet.chain.robinhood.com`).
- [x] Use the faucet (`https://faucet.testnet.chain.robinhood.com/`) to get test ETH (gas), USDG, and the 5 stock tokens.
- [x] Write a throwaway script (viem) that connects, reads your USDG balance, and transfers a tiny amount of a stock token to another address.
- [x] **Gate:** if the transfer confirms on the explorer, the project is viable. If not, debug RPC/network before proceeding.
- [x] Re-verify all token addresses against https://docs.robinhood.com/chain/contracts and put them in `config/addresses.ts`.

## Phase 1 — Layer 1: `AllocationDesk` contract (Week 1) — ✅ DONE

- [x] Init Foundry project. Add OpenZeppelin. _(Built with Hardhat instead — both are sanctioned by `CLAUDE.md`.)_
- [x] Implement `AllocationDesk` per `docs/SPEC.md` §2.1 (Ownable/oracle role, SafeERC20, ReentrancyGuard, custom errors, NatSpec).
- [x] Read `decimals()` dynamically; implement and unit-test the price/scaling math.
- [x] Write tests: execute happy path, weights!=10000 revert, unsupported stock revert, insufficient reserve revert, reentrancy, redeem round-trip, onlyOracle on setPrices. _(18/18 Hardhat tests passing.)_
- [x] Deploy to Robinhood Chain testnet. → [`0xa7fa026636e8c4ee535f44b28784f5f5324125e0`](https://explorer.testnet.chain.robinhood.com/address/0xa7fa026636e8c4ee535f44b28784f5f5324125e0) (see `packages/shared/src/deployment.testnet.json`)
- [x] Fund the desk's reserve (`depositReserve`) with faucet USDG + stock tokens.
- [x] Manual sanity: call `execute` from a script, confirm stock tokens land in the test user wallet.

## Phase 2 — Layer 2: Agent backend (Week 2) — ✅ DONE

- [x] Scaffold Node/TS service. Load secrets from `.env` (Alchemy key, Anthropic key, deployer/oracle key).
- [x] Integrate Claude (`claude-sonnet-4-6`) with tool-calling.
- [x] Implement the off-chain price + FX fetch (`getPrices`). Wire it to push `setPrices` on-chain.
- [x] Implement deterministic `proposeAllocation` (logic computes the basket; LLM only narrates it).
- [x] Implement `executeAllocation` → calls the desk; return tx hash.
- [x] Implement `getUserContext`, `getPortfolio`, `explainConcept`.
- [x] Write the system prompt (calm, simple, local-currency, confirm-before-execute, disclaimer, no advice/guarantees).
- [x] **Build the autonomous DCA scheduler** (interval/cron worker). On tick: find due plans, fetch prices, execute, log to an activity feed.
- [x] Expose API: `/chat`, `/execute`, `/dca`, `/portfolio`.

## Phase 3 — Layer 3: Frontend + polish (Week 3) — ✅ DONE

- [x] Next.js + Tailwind + viem/wagmi. Wallet connect for testnet.
- [x] Onboarding: country/currency picker, wallet connect, faucet link.
- [x] Chat screen: streaming responses, inline confirm/execute buttons.
- [x] Dashboard: holdings cards, total value in local currency, "cash vs. Ballast" comparison, **activity feed showing autonomous DCA runs**.
- [x] Local-currency conversion everywhere (use the FX rate).
- [x] Persistent disclaimer (educational/automation tool, testnet, not financial advice).
- [x] Polish UX (loading states, errors, empty states).

## Phase 4 — Submission (last 2 days, + buffer) — 🔶 IN PROGRESS

> 📍 **Live URLs, deploy status, and gotchas live in [`docs/DEPLOYMENT.md`](./DEPLOYMENT.md) — that file is the single source of truth, updated as deploy state changes. The critical path there is ordered; work it top to bottom.**

- [x] Write the README: problem, who it's for (global non-US), the no-DEX architecture decision (explain it proactively), how to run, contract address + explorer link, tech stack.
- [x] Create public GitHub repo, push all code. → https://github.com/odiseo159-beep/Ballast-Arbitrum
- [x] Deploy frontend (Vercel). → https://ballast-arbitrum.vercel.app (READY)
- [ ] **Deploy backend (Railway).** Config is pushed (`railway.json`, `nixpacks.toml`, `engines.node >=22.13` fix in commit `c3d7c7e`) but build success + public domain are **unverified** — confirm and record in `docs/DEPLOYMENT.md`.
- [ ] **Wire frontend → backend:** set `NEXT_PUBLIC_API_URL` (Vercel env var) to the Railway URL, redeploy.
- [ ] **Verify end-to-end:** open `/chat` on the live frontend, send a message, confirm the agent responds (no "Failed to fetch").
- [ ] Record the **3-minute demo video**. Script it around the core loop in `docs/SPEC.md` §1.4 — make sure the autonomous DCA "money shot" (scheduler firing with no user action) is on screen.
- [ ] Double-check the project is deployed on Robinhood Chain and the submission states this clearly (prize reservation depends on it).
- [ ] Submit on HackQuest before the deadline. Don't wait for the last hour.

---

## Definition of done for the MVP

A judge can: open the app, connect a testnet wallet, tell the agent a goal in natural language, get an explained allocation in their local currency, confirm and see stock tokens arrive on-chain, set a recurring plan, and watch it execute autonomously — all on Robinhood Chain. Everything beyond that is bonus.
