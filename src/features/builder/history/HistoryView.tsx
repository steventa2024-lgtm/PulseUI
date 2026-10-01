import { useQuery } from "@tanstack/react-query";
import { GitBranch, GitCommitHorizontal, History, Loader2, RotateCcw, Save } from "lucide-react";
import { Suspense, lazy, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/shared/EmptyState";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { errorMessage, useGitState, useInvalidateProject, useVersions } from "@/lib/client/queries";
import type { Version } from "@/lib/domain/types";
import { timeAgo } from "@/lib/format";
import { getVersionDiff, restoreProjectVersion } from "@/lib/server-fns/history.functions";
import { commitGitChanges, getGitDiff } from "@/lib/server-fns/workspace.functions";
import { cn } from "@/lib/utils";
import { useBuilder } from "../BuilderContext";

const DiffViewer = lazy(() => import("./DiffViewer"));

const STATUS_BADGE: Record<
  Version["status"],
  { label: string; variant: "success" | "destructive" | "secondary" | "magenta" }
> = {
  ok: { label: "Built", variant: "success" },
  build_failed: { label: "Build failed", variant: "destructive" },
  restored: { label: "Restored", variant: "magenta" },
  manual: { label: "Manual", variant: "secondary" },
};

function VersionDiff({
  projectId,
  version,
  against,
}: {
  projectId: string;
  version: Version;
  against: "parent" | "current";
}) {
  const diff = useQuery({
    queryKey: ["version-diff", projectId, version.id, against],
    queryFn: () => getVersionDiff({ data: { projectId, versionId: version.id, against } }),
  });
  if (diff.isPending)
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-pulse-text-muted" />
      </div>
    );
  if (diff.isError)
    return <p className="p-6 text-sm text-pulse-danger">{errorMessage(diff.error)}</p>;
  return (
    <Suspense fallback={null}>
      <DiffViewer diff={diff.data?.diff ?? ""} />
    </Suspense>
  );
}

