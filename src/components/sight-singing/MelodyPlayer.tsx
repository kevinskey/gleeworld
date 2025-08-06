import React, { useRef, useCallback, useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';

interface Note {
  note: string;
  time: number;
  duration?: number;
}

interface MelodyPlayerProps {
  melody: Note[];
  tempo?: number;
  className?: string;
  autoPlay?: boolean;
}

// Note frequencies (A440 tuning)
const NOTE_FREQUENCIES: { [key: string]: number } = {
  'C3': 130.81, 'C#3': 138.59, 'D3': 146.83, 'D#3': 155.56, 'E3': 164.81,
  'F3': 174.61, 'F#3': 185.00, 'G3': 196.00, 'G#3': 207.65, 'A3': 220.00,
  'A#3': 233.08, 'B3': 246.94,
  'C4': 261.63, 'C#4': 277.18, 'D4': 293.66, 'D#4': 311.13, 'E4': 329.63,
  'F4': 349.23, 'F#4': 369.99, 'G4': 392.00, 'G#4': 415.30, 'A4': 440.00,
  'A#4': 466.16, 'B4': 493.88,
  'C5': 523.25, 'C#5': 554.37, 'D5': 587.33, 'D#5': 622.25, 'E5': 659.25,
  'F5': 698.46, 'F#5': 739.99, 'G5': 783.99
};

export const MelodyPlayer: React.FC<MelodyPlayerProps> = ({
  melody,
  tempo = 120,
  className = '',
  autoPlay = false
}) => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(0.5);
  const [isMuted, setIsMuted] = useState(false);
  const [currentNoteIndex, setCurrentNoteIndex] = useState(0);
  const playbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  // Initialize audio context
  const initAudioContext = useCallback(async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }
    
    return audioContextRef.current;
  }, []);

  // Play a single note
  const playNote = useCallback(async (note: string, duration: number = 0.5) => {
    if (!audioContextRef.current) return;

    const frequency = NOTE_FREQUENCIES[note];
    if (!frequency) return;

    const oscillator = audioContextRef.current.createOscillator();
    const gainNode = audioContextRef.current.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContextRef.current.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, audioContextRef.current.currentTime);

    const actualVolume = isMuted ? 0 : volume;
    
    // Create envelope for more musical sound
    gainNode.gain.setValueAtTime(0, audioContextRef.current.currentTime);
    gainNode.gain.linearRampToValueAtTime(actualVolume * 0.3, audioContextRef.current.currentTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(actualVolume * 0.1, audioContextRef.current.currentTime + duration * 0.8);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContextRef.current.currentTime + duration);

    oscillator.start(audioContextRef.current.currentTime);
    oscillator.stop(audioContextRef.current.currentTime + duration);
  }, [volume, isMuted]);

  // Calculate total melody duration
  const getTotalDuration = useCallback(() => {
    if (melody.length === 0) return 0;
    const lastNote = melody[melody.length - 1];
    return lastNote.time + (lastNote.duration || 0.5);
  }, [melody]);

  // Play the entire melody
  const playMelody = useCallback(async () => {
    if (melody.length === 0) return;

    try {
      await initAudioContext();
      setIsPlaying(true);
      setCurrentNoteIndex(0);
      startTimeRef.current = Date.now();

      // Convert tempo to time scaling
      const tempoMultiplier = 120 / tempo; // Normal tempo is 120 BPM

      melody.forEach((note, index) => {
        const delayMs = note.time * 1000 * tempoMultiplier;
        const duration = (note.duration || 0.5) * tempoMultiplier;

        playbackTimeoutRef.current = setTimeout(() => {
          playNote(note.note, duration);
          setCurrentNoteIndex(index);
        }, delayMs);
      });

      // Schedule stop
      const totalDuration = getTotalDuration() * tempoMultiplier;
      playbackTimeoutRef.current = setTimeout(() => {
        stopMelody();
      }, totalDuration * 1000);

      // Update progress
      const progressInterval = setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        const progressPercent = Math.min((elapsed / (totalDuration)) * 100, 100);
        setProgress(progressPercent);

        if (progressPercent >= 100) {
          clearInterval(progressInterval);
        }
      }, 50);

    } catch (error) {
      console.error('Error playing melody:', error);
      stopMelody();
    }
  }, [melody, tempo, playNote, initAudioContext, getTotalDuration]);

  // Stop playback
  const stopMelody = useCallback(() => {
    setIsPlaying(false);
    setProgress(0);
    setCurrentNoteIndex(0);
    
    if (playbackTimeoutRef.current) {
      clearTimeout(playbackTimeoutRef.current);
      playbackTimeoutRef.current = null;
    }
  }, []);

  // Reset to beginning
  const resetMelody = useCallback(() => {
    stopMelody();
    setProgress(0);
    setCurrentNoteIndex(0);
  }, [stopMelody]);

  // Toggle play/pause
  const togglePlayback = useCallback(() => {
    if (isPlaying) {
      stopMelody();
    } else {
      playMelody();
    }
  }, [isPlaying, playMelody, stopMelody]);

  // Auto play when melody changes if enabled
  useEffect(() => {
    if (autoPlay && melody.length > 0) {
      playMelody();
    }
  }, [melody, autoPlay, playMelody]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (playbackTimeoutRef.current) {
        clearTimeout(playbackTimeoutRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  if (melody.length === 0) {
    return (
      <div className={`p-4 bg-muted/30 rounded-lg border-2 border-dashed ${className}`}>
        <div className="text-center text-muted-foreground">
          <p className="text-sm">No melody to play</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-background border border-border rounded-lg p-4 space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Melody Player</h3>
        <div className="text-xs text-muted-foreground">
          {melody.length} notes • {Math.round(getTotalDuration())}s
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <Progress value={progress} className="h-2" />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Note {currentNoteIndex + 1} of {melody.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={togglePlayback}
            disabled={melody.length === 0}
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={resetMelody}
            disabled={melody.length === 0}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>

        {/* Volume Control */}
        <div className="flex items-center gap-2 min-w-0 flex-1 max-w-32">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMuted(!isMuted)}
          >
            {isMuted ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </Button>
          
          <Slider
            value={[isMuted ? 0 : volume * 100]}
            onValueChange={(value) => {
              const newVolume = value[0] / 100;
              setVolume(newVolume);
              if (newVolume > 0) setIsMuted(false);
            }}
            max={100}
            step={1}
            className="flex-1"
          />
        </div>
      </div>

      {/* Current Note Display */}
      {isPlaying && currentNoteIndex < melody.length && (
        <div className="text-center p-3 bg-primary/10 rounded-md border border-primary/20">
          <div className="text-lg font-bold text-primary">
            {melody[currentNoteIndex].note}
          </div>
          <div className="text-xs text-muted-foreground">
            Current Note
          </div>
        </div>
      )}
    </div>
  );
};