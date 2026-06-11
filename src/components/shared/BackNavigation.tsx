import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Home } from 'lucide-react';
import { useHomePath } from '@/hooks/useHomePath';

interface BackNavigationProps {
  fallbackPath?: string;
  showHomeButton?: boolean;
  className?: string;
}

export const BackNavigation = ({
  fallbackPath,
  showHomeButton = true,
  className = ''
}: BackNavigationProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const homePath = useHomePath();

  const handleBack = () => {
    // Check if there's history to go back to
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(fallbackPath ?? homePath);
    }
  };

  const handleHome = () => {
    navigate(homePath);
  };

  return (
    <div className={`flex items-center gap-1.5 sm:gap-2 ${className}`}>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleBack}
        className="flex items-center gap-1 sm:gap-1.5 h-7 sm:h-8 px-2 sm:px-3 text-xs sm:text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50"
      >
        <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" />
        Back
      </Button>
      
      {showHomeButton && (
        <>
          <span className="text-muted-foreground/50 text-xs">/</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleHome}
            className="flex items-center gap-1 sm:gap-1.5 h-7 sm:h-8 px-2 sm:px-3 text-xs sm:text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50"
          >
            <Home className="h-3 w-3 sm:h-4 sm:w-4" />
            Dashboard
          </Button>
        </>
      )}
    </div>
  );
};