function VersionsTab() {
  const { projectId, busy } = useBuilder();
  const versions = useVersions(projectId);
  const invalidate = useInvalidateProject();
  const [selected, setSelected] = useState<Version | null>(null);
  const [against, setAgainst] = useState<"parent" | "current">("parent");
  const [restoring, setRestoring] = useState<Version | null>(null);
  const [pending, setPending] = useState(false);

  const restore = async () => {
    if (!restoring) return;
    setPending(true);
    try {
      const version = await restoreProjectVersion({ data: { projectId, versionId: restoring.id } });
      toast.success(`Restored version ${restoring.number}`, {
        description: `Saved as version ${version.number}. The preview updates automatically.`,
      });
      invalidate(projectId);
      setSelected(null);
    } catch (error) {
      toast.error("Restore failed", { description: errorMessage(error) });
    } finally {
      setPending(false);
      setRestoring(null);
    }
  };

  const list = versions.data ?? [];
  const current = list[0];
  const active = selected ?? current ?? null;

  if (versions.isPending) {
    return (
      <div className="space-y-2 p-4">
        {[0, 1, 2].map((index) => (
          <div key={index} className="pulse-skeleton h-16" />
        ))}
      </div>
    );
  }
  if (!list.length) {
    return (
      <EmptyState
        icon={History}
        title="No versions yet."
        description="Pulse saves a checkpoint after every change it makes."
        className="m-6"
      />
    );
  }

  return (
    <div className="flex h-full min-h-0 max-lg:flex-col">
      <ol
        className="w-80 shrink-0 space-y-1.5 overflow-y-auto border-r border-pulse-border p-3 max-lg:max-h-64 max-lg:w-full max-lg:border-b max-lg:border-r-0"
        aria-label="Versions"
      >
        {list.map((version) => {
          const isActive = active?.id === version.id;
          const badge = STATUS_BADGE[version.status];
          const count =
            version.changedFiles.added.length +
            version.changedFiles.changed.length +
            version.changedFiles.removed.length;
          return (
            <li key={version.id}>
              <div
                className={cn(
                  "rounded-[var(--pulse-radius-md)] border p-3",
                  isActive
                    ? "border-pulse-cyan/40 bg-pulse-surface-hover"
                    : "border-pulse-border bg-pulse-surface hover:border-pulse-border-strong",
                )}
              >
                <button onClick={() => setSelected(version)} className="block w-full text-left">
                  <div className="flex items-center gap-2">
                    <GitCommitHorizontal className="h-3.5 w-3.5 text-pulse-magenta" />
                    <span className="text-xs font-semibold text-pulse-text">
                      Version {version.number}
                    </span>
                    {version.id === current?.id && <Badge variant="default">Current</Badge>}
                    <Badge variant={badge.variant} className="ml-auto">
                      {badge.label}
                    </Badge>
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-[13px] text-pulse-text-secondary">
                    {version.label}
                  </p>
                  <p className="mt-1.5 text-[11px] text-pulse-text-muted">
                    {timeAgo(version.createdAt)} · {count} file{count === 1 ? "" : "s"} ·{" "}
                    <span className="font-mono">{version.sha.slice(0, 7)}</span>
                  </p>
                </button>
                <div className="mt-2 flex gap-1.5">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-[11px]"
                    onClick={() => {
                      setSelected(version);
                      setAgainst("parent");
                    }}
                  >
                    View Changes
                  </Button>
                  {version.id !== current?.id && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-[11px]"
                      onClick={() => setRestoring(version)}
                      disabled={busy || pending}
                    >
                      <RotateCcw className="h-3 w-3" /> Restore
                    </Button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {active && (
          <>
            <div className="flex h-11 shrink-0 items-center gap-3 border-b border-pulse-border px-4 text-xs">
              <span className="text-pulse-text">Version {active.number}</span>
              <div
                className="ml-auto flex rounded-md border border-pulse-border p-0.5"
                role="radiogroup"
                aria-label="Compare"
              >
                {(["parent", "current"] as const).map((option) => (
                  <button
                    key={option}
                    role="radio"
                    aria-checked={against === option}
                    onClick={() => setAgainst(option)}
                    className={cn(
                      "rounded px-2 py-1",
                      against === option
                        ? "bg-pulse-surface-hover text-pulse-cyan"
                        : "text-pulse-text-muted",
                    )}
                  >
                    {option === "parent" ? "Changes in this version" : "Compare with current files"}
                  </button>
                ))}
              </div>
            </div>
            <div className="min-h-0 flex-1">
              <VersionDiff projectId={projectId} version={active} against={against} />
            </div>
          </>
        )}
      </div>

      <AlertDialog open={Boolean(restoring)} onOpenChange={(open) => !open && setRestoring(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore version {restoring?.number}?</AlertDialogTitle>
            <AlertDialogDescription>
              Project files are rewritten to match “{restoring?.label}”. Your current state is saved
              as a version first, so this can be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void restore()} disabled={pending}>
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4" />
              )}{" "}
              Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function GitTab() {
  const { projectId, busy } = useBuilder();
  const git = useGitState(projectId);
  const diff = useQuery({
    queryKey: ["git-diff", projectId],
    queryFn: () => getGitDiff({ data: { projectId } }),
  });
  const [message, setMessage] = useState("");
  const [committing, setCommitting] = useState(false);

  const commit = async (event: FormEvent) => {
    event.preventDefault();
    setCommitting(true);
    try {
      const result = await commitGitChanges({ data: { projectId, message } });
      if (result.ok) {
        toast.success(`Committed ${result.sha}`);
        setMessage("");
      } else toast.error("Commit failed", { description: result.output });
      void git.refetch();
      void diff.refetch();
    } catch (error) {
      toast.error("Commit failed", { description: errorMessage(error) });
    } finally {
      setCommitting(false);
    }
  };

  if (git.isPending)
    return (
      <div className="p-4">
        <div className="pulse-skeleton h-24" />
      </div>
    );
  const status = git.data?.status;
  if (!status?.initialized) {
    return (
      <EmptyState
        icon={GitBranch}
        title="Not a git repository"
        description="This workspace has no .git directory."
        className="m-6"
      />
    );
  }

  return (
    <div className="flex h-full min-h-0 max-lg:flex-col">
      <aside className="w-80 shrink-0 space-y-5 overflow-y-auto border-r border-pulse-border p-4 max-lg:w-full max-lg:border-r-0">
        <div className="space-y-1 text-xs">
          <p className="flex items-center gap-2 text-pulse-text">
            <GitBranch className="h-3.5 w-3.5 text-pulse-cyan" /> {status.branch ?? "detached"}
            {status.head && (
              <span className="font-mono text-pulse-text-muted">@ {status.head}</span>
            )}
          </p>
          {status.remote && (
            <p className="truncate text-pulse-text-muted">origin: {status.remote}</p>
          )}
          {(status.ahead > 0 || status.behind > 0) && (
            <p className="text-pulse-text-muted">
              {status.ahead} ahead · {status.behind} behind
            </p>
          )}
        </div>
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-pulse-text-muted">
            Changes ({status.entries.length})
          </p>
          {status.entries.length ? (
            <ul className="space-y-1">
              {status.entries.map((entry) => (
                <li key={entry.path} className="flex items-center gap-2 font-mono text-[11px]">
                  <span
                    className={cn(
                      "w-5 text-center",
                      entry.worktree === "?" || entry.index === "A"
                        ? "text-pulse-success"
                        : entry.worktree === "D" || entry.index === "D"
                          ? "text-pulse-danger"
                          : "text-pulse-cyan",
                    )}
                  >
                    {entry.worktree === "?" ? "U" : (entry.index + entry.worktree).trim() || "M"}
                  </span>
                  <span className="truncate text-pulse-text-secondary">{entry.path}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-pulse-text-muted">Working tree clean.</p>
          )}
        </div>
        {status.entries.length > 0 && (
          <form onSubmit={commit} className="space-y-2">
            <Input
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Commit message"
              aria-label="Commit message"
            />
            <Button
              type="submit"
              size="sm"
              className="w-full"
              disabled={!message.trim() || committing || busy}
            >
              {committing ? <Loader2 className="animate-spin" /> : <Save />} Commit all changes
            </Button>
            <p className="text-[11px] text-pulse-text-muted">
              Commits stay local. Pushing to a remote is not wired up yet.
            </p>
          </form>
        )}
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-pulse-text-muted">
            Recent commits
          </p>
          <ul className="space-y-1.5">
            {git.data?.log.map((entry) => (
              <li key={entry.sha} className="text-xs">
                <span className="font-mono text-pulse-magenta">{entry.sha}</span>{" "}
                <span className="text-pulse-text-secondary">{entry.subject}</span>
                <p className="text-[10px] text-pulse-text-muted">
                  {entry.author} · {timeAgo(entry.date)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </aside>
      <div className="min-h-0 min-w-0 flex-1">
        {diff.isPending ? null : (
          <Suspense fallback={null}>
            <DiffViewer diff={diff.data?.diff ?? ""} />
          </Suspense>
        )}
      </div>
    </div>
  );
}

export function HistoryView() {
  const [tab, setTab] = useState<"versions" | "git">("versions");
  return (
    <div className="flex h-full min-h-0 flex-col bg-pulse-bg">
      <div
        className="flex h-11 shrink-0 items-center gap-1 border-b border-pulse-border bg-pulse-bg-elevated px-3"
        role="tablist"
      >
        {(
          [
            ["versions", "Versions", History],
            ["git", "Git", GitBranch],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={cn(
              "pulse-interactive flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs",
              tab === id
                ? "bg-pulse-surface-hover text-pulse-text"
                : "text-pulse-text-muted hover:text-pulse-text",
            )}
          >
            <Icon className="h-3.5 w-3.5" /> {label}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1">{tab === "versions" ? <VersionsTab /> : <GitTab />}</div>
    </div>
  );
}
