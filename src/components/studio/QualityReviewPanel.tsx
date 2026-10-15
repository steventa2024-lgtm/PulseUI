import { useMemo } from "react";
import { AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";
import { auditComponentSource } from "@/lib/quality/audit-component";

/** Advisory source checks, clearly distinguished from browser/runtime tests. */
export function QualityReviewPanel({
  code,
  isGenerating = false,
}: {
  code: string;
  isGenerating?: boolean;
}) {
  const findings = useMemo(() => auditComponentSource(code), [code]);

  if (!code.trim() || isGenerating) return null;

  const errors = findings.filter((finding) => finding.severity === "error").length;
  const count = findings.reduce((total, finding) => total + finding.occurrences, 0);

  return (
    <details className="mb-3 rounded-lg border border-border/70 bg-panel/70 text-xs">
      <summary
        className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-foreground/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        aria-label={"Expand static UX review: " + count + " potential issues"}
      >
        {errors > 0 ? (
          <ShieldAlert className="size-4 shrink-0 text-rose-400" />
        ) : findings.length > 0 ? (
          <AlertTriangle className="size-4 shrink-0 text-amber-400" />
        ) : (
          <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
        )}
        <span className="font-medium">Static UX review</span>
        <span className="rounded-md bg-elevated px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
          {count} potential {count === 1 ? "issue" : "issues"}
        </span>
        <span className="ml-auto text-[10px] text-muted-foreground">Not browser verified · expand</span>
      </summary>
      <div className="space-y-2 border-t border-border/70 px-3 py-3">
        <p className="text-muted-foreground">
          Heuristic source checks only. Rendering, accessibility and click-through behavior require browser tests.
        </p>
        {findings.length === 0 ? (
          <p className="text-foreground/80">
            No known placeholder links, unhandled forms or obviously inert controls found.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {findings.map((finding) => (
              <li key={finding.id} className="flex items-start gap-2 text-foreground/80">
                <span className="shrink-0 font-mono text-amber-400">{finding.occurrences}×</span>
                <span>{finding.message}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}
