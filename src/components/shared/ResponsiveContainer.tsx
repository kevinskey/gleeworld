
import { ReactNode } from "react";

interface ResponsiveContainerProps {
  children: ReactNode;
  className?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
}

export const ResponsiveContainer = ({ 
  children, 
  className = "",
  maxWidth = "full" 
}: ResponsiveContainerProps) => {
  const maxWidthClasses = {
    sm: "max-w-2xl",
    md: "max-w-4xl", 
    lg: "max-w-6xl",
    xl: "max-w-7xl",
    "2xl": "max-w-screen-2xl",
    full: "max-w-full"
  };

  return (
    <div className={`w-full ${maxWidthClasses[maxWidth]} mx-auto ${className}`}>
      {children}
    </div>
  );
};
