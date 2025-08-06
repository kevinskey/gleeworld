import React, { useRef, useEffect, useState } from 'react';
import { Timer, Play, Pause, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MetronomeProps {
  isEnabled: boolean;
  tempo: number;
  timeSignature: string;
  isPlaying: boolean;
  onPlayingChange?: (playing: boolean) => void;
  className?: string;
}

export const Metronome: React.FC<MetronomeProps> = ({
  isEnabled,
  tempo,
  timeSignature,
  isPlaying,
  onPlayingChange,
  className = ''
}) => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [currentBeat, setCurrentBeat] = useState(1);
  const [clickCount, setClickCount] = useState(0);

  const [beatsPerMeasure] = timeSignature.split('/').map(Number);

  useEffect(() => {
    if (isEnabled) {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (error) {
        console.warn('Web Audio API not supported');
      }
    }

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [isEnabled]);

  useEffect(() => {
    if (isPlaying && isEnabled) {
      startMetronome();
    } else {
      stopMetronome();
    }

    return () => stopMetronome();
  }, [isPlaying, isEnabled, tempo]);

  const playClick = async (isDownbeat: boolean = false) => {
    if (!audioContextRef.current || !isEnabled) return;

    try {
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      const oscillator = audioContextRef.current.createOscillator();
      const gainNode = audioContextRef.current.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);

      // Different frequencies for downbeat vs regular beat
      oscillator.frequency.setValueAtTime(
        isDownbeat ? 1000 : 800, 
        audioContextRef.current.currentTime
      );
      oscillator.type = 'square';

      // Sharp, short click
      gainNode.gain.setValueAtTime(0, audioContextRef.current.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.1, audioContextRef.current.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContextRef.current.currentTime + 0.1);

      oscillator.start(audioContextRef.current.currentTime);
      oscillator.stop(audioContextRef.current.currentTime + 0.1);
    } catch (error) {
      console.error('Error playing metronome click:', error);
    }
  };

  const startMetronome = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    const interval = 60000 / tempo; // milliseconds per beat

    intervalRef.current = setInterval(() => {
      setCurrentBeat(prev => {
        const nextBeat = prev >= beatsPerMeasure ? 1 : prev + 1;
        const isDownbeat = nextBeat === 1;
        
        playClick(isDownbeat);
        setClickCount(c => c + 1);
        
        return nextBeat;
      });
    }, interval);
  };

  const stopMetronome = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const toggleMetronome = () => {
    const newPlaying = !isPlaying;
    if (onPlayingChange) {
      onPlayingChange(newPlaying);
    }
  };

  const resetMetronome = () => {
    setCurrentBeat(1);
    setClickCount(0);
    if (onPlayingChange) {
      onPlayingChange(false);
    }
  };

  if (!isEnabled) {
    return (
      <div className={`p-4 bg-muted/30 rounded-lg border-2 border-dashed ${className}`}>
        <div className="text-center text-muted-foreground">
          <Timer className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Metronome is disabled</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-background border-2 border-border rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-3 bg-muted/30 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Timer className="h-4 w-4" />
            <span className="text-sm font-medium">Metronome</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={resetMetronome}
              className="h-7 px-2"
            >
              <RotateCcw className="h-3 w-3" />
            </Button>
            <Button
              variant={isPlaying ? "destructive" : "default"}
              size="sm"
              onClick={toggleMetronome}
              className="h-7 px-3"
            >
              {isPlaying ? (
                <>
                  <Pause className="h-3 w-3 mr-1" />
                  Stop
                </>
              ) : (
                <>
                  <Play className="h-3 w-3 mr-1" />
                  Start
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Metronome Display */}
      <div className="p-4">
        {/* Tempo Display */}
        <div className="text-center mb-4">
          <div className="text-2xl font-bold text-primary">
            ♩ = {tempo}
          </div>
          <div className="text-sm text-muted-foreground">
            {timeSignature} time signature
          </div>
        </div>

        {/* Beat Indicator */}
        <div className="flex justify-center mb-4">
          <div className="flex gap-2">
            {Array.from({ length: beatsPerMeasure }, (_, i) => i + 1).map(beat => (
              <div
                key={beat}
                className={`
                  w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium
                  transition-all duration-150
                  ${currentBeat === beat
                    ? beat === 1 
                      ? 'bg-red-500 border-red-500 text-white animate-pulse' 
                      : 'bg-primary border-primary text-primary-foreground animate-pulse'
                    : 'bg-muted border-muted-foreground/30 text-muted-foreground'
                  }
                `}
              >
                {beat}
              </div>
            ))}
          </div>
        </div>

        {/* Status */}
        <div className="text-center space-y-2">
          <div className={`text-sm font-medium ${isPlaying ? 'text-green-600' : 'text-muted-foreground'}`}>
            {isPlaying ? 'Playing' : 'Stopped'}
          </div>
          
          {clickCount > 0 && (
            <div className="text-xs text-muted-foreground">
              Total beats: {clickCount}
            </div>
          )}
          
          <div className="text-xs text-muted-foreground">
            Current beat: <strong>{currentBeat}</strong> of {beatsPerMeasure}
          </div>
        </div>

        {/* Visual Beat Indicator */}
        {isPlaying && (
          <div className="mt-4 h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-200"
              style={{ 
                width: `${(currentBeat / beatsPerMeasure) * 100}%`,
                backgroundColor: currentBeat === 1 ? '#ef4444' : undefined
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};