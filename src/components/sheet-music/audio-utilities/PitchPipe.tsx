import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PitchPipeProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PitchPipe = ({ isOpen, onClose }: PitchPipeProps) => {
  const [activeNote, setActiveNote] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

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

  const playNote = (note: { name: string; frequency: number }) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }

    const ctx = audioContextRef.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.value = note.frequency;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 2);

    setActiveNote(note.name);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 2);

    setTimeout(() => setActiveNote(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <Card className="w-96 mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Pitch Pipe
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-6 gap-2">
          {notes.map((note) => (
            <Button
              key={note.name}
              variant={activeNote === note.name ? "default" : "outline"}
              className={`h-12 ${
                note.name.includes('#') ? 'bg-gray-800 text-white' : ''
              }`}
              onClick={() => playNote(note)}
            >
              {note.name}
            </Button>
          ))}
        </div>
        <div className="mt-4 text-center text-sm text-muted-foreground">
          Click any note to hear its pitch
        </div>
      </CardContent>
    </Card>
  );
};