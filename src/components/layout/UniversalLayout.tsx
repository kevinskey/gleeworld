import { ReactNode, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { UniversalHeader } from "./UniversalHeader";
import { PublicHeader } from "./PublicHeader";
import { UniversalFooter } from "./UniversalFooter";
import { ResponsiveContainer } from "@/components/shared/ResponsiveContainer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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
  const { user } = useAuth();
  const [userBackground, setUserBackground] = useState<string | null>(null);
  
  // Use PublicHeader for public, fan, and alumnae pages
  const usePublicHeaderPaths = [
    '/dashboard/public',
    '/dashboard/fan', 
    '/alumnae'
  ];
  
  const shouldUsePublicHeader = usePublicHeaderPaths.includes(location.pathname);

  useEffect(() => {
    const fetchUserBackground = async () => {
      if (!user?.id) return;
      
      const { data } = await supabase
        .from('gw_profiles')
        .select('dashboard_background_url')
        .eq('user_id', user.id)
        .single();
      
      if (data?.dashboard_background_url) {
        setUserBackground(data.dashboard_background_url);
      }
    };
    
    fetchUserBackground();
  }, [user?.id]);

  return (
    <div 
      className={`min-h-screen flex flex-col w-full overflow-x-hidden relative ${userBackground ? '' : 'bg-background'}`}
    >
      {userBackground && (
        <div 
          className="fixed inset-0 w-full h-full -z-10"
          style={{
            backgroundImage: `url(${userBackground})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        />
      )}
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
      <main className={`flex-1 w-full overflow-x-hidden px-2 sm:px-4 lg:px-6 ${userBackground ? 'bg-transparent' : ''} ${className}`}>
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