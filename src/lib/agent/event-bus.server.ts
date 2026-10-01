/**
 * Agent event fan-out. Every event is persisted (so a reloaded browser can
 * replay a run) and pushed to live SSE subscribers. Token deltas are coalesced
 * before persisting so a long stream does not become thousands of rows.
 */
import type { AgentEvent, AgentEventType } from "../domain/types";
import { eventsRepo } from "../persistence/repositories.server";

type Listener = (event: AgentEvent) => void;

type Channel = {
  seq: number;
  listeners: Set<Listener>;
  pendingDelta: string;
  flushTimer: ReturnType<typeof setTimeout> | null;
  closed: boolean;
};

type Bus = { channels: Map<string, Channel> };
const KEY = Symbol.for("pulseui.agent-bus");

function bus(): Bus {
  const store = globalThis as unknown as Record<symbol, Bus | undefined>;
  store[KEY] ??= { channels: new Map() };
  return store[KEY];
}

function channel(runId: string): Channel {
  const channels = bus().channels;
  let current = channels.get(runId);
  if (!current) {
    const last = eventsRepo.list(runId).at(-1);
    current = {
      seq: last?.seq ?? 0,
      listeners: new Set(),
      pendingDelta: "",
      flushTimer: null,
      closed: false,
    };
    channels.set(runId, current);
  }
  return current;
}

function publish(runId: string, type: AgentEventType, data: Record<string, unknown>): AgentEvent {
  const current = channel(runId);
  current.seq += 1;
  const event = eventsRepo.append(runId, current.seq, type, data);
  for (const listener of current.listeners) {
    try {
      listener(event);
    } catch {
      // A broken subscriber must not break the run.
    }
  }
  return event;
}

function flushDelta(runId: string): void {
  const current = channel(runId);
  if (current.flushTimer) {
    clearTimeout(current.flushTimer);
    current.flushTimer = null;
  }
  if (!current.pendingDelta) return;
  const text = current.pendingDelta;
  current.pendingDelta = "";
  publish(runId, "agent.delta", { text });
}

export function emit(
  runId: string,
  type: AgentEventType,
  data: Record<string, unknown> = {},
): void {
  if (type === "agent.delta") {
    const current = channel(runId);
    current.pendingDelta += String(data["text"] ?? "");
    current.flushTimer ??= setTimeout(() => flushDelta(runId), 120);
    return;
  }
  flushDelta(runId);
  publish(runId, type, data);
}

export function closeChannel(runId: string): void {
  flushDelta(runId);
  const current = channel(runId);
  current.closed = true;
  // Keep the channel briefly so late subscribers still see `closed`, then drop it.
  setTimeout(() => bus().channels.delete(runId), 60_000).unref?.();
}

export function isChannelOpen(runId: string): boolean {
  const current = bus().channels.get(runId);
  return Boolean(current && !current.closed);
}

/**
 * Subscribe to a run: replays persisted events after `afterSeq`, then streams
 * live ones. Returns an unsubscribe function.
 */
export function subscribe(runId: string, afterSeq: number, listener: Listener): () => void {
  const current = channel(runId);
  let lastSeen = afterSeq;
  const deliver = (event: AgentEvent) => {
    if (event.seq <= lastSeen) return;
    lastSeen = event.seq;
    listener(event);
  };
  current.listeners.add(deliver);
  for (const event of eventsRepo.list(runId, afterSeq)) deliver(event);
  return () => current.listeners.delete(deliver);
}
