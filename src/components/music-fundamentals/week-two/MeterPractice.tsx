import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Play, Pause, RotateCcw, Music, HandMetal } from 'lucide-react';

interface ConductingPattern {
  id: string;
  timeSignature: string;
  beats: number;
  name: string;
  description: string;
  pattern: Array<{
    beat: number;
    direction: string;
    position: { x: number; y: number };
  }>;
}

const conductingPatterns: ConductingPattern[] = [
  {
    id: 'duple',
    timeSignature: '2/4',
    beats: 2,
    name: 'Duple Meter',
    description: 'Down-Up pattern',
    pattern: [
      { beat: 1, direction: 'Down', position: { x: 50, y: 80 } },
      { beat: 2, direction: 'Up', position: { x: 50, y: 20 } }
    ]
  },
  {
    id: 'triple',
    timeSignature: '3/4',
    beats: 3,
    name: 'Triple Meter',
    description: 'Down-Right-Up pattern',
    pattern: [
      { beat: 1, direction: 'Down', position: { x: 50, y: 80 } },
      { beat: 2, direction: 'Right', position: { x: 80, y: 60 } },
      { beat: 3, direction: 'Up', position: { x: 50, y: 20 } }
    ]
  },
  {
    id: 'quadruple',
    timeSignature: '4/4',
    beats: 4,
    name: 'Quadruple Meter',
    description: 'Down-Left-Right-Up pattern',
    pattern: [
      { beat: 1, direction: 'Down', position: { x: 50, y: 80 } },
      { beat: 2, direction: 'Left', position: { x: 20, y: 60 } },
      { beat: 3, direction: 'Right', position: { x: 80, y: 60 } },
      { beat: 4, direction: 'Up', position: { x: 50, y: 20 } }
    ]
  }
];

const meterExercises = [
  { name: 'Simple Duple', timeSignature: '2/4', pattern: 'duple' },
  { name: 'Simple Triple', timeSignature: '3/4', pattern: 'triple' },
  { name: 'Simple Quadruple', timeSignature: '4/4', pattern: 'quadruple' },
  { name: 'Cut Time', timeSignature: '2/2', pattern: 'duple' },
  { name: 'Compound Duple', timeSignature: '6/8', pattern: 'duple' }
];

