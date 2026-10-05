import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-4 whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "border-pulse-cyan/30 bg-pulse-cyan/10 text-pulse-cyan",
        secondary: "border-pulse-border-strong bg-pulse-surface-overlay text-pulse-text-secondary",
        success: "border-pulse-success/30 bg-pulse-success/10 text-pulse-success",
        warning: "border-pulse-warning/30 bg-pulse-warning/10 text-pulse-warning",
        destructive: "border-pulse-danger/30 bg-pulse-danger/10 text-pulse-danger",
        magenta:
          "border-pulse-magenta/30 bg-pulse-magenta/10 text-[color-mix(in_oklab,var(--pulse-magenta)_70%,white)]",
        outline: "border-pulse-border-strong text-pulse-text-secondary",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
