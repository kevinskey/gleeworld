import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Camera, 
  X, 
  RotateCw, 
  Trash2, 
  FileText, 
  Download,
  ScanLine,
  CheckCircle,
  AlertCircle,
  Zap,
  Crop
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { uploadFileAndGetUrl } from '@/utils/storage';
import jsPDF from 'jspdf';

interface CapturedPage {
  id: string;
  imageUrl: string;
  blob: Blob;
  pageNumber: number;
  timestamp: Date;
}

interface DocumentScannerProps {
  onClose: () => void;
  onComplete?: (pdfUrl: string, metadata: any) => void;
}

export const DocumentScanner = ({ onClose, onComplete }: DocumentScannerProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Camera and capture state
  const [isScanning, setIsScanning] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [capturedPages, setCapturedPages] = useState<CapturedPage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Form state for metadata
  const [title, setTitle] = useState('');
  const [composer, setComposer] = useState('');
  const [arranger, setArranger] = useState('');
  const [voicing, setVoicing] = useState('');
  const [notes, setNotes] = useState('');
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = useCallback(async () => {
    try {
      setIsScanning(true);
      
      const constraints = {
        video: {
          facingMode,
          width: { ideal: 1080 },
          height: { ideal: 1920 }
        }
      };
      
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (error) {
        // Fallback for devices without environment camera
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsCameraReady(true);
        
        toast({
          title: "Camera Ready",
          description: "Position your document within the frame and tap capture.",
        });
      }
    } catch (error) {
      console.error('Error starting camera:', error);
      toast({
        title: "Camera Error",
        description: "Unable to access camera. Please check permissions and try again.",
        variant: "destructive",
      });
      setIsScanning(false);
    }
  }, [facingMode, toast]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
    setIsCameraReady(false);
  }, []);

  const capturePage = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !isCameraReady) return;

    try {
      setIsProcessing(true);
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (!context) return;

      // Set canvas size to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Apply basic image enhancement
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Basic contrast enhancement for document clarity
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        // Convert to grayscale
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        
        // Enhance contrast for better text readability
        let enhanced;
        if (gray > 180) {
          enhanced = 255; // Pure white for light areas
        } else if (gray < 75) {
          enhanced = 0;   // Pure black for dark areas (text)
        } else {
          // Enhance contrast in middle range
          enhanced = gray > 127 ? Math.min(255, gray * 1.2) : Math.max(0, gray * 0.8);
        }
        
        data[i] = enhanced;     // R
        data[i + 1] = enhanced; // G
        data[i + 2] = enhanced; // B
        // Alpha channel remains unchanged
      }
      
      context.putImageData(imageData, 0, 0);

      // Convert to blob
      canvas.toBlob((blob) => {
        if (blob) {
          const pageId = `page-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          const imageUrl = URL.createObjectURL(blob);
          const pageNumber = capturedPages.length + 1;
          
          const newPage: CapturedPage = {
            id: pageId,
            imageUrl,
            blob,
            pageNumber,
            timestamp: new Date()
          };
          
          setCapturedPages(prev => [...prev, newPage]);
          
          toast({
            title: "Page Captured",
            description: `Page ${pageNumber} captured successfully`,
          });
        }
        setIsProcessing(false);
      }, 'image/jpeg', 0.9);
      
    } catch (error) {
      console.error('Error capturing page:', error);
      toast({
        title: "Capture Error",
        description: "Failed to capture page. Please try again.",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  }, [isCameraReady, capturedPages.length, toast]);

  const deletePage = useCallback((pageId: string) => {
    setCapturedPages(prev => {
      const filtered = prev.filter(page => page.id !== pageId);
      // Renumber remaining pages
      return filtered.map((page, index) => ({
        ...page,
        pageNumber: index + 1
      }));
    });
    
    toast({
      title: "Page Deleted",
      description: "Page has been removed from the document.",
    });
  }, [toast]);

  const switchCamera = useCallback(async () => {
    if (isScanning) {
      stopCamera();
      await new Promise(resolve => setTimeout(resolve, 100));
      setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
      await startCamera();
    } else {
      setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    }
  }, [isScanning, stopCamera, startCamera]);

  const generatePDF = useCallback(async () => {
    if (capturedPages.length === 0) {
      toast({
        title: "No Pages",
        description: "Please capture at least one page before generating PDF.",
        variant: "destructive",
      });
      return;
    }

    if (!title.trim()) {
      toast({
        title: "Title Required",
        description: "Please enter a title for the document.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsProcessing(true);
      
      toast({
        title: "Generating PDF",
        description: "Creating PDF from captured pages...",
      });
      
      // Create PDF with captured pages
      const pdf = new jsPDF();
      
      for (let i = 0; i < capturedPages.length; i++) {
        const page = capturedPages[i];
        
        if (i > 0) {
          pdf.addPage();
        }
        
        // Create image from blob
        const imageDataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(page.blob);
        });
        
        // Add image to PDF page
        const img = new Image();
        await new Promise<void>((resolve, reject) => {
          img.onload = () => {
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            
            // Calculate aspect ratio and fit to page
            const imgAspectRatio = img.width / img.height;
            const pageAspectRatio = pageWidth / pageHeight;
            
            let imgWidth, imgHeight;
            if (imgAspectRatio > pageAspectRatio) {
              imgWidth = pageWidth - 20; // 10mm margin on each side
              imgHeight = imgWidth / imgAspectRatio;
            } else {
              imgHeight = pageHeight - 20; // 10mm margin on top/bottom
              imgWidth = imgHeight * imgAspectRatio;
            }
            
            const x = (pageWidth - imgWidth) / 2;
            const y = (pageHeight - imgHeight) / 2;
            
            pdf.addImage(imageDataUrl, 'JPEG', x, y, imgWidth, imgHeight);
            resolve();
          };
          img.onerror = reject;
          img.src = imageDataUrl;
        });
      }
      
      // Convert PDF to blob
      const pdfBlob = pdf.output('blob');
      
      // Generate filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const cleanTitle = title.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
      const filename = `scanned_score_${cleanTitle}_${timestamp}.pdf`;
      
      // Create File object
      const pdfFile = new File([pdfBlob], filename, { type: 'application/pdf' });
      
      // Upload to storage
      const uploadResult = await uploadFileAndGetUrl(pdfFile, 'sheet-music', 'pdfs');
      
      if (!uploadResult) {
        throw new Error('Failed to upload PDF');
      }
      
      // Save to database
      const { error } = await supabase
        .from('gw_sheet_music')
        .insert({
          title: title.trim(),
          composer: composer.trim() || null,
          arranger: arranger.trim() || null,
          voicing: voicing || null,
          notes: notes.trim() || `Scanned document with ${capturedPages.length} pages`,
          pdf_url: uploadResult.url,
          is_public: true,
          created_by: user?.id,
          scan_metadata: {
            pages_scanned: capturedPages.length,
            scan_method: 'ai_camera',
            scanned_at: new Date().toISOString(),
            camera_mode: facingMode
          }
        });
      
      if (error) throw error;
      
      toast({
        title: "Success!",
        description: `Document "${title}" scanned and saved successfully!`,
      });
      
      // Call completion callback
      onComplete?.(uploadResult.url, {
        title,
        composer,
        arranger,
        voicing,
        pages: capturedPages.length
      });
      
      // Clean up and close
      capturedPages.forEach(page => URL.revokeObjectURL(page.imageUrl));
      stopCamera();
      onClose();
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [capturedPages, title, composer, arranger, voicing, notes, user?.id, facingMode, toast, onComplete, stopCamera, onClose]);

  // Auto-start camera on mount
  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-2 md:p-4">
      <div className="w-full h-full max-w-6xl max-h-[95vh] bg-background rounded-lg overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-3 md:p-4 bg-background border-b shrink-0">
          <div className="flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-sm md:text-base">AI Document Scanner</h3>
            <Badge variant="secondary" className="text-xs">
              {capturedPages.length} page{capturedPages.length !== 1 ? 's' : ''}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            {isScanning && (
              <Button
                variant="outline"
                size="sm"
                onClick={switchCamera}
                disabled={!isCameraReady || isProcessing}
                className="px-2 h-8"
              >
                <RotateCw className="h-4 w-4" />
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                stopCamera();
                onClose();
              }} 
              className="px-2 h-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
          {/* Camera Panel */}
          <div className="flex-1 flex flex-col bg-black min-h-0">
            {/* Camera View */}
            <div className="flex-1 relative bg-gray-900 min-h-[250px] md:min-h-[400px]">
              {!isScanning && (
                <div className="absolute inset-0 flex items-center justify-center text-white">
                  <div className="text-center">
                    <Camera className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-sm">Initializing camera...</p>
                  </div>
                </div>
              )}
              
              {isScanning && (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
                />
              )}
              
              {/* Scanning Guide Overlay */}
              {isCameraReady && (
                <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
                  <div className="border-2 border-primary/70 border-dashed rounded-lg w-full max-w-sm h-3/4 max-h-80 flex items-center justify-center relative">
                    <div className="text-white text-center">
                      <div className="flex justify-center mb-2">
                        <Crop className="h-6 w-6 md:h-8 md:w-8" />
                      </div>
                      <p className="text-xs md:text-sm max-w-xs">
                        Position document within the frame for best results
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              <canvas ref={canvasRef} className="hidden" />
            </div>
            
            {/* Camera Controls */}
            {isCameraReady && (
              <div className="p-3 md:p-4 bg-background border-t shrink-0">
                <div className="flex justify-center">
                  <Button
                    onClick={capturePage}
                    size="lg"
                    disabled={isProcessing}
                    className="bg-primary hover:bg-primary/90 px-4 md:px-8 w-full max-w-xs flex items-center gap-2 h-12 text-sm md:text-base font-medium"
                  >
                    {isProcessing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <Camera className="h-4 w-4 md:h-5 md:w-5" />
                        <span>Capture Page {capturedPages.length + 1}</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
          
          {/* Metadata & Pages Panel */}
          <div className="w-full lg:w-80 lg:border-l bg-background overflow-y-auto max-h-96 lg:max-h-none shrink-0">
            <div className="p-3 md:p-4 space-y-3 md:space-y-4">
              {/* Document Info Form */}
              <Card className="border-0 lg:border">
                <CardHeader className="pb-2 md:pb-3 px-0 lg:px-6">
                  <CardTitle className="text-sm md:text-base">Document Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 md:space-y-3 px-0 lg:px-6">
                  <div>
                    <Label htmlFor="title" className="text-xs md:text-sm">Title *</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Enter document title"
                      className="h-8 md:h-9 text-sm"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="composer" className="text-xs md:text-sm">Composer</Label>
                      <Input
                        id="composer"
                        value={composer}
                        onChange={(e) => setComposer(e.target.value)}
                        placeholder="Composer"
                        className="h-8 md:h-9 text-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="arranger" className="text-xs md:text-sm">Arranger</Label>
                      <Input
                        id="arranger"
                        value={arranger}
                        onChange={(e) => setArranger(e.target.value)}
                        placeholder="Arranger"
                        className="h-8 md:h-9 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="voicing" className="text-xs md:text-sm">Voicing</Label>
                    <Select value={voicing} onValueChange={setVoicing}>
                      <SelectTrigger className="h-8 md:h-9 text-sm">
                        <SelectValue placeholder="Select voicing" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SATB">SATB</SelectItem>
                        <SelectItem value="SAB">SAB</SelectItem>
                        <SelectItem value="SSA">SSA</SelectItem>
                        <SelectItem value="TTBB">TTBB</SelectItem>
                        <SelectItem value="Unison">Unison</SelectItem>
                        <SelectItem value="Solo">Solo</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="notes" className="text-xs md:text-sm">Notes</Label>
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Additional notes..."
                      className="min-h-[60px] text-sm resize-none"
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Captured Pages */}
              {capturedPages.length > 0 && (
                <Card className="border-0 lg:border">
                  <CardHeader className="pb-2 md:pb-3 px-0 lg:px-6">
                    <CardTitle className="text-sm md:text-base flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Captured Pages ({capturedPages.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-0 lg:px-6">
                    <div className="space-y-2">
                      {capturedPages.map((page) => (
                        <div
                          key={page.id}
                          className="flex items-center gap-3 p-2 border rounded-lg"
                        >
                          <div className="relative">
                            <img
                              src={page.imageUrl}
                              alt={`Page ${page.pageNumber}`}
                              className="w-12 h-16 object-cover rounded border"
                            />
                            <Badge
                              variant="secondary"
                              className="absolute -top-1 -right-1 text-xs h-5 w-5 p-0 flex items-center justify-center"
                            >
                              {page.pageNumber}
                            </Badge>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">Page {page.pageNumber}</p>
                            <p className="text-xs text-muted-foreground">
                              {page.timestamp.toLocaleTimeString()}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deletePage(page.id)}
                            className="text-destructive hover:text-destructive/90 h-8 w-8 p-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Actions */}
              <div className="space-y-2">
                <Button
                  onClick={generatePDF}
                  disabled={capturedPages.length === 0 || !title.trim() || isProcessing}
                  className="w-full h-10 md:h-11 text-sm md:text-base font-medium"
                  size="lg"
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                      Generating PDF...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Generate PDF ({capturedPages.length} page{capturedPages.length !== 1 ? 's' : ''})
                    </>
                  )}
                </Button>
                
                {capturedPages.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center">
                    Capture at least one page to generate PDF
                  </p>
                )}
                
                {capturedPages.length > 0 && !title.trim() && (
                  <p className="text-xs text-destructive text-center">
                    Title is required to generate PDF
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
