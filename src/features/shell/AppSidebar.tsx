import { Link, useRouterState } from "@tanstack/react-router";
import {
  ChevronRight,
  CirclePlus,
  Crown,
  Folder,
  LayoutGrid,
  Link2,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  SquareSquare,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";

import { PulseLogo } from "@/components/shared/PulseLogo";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useProjects } from "@/lib/client/queries";
import { cn } from "@/lib/utils";
import { PlansDialog } from "./PlansDialog";

type NavItem = { to: string; label: string; icon: LucideIcon; exact?: boolean };

const NAV: NavItem[] = [
  { to: "/search", label: "Search", icon: Search },
  { to: "/templates", label: "Templates", icon: LayoutGrid },
  { to: "/projects", label: "Projects", icon: Folder, exact: true },
  { to: "/connections", label: "Connections", icon: Link2 },
];

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
        "pulse-interactive flex h-11 items-center gap-3.5 rounded-xl px-3 text-[15.5px]",
        active
          ? "bg-white/[0.06] text-white"
          : "text-pulse-text/90 hover:bg-white/[0.04] hover:text-white",
        collapsed && "justify-center px-0",
      )}
    >
      <item.icon
        className="h-5 w-5 shrink-0 text-pulse-text-secondary"
        strokeWidth={1.75}
        aria-hidden
      />
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
  const recent = projects.data?.slice(0, 6) ?? [];
  const [plansOpen, setPlansOpen] = useState(false);

  return (
    <nav
      aria-label="Main"
      onClick={(event) => {
        if ((event.target as HTMLElement).closest("a")) onNavigate?.();
      }}
      className={cn(
        "group/sidebar flex h-full flex-col border-r border-white/[0.07] bg-[#070c16]/80",
        collapsed ? "w-[76px] px-2.5" : "w-[248px] px-4",
        "transition-[width] duration-[var(--pulse-duration-panel)] ease-pulse",
        className,
      )}
    >
      <div
        className={cn("relative flex h-[84px] items-center", collapsed ? "justify-center" : "px-1")}
      >
        <Link to="/" aria-label="PulseUI home">
          <PulseLogo collapsed={collapsed} />
        </Link>
        {onToggle && !collapsed && (
          <button
            onClick={onToggle}
            className="pulse-interactive absolute right-0 rounded-md p-1.5 text-pulse-text-muted opacity-0 hover:bg-white/5 hover:text-white focus-visible:opacity-100 group-hover/sidebar:opacity-100"
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}
      </div>

      <Link
        to="/"
        aria-label="New project"
        className={cn(
          "pulse-interactive mb-5 flex h-12 items-center gap-3 rounded-xl text-[15.5px] font-medium text-white",
          "bg-[linear-gradient(180deg,#2a7bff_0%,#1b5ff2_100%)] shadow-[0_0_0_1px_rgb(90_160_255/0.55),0_8px_28px_-8px_rgb(36_124_255/0.85),inset_0_1px_0_rgb(255_255_255/0.25)]",
          "hover:brightness-110",
          collapsed ? "justify-center" : "px-3.5",
        )}
      >
        <CirclePlus className="h-5 w-5 fill-white text-[#1b5ff2]" strokeWidth={2.25} aria-hidden />
        {!collapsed && "New Project"}
      </Link>

      <div className="space-y-1">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            item={item}
            collapsed={collapsed}
            active={item.exact ? pathname === item.to : pathname.startsWith(item.to)}
          />
        ))}
      </div>

      <div className={cn("my-5 h-px bg-white/[0.07]", collapsed && "mx-1")} />

      {!collapsed ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <p className="mb-2 px-2.5 text-sm text-pulse-text-secondary">Recent</p>
          {projects.isPending && (
            <div className="space-y-2.5 px-2.5">
              {[0, 1, 2].map((index) => (
                <div key={index} className="pulse-skeleton h-6" />
              ))}
            </div>
          )}
          {!projects.isPending && !recent.length && (
            <p className="px-2.5 text-xs leading-relaxed text-pulse-text-muted">
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
                      "pulse-interactive flex h-10 items-center gap-3 rounded-lg px-2.5 text-[14.5px]",
                      active
                        ? "bg-white/[0.06] text-white"
                        : "text-pulse-text/90 hover:bg-white/[0.04] hover:text-white",
                    )}
                  >
                    <SquareSquare
                      className={cn(
                        "h-[18px] w-[18px] shrink-0",
                        project.status === "running"
                          ? "animate-pulse-blink text-pulse-cyan"
                          : "text-pulse-text-secondary",
                      )}
                      strokeWidth={1.6}
                      aria-hidden
                    />
                    <span className="truncate">{project.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <div className="flex-1" />
      )}

      <div className="py-4">
        {onToggle && collapsed && (
          <button
            onClick={onToggle}
            className="pulse-interactive mb-2 flex h-10 w-full items-center justify-center rounded-lg text-pulse-text-muted hover:bg-white/5 hover:text-white"
            aria-label="Expand sidebar"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        )}
        <button
          type="button"
          onClick={() => setPlansOpen(true)}
          className={cn(
            "pulse-interactive flex h-[52px] w-full items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.04] text-[15px] font-medium text-white hover:border-white/15 hover:bg-white/[0.07]",
            collapsed ? "justify-center" : "px-3.5",
          )}
          aria-label="Upgrade to Pro"
        >
          <Crown className="h-5 w-5 fill-[#ffc53d] text-[#ffb020]" aria-hidden />
          {!collapsed && (
            <>
              <span>Upgrade to Pro</span>
              <ChevronRight className="ml-auto h-4 w-4 text-pulse-text-secondary" />
            </>
          )}
        </button>
      </div>
      <PlansDialog open={plansOpen} onOpenChange={setPlansOpen} />
    </nav>
  );
}
