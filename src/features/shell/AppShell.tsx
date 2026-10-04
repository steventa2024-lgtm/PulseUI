import { Link, useNavigate } from "@tanstack/react-router";
import { BookOpen, Command, Menu, MessageSquareText, Settings, UserRound } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { PulseLogo } from "@/components/shared/PulseLogo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useAppSettings } from "@/lib/client/queries";
import { cn } from "@/lib/utils";
import { AppSidebar } from "./AppSidebar";
import { ChatDrawer } from "./ChatDrawer";
import { useCommandPalette } from "./command-palette";

const COLLAPSE_KEY = "pulseui.sidebar.collapsed";
const DOCS_URL = "https://github.com/steventa2024-lgtm/PulseUI#readme";

function readCollapsed(): boolean {
  try {
    return window.localStorage.getItem(COLLAPSE_KEY) === "1";
  } catch {
    return false;
  }
}

/** Local profile menu. PulseUI has no accounts; the initial comes from Settings → Your name. */
function ProfileMenu() {
  const settings = useAppSettings();
  const navigate = useNavigate();
  const palette = useCommandPalette();
  const name = settings.data?.displayName?.trim() ?? "";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="pulse-interactive flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-[#0b111d]/80 text-lg font-semibold text-white backdrop-blur hover:border-white/30 focus-visible:outline-2 focus-visible:outline-pulse-cyan"
        aria-label="Profile and settings"
      >
        {name ? (
          name[0]?.toUpperCase()
        ) : (
          <UserRound className="h-5 w-5 text-pulse-text-secondary" />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-56 border-pulse-border-strong bg-pulse-surface-raised"
      >
        <DropdownMenuLabel className="text-xs font-normal text-pulse-text-secondary">
          {name ? `Signed in locally as ${name}` : "Local workspace"}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="gap-2" onSelect={() => void navigate({ to: "/settings" })}>
          <Settings className="h-4 w-4" /> Settings
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-2" onSelect={palette.open}>
          <Command className="h-4 w-4" /> Command palette
          <kbd className="ml-auto font-mono text-[10px] text-pulse-text-muted">⌘K</kbd>
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-2" asChild>
          <a href={DOCS_URL} target="_blank" rel="noreferrer">
            <BookOpen className="h-4 w-4" /> Documentation
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

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
    <div className="h-dvh bg-[#03060b] lg:p-3">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-pulse-surface-raised focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <div
        className={cn(
          "relative flex h-full overflow-hidden bg-pulse-bg",
          "lg:rounded-[22px] lg:border lg:border-white/[0.08] lg:shadow-[0_0_0_1px_rgb(36_124_255/0.06),0_30px_80px_-30px_rgb(0_0_0/0.9)]",
        )}
      >
        {/* Thin light along the top edge of the frame */}
        <div className="pointer-events-none absolute inset-x-10 top-0 z-30 hidden h-px bg-gradient-to-r from-transparent via-pulse-blue/50 to-transparent lg:block" />
        <AppSidebar collapsed={collapsed} onToggle={toggle} className="hidden lg:flex" />

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-[260px] border-pulse-border bg-[#070c16] p-0">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <AppSidebar
              collapsed={false}
              className="w-full border-r-0"
              onNavigate={() => setMobileOpen(false)}
            />
          </SheetContent>
        </Sheet>

        <div className="relative flex min-w-0 flex-1 flex-col">
          <header className="absolute inset-x-0 top-0 z-20 flex h-[84px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
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
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setChatOpen(true)}
                className="pulse-interactive flex h-12 items-center gap-2.5 rounded-xl border border-[#2f7dff]/70 bg-[#0a1a33]/70 px-4 text-[15.5px] font-medium text-white shadow-[0_0_24px_-6px_rgb(36_124_255/0.6),inset_0_0_12px_-4px_rgb(36_124_255/0.5)] backdrop-blur hover:border-[#4b92ff] hover:bg-[#0d2244]/80"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#1e7bff]">
                  <MessageSquareText className="h-3.5 w-3.5 text-white" />
                </span>
                <span className="hidden sm:inline">Chat with AI</span>
              </button>
              <ProfileMenu />
            </div>
          </header>
          <main id="main" className="min-h-0 flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
      <ChatDrawer open={chatOpen} onOpenChange={setChatOpen} />
    </div>
  );
}
