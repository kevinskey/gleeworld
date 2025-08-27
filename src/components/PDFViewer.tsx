import React from 'react';
import { FastPDFViewer } from './FastPDFViewer';
import { cn } from '@/lib/utils';

interface PDFViewerProps {
  pdfUrl: string | null;
  className?: string;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({
  pdfUrl,
  className
}) => {
  // Use the new fast PDF viewer for optimal performance
  return (
    <FastPDFViewer 
      pdfUrl={pdfUrl} 
      className={className}
    />
  );
};

export default PDFViewer;