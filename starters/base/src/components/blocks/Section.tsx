import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** A call to action. `href` is a route ("/pricing"), an anchor ("#faq") or a URL. */
export type Action = { label: string; href: string };

/** Button that navigates: router Link for routes, plain <a> for anchors and URLs. */
export function ActionButton({
  action,
  variant = "default",
  size = "lg",
  className,
  children,
}: {
  action: Action;
  variant?: "default" | "secondary" | "outline" | "ghost" | "link";
  size?: "default" | "sm" | "lg";
  className?: string;
  children?: ReactNode;
}) {
  const content = children ?? action.label;
  const internal = action.href.startsWith("/") && !action.href.startsWith("//");
  return (
    <Button asChild variant={variant} size={size} className={className}>
      {internal ? <Link to={action.href}>{content}</Link> : <a href={action.href}>{content}</a>}
    </Button>
  );
}

/** Page section with consistent width and vertical rhythm. */
export function Section({
  id,
  className,
  containerClassName,
  children,
}: {
  id?: string;
  className?: string;
  containerClassName?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className={cn("relative scroll-mt-20 py-20 md:py-28", className)}>
      <div className={cn("mx-auto max-w-6xl px-4 sm:px-6", containerClassName)}>{children}</div>
    </section>
  );
}

/** Eyebrow + title + description, centered or left aligned. */
export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: "center" | "left";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-700",
        align === "center" && "mx-auto text-center",
        className,
      )}
    >
      {eyebrow && (
        <Badge variant="secondary" className="mb-4 rounded-full px-3 py-1 text-xs font-semibold">
          {eyebrow}
        </Badge>
      )}
      <h2 className="text-3xl font-bold tracking-tight text-balance md:text-4xl">{title}</h2>
      {description && (
        <p className="mt-4 text-lg leading-relaxed text-pretty text-muted-foreground">
          {description}
        </p>
      )}
    </div>
  );
}

/** Two-letter initials for avatars. */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
