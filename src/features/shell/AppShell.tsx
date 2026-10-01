import { Link } from "@tanstack/react-router";
import { Command, Menu, Sparkles, TriangleAlert } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { PulseLogo } from "@/components/shared/PulseLogo";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useModels } from "@/lib/client/queries";
import { cn } from "@/lib/utils";
import { AppSidebar } from "./AppSidebar";
import { useCommandPalette } from "./command-palette";

const COLLAPSE_KEY = "pulseui.sidebar.collapsed";

function readCollapsed(): boolean {
  try {
    return window.localStorage.getItem(COLLAPSE_KEY) === "1";
  } catch {
    return false;
  }
}

/** Shows the real model in use, or a call to action when nothing is configured. */
export function ModelStatusChip({ className }: { className?: string }) {
  const models = useModels();
  if (models.isLoading)
    return <div className={cn("pulse-skeleton h-8 w-36 rounded-full", className)} />;
  const current = models.data?.models.find((model) => model.id === models.data?.defaultModelId);
  if (!current) {
    return (
      <Link
        to="/connections"
        className={cn(
          "pulse-interactive flex h-8 items-center gap-2 rounded-full border border-pulse-warning/30 bg-pulse-warning/10 px-3 text-xs font-medium text-pulse-warning hover:bg-pulse-warning/15",
          className,
        )}
      >
        <TriangleAlert className="h-3.5 w-3.5" /> Configure AI
      </Link>
    );
  }
  return (
    <Link
      to="/connections"
      className={cn(
        "pulse-interactive flex h-8 max-w-[240px] items-center gap-2 rounded-full border border-pulse-border-strong bg-pulse-surface/70 px-3 text-xs text-pulse-text-secondary backdrop-blur hover:border-pulse-cyan/40 hover:text-pulse-text",
        className,
      )}
      title={`${current.providerLabel} · ${current.model}`}
    >
      <Sparkles className="h-3.5 w-3.5 shrink-0 text-pulse-cyan" />
      <span className="truncate">
        {current.providerLabel} · {current.model}
      </span>
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const palette = useCommandPalette();

  useEffect(() => setCollapsed(readCollapsed()), []);

  const toggle = () => {
    setCollapsed((value) => {
      try {
        window.localStorage.setItem(COLLAPSE_KEY, value ? "0" : "1");
      } catch {
        // Storage unavailable; keep in-memory state.
      }
      return !value;
    });
  };

  return (
    <div className="flex h-dvh overflow-hidden bg-pulse-bg">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-pulse-surface-raised focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <AppSidebar collapsed={collapsed} onToggle={toggle} className="hidden lg:flex" />

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          className="w-[260px] border-pulse-border bg-pulse-bg-elevated p-0"
        >
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <AppSidebar
            collapsed={false}
            className="w-full border-r-0"
            onNavigate={() => setMobileOpen(false)}
          />
        </SheetContent>
      </Sheet>

      <div className="relative flex min-w-0 flex-1 flex-col">
        <header className="absolute inset-x-0 top-0 z-20 flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-3 lg:invisible">
            <button
              onClick={() => setMobileOpen(true)}
              className="pulse-interactive rounded-md p-2 text-pulse-text-secondary hover:bg-pulse-surface-hover lg:hidden"
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Link to="/" className="lg:hidden" aria-label="PulseUI home">
              <PulseLogo />
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={palette.open}
              className="pulse-interactive hidden h-8 items-center gap-2 rounded-full border border-pulse-border-strong bg-pulse-surface/70 px-3 text-xs text-pulse-text-secondary backdrop-blur hover:border-pulse-cyan/40 hover:text-pulse-text sm:flex"
              aria-label="Open command palette"
            >
              <Command className="h-3.5 w-3.5" /> Command
              <kbd className="rounded border border-pulse-border-strong px-1 font-mono text-[10px] text-pulse-text-muted">
                ⌘K
              </kbd>
            </button>
            <ModelStatusChip />
          </div>
        </header>
        <main id="main" className="min-h-0 flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
