import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX } from 'lucide-react';

interface VirtualPianoProps {
  className?: string;
}

// Extended piano range (C3 to G5)
const whiteKeys = [
  { note: 'C', octave: 3, frequency: 130.81 },
  { note: 'D', octave: 3, frequency: 146.83 },
  { note: 'E', octave: 3, frequency: 164.81 },
  { note: 'F', octave: 3, frequency: 174.61 },
  { note: 'G', octave: 3, frequency: 196.00 },
  { note: 'A', octave: 3, frequency: 220.00 },
  { note: 'B', octave: 3, frequency: 246.94 },
  { note: 'C', octave: 4, frequency: 261.63 },
  { note: 'D', octave: 4, frequency: 293.66 },
  { note: 'E', octave: 4, frequency: 329.63 },
  { note: 'F', octave: 4, frequency: 349.23 },
  { note: 'G', octave: 4, frequency: 392.00 },
  { note: 'A', octave: 4, frequency: 440.00 },
  { note: 'B', octave: 4, frequency: 493.88 },
  { note: 'C', octave: 5, frequency: 523.25 },
  { note: 'D', octave: 5, frequency: 587.33 },
  { note: 'E', octave: 5, frequency: 659.25 },
  { note: 'F', octave: 5, frequency: 698.46 },
  { note: 'G', octave: 5, frequency: 783.99 },
];

const blackKeys = [
  { note: 'C#', octave: 3, frequency: 138.59, position: 0.5 },
  { note: 'D#', octave: 3, frequency: 155.56, position: 1.5 },
  { note: 'F#', octave: 3, frequency: 185.00, position: 3.5 },
  { note: 'G#', octave: 3, frequency: 207.65, position: 4.5 },
  { note: 'A#', octave: 3, frequency: 233.08, position: 5.5 },
  { note: 'C#', octave: 4, frequency: 277.18, position: 7.5 },
  { note: 'D#', octave: 4, frequency: 311.13, position: 8.5 },
  { note: 'F#', octave: 4, frequency: 369.99, position: 10.5 },
  { note: 'G#', octave: 4, frequency: 415.30, position: 11.5 },
  { note: 'A#', octave: 4, frequency: 466.16, position: 12.5 },
  { note: 'C#', octave: 5, frequency: 554.37, position: 14.5 },
  { note: 'D#', octave: 5, frequency: 622.25, position: 15.5 },
  { note: 'F#', octave: 5, frequency: 739.99, position: 17.5 },
];

export const VirtualPiano: React.FC<VirtualPianoProps> = ({ className = '' }) => {
  const [isPlaying, setIsPlaying] = useState<string | null>(null);
  const [volume, setVolume] = useState([0.3]);
  const [isMuted, setIsMuted] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  const initAudioContext = useCallback(async () => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      console.log('🎹 Creating new AudioContext for VirtualPiano');
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    // Always try to resume if suspended (required for mobile browsers)
    if (audioContextRef.current.state === 'suspended') {
      try {
        console.log('🔊 Attempting to resume AudioContext...');
        await audioContextRef.current.resume();
        console.log('✅ AudioContext resumed, state:', audioContextRef.current.state);
      } catch (error) {
        console.error('❌ Failed to resume AudioContext:', error);
        // Try creating fresh context
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        await audioContextRef.current.resume();
      }
    }
    
    console.log('🎹 AudioContext ready, state:', audioContextRef.current.state);
    return audioContextRef.current;
  }, []);

  const playNote = useCallback(async (frequency: number, noteName: string) => {
    const audioContext = await initAudioContext();
    
    if (!audioContext || audioContext.state !== 'running') {
      console.warn('AudioContext not available or not running');
      return;
    }

    // Stop any currently playing note
    stopNote();
    
    // Create oscillator and gain nodes
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    oscillator.type = 'sine';
    
    const currentVolume = isMuted ? 0 : volume[0];
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(currentVolume, audioContext.currentTime + 0.02);
    
    oscillator.start();
    
    oscillatorRef.current = oscillator;
    gainNodeRef.current = gainNode;
    setIsPlaying(noteName);
  }, [volume, isMuted, initAudioContext]);

  const stopNote = useCallback(() => {
    if (oscillatorRef.current && gainNodeRef.current && audioContextRef.current) {
      try {
        const currentTime = audioContextRef.current.currentTime;
        gainNodeRef.current.gain.linearRampToValueAtTime(0, currentTime + 0.05);
        
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

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (gainNodeRef.current && audioContextRef.current) {
      const newVolume = !isMuted ? 0 : volume[0];
      gainNodeRef.current.gain.setValueAtTime(newVolume, audioContextRef.current.currentTime);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopNote();
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, [stopNote]);

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Virtual Piano</span>
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
                onValueChange={setVolume}
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
        {/* Piano Keyboard */}
        <div className="relative w-full h-32 bg-gray-100 p-2 rounded-lg overflow-x-auto">
          {/* White Keys */}
          <div className="flex h-full min-w-max">
            {whiteKeys.map((key, index) => {
              const keyName = `${key.note}${key.octave}`;
              return (
                <div
                  key={keyName}
                  className={`w-10 h-full cursor-pointer transition-all duration-100 flex items-end justify-center pb-2 text-xs font-medium select-none border-r border-gray-300 last:border-r-0 ${
                    isPlaying === keyName
                      ? "bg-blue-200 shadow-inner transform translate-y-1"
                      : "bg-white hover:bg-gray-50 shadow-md"
                  } ${index === 0 ? "rounded-l-md" : ""} ${index === whiteKeys.length - 1 ? "rounded-r-md" : ""}`}
                  style={{
                    boxShadow: isPlaying === keyName 
                      ? "inset 0 2px 4px rgba(0,0,0,0.3)" 
                      : "0 2px 4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.8)"
                  }}
                  onMouseDown={() => playNote(key.frequency, keyName)}
                  onMouseUp={stopNote}
                  onMouseLeave={stopNote}
                  onTouchStart={() => playNote(key.frequency, keyName)}
                  onTouchEnd={stopNote}
                >
                  <span className="text-gray-700 text-xs">{key.note}</span>
                </div>
              );
            })}
          </div>
          
          {/* Black Keys */}
          <div className="absolute top-2 left-2 right-2 h-20 pointer-events-none">
            {blackKeys.map((key) => {
              const keyName = `${key.note}${key.octave}`;
              const leftOffset = key.position * 40 + 16; // 40px per white key + padding
              
              return (
                <div
                  key={keyName}
                  className={`absolute w-6 h-full cursor-pointer transition-all duration-100 flex items-end justify-center pb-2 text-xs font-medium pointer-events-auto select-none ${
                    isPlaying === keyName
                      ? "bg-gray-600 shadow-inner transform translate-y-1"
                      : "bg-gray-900 hover:bg-gray-800"
                  }`}
                  style={{
                    left: `${leftOffset}px`,
                    borderRadius: "0 0 4px 4px",
                    boxShadow: isPlaying === keyName 
                      ? "inset 0 2px 4px rgba(0,0,0,0.6)" 
                      : "0 2px 6px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)"
                  }}
                  onMouseDown={() => playNote(key.frequency, keyName)}
                  onMouseUp={stopNote}
                  onMouseLeave={stopNote}
                  onTouchStart={() => playNote(key.frequency, keyName)}
                  onTouchEnd={stopNote}
                >
                  <span className="text-white text-xs">{key.note}</span>
                </div>
              );
            })}
          </div>
        </div>
        
        <div className="text-center mt-4">
          {isPlaying && (
            <div className="text-sm text-muted-foreground">
              Playing: <span className="font-semibold text-primary">{isPlaying}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};