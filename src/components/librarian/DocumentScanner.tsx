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
  Plus,
  Download,
  Upload,
  ScanLine,
  CheckCircle,
  AlertCircle
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
      }
    } catch (error) {
      console.error('Error starting camera:', error);
      toast({
        title: "Camera Error",
        description: "Unable to access camera. Please check permissions.",
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
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (!context) return;

      // Set canvas size to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw video frame to canvas with document enhancement
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Apply basic image enhancement for document scanning
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Simple contrast and brightness adjustment for text documents
      for (let i = 0; i < data.length; i += 4) {
        // Increase contrast and brightness for better text readability
        data[i] = Math.min(255, Math.max(0, (data[i] - 128) * 1.2 + 128 + 10));     // Red
        data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - 128) * 1.2 + 128 + 10)); // Green
        data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - 128) * 1.2 + 128 + 10)); // Blue
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
      }, 'image/jpeg', 0.9);
      
    } catch (error) {
      console.error('Error capturing page:', error);
      toast({
        title: "Capture Error",
        description: "Failed to capture page. Please try again.",
        variant: "destructive",
      });
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
  }, []);

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
            scan_method: 'camera',
            scanned_at: new Date().toISOString(),
            camera_mode: facingMode
          }
        });
      
      if (error) throw error;
      
      toast({
        title: "Success",
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
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-2 md:p-4">
      <div className="w-full h-full bg-background rounded-lg overflow-hidden flex flex-col">
        {/* Mobile Header */}
        <div className="flex items-center justify-between p-3 md:p-4 bg-background border-b">
          <div className="flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-sm md:text-base">Document Scanner</h3>
            <Badge variant="secondary" className="text-xs">
              {capturedPages.length} page{capturedPages.length !== 1 ? 's' : ''}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {isScanning && (
              <Button
                variant="outline"
                size="sm"
                onClick={switchCamera}
                disabled={!isCameraReady}
                className="px-2"
              >
                <RotateCw className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => {
              stopCamera();
              onClose();
            }} className="px-2">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Mobile Layout - Responsive */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Camera Panel */}
          <div className="flex-1 flex flex-col bg-black min-h-0">
            {/* Camera View */}
            <div className="flex-1 relative bg-gray-900 min-h-[300px] md:min-h-[400px]">
              {isScanning && (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              )}
              
              {/* Mobile-optimized Scanning Overlay */}
              {isCameraReady && (
                <div className="absolute inset-0 flex items-center justify-center p-4">
                  <div className="border-2 border-white/50 border-dashed rounded-lg w-full max-w-sm h-3/4 max-h-80 flex items-center justify-center">
                    <div className="text-white text-center">
                      <ScanLine className="h-6 w-6 md:h-8 md:w-8 mx-auto mb-2" />
                      <p className="text-xs md:text-sm">Position document within frame</p>
                    </div>
                  </div>
                </div>
              )}
              
              <canvas ref={canvasRef} className="hidden" />
            </div>
            
            {/* Mobile Camera Controls */}
            {isCameraReady && (
              <div className="p-3 md:p-4 bg-background border-t">
                <div className="flex justify-center">
                  <Button
                    onClick={capturePage}
                    size="lg"
                    className="bg-primary hover:bg-primary/90 px-4 md:px-8 w-full max-w-xs"
                  >
                    <Camera className="h-4 w-4 md:h-5 md:w-5 mr-2" />
                    <span className="text-sm md:text-base">Capture Page {capturedPages.length + 1}</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
          
          {/* Metadata & Pages Panel - Responsive */}
          <div className="w-full lg:w-80 lg:border-l bg-background overflow-y-auto max-h-96 lg:max-h-none">
            <div className="p-3 md:p-4 space-y-3 md:space-y-4">
              {/* Document Metadata Form - Mobile Optimized */}
              <Card>
                <CardHeader className="pb-2 md:pb-3">
                  <CardTitle className="text-sm md:text-base">Document Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 md:space-y-3">
                  <div>
                    <Label htmlFor="doc-title" className="text-xs md:text-sm">Title *</Label>
                    <Input
                      id="doc-title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Enter document title"
                      className="h-9 md:h-10 text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
                    <div>
                      <Label htmlFor="doc-composer" className="text-xs md:text-sm">Composer</Label>
                      <Input
                        id="doc-composer"
                        value={composer}
                        onChange={(e) => setComposer(e.target.value)}
                        placeholder="Composer name"
                        className="h-9 md:h-10 text-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="doc-arranger" className="text-xs md:text-sm">Arranger</Label>
                      <Input
                        id="doc-arranger"
                        value={arranger}
                        onChange={(e) => setArranger(e.target.value)}
                        placeholder="Arranger name"
                        className="h-9 md:h-10 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="doc-voicing" className="text-xs md:text-sm">Voicing</Label>
                    <Select value={voicing} onValueChange={setVoicing}>
                      <SelectTrigger className="h-9 md:h-10">
                        <SelectValue placeholder="Select voicing" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SATB">SATB</SelectItem>
                        <SelectItem value="SSA">SSA</SelectItem>
                        <SelectItem value="SAB">SAB</SelectItem>
                        <SelectItem value="TTB">TTB</SelectItem>
                        <SelectItem value="SSAA">SSAA</SelectItem>
                        <SelectItem value="TTBB">TTBB</SelectItem>
                        <SelectItem value="Solo">Solo</SelectItem>
                        <SelectItem value="Unison">Unison</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="doc-notes" className="text-xs md:text-sm">Notes</Label>
                    <Textarea
                      id="doc-notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Additional notes..."
                      rows={2}
                      className="resize-none text-sm"
                    />
                  </div>
                </CardContent>
              </Card>
              
              {/* Captured Pages - Mobile Optimized */}
              <Card>
                <CardHeader className="pb-2 md:pb-3">
                  <CardTitle className="text-sm md:text-base flex items-center justify-between">
                    Captured Pages
                    <Badge variant="outline" className="text-xs">
                      {capturedPages.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {capturedPages.length === 0 ? (
                    <div className="text-center text-muted-foreground py-6 md:py-8">
                      <FileText className="h-6 w-6 md:h-8 md:w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-xs md:text-sm">No pages captured yet</p>
                      <p className="text-xs opacity-75">Use the camera to capture document pages</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {capturedPages.map((page) => (
                        <div
                          key={page.id}
                          className="flex items-center gap-2 md:gap-3 p-2 border rounded-lg"
                        >
                          <div className="relative">
                            <img
                              src={page.imageUrl}
                              alt={`Page ${page.pageNumber}`}
                              className="w-10 h-12 md:w-12 md:h-16 object-cover rounded border"
                            />
                            <Badge
                              variant="secondary"
                              className="absolute -top-1 -right-1 text-xs h-4 w-4 md:h-5 md:w-5 p-0 flex items-center justify-center"
                            >
                              {page.pageNumber}
                            </Badge>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs md:text-sm font-medium">Page {page.pageNumber}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {page.timestamp.toLocaleTimeString()}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deletePage(page.id)}
                            className="text-destructive hover:text-destructive/90 h-7 w-7 md:h-8 md:w-8 p-0 flex-shrink-0"
                          >
                            <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Mobile-Optimized Actions */}
              <div className="space-y-2 md:space-y-3">
                <Button
                  onClick={generatePDF}
                  disabled={capturedPages.length === 0 || isProcessing || !title.trim()}
                  className="w-full h-10 md:h-11"
                  size="sm"
                >
                  {isProcessing ? (
                    <>
                      <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-background border-t-transparent" />
                      <span className="text-sm">Generating PDF...</span>
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4 mr-2" />
                      <span className="text-sm">Generate PDF ({capturedPages.length} pages)</span>
                    </>
                  )}
                </Button>
                
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9"
                    onClick={() => {
                      capturedPages.forEach(page => URL.revokeObjectURL(page.imageUrl));
                      setCapturedPages([]);
                      toast({
                        title: "Pages Cleared",
                        description: "All captured pages have been removed.",
                      });
                    }}
                    disabled={capturedPages.length === 0}
                  >
                    <Trash2 className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                    <span className="text-xs md:text-sm">Clear All</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9"
                    onClick={() => {
                      stopCamera();
                      onClose();
                    }}
                  >
                    <span className="text-xs md:text-sm">Cancel</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};