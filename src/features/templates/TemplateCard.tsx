import { Loader2 } from "lucide-react";
import { useState } from "react";

import type { TemplateDefinition } from "@/lib/templates/registry";
import { cn } from "@/lib/utils";

/** Border glow colours, cycled across cards like the home design. */
const ACCENTS = [
  { border: "rgb(47 125 255 / 0.75)", glow: "rgb(47 125 255 / 0.45)" },
  { border: "rgb(190 60 255 / 0.75)", glow: "rgb(190 60 255 / 0.4)" },
  { border: "rgb(200 120 255 / 0.7)", glow: "rgb(170 90 255 / 0.4)" },
  { border: "rgb(60 140 255 / 0.75)", glow: "rgb(60 140 255 / 0.42)" },
  { border: "rgb(225 70 220 / 0.75)", glow: "rgb(225 70 220 / 0.42)" },
];

function hashIndex(id: string): number {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return Math.abs(hash);
}

export function TemplateCard({
  template,
  onSelect,
  pending,
  disabled,
  size = "md",
  accent,
}: {
  template: TemplateDefinition;
  onSelect: (template: TemplateDefinition) => void;
  pending?: boolean;
  disabled?: boolean;
  size?: "md" | "lg";
  accent?: number;
}) {
  const [failed, setFailed] = useState(false);
  const color = ACCENTS[(accent ?? hashIndex(template.id)) % ACCENTS.length] ?? ACCENTS[0]!;
  return (
    <button
      type="button"
      onClick={() => onSelect(template)}
      disabled={disabled}
      aria-label={`Create a project from the ${template.name} template`}
      style={{
        borderColor: color.border,
        boxShadow: `0 0 26px -8px ${color.glow}, inset 0 0 22px -14px ${color.glow}`,
      }}
      className={cn(
        "group relative flex w-full flex-col overflow-hidden rounded-[14px] border-[1.5px] bg-[#0a0f1c] p-2.5 text-left",
        "transition-[transform,filter] duration-[var(--pulse-duration-panel)] ease-pulse",
        "hover:-translate-y-1 hover:brightness-110",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pulse-cyan disabled:cursor-wait",
      )}
    >
      <div className="relative aspect-[16/9.6] overflow-hidden rounded-[9px] bg-pulse-bg-deep">
        {failed ? (
          <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_30%_30%,rgb(36_124_255/0.25),transparent_60%),radial-gradient(circle_at_80%_70%,rgb(199_44_255/0.2),transparent_60%)] text-sm text-pulse-text-secondary">
            {template.name}
          </div>
        ) : (
          <img
            src={template.image}
            alt={`${template.name} template preview`}
            loading="lazy"
            decoding="async"
            onError={() => setFailed(true)}
            className="h-full w-full object-cover object-top transition-transform duration-500 ease-pulse group-hover:scale-[1.02]"
          />
        )}
        {pending && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-pulse-bg/75 text-sm text-pulse-cyan">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating project…
          </div>
        )}
      </div>
      <div className={cn("px-1.5", size === "lg" ? "pb-2 pt-4" : "pb-1.5 pt-3.5")}>
        <p className="truncate text-[17px] font-semibold tracking-[-0.01em] text-white">
          {template.name}
        </p>
        {size === "lg" && (
          <>
            <p className="mt-1 text-[11px] uppercase tracking-wider text-pulse-text-muted">
              {template.category}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-pulse-text-secondary">
              {template.description}
            </p>
          </>
        )}
      </div>
    </button>
  );
}
