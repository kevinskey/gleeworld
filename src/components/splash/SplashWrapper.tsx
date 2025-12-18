import { useState, useEffect, ReactNode } from "react";
import { SplashScreen } from "./SplashScreen";
import { useAuth } from "@/contexts/AuthContext";

interface SplashWrapperProps {
  children: ReactNode;
}

const SPLASH_SHOWN_KEY = 'gw_splash_shown_session';

export const SplashWrapper = ({ children }: SplashWrapperProps) => {
  const { user, loading } = useAuth();
  const [showSplash, setShowSplash] = useState(false);
  const [prevUser, setPrevUser] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;

    const currentUserId = user?.id || null;
    const splashShownThisSession = sessionStorage.getItem(SPLASH_SHOWN_KEY);

    // Show splash when user logs in (transition from no user to user)
    if (currentUserId && !prevUser && !splashShownThisSession) {
      setShowSplash(true);
      sessionStorage.setItem(SPLASH_SHOWN_KEY, 'true');
    }

    setPrevUser(currentUserId);
  }, [user, loading, prevUser]);

  // Clear session flag on logout
  useEffect(() => {
    if (!user && !loading) {
      sessionStorage.removeItem(SPLASH_SHOWN_KEY);
    }
  }, [user, loading]);

  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  if (showSplash) {
    return (
      <>
        <SplashScreen onComplete={handleSplashComplete} duration={4000} />
        <div className="opacity-0 pointer-events-none absolute">
          {children}
        </div>
      </>
    );
  }

  return <>{children}</>;
};
