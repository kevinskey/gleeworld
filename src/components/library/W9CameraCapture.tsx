import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Camera, Upload, FileText, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import jsPDF from 'jspdf';

export const W9CameraCapture = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      console.log('Starting camera...');
      
      // Check if we already have a stream
      if (stream) {
        console.log('Camera already active');
        return;
      }
      
      // Check for camera support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported in this browser');
      }
      
      // Set capturing state first to render video element
      setIsCapturing(true);
      
      // Use requestAnimationFrame to ensure DOM is updated
      await new Promise(resolve => requestAnimationFrame(resolve));
      await new Promise(resolve => setTimeout(resolve, 300));
      
      if (!videoRef.current) {
        setIsCapturing(false);
        throw new Error('Camera interface failed to load. Please close and reopen the dialog.');
      }
      
      // Portrait constraints for 8.5x11 document capture
      let constraints = {
        video: { 
          facingMode: { ideal: 'environment' },
          width: { ideal: 720, min: 480 },
          height: { ideal: 960, min: 640 }  // Portrait ratio for documents
        },
        audio: false
      };
      
      // Fallback to basic constraints if environment camera fails
      let fallbackConstraints = {
        video: true,
        audio: false
      };
      
      console.log('Requesting camera access...');
      let mediaStream;
      
      try {
        // Try with environment camera first
        mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (error) {
        console.log('Environment camera failed, trying fallback:', error);
        // Fallback to any available camera
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
        } catch (fallbackError) {
          console.error('Both camera attempts failed:', fallbackError);
          throw fallbackError;
        }
      }
      
      const videoTracks = mediaStream.getVideoTracks();
      console.log('Camera stream obtained:', videoTracks.length, 'video tracks');
      
      if (videoTracks.length === 0) {
        mediaStream.getTracks().forEach(track => track.stop());
        throw new Error('No video tracks available from camera');
      }

      const video = videoRef.current;
      console.log('Setting up video element...');
      
      // Set video properties for maximum compatibility
      video.setAttribute('playsinline', 'true');  
      video.setAttribute('webkit-playsinline', 'true');
      video.setAttribute('controls', 'false');
      video.muted = true;
      video.autoplay = true;
      video.defaultMuted = true;
      video.playsInline = true;
      
      // Set up event handlers before assigning stream
      video.onloadedmetadata = () => {
        console.log('Video metadata loaded, dimensions:', video.videoWidth, 'x', video.videoHeight);
      };
      
      video.onerror = (e) => {
        console.error('Video element error:', e);
      };
      
      // Assign stream and update state
      video.srcObject = mediaStream;
      setStream(mediaStream);
      setIsCapturing(true);
      
      // Try to play the video
      try {
        console.log('Attempting to play video...');
        const playPromise = video.play();
        
        if (playPromise !== undefined) {
          await playPromise;
          console.log('Video playing successfully');
        }
      } catch (playError) {
        console.error('Error playing video:', playError);
        // Don't throw here, the video might still work for capturing
        console.log('Video play error, but continuing...');
      }
      
      console.log('Camera initialization complete');
      
    } catch (error) {
      console.error('Error accessing camera:', error);
      
      // Clean up any partial stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
      
      let errorMessage = 'Unable to access camera. ';
      
      if (error instanceof Error) {
        console.log('Error details:', error.name, error.message);
        if (error.name === 'NotAllowedError') {
          errorMessage += 'Please allow camera access in your browser settings and try again.';
        } else if (error.name === 'NotFoundError') {
          errorMessage += 'No camera found. Please connect a camera and try again.';
        } else if (error.name === 'NotSupportedError') {
          errorMessage += 'Camera not supported on this device.';
        } else if (error.name === 'NotReadableError') {
          errorMessage += 'Camera is being used by another application. Please close other apps and try again.';
        } else {
          errorMessage += `${error.message}. Please check camera permissions and ensure you\'re using HTTPS.`;
        }
      }
      
      setCameraError(errorMessage);
      setIsCapturing(false);
      toast({
        title: "Camera Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [stream, toast]);

  const stopCamera = useCallback(() => {
    console.log('Stopping camera...');
    if (stream) {
      stream.getTracks().forEach(track => {
        if (track.readyState === 'live') {
          track.stop();
          console.log('Camera track stopped:', track.kind);
        }
      });
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.load(); // Reset video element
    }
    setIsCapturing(false);
    setCameraError(null);
  }, [stream]);

  // Clean up camera when dialog closes
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setCapturedImage(null);
    }
    
    // Cleanup on unmount
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isOpen, stopCamera, stream]);

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) {
      console.error('Video or canvas ref not available');
      toast({
        title: "Error",
        description: "Camera not ready. Please try again.",
        variant: "destructive",
      });
      return;
    }

    console.log('Capturing photo...');
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas.getContext('2d');

    if (!context) {
      console.error('Canvas context not available');
      return;
    }

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    
    console.log('Canvas dimensions:', canvas.width, 'x', canvas.height);
    
    // Draw the video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Reduce image quality to prevent system lockup
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.7);
    console.log('Image captured, data URL length:', imageDataUrl.length);
    setCapturedImage(imageDataUrl);
    stopCamera();
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setCapturedImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const processW9Form = async () => {
    if (!capturedImage || !user) return;

    setIsProcessing(true);
    try {
      console.log('Starting W9 processing...');
      
      // Add small delay to prevent UI lockup
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Save form immediately without waiting for OCR
      const fileName = `${user.id}/w9-form-${Date.now()}.pdf`;
      
      // Convert image to PDF with async processing
      const pdf = new jsPDF();
      const img = new Image();
      
      await new Promise((resolve) => {
        img.onload = () => {
          // Small delay to prevent blocking
          setTimeout(resolve, 50);
        };
        img.src = capturedImage;
      });

      // Calculate dimensions to fit the page
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgRatio = img.width / img.height;
      const pdfRatio = pdfWidth / pdfHeight;

      let finalWidth, finalHeight;
      if (imgRatio > pdfRatio) {
        finalWidth = pdfWidth;
        finalHeight = pdfWidth / imgRatio;
      } else {
        finalHeight = pdfHeight;
        finalWidth = pdfHeight * imgRatio;
      }

      pdf.addImage(capturedImage, 'JPEG', 0, 0, finalWidth, finalHeight);
      const pdfBlob = pdf.output('blob');

      // Upload to storage first
      const { error: uploadError } = await supabase.storage
        .from('w9-forms')
        .upload(fileName, pdfBlob);

      if (uploadError) {
        throw uploadError;
      }

      // Create W9 form record immediately
      const { error: dbError } = await supabase
        .from('w9_forms')
        .insert({
          user_id: user.id,
          storage_path: fileName,
          status: 'submitted',
          form_data: {
            capture_method: 'camera_manual',
            captured_at: new Date().toISOString(),
            ocr_attempted: false,
            ocr_successful: false
          }
        });

      if (dbError) {
        throw dbError;
      }

      toast({
        title: "W9 Form Saved",
        description: "W9 form captured successfully. OCR processing will happen in the background.",
      });

      // Reset state immediately
      setCapturedImage(null);
      setIsOpen(false);
      
      // Process OCR in background without blocking UI
      processOCRInBackground(fileName);
      
    } catch (error) {
      console.error('Error processing W9 form:', error);
      toast({
        title: "Processing Error",
        description: "Failed to process W9 form. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const processOCRInBackground = async (fileName: string) => {
    try {
      console.log('Starting background OCR processing...');
      
      // Reduce image size for OCR to prevent API timeouts
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      await new Promise((resolve) => {
        img.onload = resolve;
        img.src = capturedImage!;
      });
      
      // Resize image for OCR (max 800px width to stay under 2MB)
      const maxWidth = 800;
      const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;
      
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
      const resizedImage = canvas.toDataURL('image/jpeg', 0.5); // Lower quality for OCR
      
      // Add timeout to OCR call
      const ocrPromise = supabase.functions.invoke('w9-ocr-extract', {
        body: { imageBase64: resizedImage }
      });
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('OCR timeout')), 20000) // 20 second timeout
      );
      
      const { data: ocrData, error: ocrError } = await Promise.race([
        ocrPromise,
        timeoutPromise
      ]) as any;

      if (!ocrError && ocrData && !ocrData.error) {
        // Update the W9 form with OCR data
        await supabase
          .from('w9_forms')
          .update({
            form_data: {
              ...ocrData.extractedData,
              capture_method: 'camera_ocr',
              captured_at: new Date().toISOString(),
              raw_text: ocrData.rawText,
              ocr_attempted: true,
              ocr_successful: true
            }
          })
          .eq('storage_path', fileName);
        
        console.log('OCR processing completed successfully');
      } else {
        console.warn('OCR processing failed:', ocrError || ocrData?.error);
      }
    } catch (error) {
      console.warn('Background OCR processing failed:', error);
      // Don't show error to user since form was already saved
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    startCamera();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="w-full">
          <Camera className="h-4 w-4 mr-2" />
          Capture W9 Form
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Capture W9 Form</DialogTitle>
          <DialogDescription>
            Take a photo of your W9 form or upload an image - OCR will automatically extract and populate form data
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!isCapturing && !capturedImage && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Button onClick={startCamera} className="h-20">
                  <Camera className="h-6 w-6 mr-2" />
                  Use Camera
                </Button>
                <Button 
                  onClick={() => fileInputRef.current?.click()} 
                  variant="outline" 
                  className="h-20"
                >
                  <Upload className="h-6 w-6 mr-2" />
                  Upload Image
                </Button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              {cameraError && (
                <div className="text-red-500 text-sm text-center p-2 bg-red-50 rounded">
                  {cameraError}
                </div>
              )}
            </div>
          )}

          {isCapturing && (
            <div className="space-y-4">
              <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9', minHeight: '300px' }}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  onLoadedMetadata={() => console.log('Video metadata loaded')}
                  onError={(e) => console.error('Video error:', e)}
                />
                <canvas ref={canvasRef} className="hidden" />
                {(!stream || cameraError) && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75">
                    <div className="text-white text-center">
                      {!cameraError ? (
                        <>
                          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                          <p>Loading camera...</p>
                          <p className="text-sm mt-2">Please allow camera access if prompted</p>
                        </>
                      ) : (
                        <>
                          <Camera className="h-8 w-8 mx-auto mb-2 text-red-400" />
                          <p className="text-red-300">Camera Error</p>
                          <p className="text-sm mt-2">{cameraError}</p>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
              {cameraError && (
                <div className="text-red-500 text-sm text-center p-2 bg-red-50 rounded">
                  {cameraError}
                </div>
              )}
              <div className="flex gap-2">
                <Button 
                  onClick={capturePhoto} 
                  className="flex-1" 
                  disabled={!stream || !!cameraError}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Capture
                </Button>
                <Button onClick={stopCamera} variant="outline">
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {capturedImage && (
            <div className="space-y-4">
              <div className="relative">
                <img
                  src={capturedImage}
                  alt="Captured W9 Form"
                  className="w-full rounded-lg border"
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={processW9Form} 
                  disabled={isProcessing}
                  className="flex-1"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4 mr-2" />
                      Save W9 Form
                    </>
                  )}
                </Button>
                <Button onClick={retakePhoto} variant="outline">
                  Retake
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
