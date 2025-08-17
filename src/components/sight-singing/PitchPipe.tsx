import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { VolumeX } from 'lucide-react';

interface PitchPipeProps {
  className?: string;
}

export const PitchPipe: React.FC<PitchPipeProps> = ({ className = '' }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentNote, setCurrentNote] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  // Piano keys data for one octave (C to B)
  const whiteKeys = [
    { name: 'C', frequency: 261.63 },
    { name: 'D', frequency: 293.66 },
    { name: 'E', frequency: 329.63 },
    { name: 'F', frequency: 349.23 },
    { name: 'G', frequency: 392.00 },
    { name: 'A', frequency: 440.00 },
    { name: 'B', frequency: 493.88 },
  ];

  const blackKeys = [
    { name: 'C#', frequency: 277.18, position: 0.5 }, // Between C and D
    { name: 'D#', frequency: 311.13, position: 1.5 }, // Between D and E
    { name: 'F#', frequency: 369.99, position: 3.5 }, // Between F and G
    { name: 'G#', frequency: 415.30, position: 4.5 }, // Between G and A
    { name: 'A#', frequency: 466.16, position: 5.5 }, // Between A and B
  ];

  const initAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
  };

  const playNote = (frequency: number, noteName: string) => {
    try {
      initAudioContext();
      
      // Stop any currently playing note
      stopNote();
      
      if (!audioContextRef.current) return;

      // Create oscillator and gain nodes
      const oscillator = audioContextRef.current.createOscillator();
      const gainNode = audioContextRef.current.createGain();
      
      // Set up the audio chain
      oscillator.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);
      
      // Configure oscillator
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, audioContextRef.current.currentTime);
      
      // Configure gain with fade in/out
      gainNode.gain.setValueAtTime(0, audioContextRef.current.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, audioContextRef.current.currentTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + 2);
      
      // Start playing
      oscillator.start();
      oscillator.stop(audioContextRef.current.currentTime + 2);
      
      // Store references
      oscillatorRef.current = oscillator;
      gainNodeRef.current = gainNode;
      
      setIsPlaying(true);
      setCurrentNote(noteName);
      
      // Clean up when note ends
      oscillator.onended = () => {
        setIsPlaying(false);
        setCurrentNote(null);
        oscillatorRef.current = null;
        gainNodeRef.current = null;
      };
      
    } catch (error) {
      console.error('Error playing note:', error);
      setIsPlaying(false);
      setCurrentNote(null);
    }
  };

  const stopNote = () => {
    if (oscillatorRef.current && gainNodeRef.current) {
      try {
        // Fade out quickly
        const currentTime = audioContextRef.current?.currentTime || 0;
        gainNodeRef.current.gain.cancelScheduledValues(currentTime);
        gainNodeRef.current.gain.setValueAtTime(gainNodeRef.current.gain.value, currentTime);
        gainNodeRef.current.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.1);
        
        oscillatorRef.current.stop(currentTime + 0.1);
      } catch (error) {
        console.error('Error stopping note:', error);
      }
    }
    
    setIsPlaying(false);
    setCurrentNote(null);
    oscillatorRef.current = null;
    gainNodeRef.current = null;
  };

  return (
    <Card className={`p-3 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium">Pitch Pipe</h3>
        {isPlaying && (
          <Button
            size="sm"
            variant="ghost"
            onClick={stopNote}
            className="text-xs"
          >
            <VolumeX className="h-3 w-3 mr-1" />
            Stop
          </Button>
        )}
      </div>
      
      {/* Piano Keyboard Layout */}
      <div className="relative w-full h-32 mb-3 bg-gray-100 p-2 rounded-lg">
        {/* White Keys */}
        <div className="flex h-full gap-px">
          {whiteKeys.map((key, index) => (
            <div
              key={key.name}
              className={`flex-1 cursor-pointer transition-all duration-100 flex items-end justify-center pb-2 text-sm font-medium select-none ${
                currentNote === key.name
                  ? "bg-blue-200 shadow-inner transform translate-y-1"
                  : "bg-white hover:bg-gray-50 shadow-md"
              } ${index === 0 ? "rounded-l-md" : ""} ${index === whiteKeys.length - 1 ? "rounded-r-md" : ""}`}
              style={{
                boxShadow: currentNote === key.name 
                  ? "inset 0 2px 4px rgba(0,0,0,0.3)" 
                  : "0 2px 4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.8)"
              }}
              onClick={() => playNote(key.frequency, key.name)}
            >
              <span className="text-gray-700 font-semibold">{key.name}</span>
            </div>
          ))}
        </div>
        
        {/* Black Keys */}
        <div className="absolute top-2 left-2 right-2 h-20 pointer-events-none">
          {blackKeys.map((key) => {
            const leftPercentage = (key.position / whiteKeys.length) * 100;
            return (
              <div
                key={key.name}
                className={`absolute w-6 h-full cursor-pointer transition-all duration-100 flex items-end justify-center pb-1 text-xs font-medium pointer-events-auto select-none ${
                  currentNote === key.name
                    ? "bg-gray-600 shadow-inner transform translate-y-1"
                    : "bg-gray-900 hover:bg-gray-800"
                }`}
                style={{
                  left: `calc(${leftPercentage}% - 0.75rem)`,
                  borderRadius: "0 0 4px 4px",
                  boxShadow: currentNote === key.name 
                    ? "inset 0 2px 4px rgba(0,0,0,0.6)" 
                    : "0 2px 6px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)"
                }}
                onClick={() => playNote(key.frequency, key.name)}
              >
                <span className="text-white text-xs">{key.name}</span>
              </div>
            );
          })}
        </div>
      </div>
      
      {currentNote && (
        <div className="text-center">
          <span className="text-xs text-muted-foreground">
            Playing: <span className="font-medium text-foreground">{currentNote}</span>
          </span>
        </div>
      )}
    </Card>
  );
};