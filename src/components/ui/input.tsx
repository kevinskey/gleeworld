import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps extends React.ComponentProps<"input"> {
  error?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-none border border-input bg-background px-3 py-2 text-base sm:text-sm text-foreground",
          "ring-offset-background transition-all duration-200",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          "placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:border-primary",
          "hover:border-muted-foreground/50",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted",
          "min-h-[44px] md:min-h-[40px]",
          // Error state
          error && "border-destructive ring-2 ring-destructive/20 focus-visible:ring-destructive",
          className
        )}
        ref={ref}
        aria-invalid={error ? "true" : undefined}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
