import { Button } from "@/components/ui/button";
import { Camera, Music, CalendarDays } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { MusicalToolkit } from "@/components/musical-toolkit/MusicalToolkit";

interface MobileBottomNavProps {
  onCameraClick: () => void;
}

export const MobileBottomNav = ({ onCameraClick }: MobileBottomNavProps) => {
  const navigate = useNavigate();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 sm:hidden bg-white/95 backdrop-blur-xl border-t border-border shadow-lg">
      <div className="flex items-center justify-between px-6 py-3 safe-area-inset-bottom">
        {/* Left side - Camera & Music Toolkit */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onCameraClick}
            className="h-10 w-10 p-0 rounded-full hover:bg-gray-100"
          >
            <Camera className="h-5 w-5" />
          </Button>
          <MusicalToolkit />
        </div>

        {/* Right side - Calendar */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/calendar')}
            className="h-10 w-10 p-0 rounded-full hover:bg-gray-100"
          >
            <CalendarDays className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};
