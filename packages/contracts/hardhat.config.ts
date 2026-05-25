import type { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox-viem';
import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';

// Load the monorepo-root .env so a single .env serves the whole workspace.
dotenvConfig({ path: resolve(__dirname, '../../.env') });

// Robinhood Chain Testnet — kept in sync with packages/shared/src/addresses.ts.
// Hardcoded here (rather than imported from @ballast/shared) to keep
// hardhat.config.ts free of workspace-resolution surprises at startup.
const CHAIN_ID = 46630;

const RPC_URL = process.env.ALCHEMY_RPC_URL ?? '';
const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY ?? '';

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.27',
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: true,
    },
  },
  networks: {
    hardhat: {
      // local in-memory chain used by `hardhat test`
    },
    robinhoodTestnet: {
      url: RPC_URL,
      chainId: CHAIN_ID,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
  },
  paths: {
    sources: 'contracts',
    tests: 'test',
    cache: 'cache',
    artifacts: 'artifacts',
  },
};

export default config;
