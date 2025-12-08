import React, { useRef, useState, useCallback } from 'react';
import { Button } from './button';
import { Card, CardContent } from './card';
import { Camera, RotateCcw, Download, X, SwitchCamera } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CameraCaptureProps {
  onCapture: (blob: Blob) => void;
  onCancel: () => void;
  isOpen: boolean;
  allowMultiple?: boolean;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({ 
  onCapture, 
  onCancel, 
  isOpen,
  allowMultiple = true
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment'); // Default to back camera
  const [photoCount, setPhotoCount] = useState(0);
  const { toast } = useToast();

  const startCamera = useCallback(async (facing: 'user' | 'environment' = facingMode) => {
    try {
      // Stop any existing stream first
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: facing
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsStreaming(true);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        title: "Camera Error",
        description: "Unable to access camera. Please check permissions.",
        variant: "destructive",
      });
    }
  }, [toast, facingMode]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    ctx.drawImage(video, 0, 0);
    
    const imageData = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedImage(imageData);
    // Don't stop camera - keep it running for multiple photos
  }, []);

  const retakePhoto = useCallback(() => {
    setCapturedImage(null);
    // Camera should still be running, but ensure it is
    if (!isStreaming) {
      startCamera();
    }
  }, [startCamera, isStreaming]);

  const confirmCapture = useCallback(() => {
    if (!capturedImage || !canvasRef.current) return;

    canvasRef.current.toBlob((blob) => {
      if (blob) {
        onCapture(blob);
        setPhotoCount(prev => prev + 1);
        
        if (allowMultiple) {
          // Clear captured image and keep camera running for next photo
          setCapturedImage(null);
          toast({
            title: "Photo saved!",
            description: `Photo ${photoCount + 1} captured. Take another or close.`,
          });
        } else {
          // Single photo mode - close after capture
          setCapturedImage(null);
        }
      }
    }, 'image/jpeg', 0.8);
  }, [capturedImage, onCapture, allowMultiple, photoCount, toast]);

  const handleCancel = useCallback(() => {
    stopCamera();
    setCapturedImage(null);
    setPhotoCount(0);
    onCancel();
  }, [stopCamera, onCancel]);

  // Switch camera with single click - immediate switch
  const switchCamera = useCallback(async () => {
    const newFacing = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacing);
    await startCamera(newFacing);
  }, [facingMode, startCamera]);

  React.useEffect(() => {
    if (isOpen && !capturedImage) {
      startCamera();
    }
    
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                Take a Selfie {photoCount > 0 && `(${photoCount} saved)`}
              </h3>
              <Button variant="ghost" size="sm" onClick={handleCancel}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="relative bg-black rounded-lg overflow-hidden aspect-[4/3]">
              {!capturedImage ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {/* Big flip camera button - easy single tap */}
                  <Button
                    variant="secondary"
                    size="lg"
                    onClick={switchCamera}
                    className="absolute top-4 right-4 bg-background/90 hover:bg-background h-12 w-12 rounded-full"
                  >
                    <SwitchCamera className="h-6 w-6" />
                  </Button>
                </>
              ) : (
                <img
                  src={capturedImage}
                  alt="Captured selfie"
                  className="w-full h-full object-cover"
                />
              )}
            </div>

            <canvas ref={canvasRef} className="hidden" />

            <div className="flex gap-2 justify-center">
              {!capturedImage ? (
                <>
                  <Button variant="outline" onClick={handleCancel}>
                    {photoCount > 0 ? 'Done' : 'Cancel'}
                  </Button>
                  <Button 
                    onClick={capturePhoto} 
                    disabled={!isStreaming}
                    className="bg-primary hover:bg-primary/90"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Capture
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={retakePhoto}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Retake
                  </Button>
                  <Button onClick={confirmCapture} className="bg-green-600 hover:bg-green-700">
                    <Download className="h-4 w-4 mr-2" />
                    {allowMultiple ? 'Save & Continue' : 'Use Photo'}
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
