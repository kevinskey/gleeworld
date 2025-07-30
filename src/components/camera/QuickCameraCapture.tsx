import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Camera, X, Check, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface QuickCameraCaptureProps {
  onClose: () => void;
  onCapture?: (imageUrl: string) => void;
}

export const QuickCameraCapture = ({ onClose, onCapture }: QuickCameraCaptureProps) => {
  const { user } = useAuth();
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
        
        // Auto-save immediately
        await savePhoto(blob);
      }
    }, 'image/jpeg', 0.8);
  }, []);

  const savePhoto = async (blob: Blob) => {
    if (!user) {
      toast.error('User not authenticated');
      return;
    }

    setIsSaving(true);
    try {
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `quick-capture-${timestamp}.jpg`;
      const filePath = `${user.id}/${filename}`;

      // Upload to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('pr-images')
        .upload(filePath, blob, {
          contentType: 'image/jpeg',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast.error('Failed to save photo');
        return;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('pr-images')
        .getPublicUrl(filePath);

      // Insert record into pr_images table
      const { error: dbError } = await supabase
        .from('pr_images')
        .insert({
          uploaded_by: user.id,
          filename,
          file_path: filePath,
          original_filename: filename,
          caption: `Quick Capture ${new Date().toLocaleDateString()}`,
          mime_type: 'image/jpeg',
          photographer_id: user.id,
          taken_at: new Date().toISOString(),
          uploaded_at: new Date().toISOString(),
          is_featured: false
        });

      if (dbError) {
        console.error('Database error:', dbError);
        toast.error('Photo saved but failed to log to database');
      } else {
        toast.success('Photo captured and saved successfully!');
        if (onCapture) {
          onCapture(publicUrl);
        }
      }

      // Close after successful save
      setTimeout(() => {
        stopCamera();
        onClose();
      }, 1500);

    } catch (error) {
      console.error('Error saving photo:', error);
      toast.error('Failed to save photo');
    } finally {
      setIsSaving(false);
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setIsCapturing(true);
    startCamera();
  };

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

          <div className="flex gap-2 justify-center">
            {isCapturing && (
              <Button
                onClick={capturePhoto}
                size="lg"
                className="bg-red-600 hover:bg-red-700 text-white px-8"
              >
                <Camera className="h-5 w-5 mr-2" />
                Capture
              </Button>
            )}

            {capturedImage && !isSaving && (
              <>
                <Button
                  onClick={retakePhoto}
                  variant="outline"
                  size="lg"
                  className="border-gray-600 text-white hover:bg-gray-800"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Retake
                </Button>
                <Button
                  onClick={() => savePhoto}
                  size="lg"
                  className="bg-green-600 hover:bg-green-700 text-white"
                  disabled={isSaving}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Saved ✓
                </Button>
              </>
            )}

            {isSaving && (
              <Button size="lg" disabled className="bg-blue-600 text-white">
                Saving...
              </Button>
            )}
          </div>

          {capturedImage && (
            <p className="text-center text-sm text-gray-400 mt-2">
              Photo automatically saved to PR Images
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};