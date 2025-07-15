import { ReactNode } from "react";
import { PublicHeader } from "./PublicHeader";
import { UniversalFooter } from "./UniversalFooter";

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex flex-col">
      {showHeader && <PublicHeader />}
      <main className={`flex-1 ${className}`}>
        {children}
      </main>
      {showFooter && <UniversalFooter />}
    </div>
  );
};