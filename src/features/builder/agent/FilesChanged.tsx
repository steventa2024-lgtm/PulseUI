import { FileMinus2, FilePen, FilePlus2 } from "lucide-react";

import type { FileChangeSummary } from "@/lib/domain/types";

export function FilesChanged({ changes }: { changes: FileChangeSummary }) {
  const total = changes.added.length + changes.changed.length + changes.removed.length;
  if (!total) return null;
  const rows = [
    ...changes.added.map((path) => ({ path, kind: "added" as const })),
    ...changes.changed.map((path) => ({ path, kind: "changed" as const })),
    ...changes.removed.map((path) => ({ path, kind: "removed" as const })),
  ];
  return (
    <details className="group rounded-[var(--pulse-radius-md)] border border-pulse-border bg-pulse-bg-deep/40">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-3 py-2 text-xs text-pulse-text-secondary">
        <span className="text-pulse-text">
          {total} file{total === 1 ? "" : "s"} changed
        </span>
        {changes.added.length > 0 && (
          <span className="text-pulse-success">+{changes.added.length} added</span>
        )}
        {changes.changed.length > 0 && (
          <span className="text-pulse-cyan">~{changes.changed.length} modified</span>
        )}
        {changes.removed.length > 0 && (
          <span className="text-pulse-danger">−{changes.removed.length} removed</span>
        )}
      </summary>
      <ul className="space-y-1 border-t border-pulse-border px-3 py-2">
        {rows.map((row) => (
          <li
            key={`${row.kind}-${row.path}`}
            className="flex items-center gap-2 font-mono text-[11px]"
          >
            {row.kind === "added" ? (
              <FilePlus2 className="h-3 w-3 text-pulse-success" />
            ) : row.kind === "changed" ? (
              <FilePen className="h-3 w-3 text-pulse-cyan" />
            ) : (
              <FileMinus2 className="h-3 w-3 text-pulse-danger" />
            )}
            <span className="truncate text-pulse-text-secondary">{row.path}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}
