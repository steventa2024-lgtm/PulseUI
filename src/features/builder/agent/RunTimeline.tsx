import {
  CircleDashed,
  GitCommitHorizontal,
  Info,
  ListChecks,
  Monitor,
  TriangleAlert,
} from "lucide-react";

import { STATE_LABELS, type RunView } from "@/lib/client/run-events";
import { MessageText } from "./MessageText";
import { ToolCallRow } from "./ToolCallRow";

/** Live view of a running (or just-finished) agent run, built from real events. */
export function RunTimeline({ view }: { view: RunView }) {
  return (
    <div className="space-y-2">
      {view.items.map((item) => {
        switch (item.kind) {
          case "text":
            return <MessageText key={item.id} text={item.text} />;
          case "plan":
            return (
              <div
                key={item.id}
                className="rounded-[var(--pulse-radius-md)] border border-pulse-magenta/25 bg-pulse-magenta/[0.05] p-3"
              >
                <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[color-mix(in_oklab,var(--pulse-magenta)_65%,white)]">
                  <ListChecks className="h-3.5 w-3.5" /> Plan
                </p>
                <MessageText text={item.text} />
              </div>
            );
          case "tool":
            return (
              <ToolCallRow
                key={item.id}
                name={item.name}
                args={item.args}
                status={item.status}
                output={item.output ?? null}
                error={item.error ?? null}
                durationMs={item.durationMs ?? null}
              />
            );
          case "file":
            // File writes are already shown by their tool rows.
            return null;
          case "notice":
            return (
              <p
                key={item.id}
                className={
                  item.level === "warning"
                    ? "flex items-start gap-2 rounded-md bg-pulse-warning/10 px-2.5 py-1.5 text-xs text-pulse-warning"
                    : "flex items-start gap-2 px-1 text-xs text-pulse-text-secondary"
                }
              >
                {item.level === "warning" ? (
                  <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                ) : (
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                )}
                {item.text}
              </p>
            );
          case "preview":
            return (
              <p
                key={item.id}
                className="flex items-center gap-2 px-1 text-xs text-pulse-text-secondary"
              >
                <Monitor
                  className={
                    item.status === "ready"
                      ? "h-3.5 w-3.5 text-pulse-success"
                      : item.status === "failed"
                        ? "h-3.5 w-3.5 text-pulse-danger"
                        : "h-3.5 w-3.5 text-pulse-cyan"
                  }
                />
                {item.status === "starting"
                  ? "Starting preview…"
                  : item.status === "ready"
                    ? "Preview ready"
                    : `Preview failed: ${item.detail ?? ""}`}
              </p>
            );
          case "version":
            return (
              <p
                key={item.id}
                className="flex items-center gap-2 px-1 text-xs text-pulse-text-secondary"
              >
                <GitCommitHorizontal className="h-3.5 w-3.5 text-pulse-magenta" /> Version{" "}
                {item.number} saved · {item.label}
              </p>
            );
          default:
            return null;
        }
      })}
      {!view.finished && (
        <p className="flex items-center gap-2 px-1 pt-1 text-xs text-pulse-cyan" aria-live="polite">
          <CircleDashed className="h-3.5 w-3.5 animate-spin" />{" "}
          {view.activity ?? STATE_LABELS[view.state]}…
        </p>
      )}
    </div>
  );
}
