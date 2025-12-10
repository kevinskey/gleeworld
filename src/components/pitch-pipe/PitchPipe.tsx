import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Volume2, VolumeX } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { unlockAudioContext, setupMobileAudioUnlock, forceUnlockAudio } from '@/utils/mobileAudioUnlock';

interface PitchPipeProps {
  className?: string;
}

// Base frequencies for octave 4 (middle C)
const baseWhiteKeys = [
  { note: 'C', baseFrequency: 261.63 },
  { note: 'D', baseFrequency: 293.66 },
  { note: 'E', baseFrequency: 329.63 },
  { note: 'F', baseFrequency: 349.23 },
  { note: 'G', baseFrequency: 392.00 },
  { note: 'A', baseFrequency: 440.00 },
  { note: 'B', baseFrequency: 493.88 },
];

const baseBlackKeys = [
  { note: 'C♯', baseFrequency: 277.18, position: 0.5 },
  { note: 'D♯', baseFrequency: 311.13, position: 1.5 },
  { note: 'F♯', baseFrequency: 369.99, position: 3.5 },
  { note: 'G♯', baseFrequency: 415.30, position: 4.5 },
  { note: 'A♯', baseFrequency: 466.16, position: 5.5 },
];

export const PitchPipe = ({ className = '' }: PitchPipeProps) => {
  const [isPlaying, setIsPlaying] = useState<string | null>(null);
  const [volume, setVolume] = useState([0.3]);
  const [isMuted, setIsMuted] = useState(false);
  const [octave, setOctave] = useState<number>(4); // Default to octave 4 (middle C)
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  // Setup mobile audio unlock on mount
  useEffect(() => {
    const cleanup = setupMobileAudioUnlock();
    return cleanup;
  }, []);

  // Calculate frequencies for selected octave
  const octaveMultiplier = Math.pow(2, octave - 4); // 4 is the base octave
  const whiteKeys = baseWhiteKeys.map(key => ({
    ...key,
    frequency: key.baseFrequency * octaveMultiplier
  }));
  const blackKeys = baseBlackKeys.map(key => ({
    ...key,
    frequency: key.baseFrequency * octaveMultiplier
  }));

  const initAudioContext = useCallback(async () => {
    try {
      // Force unlock for iOS on user gesture
      forceUnlockAudio();
      
      // Use shared unlock utility for iOS compatibility
      const ctx = await unlockAudioContext();
      audioContextRef.current = ctx;
      return ctx;
    } catch (error) {
      console.error('Failed to initialize AudioContext:', error);
      return null;
    }
  }, []);

  const playTone = useCallback(async (frequency: number, note: string) => {
    // Force unlock audio on touch (critical for iOS)
    forceUnlockAudio();
    
    if (isPlaying === note) {
      stopTone();
      return;
    }

    stopTone(); // Stop any currently playing tone
    
    const audioContext = await initAudioContext();
    
    if (!audioContext || audioContext.state !== 'running') {
      console.warn('AudioContext not available or not running');
      return;
    }
    
    // Create oscillator for the tone
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine'; // Pure tone
    
    const currentVolume = isMuted ? 0 : volume[0];
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(currentVolume, audioContext.currentTime + 0.05);
    
    oscillator.start();
    
    oscillatorRef.current = oscillator;
    gainNodeRef.current = gainNode;
    setIsPlaying(note);
    
    // Auto-stop after 3 seconds
    setTimeout(() => {
      if (isPlaying === note) {
        stopTone();
      }
    }, 3000);
  }, [isPlaying, volume, isMuted, initAudioContext]);

  const stopTone = useCallback(() => {
    if (oscillatorRef.current && gainNodeRef.current && audioContextRef.current) {
      try {
        gainNodeRef.current.gain.linearRampToValueAtTime(0, audioContextRef.current.currentTime + 0.05);
        setTimeout(() => {
          oscillatorRef.current?.stop();
          oscillatorRef.current = null;
          gainNodeRef.current = null;
        }, 50);
      } catch (error) {
        // Oscillator might already be stopped
        oscillatorRef.current = null;
        gainNodeRef.current = null;
      }
    }
    setIsPlaying(null);
  }, []);

  // Cleanup on unmount - don't close shared context
  useEffect(() => {
    return () => {
      stopTone();
      // Don't close the shared audio context
    };
  }, [stopTone]);

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (gainNodeRef.current && audioContextRef.current) {
      const newVolume = !isMuted ? 0 : volume[0];
      gainNodeRef.current.gain.setValueAtTime(newVolume, audioContextRef.current.currentTime);
    }
  };

  const handleVolumeChange = (newVolume: number[]) => {
    setVolume(newVolume);
    if (gainNodeRef.current && audioContextRef.current && !isMuted) {
      gainNodeRef.current.gain.setValueAtTime(newVolume[0], audioContextRef.current.currentTime);
    }
  };

  return (
    <Card className={`w-full max-w-2xl ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Pitch Pipe</span>
          <div className="flex items-center gap-2">
            <Select value={octave.toString()} onValueChange={(value) => setOctave(parseInt(value))}>
              <SelectTrigger className="w-20 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2">C2</SelectItem>
                <SelectItem value="3">C3</SelectItem>
                <SelectItem value="4">C4</SelectItem>
                <SelectItem value="5">C5</SelectItem>
                <SelectItem value="6">C6</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleMute}
              className="h-8 w-8"
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
            <div className="w-20">
              <Slider
                value={volume}
                onValueChange={handleVolumeChange}
                max={1}
                min={0}
                step={0.1}
                className="w-full"
              />
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Piano Keyboard Layout */}
        <div className="relative w-full h-40 mb-4 bg-gray-100 p-2 rounded-lg">
          {/* White Keys */}
          <div className="flex h-full gap-px">
            {whiteKeys.map((key, index) => (
              <div
                key={key.note}
                className={`flex-1 cursor-pointer transition-all duration-100 flex items-end justify-center pb-3 text-sm font-medium select-none ${
                  isPlaying === key.note
                    ? "bg-blue-200 shadow-inner transform translate-y-1"
                    : "bg-white hover:bg-gray-50 shadow-md"
                } ${index === 0 ? "rounded-l-md" : ""} ${index === whiteKeys.length - 1 ? "rounded-r-md" : ""}`}
                style={{
                  boxShadow: isPlaying === key.note 
                    ? "inset 0 2px 4px rgba(0,0,0,0.3)" 
                    : "0 2px 4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.8)"
                }}
                onClick={() => playTone(key.frequency, key.note)}
              >
                <span className="text-gray-700 font-semibold">{key.note}</span>
              </div>
            ))}
          </div>
          
          {/* Black Keys */}
          <div className="absolute top-2 left-2 right-2 h-24 pointer-events-none">
            {blackKeys.map((key) => {
              const leftPercentage = (key.position / whiteKeys.length) * 100;
              return (
                <div
                  key={key.note}
                  className={`absolute w-7 h-full cursor-pointer transition-all duration-100 flex items-end justify-center pb-2 text-xs font-medium pointer-events-auto select-none ${
                    isPlaying === key.note
                      ? "bg-gray-600 shadow-inner transform translate-y-1"
                      : "bg-gray-900 hover:bg-gray-800"
                  }`}
                  style={{
                    left: `calc(${leftPercentage}% - 0.875rem)`,
                    borderRadius: "0 0 4px 4px",
                    boxShadow: isPlaying === key.note 
                      ? "inset 0 2px 4px rgba(0,0,0,0.6)" 
                      : "0 2px 6px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)"
                  }}
                  onClick={() => playTone(key.frequency, key.note)}
                >
                  <span className="text-white text-xs">{key.note}</span>
                </div>
              );
            })}
          </div>
        </div>
        
        <div className="text-center space-y-2">
          {isPlaying && (
            <Button
              variant="secondary"
              size="sm"
              onClick={stopTone}
              className="mt-2"
            >
              Stop Playing
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};