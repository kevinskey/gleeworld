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

  // Note frequencies (A4 = 440Hz)
  const notes = [
    { name: 'C', frequency: 261.63 },
    { name: 'C#', frequency: 277.18 },
    { name: 'D', frequency: 293.66 },
    { name: 'D#', frequency: 311.13 },
    { name: 'E', frequency: 329.63 },
    { name: 'F', frequency: 349.23 },
    { name: 'F#', frequency: 369.99 },
    { name: 'G', frequency: 392.00 },
    { name: 'G#', frequency: 415.30 },
    { name: 'A', frequency: 440.00 },
    { name: 'A#', frequency: 466.16 },
    { name: 'B', frequency: 493.88 },
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

  const isSharpNote = (noteName: string) => noteName.includes('#');

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
      
      <div className="space-y-2">
        {/* Natural notes row */}
        <div className="flex gap-1">
          {notes.filter(note => !isSharpNote(note.name)).map((note) => (
            <Button
              key={note.name}
              size="sm"
              variant={currentNote === note.name ? "default" : "outline"}
              onClick={() => playNote(note.frequency, note.name)}
              disabled={isPlaying && currentNote !== note.name}
              className="flex-1 text-xs font-mono h-8"
            >
              {note.name}
            </Button>
          ))}
        </div>
        
        {/* Sharp notes row */}
        <div className="flex gap-1">
          <div className="flex-1"></div>
          {notes.filter(note => isSharpNote(note.name)).map((note, index) => {
            const gaps = [];
            if (note.name === 'C#') gaps.push(<div key="gap1" className="flex-1"></div>);
            if (note.name === 'F#') gaps.push(<div key="gap2" className="flex-1"></div>);
            
            return (
              <React.Fragment key={note.name}>
                <Button
                  size="sm"
                  variant={currentNote === note.name ? "default" : "secondary"}
                  onClick={() => playNote(note.frequency, note.name)}
                  disabled={isPlaying && currentNote !== note.name}
                  className="flex-1 text-xs font-mono h-6 bg-muted-foreground/20 hover:bg-muted-foreground/30"
                >
                  {note.name}
                </Button>
                {gaps}
              </React.Fragment>
            );
          })}
          <div className="flex-1"></div>
        </div>
      </div>
      
      {currentNote && (
        <div className="mt-2 text-center">
          <span className="text-xs text-muted-foreground">
            Playing: <span className="font-medium text-foreground">{currentNote}</span>
          </span>
        </div>
      )}
    </Card>
  );
};