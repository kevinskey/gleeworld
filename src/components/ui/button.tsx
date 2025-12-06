import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all duration-200 ease-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 touch-manipulation select-none active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: 
          "bg-primary text-primary-foreground shadow-button hover:bg-primary/90 hover:shadow-button-hover active:bg-primary/95",
        destructive:
          "bg-destructive text-destructive-foreground shadow-button hover:bg-destructive/90 hover:shadow-button-hover",
        outline:
          "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground hover:border-accent",
        secondary:
          "bg-secondary text-secondary-foreground shadow-button hover:bg-secondary/80 hover:shadow-button-hover",
        ghost: 
          "hover:bg-accent hover:text-accent-foreground",
        link: 
          "text-primary underline-offset-4 hover:underline",
        glass: 
          "backdrop-blur-md bg-background/80 border border-border/50 shadow-glass hover:bg-background/90 hover:border-border",
        "glass-solid": 
          "backdrop-blur-xl bg-card/95 border border-border shadow-elevated hover:shadow-glass-lg",
        branded: 
          "bg-brand-600 text-white shadow-button hover:bg-brand-700 hover:shadow-button-hover font-semibold",
        success:
          "bg-success text-success-foreground shadow-button hover:bg-success/90",
        warning:
          "bg-warning text-warning-foreground shadow-button hover:bg-warning/90",
      },
      size: {
        default: "h-10 px-4 py-2 min-h-[44px] md:min-h-[40px]",
        sm: "h-9 rounded-md px-3 text-xs min-h-[40px] md:min-h-[36px]",
        lg: "h-11 rounded-lg px-8 text-base min-h-[48px] md:min-h-[44px]",
        xl: "h-12 rounded-lg px-10 text-base font-semibold min-h-[52px]",
        icon: "h-10 w-10 min-h-[44px] min-w-[44px] md:min-h-[40px] md:min-w-[40px]",
        "icon-sm": "h-8 w-8 min-h-[36px] min-w-[36px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
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
