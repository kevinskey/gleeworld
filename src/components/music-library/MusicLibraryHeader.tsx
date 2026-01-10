import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Desktop-only back navigation header
// Hidden on mobile since MobileMusicLibrary handles its own navigation
export const MusicLibraryHeader = () => {
  const navigate = useNavigate();

  return (
    <div className="hidden lg:flex items-center gap-3 mb-2 px-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/dashboard')}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Dashboard</span>
      </Button>
    </div>
  );
};
