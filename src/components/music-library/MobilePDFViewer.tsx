import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PDFViewerWithAnnotations } from '@/components/PDFViewerWithAnnotations';
import { Eye, ArrowLeft, Maximize } from 'lucide-react';

interface MobilePDFViewerProps {
  selectedPdf: {url: string; title: string; id?: string} | null;
  onBack: () => void;
  onStudyMode: () => void;
}

export const MobilePDFViewer = ({ selectedPdf, onBack, onStudyMode }: MobilePDFViewerProps) => {
  if (!selectedPdf) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center">
        <div className="w-32 h-32 bg-muted rounded-lg flex items-center justify-center mb-4">
          <Eye className="h-16 w-16 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-2">No Sheet Music Selected</h3>
        <p className="text-muted-foreground mb-4">
          Choose a piece from the library to view it here
        </p>
        <Button onClick={onBack} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Library
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Mobile PDF Header */}
      <div className="sticky top-0 z-10 bg-background border-b p-3">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onBack} className="h-8 px-2 text-xs sm:h-9 sm:px-3 sm:text-sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Library
          </Button>
          <div className="flex-1 min-w-0 mx-3">
            <h2 className="text-sm font-medium truncate">{selectedPdf.title}</h2>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={onStudyMode} className="h-8 px-2 text-xs sm:h-9 sm:px-3 sm:text-sm">
              <Maximize className="h-4 w-4 mr-1" />
              Study
            </Button>
          </div>
        </div>
      </div>

      {/* PDF Viewer */}
      <div className="flex-1 overflow-hidden">
        <PDFViewerWithAnnotations 
          key={selectedPdf.url}
          pdfUrl={selectedPdf.url}
          musicTitle={selectedPdf.title}
          musicId={selectedPdf.id}
          variant="plain"
          className="w-full h-full"
        />
      </div>
    </div>
  );
};