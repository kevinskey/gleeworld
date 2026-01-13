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
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Ultra-compact floating header */}
      <div className="absolute top-0 left-0 right-0 z-30 safe-top">
        <div className="flex items-center justify-between px-2 py-1.5 bg-gradient-to-b from-background/95 via-background/80 to-transparent backdrop-blur-sm">
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

      {/* Full-screen PDF Viewer - edge to edge */}
      <div className="flex-1 w-full h-full">
        <PDFViewerWithAnnotations 
          key={selectedPdf.url}
          pdfUrl={selectedPdf.url}
          musicTitle={selectedPdf.title}
          musicId={selectedPdf.id}
          className="w-full h-full"
        />
      </div>
    </div>
  );
};