import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Mic, 
  MicOff, 
  Play, 
  Square, 
  Volume2, 
  CheckCircle, 
  AlertCircle,
  Settings
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MicTesterProps {
  className?: string;
}

export const MicTester: React.FC<MicTesterProps> = ({ className = '' }) => {
  const { toast } = useToast();
  
  // State management
  const [isTestingMic, setIsTestingMic] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [micPermission, setMicPermission] = useState<'granted' | 'denied' | 'pending'>('pending');
  const [isRecordingTest, setIsRecordingTest] = useState(false);
  const [isPlayingTest, setIsPlayingTest] = useState(false);
  const [testRecording, setTestRecording] = useState<Blob | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<{ label: string; id: string } | null>(null);
  
  // Refs
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const testAudioRef = useRef<HTMLAudioElement | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMicTest();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Audio level monitoring
  const monitorAudioLevel = useCallback(() => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    // Calculate average volume
    const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
    const normalizedLevel = (average / 255) * 100;
    
    setAudioLevel(normalizedLevel);
    
    animationFrameRef.current = requestAnimationFrame(monitorAudioLevel);
  }, []);

  // Start microphone test
  const startMicTest = async () => {
    try {
      console.log('Starting microphone test...');
      
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 44100,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      console.log('Microphone access granted');
      streamRef.current = stream;
      setMicPermission('granted');
      setIsTestingMic(true);

      // Get device info
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(device => device.kind === 'audioinput');
      const currentDevice = audioInputs.find(device => 
        stream.getAudioTracks()[0].label.includes(device.label)
      ) || audioInputs[0];
      
      if (currentDevice) {
        setDeviceInfo({ label: currentDevice.label, id: currentDevice.deviceId });
      }

      // Set up audio context and analyser
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      
      // Start monitoring audio levels
      monitorAudioLevel();

      toast({
        title: "Microphone Test Started",
        description: "Speak into your microphone to test audio levels"
      });

    } catch (error) {
      console.error('Error starting microphone test:', error);
      setMicPermission('denied');
      
      let errorMessage = 'Failed to access microphone';
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage = 'Microphone permission denied. Please allow microphone access in your browser settings.';
        } else if (error.name === 'NotFoundError') {
          errorMessage = 'No microphone found. Please connect a microphone device.';
        }
      }
      
      toast({
        title: "Microphone Test Failed",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  // Stop microphone test
  const stopMicTest = () => {
    console.log('Stopping microphone test...');
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    analyserRef.current = null;
    setIsTestingMic(false);
    setAudioLevel(0);
    setIsRecordingTest(false);
    setIsPlayingTest(false);
  };

  // Record test audio
  const startTestRecording = () => {
    if (!streamRef.current) return;

    try {
      const mediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType: 'audio/webm'
      });
      
      const chunks: BlobPart[] = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setTestRecording(blob);
        console.log('Test recording completed, blob size:', blob.size);
      };
      
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecordingTest(true);
      
      // Auto-stop after 3 seconds
      setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
          setIsRecordingTest(false);
        }
      }, 3000);
      
      toast({
        title: "Recording Test",
        description: "Recording for 3 seconds..."
      });
      
    } catch (error) {
      console.error('Error starting test recording:', error);
      toast({
        title: "Recording Error",
        description: "Failed to start test recording",
        variant: "destructive"
      });
    }
  };

  // Play test recording
  const playTestRecording = () => {
    if (!testRecording) return;

    try {
      const audioUrl = URL.createObjectURL(testRecording);
      const audio = new Audio(audioUrl);
      
      audio.onplay = () => setIsPlayingTest(true);
      audio.onended = () => {
        setIsPlayingTest(false);
        URL.revokeObjectURL(audioUrl);
      };
      audio.onerror = () => {
        setIsPlayingTest(false);
        URL.revokeObjectURL(audioUrl);
        toast({
          title: "Playback Error",
          description: "Failed to play test recording",
          variant: "destructive"
        });
      };
      
      testAudioRef.current = audio;
      audio.play();
      
    } catch (error) {
      console.error('Error playing test recording:', error);
      toast({
        title: "Playback Error",
        description: "Failed to play test recording",
        variant: "destructive"
      });
    }
  };

  // Stop test playback
  const stopTestPlayback = () => {
    if (testAudioRef.current) {
      testAudioRef.current.pause();
      testAudioRef.current.currentTime = 0;
      setIsPlayingTest(false);
    }
  };

  // Get audio level color
  const getAudioLevelColor = () => {
    if (audioLevel < 20) return 'bg-gray-400';
    if (audioLevel < 50) return 'bg-yellow-400';
    if (audioLevel < 80) return 'bg-green-400';
    return 'bg-red-400';
  };

  // Get status icon
  const getStatusIcon = () => {
    if (micPermission === 'denied') return <AlertCircle className="h-4 w-4 text-red-500" />;
    if (micPermission === 'granted' && isTestingMic) return <CheckCircle className="h-4 w-4 text-green-500" />;
    return <Settings className="h-4 w-4 text-gray-500" />;
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getStatusIcon()}
          Microphone Test
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Device Info */}
        {deviceInfo && (
          <div className="text-sm text-muted-foreground">
            <strong>Device:</strong> {deviceInfo.label || 'Default Microphone'}
          </div>
        )}

        {/* Audio Level Meter */}
        {isTestingMic && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Audio Level:</span>
              <span className="text-sm font-mono">{Math.round(audioLevel)}%</span>
            </div>
            <div className="relative">
              <Progress value={audioLevel} className="h-3" />
              <div 
                className={`absolute top-0 left-0 h-3 rounded transition-all duration-150 ${getAudioLevelColor()}`}
                style={{ width: `${audioLevel}%` }}
              />
            </div>
            <div className="text-xs text-muted-foreground">
              {audioLevel < 10 && "Too quiet - speak louder"}
              {audioLevel >= 10 && audioLevel < 80 && "Good level"}
              {audioLevel >= 80 && "Too loud - adjust input volume"}
            </div>
          </div>
        )}

        {/* Control Buttons */}
        <div className="flex flex-wrap gap-2">
          {!isTestingMic ? (
            <Button onClick={startMicTest} className="flex items-center gap-2">
              <Mic className="h-4 w-4" />
              Start Mic Test
            </Button>
          ) : (
            <Button onClick={stopMicTest} variant="outline" className="flex items-center gap-2">
              <MicOff className="h-4 w-4" />
              Stop Test
            </Button>
          )}

          {isTestingMic && (
            <>
              {!isRecordingTest ? (
                <Button 
                  onClick={startTestRecording} 
                  variant="secondary"
                  className="flex items-center gap-2"
                >
                  <Mic className="h-4 w-4" />
                  Record Test (3s)
                </Button>
              ) : (
                <Button 
                  disabled
                  variant="secondary"
                  className="flex items-center gap-2"
                >
                  <Mic className="h-4 w-4 animate-pulse" />
                  Recording...
                </Button>
              )}

              {testRecording && !isPlayingTest && (
                <Button 
                  onClick={playTestRecording}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Play className="h-4 w-4" />
                  Play Test
                </Button>
              )}

              {isPlayingTest && (
                <Button 
                  onClick={stopTestPlayback}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Square className="h-4 w-4" />
                  Stop Playback
                </Button>
              )}
            </>
          )}
        </div>

        {/* Permission Status */}
        {micPermission === 'denied' && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Microphone Access Denied</span>
            </div>
            <p className="text-sm text-red-600 mt-1">
              Please enable microphone permissions in your browser settings to use recording features.
            </p>
          </div>
        )}

        {/* Success Status */}
        {micPermission === 'granted' && isTestingMic && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-md">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Microphone Working</span>
            </div>
            <p className="text-sm text-green-600 mt-1">
              Your microphone is working properly. You can now use recording features.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};