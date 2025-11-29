import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCameraImport } from '@/hooks/useCameraImport';
import { PRImageTag } from '@/hooks/usePRImages';
import { Camera, Upload, X, SwitchCamera, Video, Circle, Square } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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
  const [mode, setMode] = useState<'photo' | 'video'>('photo');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Find or ensure Glee Cam tag exists and auto-select it
  const gleeCamTag = tags.find(tag => tag.name.toLowerCase() === 'glee cam');
  
  // Auto-select Glee Cam tag on mount
  useState(() => {
    if (gleeCamTag && !selectedTags.includes(gleeCamTag.id)) {
      setSelectedTags([gleeCamTag.id]);
    }
  });

  console.log('PRQuickCapture: Component rendered');

  const { 
    startCamera, 
    capturePhoto, 
    stopCamera, 
    switchCamera,
    startRecording,
    stopRecording,
    isCameraReady,
    cameraError,
    isRecording,
    recordingDuration,
    videoRef,
    canvasRef,
    isCapturing
  } = useCameraImport({
    onSuccess: (file) => {
      console.log('PRQuickCapture: Camera success callback');
      setCapturedImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    },
    onError: (error) => {
      console.log('PRQuickCapture: Camera error callback:', error);
      toast({
        title: "Camera Error",
        description: error,
        variant: "destructive",
      });
    },
    mode
  });

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setCapturedImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const isVideoFile = capturedImage?.type.startsWith('video/');

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
      // Ensure Glee Cam tag is included
      const tagsToUse = gleeCamTag && !selectedTags.includes(gleeCamTag.id)
        ? [...selectedTags, gleeCamTag.id]
        : selectedTags;

      const uploadedImage = await onCapture(capturedImage, {
        caption: caption.trim() || undefined,
        taken_at: new Date().toISOString(),
        tags: tagsToUse.length > 0 ? tagsToUse : undefined,
      });

      // Trigger sync to hero slides
      try {
        const { error: syncError } = await supabase.functions.invoke('sync-glee-cam-to-heroes');
        if (syncError) {
          console.error('Error syncing to heroes:', syncError);
        } else {
          console.log('Successfully synced Glee Cam photos to hero slides');
        }
      } catch (syncErr) {
        console.error('Sync invocation error:', syncErr);
      }

      toast({
        title: "Success",
        description: "Image captured and added to landing page heroes!",
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
            {mode === 'photo' ? <Camera className="h-5 w-5" /> : <Video className="h-5 w-5" />}
            Quick Capture - {mode === 'photo' ? 'Photo' : 'Video'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Mode Selection */}
          {!capturedImage && !isCameraReady && (
            <Tabs value={mode} onValueChange={(v) => setMode(v as 'photo' | 'video')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="photo" className="gap-2">
                  <Camera className="h-4 w-4" />
                  Photo
                </TabsTrigger>
                <TabsTrigger value="video" className="gap-2">
                  <Video className="h-4 w-4" />
                  Video
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}

          {/* Camera/Upload Section */}
          {!capturedImage ? (
            <div className="space-y-4">
              {cameraError && (
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-sm text-destructive">{cameraError}</p>
                </div>
              )}
              
              <div className="flex gap-3 justify-center">
                <Button onClick={() => {
                  console.log('PRQuickCapture: Start Camera button clicked');
                  startCamera();
                }} disabled={isCameraReady || isCapturing} className="gap-2">
                  {mode === 'photo' ? <Camera className="h-4 w-4" /> : <Video className="h-4 w-4" />}
                  {isCapturing ? 'Starting Camera...' : isCameraReady ? 'Camera Active' : `Start ${mode === 'photo' ? 'Camera' : 'Video'}`}
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
                accept={mode === 'photo' ? 'image/*,.heic,.heif' : 'video/*'}
                onChange={handleFileUpload}
                className="hidden"
              />

              {/* Camera interface - always render video element for ref availability */}
              <div className="space-y-4">
                <div className={`relative bg-black rounded-lg overflow-hidden ${!isCameraReady ? 'hidden' : ''}`}>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-64 object-cover"
                  />
                  {isCameraReady && (
                    <>
                      {!isRecording && (
                        <Button
                          variant="secondary"
                          size="icon"
                          onClick={switchCamera}
                          className="absolute top-4 right-4 bg-background/80 hover:bg-background"
                        >
                          <SwitchCamera className="h-4 w-4" />
                        </Button>
                      )}
                      
                      {isRecording && (
                        <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 rounded-full flex items-center gap-2">
                          <Circle className="h-3 w-3 fill-white animate-pulse" />
                          <span className="text-sm font-mono">{formatDuration(recordingDuration)}</span>
                        </div>
                      )}
                      
                      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                        {mode === 'photo' ? (
                          <Button
                            onClick={capturePhoto}
                            size="lg"
                            className="bg-red-600 hover:bg-red-700 text-white rounded-full w-16 h-16"
                          >
                            <Camera className="h-6 w-6" />
                          </Button>
                        ) : (
                          <Button
                            onClick={isRecording ? stopRecording : startRecording}
                            size="lg"
                            className={`${isRecording ? 'bg-red-700' : 'bg-red-600 hover:bg-red-700'} text-white rounded-full w-16 h-16`}
                          >
                            {isRecording ? <Square className="h-6 w-6" /> : <Circle className="h-6 w-6" />}
                          </Button>
                        )}
                      </div>
                    </>
                  )}
                </div>
                
                {/* Always render canvas for capture functionality */}
                <canvas
                  ref={canvasRef}
                  className="hidden"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Image/Video Preview */}
              <div className="relative">
                {isVideoFile ? (
                  <video
                    src={previewUrl}
                    controls
                    className="w-full max-h-64 object-contain rounded-lg border bg-black"
                  />
                ) : (
                  <img
                    src={previewUrl}
                    alt="Captured"
                    className="w-full max-h-64 object-contain rounded-lg border"
                  />
                )}
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
                  {isUploading ? 'Uploading...' : `Upload ${isVideoFile ? 'Video' : 'Image'}`}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};