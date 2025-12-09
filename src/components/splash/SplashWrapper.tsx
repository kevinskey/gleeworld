import { useState, useEffect, ReactNode } from "react";
import { SplashScreen } from "./SplashScreen";

interface SplashWrapperProps {
  children: ReactNode;
}

export const SplashWrapper = ({ children }: SplashWrapperProps) => {
  const [showSplash, setShowSplash] = useState(() => {
    // Check on initial render if we should show splash
    if (typeof window !== 'undefined') {
      return !sessionStorage.getItem("gleeworld-splash-seen");
    }
    return false;
  });

  const handleSplashComplete = () => {
    sessionStorage.setItem("gleeworld-splash-seen", "true");
    setShowSplash(false);
  };

  // If not showing splash, render children immediately
  if (!showSplash) {
    return <>{children}</>;
  }

  return (
    <>
      <SplashScreen onComplete={handleSplashComplete} duration={4000} />
      <div className="opacity-0 pointer-events-none absolute">
        {children}
      </div>
    </>
  );
};
