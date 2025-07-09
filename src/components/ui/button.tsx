
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 touch-manipulation",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground md:hover:bg-primary/90 active:bg-primary/90 border border-primary",
        destructive:
          "bg-destructive text-destructive-foreground md:hover:bg-destructive/90 active:bg-destructive/90",
        outline:
          "bg-background text-primary border border-primary md:hover:bg-secondary md:hover:text-secondary-foreground active:bg-secondary active:text-secondary-foreground shadow-sm",
        secondary:
          "bg-background text-primary border border-primary md:hover:bg-secondary md:hover:text-secondary-foreground active:bg-secondary active:text-secondary-foreground",
        ghost: "md:hover:bg-accent md:hover:text-accent-foreground active:bg-accent active:text-accent-foreground",
        link: "text-primary underline-offset-4 md:hover:underline",
        glass: "glass-upload-zone text-foreground md:hover:border-primary/30 active:border-primary/30",
        "glass-solid": "glass-signature-panel text-foreground shadow-xl",
        disabled: "bg-gray-200 text-gray-400 cursor-not-allowed hover:bg-gray-200 hover:text-gray-400",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
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
