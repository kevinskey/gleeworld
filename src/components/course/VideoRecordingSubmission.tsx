import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Video, Square, Play, Pause, RotateCcw, Upload, Camera, FlipHorizontal2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Progress } from '@/components/ui/progress';

interface VideoRecordingSubmissionProps {
  assignmentId: string;
  onVideoUploaded: (url: string) => void;
  existingVideoUrl?: string;
}

export const VideoRecordingSubmission: React.FC<VideoRecordingSubmissionProps> = ({
  assignmentId,
  onVideoUploaded,
  existingVideoUrl
}) => {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  
  const [isStreaming, setIsStreaming] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isPlaying, setIsPlaying] = useState(false);
  
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const startCamera = useCallback(async (facing: 'user' | 'environment' = facingMode) => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: facing
        },
        audio: true
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        streamRef.current = stream;
        setIsStreaming(true);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast.error('Unable to access camera. Please check permissions.');
    }
  }, [facingMode]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
  }, []);

  const switchCamera = useCallback(() => {
    const newFacing = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacing);
    if (isStreaming && !isRecording) {
      startCamera(newFacing);
    }
  }, [facingMode, isStreaming, isRecording, startCamera]);

  const startRecording = useCallback(() => {
    if (!streamRef.current) return;
    
    chunksRef.current = [];
    
    const options = { mimeType: 'video/webm;codecs=vp9,opus' };
    let mediaRecorder: MediaRecorder;
    
    try {
      mediaRecorder = new MediaRecorder(streamRef.current, options);
    } catch {
      // Fallback for browsers that don't support vp9
      mediaRecorder = new MediaRecorder(streamRef.current, { mimeType: 'video/webm' });
    }
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };
    
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      setRecordedBlob(blob);
      const url = URL.createObjectURL(blob);
      setRecordedUrl(url);
    };
    
    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start(1000);
    setIsRecording(true);
    setDuration(0);
    
    durationIntervalRef.current = setInterval(() => {
      setDuration(prev => prev + 1);
    }, 1000);
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
      
      stopCamera();
    }
  }, [isRecording, stopCamera]);

  const clearRecording = useCallback(() => {
    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl);
    }
    setRecordedBlob(null);
    setRecordedUrl(null);
    setDuration(0);
    setIsPlaying(false);
  }, [recordedUrl]);

  const uploadVideo = useCallback(async () => {
    if (!recordedBlob || !user) return;
    
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      const fileName = `${user.id}/${assignmentId}/${Date.now()}.webm`;
      
      // Simulate progress for UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);
      
      const { data, error } = await supabase.storage
        .from('conducting-videos')
        .upload(fileName, recordedBlob, {
          cacheControl: '3600',
          upsert: true
        });
      
      clearInterval(progressInterval);
      
      if (error) throw error;
      
      const { data: urlData } = supabase.storage
        .from('conducting-videos')
        .getPublicUrl(data.path);
      
      setUploadProgress(100);
      onVideoUploaded(urlData.publicUrl);
      toast.success('Video uploaded successfully!');
      clearRecording();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload video. Please try again.');
    } finally {
      setIsUploading(false);
    }
  }, [recordedBlob, user, assignmentId, onVideoUploaded, clearRecording]);

  const togglePlayback = useCallback(() => {
    if (videoRef.current && recordedUrl) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  }, [isPlaying, recordedUrl]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    return () => {
      stopCamera();
      if (recordedUrl) {
        URL.revokeObjectURL(recordedUrl);
      }
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [stopCamera, recordedUrl]);

  return (
    <Card className="border-2 border-dashed border-primary/30 bg-muted/30">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center gap-2 text-primary">
          <Video className="h-5 w-5" />
          <span className="font-semibold">Video Recording Submission</span>
        </div>
        
        {existingVideoUrl && !isStreaming && !recordedUrl && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Previously submitted video:</p>
            <video 
              src={existingVideoUrl} 
              controls 
              className="w-full max-h-[400px] rounded-lg bg-black"
            />
            <p className="text-xs text-muted-foreground">Record a new video to replace this submission.</p>
          </div>
        )}
        
        <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            autoPlay={isStreaming}
            playsInline
            className="w-full h-full object-cover"
            src={recordedUrl || undefined}
            onEnded={() => setIsPlaying(false)}
          />
          
          {!isStreaming && !recordedUrl && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
              <Camera className="h-12 w-12 mb-2 opacity-50" />
              <p>Click "Start Camera" to begin</p>
            </div>
          )}
          
          {isRecording && (
            <div className="absolute top-4 left-4 flex items-center gap-2 bg-destructive/90 text-destructive-foreground px-3 py-1.5 rounded-full">
              <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
              <span className="font-mono text-sm">{formatDuration(duration)}</span>
            </div>
          )}
        </div>
        
        <div className="flex flex-wrap gap-2 justify-center">
          {!isStreaming && !recordedUrl && (
            <Button onClick={() => startCamera()} variant="default">
              <Camera className="h-4 w-4 mr-2" />
              Start Camera
            </Button>
          )}
          
          {isStreaming && !isRecording && (
            <>
              <Button onClick={switchCamera} variant="outline" size="icon">
                <FlipHorizontal2 className="h-4 w-4" />
              </Button>
              <Button onClick={startRecording} variant="destructive">
                <Video className="h-4 w-4 mr-2" />
                Start Recording
              </Button>
              <Button onClick={stopCamera} variant="outline">
                Cancel
              </Button>
            </>
          )}
          
          {isRecording && (
            <Button onClick={stopRecording} variant="destructive" size="lg">
              <Square className="h-4 w-4 mr-2" />
              Stop Recording ({formatDuration(duration)})
            </Button>
          )}
          
          {recordedUrl && !isUploading && (
            <>
              <Button onClick={togglePlayback} variant="outline">
                {isPlaying ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                {isPlaying ? 'Pause' : 'Play'}
              </Button>
              <Button onClick={clearRecording} variant="outline">
                <RotateCcw className="h-4 w-4 mr-2" />
                Re-record
              </Button>
              <Button onClick={uploadVideo} variant="default">
                <Upload className="h-4 w-4 mr-2" />
                Submit Video
              </Button>
            </>
          )}
        </div>
        
        {isUploading && (
          <div className="space-y-2">
            <Progress value={uploadProgress} className="h-2" />
            <p className="text-sm text-center text-muted-foreground">
              Uploading video... {uploadProgress}%
            </p>
          </div>
        )}
        
        <p className="text-xs text-muted-foreground text-center">
          Record yourself conducting the assigned piece. Position your camera to capture your upper body and arms clearly.
        </p>
      </CardContent>
    </Card>
  );
};
