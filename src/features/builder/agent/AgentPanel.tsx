import { FileText, ImageIcon, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";

import { Badge } from "@/components/ui/badge";
import { PulseComposer } from "@/features/composer/PulseComposer";
import { useConversation } from "@/lib/client/queries";
import { STATE_LABELS } from "@/lib/client/run-events";
import type { AgentRun, ChatMessage } from "@/lib/domain/types";
import { getTemplate } from "@/lib/templates/registry";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useBuilder } from "../BuilderContext";
import { BuildErrorCard } from "./BuildErrorCard";
import { FilesChanged } from "./FilesChanged";
import { MessageText } from "./MessageText";
import { RunActivity } from "./RunActivity";
import { RunTimeline } from "./RunTimeline";

function toolCount(items: Array<{ kind: string }>): string {
  const count = items.filter((item) => item.kind === "tool").length;
  return `${count} tool call${count === 1 ? "" : "s"}`;
}

function UserMessage({ message }: { message: ChatMessage }) {
  return (
    <div className="ml-auto max-w-[92%] rounded-[var(--pulse-radius-lg)] rounded-br-sm border border-pulse-blue/25 bg-pulse-blue/10 px-3.5 py-2.5">
      <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-pulse-text">
        {message.content}
      </p>
      {message.attachments.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {message.attachments.map((attachment) => (
            <span
              key={attachment.name}
              className="flex items-center gap-1 rounded bg-pulse-surface-overlay px-1.5 py-0.5 text-[11px] text-pulse-text-secondary"
            >
              {attachment.kind === "image" ? (
                <ImageIcon className="h-3 w-3" />
              ) : (
                <FileText className="h-3 w-3" />
              )}
              {attachment.name}
            </span>
          ))}
        </div>
      )}
      <div className="mt-1.5 flex items-center justify-end gap-2 text-[10px] text-pulse-text-muted">
        {message.metadata.mode === "plan" && <Badge variant="magenta">Plan</Badge>}
        <span>{timeAgo(message.createdAt)}</span>
      </div>
    </div>
  );
}

