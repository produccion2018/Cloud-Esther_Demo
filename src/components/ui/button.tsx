import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl text-[13px] font-medium tracking-[-0.005em] cursor-pointer transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-b from-primary to-[color-mix(in_oklab,var(--color-primary)_86%,black)] text-primary-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_6px_16px_-10px_rgba(124,58,237,0.85)] hover:-translate-y-px hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_10px_22px_-12px_rgba(124,58,237,0.9)] active:translate-y-0",
        destructive:
          "bg-destructive text-destructive-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_6px_16px_-10px_rgba(220,38,38,0.8)] hover:-translate-y-px hover:bg-destructive/92",
        outline:
          "border border-border/80 bg-card text-foreground shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:border-primary/30 hover:bg-primary/[0.04] hover:text-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-primary/[0.06] hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        hero: "bg-brand text-primary-foreground shadow-glow hover:opacity-95 hover:-translate-y-0.5 transition-all duration-300",
        soft: "bg-lavender text-lavender-foreground hover:bg-accent hover:-translate-y-0.5 transition-all duration-300",
        outlineBrand:
          "border border-primary/30 bg-card text-primary hover:bg-lavender hover:-translate-y-0.5 transition-all duration-300",
      },
      size: {
        default: "h-9 px-4",
        sm: "h-8 rounded-lg px-3 text-xs",
        lg: "h-10 rounded-xl px-6",
        xl: "h-12 rounded-2xl px-8 text-[15px]",
        icon: "h-9 w-9",
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
