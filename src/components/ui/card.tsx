import * as React from "react"
import { cn } from "@/lib/utils"

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    variant?: "default" | "glass" | "elevated" | "outline" | "glossy"
  }
>(({ className, variant = "glossy", ...props }, ref) => {
  const variants = {
    default: "bg-card border border-border shadow-card hover:shadow-card-hover",
    glass: "bg-card/80 backdrop-blur-md border border-border shadow-glass",
    elevated: "bg-card border-0 shadow-elevated hover:shadow-glass-lg",
    outline: "bg-transparent border-2 border-border hover:border-primary/50",
    glossy: "bg-[#1a1a1a] border border-[#333] shadow-lg text-white",
  }
  
  return (
    <div
      ref={ref}
      className={cn(
        "rounded-xl transition-all duration-300 relative overflow-hidden",
        variant === "glossy" ? "text-white" : "text-card-foreground",
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
    className={cn(
      "flex flex-col space-y-1.5 p-5 pb-3 sm:p-6 sm:pb-4 relative z-10",
      className
    )}
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
      "text-base sm:text-lg font-semibold leading-tight tracking-tight",
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
    className={cn(
      "p-5 pt-0 sm:p-6 sm:pt-0 space-y-3 relative z-10",
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
    className={cn(
      "flex items-center p-5 pt-0 sm:p-6 sm:pt-0 gap-3 relative z-10",
      className
    )}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
