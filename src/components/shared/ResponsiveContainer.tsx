
import { ReactNode } from "react";

interface ResponsiveContainerProps {
  children: ReactNode;
  className?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "7xl" | "full";
}

export const ResponsiveContainer = ({ 
  children, 
  className = "",
  maxWidth = "7xl" 
}: ResponsiveContainerProps) => {
  const maxWidthClasses = {
    sm: "max-w-sm",
    md: "max-w-md", 
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    "7xl": "max-w-7xl",
    full: "max-w-full"
  };

  return (
    <div className={`w-full ${maxWidthClasses[maxWidth]} mx-auto px-0 sm:px-6 lg:px-8 ${className}`}>
      {children}
    </div>
  );
};
