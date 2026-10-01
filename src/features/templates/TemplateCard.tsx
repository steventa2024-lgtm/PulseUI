import { ArrowUpRight, Loader2 } from "lucide-react";
import { useState } from "react";

import type { TemplateDefinition } from "@/lib/templates/registry";
import { cn } from "@/lib/utils";

export function TemplateCard({
  template,
  onSelect,
  pending,
  disabled,
  size = "md",
}: {
  template: TemplateDefinition;
  onSelect: (template: TemplateDefinition) => void;
  pending?: boolean;
  disabled?: boolean;
  size?: "md" | "lg";
}) {
  const [failed, setFailed] = useState(false);
  return (
    <button
      type="button"
      onClick={() => onSelect(template)}
      disabled={disabled}
      aria-label={`Create a project from the ${template.name} template`}
      className={cn(
        "group relative flex w-full flex-col overflow-hidden rounded-[var(--pulse-radius-lg)] border border-pulse-border bg-pulse-surface text-left",
        "transition-[transform,border-color,box-shadow] duration-[var(--pulse-duration-panel)] ease-pulse",
        "hover:-translate-y-0.5 hover:border-pulse-cyan/45 hover:shadow-[0_18px_40px_-18px_rgb(0_0_0/0.9),0_0_0_1px_rgb(0_207_255/0.15),0_0_40px_-12px_rgb(0_207_255/0.35),18px_10px_50px_-24px_rgb(199_44_255/0.5)]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pulse-cyan disabled:cursor-wait disabled:opacity-70",
      )}
    >
      <div className="relative aspect-[16/10] overflow-hidden border-b border-pulse-border bg-pulse-bg-deep">
        {/* Browser chrome */}
        <div className="absolute inset-x-0 top-0 z-10 flex h-5 items-center gap-1 bg-pulse-bg-deep/90 px-2">
          <span className="h-1.5 w-1.5 rounded-full bg-pulse-pink/70" />
          <span className="h-1.5 w-1.5 rounded-full bg-pulse-warning/70" />
          <span className="h-1.5 w-1.5 rounded-full bg-pulse-success/70" />
        </div>
        {failed ? (
          <div className="absolute inset-0 top-5 flex items-center justify-center bg-[radial-gradient(circle_at_30%_30%,rgb(36_124_255/0.25),transparent_60%),radial-gradient(circle_at_80%_70%,rgb(199_44_255/0.2),transparent_60%)] text-sm text-pulse-text-secondary">
            {template.name}
          </div>
        ) : (
          <img
            src={template.image}
            alt={`${template.name} template preview`}
            loading="lazy"
            decoding="async"
            onError={() => setFailed(true)}
            className="absolute inset-x-0 bottom-0 top-5 h-[calc(100%-1.25rem)] w-full object-cover object-top transition-transform duration-500 ease-pulse group-hover:scale-[1.02]"
          />
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-pulse-bg/40 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        {pending && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-pulse-bg/70 text-sm text-pulse-cyan">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating project…
          </div>
        )}
      </div>
      <div
        className={cn(
          "flex items-start justify-between gap-2",
          size === "lg" ? "p-4" : "px-3.5 py-3",
        )}
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-pulse-text">{template.name}</p>
          <p className="mt-0.5 text-[11px] uppercase tracking-wider text-pulse-text-muted">
            {template.category}
          </p>
          {size === "lg" && (
            <p className="mt-2 text-xs leading-relaxed text-pulse-text-secondary">
              {template.description}
            </p>
          )}
        </div>
        <ArrowUpRight className="h-4 w-4 shrink-0 text-pulse-text-muted transition-colors group-hover:text-pulse-cyan" />
      </div>
    </button>
  );
}
