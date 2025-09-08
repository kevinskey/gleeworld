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
      <main className={`flex-1 w-full overflow-x-hidden px-4 md:px-6 lg:px-8 xl:px-12 ${className}`}>
        {containerized ? (
          <ResponsiveContainer maxWidth={maxWidth}>
        <div 
          className="py-4 md:py-6 lg:py-8 xl:py-10 relative bg-cover bg-center bg-no-repeat grayscale"
          style={{
            backgroundImage: `url('/lovable-uploads/46a0770f-abdd-41c3-85dc-3c75eaf35e02.png')`
          }}
        >
          <div className="absolute inset-0 bg-black/40"></div>
          <div className="relative z-10">
            {children}
          </div>
        </div>
          </ResponsiveContainer>
        ) : (
          <div className="py-4 md:py-6 lg:py-8 xl:py-10">
            {children}
          </div>
        )}
      </main>
      {showFooter && <UniversalFooter />}
    </div>
  );
};