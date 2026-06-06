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

  // Use PublicHeader for public, fan, graduates, academy, and calendar pages
  const usePublicHeaderPaths = ['/dashboard/public', '/dashboard/fan', '/graduates', '/glee-academy', '/public-calendar'];
  const shouldUsePublicHeader = usePublicHeaderPaths.includes(location.pathname) || location.pathname.startsWith('/glee-academy');

  const shellBg = 'bg-[hsl(40,10%,96%)]';
  return <div className={`flex flex-col min-h-screen w-full ${shellBg}`}>
      {/* Fixed Header */}
      {showHeader && (shouldUsePublicHeader ? <PublicHeader /> : <UniversalHeader viewMode={viewMode} onViewModeChange={onViewModeChange} />)}
      
      {/* Main Content - padded by header height only when header is shown */}
      <main className={`w-full flex-1 ${showHeader ? 'pt-[calc(var(--gw-header-h,4rem)+var(--gw-radio-bar-height,0px))]' : ''} ${shellBg} text-foreground ${className}`} style={{
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      paddingLeft: 'env(safe-area-inset-left)',
      paddingRight: 'env(safe-area-inset-right)'
    }}>
        {containerized ? <PageContainer maxWidth="full" padded={false} className="!p-0 !m-0">
          {children}
        </PageContainer> : children}
      </main>
      
      {showFooter && <UniversalFooter />}
      
      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>;
};