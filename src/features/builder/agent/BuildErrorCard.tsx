import { ScrollText, Sparkles, TriangleAlert } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

/** Extract "src/x.tsx:42" and the first error message from compiler output. */
export function summarizeBuildError(output: string): { location: string | null; message: string } {
  const lines = output.split("\n");
  const location = /([\w@./-]+\.(?:tsx?|jsx?|css|mjs|astro|vue))[:(](\d+)(?:[,:](\d+))?/.exec(
    output,
  );
  const message =
    lines
      .find((line) => /error/i.test(line) && !/^\s*\$/.test(line) && !/exit code/.test(line))
      ?.trim() ??
    lines.find((line) => line.trim())?.trim() ??
    "Unknown error";
  return {
    location: location ? `${location[1]}:${location[2]}` : null,
    message:
      message.replace(/^.*?error\s*(TS\d+)?:?\s*/i, "").slice(0, 240) || message.slice(0, 240),
  };
}

export function BuildErrorCard({
  title = "Build failed",
  output,
  onFix,
  busy,
}: {
  title?: string;
  output: string;
  onFix?: () => void;
  busy?: boolean;
}) {
  const [showLogs, setShowLogs] = useState(false);
  const summary = summarizeBuildError(output);
  return (
    <div
      className="rounded-[var(--pulse-radius-md)] border border-pulse-danger/35 bg-pulse-danger/[0.06] p-3"
      role="alert"
    >
      <div className="flex items-center gap-2 text-sm font-medium text-pulse-danger">
        <TriangleAlert className="h-4 w-4" /> {title}
      </div>
      {summary.location && (
        <p className="mt-2 font-mono text-xs text-pulse-text">{summary.location}</p>
      )}
      <p className="mt-1 font-mono text-xs text-pulse-text-secondary">{summary.message}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {onFix && (
          <Button size="sm" onClick={onFix} disabled={busy}>
            <Sparkles /> Ask Pulse to Fix
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowLogs(!showLogs)}
          aria-expanded={showLogs}
        >
          <ScrollText /> {showLogs ? "Hide logs" : "View Logs"}
        </Button>
      </div>
      {showLogs && (
        <pre className="mt-3 max-h-72 overflow-auto rounded-md border border-pulse-border bg-pulse-bg-deep p-3 font-mono text-[11px] leading-relaxed text-pulse-text-secondary whitespace-pre-wrap">
          {output}
        </pre>
      )}
    </div>
  );
}
