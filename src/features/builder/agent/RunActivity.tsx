import { ChevronRight, Loader2 } from "lucide-react";
import { useState } from "react";

import { useRunDetails } from "@/lib/client/queries";
import { cn } from "@/lib/utils";
import { ToolCallRow } from "./ToolCallRow";

/** Collapsed tool-call history for a finished run, loaded on demand. */
export function RunActivity({ runId }: { runId: string }) {
  const [open, setOpen] = useState(false);
  const details = useRunDetails(runId, open);
  const calls = details.data?.toolCalls ?? [];
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex items-center gap-1 text-[11px] text-pulse-text-muted hover:text-pulse-text"
      >
        <ChevronRight className={cn("h-3 w-3 transition-transform", open && "rotate-90")} />
        {open ? "Hide activity" : "Show activity"}
        {details.data && ` · ${calls.length} tool call${calls.length === 1 ? "" : "s"}`}
      </button>
      {open && (
        <div className="mt-2 space-y-1.5">
          {details.isLoading && <Loader2 className="h-4 w-4 animate-spin text-pulse-text-muted" />}
          {details.data && !calls.length && (
            <p className="text-xs text-pulse-text-muted">No tools were used in this run.</p>
          )}
          {calls.map((call) => (
            <ToolCallRow
              key={call.id}
              name={call.name}
              args={call.input}
              status={
                call.status === "running"
                  ? "running"
                  : call.status === "succeeded"
                    ? "ok"
                    : "failed"
              }
              output={call.output}
              error={call.error}
              durationMs={call.durationMs}
            />
          ))}
        </div>
      )}
    </div>
  );
}
