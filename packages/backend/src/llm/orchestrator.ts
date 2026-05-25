import type Anthropic from '@anthropic-ai/sdk';
import { anthropic, MODEL } from './client.js';
import { SYSTEM_PROMPT } from './system-prompt.js';
import { buildTools, RunContext } from './tools.js';
import type { PendingTx, UserContext } from '../types.js';

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResult {
  text: string;
  pendingTxs: PendingTx[];
  scheduledPlanId: string | null;
  toolEvents: Array<{ name: string; input: unknown; output: unknown }>;
}

function toBetaMessages(turns: ChatTurn[]): Anthropic.Beta.BetaMessageParam[] {
  return turns.map((t) => ({ role: t.role, content: t.content }));
}

export async function chat(
  turns: ChatTurn[],
  userContext: UserContext
): Promise<ChatResult> {
  if (turns.length === 0) throw new Error('chat() requires at least one turn');

  const runCtx = new RunContext();
  const tools = buildTools(userContext, runCtx);

  // toolRunner handles the agentic loop: API call → tool_use detection →
  // run() execution → tool_result → loop until end_turn. Returns the final
  // BetaMessage. Cache the (stable) system prompt for cheap follow-ups.
  // (Adaptive thinking is intentionally omitted — not yet typed in this SDK
  //  version, and the agent works fine without it for this use case.)
  const finalMessage = await anthropic.beta.messages.toolRunner({
    model: MODEL,
    max_tokens: 4096,
    system: [
      {
        type: 'text',
        text: SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' },
      },
    ],
    tools,
    messages: toBetaMessages(turns),
  });

  // Extract assistant text from the final message
  const textBlocks = (finalMessage.content ?? []).filter(
    (b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text'
  );
  const text = textBlocks.map((b) => b.text).join('\n').trim();

  return {
    text,
    pendingTxs: runCtx.pendingTxs,
    scheduledPlanId: runCtx.scheduledPlanId,
    toolEvents: runCtx.toolEvents,
  };
}
