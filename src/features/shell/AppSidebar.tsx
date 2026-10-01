import { Link, useRouterState } from "@tanstack/react-router";
import {
  BookOpen,
  FolderKanban,
  LayoutTemplate,
  PanelLeftClose,
  PanelLeftOpen,
  Plug,
  Plus,
  Search,
  Settings,
  type LucideIcon,
} from "lucide-react";

import { PulseLogo } from "@/components/shared/PulseLogo";
import { StatusDot } from "@/components/shared/StatusDot";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useProjects } from "@/lib/client/queries";
import { cn } from "@/lib/utils";

type NavItem = { to: string; label: string; icon: LucideIcon; exact?: boolean };

const NAV: NavItem[] = [
  { to: "/search", label: "Search", icon: Search },
  { to: "/templates", label: "Templates", icon: LayoutTemplate },
  { to: "/projects", label: "Projects", icon: FolderKanban, exact: true },
  { to: "/connections", label: "Connections", icon: Plug },
];

const DOCS_URL = "https://github.com/steventa2024-lgtm/PulseUI#readme";

function NavLink({
  item,
  collapsed,
  active,
}: {
  item: NavItem;
  collapsed: boolean;
  active: boolean;
}) {
  const link = (
    <Link
      to={item.to}
      aria-current={active ? "page" : undefined}
      className={cn(
        "pulse-interactive group relative flex h-9 items-center gap-3 rounded-[var(--pulse-radius-md)] px-3 text-sm",
        active
          ? "bg-pulse-surface-hover text-pulse-text"
          : "text-pulse-text-secondary hover:bg-pulse-surface-raised hover:text-pulse-text",
        collapsed && "justify-center px-0",
      )}
    >
      {active && (
        <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-pulse-cyan shadow-[0_0_10px_var(--pulse-cyan)]" />
      )}
      <item.icon className={cn("h-4 w-4 shrink-0", active ? "text-pulse-cyan" : "")} aria-hidden />
      {!collapsed && <span>{item.label}</span>}
    </Link>
  );
  if (!collapsed) return link;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
}

export function AppSidebar({
  collapsed,
  onToggle,
  className,
  onNavigate,
}: {
  collapsed: boolean;
  onToggle?: () => void;
  className?: string;
  onNavigate?: () => void;
}) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const projects = useProjects();
  const recent = projects.data?.slice(0, 8) ?? [];

  return (
    <nav
      aria-label="Main"
      onClick={(event) => {
        if ((event.target as HTMLElement).closest("a")) onNavigate?.();
      }}
      className={cn(
        "flex h-full flex-col border-r border-pulse-border bg-pulse-bg-elevated/95 backdrop-blur-xl",
        collapsed ? "w-[68px] px-2" : "w-[248px] px-3",
        "transition-[width] duration-[var(--pulse-duration-panel)] ease-pulse",
        className,
      )}
    >
      <div
        className={cn(
          "flex h-16 items-center",
          collapsed ? "justify-center" : "justify-between px-1",
        )}
      >
        <Link to="/" aria-label="PulseUI home">
          <PulseLogo collapsed={collapsed} />
        </Link>
        {onToggle && !collapsed && (
          <button
            onClick={onToggle}
            className="pulse-interactive rounded-md p-1.5 text-pulse-text-muted hover:bg-pulse-surface-hover hover:text-pulse-text"
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}
      </div>

      <Link
        to="/"
        className={cn(
          "pulse-interactive pulse-border-glow mb-4 mt-1 flex h-10 items-center gap-2 rounded-[var(--pulse-radius-md)] bg-pulse-surface-raised text-sm font-medium text-pulse-text hover:bg-pulse-surface-hover hover:shadow-glow-blue",
          collapsed ? "justify-center" : "px-3",
        )}
        aria-label="New project"
      >
        <Plus className="h-4 w-4 text-pulse-cyan" aria-hidden />
        {!collapsed && "New Project"}
      </Link>

      <div className="space-y-0.5">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            item={item}
            collapsed={collapsed}
            active={item.exact ? pathname === item.to : pathname.startsWith(item.to)}
          />
        ))}
      </div>

      {!collapsed && (
        <div className="mt-7 min-h-0 flex-1 overflow-y-auto">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-pulse-text-muted">
            Recent
          </p>
          {projects.isPending && (
            <div className="space-y-2 px-3">
              {[0, 1, 2].map((index) => (
                <div key={index} className="pulse-skeleton h-6" />
              ))}
            </div>
          )}
          {!projects.isPending && !recent.length && (
            <p className="px-3 text-xs leading-relaxed text-pulse-text-muted">
              Projects you create will appear here.
            </p>
          )}
          <ul className="space-y-0.5">
            {recent.map((project) => {
              const active = pathname.startsWith(`/projects/${project.id}`);
              return (
                <li key={project.id}>
                  <Link
                    to="/projects/$projectId"
                    params={{ projectId: project.id }}
                    className={cn(
                      "pulse-interactive flex h-8 items-center gap-2.5 rounded-[var(--pulse-radius-sm)] px-3 text-[13px]",
                      active
                        ? "bg-pulse-surface-hover text-pulse-text"
                        : "text-pulse-text-secondary hover:bg-pulse-surface-raised hover:text-pulse-text",
                    )}
                  >
                    <StatusDot
                      tone={
                        project.status === "running"
                          ? "running"
                          : project.status === "error"
                            ? "error"
                            : "idle"
                      }
                    />
                    <span className="truncate">{project.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {collapsed && <div className="flex-1" />}

      <div className="space-y-0.5 border-t border-pulse-border py-3">
        <NavLink
          item={{ to: "/settings", label: "Settings", icon: Settings }}
          collapsed={collapsed}
          active={pathname.startsWith("/settings")}
        />
        <a
          href={DOCS_URL}
          target="_blank"
          rel="noreferrer"
          className={cn(
            "pulse-interactive flex h-9 items-center gap-3 rounded-[var(--pulse-radius-md)] px-3 text-sm text-pulse-text-secondary hover:bg-pulse-surface-raised hover:text-pulse-text",
            collapsed && "justify-center px-0",
          )}
          aria-label="Documentation"
        >
          <BookOpen className="h-4 w-4" aria-hidden />
          {!collapsed && "Documentation"}
        </a>
        {onToggle && collapsed && (
          <button
            onClick={onToggle}
            className="pulse-interactive flex h-9 w-full items-center justify-center rounded-[var(--pulse-radius-md)] text-pulse-text-muted hover:bg-pulse-surface-raised hover:text-pulse-text"
            aria-label="Expand sidebar"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        )}
      </div>
    </nav>
  );
}
