import { useState, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface RecordingManagerProps {
  onRecordingComplete: (blob: Blob) => void;
  onRecordingStateChange: (isRecording: boolean) => void;
}

export const useRecordingManager = ({
  onRecordingComplete,
  onRecordingStateChange
}: RecordingManagerProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [stream, setStream] = useState<MediaStream | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const startRecording = useCallback(async () => {
    try {
      console.log('🎙️ Starting recording...');
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 48000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      setStream(mediaStream);
      
      const recorder = new MediaRecorder(mediaStream, {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 128000
      });

      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = () => {
        console.log('🎙️ Recording stopped');
        const blob = new Blob(chunks, { type: 'audio/webm' });
        onRecordingComplete(blob);
        
        // Cleanup
        mediaStream.getTracks().forEach(track => track.stop());
        setStream(null);
      };

      recorder.onerror = (event) => {
        console.error('❌ Recording error:', event);
        toast({
          title: "Recording Error",
          description: "Failed to record audio. Please try again.",
          variant: "destructive"
        });
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      
      setIsRecording(true);
      setRecordingTime(0);
      onRecordingStateChange(true);

      // Start timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      toast({
        title: "Recording Started",
        description: "Sing along with the metronome"
      });

    } catch (error) {
      console.error('❌ Microphone access error:', error);
      toast({
        title: "Microphone Error",
        description: "Unable to access microphone. Please check permissions.",
        variant: "destructive"
      });
    }
  }, [onRecordingComplete, onRecordingStateChange, toast]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    setIsRecording(false);
    setRecordingTime(0);
    onRecordingStateChange(false);

    toast({
      title: "Recording Stopped",
      description: "Audio saved successfully"
    });
  }, [onRecordingStateChange, toast]);

  const cleanup = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }
  }, [stream]);

  return {
    isRecording,
    recordingTime,
    startRecording,
    stopRecording,
    cleanup
  };
};