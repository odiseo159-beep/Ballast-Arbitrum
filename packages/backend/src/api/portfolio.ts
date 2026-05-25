import { Hono } from 'hono';
import { getAllHoldings } from '../chain/desk.js';
import { getStockPrices } from '../prices/stocks.js';
import { formatLocal, getFxRate } from '../prices/fx.js';

export const portfolioRoute = new Hono();

portfolioRoute.get('/', async (c) => {
  const wallet = c.req.query('wallet');
  const currency = (c.req.query('currency') ?? 'USD').toUpperCase();

  if (!wallet || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
    return c.json({ error: 'wallet query param required (0x address)' }, 400);
  }

  const addr = wallet as `0x${string}`;
  try {
    const [holdings, prices, fx] = await Promise.all([
      getAllHoldings(addr),
      getStockPrices(),
      getFxRate(currency),
    ]);

    const stockPositions = holdings.stocks.map((h) => {
      const priceUsd = prices[h.symbol].priceUsd;
      const valueUsd = parseFloat(h.human) * priceUsd;
      return {
        symbol: h.symbol,
        balance: h.human,
        price_usd: priceUsd,
        value_usd: +valueUsd.toFixed(2),
        value_local: +(valueUsd * fx.usdToLocal).toFixed(2),
        value_local_formatted: formatLocal(valueUsd, fx),
      };
    });

    const totalStocksUsd = stockPositions.reduce((a, p) => a + p.value_usd, 0);
    const usdgValueUsd = parseFloat(holdings.usdg.human); // USDG ≈ 1 USD
    const totalUsd = totalStocksUsd + usdgValueUsd;

    return c.json({
      wallet: addr,
      currency,
      fx_usd_to_local: fx.usdToLocal,
      fx_source: fx.source,
      usdg_balance: holdings.usdg.human,
      stock_positions: stockPositions,
      total_value_usd: +totalUsd.toFixed(2),
      total_value_local: +(totalUsd * fx.usdToLocal).toFixed(2),
      total_value_local_formatted: formatLocal(totalUsd, fx),
      as_of: new Date().toISOString(),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return c.json({ error: msg }, 500);
  }
});
