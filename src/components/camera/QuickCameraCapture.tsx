import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Camera, X, Check, RotateCcw, Upload, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { usePRImages, PRImageTag } from "@/hooks/usePRImages";

interface QuickCameraCaptureProps {
  onClose: () => void;
  onCapture?: (imageUrl: string) => void;
}

export const QuickCameraCapture = ({ onClose, onCapture }: QuickCameraCaptureProps) => {
  const { user } = useAuth();
  const { tags, uploadImage } = usePRImages();
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showEditDialog, setShowEditDialog] = useState(false);
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
        setCapturedBlob(blob);
        setIsCapturing(false);
        setShowEditDialog(true);
        
        // Set default title with timestamp
        setTitle(`Quick Capture ${new Date().toLocaleDateString()}`);
      }
    }, 'image/jpeg', 0.8);
  }, []);

  const handleTitleSubmit = (newTitle: string) => {
    setTitle(newTitle);
    setIsEditingTitle(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setIsEditingTitle(false);
    }
    if (e.key === 'Escape') {
      setIsEditingTitle(false);
    }
  };

  const handleTagToggle = (tagId: string) => {
    setSelectedTags(prev => 
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const savePhoto = async () => {
    if (!user || !capturedBlob) {
      console.error('QuickCameraCapture: Missing user or capturedBlob', { user: !!user, capturedBlob: !!capturedBlob });
      toast.error('User not authenticated or no image captured');
      return;
    }

    console.log('QuickCameraCapture: Starting save process', {
      title,
      selectedTags,
      blobSize: capturedBlob.size,
      blobType: capturedBlob.type
    });

    setIsSaving(true);
    try {
      // Create File object from blob
      const file = new File([capturedBlob], `${title.replace(/[^a-zA-Z0-9]/g, '_')}.jpg`, {
        type: 'image/jpeg'
      });

      console.log('QuickCameraCapture: Created file object', {
        name: file.name,
        size: file.size,
        type: file.type
      });

      // Use the PR upload system
      console.log('QuickCameraCapture: Calling uploadImage with metadata:', {
        caption: title,
        taken_at: new Date().toISOString(),
        photographer_id: user.id,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
      });

      await uploadImage(file, {
        caption: title,
        taken_at: new Date().toISOString(),
        photographer_id: user.id,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
      });

      console.log('QuickCameraCapture: Upload successful');
      toast.success('Photo captured and saved successfully!');
      
      if (onCapture) {
        onCapture(capturedImage!);
      }

      // Close after successful save
      setTimeout(() => {
        stopCamera();
        onClose();
      }, 1500);

    } catch (error) {
      console.error('QuickCameraCapture: Error saving photo:', error);
      console.error('QuickCameraCapture: Error details:', error.message, error.stack);
      toast.error(`Failed to save photo: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleShare = async () => {
    if (capturedImage && navigator.share) {
      try {
        await navigator.share({
          title: title || 'Quick Capture Photo',
          text: 'Check out this photo from Glee Club!',
          url: capturedImage
        });
      } catch (error) {
        console.log('Share failed:', error);
        // Fallback to copy to clipboard
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(capturedImage);
          toast.success('Image URL copied to clipboard!');
        }
      }
    } else if (navigator.clipboard && capturedImage) {
      await navigator.clipboard.writeText(capturedImage);
      toast.success('Image URL copied to clipboard!');
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setCapturedBlob(null);
    setShowEditDialog(false);
    setIsEditingTitle(false);
    setTitle('');
    setSelectedTags([]);
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
            
            {capturedImage && !showEditDialog && (
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

          {/* Edit Dialog */}
          {showEditDialog && capturedImage && (
            <div className="space-y-4">
              {/* Image Preview */}
              <div className="relative">
                <img
                  src={capturedImage}
                  alt="Captured"
                  className="w-full max-h-48 object-contain rounded-lg border border-gray-600"
                />
              </div>

              {/* Edit Form */}
              <div className="space-y-3">
                <div>
                  <Label className="text-white">Photo Title</Label>
                  {isEditingTitle ? (
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      onBlur={() => setIsEditingTitle(false)}
                      onKeyDown={handleTitleKeyDown}
                      placeholder="Enter photo title..."
                      className="bg-gray-800 border-gray-600 text-white"
                      autoFocus
                    />
                  ) : (
                    <div
                      onClick={() => setIsEditingTitle(true)}
                      className="w-full p-2 bg-gray-800 border border-gray-600 rounded-md text-white cursor-pointer hover:bg-gray-700 transition-colors min-h-[40px] flex items-center"
                    >
                      {title || "Tap to add title..."}
                    </div>
                  )}
                </div>

                <div>
                  <Label className="text-white">Tags (Optional)</Label>
                  <div className="flex flex-wrap gap-2 mt-2 max-h-20 overflow-y-auto">
                    {tags.map(tag => (
                      <Badge
                        key={tag.id}
                        variant={selectedTags.includes(tag.id) ? "default" : "outline"}
                        className="cursor-pointer text-xs"
                        onClick={() => handleTagToggle(tag.id)}
                      >
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                  {tags.length === 0 && (
                    <p className="text-xs text-gray-400 mt-1">
                      No tags available
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 justify-between">
                <div className="flex gap-2">
                  <Button
                    onClick={retakePhoto}
                    variant="outline"
                    size="sm"
                    className="border-gray-600 text-white hover:bg-gray-800"
                  >
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Retake
                  </Button>
                  <Button
                    onClick={handleShare}
                    variant="outline"
                    size="sm"
                    className="border-gray-600 text-white hover:bg-gray-800"
                  >
                    <Share2 className="h-4 w-4 mr-1" />
                    Share
                  </Button>
                </div>
                <Button
                  onClick={savePhoto}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white"
                  disabled={isSaving || !title.trim()}
                >
                  <Upload className="h-4 w-4 mr-1" />
                  {isSaving ? 'Saving...' : 'Save Photo'}
                </Button>
              </div>
            </div>
          )}

          {isSaving && (
            <div className="text-center">
              <Button size="lg" disabled className="bg-blue-600 text-white">
                Saving...
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};