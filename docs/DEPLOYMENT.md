# Ballast — Deployment Status & Runbook

**This file is the single source of truth for live URLs and deploy status.** When deploy state changes, update this file — don't duplicate status into README or BUILD_PLAN, link here instead.

Last updated: 2026-06-13.

---

## 🎯 Critical path to submission (deadline June 14, 2026)

Do these in order. Everything in `docs/BUILD_PLAN.md` Phase 4 follows from this.

1. [ ] **Confirm the Railway build succeeded.** Commit `c3d7c7e` (`engines.node: ">=22.13"`) fixed `ERR_UNKNOWN_BUILTIN_MODULE: node:sqlite` (railpack was picking Node 20). Build result is **unverified** — check the Railway dashboard.
2. [ ] **Get the Railway public domain** (service → Settings → Networking → Generate Domain) and `curl <url>/health` → expect `{"ok": true, ...}`.
3. [ ] **Set `NEXT_PUBLIC_API_URL`** in Vercel (Project Settings → Environment Variables) to that Railway URL, then redeploy the frontend.
4. [ ] **Verify end-to-end:** open https://ballast-arbitrum.vercel.app/chat, send a message, confirm the agent responds (no "Failed to fetch").
5. [ ] Record the 3-minute demo video (`docs/SPEC.md` §1.4 — autonomous DCA money shot).
6. [ ] Submit on HackQuest.

---

## Live URLs

| What | URL / value | Status |
| --- | --- | --- |
| Frontend (Vercel, production) | https://ballast-arbitrum.vercel.app | ✅ READY (commit `2ff33c3`, 2026-06-13) |
| GitHub repo | https://github.com/odiseo159-beep/Ballast-Arbitrum | ✅ public |
| Backend (Railway) | _not yet recorded_ | 🔶 unverified — see critical path #1–2 |
| AllocationDesk contract | [`0xa7fa026636e8c4ee535f44b28784f5f5324125e0`](https://explorer.testnet.chain.robinhood.com/address/0xa7fa026636e8c4ee535f44b28784f5f5324125e0) | ✅ deployed 2026-05-25, chainId `46630` |
| Deployer / oracle wallet | `0xfABe61984F5013848E2a4ffA9A55e7E1b9E3782d` | funded from testnet faucets |

**Note:** "Frontend READY" means the Vercel build succeeded — it does **not** mean `/chat` and `/portfolio` work yet. Both call the backend API via `NEXT_PUBLIC_API_URL`, which is still unwired (critical path #3).

---

## Vercel (frontend)

- Project: `ballast-arbitrum` (team `odiseo159-9254's projects`, team ID `team_xtWBzd6qwyhLBjFgM7evZ5NZ`, project ID `prj_Lhf1cQ22wyDGPKr2kKqMzDWOzXoP`)
- Root `vercel.json`:
  - `framework: "nextjs"`
  - `installCommand: "pnpm install --frozen-lockfile"`
  - `buildCommand: "pnpm --filter @ballast/frontend build"`
  - `outputDirectory: "packages/frontend/.next"`
- **Gotcha — monorepo Next.js detection:** Vercel reads the ROOT `package.json` to detect the Next.js version in monorepos. `next`, `react`, `react-dom` are listed as root devDependencies *only* for this detection — the actual build resolves `packages/frontend`'s own copies via the pnpm filter.
- Env vars (Project Settings → Environment Variables):
  - `NEXT_PUBLIC_API_URL` — backend base URL. **Action item:** point at the Railway URL once deployed (currently a placeholder).
  - `NEXT_PUBLIC_RPC_URL` — Alchemy Robinhood Chain Testnet RPC URL (bundled into the client; rotate the key after the buildathon).

## Railway (backend)

- The repo's monorepo auto-detection creates 3 services (`@ballast/frontend`, `@ballast/contracts`, `@ballast/backend`). **Delete the first two** — only `@ballast/backend` is needed.
- `@ballast/backend` service config (root `railway.json` + `nixpacks.toml`, both committed):
  - Root directory: `/` (repo root — needed for pnpm workspace resolution)
  - Build command: `pnpm install --frozen-lockfile`
  - Start command: `pnpm --filter @ballast/backend start`
  - Healthcheck: `GET /health` → `{"ok": true, ...}`
- Required env vars (3): `ALCHEMY_RPC_URL`, `DEPLOYER_PRIVATE_KEY`, `ANTHROPIC_API_KEY`
- **Gotcha — Node version:** railpack reads `engines.node` from the ROOT `package.json` to pick the Node version (it does not reliably honor `nixpacks.toml`'s `nodejs_22` for this). This repo's `packageManager: pnpm@11.1.2` requires Node ≥22.13 (`node:sqlite` built-in). `engines.node` was `">=20"` → railpack picked Node 20.20.2 → `ERR_UNKNOWN_BUILTIN_MODULE: node:sqlite`. **Fixed** in commit `c3d7c7e` (`engines.node: ">=22.13"`), pushed but build result unverified.
- Generate a public domain: service → Settings → Networking → Generate Domain.

---

## Other non-obvious fixes (don't redo these)

- **Brand logos** (`packages/frontend/components/stock-icon.tsx`): the installed `react-icons/si` does **not** export `SiAmazon` (or `SiAmazonwebservices`), which broke the typecheck. Fixed by dropping `react-icons` entirely and rendering `<img src="https://cdn.simpleicons.org/{slug}/{hexcolor}">` (SimpleIcons CDN, CC0 SVGs). Falls back to ticker text if the ticker isn't in the `SLUGS` map.
- **Landing hydration mismatch** (`ActivityFeedLanding`): don't seed tx hashes with `Math.random()` — server/client renders diverge. Use a deterministic string hash seeded by `${ticker}-${tick}-${i}`.
- **Onboarding loop**: `BallastContext` persists `onboarded: boolean` to `localStorage` (`ballast.user.v2`). Onboarding redirects straight to `/chat` if `onboarded` is already true — the tutorial only shows once.

---

## Signing architecture (recap)

- **Interactive allocations** (chat → propose → confirm): the user's wallet signs (frontend, wagmi `useSendTransaction`). `prepare_execute` returns calldata only.
- **Autonomous DCA**: the backend's own wallet (deployer = oracle = executor key) signs every scheduled tick — no user interaction. Pre-funded from the testnet faucet during Phase 0.

Full detail in memory `signing-architecture` and `packages/backend/src/llm/tools.ts`.

---

## Post-hackathon follow-ups (not urgent, don't block submission)

- Rotate `ANTHROPIC_API_KEY` and `DEPLOYER_PRIVATE_KEY` — both were echoed into chat context multiple times via system-reminders during development.
- Add backend auth (shared-secret header or wallet-signed) before any non-demo public deploy — currently single-tenant, no auth (documented in README's "not in scope").
