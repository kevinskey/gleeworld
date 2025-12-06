
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 touch-manipulation min-h-[44px] md:min-h-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground md:hover:bg-primary/90 active:bg-primary/90 border border-primary transition-all duration-200",
        destructive:
          "bg-destructive text-destructive-foreground md:hover:bg-destructive/90 active:bg-destructive/90 transition-all duration-200",
        outline:
          "bg-transparent text-foreground border border-border md:hover:bg-muted md:hover:text-foreground active:bg-muted active:text-foreground shadow-sm transition-all duration-200",
        secondary:
          "bg-secondary text-secondary-foreground border border-secondary md:hover:bg-secondary/90 active:bg-secondary/90 transition-all duration-200",
        ghost: "text-foreground md:hover:bg-accent md:hover:text-accent-foreground active:bg-accent active:text-accent-foreground transition-all duration-200",
        link: "text-primary underline-offset-4 md:hover:underline transition-all duration-200",
        glass: "glass-upload-zone text-foreground md:hover:border-primary/30 active:border-primary/30 transition-all duration-300",
        "glass-solid": "glass-signature-panel text-foreground shadow-xl transition-all duration-300",
        branded: "bg-brand-600 text-primary-foreground border border-brand-600 md:hover:bg-brand-700 active:bg-brand-700 shadow-lg font-medium transition-all duration-300",
        disabled: "bg-muted text-muted-foreground cursor-not-allowed hover:bg-muted hover:text-muted-foreground opacity-50",
      },
      size: {
        default: "h-10 px-4 py-2 md:min-h-0 min-h-[44px]",
        sm: "h-9 rounded-md px-3 md:min-h-0 min-h-[40px]",
        lg: "h-11 rounded-md px-8 md:min-h-0 min-h-[48px]",
        icon: "h-10 w-10 md:min-h-0 min-h-[44px]",
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
