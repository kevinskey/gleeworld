import { ChevronRight, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FinderBreadcrumbProps {
  path: string[];
  onNavigate: (index: number) => void;
  activeSection: string;
}

const sectionLabels: Record<string, string> = {
  all: 'All Media',
  images: 'Images',
  videos: 'Videos',
  audio: 'Audio',
  documents: 'Documents',
  'quick-capture': 'Quick Capture',
  favorites: 'Favorites',
  trash: 'Trash'
};

export const FinderBreadcrumb = ({ path, onNavigate, activeSection }: FinderBreadcrumbProps) => {
  return (
    <div className="flex items-center gap-1 px-4 py-2 text-sm border-b border-border bg-muted/10">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onNavigate(-1)}
        className="h-6 px-2 text-muted-foreground hover:text-foreground"
      >
        <Home className="h-3.5 w-3.5" />
      </Button>
      
      <ChevronRight className="h-3 w-3 text-muted-foreground" />
      
      <span className="font-medium text-foreground">
        {sectionLabels[activeSection] || activeSection}
      </span>

      {path.map((folder, index) => (
        <div key={index} className="flex items-center gap-1">
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate(index)}
            className="h-6 px-2"
          >
            {folder}
          </Button>
        </div>
      ))}
    </div>
  );
};
