import {
  CheckCircle2,
  ChevronRight,
  CircleDashed,
  FileCode2,
  FolderTree,
  GitBranch,
  Hammer,
  Monitor,
  Package,
  Search,
  Terminal,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  list_files: FolderTree,
  read_file: FileCode2,
  read_files: FileCode2,
  search_files: Search,
  write_file: FileCode2,
  replace_file: FileCode2,
  patch_file: FileCode2,
  delete_file: FileCode2,
  rename_file: FileCode2,
  create_directory: FolderTree,
  install_dependencies: Package,
  run_command: Terminal,
  run_typecheck: Hammer,
  run_lint: Hammer,
  run_tests: Hammer,
  run_build: Hammer,
  start_preview: Monitor,
  restart_preview: Monitor,
  stop_preview: Monitor,
  read_preview_logs: Monitor,
  git_status: GitBranch,
  git_diff: GitBranch,
  git_log: GitBranch,
};

const LABELS: Record<string, string> = {
  list_files: "Listed files",
  read_file: "Read",
  read_files: "Read files",
  search_files: "Searched",
  write_file: "Wrote",
  replace_file: "Replaced",
  patch_file: "Edited",
  delete_file: "Deleted",
  rename_file: "Renamed",
  create_directory: "Created folder",
  install_dependencies: "Installed dependencies",
  run_command: "Ran",
  run_typecheck: "Type-checked",
  run_lint: "Linted",
  run_tests: "Ran tests",
  run_build: "Built project",
  start_preview: "Started preview",
  restart_preview: "Restarted preview",
  stop_preview: "Stopped preview",
  read_preview_logs: "Read preview logs",
  git_status: "Checked git status",
  git_diff: "Viewed git diff",
  git_log: "Viewed git log",
};

function target(args: Record<string, unknown>): string {
  const value = args["path"] ?? args["command"] ?? args["query"] ?? args["from"];
  if (typeof value === "string") return value;
  if (Array.isArray(args["paths"])) return (args["paths"] as string[]).join(", ");
  if (Array.isArray(args["packages"])) return (args["packages"] as string[]).join(" ");
  return "";
}

export function ToolCallRow({
  name,
  args,
  status,
  output,
  error,
  durationMs,
}: {
  name: string;
  args: Record<string, unknown>;
  status: "running" | "ok" | "failed";
  output?: string | null;
  error?: string | null;
  durationMs?: number | null;
}) {
  const [open, setOpen] = useState(false);
  const Icon = ICONS[name] ?? Terminal;
  const detail = target(args);
  const hasOutput = Boolean(output || error);

  return (
    <div className="rounded-[var(--pulse-radius-md)] border border-pulse-border bg-pulse-bg-deep/50">
      <button
        type="button"
        onClick={() => hasOutput && setOpen(!open)}
        aria-expanded={hasOutput ? open : undefined}
        className={cn(
          "flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-xs",
          hasOutput && "hover:bg-pulse-surface-raised",
        )}
      >
        {status === "running" ? (
          <CircleDashed className="h-3.5 w-3.5 shrink-0 animate-spin text-pulse-cyan" />
        ) : status === "ok" ? (
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-pulse-success" />
        ) : (
          <XCircle className="h-3.5 w-3.5 shrink-0 text-pulse-danger" />
        )}
        <Icon className="h-3.5 w-3.5 shrink-0 text-pulse-text-muted" />
        <span className="shrink-0 text-pulse-text">{LABELS[name] ?? name}</span>
        {detail && (
          <span className="truncate font-mono text-[11px] text-pulse-text-muted">{detail}</span>
        )}
        <span className="ml-auto flex shrink-0 items-center gap-1 text-[10px] text-pulse-text-muted">
          <span className="font-mono">{name}</span>
          {typeof durationMs === "number" && durationMs > 0 && (
            <span>· {(durationMs / 1000).toFixed(1)}s</span>
          )}
          {hasOutput && (
            <ChevronRight className={cn("h-3 w-3 transition-transform", open && "rotate-90")} />
          )}
        </span>
      </button>
      {open && hasOutput && (
        <pre className="max-h-64 overflow-auto border-t border-pulse-border px-3 py-2 font-mono text-[11px] leading-relaxed text-pulse-text-secondary whitespace-pre-wrap">
          {error && status === "failed" && !output?.includes(error) ? `${error}\n\n` : ""}
          {output}
        </pre>
      )}
    </div>
  );
}
