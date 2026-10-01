import { useId } from "react";

import { cn } from "@/lib/utils";

/** PulseUI mark: a signal trace inside a lit frame. */
export function PulseMark({ className }: { className?: string }) {
  const id = useId();
  return (
    <svg viewBox="0 0 32 32" className={cn("h-8 w-8", className)} aria-hidden>
      <defs>
        <linearGradient id={`${id}-g`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--pulse-cyan)" />
          <stop offset="0.55" stopColor="var(--pulse-blue)" />
          <stop offset="1" stopColor="var(--pulse-magenta)" />
        </linearGradient>
      </defs>
      <rect
        x="1.5"
        y="1.5"
        width="29"
        height="29"
        rx="8"
        fill="var(--pulse-bg-elevated)"
        stroke={`url(#${id}-g)`}
        strokeWidth="1.5"
      />
      <path
        d="M6 17h5l2.6-7 4.2 13 2.8-6H26"
        fill="none"
        stroke={`url(#${id}-g)`}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
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
    <span className={cn("flex items-center gap-2.5", className)}>
      <PulseMark className="h-8 w-8 shrink-0 drop-shadow-[0_0_12px_rgb(0_207_255/0.35)]" />
      {!collapsed && (
        <span className="font-display text-[17px] font-semibold tracking-tight text-pulse-text">
          Pulse<span className="pulse-text-accent">UI</span>
        </span>
      )}
    </span>
  );
}
