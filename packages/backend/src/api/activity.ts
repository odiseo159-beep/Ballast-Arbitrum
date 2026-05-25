import { Hono } from 'hono';
import { getActivity } from '../activity/feed.js';

export const activityRoute = new Hono();

activityRoute.get('/', (c) => {
  const wallet = c.req.query('wallet') as `0x${string}` | undefined;
  const limit = Math.min(200, Math.max(1, Number(c.req.query('limit') ?? 50)));
  if (wallet && !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
    return c.json({ error: 'invalid wallet' }, 400);
  }
  return c.json({ events: getActivity(wallet, limit) });
});
