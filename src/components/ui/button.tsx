import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  // iOS base: capsule, 17px, weight carries emphasis, opacity press.
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-base font-semibold ring-offset-background transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 touch-manipulation select-none active:opacity-60",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--tint)] text-[var(--tint-contrast)] hover:opacity-90",
        destructive:
          "bg-destructive text-destructive-foreground hover:opacity-90",
        outline:
          "border border-border bg-card text-foreground hover:bg-muted",
        secondary:
          "bg-[hsl(var(--gray-5))] text-[var(--tint)] hover:bg-[hsl(var(--gray-4))]",
        ghost:
          "font-normal text-[var(--tint)] hover:bg-muted",
        link:
          "font-normal text-[var(--tint)] underline-offset-4 hover:underline",
        glass:
          "backdrop-blur-xl bg-card/75 border border-border/40 text-foreground",
        "glass-solid":
          "backdrop-blur-xl bg-card/95 border border-border text-foreground",
        branded:
          "bg-[var(--tint)] text-[var(--tint-contrast)] hover:opacity-90",
        navy:
          "bg-[hsl(var(--brand-navy))] text-[hsl(var(--brand-navy-foreground))] hover:bg-[hsl(var(--brand-navy-hover))]",
        success:
          "bg-success text-success-foreground hover:opacity-90",
        warning:
          "bg-warning text-warning-foreground hover:opacity-90",
      },
      // 44pt HIG floor on touch; lg: desktop may compact to 40.
      size: {
        default: "h-11 px-5 min-h-[44px] lg:h-10 lg:min-h-[40px]",
        sm: "h-9 px-4 text-sm min-h-[44px] lg:min-h-[36px]",
        lg: "h-12 px-6 min-h-[48px]",
        xl: "h-[52px] px-8 min-h-[52px]",
        icon: "h-11 w-11 min-h-[44px] min-w-[44px] lg:h-10 lg:w-10 lg:min-h-[40px] lg:min-w-[40px]",
        "icon-sm": "h-9 w-9 min-h-[44px] min-w-[44px] lg:min-h-[36px] lg:min-w-[36px]",
        "icon-lg": "h-12 w-12 min-h-[48px] min-w-[48px]",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
