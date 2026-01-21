import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Scissors, FileText, Loader2, Search, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PDFCropEditor } from "@/components/glee-library/PDFCropEditor";

interface SheetMusic {
  id: string;
  title: string;
  composer?: string;
  pdf_url?: string;
  crop_recommendations?: unknown;
}

export const SinglePDFCropTool = () => {
  const [sheetMusic, setSheetMusic] = useState<SheetMusic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPDF, setSelectedPDF] = useState<SheetMusic | null>(null);
  const [isCropDialogOpen, setIsCropDialogOpen] = useState(false);

  useEffect(() => {
    loadSheetMusic();
  }, []);

  const loadSheetMusic = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_sheet_music')
        .select('id, title, composer, pdf_url, crop_recommendations')
        .not('pdf_url', 'is', null)
        .order('title');

      if (error) {
        console.error('Error loading sheet music:', error);
        toast.error('Failed to load sheet music');
        return;
      }

      setSheetMusic(data || []);
    } catch (error) {
      console.error('Error loading sheet music:', error);
      toast.error('Failed to load sheet music');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveCroppedPDF = async (blob: Blob) => {
    if (!selectedPDF) {
      toast.error('No PDF selected');
      return;
    }

    try {
      // Upload the cropped PDF to storage
      const fileName = `${selectedPDF.id}_cropped_${Date.now()}.pdf`;
      const filePath = `sheet-music/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('glee-library')
        .upload(filePath, blob, {
          contentType: 'application/pdf',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('glee-library')
        .getPublicUrl(filePath);

      // Update the sheet music record with new PDF URL
      const { error: updateError } = await supabase
        .from('gw_sheet_music')
        .update({
          pdf_url: urlData.publicUrl,
          crop_recommendations: {
            applied: true,
            appliedAt: new Date().toISOString(),
          },
        })
        .eq('id', selectedPDF.id);

      if (updateError) throw updateError;

      toast.success('Cropped PDF saved successfully!');
      setIsCropDialogOpen(false);
      setSelectedPDF(null);
      
      // Refresh the list
      loadSheetMusic();
    } catch (error) {
      console.error('Error saving cropped PDF:', error);
      toast.error('Failed to save cropped PDF');
    }
  };

  const filteredMusic = sheetMusic.filter((item) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.title.toLowerCase().includes(query) ||
      (item.composer?.toLowerCase().includes(query) ?? false)
    );
  });

  const openCropEditor = (item: SheetMusic) => {
    setSelectedPDF(item);
    setIsCropDialogOpen(true);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Loading sheet music...
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scissors className="h-5 w-5" />
            Single PDF Crop Tool
          </CardTitle>
          <CardDescription>
            Select a PDF to open in the crop editor with full preview and page-by-page controls
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search PDFs by title or composer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* PDF List */}
          <ScrollArea className="h-96">
            <div className="space-y-2">
              {filteredMusic.map((item) => {
                const cropRec = item.crop_recommendations as Record<string, unknown> | null;
                const isCropped = cropRec?.applied === true;
                
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.title}</p>
                      {item.composer && (
                        <p className="text-sm text-muted-foreground truncate">
                          {item.composer}
                        </p>
                      )}
                    </div>

                    {isCropped && (
                      <Badge className="bg-green-500 text-white flex-shrink-0">
                        Cropped
                      </Badge>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openCropEditor(item)}
                      className="flex-shrink-0"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      {isCropped ? 'Re-crop' : 'Crop'}
                    </Button>
                  </div>
                );
              })}

              {filteredMusic.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  {searchQuery ? 'No PDFs match your search' : 'No PDFs available'}
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="text-sm text-muted-foreground">
            Showing {filteredMusic.length} of {sheetMusic.length} PDFs
          </div>
        </CardContent>
      </Card>

      {/* Crop Editor Dialog */}
      <Dialog open={isCropDialogOpen} onOpenChange={setIsCropDialogOpen}>
        <DialogContent className="max-w-[95vw] w-full h-[90vh] p-0">
          <DialogHeader className="p-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <Scissors className="h-5 w-5" />
              Crop: {selectedPDF?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden h-[calc(90vh-80px)]">
            {selectedPDF?.pdf_url && (
              <PDFCropEditor
                pdfUrl={selectedPDF.pdf_url}
                title={selectedPDF.title}
                onSave={handleSaveCroppedPDF}
                onClose={() => {
                  setIsCropDialogOpen(false);
                  setSelectedPDF(null);
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
