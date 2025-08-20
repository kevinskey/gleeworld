import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Home } from 'lucide-react';

interface BackNavigationProps {
  fallbackPath?: string;
  showHomeButton?: boolean;
  className?: string;
}

export const BackNavigation = ({ 
  fallbackPath = '/dashboard', 
  showHomeButton = true,
  className = '' 
}: BackNavigationProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = () => {
    // Check if there's history to go back to
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      // Fallback to dashboard if no history
      navigate(fallbackPath);
    }
  };

  const handleHome = () => {
    navigate('/dashboard');
  };

  return (
    <div className={`flex items-center gap-2 mb-6 ${className}`}>
      <Button
        variant="outline"
        size="sm"
        onClick={handleBack}
        className="flex items-center gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>
      
      {showHomeButton && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleHome}
          className="flex items-center gap-2"
        >
          <Home className="h-4 w-4" />
          Dashboard
        </Button>
      )}
    </div>
  );
};