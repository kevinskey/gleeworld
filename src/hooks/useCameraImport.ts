import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CameraImportOptions {
  onSuccess?: (file: File) => void;
  onError?: (error: string) => void;
  acceptedTypes?: string[];
}

export const useCameraImport = (options: CameraImportOptions = {}) => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { toast } = useToast();

  const { 
    onSuccess, 
    onError, 
    acceptedTypes = ['image/*', 'application/pdf'] 
  } = options;

  const startCamera = useCallback(async () => {
    try {
      setIsCapturing(true);
      
      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera if available
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });

      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsCameraReady(true);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      const errorMessage = 'Unable to access camera. Please check permissions or use file upload instead.';
      toast({
        title: "Camera Error",
        description: errorMessage,
        variant: "destructive",
      });
      onError?.(errorMessage);
      setIsCapturing(false);
    }
  }, [onError, toast]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }
    setIsCapturing(false);
    setIsCameraReady(false);
  }, []);

  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !isCameraReady) {
      return;
    }

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
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

  return {
    isCapturing,
    isCameraReady,
    videoRef,
    canvasRef,
    startCamera,
    stopCamera,
    capturePhoto,
    handleFileSelect,
  };
};