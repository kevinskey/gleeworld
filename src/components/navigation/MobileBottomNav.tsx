import { useState, useRef, useEffect } from 'react';
import { Camera, Library } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useIsPhone } from '@/hooks/use-mobile';
import { QuickCaptureCategorySelector, QuickCaptureCategory } from '@/components/quick-capture/QuickCaptureCategorySelector';
import { CategorizedQuickCapture } from '@/components/quick-capture/CategorizedQuickCapture';
import { MusicalToolkit } from '@/components/musical-toolkit/MusicalToolkit';
import { cn } from '@/lib/utils';

interface MobileBottomNavProps {
  className?: string;
}

export const MobileBottomNav = ({ className }: MobileBottomNavProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isPhone = useIsPhone();
  const previousPath = useRef<string>('/dashboard');
  
  const [showCategorySelector, setShowCategorySelector] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<QuickCaptureCategory | null>(null);

  // Track the previous path before navigating to music library
  useEffect(() => {
    if (location.pathname !== '/music-library') {
      previousPath.current = location.pathname;
    }
  }, [location.pathname]);

  // Only show on phones (not tablets or desktop)
  if (!isPhone) return null;

  const isActive = (path: string) => location.pathname === path;

  const handleLibraryClick = () => {
    if (isActive('/music-library')) {
      navigate(previousPath.current || '/dashboard');
    } else {
      navigate('/music-library');
    }
  };

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav 
        className={cn(
          "fixed bottom-0 left-0 right-0 z-[99999] bg-background border-t border-border shadow-2xl",
          className
        )}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-center justify-evenly w-full h-16 px-4 bg-background">
          {/* Musical Toolkit */}
          <div className="flex items-center justify-center w-12 h-12 text-foreground">
            <MusicalToolkit className="!p-0" />
          </div>

          {/* Glee Cam - Highlighted Center */}
          <button
            onClick={() => setShowCategorySelector(true)}
            className="flex items-center justify-center w-16 h-16 -mt-6 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-xl hover:shadow-2xl hover:scale-105 transition-all border-4 border-background"
          >
            <Camera className="h-7 w-7" />
          </button>

          {/* Music Library */}
          <button
            onClick={handleLibraryClick}
            className={cn(
              "relative flex items-center justify-center w-12 h-12 rounded-full transition-all",
              isActive('/music-library')
                ? "text-primary bg-primary/10" 
                : "text-foreground hover:bg-muted"
            )}
          >
            <Library className="h-7 w-7" />
          </button>
        </div>
      </nav>

      {/* Quick Capture Category Selector */}
      <QuickCaptureCategorySelector
        open={showCategorySelector}
        onClose={() => setShowCategorySelector(false)}
        onSelectCategory={(category) => {
          setShowCategorySelector(false);
          setSelectedCategory(category);
        }}
      />

      {/* Categorized Quick Capture */}
      {selectedCategory && (
        <CategorizedQuickCapture
          category={selectedCategory}
          onClose={() => setSelectedCategory(null)}
          onBack={() => {
            setSelectedCategory(null);
            setShowCategorySelector(true);
          }}
        />
      )}
    </>
  );
};
