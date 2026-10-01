import * as React from "react";

import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "pulse-interactive flex min-h-[60px] w-full rounded-[var(--pulse-radius-md)] border border-pulse-border-strong bg-pulse-bg-deep/60 px-3 py-2 text-sm text-pulse-text placeholder:text-pulse-text-muted focus-visible:border-pulse-cyan/70 focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgb(0_207_255/0.15)] disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
