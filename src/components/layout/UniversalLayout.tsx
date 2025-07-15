
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
  systemActiveTab?: string;
  onSystemTabChange?: (tab: string) => void;
}

export const UniversalLayout = ({ 
  children, 
  showHeader = true, 
  showFooter = true,
  className = "",
  maxWidth = "full",
  containerized = true,
  systemActiveTab,
  onSystemTabChange
}: UniversalLayoutProps) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex flex-col">
      {showHeader && (
        <UniversalHeader 
          systemActiveTab={systemActiveTab}
          onSystemTabChange={onSystemTabChange}
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
