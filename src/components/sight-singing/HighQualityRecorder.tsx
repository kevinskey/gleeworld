import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Mic, Square, Volume2, VolumeX } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface HighQualityRecorderProps {
  isRecording: boolean;
  onRecordingStart: () => void;
  onRecordingStop: (audioBlob: Blob) => void;
  onError: (error: string) => void;
  className?: string;
}

export const HighQualityRecorder: React.FC<HighQualityRecorderProps> = ({
  isRecording,
  onRecordingStart,
  onRecordingStop,
  onError,
  className = ""
}) => {
  const [audioLevel, setAudioLevel] = useState(0);
  const [peakLevel, setPeakLevel] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [hasPermission, setHasPermission] = useState(false);
  
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number>();
  const chunksRef = useRef<BlobPart[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const { toast } = useToast();

  // Initialize audio system with high quality settings
  const initializeAudio = async () => {
    try {
      // Request high quality audio
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 48000, // Higher quality than default 44100
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: false, // Keep natural voice
          autoGainControl: false // Preserve dynamics
        }
      });

      mediaStreamRef.current = stream;
      
      // Create audio context for monitoring
      audioContextRef.current = new AudioContext({ sampleRate: 48000 });
      sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      
      // Configure analyser for better visualization
      analyserRef.current.fftSize = 512;
      analyserRef.current.smoothingTimeConstant = 0.3;
      
      sourceRef.current.connect(analyserRef.current);
      
      setHasPermission(true);
      startAudioLevelMonitoring();
      
      toast({
        title: "Audio Ready",
        description: "High-quality recording initialized"
      });
      
    } catch (error) {
      console.error('Error initializing audio:', error);
      let errorMessage = 'Failed to access microphone. ';
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage += 'Please allow microphone access and try again.';
        } else if (error.name === 'NotFoundError') {
          errorMessage += 'No microphone found.';
        } else {
          errorMessage += error.message;
        }
      }
      
      onError(errorMessage);
      toast({
        title: "Audio Error",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  // Start audio level monitoring
  const startAudioLevelMonitoring = () => {
    if (!analyserRef.current) return;
    
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const updateLevels = () => {
      if (!analyserRef.current || !isRecording) return;
      
      analyserRef.current.getByteFrequencyData(dataArray);
      
      // Calculate RMS level for more accurate representation
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i] * dataArray[i];
      }
      const rms = Math.sqrt(sum / bufferLength);
      const level = (rms / 255) * 100;
      
      setAudioLevel(level);
      setPeakLevel(prev => Math.max(prev, level));
      
      animationFrameRef.current = requestAnimationFrame(updateLevels);
    };
    
    updateLevels();
  };

  // Start recording with high quality settings
  const startRecording = async () => {
    if (!mediaStreamRef.current) {
      await initializeAudio();
      if (!mediaStreamRef.current) return;
    }

    try {
      // Use high quality recording options
      const options = {
        mimeType: 'audio/webm;codecs=opus', // Opus codec for better quality
        audioBitsPerSecond: 128000 // Higher bitrate for better quality
      };
      
      // Fallback for browsers that don't support opus
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = 'audio/webm';
      }
      
      mediaRecorderRef.current = new MediaRecorder(mediaStreamRef.current, options);
      chunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { 
          type: mediaRecorderRef.current?.mimeType || 'audio/webm' 
        });
        onRecordingStop(blob);
        
        // Clean up
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
      
      mediaRecorderRef.current.start(100); // Collect data every 100ms for smooth recording
      
      // Start timer
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      // Reset peak level
      setPeakLevel(0);
      
      onRecordingStart();
      startAudioLevelMonitoring();
      
    } catch (error) {
      console.error('Error starting recording:', error);
      onError('Failed to start recording. Please try again.');
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  };

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Initialize audio on mount
  useEffect(() => {
    initializeAudio();
  }, []);

  return (
    <Card className={`border-border bg-background/50 ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Mic className="h-5 w-5" />
            High-Quality Recording
          </span>
          {isRecording && (
            <span className="text-red-500 font-mono text-sm">
              {formatTime(recordingTime)}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Recording Controls */}
        <div className="flex items-center justify-center gap-4">
          <Button
            onClick={isRecording ? stopRecording : startRecording}
            variant={isRecording ? "destructive" : "default"}
            size="lg"
            className="flex items-center gap-2 min-w-[160px]"
            disabled={!hasPermission}
          >
            {isRecording ? (
              <>
                <Square className="h-4 w-4" />
                Stop Recording
              </>
            ) : (
              <>
                <Mic className="h-4 w-4" />
                Start Recording
              </>
            )}
          </Button>
          
          <Button
            variant="outline"
            size="lg"
            onClick={() => setIsMuted(!isMuted)}
            className="flex items-center gap-2"
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
        </div>

        {/* Audio Level Meter */}
        {hasPermission && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Audio Level</span>
              <span className="font-mono">
                {Math.round(audioLevel)}% / Peak: {Math.round(peakLevel)}%
              </span>
            </div>
            <div className="relative">
              <Progress 
                value={audioLevel} 
                className="h-3 bg-gray-200"
              />
              {/* Peak indicator */}
              <div 
                className="absolute top-0 h-3 w-1 bg-red-500 transition-all duration-100"
                style={{ left: `${Math.min(peakLevel, 100)}%` }}
              />
            </div>
            <div className="text-xs text-muted-foreground text-center">
              Keep audio levels between 30-80% for optimal quality
            </div>
          </div>
        )}

        {/* Status Indicators */}
        <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${hasPermission ? 'bg-green-500' : 'bg-red-500'}`} />
            {hasPermission ? 'Microphone Ready' : 'Microphone Access Needed'}
          </div>
          <div className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-300'}`} />
            {isRecording ? 'Recording' : 'Standby'}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};