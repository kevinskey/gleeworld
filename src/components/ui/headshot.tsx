import * as React from "react";
import { cn } from "@/lib/utils";
import { getInitials } from "@/utils/avatarUtils";

interface HeadshotProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  alt: string;
  size?: "sm" | "md" | "lg" | "xl";
  ratio?: "4/5" | "3/4" | "1/1";
}

const sizeClasses: Record<NonNullable<HeadshotProps["size"]>, string> = {
  sm: "w-20",
  md: "w-28",
  lg: "w-36",
  xl: "w-40 sm:w-48",
};

const ratioClasses: Record<NonNullable<HeadshotProps["ratio"]>, string> = {
  "4/5": "aspect-[4/5]",
  "3/4": "aspect-[3/4]",
  "1/1": "aspect-square",
};

export const Headshot = React.forwardRef<HTMLDivElement, HeadshotProps>(
  ({ src, alt, size = "xl", ratio = "4/5", className, ...props }, ref) => {
    const initials = getInitials(alt);
    return (
      <div
        ref={ref}
        className={cn(
          "relative overflow-hidden rounded-xl ring-1 ring-border shadow-lg",
          sizeClasses[size],
          ratioClasses[ratio],
          className
        )}
        {...props}
      >
        {src ? (
          <img
            src={src}
            alt={alt}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-muted text-foreground/70 text-xl font-semibold">
            {initials || ""}
          </div>
        )}
      </div>
    );
  }
);
Headshot.displayName = "Headshot";

export default Headshot;
