import * as React from "react"
import { cn } from "@/lib/utils"

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    variant?: "default" | "glass" | "elevated" | "outline" | "glossy" | "muted"
  }
>(({ className, variant = "default", ...props }, ref) => {
  const variants = {
    default: "bg-card border border-border shadow-card hover:shadow-card-hover",
    glass: "bg-card/80 backdrop-blur-md border border-border/50 shadow-glass",
    elevated: "bg-card border-0 shadow-elevated hover:shadow-glass-lg",
    outline: "bg-transparent border-2 border-border hover:border-primary/50",
    glossy: "bg-card border border-border shadow-lg",
    muted: "bg-muted border border-border/50",
  }
  
  return (
    <div
      ref={ref}
      data-component="card"
      className={cn(
        "rounded-lg text-card-foreground transition-all duration-200 relative overflow-hidden",
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
      "flex flex-col space-y-1.5 p-4 sm:p-5 md:p-6",
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
      "text-base sm:text-lg font-semibold leading-tight tracking-tight text-card-foreground",
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
      "p-4 sm:p-5 md:p-6 pt-0",
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
      "flex items-center p-4 sm:p-5 md:p-6 pt-0 gap-3",
      className
    )}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
