import type { LucideIcon } from "lucide-react";

export type LogoCloudProps = {
  title?: string;
  /** Company wordmarks (text, optionally with an icon). Use invented names. */
  logos: { name: string; icon?: LucideIcon }[];
};

/** "Trusted by" strip of muted wordmarks. */
export function LogoCloud({ title = "Trusted by fast-moving teams", logos }: LogoCloudProps) {
  return (
    <section className="border-y bg-muted/30 py-10">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="text-center text-sm font-medium text-muted-foreground">{title}</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
          {logos.map(({ name, icon: Icon }) => (
            <span
              key={name}
              className="flex items-center gap-2 text-lg font-semibold tracking-tight text-muted-foreground/70 transition-colors hover:text-foreground"
            >
              {Icon && <Icon className="size-5" />}
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
