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
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left section - Navigation */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
            
            <div className="h-6 w-px bg-border" />
            
            <nav className="flex items-center gap-1">
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
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Music className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">Music Library</h1>
                <p className="text-sm text-muted-foreground">
                  Digital & Physical Sheet Music Collection
                </p>
              </div>
            </div>
          </div>

          {/* Right section - Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center gap-2"
            >
              <HelpCircle className="h-4 w-4" />
              Help
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Settings
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};