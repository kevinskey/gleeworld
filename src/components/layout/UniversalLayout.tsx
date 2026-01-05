import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { UniversalHeader } from "./UniversalHeader";
import { PublicHeader } from "./PublicHeader";
import { UniversalFooter } from "./UniversalFooter";
import { PageContainer } from "./PageContainer";
import { MobileBottomNav } from "@/components/navigation/MobileBottomNav";

interface UniversalLayoutProps {
  children: ReactNode;
  showHeader?: boolean;
  showFooter?: boolean;
  className?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "7xl" | "full";
  containerized?: boolean;
  viewMode?: 'admin' | 'member';
  onViewModeChange?: (mode: 'admin' | 'member') => void;
}

export const UniversalLayout = ({
  children,
  showHeader = true,
  showFooter = true,
  className = "",
  maxWidth = "7xl",
  containerized = true,
  viewMode,
  onViewModeChange
}: UniversalLayoutProps) => {
  const location = useLocation();

  // Use PublicHeader for public, fan, and alumnae pages
  const usePublicHeaderPaths = ['/dashboard/public', '/dashboard/fan', '/alumnae'];
  const shouldUsePublicHeader = usePublicHeaderPaths.includes(location.pathname);

  // Full-bleed shell background for wide screens on dashboards
  const isDashboardShell = location.pathname.startsWith('/dashboard');
  const shellBg = isDashboardShell ? 'bg-muted' : 'bg-background';
  
  return (
    <div className={`min-h-screen w-full ${shellBg}`}>
      {/* Fixed Header */}
      {showHeader && (
        shouldUsePublicHeader 
          ? <PublicHeader className="bg-card" /> 
          : <UniversalHeader viewMode={viewMode} onViewModeChange={onViewModeChange} />
      )}
      
      {/* Main Content - padded by header height to prevent overlap */}
      <main className={`w-full min-h-dvh pt-[var(--gw-header-h,4rem)] pb-20 sm:pb-0 ${shellBg} text-foreground ${className}`}>
        {containerized ? (
          <PageContainer maxWidth="full" padded>
            {children}
          </PageContainer>
        ) : children}
      </main>
      
      {showFooter && <UniversalFooter />}
      
      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
};
