import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCameraImport } from '@/hooks/useCameraImport';
import { Camera, Upload, X, SwitchCamera, Video, Circle, Square, Mic, ArrowLeft, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { QuickCaptureCategory } from './QuickCaptureCategorySelector';

interface CategorizedQuickCaptureProps {
  category: QuickCaptureCategory;
  onClose: () => void;
  onBack: () => void;
}

const categoryConfig = {
  christmas_carol_selfie: {
    title: 'Christmas Carol Selfie',
    icon: Sparkles,
    mode: 'photo' as const,
    folder: 'christmas-carol-selfies',
  },
  glee_cam_pic: {
    title: 'Glee Cam Pic',
    icon: Camera,
    mode: 'photo' as const,
    folder: 'glee-cam-pics',
  },
  voice_part_recording: {
    title: 'Voice Part Recording',
    icon: Mic,
    mode: 'video' as const,
    folder: 'voice-part-recordings',
  },
  exec_board_video: {
    title: 'ExecBoard Video',
    icon: Video,
    mode: 'video' as const,
    folder: 'exec-board-videos',
  },
  member_audition_video: {
    title: 'Member Audition Video',
    icon: Video,
    mode: 'video' as const,
    folder: 'member-audition-videos',
  },
};

export const CategorizedQuickCapture = ({ category, onClose, onBack }: CategorizedQuickCaptureProps) => {
  const config = categoryConfig[category];
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [capturedMedia, setCapturedMedia] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [photoCount, setPhotoCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

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
      setCapturedMedia(file);
      setPreviewUrl(URL.createObjectURL(file));
    },
    onError: (error) => {
      toast({
        title: "Camera Error",
        description: error,
        variant: "destructive",
      });
    },
    mode: config.mode
  });

  // Reset to camera mode for taking another photo
  const resetForNextCapture = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setCapturedMedia(null);
    setPreviewUrl('');
    setTitle('');
    setDescription('');
    // Camera stays active - no need to restart
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setCapturedMedia(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const isVideoFile = capturedMedia?.type.startsWith('video/');

  const handleUpload = async () => {
    if (!capturedMedia) {
      console.error('No captured media to upload');
      return;
    }

    console.log('Starting upload:', {
      fileName: capturedMedia.name,
      fileSize: capturedMedia.size,
      fileType: capturedMedia.type,
      category
    });

    setIsUploading(true);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) {
        console.error('Auth error:', authError);
        throw new Error('Authentication error: ' + authError.message);
      }
      if (!user) {
        throw new Error('Please sign in to upload media');
      }

      console.log('User authenticated:', user.id);

      // Upload file to storage
      const fileExt = capturedMedia.name.split('.').pop() || (isVideoFile ? 'webm' : 'jpg');
      const fileName = `${user.id}/${config.folder}/${Date.now()}.${fileExt}`;
      
      console.log('Uploading to storage:', fileName);
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('quick-capture-media')
        .upload(fileName, capturedMedia, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw new Error('Storage upload failed: ' + uploadError.message);
      }

      console.log('Storage upload success:', uploadData);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('quick-capture-media')
        .getPublicUrl(fileName);

      console.log('Public URL:', publicUrl);

      // Generate thumbnail for videos
      let thumbnailUrl = null;
      if (isVideoFile && canvasRef.current && videoRef.current) {
        // Thumbnail generation handled elsewhere if needed
      }

      // Save to database
      const insertData = {
        user_id: user.id,
        category: category,
        title: title.trim() || `${config.title} - ${new Date().toLocaleDateString()}`,
        description: description.trim() || null,
        file_url: publicUrl,
        thumbnail_url: thumbnailUrl,
        file_type: capturedMedia.type,
        file_size: capturedMedia.size,
        is_approved: category === 'glee_cam_pic' || category === 'christmas_carol_selfie',
      };
      
      console.log('Inserting to database:', insertData);
      
      const { data: dbData, error: dbError } = await supabase
        .from('quick_capture_media')
        .insert(insertData)
        .select()
        .single();

      if (dbError) {
        console.error('Database insert error:', dbError);
        throw new Error('Database insert failed: ' + dbError.message);
      }

      console.log('Database insert success:', dbData);

      // If glee cam pic or christmas selfie, sync to heroes
      if (category === 'glee_cam_pic' || category === 'christmas_carol_selfie') {
        console.log('Syncing to heroes...');
        const { error: syncError } = await supabase.functions.invoke('sync-glee-cam-to-heroes');
        if (syncError) {
          console.warn('Hero sync warning:', syncError);
        }
      }

      setPhotoCount(prev => prev + 1);
      
      toast({
        title: "Success",
        description: `${config.title} uploaded! Camera ready for next shot.`,
      });

      // Reset for next capture instead of closing
      resetForNextCapture();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload media",
        variant: "destructive",
      });
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

  const Icon = config.icon;

  return (
    <Dialog open={true} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={onBack} className="mr-1">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Icon className="h-5 w-5" />
            {config.title}
            {photoCount > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({photoCount} uploaded)
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Camera/Upload Section */}
          {!capturedMedia ? (
            <div className="space-y-4">
              {cameraError && (
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-sm text-destructive">{cameraError}</p>
                </div>
              )}
              
              <div className="flex gap-3 justify-center">
                <Button onClick={startCamera} disabled={isCameraReady || isCapturing} className="gap-2">
                  {config.mode === 'photo' ? <Camera className="h-4 w-4" /> : <Video className="h-4 w-4" />}
                  {isCapturing ? 'Starting...' : isCameraReady ? 'Camera Active' : `Start ${config.mode === 'photo' ? 'Camera' : 'Recording'}`}
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
                accept={config.mode === 'photo' ? 'image/*,.heic,.heif' : 'video/*,audio/*'}
                onChange={handleFileUpload}
                className="hidden"
              />

              {/* Camera interface */}
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
                        {config.mode === 'photo' ? (
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
                
                <canvas ref={canvasRef} className="hidden" />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Media Preview */}
              <div className="relative">
                {isVideoFile || capturedMedia.type.startsWith('audio/') ? (
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
                    setCapturedMedia(null);
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
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    placeholder={`Give your ${config.mode === 'photo' ? 'photo' : 'video'} a title...`}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Add a description..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-between">
                <Button variant="ghost" onClick={resetForNextCapture} className="gap-2">
                  <Camera className="h-4 w-4" />
                  Retake
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleClose}>
                    {photoCount > 0 ? 'Done' : 'Cancel'}
                  </Button>
                  <Button 
                    onClick={handleUpload} 
                    disabled={isUploading}
                    className="gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    {isUploading ? 'Uploading...' : 'Upload & Continue'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
