
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
    md: "max-w-2xl", 
    lg: "max-w-4xl",
    xl: "max-w-5xl",
    "2xl": "max-w-6xl",
    full: "max-w-full"
  };

  return (
    <div className={`w-full ${maxWidthClasses[maxWidth]} mx-auto ${className}`}>
      {children}
    </div>
  );
};
