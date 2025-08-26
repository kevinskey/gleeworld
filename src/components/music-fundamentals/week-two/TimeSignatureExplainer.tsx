import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Play, Pause, RotateCcw } from 'lucide-react';

interface TimeSignature {
  top: number;
  bottom: number;
  name: string;
  description: string;
  beats: string[];
  example: string;
}

const timeSignatures: TimeSignature[] = [
  {
    top: 4,
    bottom: 4,
    name: "Common Time",
    description: "4 quarter note beats per measure",
    beats: ["1", "2", "3", "4"],
    example: "Most pop songs, marches"
  },
  {
    top: 3,
    bottom: 4,
    name: "Triple Time",
    description: "3 quarter note beats per measure",
    beats: ["1", "2", "3"],
    example: "Waltzes, folk songs"
  },
  {
    top: 2,
    bottom: 4,
    name: "Duple Time",
    description: "2 quarter note beats per measure",
    beats: ["1", "2"],
    example: "Marches, polkas"
  },
  {
    top: 6,
    bottom: 8,
    name: "Compound Duple",
    description: "2 dotted quarter beats, 6 eighth notes",
    beats: ["1", "2", "3", "4", "5", "6"],
    example: "Folk songs, ballads"
  }
];

export const TimeSignatureExplainer: React.FC = () => {
  const [selectedSignature, setSelectedSignature] = useState<TimeSignature>(timeSignatures[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(0);

  const playMetronome = () => {
    if (isPlaying) {
      setIsPlaying(false);
      return;
    }

    setIsPlaying(true);
    setCurrentBeat(0);

    const interval = setInterval(() => {
      setCurrentBeat(prev => {
        const nextBeat = (prev + 1) % selectedSignature.beats.length;
        if (nextBeat === 0 && prev === selectedSignature.beats.length - 1) {
          // Completed one measure
        }
        return nextBeat;
      });
    }, 600); // 100 BPM

    setTimeout(() => {
      clearInterval(interval);
      setIsPlaying(false);
      setCurrentBeat(0);
    }, 6000); // Play for 6 seconds
  };

  const resetMetronome = () => {
    setIsPlaying(false);
    setCurrentBeat(0);
  };

  return (
    <div className="space-y-3">
      {/* Time Signature Selector */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-1 md:gap-2">
        {timeSignatures.map((sig, index) => (
          <Button
            key={index}
            variant={selectedSignature === sig ? "default" : "outline"}
            className="h-12 md:h-16 flex flex-col justify-center touch-target"
            onClick={() => {
              setSelectedSignature(sig);
              resetMetronome();
            }}
          >
            <div className="text-lg md:text-xl font-mono leading-none">
              {sig.top}/{sig.bottom}
            </div>
          </Button>
        ))}
      </div>

      {/* Selected Time Signature Info */}
      <Card className="bg-primary/5">
        <CardContent className="p-3">
          <div className="text-center mb-3">
            <div className="text-3xl md:text-4xl font-mono mb-1 text-primary">
              {selectedSignature.top}/{selectedSignature.bottom}
            </div>
            <h3 className="font-medium text-sm md:text-base">{selectedSignature.name}</h3>
            <p className="text-xs md:text-sm text-muted-foreground">{selectedSignature.description}</p>
            <p className="text-xs text-muted-foreground mt-1">
              <strong>Example:</strong> {selectedSignature.example}
            </p>
          </div>

          {/* Beat Visualization */}
          <div className="flex justify-center items-center gap-2 md:gap-3 mb-3">
            {selectedSignature.beats.map((beat, index) => (
              <div
                key={index}
                className={`
                  w-8 h-8 md:w-10 md:h-10 rounded-full border-2 flex items-center justify-center font-mono
                  transition-all duration-200
                  ${currentBeat === index && isPlaying
                    ? 'bg-primary text-primary-foreground border-primary scale-110'
                    : 'bg-background border-border'
                  }
                `}
              >
                {beat}
              </div>
            ))}
          </div>

          {/* Metronome Controls */}
          <div className="flex justify-center gap-2">
            <Button
              onClick={playMetronome}
              className="touch-target"
              size="sm"
            >
              {isPlaying ? (
                <Pause className="h-4 w-4 mr-1" />
              ) : (
                <Play className="h-4 w-4 mr-1" />
              )}
              {isPlaying ? 'Pause' : 'Play'}
            </Button>
            <Button
              onClick={resetMetronome}
              variant="outline"
              className="touch-target"
              size="sm"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Beat Emphasis Explanation */}
      <div className="text-xs md:text-sm text-muted-foreground space-y-2">
        <div className="p-2 rounded-lg bg-muted/50">
          <h4 className="font-medium mb-1">Beat Emphasis Pattern:</h4>
          <div className="flex items-center gap-1 flex-wrap">
            {selectedSignature.beats.map((beat, index) => (
              <span key={index} className={index === 0 ? 'font-bold text-primary' : ''}>
                {index === 0 ? 'STRONG' : index % 2 === 0 ? 'medium' : 'weak'}
                {index < selectedSignature.beats.length - 1 ? ' - ' : ''}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};