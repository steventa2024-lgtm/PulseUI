import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  ArrowLeft,
  Code2,
  Database,
  History,
  Monitor,
  Rocket,
  SlidersHorizontal,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { useDefaultLayout } from "react-resizable-panels";

import { PulseMark } from "@/components/shared/PulseLogo";
import { useMediaQuery } from "@/hooks/use-media-query";
import { StatusDot } from "@/components/shared/StatusDot";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { FRAMEWORK_LABELS } from "@/lib/format";
import { cn } from "@/lib/utils";
import { AgentPanel } from "./agent/AgentPanel";
import { BuilderProvider, useBuilder } from "./BuilderContext";

type Tab = { id: string; to: string; label: string; icon: LucideIcon };

const TABS: Tab[] = [
  { id: "build", to: "/projects/$projectId", label: "Build", icon: Sparkles },
  { id: "code", to: "/projects/$projectId/code", label: "Code", icon: Code2 },
  { id: "preview", to: "/projects/$projectId/preview", label: "Preview", icon: Monitor },
  { id: "data", to: "/projects/$projectId/data", label: "Data", icon: Database },
  { id: "history", to: "/projects/$projectId/history", label: "History", icon: History },
  { id: "deploy", to: "/projects/$projectId/deploy", label: "Deploy", icon: Rocket },
  {
    id: "settings",
    to: "/projects/$projectId/settings",
    label: "Settings",
    icon: SlidersHorizontal,
  },
];

function activeTab(pathname: string, projectId: string): string {
  const rest = pathname.replace(`/projects/${projectId}`, "").replace(/^\//, "").split("/")[0];
  return rest || "build";
}

const storage = {
  getItem: (key: string) => {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string) => {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Storage unavailable.
    }
  },
};

function TopBar({ tab }: { tab: string }) {
  const { project, projectId, busy } = useBuilder();
  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-pulse-border bg-pulse-bg-elevated px-3">
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            to="/"
            className="pulse-interactive flex items-center gap-1 rounded-md p-1 text-pulse-text-muted hover:bg-pulse-surface-hover hover:text-pulse-text"
            aria-label="Back to PulseUI home"
          >
            <ArrowLeft className="h-4 w-4" />
            <PulseMark className="h-6 w-6" />
          </Link>
        </TooltipTrigger>
        <TooltipContent>Home</TooltipContent>
      </Tooltip>
      <span className="h-5 w-px bg-pulse-border" />
      {project ? (
        <div className="flex min-w-0 items-center gap-2">
          <StatusDot
            tone={
              busy
                ? "running"
                : project.status === "error"
                  ? "error"
                  : project.previewStatus === "ready"
                    ? "ready"
                    : "idle"
            }
          />
          <h1 className="truncate text-sm font-medium text-pulse-text">{project.name}</h1>
          <span className="hidden rounded border border-pulse-border px-1.5 py-0.5 text-[10px] text-pulse-text-muted sm:inline">
            {FRAMEWORK_LABELS[project.framework] ?? project.framework}
          </span>
        </div>
      ) : (
        <div className="pulse-skeleton h-4 w-40" />
      )}
      <div className="ml-auto flex items-center gap-2">
        <Link
          to="/projects/$projectId/deploy"
          params={{ projectId }}
          className={cn(
            "pulse-interactive pulse-border-glow flex h-8 items-center gap-2 rounded-[var(--pulse-radius-md)] bg-pulse-surface px-3 text-sm font-medium hover:shadow-glow-magenta",
            tab === "deploy" && "shadow-glow-magenta",
          )}
          data-active={tab === "deploy" || undefined}
        >
          <Rocket className="h-4 w-4 text-pulse-pink" />
          <span className="pulse-text-deploy">Deploy</span>
        </Link>
      </div>
    </header>
  );
}

