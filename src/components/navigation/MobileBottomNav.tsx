import { useState, useRef, useEffect } from 'react';
import { Camera, Library, GraduationCap, Music } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useIsPhone } from '@/hooks/use-mobile';
import { useUserRole } from '@/hooks/useUserRole';
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
  const { profile } = useUserRole();
  const previousPath = useRef<string>('/');
  
  const [showCategorySelector, setShowCategorySelector] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<QuickCaptureCategory | null>(null);

  const isInstructor = profile?.role === 'instructor' || profile?.is_admin || profile?.is_super_admin;

  // Track last non-library route (helps when arriving here via deep link)
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
      navigate(previousPath.current || '/');
    } else {
      // Capture where the user is coming from right at click-time
      previousPath.current = location.pathname;
      navigate('/music-library');
    }
  };

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav 
        className={cn(
          "fixed bottom-0 left-0 right-0 z-[99999] bg-background border-t border-border shadow-2xl",
          "pointer-events-auto",
          className
        )}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-center justify-evenly w-full h-12 px-4 bg-background">
          {/* Musical Toolkit */}
          <div className="flex items-center justify-center w-14 h-14 text-foreground">
            <MusicalToolkit className="!p-0 [&_svg]:!h-10 [&_svg]:!w-10" />
          </div>

          {/* Instructor Console - only for instructors/admins */}
          {isInstructor && (
            <button
              onClick={() => navigate('/grading/instructor/dashboard')}
              className={cn(
                "relative flex items-center justify-center w-14 h-14 rounded-full transition-all",
                location.pathname.includes('/instructor')
                  ? "text-primary bg-primary/10"
                  : "text-foreground hover:bg-muted"
              )}
            >
              <GraduationCap className="h-7 w-7" />
            </button>
          )}

          {/* Glee Cam - Highlighted Center with Navy Blue */}
          <button
            onClick={() => setShowCategorySelector(true)}
            className="flex items-center justify-center w-14 h-14 -mt-5 rounded-full bg-[#003666] text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all border-2 border-background"
          >
            <Camera className="h-6 w-6" />
          </button>

          {/* Academy */}
          <button
            onClick={() => navigate('/course-selection')}
            className={cn(
              "relative flex items-center justify-center w-14 h-14 rounded-full transition-all",
              location.pathname.includes('/academy')
                ? "text-primary bg-primary/10" 
                : "text-foreground hover:bg-muted"
            )}
          >
            <Music className="h-7 w-7" />
          </button>

          {/* Music Library */}
          <button
            onClick={handleLibraryClick}
            className={cn(
              "relative flex items-center justify-center w-14 h-14 rounded-full transition-all",
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
