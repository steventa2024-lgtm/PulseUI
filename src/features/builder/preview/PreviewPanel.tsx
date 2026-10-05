import {
  ExternalLink,
  Loader2,
  Monitor,
  Play,
  RefreshCw,
  RotateCcw,
  ScrollText,
  Smartphone,
  Sparkles,
  Square,
  Tablet,
  TriangleAlert,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { errorMessage } from "@/lib/client/queries";
import { controlPreview } from "@/lib/server-fns/workspace.functions";
import { cn } from "@/lib/utils";
import { useBuilder } from "../BuilderContext";
import { usePreviewStream } from "./usePreviewStream";

type Device = "desktop" | "tablet" | "mobile";
const WIDTHS: Record<Device, string> = { desktop: "100%", tablet: "768px", mobile: "390px" };

function ToolbarButton({
  label,
  onClick,
  active,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
          aria-pressed={active}
          className={cn(
            "pulse-interactive flex h-7 w-7 items-center justify-center rounded-md text-pulse-text-muted hover:bg-pulse-surface-hover hover:text-pulse-text disabled:opacity-40",
            active && "bg-pulse-surface-hover text-pulse-cyan",
          )}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function PreviewPanel({ className }: { className?: string }) {
  const { projectId, askToFix, busy } = useBuilder();
  const { info, logs } = usePreviewStream(projectId);
  const [device, setDevice] = useState<Device>("desktop");
  const [frameKey, setFrameKey] = useState(0);
  const [showLogs, setShowLogs] = useState(false);
  const [pending, setPending] = useState<"start" | "restart" | "stop" | null>(null);
  const logRef = useRef<HTMLPreElement>(null);

  const status = info?.status ?? "stopped";
  const url = info?.url ?? null;

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs, showLogs]);

  // Reload the frame when a (re)started server becomes ready.
  useEffect(() => {
    if (status === "ready") setFrameKey((key) => key + 1);
  }, [status, info?.startedAt]);

  const control = async (action: "start" | "restart" | "stop") => {
    setPending(action);
    try {
      await controlPreview({ data: { projectId, action } });
    } catch (error) {
      toast.error("Preview action failed", { description: errorMessage(error) });
    } finally {
      setPending(null);
    }
  };

  const booting = status === "installing" || status === "starting";

  return (
    <section
      className={cn("flex h-full min-h-0 flex-col bg-pulse-bg", className)}
      aria-label="Live preview"
    >
      <div className="flex h-11 shrink-0 items-center gap-1.5 border-b border-pulse-border bg-pulse-bg-elevated px-2">
        <ToolbarButton
          label="Refresh"
          onClick={() => setFrameKey((key) => key + 1)}
          disabled={status !== "ready"}
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </ToolbarButton>
        <div className="mx-1 hidden h-7 min-w-0 flex-1 items-center gap-2 rounded-md border border-pulse-border bg-pulse-bg-deep px-2.5 font-mono text-[11px] text-pulse-text-muted sm:flex">
          <span
            className={cn(
              "h-1.5 w-1.5 shrink-0 rounded-full",
              status === "ready"
                ? "bg-pulse-success"
                : booting
                  ? "animate-pulse-blink bg-pulse-cyan"
                  : status === "failed"
                    ? "bg-pulse-danger"
                    : "bg-pulse-text-muted",
            )}
          />
          <span className="truncate">
            {url ??
              (booting
                ? "starting dev server…"
                : status === "failed"
                  ? "preview failed"
                  : "preview stopped")}
          </span>
        </div>
        <div className="ml-auto flex items-center gap-0.5 sm:ml-0">
          <ToolbarButton
            label="Desktop"
            onClick={() => setDevice("desktop")}
            active={device === "desktop"}
          >
            <Monitor className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            label="Tablet (768px)"
            onClick={() => setDevice("tablet")}
            active={device === "tablet"}
          >
            <Tablet className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            label="Mobile (390px)"
            onClick={() => setDevice("mobile")}
            active={device === "mobile"}
          >
            <Smartphone className="h-3.5 w-3.5" />
          </ToolbarButton>
          <span className="mx-1 h-4 w-px bg-pulse-border" />
          <ToolbarButton label="Logs" onClick={() => setShowLogs(!showLogs)} active={showLogs}>
            <ScrollText className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            label="Restart preview"
            onClick={() => void control("restart")}
            disabled={Boolean(pending) || booting}
          >
            <RotateCcw className={cn("h-3.5 w-3.5", pending === "restart" && "animate-spin")} />
          </ToolbarButton>
          {status === "ready" || booting ? (
            <ToolbarButton
              label="Stop preview"
              onClick={() => void control("stop")}
              disabled={Boolean(pending)}
            >
              <Square className="h-3 w-3" />
            </ToolbarButton>
          ) : (
            <ToolbarButton
              label="Start preview"
              onClick={() => void control("start")}
              disabled={Boolean(pending)}
            >
              <Play className="h-3.5 w-3.5" />
            </ToolbarButton>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <a
                href={url ?? undefined}
                target="_blank"
                rel="noreferrer"
                aria-label="Open in new tab"
                aria-disabled={!url}
                className={cn(
                  "pulse-interactive flex h-7 w-7 items-center justify-center rounded-md text-pulse-text-muted hover:bg-pulse-surface-hover hover:text-pulse-text",
                  !url && "pointer-events-none opacity-40",
                )}
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </TooltipTrigger>
            <TooltipContent>Open external</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-auto bg-[radial-gradient(circle_at_50%_0%,rgb(36_124_255/0.06),transparent_60%)]">
        {status === "ready" && url ? (
          <div
            className="flex h-full justify-center p-0 data-[device=desktop]:p-0 sm:p-3"
            data-device={device}
          >
            <iframe
              key={frameKey}
              src={url}
              title="Project preview"
              // Different origin (its own port), so same-origin here never reaches PulseUI.
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads"
              className={cn(
                "h-full bg-white transition-[width] duration-300 ease-pulse",
                device !== "desktop" &&
                  "rounded-[var(--pulse-radius-lg)] border border-pulse-border-strong shadow-panel",
              )}
              style={{ width: WIDTHS[device], maxWidth: "100%" }}
            />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center p-6">
            {booting ? (
              <div className="w-full max-w-md text-center">
                <div className="relative mx-auto mb-5 h-14 w-14">
                  <div className="absolute inset-0 animate-ping rounded-full bg-pulse-cyan/10" />
                  <div className="relative flex h-14 w-14 items-center justify-center rounded-full border border-pulse-cyan/30 bg-pulse-cyan/10">
                    <Loader2 className="h-6 w-6 animate-spin text-pulse-cyan" />
                  </div>
                </div>
                <p className="font-display text-base font-semibold text-pulse-text">
                  {status === "installing" ? "Installing dependencies" : "Starting the dev server"}
                </p>
                <p className="mt-1 text-xs text-pulse-text-secondary">
                  {info?.command ?? "Preparing the project…"}
                </p>
                <pre className="mt-4 max-h-36 overflow-hidden rounded-md border border-pulse-border bg-pulse-bg-deep p-3 text-left font-mono text-[10.5px] leading-relaxed text-pulse-text-muted">
                  {logs.slice(-8).join("\n") || " "}
                </pre>
              </div>
            ) : status === "failed" ? (
              <div
                className="w-full max-w-lg rounded-[var(--pulse-radius-lg)] border border-pulse-danger/35 bg-pulse-danger/[0.05] p-5"
                role="alert"
              >
                <p className="flex items-center gap-2 font-medium text-pulse-danger">
                  <TriangleAlert className="h-4 w-4" /> Preview failed
                </p>
                <p className="mt-2 text-sm text-pulse-text-secondary">
                  {info?.error ?? "The dev server stopped."}
                </p>
                <pre className="mt-3 max-h-48 overflow-auto rounded-md border border-pulse-border bg-pulse-bg-deep p-3 font-mono text-[10.5px] text-pulse-text-muted whitespace-pre-wrap">
                  {logs.slice(-30).join("\n")}
                </pre>
                <div className="mt-4 flex gap-2">
                  <Button
                    size="sm"
                    onClick={() =>
                      askToFix(
                        `Preview error: ${info?.error ?? ""}\n\nDev server output:\n${logs.slice(-60).join("\n")}`,
                      )
                    }
                    disabled={busy}
                  >
                    <Sparkles /> Ask Pulse to Fix
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void control("restart")}
                    disabled={Boolean(pending)}
                  >
                    <RotateCcw /> Restart Preview
                  </Button>
                </div>
              </div>
            ) : busy ? (
              <div className="text-center">
                <Loader2 className="mx-auto mb-3 h-7 w-7 animate-spin text-pulse-cyan" />
                <p className="text-sm text-pulse-text">Pulse is working on the project.</p>
                <p className="mt-1 text-xs text-pulse-text-secondary">
                  The preview starts once the build has been validated.
                </p>
              </div>
            ) : (
              <div className="text-center">
                <Monitor className="mx-auto mb-3 h-8 w-8 text-pulse-text-muted" />
                <p className="text-sm text-pulse-text">The preview is not running.</p>
                <p className="mt-1 text-xs text-pulse-text-secondary">
                  Start the project's dev server to see it live.
                </p>
                <Button
                  className="mt-4"
                  size="sm"
                  onClick={() => void control("start")}
                  disabled={Boolean(pending)}
                >
                  {pending === "start" ? <Loader2 className="animate-spin" /> : <Play />} Start
                  preview
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {showLogs && (
        <div className="h-48 shrink-0 border-t border-pulse-border bg-pulse-bg-deep">
          <div className="flex h-8 items-center justify-between border-b border-pulse-border px-3 text-[11px] text-pulse-text-muted">
            <span>Dev server output {info?.command ? `· ${info.command}` : ""}</span>
          </div>
          <pre
            ref={logRef}
            className="h-[calc(100%-2rem)] overflow-auto p-3 font-mono text-[11px] leading-relaxed text-pulse-text-secondary"
          >
            {logs.join("\n") || "No output yet."}
          </pre>
        </div>
      )}
    </section>
  );
}
