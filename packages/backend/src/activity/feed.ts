import { randomUUID } from 'crypto';
import type { ActivityEvent } from '../types.js';

const MAX_EVENTS = 200;

const events: ActivityEvent[] = [];

export function logActivity(
  event: Omit<ActivityEvent, 'id' | 'timestamp'>
): ActivityEvent {
  const full: ActivityEvent = {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    ...event,
  };
  events.unshift(full);
  if (events.length > MAX_EVENTS) events.length = MAX_EVENTS;
  // Surface autonomous activity in the backend log too — useful during demo
  // when the scheduler fires with no user input.
  // eslint-disable-next-line no-console
  console.log(`[activity] ${full.type} ${full.summary}`);
  return full;
}

export function getActivity(
  wallet?: `0x${string}`,
  limit = 50
): ActivityEvent[] {
  const filtered = wallet
    ? events.filter((e) => e.wallet.toLowerCase() === wallet.toLowerCase())
    : events;
  return filtered.slice(0, limit);
}
