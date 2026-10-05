import { ArrowRight } from "lucide-react";

import { ActionButton, type Action } from "./Section";

export type CtaProps = {
  title: string;
  description?: string;
  primaryCta: Action;
  secondaryCta?: Action;
};

/** Full-width gradient call-to-action panel. */
export function Cta({ title, description, primaryCta, secondaryCta }: CtaProps) {
  return (
    <section className="px-4 py-20 sm:px-6 md:py-28">
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-gradient-primary px-6 py-16 text-center text-primary-foreground shadow-elegant md:px-16 md:py-20">
        <div aria-hidden className="absolute -top-24 -left-24 size-72 rounded-full bg-white/10 blur-3xl" />
        <div aria-hidden className="absolute -right-24 -bottom-24 size-72 rounded-full bg-white/10 blur-3xl" />
        <h2 className="relative mx-auto max-w-2xl text-3xl font-bold tracking-tight text-balance md:text-5xl">{title}</h2>
        {description && <p className="relative mx-auto mt-4 max-w-xl text-lg opacity-90">{description}</p>}
        <div className="relative mt-10 flex flex-col justify-center gap-3 sm:flex-row">
          <ActionButton
            action={primaryCta}
            variant="secondary"
            className="group px-8 shadow-lg transition-all hover:-translate-y-0.5"
          >
            {primaryCta.label}
            <ArrowRight className="transition-transform group-hover:translate-x-1" />
          </ActionButton>
          {secondaryCta && (
            <ActionButton
              action={secondaryCta}
              variant="ghost"
              className="px-8 text-primary-foreground hover:bg-white/10 hover:text-primary-foreground"
            />
          )}
        </div>
      </div>
    </section>
  );
}
