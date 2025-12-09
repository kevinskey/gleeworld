import { useState, ReactNode } from "react";
import { SplashScreen } from "./SplashScreen";

interface SplashWrapperProps {
  children: ReactNode;
}

export const SplashWrapper = ({ children }: SplashWrapperProps) => {
  // Show splash on every page load
  const [showSplash, setShowSplash] = useState(true);

  const handleSplashComplete = () => {
    setShowSplash(false);
  };

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
