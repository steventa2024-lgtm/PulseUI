import type { LucideIcon } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Action } from "./Section";

export type FooterProps = {
  brand: string;
  logo?: LucideIcon;
  tagline: string;
  columns: { title: string; links: Action[] }[];
  /** Show a working newsletter signup. */
  newsletter?: boolean;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function FooterLink({ link }: { link: Action }) {
  const className = "text-sm text-muted-foreground transition-colors hover:text-foreground";
  return link.href.startsWith("/") ? (
    <Link to={link.href} className={className}>
      {link.label}
    </Link>
  ) : (
    <a href={link.href} className={className}>
      {link.label}
    </a>
  );
}

/** Brand, link columns, newsletter form and copyright. */
export function Footer({ brand, logo: Logo, tagline, columns, newsletter = true }: FooterProps) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const subscribe = (event: FormEvent) => {
    event.preventDefault();
    if (!EMAIL.test(email)) {
      setError("Enter a valid email address.");
      return;
    }
    setError("");
    setEmail("");
    toast.success("You're subscribed", { description: "Watch your inbox for product news." });
  };

  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-[1.5fr_repeat(3,1fr)]">
        <div className="space-y-4">
          <Link to="/" className="flex items-center gap-2 text-lg font-bold">
            {Logo && (
              <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground">
                <Logo className="size-4" />
              </span>
            )}
            {brand}
          </Link>
          <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">{tagline}</p>
          {newsletter && (
            <form onSubmit={subscribe} noValidate className="max-w-sm space-y-2">
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  aria-label="Email address"
                  aria-invalid={Boolean(error)}
                />
                <Button type="submit">Subscribe</Button>
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
            </form>
          )}
        </div>
        {columns.map((column) => (
          <div key={column.title}>
            <p className="text-sm font-semibold">{column.title}</p>
            <ul className="mt-4 space-y-3">
              {column.links.map((link) => (
                <li key={link.label}>
                  <FooterLink link={link} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t">
        <p className="mx-auto max-w-6xl px-4 py-6 text-sm text-muted-foreground sm:px-6">
          © {new Date().getFullYear()} {brand}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
