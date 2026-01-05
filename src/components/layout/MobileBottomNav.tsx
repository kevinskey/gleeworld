import { useState } from 'react';
import { Camera, Mic } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MusicalToolkit } from '@/components/musical-toolkit/MusicalToolkit';
import { QuickCaptureCategorySelector, QuickCaptureCategory } from '@/components/quick-capture/QuickCaptureCategorySelector';
import { CategorizedQuickCapture } from '@/components/quick-capture/CategorizedQuickCapture';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAssistant } from '@/contexts/AssistantContext';

interface MobileBottomNavProps {
  onCameraClick?: () => void;
}

export const MobileBottomNav = ({ onCameraClick }: MobileBottomNavProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isWakeWordActive, setIsWakeWordActive } = useAssistant();
  
  const [showCategorySelector, setShowCategorySelector] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<QuickCaptureCategory | null>(null);

  const handleCameraClick = () => {
    if (onCameraClick) {
      onCameraClick();
    } else {
      setShowCategorySelector(true);
    }
  };

  const toggleAssistant = async () => {
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
        className="fixed bottom-0 left-0 right-0 z-50 sm:hidden bg-slate-900 border-t border-slate-700 shadow-lg"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-center justify-evenly w-full h-16 px-4">
          {/* Musical Toolkit */}
          <div className="flex items-center justify-center w-12 h-12 text-white">
            <MusicalToolkit className="!p-0 text-white [&_svg]:text-white [&_button]:text-white" />
          </div>

          {/* Glee Cam - Highlighted Center */}
          <button
            onClick={handleCameraClick}
            className="flex items-center justify-center w-16 h-16 -mt-6 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-xl hover:shadow-2xl hover:scale-105 transition-all border-4 border-slate-900"
          >
            <Camera className="h-7 w-7 text-white" />
          </button>

          {/* Voice Assistant Toggle */}
          <button
            onClick={toggleAssistant}
            className={cn(
              "relative flex items-center justify-center w-12 h-12 rounded-full transition-all",
              isWakeWordActive 
                ? "text-white bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg animate-pulse" 
                : "text-white hover:bg-white/10"
            )}
          >
            <Mic className="h-6 w-6" />
            {isWakeWordActive && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-slate-900 animate-ping" />
            )}
            {isWakeWordActive && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-slate-900" />
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
