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
            {!currentPdfUrl ? (
              <div className="flex-1 flex flex-col items-center justify-center space-y-6 p-8">
                <div className="text-center space-y-2">
                  <FileText className="h-16 w-16 text-muted-foreground mx-auto" />
                  <h3 className="text-lg font-semibold">Open a PDF</h3>
                  <p className="text-muted-foreground">
                    Select from your library or create a new setlist
                  </p>
                </div>

                <div className="w-full max-w-md space-y-4">
                  {/* Two main options */}
                  <div className="grid grid-cols-1 gap-4">
                    <Button 
                      variant="outline" 
                      size="lg"
                      className="h-16 flex flex-col gap-2"
                      onClick={() => {
                        setShowLibrary(true);
                        loadSheetMusic();
                      }}
                    >
                      <Library className="h-6 w-6" />
                      <span>Select from Library</span>
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="lg"
                      className="h-16 flex flex-col gap-2"
                      onClick={() => setActiveTab('setlists')}
                    >
                      <Music className="h-6 w-6" />
                      <span>Create Setlist</span>
                    </Button>
                  </div>

                  {/* Library Browser */}
                  {showLibrary && (
                    <div className="border rounded-lg p-4 space-y-4 max-h-96">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Sheet Music Library</h4>
                        <Button variant="ghost" size="sm" onClick={() => setShowLibrary(false)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      {libraryLoading ? (
                        <div className="text-center py-4 text-muted-foreground">
                          Loading library...
                        </div>
                      ) : (
                        <ScrollArea className="h-64">
                          <div className="space-y-2">
                            {sheetMusic.length === 0 ? (
                              <div className="text-center py-4 text-muted-foreground">
                                No sheet music found
                              </div>
                            ) : (
                              sheetMusic.filter(item => item.pdf_url).map((item) => (
                                <Button
                                  key={item.id}
                                  variant="ghost"
                                  className="w-full justify-start text-left h-auto p-3"
                                  onClick={() => handleLibrarySelect(item)}
                                >
                                  <div>
                                    <div className="font-medium">{item.title}</div>
                                    {item.composer && (
                                      <div className="text-sm text-muted-foreground">
                                        by {item.composer}
                                      </div>
                                    )}
                                  </div>
                                </Button>
                              ))
                            )}
                          </div>
                        </ScrollArea>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col space-y-4">
                <div className="flex items-center justify-between bg-muted p-3 rounded-lg">
                  <span className="text-sm font-medium truncate">
                    {currentPdfTitle || (pdfUrl.includes('http') ? pdfUrl : `Uploaded: ${pdfUrl}`)}
                  </span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setActiveTab('setlists')}>
                      <Music className="h-3 w-3 mr-1" />
                      Setlists
                    </Button>
                    <Button variant="outline" size="sm" onClick={clearPdf}>
                      Close PDF
                    </Button>
                  </div>
                </div>
                
                <div className="flex-1 border rounded-lg overflow-hidden">
                  <PDFViewer 
                    pdfUrl={currentPdfUrl}
                    className="w-full h-full"
                  />
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="setlists" className="flex-1">
            <SetlistBuilder onPdfSelect={handlePdfSelect} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};