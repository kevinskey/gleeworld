import { useState } from 'react';
import { Home, Camera, Music2, User, LayoutGrid } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
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
  const isMobile = useIsMobile();
  
  const [showCategorySelector, setShowCategorySelector] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<QuickCaptureCategory | null>(null);

  // Only show on mobile
  if (!isMobile) return null;

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    {
      id: 'home',
      label: 'Home',
      icon: Home,
      action: () => navigate('/dashboard'),
      isActive: isActive('/dashboard'),
    },
    {
      id: 'modules',
      label: 'Modules',
      icon: LayoutGrid,
      action: () => {
        window.dispatchEvent(new CustomEvent('open-command-palette'));
      },
      isActive: false,
    },
    {
      id: 'camera',
      label: 'Glee Cam',
      icon: Camera,
      action: () => setShowCategorySelector(true),
      isActive: false,
      highlight: true,
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: User,
      action: () => navigate('/profile'),
      isActive: isActive('/profile'),
    },
  ];

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav className={cn(
        "fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border shadow-lg",
        className
      )}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={item.action}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full py-1 px-1 rounded-lg transition-all",
                item.isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground",
                item.highlight && "relative"
              )}
            >
              {item.highlight ? (
                <div className="w-12 h-12 -mt-6 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-lg">
                  <item.icon className="h-6 w-6" />
                </div>
              ) : (
                <item.icon className={cn(
                  "h-5 w-5 mb-0.5",
                  item.isActive && "text-primary"
                )} />
              )}
              <span className={cn(
                "text-[10px] font-medium",
                item.highlight && "mt-1"
              )}>
                {item.label}
              </span>
            </button>
          ))}
          
          {/* Musical Toolkit - integrated as dropdown */}
          <div className="flex flex-col items-center justify-center flex-1 h-full">
            <MusicalToolkit className="!p-0" />
            <span className="text-[10px] font-medium text-muted-foreground -mt-1">Toolkit</span>
          </div>
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
