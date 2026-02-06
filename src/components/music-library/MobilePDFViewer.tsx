import React from 'react';
import { Button } from "@/components/ui/button";
import { PDFViewerWithAnnotations } from '@/components/PDFViewerWithAnnotations';
import { Eye, ArrowLeft, BookOpen } from 'lucide-react';

interface MobilePDFViewerProps {
  selectedPdf: {url: string; title: string; id?: string} | null;
  onBack: () => void;
  onStudyMode: () => void;
}

export const MobilePDFViewer = ({ selectedPdf, onBack, onStudyMode }: MobilePDFViewerProps) => {
  if (!selectedPdf) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-4 text-center">
        <div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center mb-3">
          <Eye className="h-10 w-10 text-muted-foreground" />
        </div>
        <h3 className="text-base font-medium mb-1">No Sheet Music Selected</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Choose a piece from the library
        </p>
        <Button onClick={onBack} variant="outline" size="sm" className="h-8 text-xs">
          <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
          Back to Library
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100000] bg-background flex flex-col">
      {/* Header in document flow with safe-area top padding */}
      <div 
        className="flex-shrink-0 bg-background/95 backdrop-blur-sm border-b border-border"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="flex items-center justify-between px-2 py-1.5 h-10">
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={onBack} 
            className="h-7 px-2 text-xs gap-1 shadow-sm"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Library</span>
          </Button>
          
          <h2 className="text-xs font-medium truncate max-w-[40%] text-center px-2">
            {selectedPdf.title}
          </h2>
          
          <Button 
            size="sm" 
            onClick={onStudyMode} 
            className="h-7 px-2 text-xs gap-1 shadow-sm"
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>Study</span>
          </Button>
        </div>
      </div>

      {/* PDF Viewer - takes remaining space, full bleed */}
      <div 
        className="flex-1 min-h-0 w-full"
      >
        <PDFViewerWithAnnotations 
          key={selectedPdf.url}
          pdfUrl={selectedPdf.url}
          musicTitle={selectedPdf.title}
          musicId={selectedPdf.id}
          isInMobileViewer
          className="w-full h-full"
        />
      </div>
    </div>
  );
};
