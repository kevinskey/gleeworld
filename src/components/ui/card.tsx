import * as React from "react"
import { cn } from "@/lib/utils"

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    variant?: "default" | "glass" | "elevated" | "outline" | "glossy"
  }
>(({ className, variant = "default", ...props }, ref) => {
  const variants = {
    default: "bg-background/95 backdrop-blur-sm border border-border shadow-card hover:shadow-card-hover",
    glass: "bg-card/80 backdrop-blur-md border border-border shadow-glass",
    elevated: "bg-card border-0 shadow-elevated hover:shadow-glass-lg",
    outline: "bg-transparent border-2 border-border hover:border-primary/50",
    glossy: "bg-[#1a1a1a] border border-[#333] shadow-lg text-white",
  }
  
  return (
    <div
      ref={ref}
      className={cn(
        "rounded-none text-card-foreground transition-all duration-300 relative overflow-hidden",
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
      "flex flex-col space-y-1 px-4 py-3 relative z-10 bg-primary text-primary-foreground",
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
      "text-base sm:text-lg font-semibold leading-tight tracking-tight [&[data-component='card-header']_&]:text-primary-foreground",
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
    className={cn("text-sm text-primary-foreground/80 leading-relaxed", className)}
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
      "px-4 pb-4 pt-0 space-y-3 relative z-10",
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
      "flex items-center px-4 pb-4 pt-0 gap-3 relative z-10",
      className
    )}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
