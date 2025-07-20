import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, Upload, Link } from 'lucide-react';
import { PDFViewer } from "@/components/PDFViewer";
import { useToast } from "@/hooks/use-toast";

interface PDFViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PDFViewerDialog: React.FC<PDFViewerDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const [pdfUrl, setPdfUrl] = useState('');
  const [currentPdfUrl, setCurrentPdfUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleUrlSubmit = () => {
    if (!pdfUrl.trim()) {
      toast({
        title: "URL Required",
        description: "Please enter a PDF URL to view.",
        variant: "destructive",
      });
      return;
    }

    if (!pdfUrl.toLowerCase().includes('.pdf')) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid PDF URL.",
        variant: "destructive",
      });
      return;
    }

    setCurrentPdfUrl(pdfUrl);
    toast({
      title: "PDF Loaded",
      description: "PDF viewer opened successfully.",
    });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setIsLoading(true);
      const url = URL.createObjectURL(file);
      setCurrentPdfUrl(url);
      setPdfUrl(file.name);
      setIsLoading(false);
      toast({
        title: "PDF Uploaded",
        description: "PDF file loaded successfully.",
      });
    } else {
      toast({
        title: "Invalid File",
        description: "Please select a valid PDF file.",
        variant: "destructive",
      });
    }
  };

  const clearPdf = () => {
    setCurrentPdfUrl('');
    setPdfUrl('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            PDF Viewer
          </DialogTitle>
        </DialogHeader>

        {!currentPdfUrl ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-6 p-8">
            <div className="text-center space-y-2">
              <FileText className="h-16 w-16 text-muted-foreground mx-auto" />
              <h3 className="text-lg font-semibold">Open a PDF</h3>
              <p className="text-muted-foreground">
                Choose a PDF file from your device or enter a URL to view
              </p>
            </div>

            <div className="w-full max-w-md space-y-4">
              {/* URL Input */}
              <div className="space-y-2">
                <Label htmlFor="pdf-url" className="flex items-center gap-2">
                  <Link className="h-4 w-4" />
                  PDF URL
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="pdf-url"
                    placeholder="https://example.com/document.pdf"
                    value={pdfUrl}
                    onChange={(e) => setPdfUrl(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleUrlSubmit()}
                  />
                  <Button onClick={handleUrlSubmit} disabled={!pdfUrl.trim()}>
                    View
                  </Button>
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or</span>
                </div>
              </div>

              {/* File Upload */}
              <div className="space-y-2">
                <Label htmlFor="pdf-file" className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Upload PDF File
                </Label>
                <Input
                  id="pdf-file"
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleFileUpload}
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col space-y-4">
            <div className="flex items-center justify-between bg-muted p-3 rounded-lg">
              <span className="text-sm font-medium truncate">
                {pdfUrl.includes('http') ? pdfUrl : `Uploaded: ${pdfUrl}`}
              </span>
              <Button variant="outline" size="sm" onClick={clearPdf}>
                Close PDF
              </Button>
            </div>
            
            <div className="flex-1 border rounded-lg overflow-hidden">
              <PDFViewer 
                pdfUrl={currentPdfUrl}
                className="w-full h-full"
              />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};