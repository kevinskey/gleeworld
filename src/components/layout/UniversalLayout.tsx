
import { ReactNode } from "react";
import { UniversalHeader } from "./UniversalHeader";
import { UniversalFooter } from "./UniversalFooter";
import { ResponsiveContainer } from "@/components/shared/ResponsiveContainer";
import { ResponsiveDesignEnforcer } from "@/components/ui/responsive-design-enforcer";

interface UniversalLayoutProps {
  children: ReactNode;
  showHeader?: boolean;
  showFooter?: boolean;
  className?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
  containerized?: boolean;
  viewMode?: 'admin' | 'member';
  onViewModeChange?: (mode: 'admin' | 'member') => void;
}

export const UniversalLayout = ({ 
  children, 
  showHeader = true, 
  showFooter = true,
  className = "",
  maxWidth = "full",
  containerized = true,
  viewMode,
  onViewModeChange,
}: UniversalLayoutProps) => {
  return (
    <div className="min-h-screen flex flex-col w-full overflow-x-hidden mobile-text-scale tablet-text-scale desktop-text-scale">
      <ResponsiveDesignEnforcer />
      {showHeader && (
        <UniversalHeader 
          viewMode={viewMode}
          onViewModeChange={onViewModeChange}
        />
      )}
      <main className={`flex-1 w-full overflow-x-hidden ${className}`}>
        {containerized ? (
          <ResponsiveContainer maxWidth={maxWidth}>
            <div className="py-1 sm:py-2">
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
