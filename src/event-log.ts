export interface ReceivedWebhookEvent {
  id: string;
  event: string;
  receivedAt: string;
  data: unknown;
}

const MAX_EVENTS = 50;

// Newest first, in memory only — the log resets when the server restarts.
// That's fine for a demo; a production app would persist events, or poll the
// Events API (workos.events.listEvents) with a stored cursor instead.
const events: ReceivedWebhookEvent[] = [];

export function recordEvent(event: ReceivedWebhookEvent): void {
  events.unshift(event);
  if (events.length > MAX_EVENTS) {
    events.length = MAX_EVENTS;
  }
}

export function listReceivedEvents(): readonly ReceivedWebhookEvent[] {
  return events;
}
