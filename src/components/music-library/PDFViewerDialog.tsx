import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Upload, Link, Music, Library, X } from 'lucide-react';
import { PDFViewer } from "@/components/PDFViewer";
import { SetlistBuilder } from "./SetlistBuilder";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PDFViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SheetMusic {
  id: string;
  title: string;
  composer: string | null;
  pdf_url: string | null;
}

export const PDFViewerDialog: React.FC<PDFViewerDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const [pdfUrl, setPdfUrl] = useState('');
  const [currentPdfUrl, setCurrentPdfUrl] = useState('');
  const [currentPdfTitle, setCurrentPdfTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('viewer');
  const [showLibrary, setShowLibrary] = useState(false);
  const [sheetMusic, setSheetMusic] = useState<SheetMusic[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadSheetMusic();
    }
  }, [open]);

  const clearPdf = () => {
    setCurrentPdfUrl('');
    setPdfUrl('');
    setCurrentPdfTitle('');
  };

  const handlePdfSelect = (url: string, title: string) => {
    setCurrentPdfUrl(url);
    setCurrentPdfTitle(title);
    setPdfUrl(title);
    setActiveTab('viewer');
    setShowLibrary(false);
    toast({
      title: "PDF Loaded",
      description: `Viewing: ${title}`,
    });
  };

  const loadSheetMusic = async () => {
    setLibraryLoading(true);
    try {
      const { data, error } = await supabase
        .from('gw_sheet_music')
        .select('id, title, composer, pdf_url')
        .order('title');

      if (error) throw error;
      setSheetMusic(data || []);
    } catch (error) {
      console.error('Error loading sheet music:', error);
      toast({
        title: "Error",
        description: "Failed to load sheet music library.",
        variant: "destructive",
      });
    } finally {
      setLibraryLoading(false);
    }
  };

  const handleLibrarySelect = (item: SheetMusic) => {
    if (item.pdf_url) {
      handlePdfSelect(item.pdf_url, item.title);
    } else {
      toast({
        title: "No PDF Available",
        description: "This sheet music doesn't have a PDF file.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            PDF Viewer & Setlist Builder
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="viewer" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              PDF Viewer
            </TabsTrigger>
            <TabsTrigger value="setlists" className="flex items-center gap-2">
              <Music className="h-4 w-4" />
              Setlists
            </TabsTrigger>
          </TabsList>

          <TabsContent value="viewer" className="flex-1 flex flex-col space-y-4">
            {/* Mobile/Tablet: Full screen PDF when selected, Library when not */}
            <div className="lg:hidden">
              {currentPdfUrl ? (
                /* Mobile PDF View */
                <div className="flex flex-col h-full">
                  <div className="bg-muted p-3 border-b rounded-t-lg">
                    <div className="flex items-center justify-between">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={clearPdf}
                        className="flex items-center gap-2"
                      >
                        <Library className="h-4 w-4" />
                        <span className="text-sm">Back to Library</span>
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setActiveTab('setlists')}
                      >
                        <Music className="h-3 w-3 mr-1" />
                        Setlists
                      </Button>
                    </div>
                    <div className="mt-2">
                      <span className="text-sm font-medium truncate block">
                        {currentPdfTitle}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 border border-t-0 rounded-b-lg overflow-hidden">
                    <PDFViewer 
                      pdfUrl={currentPdfUrl}
                      className="w-full h-full"
                    />
                  </div>
                </div>
              ) : (
                /* Mobile Library View */
                <div className="flex flex-col h-full">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Library className="h-5 w-5" />
                      Sheet Music Library
                    </h3>
                    <Button 
                      onClick={() => setActiveTab('setlists')}
                      variant="outline"
                      size="sm"
                    >
                      <Music className="h-4 w-4 mr-1" />
                      Setlists
                    </Button>
                  </div>
                  
                  <div className="flex-1 border rounded-lg overflow-hidden">
                    <ScrollArea className="h-full">
                      <div className="p-4 space-y-3">
                        {libraryLoading ? (
                          <div className="text-center py-8 text-muted-foreground">
                            Loading library...
                          </div>
                        ) : sheetMusic.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                            <p>No sheet music found</p>
                          </div>
                        ) : (
                          sheetMusic.filter(item => item.pdf_url).map((item) => (
                            <div
                              key={item.id}
                              className="p-4 border rounded-lg cursor-pointer transition-colors hover:bg-muted/50 active:bg-muted"
                              onClick={() => handleLibrarySelect(item)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-medium truncate text-base">{item.title}</h4>
                                  {item.composer && (
                                    <p className="text-sm text-muted-foreground truncate mt-1">
                                      by {item.composer}
                                    </p>
                                  )}
                                </div>
                                <div className="ml-3">
                                  <FileText className="h-5 w-5 text-muted-foreground" />
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              )}
            </div>

            {/* Desktop: Side-by-side layout */}
            <div className="hidden lg:grid lg:grid-cols-2 gap-6 h-full">
              {/* Sheet Music Library Panel */}
              <div className="flex flex-col" data-library-panel>
                <div className="flex-1 border rounded-lg overflow-hidden">
                  <ScrollArea className="h-full">
                    <div className="p-4 space-y-3">
                      {libraryLoading ? (
                        <div className="text-center py-8 text-muted-foreground">
                          Loading library...
                        </div>
                      ) : sheetMusic.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p>No sheet music found</p>
                        </div>
                      ) : (
                        sheetMusic.filter(item => item.pdf_url).map((item) => (
                          <div
                            key={item.id}
                            className={`p-3 border rounded-lg cursor-pointer transition-colors hover:bg-muted/50 ${
                              currentPdfUrl === item.pdf_url ? 'border-primary bg-primary/5' : ''
                            }`}
                            onClick={() => handleLibrarySelect(item)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium truncate">{item.title}</h4>
                                {item.composer && (
                                  <p className="text-sm text-muted-foreground truncate">
                                    by {item.composer}
                                  </p>
                                )}
                              </div>
                              <div className="ml-2">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </div>

              {/* PDF Viewer Panel */}
              <div className="flex flex-col relative">
                <div className="flex-1 border rounded-lg overflow-hidden">
                  {currentPdfUrl ? (
                    <>
                      <div className="bg-muted p-3 border-b">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium truncate">
                            {currentPdfTitle}
                          </span>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => setActiveTab('setlists')}
                            >
                              <Music className="h-3 w-3 mr-1" />
                              Setlists
                            </Button>
                            <Button variant="outline" size="sm" onClick={clearPdf}>
                              Close PDF
                            </Button>
                          </div>
                        </div>
                      </div>
                      <PDFViewer 
                        pdfUrl={currentPdfUrl}
                        className="w-full h-full"
                      />
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center p-8">
                      <div className="text-center space-y-2">
                        <FileText className="h-16 w-16 text-muted-foreground mx-auto opacity-50" />
                        <h4 className="font-medium text-muted-foreground">No PDF selected</h4>
                        <p className="text-sm text-muted-foreground">
                          Select a sheet music from the library to view
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="setlists" className="flex-1">
            <SetlistBuilder onPdfSelect={handlePdfSelect} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};