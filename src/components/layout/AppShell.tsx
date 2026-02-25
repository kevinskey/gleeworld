import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { UniversalHeader } from "./UniversalHeader";
import { PublicHeader } from "./PublicHeader";
import { UniversalFooter } from "./UniversalFooter";
import { MobileBottomNav } from "@/components/navigation/MobileBottomNav";

interface AppShellProps {
  children: ReactNode;
  showHeader?: boolean;
  showFooter?: boolean;
  showMobileNav?: boolean;
  className?: string;
  viewMode?: 'admin' | 'member';
  onViewModeChange?: (mode: 'admin' | 'member') => void;
}

/**
 * AppShell - The unified layout wrapper for all authenticated routes.
 * 
 * Features:
 * - Fixed header with dynamic height stored in --gw-header-h CSS variable
 * - Main content area with proper top padding to prevent content overlap
 * - Consistent footer and mobile navigation
 * - No nested scroll containers - body/main handles scrolling
 */
export const AppShell = ({
  children,
  showHeader = true,
  showFooter = true,
  showMobileNav = true,
  className = "",
  viewMode,
  onViewModeChange
}: AppShellProps) => {
  const location = useLocation();

  // Use PublicHeader for public, fan, and alumnae pages
  const publicHeaderPaths = ['/dashboard/public', '/dashboard/fan', '/alumnae'];
  const shouldUsePublicHeader = publicHeaderPaths.includes(location.pathname);

  return (
    <div className="flex flex-col min-h-screen w-full bg-[hsl(40,10%,96%)]">
      {/* Fixed Header */}
      {showHeader && (
        shouldUsePublicHeader 
          ? <PublicHeader className="bg-card" /> 
          : <UniversalHeader viewMode={viewMode} onViewModeChange={onViewModeChange} />
      )}
      
      {/* Main Content - padded by header height */}
      <main 
        className={`
          w-full 
          flex-1
          pt-[var(--gw-header-h,4rem)]
          pb-0
          bg-[hsl(40,10%,96%)]
          ${className}
        `.trim().replace(/\s+/g, ' ')}
      >
        {children}
      </main>

      {/* Footer */}
      {showFooter && <UniversalFooter />}
      
      {/* Mobile Bottom Navigation */}
      {showMobileNav && <MobileBottomNav />}
    </div>
  );
};

export default AppShell;