export const MeterPractice: React.FC = () => {
  const [selectedPattern, setSelectedPattern] = useState<ConductingPattern>(conductingPatterns[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [showConducting, setShowConducting] = useState(false);
  const [exerciseMode, setExerciseMode] = useState(false);
  const [currentExercise, setCurrentExercise] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentBeat(prev => (prev + 1) % selectedPattern.beats);
      }, 800); // 75 BPM
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, selectedPattern.beats]);

  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
    if (!isPlaying) {
      setCurrentBeat(0);
    }
  };

  const resetPattern = () => {
    setIsPlaying(false);
    setCurrentBeat(0);
  };

  const getCurrentBeatPosition = () => {
    if (currentBeat < selectedPattern.pattern.length) {
      return selectedPattern.pattern[currentBeat].position;
    }
    return { x: 50, y: 50 };
  };

  return (
    <div className="space-y-3">
      {/* Mode Selection */}
      <div className="flex gap-2">
        <Button
          variant={!exerciseMode ? "default" : "outline"}
          onClick={() => setExerciseMode(false)}
          className="touch-target"
          size="sm"
        >
          <Music className="h-4 w-4 mr-1" />
          Learn Patterns
        </Button>
        <Button
          variant={exerciseMode ? "default" : "outline"}
          onClick={() => setExerciseMode(true)}
          className="touch-target"
          size="sm"
        >
          <HandMetal className="h-4 w-4 mr-1" />
          Practice Mode
        </Button>
      </div>

      {!exerciseMode ? (
        <>
          {/* Pattern Selector */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {conductingPatterns.map((pattern) => (
              <Button
                key={pattern.id}
                variant={selectedPattern.id === pattern.id ? "default" : "outline"}
                className="h-auto p-3 flex flex-col justify-center touch-target"
                onClick={() => {
                  setSelectedPattern(pattern);
                  resetPattern();
                }}
              >
                <div className="text-lg font-mono">{pattern.timeSignature}</div>
                <div className="text-xs">{pattern.name}</div>
              </Button>
            ))}
          </div>

          {/* Pattern Visualization */}
          <Card className="bg-primary/5">
            <CardHeader className="card-header-compact">
              <CardTitle className="flex items-center justify-between text-sm md:text-base">
                <span>{selectedPattern.name} - {selectedPattern.timeSignature}</span>
                <Badge variant="outline" className="text-xs">
                  {selectedPattern.beats} beats
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs md:text-sm text-muted-foreground">
                {selectedPattern.description}
              </p>

              {/* Conducting Visualization */}
              <div className="relative bg-background border rounded-lg h-48 md:h-64 overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
                  Conducting Pattern
                </div>
                
                {/* Beat Path */}
                <svg className="absolute inset-0 w-full h-full">
                  {selectedPattern.pattern.map((beat, index) => {
                    const nextBeat = selectedPattern.pattern[(index + 1) % selectedPattern.pattern.length];
                    return (
                      <line
                        key={index}
                        x1={`${beat.position.x}%`}
                        y1={`${beat.position.y}%`}
                        x2={`${nextBeat.position.x}%`}
                        y2={`${nextBeat.position.y}%`}
                        stroke="hsl(var(--primary))"
                        strokeWidth="2"
                        strokeOpacity="0.3"
                        strokeDasharray="5,5"
                      />
                    );
                  })}
                </svg>

                {/* Beat Points */}
                {selectedPattern.pattern.map((beat, index) => (
                  <div
                    key={index}
                    className={`
                      absolute w-6 h-6 md:w-8 md:h-8 rounded-full border-2 flex items-center justify-center text-xs font-mono
                      transition-all duration-300 transform -translate-x-1/2 -translate-y-1/2
                      ${currentBeat === index && isPlaying
                        ? 'bg-primary text-primary-foreground border-primary scale-150 z-10'
                        : 'bg-background border-primary text-primary'
                      }
                    `}
                    style={{
                      left: `${beat.position.x}%`,
                      top: `${beat.position.y}%`
                    }}
                  >
                    {beat.beat}
                  </div>
                ))}

                {/* Current Conducting Baton */}
                {isPlaying && (
                  <div
                    className="absolute w-2 h-2 bg-primary rounded-full transition-all duration-300 transform -translate-x-1/2 -translate-y-1/2 z-20"
                    style={{
                      left: `${getCurrentBeatPosition().x}%`,
                      top: `${getCurrentBeatPosition().y}%`
                    }}
                  />
                )}
              </div>

              {/* Beat Labels */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {selectedPattern.pattern.map((beat, index) => (
                  <div
                    key={index}
                    className={`
                      p-2 rounded-lg border text-center transition-all duration-200
                      ${currentBeat === index && isPlaying
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background border-border'
                      }
                    `}
                  >
                    <div className="font-mono text-sm">Beat {beat.beat}</div>
                    <div className="text-xs text-muted-foreground">{beat.direction}</div>
                  </div>
                ))}
              </div>

              {/* Controls */}
              <div className="flex justify-center gap-2">
                <Button onClick={togglePlayback} className="touch-target" size="sm">
                  {isPlaying ? (
                    <Pause className="h-4 w-4 mr-1" />
                  ) : (
                    <Play className="h-4 w-4 mr-1" />
                  )}
                  {isPlaying ? 'Pause' : 'Play'}
                </Button>
                <Button onClick={resetPattern} variant="outline" className="touch-target" size="sm">
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        /* Practice Mode */
        <Card className="bg-primary/5">
          <CardHeader className="card-header-compact">
            <CardTitle className="flex items-center justify-between text-sm md:text-base">
              <span>Meter Recognition Practice</span>
              <Badge variant="outline" className="text-xs">
                Exercise {currentExercise + 1}/{meterExercises.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-mono mb-2 text-primary">
                {meterExercises[currentExercise].timeSignature}
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                What conducting pattern should you use for this time signature?
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
                {conductingPatterns.map((pattern) => (
                  <Button
                    key={pattern.id}
                    variant="outline"
                    className="h-auto p-3 flex flex-col justify-center touch-target"
                    onClick={() => {
                      // Handle answer selection
                      const correct = pattern.id === meterExercises[currentExercise].pattern;
                      if (correct) {
                        alert('Correct!');
                        setCurrentExercise((prev) => (prev + 1) % meterExercises.length);
                      } else {
                        alert('Try again!');
                      }
                    }}
                  >
                    <div className="text-sm">{pattern.name}</div>
                    <div className="text-xs text-muted-foreground">{pattern.description}</div>
                  </Button>
                ))}
              </div>
              
              <Progress 
                value={((currentExercise + 1) / meterExercises.length) * 100} 
                className="w-full h-2"
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};