/**
 * Robinhood Chain Testnet — canonical addresses.
 *
 * Source: https://docs.robinhood.com/chain/contracts
 * Re-verify before each phase — testnets can change.
 */

export const CHAIN_ID = 46630 as const;

export const EXPLORER_URL = 'https://explorer.testnet.chain.robinhood.com' as const;

export const FAUCET_URL = 'https://faucet.testnet.chain.robinhood.com/' as const;

export const TOKENS = {
  USDG: '0x7E955252E15c84f5768B83c41a71F9eba181802F',
  WETH: '0x7943e237c7F95DA44E0301572D358911207852Fa',
  TSLA: '0xC9f9c86933092BbbfFF3CCb4b105A4A94bf3Bd4E',
  AMZN: '0x5884aD2f920c162CFBbACc88C9C51AA75eC09E02',
  PLTR: '0x1FBE1a0e43594b3455993B5dE5Fd0A7A266298d0',
  NFLX: '0x3b8262A63d25f0477c4DDE23F83cfe22Cb768C93',
  AMD:  '0x71178BAc73cBeb415514eB542a8995b82669778d',
} as const satisfies Record<string, `0x${string}`>;

export const STOCK_SYMBOLS = ['TSLA', 'AMZN', 'PLTR', 'NFLX', 'AMD'] as const;
export type StockSymbol = (typeof STOCK_SYMBOLS)[number];

export const STOCK_ADDRESSES: Record<StockSymbol, `0x${string}`> = {
  TSLA: TOKENS.TSLA,
  AMZN: TOKENS.AMZN,
  PLTR: TOKENS.PLTR,
  NFLX: TOKENS.NFLX,
  AMD:  TOKENS.AMD,
};

export const ALL_STOCK_ADDRESSES: readonly `0x${string}`[] = STOCK_SYMBOLS.map(
  (s) => STOCK_ADDRESSES[s]
);
