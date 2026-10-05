import { Bell, Menu, Search, type LucideIcon } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { initials } from "./Section";

export type AppNavItem = { label: string; href: string; icon: LucideIcon; badge?: string };

export type AppShellProps = {
  brand: string;
  logo?: LucideIcon;
  nav: AppNavItem[];
  user?: { name: string; email?: string };
  /** Page title shown in the top bar. */
  title?: string;
  /** Controlled search box in the top bar (omit to hide it). */
  search?: { value: string; onChange: (value: string) => void; placeholder?: string };
  actions?: ReactNode;
  children: ReactNode;
};

function SideNav({ brand, logo: Logo, nav, onNavigate }: Pick<AppShellProps, "brand" | "logo" | "nav"> & { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col gap-6 p-4">
      <Link to="/" className="flex items-center gap-2 px-2 font-bold" onClick={onNavigate}>
        {Logo && (
          <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground">
            <Logo className="size-4" />
          </span>
        )}
        {brand}
      </Link>
      <nav className="flex flex-col gap-1">
        {nav.map(({ label, href, icon: Icon, badge }) => (
          <NavLink
            key={href}
            to={href}
            end={href === "/"}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )
            }
          >
            <Icon className="size-4" />
            <span className="flex-1">{label}</span>
            {badge && <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">{badge}</span>}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

/** Dashboard layout: sidebar (sheet on mobile), top bar with search and user. */
export function AppShell({ brand, logo, nav, user, title, search, actions, children }: AppShellProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r bg-card lg:block">
        <SideNav brand={brand} logo={logo} nav={nav} />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur-xl sm:px-6">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation">
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <SideNav brand={brand} logo={logo} nav={nav} onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>
          {title && <h1 className="text-lg font-semibold tracking-tight">{title}</h1>}
          {search && (
            <div className="relative ml-auto hidden w-full max-w-xs md:block">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search.value}
                onChange={(event) => search.onChange(event.target.value)}
                placeholder={search.placeholder ?? "Search…"}
                className="pl-9"
                aria-label="Search"
              />
            </div>
          )}
          <div className={cn("flex items-center gap-2", !search && "ml-auto")}>
            {actions}
            <Button variant="ghost" size="icon" aria-label="Notifications">
              <Bell />
            </Button>
            {user && (
              <Avatar className="size-8">
                <AvatarFallback className="bg-gradient-primary text-xs font-semibold text-primary-foreground">
                  {initials(user.name)}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
