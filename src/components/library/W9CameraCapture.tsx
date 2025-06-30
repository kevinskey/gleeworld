
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
      
      const constraints = {
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280, min: 640, max: 1920 },
          height: { ideal: 720, min: 480, max: 1080 }
        },
        audio: false
      };
      
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('Camera stream obtained:', mediaStream);
      setStream(mediaStream);
      
      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = mediaStream;
        video.setAttribute('playsinline', 'true');
        video.muted = true;
        
        // Wait for the video to be ready and then play
        video.onloadedmetadata = async () => {
          try {
            await video.play();
            console.log('Video playing successfully');
            setIsCapturing(true);
          } catch (playError) {
            console.error('Error playing video:', playError);
            setCameraError('Failed to start video playback. Please allow camera access and try again.');
          }
        };
      }
      
    } catch (error) {
      console.error('Error accessing camera:', error);
      let errorMessage = 'Unable to access camera. ';
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage += 'Please allow camera access in your browser settings and try again.';
        } else if (error.name === 'NotFoundError') {
          errorMessage += 'No camera found. Please connect a camera and try again.';
        } else {
          errorMessage += 'Please check camera permissions and ensure you\'re using HTTPS.';
        }
      }
      
      setCameraError(errorMessage);
      toast({
        title: "Camera Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [toast]);

  const stopCamera = useCallback(() => {
    console.log('Stopping camera...');
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
        console.log('Camera track stopped');
      });
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
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
  }, [isOpen, stopCamera]);

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

    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
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
      // Convert image to PDF
      const pdf = new jsPDF();
      const img = new Image();
      
      await new Promise((resolve) => {
        img.onload = resolve;
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

      // Upload to storage
      const fileName = `${user.id}/w9-form-${Date.now()}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from('w9-forms')
        .upload(fileName, pdfBlob);

      if (uploadError) {
        throw uploadError;
      }

      // Create W9 form record
      const { error: dbError } = await supabase
        .from('w9_forms')
        .insert({
          user_id: user.id,
          storage_path: fileName,
          status: 'submitted',
          form_data: {
            capture_method: 'camera',
            captured_at: new Date().toISOString()
          }
        });

      if (dbError) {
        throw dbError;
      }

      toast({
        title: "W9 Form Captured",
        description: "Your W9 form has been successfully captured and saved.",
      });

      // Reset state
      setCapturedImage(null);
      setIsOpen(false);
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
            Take a photo of your W9 form or upload an image to convert it to PDF
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
              <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <canvas ref={canvasRef} className="hidden" />
                {!stream && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black">
                    <div className="text-white text-center">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                      <p>Loading camera...</p>
                      <p className="text-sm mt-2">Please allow camera access if prompted</p>
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
