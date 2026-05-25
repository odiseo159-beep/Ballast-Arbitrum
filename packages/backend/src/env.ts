import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';

// Load the monorepo-root .env (one .env serves the whole workspace).
// `override: true` so the .env wins over any shell/system env var the user
// may have set with the same name (saw this with ANTHROPIC_API_KEY="" in
// the dev's shell shadowing the .env value).
dotenvConfig({ path: resolve(__dirname, '../../../.env'), override: true });

function required(name: string): string {
  const v = process.env[name];
  if (!v || v.includes('REPLACE_ME')) {
    throw new Error(
      `Missing or placeholder env var: ${name}. Copy .env.example → .env at the repo root and fill it in.`
    );
  }
  return v;
}

function optional(name: string): string | undefined {
  const v = process.env[name];
  if (!v || v.includes('REPLACE_ME') || v === '') return undefined;
  return v;
}

export const ENV = {
  // Chain
  ALCHEMY_RPC_URL: required('ALCHEMY_RPC_URL'),
  DEPLOYER_PRIVATE_KEY: required('DEPLOYER_PRIVATE_KEY') as `0x${string}`,

  // Anthropic
  ANTHROPIC_API_KEY: required('ANTHROPIC_API_KEY'),

  // Optional price providers (fall back to mock if absent)
  FINANCE_API_KEY: optional('FINANCE_API_KEY'),
  FX_API_KEY: optional('FX_API_KEY'),

  // Server
  PORT: Number(process.env.PORT ?? 3001),

  // Tunables
  DCA_TICK_INTERVAL_MS: Number(process.env.DCA_TICK_INTERVAL_MS ?? 30_000),
};
