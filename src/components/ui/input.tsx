import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "pulse-interactive flex h-9 w-full rounded-[var(--pulse-radius-md)] border border-pulse-border-strong bg-pulse-bg-deep/60 px-3 py-1 text-sm text-pulse-text placeholder:text-pulse-text-muted hover:border-pulse-border-strong focus-visible:border-pulse-cyan/70 focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgb(0_207_255/0.15)] disabled:cursor-not-allowed disabled:opacity-50 file:border-0 file:bg-transparent file:text-sm file:font-medium",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
