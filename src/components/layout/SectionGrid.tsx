import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionGridProps {
  children: ReactNode;
  className?: string;
  /** Number of columns at lg breakpoint */
  cols?: 1 | 2 | 3 | 4 | 12;
  /** Gap between grid items */
  gap?: "sm" | "md" | "lg";
}

const colClasses = {
  1: "grid-cols-1",
  2: "grid-cols-1 md:grid-cols-2",
  3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  12: "grid-cols-1 lg:grid-cols-12"
};

const gapClasses = {
  sm: "gap-4",
  md: "gap-6",
  lg: "gap-8"
};

/**
 * SectionGrid - Responsive grid layout for page sections.
 * 
 * Usage:
 * ```tsx
 * <SectionGrid cols={3} gap="md">
 *   <Card>...</Card>
 *   <Card>...</Card>
 *   <Card>...</Card>
 * </SectionGrid>
 * ```
 */
export const SectionGrid = ({
  children,
  className,
  cols = 3,
  gap = "md"
}: SectionGridProps) => {
  return (
    <div className={cn("grid", colClasses[cols], gapClasses[gap], className)}>
      {children}
    </div>
  );
};

export default SectionGrid;
