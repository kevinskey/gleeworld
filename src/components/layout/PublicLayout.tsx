import { ReactNode } from "react";
import { PublicHeader } from "./PublicHeader";
import { UniversalFooter } from "./UniversalFooter";
import { ResponsiveDesignEnforcer } from "@/components/ui/responsive-design-enforcer";

interface PublicLayoutProps {
  children: ReactNode;
  showHeader?: boolean;
  showFooter?: boolean;
  className?: string;
}

export const PublicLayout = ({ 
  children, 
  showHeader = true, 
  showFooter = true,
  className = ""
}: PublicLayoutProps) => {
  return (
    <div className="min-h-screen flex flex-col mobile-text-scale tablet-text-scale desktop-text-scale">
      <ResponsiveDesignEnforcer />
      {showHeader && <PublicHeader />}
      <main className={`flex-1 ${className}`}>
        {children}
      </main>
      {showFooter && <UniversalFooter />}
    </div>
  );
};