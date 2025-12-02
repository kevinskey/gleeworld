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
    '/alumnae'
  ];
  
  const shouldUsePublicHeader = usePublicHeaderPaths.includes(location.pathname);

  return (
    <div 
      className="min-h-screen flex flex-col w-full overflow-x-hidden relative"
      style={{
        background: 'var(--theme-background, hsl(var(--background)))'
      }}
    >
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
      <main className={`flex-1 w-full overflow-x-hidden px-2 sm:px-4 lg:px-6 ${className}`}>
        {containerized ? (
          <ResponsiveContainer maxWidth={maxWidth}>
            {children}
          </ResponsiveContainer>
        ) : (
          children
        )}
      </main>
      {showFooter && <UniversalFooter />}
    </div>
  );
};