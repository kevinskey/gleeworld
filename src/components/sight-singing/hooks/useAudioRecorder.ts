import { useState, useRef, useCallback } from 'react';

export const useAudioRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const metronomeCallbackRef = useRef<((bpm: number) => void) | null>(null);

  const startRecording = useCallback(async (bpm?: number) => {
    try {
      console.log('🎙️ Starting recording with BPM:', bpm);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      const chunks: BlobPart[] = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
          console.log('📦 Audio chunk received:', event.data.size, 'bytes');
        }
      };
      
      mediaRecorder.onstop = () => {
        console.log('🛑 Recording stopped, creating blob from', chunks.length, 'chunks');
        const blob = new Blob(chunks, { type: 'audio/webm' });
        console.log('✅ Recording blob created:', blob.size, 'bytes');
        setAudioBlob(blob);
      };
      
      // Start metronome BEFORE starting recording with immediate playback
      if (bpm && bpm > 0 && metronomeCallbackRef.current) {
        console.log('🎵 Starting metronome immediately with BPM:', bpm);
        metronomeCallbackRef.current(bpm);
        // Add a small delay to let metronome start before recording
        await new Promise(resolve => setTimeout(resolve, 200));
      } else {
        console.log('❌ No metronome callback or invalid BPM:', { bpm, hasCallback: !!metronomeCallbackRef.current });
      }
      
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      console.log('▶️ MediaRecorder started');
      
      intervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      console.error('❌ Error starting recording:', error);
      throw error;
    }
  }, []);

  const stopRecording = useCallback(() => {
    console.log('🛑 Stopping recording, isRecording:', isRecording);
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      // Stop metronome when recording stops
      if (metronomeCallbackRef.current) {
        // Signal to stop metronome (negative BPM as stop signal)
        metronomeCallbackRef.current(-1);
      }
      
      console.log('✅ Recording stopped successfully');
    }
  }, [isRecording]);

  const clearRecording = useCallback(() => {
    setAudioBlob(null);
    setRecordingDuration(0);
    // Reset metronome callback connection
    if (metronomeCallbackRef.current) {
      metronomeCallbackRef.current(-1); // Stop any playing metronome
    }
  }, []);

  const setMetronomeCallback = useCallback((callback: (bpm: number) => void) => {
    metronomeCallbackRef.current = callback;
  }, []);

  return {
    isRecording,
    recordingDuration,
    audioBlob,
    startRecording,
    stopRecording,
    clearRecording,
    setMetronomeCallback
  };
};