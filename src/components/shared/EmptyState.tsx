import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-[var(--pulse-radius-xl)] border border-dashed border-pulse-border-strong bg-pulse-surface/40 px-6 py-14 text-center",
        className,
      )}
    >
      <div className="relative mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-pulse-border-strong bg-pulse-surface-raised text-pulse-cyan shadow-[0_0_30px_-8px_rgb(0_207_255/0.5)]">
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <h3 className="font-display text-base font-semibold text-pulse-text">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm text-pulse-text-secondary">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
