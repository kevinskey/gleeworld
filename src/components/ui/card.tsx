import * as React from "react"
import { cn } from "@/lib/utils"

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    variant?: "default" | "glass" | "elevated" | "outline" | "glossy" | "muted"
  }
>(({ className, variant = "default", ...props }, ref) => {
  // Tactile-brutalism cards: 1px line + canvas-to-card contrast carries
  // the elevation. No drop shadows on any variant; the "elevated"
  // variant just bumps to a stronger border instead. `rounded-none` is
  // explicit so a per-page `className` can opt back in via `rounded-sm`
  // etc. without fighting the shadcn base.
  const variants = {
    default: "bg-card border border-border",
    glass: "bg-card/80 backdrop-blur-md border border-border/50",
    elevated: "bg-card border-2 border-border",
    outline: "bg-transparent border-2 border-border hover:border-primary/50",
    glossy: "bg-card border border-border",
    muted: "bg-muted border border-border/50",
  }

  return (
    <div
      ref={ref}
      data-component="card"
      className={cn(
        "rounded-none text-card-foreground transition-colors duration-150 relative overflow-hidden",
        variants[variant],
        className
      )}
      {...props}
    />
  )
})
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-component="card-header"
    className={cn(
      "flex flex-col space-y-1 p-3 sm:p-4",
      className
    )}
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
      "text-sm sm:text-base font-semibold leading-tight tracking-tight text-card-foreground",
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
    className={cn("text-sm text-muted-foreground leading-relaxed", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div 
    ref={ref}
    data-component="card-content"
    className={cn(
      "p-3 sm:p-4 pt-0",
      className
    )} 
    {...props} 
  />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-component="card-footer"
    className={cn(
      "flex items-center p-3 sm:p-4 pt-0 gap-2",
      className
    )}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
