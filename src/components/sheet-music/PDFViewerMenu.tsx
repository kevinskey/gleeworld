import React, { useState } from 'react';
import { 
  Music, 
  Bookmark, 
  Menu, 
  Search, 
  Volume2, 
  Settings,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface PDFViewerMenuProps {
  onScoresClick: () => void;
  onBookmarksClick: () => void;
  onSetlistsClick: () => void;
  onTitleDisplayClick: () => void;
  onSearchClick: () => void;
  onAudioUtilitiesClick: () => void;
  onToolsClick: () => void;
  currentTitle?: string;
  currentPage?: number;
  totalPages?: number;
}

export const PDFViewerMenu: React.FC<PDFViewerMenuProps> = ({
  onScoresClick,
  onBookmarksClick,
  onSetlistsClick,
  onTitleDisplayClick,
  onSearchClick,
  onAudioUtilitiesClick,
  onToolsClick,
  currentTitle = "Wolfgang Amadeus Mozart",
  currentPage = 5,
  totalPages = 9
}) => {
  const [isControlsExpanded, setIsControlsExpanded] = useState(false);

  const menuItems = [
    {
      id: 1,
      icon: Music,
      title: "Scores",
      description: "Access the scores in your library and tap on one to open it",
      onClick: onScoresClick
    },
    {
      id: 2,
      icon: Bookmark,
      title: "Bookmarks",
      description: "Use bookmarks to quickly navigate to a specific page or access multiple pieces within one long PDF file",
      onClick: onBookmarksClick
    },
    {
      id: 3,
      icon: Menu,
      title: "Setlists",
      description: "Create, edit, and play through custom lists of items in your library",
      onClick: onSetlistsClick
    },
    {
      id: 4,
      icon: Settings,
      title: "Title Display",
      description: "See information about the current item and tap here to edit it. Tap the gear button on the left to adjust the page appearance, layout, and turning behavior. Tap the ellipsis button on the right to access a contextual menu featuring common actions related to the content you're currently viewing.",
      onClick: onTitleDisplayClick
    },
    {
      id: 5,
      icon: Search,
      title: "Search",
      description: "Find items in your library and see your most recently viewed items",
      onClick: onSearchClick
    },
    {
      id: 6,
      icon: Volume2,
      title: "Audio Utilities",
      description: "Use forScore's built-in metronome, pitch pipe, and tuner",
      onClick: onAudioUtilitiesClick
    },
    {
      id: 7,
      icon: Settings,
      title: "Tools",
      description: "Open this menu to access additional features, extras, and settings",
      onClick: onToolsClick
    }
  ];

  return (
    <div className="w-full bg-background border-b">
      {/* Top Icon Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-muted/50">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onScoresClick}>
            <Music className="h-5 w-5 text-primary" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onBookmarksClick}>
            <Bookmark className="h-5 w-5 text-primary" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onSetlistsClick}>
            <Menu className="h-5 w-5 text-primary" />
          </Button>
        </div>
        
        {/* Title Display */}
        <div className="flex-1 mx-4">
          <div className="flex items-center justify-center gap-2 bg-background rounded px-3 py-1">
            <Button variant="ghost" size="sm" onClick={onTitleDisplayClick}>
              <Settings className="h-4 w-4" />
            </Button>
            <div className="text-sm font-medium text-center">
              <div className="text-muted-foreground text-xs">{currentTitle}</div>
              <div className="text-foreground">Piano Sonata in C Minor, 3rd Movement, p. {currentPage} of {totalPages}</div>
            </div>
            <Button variant="ghost" size="sm" onClick={onTitleDisplayClick}>
              <Menu className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onSearchClick}>
            <Search className="h-5 w-5 text-primary" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onAudioUtilitiesClick}>
            <Volume2 className="h-5 w-5 text-primary" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onToolsClick}>
            <Settings className="h-5 w-5 text-primary" />
          </Button>
        </div>
      </div>

      {/* Controls Section */}
      <Card className="rounded-none border-0 border-t">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-muted-foreground">Controls</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsControlsExpanded(!isControlsExpanded)}
              className="text-muted-foreground hover:text-foreground"
            >
              {isControlsExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        
        {isControlsExpanded && (
          <CardContent className="pt-0">
            <div className="text-center text-sm text-muted-foreground mb-4">
              The title bar along the top of the screen gives you access to forScore's essentials:
            </div>
            
            <div className="space-y-3">
              {menuItems.map((item) => (
                <div key={item.id} className="flex items-start gap-3 p-2 hover:bg-muted/50 rounded-lg cursor-pointer" onClick={item.onClick}>
                  <div className="flex-shrink-0 mt-1">
                    <Badge variant="secondary" className="w-6 h-6 rounded-full flex items-center justify-center p-0 text-xs">
                      {item.id}
                    </Badge>
                  </div>
                  <div className="flex-shrink-0 mt-1">
                    <item.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-foreground mb-1">{item.title}</div>
                    <div className="text-xs text-muted-foreground leading-relaxed">
                      {item.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="text-center text-xs text-muted-foreground mt-4 italic">
              (Don't see it? Tap once in the center of the screen to show and hide forScore's controls.)
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
};