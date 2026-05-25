import { Hono } from 'hono';
import { z } from 'zod';
import { chat } from '../llm/orchestrator.js';
import type { UserContext } from '../types.js';

const ChatRequestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().min(1),
      })
    )
    .min(1),
  userContext: z.object({
    wallet: z
      .string()
      .regex(/^0x[a-fA-F0-9]{40}$/)
      .nullable(),
    currency: z.string().length(3),
    region: z.string().min(1),
  }),
});

export const chatRoute = new Hono();

chatRoute.post('/', async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const parsed = ChatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
  }

  const { messages, userContext } = parsed.data;
  try {
    const result = await chat(messages, userContext as UserContext);
    return c.json({
      text: result.text,
      pending_txs: result.pendingTxs.map((tx) => ({
        kind: tx.kind,
        to: tx.to,
        data: tx.data,
        value: tx.value,
        description: tx.description,
      })),
      scheduled_plan_id: result.scheduledPlanId,
      tool_events: result.toolEvents.map((e) => ({ name: e.name })),
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[chat] error:', err);
    const msg = err instanceof Error ? err.message : String(err);
    return c.json({ error: msg }, 500);
  }
});
