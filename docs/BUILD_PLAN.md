# Ballast — Build Plan

Actionable, ordered checklist. Submission deadline: **June 14, 2026**. Solo developer. Do phases in order — Layer 1 unblocks everything. Keep ~2 days of buffer at the end.

---

## Phase 0 — De-risk (Day 1–2) ⚠️ do this before anything else

- [ ] Create Alchemy account, make an app on **Robinhood Chain Testnet**, get RPC URL + API key.
- [ ] Add the network to your wallet (chainId `46630`, RPC, explorer `explorer.testnet.chain.robinhood.com`).
- [ ] Use the faucet (`https://faucet.testnet.chain.robinhood.com/`) to get test ETH (gas), USDG, and the 5 stock tokens.
- [ ] Write a throwaway script (viem) that connects, reads your USDG balance, and transfers a tiny amount of a stock token to another address.
- [ ] **Gate:** if the transfer confirms on the explorer, the project is viable. If not, debug RPC/network before proceeding.
- [ ] Re-verify all token addresses against https://docs.robinhood.com/chain/contracts and put them in `config/addresses.ts`.

## Phase 1 — Layer 1: `AllocationDesk` contract (Week 1)

- [ ] Init Foundry project. Add OpenZeppelin.
- [ ] Implement `AllocationDesk` per `docs/SPEC.md` §2.1 (Ownable/oracle role, SafeERC20, ReentrancyGuard, custom errors, NatSpec).
- [ ] Read `decimals()` dynamically; implement and unit-test the price/scaling math.
- [ ] Write Foundry tests: execute happy path, weights!=10000 revert, unsupported stock revert, insufficient reserve revert, reentrancy, redeem round-trip, onlyOracle on setPrices.
- [ ] Deploy to Robinhood Chain testnet. Save the address to `config/addresses.ts`.
- [ ] Fund the desk's reserve (`depositReserve`) with faucet USDG + stock tokens.
- [ ] Manual sanity: call `execute` from a script, confirm stock tokens land in the test user wallet.

## Phase 2 — Layer 2: Agent backend (Week 2)

- [ ] Scaffold Node/TS service. Load secrets from `.env` (Alchemy key, Anthropic key, deployer/oracle key).
- [ ] Integrate Claude (`claude-sonnet-4-6`) with tool-calling (current syntax from docs).
- [ ] Implement the off-chain price + FX fetch (`getPrices`). Wire it to push `setPrices` on-chain.
- [ ] Implement deterministic `proposeAllocation` (logic computes the basket; LLM only narrates it).
- [ ] Implement `executeAllocation` → calls the desk; return tx hash.
- [ ] Implement `getUserContext`, `getPortfolio`, `explainConcept`.
- [ ] Write the system prompt (calm, simple, local-currency, confirm-before-execute, disclaimer, no advice/guarantees).
- [ ] **Build the autonomous DCA scheduler** (interval/cron worker). On tick: find due plans, fetch prices, execute, log to an activity feed. This is the agentic centerpiece — make it observable.
- [ ] Expose API: `/chat`, `/execute`, `/dca`, `/portfolio`.

## Phase 3 — Layer 3: Frontend + polish (Week 3)

- [ ] Next.js + Tailwind + viem/wagmi. Wallet connect for testnet.
- [ ] Onboarding: country/currency picker, wallet connect, faucet link.
- [ ] Chat screen: streaming responses, inline confirm/execute buttons.
- [ ] Dashboard: holdings cards, total value in local currency, "cash vs. Ballast" comparison, **activity feed showing autonomous DCA runs**.
- [ ] Local-currency conversion everywhere (use the FX rate).
- [ ] Persistent disclaimer (educational/automation tool, testnet, not financial advice).
- [ ] Polish UX (loading states, errors, empty states).

## Phase 4 — Submission (last 2 days, + buffer)

- [ ] Write the README: problem, who it's for (global non-US), the no-DEX architecture decision (explain it proactively), how to run, contract address + explorer link, tech stack.
- [ ] Record the **3-minute demo video**. Script it around the core loop in `docs/SPEC.md` §1.4 — and make sure the autonomous DCA "money shot" (scheduler firing with no user action) is on screen.
- [ ] Deploy frontend (Vercel) + backend somewhere reachable.
- [ ] Double-check the project is deployed on Robinhood Chain and the submission states this clearly (prize reservation depends on it).
- [ ] Submit on HackQuest before the deadline. Don't wait for the last hour.

---

## Definition of done for the MVP

A judge can: open the app, connect a testnet wallet, tell the agent a goal in natural language, get an explained allocation in their local currency, confirm and see stock tokens arrive on-chain, set a recurring plan, and watch it execute autonomously — all on Robinhood Chain. Everything beyond that is bonus.
