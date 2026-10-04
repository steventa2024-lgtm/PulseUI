/**
 * Client side of the agent event stream: an EventSource hook plus a pure
 * reducer that turns events into the activity timeline the agent panel shows.
 */
import { useEffect, useReducer, useRef } from "react";

import type { AgentEvent, AgentState, FileChangeSummary } from "../domain/types";

export type TimelineTool = {
  kind: "tool";
  id: string;
  name: string;
  args: Record<string, unknown>;
  status: "running" | "ok" | "failed";
  output?: string;
  error?: string | null;
  durationMs?: number;
};

export type TimelineItem =
  | TimelineTool
  | { kind: "text"; id: string; text: string }
  | { kind: "plan"; id: string; text: string }
  | { kind: "notice"; id: string; level: "info" | "warning"; text: string }
  | { kind: "file"; id: string; action: "created" | "updated" | "deleted"; path: string }
  | { kind: "preview"; id: string; status: "starting" | "ready" | "failed"; detail?: string }
  | { kind: "version"; id: string; number: number; label: string };

export type RunView = {
  runId: string;
  state: AgentState;
  model: string | null;
  mode: string | null;
  items: TimelineItem[];
  buildOutput: string;
  summary: string | null;
  error: string | null;
  filesChanged: FileChangeSummary | null;
  lastSeq: number;
  finished: boolean;
  /** Live detail while the model streams, e.g. "Writing src/pages/Home.tsx". */
  activity: string | null;
};

export function emptyRun(runId: string): RunView {
  return {
    runId,
    state: "queued",
    model: null,
    mode: null,
    items: [],
    buildOutput: "",
    summary: null,
    error: null,
    filesChanged: null,
    lastSeq: 0,
    finished: false,
    activity: null,
  };
}

const str = (value: unknown) => (typeof value === "string" ? value : "");

export function reduceRun(view: RunView, event: AgentEvent): RunView {
  if (event.seq <= view.lastSeq) return view;
  const next: RunView = { ...view, lastSeq: event.seq };
  const items = view.items;
  const push = (item: TimelineItem) => {
    next.items = [...items, item];
  };

  switch (event.type) {
    case "agent.started":
      next.model =
        [str(event.data["provider"]), str(event.data["model"])].filter(Boolean).join(" · ") || null;
      next.mode = str(event.data["mode"]) || null;
      break;
    case "agent.state":
      next.state = event.data["state"] as AgentState;
      if (next.state !== "planning") next.activity = null;
      break;
    case "agent.progress":
      next.activity = str(event.data["text"]) || null;
      break;
    case "agent.delta": {
      const last = items[items.length - 1];
      const text = str(event.data["text"]);
      if (last?.kind === "text") {
        next.items = [...items.slice(0, -1), { ...last, text: last.text + text }];
      } else if (text.trim()) {
        push({ kind: "text", id: `t${event.seq}`, text });
      }
      break;
    }
    case "agent.plan":
      push({ kind: "plan", id: `p${event.seq}`, text: str(event.data["text"]) });
      break;
    case "agent.message":
      push({
        kind: "notice",
        id: `n${event.seq}`,
        level: event.data["level"] === "warning" ? "warning" : "info",
        text: str(event.data["text"]),
      });
      break;
    case "tool.started":
      push({
        kind: "tool",
        id: str(event.data["id"]) || `tool${event.seq}`,
        name: str(event.data["name"]),
        args: (event.data["args"] as Record<string, unknown>) ?? {},
        status: "running",
      });
      break;
    case "tool.completed":
      next.items = items.map((item) =>
        item.kind === "tool" && item.id === event.data["id"]
          ? {
              ...item,
              status: event.data["ok"] ? "ok" : "failed",
              output: str(event.data["output"]),
              error: (event.data["error"] as string | null) ?? null,
              durationMs: Number(event.data["durationMs"] ?? 0),
            }
          : item,
      );
      break;
    case "file.created":
    case "file.updated":
    case "file.deleted":
      push({
        kind: "file",
        id: `f${event.seq}`,
        action:
          event.type === "file.created"
            ? "created"
            : event.type === "file.updated"
              ? "updated"
              : "deleted",
        path: str(event.data["path"]),
      });
      break;
    case "build.started":
      next.buildOutput = "";
      break;
    case "build.output":
      next.buildOutput = (view.buildOutput + str(event.data["text"])).slice(-20_000);
      break;
    case "preview.starting":
      push({ kind: "preview", id: `pv${event.seq}`, status: "starting" });
      break;
    case "preview.ready":
      push({
        kind: "preview",
        id: `pv${event.seq}`,
        status: "ready",
        detail: str(event.data["url"]),
      });
      break;
    case "preview.failed":
      push({
        kind: "preview",
        id: `pv${event.seq}`,
        status: "failed",
        detail: str(event.data["error"]),
      });
      break;
    case "version.created":
      push({
        kind: "version",
        id: `v${event.seq}`,
        number: Number(event.data["number"] ?? 0),
        label: str(event.data["label"]),
      });
      break;
    case "agent.completed":
    case "agent.failed":
    case "agent.cancelled":
      next.finished = true;
      next.activity = null;
      next.state =
        event.type === "agent.completed"
          ? "completed"
          : event.type === "agent.failed"
            ? "failed"
            : "cancelled";
      next.summary = str(event.data["summary"]) || null;
      next.error = (event.data["error"] as string | null) ?? null;
      next.filesChanged = (event.data["filesChanged"] as FileChangeSummary | undefined) ?? null;
      break;
    default:
      break;
  }
  return next;
}

type Action = { type: "reset"; runId: string } | { type: "event"; event: AgentEvent };

function reducer(state: RunView | null, action: Action): RunView | null {
  if (action.type === "reset") return emptyRun(action.runId);
  if (!state || action.event.runId !== state.runId) return state;
  return reduceRun(state, action.event);
}

/**
 * Follow a run over SSE. EventSource reconnects on its own and resumes from
 * the last event id, so a flaky connection does not lose events.
 */
export function useRunStream(
  runId: string | null,
  onFinished?: (view: RunView) => void,
): RunView | null {
  const [view, dispatch] = useReducer(reducer, null);
  const finishedRef = useRef(onFinished);
  finishedRef.current = onFinished;
  const latest = useRef<RunView | null>(null);
  latest.current = view;

  useEffect(() => {
    if (!runId) return;
    dispatch({ type: "reset", runId });
    const source = new EventSource(`/api/runs/${runId}/events?after=0`);
    let done = false;
    source.addEventListener("agent", (message) => {
      try {
        const event = JSON.parse((message as MessageEvent<string>).data) as AgentEvent;
        dispatch({ type: "event", event });
      } catch {
        // Ignore malformed frames.
      }
    });
    source.addEventListener("end", () => {
      done = true;
      source.close();
      // Let the reducer apply the final event before notifying.
      setTimeout(() => {
        if (latest.current) finishedRef.current?.(latest.current);
      }, 0);
    });
    source.onerror = () => {
      if (done) source.close();
    };
    return () => source.close();
  }, [runId]);

  return view;
}

export const STATE_LABELS: Record<AgentState, string> = {
  queued: "Queued",
  planning: "Thinking",
  reading: "Reading files",
  editing: "Editing files",
  installing: "Installing dependencies",
  building: "Building",
  testing: "Validating",
  starting_preview: "Starting preview",
  repairing: "Repairing build errors",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Stopped",
};
