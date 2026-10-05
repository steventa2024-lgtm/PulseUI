import { Check } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { Section } from "./Section";

export type FeatureSplitItem = {
  eyebrow?: string;
  title: string;
  description: string;
  bullets?: string[];
  /** Visual for the other column, e.g. <ProductMockup /> or a custom card. */
  visual: ReactNode;
};

/** Alternating text/visual rows for deeper feature explanations. */
export function FeatureSplit({ id, items }: { id?: string; items: FeatureSplitItem[] }) {
  return (
    <Section id={id}>
      <div className="space-y-24">
        {items.map((item, index) => (
          <div key={item.title} className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <div className={cn(index % 2 === 1 && "lg:order-2")}>
              {item.eyebrow && (
                <p className="mb-3 text-sm font-semibold tracking-wider text-primary uppercase">{item.eyebrow}</p>
              )}
              <h3 className="text-2xl font-bold tracking-tight md:text-3xl">{item.title}</h3>
              <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{item.description}</p>
              {item.bullets && (
                <ul className="mt-6 space-y-3">
                  {item.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-3">
                      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Check className="size-3.5" />
                      </span>
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className={cn(index % 2 === 1 && "lg:order-1")}>{item.visual}</div>
          </div>
        ))}
      </div>
    </Section>
  );
}
