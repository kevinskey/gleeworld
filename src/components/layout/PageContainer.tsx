import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageContainerProps {
  children: ReactNode;
  className?: string;
  /** Maximum width constraint */
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "4xl" | "6xl" | "7xl" | "full";
  /** Add standard vertical padding */
  padded?: boolean;
  /** Use the standard section spacing for children */
  sectionSpacing?: boolean;
}

const maxWidthClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "4xl": "max-w-4xl",
  "6xl": "max-w-6xl",
  "7xl": "max-w-7xl",
  full: "max-w-full"
};

/**
 * PageContainer - Standard page content wrapper with consistent spacing.
 * 
 * Usage:
 * ```tsx
 * <PageContainer>
 *   <section>...</section>
 *   <section>...</section>
 * </PageContainer>
 * ```
 * 
 * Features:
 * - Responsive horizontal padding: px-4 sm:px-6 lg:px-8
 * - Standard vertical padding when `padded` is true
 * - Optional section spacing with `sectionSpacing`
 * - Centered with max-width constraint
 */
export const PageContainer = ({
  children,
  className,
  maxWidth = "7xl",
  padded = true,
  sectionSpacing = false
}: PageContainerProps) => {
  return (
    <div
      className={cn(
        "w-full mx-auto",
        "px-4 sm:px-6 lg:px-8",
        padded && "py-6 sm:py-8",
        sectionSpacing && "space-y-6 sm:space-y-8",
        maxWidthClasses[maxWidth],
        className
      )}
    >
      {children}
    </div>
  );
};

export default PageContainer;
