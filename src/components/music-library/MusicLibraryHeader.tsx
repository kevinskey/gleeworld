import { Button } from '@/components/ui/button';
import { 
  Music, 
  Home, 
  ArrowLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const MusicLibraryHeader = () => {
  const navigate = useNavigate();

  return (
    <div className="flex items-center gap-3 mb-2 px-1 lg:hidden">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/dashboard')}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground touch-target"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back</span>
      </Button>
    </div>
  );
};