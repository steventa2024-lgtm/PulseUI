import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ActionButton, type Action } from "./Section";

export type HeroProps = {
  eyebrow?: string;
  title: string;
  /** Rendered after the title in the brand gradient. */
  highlight?: string;
  description: string;
  primaryCta?: Action;
  secondaryCta?: Action;
  /** Small reassurance line under the buttons, e.g. "No credit card required". */
  note?: string;
  /** Product visual (e.g. <ProductMockup />), shown below (centered) or beside (split). */
  visual?: ReactNode;
  layout?: "centered" | "split";
};

/** Hero with soft gradient glow, grid texture, and an optional product visual. */
export function Hero({
  eyebrow,
  title,
  highlight,
  description,
  primaryCta,
  secondaryCta,
  note,
  visual,
  layout = "centered",
}: HeroProps) {
  const split = layout === "split";
  return (
    <section className="relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-subtle" />
        <div className="absolute -top-40 left-1/2 size-[42rem] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute top-40 -right-40 size-96 rounded-full bg-chart-2/20 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:56px_56px] opacity-40 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]" />
      </div>

      <div
        className={cn(
          "mx-auto max-w-6xl px-4 pt-20 pb-16 sm:px-6 md:pt-28 md:pb-24",
          split && "grid items-center gap-12 lg:grid-cols-2",
        )}
      >
        <div className={cn(!split && "mx-auto max-w-3xl text-center")}>
          {eyebrow && (
            <Badge
              variant="outline"
              className="mb-6 rounded-full border-primary/30 bg-primary/5 px-3 py-1 text-primary animate-in fade-in duration-700"
            >
              <span className="mr-1 size-1.5 rounded-full bg-primary" />
              {eyebrow}
            </Badge>
          )}
          <h1 className="text-4xl font-extrabold tracking-tight text-balance sm:text-5xl md:text-6xl animate-in fade-in slide-in-from-bottom-4 duration-700">
            {title} {highlight && <span className="text-gradient">{highlight}</span>}
          </h1>
          <p
            className={cn(
              "mt-6 text-lg leading-relaxed text-pretty text-muted-foreground md:text-xl animate-in fade-in slide-in-from-bottom-4 duration-1000",
              !split && "mx-auto max-w-2xl",
            )}
          >
            {description}
          </p>
          {(primaryCta || secondaryCta) && (
            <div
              className={cn(
                "mt-10 flex flex-col gap-3 sm:flex-row animate-in fade-in slide-in-from-bottom-6 duration-1000",
                !split && "justify-center",
              )}
            >
              {primaryCta && (
                <ActionButton
                  action={primaryCta}
                  className="bg-gradient-primary px-8 shadow-elegant transition-all hover:-translate-y-0.5 hover:shadow-glow"
                />
              )}
              {secondaryCta && (
                <ActionButton action={secondaryCta} variant="outline" className="px-8 backdrop-blur" />
              )}
            </div>
          )}
          {note && <p className="mt-4 text-sm text-muted-foreground">{note}</p>}
        </div>

        {visual && (
          <div
            className={cn(
              "animate-in fade-in slide-in-from-bottom-8 duration-1000",
              !split && "mx-auto mt-16 max-w-5xl",
            )}
          >
            {visual}
          </div>
        )}
      </div>
    </section>
  );
}
