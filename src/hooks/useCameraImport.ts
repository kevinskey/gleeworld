import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CameraImportOptions {
  onSuccess?: (file: File) => void;
  onError?: (error: string) => void;
  acceptedTypes?: string[];
  mode?: 'photo' | 'video';
}

export const useCameraImport = (options: CameraImportOptions = {}) => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const { 
    onSuccess, 
    onError, 
    acceptedTypes = ['image/*', 'application/pdf'],
    mode = 'photo'
  } = options;

  const startCamera = useCallback(async () => {
    try {
      console.log('useCameraImport: Starting camera...');
      setCameraError(null);
      setIsCapturing(true);
      
      // Wait longer for DOM to be ready to prevent blinking
      await new Promise(resolve => setTimeout(resolve, 800));
      
      if (!videoRef.current) {
        console.error('useCameraImport: Video ref not available');
        setIsCapturing(false);
        const errorMessage = 'Camera interface not ready. Please try again.';
        onError?.(errorMessage);
        return;
      }
      
      // Camera constraints with dynamic facing mode
      const constraints = {
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };
      
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (error) {
        console.log(`useCameraImport: ${facingMode} camera failed, trying basic camera`);
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      streamRef.current = stream;
      
      // Wait for video setup before playing
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Video setup timeout'));
        }, 5000);
        
        const video = videoRef.current!;
        video.onloadedmetadata = () => {
          console.log('useCameraImport: Video metadata loaded');
          clearTimeout(timeout);
          resolve();
        };
        
        video.onerror = () => {
          clearTimeout(timeout);
          reject(new Error('Video setup failed'));
        };
        
        video.srcObject = stream;
      });
      
      await videoRef.current.play();
      setIsCameraReady(true);
      console.log('useCameraImport: Camera ready');
      
    } catch (error) {
      console.error('useCameraImport: Error accessing camera:', error);
      const errorMessage = 'Unable to access camera. Please check permissions or use file upload instead.';
      setCameraError(errorMessage);
      toast({
        title: "Camera Error",
        description: errorMessage,
        variant: "destructive",
      });
      onError?.(errorMessage);
      setIsCapturing(false);
      setIsCameraReady(false);
    }
  }, [onError, toast, facingMode]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }
    setIsCapturing(false);
    setIsCameraReady(false);
    setCameraError(null);
  }, []);

  const capturePhoto = useCallback(async () => {
    console.log('capturePhoto called', { 
      videoRef: !!videoRef.current, 
      canvasRef: !!canvasRef.current, 
      isCameraReady 
    });
    
    if (!videoRef.current || !canvasRef.current || !isCameraReady) {
      console.log('Missing requirements for photo capture');
      return;
    }

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      console.log('Video dimensions:', { 
        videoWidth: video.videoWidth, 
        videoHeight: video.videoHeight 
      });
      
      if (!context) {
        throw new Error('Unable to get canvas context');
      }

      // Set canvas size to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert canvas to blob
      canvas.toBlob(async (blob) => {
        if (!blob) {
          throw new Error('Failed to capture image');
        }

        // Create file from blob
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const file = new File([blob], `camera-capture-${timestamp}.jpg`, {
          type: 'image/jpeg',
          lastModified: Date.now(),
        });

        toast({
          title: "Photo Captured",
          description: "Photo captured successfully. You can now process or upload it.",
        });

        onSuccess?.(file);
        stopCamera();
      }, 'image/jpeg', 0.8);

    } catch (error) {
      console.error('Error capturing photo:', error);
      const errorMessage = 'Failed to capture photo. Please try again.';
      toast({
        title: "Capture Error",
        description: errorMessage,
        variant: "destructive",
      });
      onError?.(errorMessage);
    }
  }, [isCameraReady, onSuccess, onError, toast, stopCamera]);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const isValidType = acceptedTypes.some(type => {
      if (type === 'image/*') {
        return file.type.startsWith('image/');
      }
      if (type === 'application/pdf') {
        return file.type === 'application/pdf';
      }
      return file.type === type;
    });

    if (!isValidType) {
      const errorMessage = `Invalid file type. Please select: ${acceptedTypes.join(', ')}`;
      toast({
        title: "Invalid File Type",
        description: errorMessage,
        variant: "destructive",
      });
      onError?.(errorMessage);
      return;
    }

    onSuccess?.(file);
  }, [acceptedTypes, onSuccess, onError, toast]);

  const startRecording = useCallback(async () => {
    if (!streamRef.current || !isCameraReady) {
      const errorMessage = 'Camera not ready for recording';
      onError?.(errorMessage);
      return;
    }

    try {
      const options = { mimeType: 'video/webm;codecs=vp9,opus' };
      let mediaRecorder;
      
      try {
        mediaRecorder = new MediaRecorder(streamRef.current, options);
      } catch (e) {
        // Fallback to default codec if vp9 not supported
        mediaRecorder = new MediaRecorder(streamRef.current);
      }

      recordedChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const file = new File([blob], `video-${timestamp}.webm`, {
          type: 'video/webm',
          lastModified: Date.now(),
        });

        toast({
          title: "Video Recorded",
          description: "Video recorded successfully!",
        });

        onSuccess?.(file);
        setRecordingDuration(0);
        
        // Stop camera after video is processed
        stopCamera();
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);

      // Start duration timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Error starting recording:', error);
      const errorMessage = 'Failed to start recording. Please try again.';
      toast({
        title: "Recording Error",
        description: errorMessage,
        variant: "destructive",
      });
      onError?.(errorMessage);
    }
  }, [isCameraReady, onSuccess, onError, toast, stopCamera]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      
      // Camera will be stopped in the onstop handler after video is processed
    }
  }, [isRecording]);

  const switchCamera = useCallback(async () => {
    if (isCapturing) {
      // Stop current camera
      stopCamera();
      // Wait a moment for cleanup
      await new Promise(resolve => setTimeout(resolve, 100));
      // Switch facing mode
      setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
      // Start camera with new facing mode
      await startCamera();
    } else {
      // Just switch the mode if camera is not active
      setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    }
  }, [isCapturing, stopCamera, startCamera]);

  return {
    isCapturing,
    isCameraReady,
    cameraError,
    facingMode,
    isRecording,
    recordingDuration,
    videoRef,
    canvasRef,
    startCamera,
    stopCamera,
    capturePhoto,
    startRecording,
    stopRecording,
    handleFileSelect,
    switchCamera,
  };
};