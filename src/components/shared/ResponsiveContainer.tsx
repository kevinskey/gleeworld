
import { ReactNode } from "react";

interface ResponsiveContainerProps {
  children: ReactNode;
  className?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
}

export const ResponsiveContainer = ({ 
  children, 
  className = "",
  maxWidth = "2xl" 
}: ResponsiveContainerProps) => {
  const maxWidthClasses = {
    sm: "max-w-sm",
    md: "max-w-md", 
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    full: "max-w-full"
  };

  return (
    <div className={`w-full ${maxWidthClasses[maxWidth]} mx-auto px-2 sm:px-3 lg:px-4 ${className}`}>
      {children}
    </div>
  );
};
