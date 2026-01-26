import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { BookOpen, ExternalLink, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { InAppPDFViewerDialog } from '@/components/music-library/InAppPDFViewerDialog';

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
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  const [selectedReading, setSelectedReading] = useState<ModuleReading | null>(null);

  const handleOpenReading = (reading: ModuleReading) => {
    if (!reading.url) return;
    
    // Check if it's a PDF
    const isPdf = reading.url.toLowerCase().includes('.pdf') || 
                  reading.url.toLowerCase().includes('/pdf/') ||
                  reading.url.includes('supabase.co/storage');
    
    if (isPdf) {
      // Open in the in-app PDF viewer with annotation support
      setSelectedReading(reading);
      setPdfViewerOpen(true);
    } else {
      // Open external URLs (Google Docs, websites, etc.) in new tab
      window.open(reading.url, '_blank');
    }
  };

  const handleClosePdfViewer = () => {
    setPdfViewerOpen(false);
    setSelectedReading(null);
  };

  // Get icon based on URL type
  const getReadingIcon = (url: string | null) => {
    if (!url) return <FileText className="h-5 w-5" />;
    if (url.toLowerCase().includes('.pdf') || url.includes('supabase.co/storage')) {
      return <FileText className="h-5 w-5 text-red-500" />;
    }
    if (url.includes('docs.google.com')) return <FileText className="h-5 w-5 text-blue-500" />;
    return <BookOpen className="h-5 w-5" />;
  };

  // Get file type label
  const getFileTypeLabel = (url: string | null) => {
    if (!url) return 'Document';
    if (url.toLowerCase().includes('.pdf') || url.includes('supabase.co/storage')) {
      return 'PDF Document';
    }
    if (url.includes('docs.google.com')) return 'Google Doc';
    return 'External Link';
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] p-0">
          <DialogHeader className="p-4 border-b bg-primary text-primary-foreground">
            <DialogTitle className="flex items-center gap-2 text-primary-foreground">
              <BookOpen className="h-5 w-5" />
              Week {weekNumber} Readings
            </DialogTitle>
            <p className="text-sm text-primary-foreground/80 mt-1">{moduleTitle}</p>
          </DialogHeader>

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
                            {getFileTypeLabel(reading.url)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* In-App PDF Viewer with Annotation Support */}
      {selectedReading && (
        <InAppPDFViewerDialog
          open={pdfViewerOpen}
          onOpenChange={handleClosePdfViewer}
          pdfUrl={selectedReading.url || ''}
          title={selectedReading.title}
          musicId={selectedReading.id}
        />
      )}
    </>
  );
};
