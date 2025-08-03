
import { ReactNode } from "react";
import { UniversalHeader } from "./UniversalHeader";
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
  return (
    <div className={`h-screen ${className.includes('bg-transparent') ? 'bg-transparent' : 'bg-background'} flex flex-col overflow-hidden`}>
      {showHeader && (
        <UniversalHeader 
          viewMode={viewMode}
          onViewModeChange={onViewModeChange}
        />
      )}
      <main 
        className={`flex-1 overflow-y-auto ${className} lg:bg-background`}
        style={{
          backgroundImage: 'url(/lovable-uploads/518af829-608a-44fb-9e8d-d94c43e4a543.png)',
          backgroundSize: 'contain',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <div className="relative z-10">
          {containerized ? (
            <ResponsiveContainer maxWidth={maxWidth}>
              <div className="py-1 sm:py-2">
                {children}
              </div>
            </ResponsiveContainer>
          ) : (
            children
          )}
        </div>
      </main>
      {showFooter && <UniversalFooter />}
    </div>
  );
};
