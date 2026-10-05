import { TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export type StatCardProps = {
  label: string;
  value: string;
  /** e.g. "+12.5%" (green) or "-3%" (red). */
  delta?: string;
  hint?: string;
  icon?: LucideIcon;
};

/** KPI card for dashboards. */
export function StatCard({ label, value, delta, hint = "vs last month", icon: Icon }: StatCardProps) {
  const down = delta?.trim().startsWith("-");
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-elegant">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {Icon && (
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="size-4" />
          </span>
        )}
      </div>
      <p className="mt-3 text-3xl font-bold tracking-tight">{value}</p>
      {delta && (
        <p className="mt-2 flex items-center gap-1 text-xs">
          <span className={cn("flex items-center gap-0.5 font-semibold", down ? "text-destructive" : "text-emerald-600 dark:text-emerald-400")}>
            {down ? <TrendingDown className="size-3.5" /> : <TrendingUp className="size-3.5" />}
            {delta}
          </span>
          <span className="text-muted-foreground">{hint}</span>
        </p>
      )}
    </div>
  );
}
