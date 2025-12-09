import { useState, useEffect, ReactNode } from "react";
import { SplashScreen } from "./SplashScreen";

interface SplashWrapperProps {
  children: ReactNode;
}

export const SplashWrapper = ({ children }: SplashWrapperProps) => {
  const [showSplash, setShowSplash] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Check if we should show splash (only once per session)
    const hasSeenSplash = sessionStorage.getItem("gleeworld-splash-seen");
    
    if (!hasSeenSplash) {
      setShowSplash(true);
    } else {
      setIsReady(true);
    }
  }, []);

  const handleSplashComplete = () => {
    sessionStorage.setItem("gleeworld-splash-seen", "true");
    setShowSplash(false);
    setIsReady(true);
  };

  return (
    <>
      {showSplash && <SplashScreen onComplete={handleSplashComplete} duration={4000} />}
      <div className={`transition-opacity duration-500 ${isReady ? "opacity-100" : "opacity-0"}`}>
        {children}
      </div>
    </>
  );
};
