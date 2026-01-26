import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, ExternalLink, FileText, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModuleReading {
  id: string;
  title: string;
  url: string | null;
  description: string | null;
  is_required: boolean;
}

interface ModuleReadingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  readings: ModuleReading[];
  weekNumber: number;
  moduleTitle: string;
}

export const ModuleReadingsModal: React.FC<ModuleReadingsModalProps> = ({
  open,
  onOpenChange,
  readings,
  weekNumber,
  moduleTitle
}) => {
  const [viewingUrl, setViewingUrl] = useState<string | null>(null);

  const handleOpenReading = (reading: ModuleReading) => {
    if (!reading.url) return;
    
    // Check if it's a PDF or embeddable document
    const isPdf = reading.url.toLowerCase().includes('.pdf');
    const isGoogleDoc = reading.url.includes('docs.google.com') || reading.url.includes('drive.google.com');
    
    if (isPdf || isGoogleDoc) {
      // Embed PDFs and Google Docs
      setViewingUrl(reading.url);
    } else {
      // Open external URLs in new tab
      window.open(reading.url, '_blank');
    }
  };

  const closeViewer = () => {
    setViewingUrl(null);
  };

  // Get icon based on URL type
  const getReadingIcon = (url: string | null) => {
    if (!url) return <FileText className="h-5 w-5" />;
    if (url.toLowerCase().includes('.pdf')) return <FileText className="h-5 w-5 text-red-500" />;
    if (url.includes('docs.google.com')) return <FileText className="h-5 w-5 text-blue-500" />;
    return <BookOpen className="h-5 w-5" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0">
        <DialogHeader className="p-4 border-b bg-primary text-primary-foreground">
          <DialogTitle className="flex items-center gap-2 text-primary-foreground">
            <BookOpen className="h-5 w-5" />
            Week {weekNumber} Readings
          </DialogTitle>
          <p className="text-sm text-primary-foreground/80 mt-1">{moduleTitle}</p>
        </DialogHeader>

        {viewingUrl ? (
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 z-10 bg-black/50 hover:bg-black/70 text-white"
              onClick={closeViewer}
            >
              <X className="h-5 w-5" />
            </Button>
            <div className="aspect-[4/3] w-full">
              <iframe
                src={viewingUrl.includes('docs.google.com') ? viewingUrl : 
                     `https://docs.google.com/viewer?url=${encodeURIComponent(viewingUrl)}&embedded=true`}
                className="w-full h-full border-0"
                title="Reading viewer"
              />
            </div>
          </div>
        ) : (
          <ScrollArea className="max-h-[60vh]">
            {readings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <BookOpen className="h-12 w-12 mb-3 opacity-50" />
                <p>No readings assigned for this week</p>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {readings.map((reading) => (
                  <div
                    key={reading.id}
                    onClick={() => handleOpenReading(reading)}
                    className={cn(
                      "flex gap-4 p-4 rounded-lg border cursor-pointer transition-colors",
                      "hover:bg-muted/50 hover:border-primary/30"
                    )}
                  >
                    {/* Icon */}
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                      {getReadingIcon(reading.url)}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2">
                        <h4 className="font-medium text-sm line-clamp-2 flex-1">
                          {reading.title}
                        </h4>
                        {reading.is_required && (
                          <Badge variant="destructive" className="text-xs flex-shrink-0">
                            Required
                          </Badge>
                        )}
                      </div>
                      {reading.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {reading.description}
                        </p>
                      )}
                      {reading.url && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                          <ExternalLink className="h-3 w-3" />
                          <span className="truncate max-w-[200px]">
                            {reading.url.includes('.pdf') ? 'PDF Document' : 
                             reading.url.includes('docs.google.com') ? 'Google Doc' : 'External Link'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
};
