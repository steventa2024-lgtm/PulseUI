import { cn } from "@/lib/utils";

/** PulseUI mark: a glowing orb in a lit blue tile. */
export function PulseMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]",
        "bg-[linear-gradient(145deg,#38a9ff_0%,#2563ff_45%,#5b3cff_100%)]",
        "shadow-[0_0_18px_-2px_rgb(36_124_255/0.75),inset_0_1px_0_rgb(255_255_255/0.35)]",
        className,
      )}
    >
      <span className="h-[46%] w-[46%] rounded-full bg-[radial-gradient(circle_at_35%_30%,#1b2a6b_0%,#0b1033_55%,#050820_100%)] shadow-[0_0_0_2px_rgb(140_120_255/0.55),0_0_10px_2px_rgb(160_110_255/0.6)]" />
    </span>
  );
}

export function PulseLogo({
  collapsed = false,
  className,
}: {
  collapsed?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("flex items-center gap-3", className)}>
      <PulseMark />
      {!collapsed && (
        <span className="font-display text-[22px] font-bold tracking-[-0.02em] text-white">
          PulseUI
        </span>
      )}
    </span>
  );
}
