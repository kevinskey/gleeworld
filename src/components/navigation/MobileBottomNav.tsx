import { useState } from 'react';
import { Camera, Mic } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useIsPhone } from '@/hooks/use-mobile';
import { QuickCaptureCategorySelector, QuickCaptureCategory } from '@/components/quick-capture/QuickCaptureCategorySelector';
import { CategorizedQuickCapture } from '@/components/quick-capture/CategorizedQuickCapture';
import { MusicalToolkit } from '@/components/musical-toolkit/MusicalToolkit';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAssistant } from '@/contexts/AssistantContext';

interface MobileBottomNavProps {
  className?: string;
}

export const MobileBottomNav = ({ className }: MobileBottomNavProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isPhone = useIsPhone();
  const { toast } = useToast();
  const { isWakeWordActive, setIsWakeWordActive, wakeWordStatus } = useAssistant();
  
  const [showCategorySelector, setShowCategorySelector] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<QuickCaptureCategory | null>(null);

  // Only show on phones (not tablets or desktop)
  if (!isPhone) return null;

  const isActive = (path: string) => location.pathname === path;

  const toggleAssistant = async () => {
    // Request microphone permission first if activating
    if (!isWakeWordActive) {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        setIsWakeWordActive(true);
        toast({
          title: "Hey Glee Enabled",
          description: "Say \"Hey Glee\" to activate the assistant.",
          duration: 3000,
        });
      } catch (e) {
        toast({
          title: "Microphone Required",
          description: "Please allow microphone access to use voice assistant.",
          variant: "destructive",
        });
      }
    } else {
      setIsWakeWordActive(false);
      toast({
        title: "Assistant Off",
        description: "Voice assistant disabled",
        duration: 2000,
      });
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

          {/* Voice Assistant Toggle */}
          <button
            onClick={toggleAssistant}
            className={cn(
              "relative flex items-center justify-center w-12 h-12 rounded-full transition-all",
              isWakeWordActive 
                ? "text-white bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg animate-pulse" 
                : "text-foreground hover:bg-muted"
            )}
          >
            <Mic className="h-7 w-7" />
            {isWakeWordActive && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-background animate-ping" />
            )}
            {isWakeWordActive && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-background" />
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
