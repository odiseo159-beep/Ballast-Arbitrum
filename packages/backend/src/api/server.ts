import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { backendAccount, explorerAddress } from '../chain/client.js';
import { TESTNET_DEPLOYMENT } from '@ballast/shared';
import { activityRoute } from './activity.js';
import { chatRoute } from './chat.js';
import { dcaRoute } from './dca.js';
import { portfolioRoute } from './portfolio.js';

export const app = new Hono();

// Allow the local Next.js dev server + any deployed frontend.
app.use('/*', cors({ origin: '*', allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'] }));

app.get('/health', (c) =>
  c.json({
    ok: true,
    ts: new Date().toISOString(),
    backend_wallet: backendAccount.address,
    backend_wallet_explorer: explorerAddress(backendAccount.address),
    allocation_desk: TESTNET_DEPLOYMENT.allocationDesk,
    deployed_at: TESTNET_DEPLOYMENT.deployedAt,
  })
);

app.route('/chat', chatRoute);
app.route('/portfolio', portfolioRoute);
app.route('/dca', dcaRoute);
app.route('/activity', activityRoute);

app.notFound((c) => c.json({ error: 'not found', path: c.req.path }, 404));
app.onError((err, c) => {
  // eslint-disable-next-line no-console
  console.error('[api]', err);
  return c.json({ error: err.message }, 500);
});
