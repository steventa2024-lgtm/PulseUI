import { Menu, type LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { ActionButton, type Action } from "./Section";

export type NavbarProps = {
  brand: string;
  logo?: LucideIcon;
  /** Routes ("/features") get active styling; anchors ("#pricing") scroll. */
  links: Action[];
  cta?: Action;
  secondaryCta?: Action;
};

function NavItem({ link, onClick, mobile }: { link: Action; onClick?: () => void; mobile?: boolean }) {
  const base = mobile
    ? "rounded-lg px-3 py-2.5 text-base font-medium transition-colors hover:bg-accent"
    : "rounded-md px-3 py-2 text-sm font-medium transition-colors hover:text-foreground";
  if (link.href.startsWith("/")) {
    return (
      <NavLink
        to={link.href}
        end
        onClick={onClick}
        className={({ isActive }) =>
          cn(base, isActive ? "text-foreground" : "text-muted-foreground", isActive && mobile && "bg-accent")
        }
      >
        {link.label}
      </NavLink>
    );
  }
  return (
    <a href={link.href} onClick={onClick} className={cn(base, "text-muted-foreground")}>
      {link.label}
    </a>
  );
}

/** Sticky, blurred top navigation with a slide-in mobile menu. */
export function Navbar({ brand, logo: Logo, links, cta, secondaryCta }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-300",
        scrolled
          ? "border-b border-border/60 bg-background/80 shadow-sm backdrop-blur-xl"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 font-bold tracking-tight">
          {Logo && (
            <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground shadow-elegant">
              <Logo className="size-4" />
            </span>
          )}
          <span className="text-lg">{brand}</span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <NavItem key={link.href} link={link} />
          ))}
        </div>

        <div className="hidden items-center gap-2 md:flex">
          {secondaryCta && <ActionButton action={secondaryCta} variant="ghost" size="sm" />}
          {cta && <ActionButton action={cta} size="sm" className="shadow-elegant" />}
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
              <Menu />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72">
            <SheetHeader>
              <SheetTitle className="text-left">{brand}</SheetTitle>
            </SheetHeader>
            <div className="flex flex-col gap-1 px-4">
              {links.map((link) => (
                <NavItem key={link.href} link={link} mobile onClick={() => setOpen(false)} />
              ))}
            </div>
            <div className="mt-4 flex flex-col gap-2 px-4">
              {secondaryCta && <ActionButton action={secondaryCta} variant="outline" />}
              {cta && <ActionButton action={cta} />}
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </header>
  );
}
