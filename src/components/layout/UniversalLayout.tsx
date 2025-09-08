import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { UniversalHeader } from "./UniversalHeader";
import { PublicHeader } from "./PublicHeader";
import { UniversalFooter } from "./UniversalFooter";
import { ResponsiveContainer } from "@/components/shared/ResponsiveContainer";

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
  const location = useLocation();
  
  // Use PublicHeader for public, fan, and alumnae pages
  const usePublicHeaderPaths = [
    '/dashboard/public',
    '/dashboard/fan', 
    '/dashboard/alumnae'
  ];
  
  const shouldUsePublicHeader = usePublicHeaderPaths.includes(location.pathname);

  return (
    <div className="min-h-screen flex flex-col w-full overflow-x-hidden bg-background text-foreground">
      {showHeader && (
        <>
          {shouldUsePublicHeader ? (
            <PublicHeader />
          ) : (
            <UniversalHeader 
              viewMode={viewMode}
              onViewModeChange={onViewModeChange}
            />
          )}
        </>
      )}
      <main className={`flex-1 w-full overflow-x-hidden ${className}`} style={{ paddingLeft: 'var(--space-4)', paddingRight: 'var(--space-4)' }}>
        {containerized ? (
          <ResponsiveContainer maxWidth={maxWidth}>
            <div style={{ paddingTop: 'var(--space-6)', paddingBottom: 'var(--space-6)' }}>
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