function Nav({
  tab,
  projectId,
  orientation,
}: {
  tab: string;
  projectId: string;
  orientation: "vertical" | "horizontal";
}) {
  const vertical = orientation === "vertical";
  return (
    <nav
      aria-label="Project"
      className={cn(
        vertical
          ? "flex w-[60px] shrink-0 flex-col items-center gap-1 border-r border-pulse-border bg-pulse-bg-elevated py-2"
          : "flex h-14 shrink-0 items-stretch justify-around border-t border-pulse-border bg-pulse-bg-elevated",
      )}
    >
      {TABS.map((item) => {
        const active = tab === item.id;
        const link = (
          <Link
            key={item.id}
            to={item.to}
            params={{ projectId }}
            aria-current={active ? "page" : undefined}
            aria-label={item.label}
            className={cn(
              "pulse-interactive relative flex flex-col items-center justify-center gap-0.5 text-[10px]",
              vertical ? "h-11 w-11 rounded-[var(--pulse-radius-md)]" : "flex-1",
              active
                ? "bg-pulse-surface-hover text-pulse-cyan"
                : "text-pulse-text-muted hover:bg-pulse-surface-raised hover:text-pulse-text",
            )}
          >
            {active && vertical && (
              <span className="absolute -left-2 inset-y-2.5 w-0.5 rounded-full bg-pulse-cyan shadow-[0_0_10px_var(--pulse-cyan)]" />
            )}
            <item.icon className="h-4 w-4" />
            <span className={vertical ? "sr-only" : ""}>{item.label}</span>
          </Link>
        );
        if (!vertical) return link;
        return (
          <Tooltip key={item.id}>
            <TooltipTrigger asChild>{link}</TooltipTrigger>
            <TooltipContent side="right">{item.label}</TooltipContent>
          </Tooltip>
        );
      })}
    </nav>
  );
}

function Workspace() {
  const { projectId, busy } = useBuilder();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const tab = activeTab(pathname, projectId);
  const maximized = tab === "preview";
  const [mobilePane, setMobilePane] = useState<"agent" | "view">("agent");
  const layout = useDefaultLayout({
    id: "pulseui-builder",
    panelIds: ["agent", "workspace"],
    storage,
  });
  const desktop = useMediaQuery("(min-width: 1024px)");

  return (
    <div className="flex h-dvh flex-col bg-pulse-bg">
      <TopBar tab={tab} />
      <div className="flex min-h-0 flex-1">
        {desktop && <Nav tab={tab} projectId={projectId} orientation="vertical" />}
        <main className="min-w-0 flex-1">
          {desktop ? (
            maximized ? (
              <Outlet />
            ) : (
              <ResizablePanelGroup
                orientation="horizontal"
                defaultLayout={layout.defaultLayout}
                onLayoutChanged={layout.onLayoutChanged}
              >
                <ResizablePanel id="agent" defaultSize="34" minSize="24" maxSize="60">
                  <AgentPanel />
                </ResizablePanel>
                <ResizableHandle />
                <ResizablePanel id="workspace" minSize="30">
                  <Outlet />
                </ResizablePanel>
              </ResizablePanelGroup>
            )
          ) : (
            <div className="flex h-full flex-col">
              {!maximized && (
                <div
                  className="flex shrink-0 gap-1 border-b border-pulse-border bg-pulse-bg-elevated p-1.5"
                  role="tablist"
                  aria-label="Pane"
                >
                  {(["agent", "view"] as const).map((pane) => (
                    <button
                      key={pane}
                      role="tab"
                      aria-selected={mobilePane === pane}
                      onClick={() => setMobilePane(pane)}
                      className={cn(
                        "flex-1 rounded-md py-1.5 text-xs font-medium",
                        mobilePane === pane
                          ? "bg-pulse-surface-hover text-pulse-text"
                          : "text-pulse-text-muted",
                      )}
                    >
                      {pane === "agent" ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Sparkles className="h-3.5 w-3.5" /> Pulse{" "}
                          {busy && (
                            <span className="h-1.5 w-1.5 animate-pulse-blink rounded-full bg-pulse-cyan" />
                          )}
                        </span>
                      ) : (
                        (TABS.find((item) => item.id === tab)?.label ?? "View")
                      )}
                    </button>
                  ))}
                </div>
              )}
              <div className="min-h-0 flex-1">
                {!maximized && mobilePane === "agent" ? <AgentPanel /> : <Outlet />}
              </div>
            </div>
          )}
        </main>
      </div>
      {!desktop && <Nav tab={tab} projectId={projectId} orientation="horizontal" />}
    </div>
  );
}

export function BuilderLayout({ projectId }: { projectId: string }) {
  return (
    <BuilderProvider projectId={projectId}>
      <Workspace />
    </BuilderProvider>
  );
}
