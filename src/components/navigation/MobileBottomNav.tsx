import { useState } from 'react';
import { Home, Camera, Music2, Mic, MicOff, LayoutGrid } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { QuickCaptureCategorySelector, QuickCaptureCategory } from '@/components/quick-capture/QuickCaptureCategorySelector';
import { CategorizedQuickCapture } from '@/components/quick-capture/CategorizedQuickCapture';
import { MusicalToolkit } from '@/components/musical-toolkit/MusicalToolkit';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface MobileBottomNavProps {
  className?: string;
}

export const MobileBottomNav = ({ className }: MobileBottomNavProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  
  const [showCategorySelector, setShowCategorySelector] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<QuickCaptureCategory | null>(null);
  const [assistantActive, setAssistantActive] = useState(false);

  // Only show on mobile
  if (!isMobile) return null;

  const isActive = (path: string) => location.pathname === path;

  const toggleAssistant = () => {
    const newState = !assistantActive;
    setAssistantActive(newState);
    toast({
      title: newState ? "Assistant Active" : "Assistant Off",
      description: newState ? "Listening for voice commands..." : "Voice assistant disabled",
      duration: 2000,
    });
  };

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav className={cn(
        "fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border shadow-lg",
        className
      )}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-center justify-around h-14 px-8">
          {/* Musical Toolkit */}
          <div className="flex items-center justify-center w-12 h-12">
            <MusicalToolkit className="!p-0" />
          </div>

          {/* Glee Cam - Highlighted Center */}
          <button
            onClick={() => setShowCategorySelector(true)}
            className="flex items-center justify-center w-14 h-14 -mt-4 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all"
          >
            <Camera className="h-6 w-6" />
          </button>

          {/* Voice Assistant Toggle */}
          <button
            onClick={toggleAssistant}
            className={cn(
              "flex items-center justify-center w-12 h-12 rounded-full transition-all",
              assistantActive 
                ? "text-white bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg animate-pulse" 
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            {assistantActive ? (
              <Mic className="h-5 w-5" />
            ) : (
              <MicOff className="h-5 w-5" />
            )}
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
