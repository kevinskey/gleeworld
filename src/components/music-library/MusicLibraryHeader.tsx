import { Button } from '@/components/ui/button';
import { 
  Music, 
  Home, 
  ArrowLeft,
  Settings,
  HelpCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const MusicLibraryHeader = () => {
  const navigate = useNavigate();

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-2 sm:px-6 py-2 sm:py-4">
        <div className="flex items-center justify-between">
          {/* Left section - Navigation */}
          <div className="flex items-center gap-1 sm:gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3"
            >
              <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Back to Dashboard</span>
              <span className="sm:hidden">Back</span>
            </Button>
            
            <div className="hidden sm:block h-6 w-px bg-border" />
            
            <nav className="hidden sm:flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/')}
                className="flex items-center gap-2"
              >
                <Home className="h-4 w-4" />
                Home
              </Button>
            </nav>
          </div>

          {/* Center section - Title */}
          <div className="flex items-center gap-1 sm:gap-3 flex-1 justify-center sm:justify-start">
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="p-1 sm:p-2 bg-primary/10 rounded-lg">
                <Music className="h-4 w-4 sm:h-6 sm:w-6 text-primary" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg sm:text-xl font-semibold">Music Library</h1>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Digital & Physical Sheet Music Collection
                </p>
              </div>
            </div>
          </div>

          {/* Right section - Actions */}
          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3"
            >
              <HelpCircle className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Help</span>
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3"
            >
              <Settings className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Settings</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};