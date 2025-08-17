import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Volume2, VolumeX } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

interface PitchPipeProps {
  className?: string;
}

// Piano keys data for one octave (C to B)
const whiteKeys = [
  { note: 'C', frequency: 261.63, octave: 4 },
  { note: 'D', frequency: 293.66, octave: 4 },
  { note: 'E', frequency: 329.63, octave: 4 },
  { note: 'F', frequency: 349.23, octave: 4 },
  { note: 'G', frequency: 392.00, octave: 4 },
  { note: 'A', frequency: 440.00, octave: 4 },
  { note: 'B', frequency: 493.88, octave: 4 },
];

const blackKeys = [
  { note: 'C♯', frequency: 277.18, octave: 4, position: 0.5 }, // Between C and D
  { note: 'D♯', frequency: 311.13, octave: 4, position: 1.5 }, // Between D and E
  { note: 'F♯', frequency: 369.99, octave: 4, position: 3.5 }, // Between F and G
  { note: 'G♯', frequency: 415.30, octave: 4, position: 4.5 }, // Between G and A
  { note: 'A♯', frequency: 466.16, octave: 4, position: 5.5 }, // Between A and B
];

export const PitchPipe = ({ className = '' }: PitchPipeProps) => {
  const [isPlaying, setIsPlaying] = useState<string | null>(null);
  const [volume, setVolume] = useState([0.3]);
  const [isMuted, setIsMuted] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  const playTone = useCallback((frequency: number, note: string) => {
    if (isPlaying === note) {
      stopTone();
      return;
    }

    stopTone(); // Stop any currently playing tone
    
    const audioContext = initAudioContext();
    
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
      gainNodeRef.current.gain.linearRampToValueAtTime(0, audioContextRef.current.currentTime + 0.05);
      setTimeout(() => {
        oscillatorRef.current?.stop();
        oscillatorRef.current = null;
        gainNodeRef.current = null;
      }, 50);
    }
    setIsPlaying(null);
  }, []);

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
        <div className="relative w-full h-32 mb-4">
          {/* White Keys */}
          <div className="flex h-full">
            {whiteKeys.map((key, index) => (
              <button
                key={key.note}
                className={`flex-1 border border-gray-300 rounded-b-lg transition-all duration-150 flex items-end justify-center pb-2 text-sm font-medium ${
                  isPlaying === key.note
                    ? "bg-primary text-primary-foreground shadow-lg transform scale-y-95"
                    : "bg-white hover:bg-gray-50 text-gray-800"
                } ${index === 0 ? "rounded-bl-lg" : ""} ${index === whiteKeys.length - 1 ? "rounded-br-lg" : ""}`}
                onClick={() => playTone(key.frequency, key.note)}
              >
                {key.note}
              </button>
            ))}
          </div>
          
          {/* Black Keys */}
          <div className="absolute top-0 left-0 w-full h-20 pointer-events-none">
            {blackKeys.map((key) => (
              <button
                key={key.note}
                className={`absolute w-8 h-full rounded-b-lg border border-gray-600 transition-all duration-150 flex items-end justify-center pb-1 text-xs font-medium pointer-events-auto ${
                  isPlaying === key.note
                    ? "bg-primary text-primary-foreground shadow-lg transform scale-95"
                    : "bg-gray-800 hover:bg-gray-700 text-white"
                }`}
                style={{
                  left: `calc(${(key.position / whiteKeys.length) * 100}% - 1rem)`,
                }}
                onClick={() => playTone(key.frequency, key.note)}
              >
                {key.note}
              </button>
            ))}
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