import { Button } from '@/components/ui/button';
import { ArrowLeft, Music } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

// Desktop-only header with blue strip
// Hidden on mobile since MobileMusicLibrary handles its own navigation
export const MusicLibraryHeader = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const fromPath = (location.state as { from?: string })?.from;

  return (
    <div className="bg-primary text-primary-foreground">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <Music className="h-5 w-5" />
          <h1 className="text-lg font-semibold">Music Library</h1>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(fromPath || '/dashboard')}
          className="flex items-center gap-2 text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </Button>
      </div>
    </div>
  );
};
