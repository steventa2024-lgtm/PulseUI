import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "pulse-interactive inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-[var(--pulse-radius-md)] text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pulse-cyan disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-pulse-cyan text-primary-foreground shadow-[0_0_0_1px_rgb(0_207_255/0.4),0_8px_24px_-10px_rgb(0_207_255/0.7)] hover:bg-[color-mix(in_oklab,var(--pulse-cyan)_86%,white)]",
        accent:
          "bg-[image:var(--pulse-gradient-accent)] text-white shadow-glow-blue hover:brightness-110",
        destructive: "bg-pulse-danger/90 text-white hover:bg-pulse-danger",
        outline:
          "border border-pulse-border-strong bg-pulse-surface/60 text-pulse-text hover:border-pulse-cyan/50 hover:bg-pulse-surface-hover",
        secondary: "bg-pulse-surface-overlay text-pulse-text hover:bg-pulse-surface-hover",
        ghost: "text-pulse-text-secondary hover:bg-pulse-surface-hover hover:text-pulse-text",
        link: "text-pulse-cyan underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4",
        sm: "h-8 px-3 text-xs",
        lg: "h-11 px-6 text-[15px]",
        icon: "h-9 w-9",
        "icon-sm": "h-7 w-7 rounded-[var(--pulse-radius-sm)] [&_svg]:size-3.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
