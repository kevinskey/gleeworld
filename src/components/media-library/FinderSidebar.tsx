import { useState } from 'react';
import { cn } from '@/lib/utils';
import { 
  Folder, 
  Image, 
  Video, 
  Music, 
  FileText, 
  Star, 
  Trash2, 
  Camera,
  ChevronDown,
  ChevronRight,
  HardDrive
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface FinderSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  fileCounts: Record<string, number>;
  usedStorage: string;
}

export const FinderSidebar = ({
  activeSection,
  onSectionChange,
  fileCounts,
  usedStorage
}: FinderSidebarProps) => {
  const [libraryOpen, setLibraryOpen] = useState(true);
  const [captureOpen, setCaptureOpen] = useState(true);

  const sidebarItems = [
    { id: 'all', label: 'All Media', icon: Folder, count: fileCounts.all },
  ];

  const libraryItems = [
    { id: 'images', label: 'Images', icon: Image, count: fileCounts.images },
    { id: 'videos', label: 'Videos', icon: Video, count: fileCounts.videos },
    { id: 'audio', label: 'Audio', icon: Music, count: fileCounts.audio },
    { id: 'documents', label: 'Documents', icon: FileText, count: fileCounts.documents },
  ];

  const captureItems = [
    { id: 'quick-capture', label: 'Quick Capture', icon: Camera, count: fileCounts['quick-capture'] },
  ];

  const specialItems = [
    { id: 'favorites', label: 'Favorites', icon: Star, count: fileCounts.favorites },
    { id: 'trash', label: 'Trash', icon: Trash2, count: fileCounts.trash },
  ];

  const renderItem = (item: typeof sidebarItems[0]) => (
    <button
      key={item.id}
      onClick={() => onSectionChange(item.id)}
      className={cn(
        "w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors text-left",
        activeSection === item.id
          ? "bg-primary/10 text-primary font-medium"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <item.icon className="h-4 w-4 flex-shrink-0" />
      <span className="truncate flex-1">{item.label}</span>
      {item.count > 0 && (
        <span className="text-xs text-muted-foreground">{item.count}</span>
      )}
    </button>
  );

  return (
    <div className="w-52 border-r border-border bg-muted/30 flex flex-col">
      {/* Main items */}
      <div className="p-2 space-y-1">
        {sidebarItems.map(renderItem)}
      </div>

      {/* Library section */}
      <Collapsible open={libraryOpen} onOpenChange={setLibraryOpen} className="border-t border-border">
        <CollapsibleTrigger className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground">
          {libraryOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          Library
        </CollapsibleTrigger>
        <CollapsibleContent className="px-2 pb-2 space-y-1">
          {libraryItems.map(renderItem)}
        </CollapsibleContent>
      </Collapsible>

      {/* Quick Capture section */}
      <Collapsible open={captureOpen} onOpenChange={setCaptureOpen} className="border-t border-border">
        <CollapsibleTrigger className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground">
          {captureOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          Capture
        </CollapsibleTrigger>
        <CollapsibleContent className="px-2 pb-2 space-y-1">
          {captureItems.map(renderItem)}
        </CollapsibleContent>
      </Collapsible>

      {/* Special items */}
      <div className="border-t border-border p-2 space-y-1">
        {specialItems.map(renderItem)}
      </div>

      {/* Storage */}
      <div className="mt-auto border-t border-border p-3 space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <HardDrive className="h-3 w-3" />
          <span>Storage</span>
        </div>
        <Progress value={Math.min(parseFloat(usedStorage) * 10, 100)} className="h-1.5" />
        <p className="text-xs text-muted-foreground">{usedStorage} GB used</p>
      </div>
    </div>
  );
};
