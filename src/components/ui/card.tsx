import * as React from "react"
import { cn } from "@/lib/utils"

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    variant?: "default" | "glass" | "elevated" | "outline" | "glossy" | "muted"
  }
>(({ className, variant = "default", onClick, role, tabIndex, onKeyDown, ...props }, ref) => {
  // A card with onClick and no explicit role is a whole-card target: give
  // it button semantics and Enter/Space so keyboard users can open it.
  // Callers that set their own role/tabIndex/onKeyDown are left alone.
  const clickable = !!onClick && role === undefined && tabIndex === undefined
  // iOS cards: white on gray canvas, 12px continuous-feel corners,
  // whisper shadow. No border on the default surface — contrast + radius
  // carry the elevation (HIG grouped-inset pattern).
  const variants = {
    default: "bg-card shadow-card",
    glass: "bg-card/75 backdrop-blur-xl border border-border/40",
    elevated: "bg-card shadow-card",
    outline: "bg-transparent border border-border",
    glossy: "bg-card shadow-card",
    muted: "bg-muted",
  }

  return (
    <div
      ref={ref}
      data-component="card"
      role={clickable ? 'button' : role}
      tabIndex={clickable ? 0 : tabIndex}
      onClick={onClick}
      onKeyDown={
        clickable
          ? (e) => {
              onKeyDown?.(e)
              if (e.defaultPrevented || e.target !== e.currentTarget) return
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onClick?.(e as unknown as React.MouseEvent<HTMLDivElement>)
              }
            }
          : onKeyDown
      }
      className={cn(
        "rounded-xl text-card-foreground transition-colors duration-150 relative overflow-hidden",
        variants[variant],
        clickable && "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
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
      "flex flex-col space-y-1 p-4",
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
      "font-headline text-card-foreground",
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
    className={cn("text-sm text-muted-foreground", className)}
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
      "p-4 pt-0",
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
      "flex items-center p-4 pt-0 gap-2",
      className
    )}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
