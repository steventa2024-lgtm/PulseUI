import { cn } from "@/lib/utils";

const TONES = {
  idle: "bg-pulse-text-muted",
  running: "bg-pulse-cyan animate-pulse-blink shadow-[0_0_8px_var(--pulse-cyan)]",
  ready: "bg-pulse-success shadow-[0_0_8px_var(--pulse-success)]",
  warning: "bg-pulse-warning",
  error: "bg-pulse-danger shadow-[0_0_8px_var(--pulse-danger)]",
} as const;

export function StatusDot({
  tone,
  className,
  label,
}: {
  tone: keyof typeof TONES;
  className?: string;
  label?: string;
}) {
  return (
    <span
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn("inline-block h-2 w-2 shrink-0 rounded-full", TONES[tone], className)}
    />
  );
}