export function AgentPanel({ className }: { className?: string }) {
  const { projectId, project, run, activeRunId, busy, send, stop, askToFix } = useBuilder();
  const conversation = useConversation(projectId);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messages = conversation.data?.messages ?? [];
  const runs = useMemo(
    () =>
      new Map<string, AgentRun>((conversation.data?.runs ?? []).map((entry) => [entry.id, entry])),
    [conversation.data?.runs],
  );
  const answered = new Set(
    messages.filter((message) => message.role === "assistant").map((message) => message.runId),
  );
  const latestFailed =
    conversation.data?.runs.find((entry) => entry.kind === "agent")?.state === "failed"
      ? conversation.data?.runs.find((entry) => entry.kind === "agent")
      : undefined;
  const template = project?.templateId ? getTemplate(project.templateId) : undefined;

  // Stick to the bottom while new content streams in, unless the user scrolled up.
  const contentSize =
    messages.length + (run?.items.length ?? 0) + (run?.items.at(-1)?.kind === "text" ? 1 : 0);
  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    const nearBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 160;
    if (nearBottom) element.scrollTop = element.scrollHeight;
  }, [contentSize, run?.items]);

  const setupRunActive = run && !run.finished && run.mode === "setup";

  return (
    <section
      className={cn("flex h-full min-h-0 flex-col bg-pulse-bg-elevated", className)}
      aria-label="Pulse agent"
    >
      <header className="flex h-11 shrink-0 items-center gap-2 border-b border-pulse-border px-4">
        <Sparkles className="h-4 w-4 text-pulse-cyan" />
        <h2 className="font-display text-sm font-semibold text-pulse-text">Pulse</h2>
        {busy && run ? (
          <Badge variant="default" className="ml-1">
            <span className="h-1.5 w-1.5 animate-pulse-blink rounded-full bg-pulse-cyan" />{" "}
            {STATE_LABELS[run.state]}
          </Badge>
        ) : null}
        {run?.model && (
          <span className="ml-auto truncate text-[11px] text-pulse-text-muted">{run.model}</span>
        )}
      </header>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4"
        aria-live="polite"
      >
        {conversation.isPending && (
          <div className="space-y-3">
            <div className="pulse-skeleton ml-auto h-14 w-3/4" />
            <div className="pulse-skeleton h-24 w-full" />
          </div>
        )}

        {!conversation.isPending && !messages.length && !run && (
          <div className="rounded-[var(--pulse-radius-lg)] border border-dashed border-pulse-border-strong p-5 text-center">
            <Sparkles className="mx-auto mb-2 h-5 w-5 text-pulse-cyan" />
            <p className="text-sm text-pulse-text">Tell Pulse what to build or change.</p>
            <p className="mt-1 text-xs text-pulse-text-secondary">
              Pulse reads your files, edits them, runs the build and refreshes the preview.
            </p>
            {template && (
              <button
                type="button"
                onClick={() =>
                  void send({
                    prompt: template.suggestion,
                    mode: "build",
                    modelId: null,
                    attachments: [],
                  })
                }
                className="pulse-interactive mt-3 rounded-full border border-pulse-cyan/30 bg-pulse-cyan/10 px-3 py-1 text-xs text-pulse-cyan hover:bg-pulse-cyan/15"
              >
                Try: {template.suggestion}
              </button>
            )}
          </div>
        )}

        {setupRunActive && (
          <div className="rounded-[var(--pulse-radius-lg)] border border-pulse-border bg-pulse-surface p-3">
            <p className="mb-2 text-xs font-medium text-pulse-text">Setting up project</p>
            <RunTimeline view={run} />
          </div>
        )}

        {messages.map((message) => {
          if (message.role === "user") {
            const showLive = run && message.runId === run.runId && !answered.has(run.runId);
            return (
              <div key={message.id} className="space-y-3">
                <UserMessage message={message} />
                {showLive && (
                  <div className="rounded-[var(--pulse-radius-lg)] border border-pulse-border bg-pulse-surface p-3">
                    <RunTimeline view={run} />
                  </div>
                )}
              </div>
            );
          }
          if (message.role !== "assistant") return null;
          const runInfo = message.runId ? runs.get(message.runId) : undefined;
          const isLatestFailure = latestFailed && runInfo?.id === latestFailed.id;
          const liveView = run && run.runId === message.runId ? run : null;
          return (
            <div key={message.id} className="space-y-2.5">
              <div className="flex items-center gap-2 text-[11px] text-pulse-text-muted">
                <span className="flex h-5 w-5 items-center justify-center rounded-md bg-pulse-cyan/10">
                  <Sparkles className="h-3 w-3 text-pulse-cyan" />
                </span>
                <span className="font-medium text-pulse-text-secondary">Pulse</span>
                {runInfo && runInfo.state !== "completed" && (
                  <Badge variant={runInfo.state === "failed" ? "destructive" : "secondary"}>
                    {STATE_LABELS[runInfo.state]}
                  </Badge>
                )}
                <span className="ml-auto">{timeAgo(message.createdAt)}</span>
              </div>
              {liveView ? (
                <details className="group rounded-[var(--pulse-radius-md)] border border-pulse-border bg-pulse-surface/60 px-3 py-2">
                  <summary className="cursor-pointer list-none text-[11px] text-pulse-text-muted">
                    Activity · {toolCount(liveView.items)}
                  </summary>
                  <div className="mt-2">
                    <RunTimeline view={liveView} />
                  </div>
                </details>
              ) : null}
              <MessageText text={message.content} />
              {message.metadata.filesChanged && (
                <FilesChanged changes={message.metadata.filesChanged} />
              )}
              {runInfo?.state === "failed" && runInfo.error && (
                <BuildErrorCard
                  title={
                    /build|typecheck|tsc|vite/i.test(runInfo.error)
                      ? "Build failed"
                      : "Pulse hit an error"
                  }
                  output={runInfo.error}
                  {...(isLatestFailure ? { onFix: () => askToFix(runInfo.error ?? ""), busy } : {})}
                />
              )}
              {message.runId && !liveView && <RunActivity runId={message.runId} />}
            </div>
          );
        })}
      </div>

      <div className="shrink-0 border-t border-pulse-border p-3">
        <PulseComposer
          variant="compact"
          placeholder={busy ? "Pulse is working…" : "Ask Pulse to change something…"}
          busy={busy}
          onStop={() => void stop()}
          allowGitHubImport={false}
          disabledReason={busy ? null : null}
          onSubmit={(input) => send(input)}
        />
        {activeRunId && !busy && <span className="sr-only">Run finished</span>}
      </div>
    </section>
  );
}
