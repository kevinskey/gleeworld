
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { SheetMusicLibrary } from './SheetMusicLibrary';
import { SetlistBuilder } from './SetlistBuilder';
import { SetlistDiagnostics } from './SetlistDiagnostics';
import { PDFViewer } from '@/components/PDFViewer';
import { Settings } from 'lucide-react';

export const MusicLibrary = () => {
  const [selectedPdf, setSelectedPdf] = useState<{url: string; title: string} | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  const handlePdfSelect = (pdfUrl: string, title: string) => {
    setSelectedPdf({ url: pdfUrl, title });
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-2">Music Library</h1>
          <p className="text-muted-foreground">
            Manage your sheet music collection and create performance setlists
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowDiagnostics(!showDiagnostics)}
          className="flex items-center gap-2"
        >
          <Settings className="h-4 w-4" />
          {showDiagnostics ? 'Hide' : 'Show'} Diagnostics
        </Button>
      </div>

      {showDiagnostics && (
        <div className="mb-6">
          <SetlistDiagnostics />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
        {/* Setlists Column - 30% */}
        <div className="lg:col-span-3 space-y-4">
          <h2 className="text-lg font-semibold">Setlist Builder</h2>
          <SetlistBuilder onPdfSelect={handlePdfSelect} />
        </div>

        {/* PDF Viewer Column - 70% */}
        <div className="lg:col-span-7 space-y-4">
          <h2 className="text-lg font-semibold">PDF Viewer</h2>
          {selectedPdf ? (
            <div className="sticky top-6">
              <PDFViewer 
                pdfUrl={selectedPdf.url}
              />
            </div>
          ) : (
            <div className="sticky top-6 p-8 border-2 border-dashed border-muted rounded-lg text-center text-muted-foreground">
              <p className="text-sm">Select sheet music to view PDF</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
