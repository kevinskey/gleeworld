
import { ReactNode } from "react";
import { UniversalHeader } from "./UniversalHeader";
import { UniversalFooter } from "./UniversalFooter";
import { ResponsiveContainer } from "@/components/shared/ResponsiveContainer";

interface UniversalLayoutProps {
  children: ReactNode;
  showHeader?: boolean;
  showFooter?: boolean;
  className?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
  containerized?: boolean;
}

export const UniversalLayout = ({ 
  children, 
  showHeader = true, 
  showFooter = true,
  className = "",
  maxWidth = "full",
  containerized = true,
}: UniversalLayoutProps) => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {showHeader && (
        <UniversalHeader 
        />
      )}
      <main className={`flex-1 ${className}`}>
        {containerized ? (
          <ResponsiveContainer maxWidth={maxWidth}>
            <div className="py-4 sm:py-6">
              {children}
            </div>
          </ResponsiveContainer>
        ) : (
          children
        )}
      </main>
      {showFooter && <UniversalFooter />}
    </div>
  );
};
