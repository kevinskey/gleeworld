import React, { useState, useRef, useEffect, useCallback } from 'react';
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

  const initAudioContext = useCallback(async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    if (audioContextRef.current.state === 'suspended') {
      try {
        await audioContextRef.current.resume();
      } catch (error) {
        console.error('Failed to resume AudioContext:', error);
      }
    }
    
    return audioContextRef.current;
  }, []);

  const playNote = useCallback(async (frequency: number, noteName: string) => {
    try {
      const audioContext = await initAudioContext();
      
      // Stop any currently playing note
      stopCurrentNote();
      
      if (!audioContext || audioContext.state !== 'running') return;

      // Create oscillator and gain nodes
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      // Set up the audio chain
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Configure oscillator
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
      
      // Configure gain with quick fade in only
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.02);
      
      // Start playing (no auto-stop)
      oscillator.start();
      
      // Store references
      oscillatorRef.current = oscillator;
      gainNodeRef.current = gainNode;
      
      setIsPlaying(true);
      setCurrentNote(noteName);
      
    } catch (error) {
      console.error('Error playing note:', error);
      setIsPlaying(false);
      setCurrentNote(null);
    }
  }, [initAudioContext]);

  const stopCurrentNote = useCallback(() => {
    if (oscillatorRef.current && gainNodeRef.current && audioContextRef.current) {
      try {
        const currentTime = audioContextRef.current.currentTime;
        // Quick fade-out to prevent click
        gainNodeRef.current.gain.cancelScheduledValues(currentTime);
        gainNodeRef.current.gain.setValueAtTime(gainNodeRef.current.gain.value, currentTime);
        gainNodeRef.current.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.01);
        oscillatorRef.current.stop(currentTime + 0.01);
      } catch (e) {
        // Oscillator might already be stopped
      }
    }
    
    setIsPlaying(false);
    setCurrentNote(null);
    oscillatorRef.current = null;
    gainNodeRef.current = null;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCurrentNote();
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, [stopCurrentNote]);


  return (
    <Card className={`p-3 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium">Pitch Pipe</h3>
      </div>
      
      {/* Piano Keyboard Layout */}
      <div className="relative w-full h-32 mb-3 bg-gray-100 p-2 rounded-lg">
        {/* White Keys */}
        <div className="flex h-full">
          {whiteKeys.map((key, index) => (
            <div
              key={key.name}
              className={`flex-1 cursor-pointer transition-all duration-100 flex items-end justify-center pb-2 text-sm font-medium select-none border-r border-gray-200 last:border-r-0 ${
                currentNote === key.name
                  ? "bg-blue-200 shadow-inner"
                  : "bg-white hover:bg-gray-50 shadow-md"
              } ${index === 0 ? "rounded-l-md" : ""} ${index === whiteKeys.length - 1 ? "rounded-r-md" : ""}`}
              style={{
                boxShadow: currentNote === key.name 
                  ? "inset 0 2px 4px rgba(0,0,0,0.3)" 
                  : "0 2px 4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.8)"
              }}
              onMouseDown={() => playNote(key.frequency, key.name)}
              onMouseUp={stopCurrentNote}
              onMouseLeave={stopCurrentNote}
              onTouchStart={() => playNote(key.frequency, key.name)}
              onTouchEnd={stopCurrentNote}
            >
              <span className="text-gray-700 font-semibold">{key.name}</span>
            </div>
          ))}
        </div>
        
        {/* Black Keys */}
        <div className="absolute top-2 left-2 right-2 h-16 pointer-events-none">
          {blackKeys.map((key) => {
            const whiteKeyWidth = 100 / whiteKeys.length;
            const blackKeyWidth = whiteKeyWidth * 0.6; // 60% of white key width
            // Position black key at the right edge of the white key it follows
            const keyIndex = Math.floor(key.position);
            const leftPercentage = ((keyIndex + 1) * whiteKeyWidth) - (blackKeyWidth / 2);
            
            return (
              <div
                key={key.name}
                className={`absolute cursor-pointer transition-all duration-100 flex items-end justify-center pb-1 text-xs font-medium pointer-events-auto select-none ${
                  currentNote === key.name
                    ? "bg-gray-600 shadow-inner"
                    : "bg-gray-900 hover:bg-gray-800"
                }`}
                style={{
                  left: `${leftPercentage}%`,
                  width: `${blackKeyWidth}%`,
                  height: '100%',
                  borderRadius: "0 0 4px 4px",
                  boxShadow: currentNote === key.name 
                    ? "inset 0 2px 4px rgba(0,0,0,0.6)" 
                    : "0 2px 6px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)"
                }}
                onMouseDown={() => playNote(key.frequency, key.name)}
                onMouseUp={stopCurrentNote}
                onMouseLeave={stopCurrentNote}
                onTouchStart={() => playNote(key.frequency, key.name)}
                onTouchEnd={stopCurrentNote}
              >
                <span className="text-white text-xs">{key.name}</span>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
};