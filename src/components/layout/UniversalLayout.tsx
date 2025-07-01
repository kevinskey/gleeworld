
import { ReactNode } from "react";
import { UniversalHeader } from "./UniversalHeader";
import { UniversalFooter } from "./UniversalFooter";

interface UniversalLayoutProps {
  children: ReactNode;
  showHeader?: boolean;
  showFooter?: boolean;
  className?: string;
}

export const UniversalLayout = ({ 
  children, 
  showHeader = true, 
  showFooter = true,
  className = ""
}: UniversalLayoutProps) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-700 via-brand-800 to-brand-900 flex flex-col">
      {showHeader && <UniversalHeader />}
      <main className={`flex-1 ${className}`}>
        {children}
      </main>
      {showFooter && <UniversalFooter />}
    </div>
  );
};
