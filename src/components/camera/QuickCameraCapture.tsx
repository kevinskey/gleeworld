import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Camera, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { usePRImages } from "@/hooks/usePRImages";

interface QuickCameraCaptureProps {
  onClose: () => void;
  onCapture?: (imageUrl: string) => void;
}

export const QuickCameraCapture = ({ onClose, onCapture }: QuickCameraCaptureProps) => {
  const { user } = useAuth();
  const { uploadImage } = usePRImages();
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast.error('Camera access denied or not available');
      onClose();
    }
  }, [onClose]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  const autoSavePhoto = useCallback(async (blob: Blob, photoTitle: string) => {
    if (!user) {
      console.error('QuickCameraCapture: User not authenticated');
      toast.error('User not authenticated');
      return;
    }

    console.log('QuickCameraCapture: Auto-saving photo immediately');
    setIsSaving(true);
    
    try {
      // Create File object from blob
      const file = new File([blob], `${photoTitle.replace(/[^a-zA-Z0-9]/g, '_')}.jpg`, {
        type: 'image/jpeg'
      });

      console.log('QuickCameraCapture: Created file object for auto-save', {
        name: file.name,
        size: file.size,
        type: file.type
      });

      // Use the PR upload system with basic metadata
      await uploadImage(file, {
        caption: photoTitle,
        taken_at: new Date().toISOString(),
        photographer_id: user.id,
      });

      console.log('QuickCameraCapture: Auto-save successful');
      toast.success('Photo captured and saved successfully!');
      
      if (onCapture) {
        onCapture(URL.createObjectURL(blob));
      }

      // Close after successful save
      setTimeout(() => {
        stopCamera();
        onClose();
      }, 1500);

    } catch (error) {
      console.error('QuickCameraCapture: Error auto-saving photo:', error);
      toast.error(`Failed to save photo: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  }, [user, uploadImage, onCapture, stopCamera, onClose]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (!context) return;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Convert to blob
    canvas.toBlob(async (blob) => {
      if (blob) {
        const imageUrl = URL.createObjectURL(blob);
        setCapturedImage(imageUrl);
        setIsCapturing(false);
        
        // Set default title with timestamp and auto-save immediately
        const defaultTitle = `Quick Capture ${new Date().toLocaleDateString()}`;
        
        // Auto-save immediately without showing edit dialog
        await autoSavePhoto(blob, defaultTitle);
      }
    }, 'image/jpeg', 0.8);
  }, [autoSavePhoto]);


  // Auto-start camera when component mounts
  useEffect(() => {
    setIsCapturing(true);
    startCamera();
    
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg bg-black border-gray-700">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Quick Camera Capture</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                stopCamera();
                onClose();
              }}
              className="text-white hover:bg-gray-800"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="relative aspect-[4/3] bg-gray-900 rounded-lg overflow-hidden mb-4">
            {isCapturing && (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            )}
            
            {capturedImage && (
              <img
                src={capturedImage}
                alt="Captured"
                className="w-full h-full object-cover"
              />
            )}
            
            <canvas ref={canvasRef} className="hidden" />
          </div>

          {/* Camera Controls */}
          {isCapturing && (
            <div className="flex gap-2 justify-center">
              <Button
                onClick={capturePhoto}
                size="lg"
                className="bg-red-600 hover:bg-red-700 text-white px-8"
              >
                <Camera className="h-5 w-5 mr-2" />
                Capture
              </Button>
            </div>
          )}

          {isSaving && (
            <div className="text-center">
              <Button size="lg" disabled className="bg-blue-600 text-white">
                Saving...
              </Button>
              <p className="text-center text-sm text-gray-400 mt-2">
                Photo automatically saved to PR Images
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};