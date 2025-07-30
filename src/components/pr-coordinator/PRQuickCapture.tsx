import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useCameraImport } from '@/hooks/useCameraImport';
import { PRImageTag } from '@/hooks/usePRImages';
import { Camera, Upload, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PRQuickCaptureProps {
  tags: PRImageTag[];
  onClose: () => void;
  onCapture: (file: File, metadata: {
    caption?: string;
    taken_at?: string;
    event_id?: string;
    photographer_id?: string;
    tags?: string[];
  }) => Promise<any>;
}

export const PRQuickCapture = ({ tags, onClose, onCapture }: PRQuickCaptureProps) => {
  const [caption, setCaption] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [capturedImage, setCapturedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { 
    startCamera, 
    capturePhoto, 
    stopCamera, 
    isCameraReady,
    videoRef,
    canvasRef,
    isCapturing
  } = useCameraImport({
    onSuccess: (file) => {
      setCapturedImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    },
    onError: (error) => {
      toast({
        title: "Camera Error",
        description: error,
        variant: "destructive",
      });
    }
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setCapturedImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleTagToggle = (tagId: string) => {
    setSelectedTags(prev => 
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const handleUpload = async () => {
    if (!capturedImage) return;

    setIsUploading(true);
    try {
      const uploadedImage = await onCapture(capturedImage, {
        caption: caption.trim() || undefined,
        taken_at: new Date().toISOString(),
        tags: selectedTags.length > 0 ? selectedTags : undefined,
      });

      toast({
        title: "Success",
        description: "Image captured and uploaded successfully!",
      });

      onClose();
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    stopCamera();
    onClose();
  };

  return (
    <Dialog open={true} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Quick Capture - PR Photo
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Camera/Upload Section */}
          {!capturedImage ? (
            <div className="space-y-4">
              <div className="flex gap-3 justify-center">
                <Button onClick={startCamera} disabled={isCameraReady} className="gap-2">
                  <Camera className="h-4 w-4" />
                  {isCameraReady ? 'Camera Active' : 'Start Camera'}
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Upload File
                </Button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.heic,.heif"
                onChange={handleFileUpload}
                className="hidden"
              />

              {isCameraReady && (
                <div className="space-y-4">
                  <div className="relative bg-black rounded-lg overflow-hidden">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-64 object-cover"
                    />
                    <canvas
                      ref={canvasRef}
                      className="hidden"
                    />
                  </div>
                  <div className="text-center">
                    <Button onClick={capturePhoto} size="lg" className="gap-2">
                      <Camera className="h-4 w-4" />
                      Capture Photo
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Image Preview */}
              <div className="relative">
                <img
                  src={previewUrl}
                  alt="Captured"
                  className="w-full max-h-64 object-contain rounded-lg border"
                />
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => {
                    setCapturedImage(null);
                    URL.revokeObjectURL(previewUrl);
                    setPreviewUrl('');
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Metadata Form */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="caption">Caption (Optional)</Label>
                  <Textarea
                    id="caption"
                    placeholder="Add a caption for this image..."
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    rows={3}
                  />
                </div>

                <div>
                  <Label>Tags (Optional)</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {tags.map(tag => (
                      <Badge
                        key={tag.id}
                        variant={selectedTags.includes(tag.id) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => handleTagToggle(tag.id)}
                      >
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                  {tags.length === 0 && (
                    <p className="text-sm text-muted-foreground mt-2">
                      No tags available. Create tags in the Tag Management section.
                    </p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleUpload} 
                  disabled={isUploading}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  {isUploading ? 'Uploading...' : 'Upload Image'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};