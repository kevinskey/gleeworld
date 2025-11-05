
import * as React from "react"

import { cn } from "@/lib/utils"

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-xl border-2 border-primary/10 bg-gradient-to-br from-white via-blue-50/30 to-purple-50/20 dark:from-slate-900 dark:via-blue-950/30 dark:to-purple-950/20 text-card-foreground shadow-[0_4px_20px_rgba(33,75,152,0.12)] transition-all duration-300 hover:shadow-[0_12px_40px_rgba(33,75,152,0.2)] hover:border-primary/40 hover:-translate-y-1 hover:scale-[1.01] backdrop-blur-sm relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-br before:from-primary/[0.08] before:via-transparent before:to-secondary/[0.06] before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300 before:-z-10 before:pointer-events-none after:absolute after:top-0 after:left-0 after:right-0 after:h-1 after:bg-gradient-to-r after:from-primary after:via-secondary after:to-primary after:opacity-60 after:-z-10 after:pointer-events-none",
      className
    )}
    {...props}
  />
))
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-4 pb-2 sm:p-6 sm:pb-3 relative z-10 border-b border-primary/10 bg-gradient-to-r from-primary/[0.06] via-secondary/[0.04] to-primary/[0.02]", className)}
    data-component="card-header"
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-sm sm:text-base md:text-lg lg:text-xl font-bebas leading-tight tracking-wide font-bold bg-gradient-to-r from-primary via-blue-600 to-primary bg-clip-text text-transparent drop-shadow-sm",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-xs sm:text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-4 pt-0 sm:p-6 sm:pt-0 text-card-foreground space-y-2 relative z-10 pointer-events-auto", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-4 pt-0 sm:p-6 sm:pt-0 text-card-foreground gap-2 relative z-10 pointer-events-auto", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
