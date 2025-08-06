import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Volume2, VolumeX } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

interface PitchPipeProps {
  className?: string;
}

// Standard pitch frequencies (A440 tuning)
const pitches = [
  { note: 'C', frequency: 261.63, octave: 4 },
  { note: 'C♯/D♭', frequency: 277.18, octave: 4 },
  { note: 'D', frequency: 293.66, octave: 4 },
  { note: 'D♯/E♭', frequency: 311.13, octave: 4 },
  { note: 'E', frequency: 329.63, octave: 4 },
  { note: 'F', frequency: 349.23, octave: 4 },
  { note: 'F♯/G♭', frequency: 369.99, octave: 4 },
  { note: 'G', frequency: 392.00, octave: 4 },
  { note: 'G♯/A♭', frequency: 415.30, octave: 4 },
  { note: 'A', frequency: 440.00, octave: 4 },
  { note: 'A♯/B♭', frequency: 466.16, octave: 4 },
  { note: 'B', frequency: 493.88, octave: 4 },
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
        <div className="grid grid-cols-6 gap-2 mb-4">
          {pitches.map((pitch) => (
            <Button
              key={pitch.note}
              variant={isPlaying === pitch.note ? "default" : "outline"}
              className={`h-12 text-sm font-medium transition-all duration-200 ${
                isPlaying === pitch.note 
                  ? "bg-primary text-primary-foreground shadow-lg scale-105" 
                  : "hover:bg-muted/80"
              }`}
              onClick={() => playTone(pitch.frequency, pitch.note)}
            >
              {pitch.note}
              <span className="text-xs ml-1">{pitch.octave}</span>
            </Button>
          ))}
        </div>
        
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Click a note to hear its reference pitch (A440 tuning)
          </p>
          <div className="flex justify-center gap-4 text-xs text-muted-foreground">
            <span>• Tones play for 3 seconds</span>
            <span>• Click again to stop</span>
            <span>• Great for tuning and pitch reference</span>
          </div>
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