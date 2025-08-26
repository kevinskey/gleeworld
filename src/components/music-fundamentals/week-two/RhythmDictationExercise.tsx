import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Play, Pause, RotateCcw, Volume2, Check, X, SkipForward } from 'lucide-react';

interface RhythmPattern {
  id: string;
  difficulty: 'easy' | 'medium' | 'hard';
  timeSignature: string;
  pattern: string[];
  description: string;
  correctAnswer: string[];
}

const rhythmPatterns: RhythmPattern[] = [
  {
    id: '1',
    difficulty: 'easy',
    timeSignature: '4/4',
    pattern: ['quarter', 'quarter', 'half'],
    description: 'Simple quarter and half notes',
    correctAnswer: ['♩', '♩', '♪']
  },
  {
    id: '2',
    difficulty: 'easy',
    timeSignature: '4/4',
    pattern: ['quarter', 'eighth', 'eighth', 'quarter', 'quarter'],
    description: 'Mixed quarters and eighths',
    correctAnswer: ['♩', '♫', '♫', '♩', '♩']
  },
  {
    id: '3',
    difficulty: 'medium',
    timeSignature: '3/4',
    pattern: ['quarter', 'quarter', 'quarter'],
    description: 'Triple meter pattern',
    correctAnswer: ['♩', '♩', '♩']
  },
  {
    id: '4',
    difficulty: 'medium',
    timeSignature: '4/4',
    pattern: ['eighth', 'eighth', 'quarter', 'eighth', 'eighth', 'quarter'],
    description: 'Syncopated pattern',
    correctAnswer: ['♫', '♫', '♩', '♫', '♫', '♩']
  },
  {
    id: '5',
    difficulty: 'hard',
    timeSignature: '6/8',
    pattern: ['dotted-quarter', 'dotted-quarter'],
    description: 'Compound meter',
    correctAnswer: ['♩.', '♩.']
  }
];

const noteOptions = [
  { symbol: '♩', name: 'Quarter Note', value: 'quarter' },
  { symbol: '♫', name: 'Eighth Note', value: 'eighth' },
  { symbol: '♪', name: 'Half Note', value: 'half' },
  { symbol: '♩.', name: 'Dotted Quarter', value: 'dotted-quarter' },
  { symbol: '𝄽', name: 'Quarter Rest', value: 'quarter-rest' },
  { symbol: '𝄾', name: 'Eighth Rest', value: 'eighth-rest' }
];

export const RhythmDictationExercise: React.FC = () => {
  const [currentExercise, setCurrentExercise] = useState(0);
  const [userAnswer, setUserAnswer] = useState<string[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const currentPattern = rhythmPatterns[currentExercise];
  const progress = ((currentExercise + 1) / rhythmPatterns.length) * 100;

  const playPattern = () => {
    setIsPlaying(true);
    // Simulate audio playback
    const duration = currentPattern.pattern.length * 600; // 600ms per beat
    
    setTimeout(() => {
      setIsPlaying(false);
    }, duration);
  };

  const addNote = (noteSymbol: string) => {
    if (userAnswer.length < 8) { // Max 8 notes per pattern
      setUserAnswer([...userAnswer, noteSymbol]);
    }
  };

  const removeLastNote = () => {
    setUserAnswer(userAnswer.slice(0, -1));
  };

  const clearAnswer = () => {
    setUserAnswer([]);
    setShowResult(false);
  };

  const checkAnswer = () => {
    setAttempts(attempts + 1);
    const isCorrect = JSON.stringify(userAnswer) === JSON.stringify(currentPattern.correctAnswer);
    
    if (isCorrect) {
      setScore(score + 1);
    }
    
    setShowResult(true);
  };

  const nextExercise = () => {
    if (currentExercise < rhythmPatterns.length - 1) {
      setCurrentExercise(currentExercise + 1);
      clearAnswer();
    } else {
      // Exercise complete
      alert(`Exercise complete! Score: ${score}/${rhythmPatterns.length}`);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'hard': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const isCorrect = JSON.stringify(userAnswer) === JSON.stringify(currentPattern.correctAnswer);

  return (
    <div className="space-y-3">
      {/* Progress and Score */}
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              Exercise {currentExercise + 1}/{rhythmPatterns.length}
            </Badge>
            <Badge 
              variant="secondary" 
              className={`text-xs ${getDifficultyColor(currentPattern.difficulty)} text-white`}
            >
              {currentPattern.difficulty}
            </Badge>
          </div>
          <Progress value={progress} className="w-32 md:w-48 h-2" />
        </div>
        <div className="text-right">
          <div className="text-sm font-medium">Score: {score}/{attempts}</div>
          <div className="text-xs text-muted-foreground">
            {attempts > 0 ? `${Math.round((score/attempts) * 100)}%` : '0%'}
          </div>
        </div>
      </div>

      {/* Exercise Info */}
      <Card className="bg-primary/5">
        <CardHeader className="card-header-compact">
          <CardTitle className="flex items-center justify-between text-sm md:text-base">
            <span>Time Signature: {currentPattern.timeSignature}</span>
            <Button
              onClick={playPattern}
              disabled={isPlaying}
              className="touch-target"
              size="sm"
            >
              {isPlaying ? (
                <Pause className="h-3 w-3 md:h-4 md:w-4 mr-1" />
              ) : (
                <Play className="h-3 w-3 md:h-4 md:w-4 mr-1" />
              )}
              {isPlaying ? 'Playing...' : 'Play Pattern'}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs md:text-sm text-muted-foreground">
            {currentPattern.description}
          </p>
          
          {/* User's Answer */}
          <div className="p-3 rounded-lg border-2 border-dashed border-border min-h-[3rem] flex items-center">
            <div className="text-xs md:text-sm text-muted-foreground mr-2">Your answer:</div>
            <div className="flex flex-wrap items-center gap-1">
              {userAnswer.length === 0 ? (
                <span className="text-muted-foreground text-xs md:text-sm italic">Click notes below to build your rhythm...</span>
              ) : (
                userAnswer.map((note, index) => (
                  <span key={index} className="text-lg md:text-xl bg-background border rounded px-1">
                    {note}
                  </span>
                ))
              )}
            </div>
          </div>

          {/* Note Input Grid */}
          <div className="grid grid-cols-3 md:grid-cols-6 gap-1 md:gap-2">
            {noteOptions.map((note) => (
              <Button
                key={note.value}
                variant="outline"
                className="h-12 md:h-16 flex flex-col justify-center touch-target"
                onClick={() => addNote(note.symbol)}
                disabled={userAnswer.length >= 8}
              >
                <div className="text-lg md:text-xl">{note.symbol}</div>
                <div className="text-xs">{note.name.split(' ')[0]}</div>
              </Button>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={removeLastNote}
              variant="outline"
              className="touch-target"
              disabled={userAnswer.length === 0}
              size="sm"
            >
              <X className="h-4 w-4 mr-1" />
              Remove Last
            </Button>
            <Button
              onClick={clearAnswer}
              variant="outline"
              className="touch-target"
              disabled={userAnswer.length === 0}
              size="sm"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Clear
            </Button>
            <Button
              onClick={checkAnswer}
              className="touch-target"
              disabled={userAnswer.length === 0 || showResult}
              size="sm"
            >
              <Check className="h-4 w-4 mr-1" />
              Check Answer
            </Button>
          </div>

          {/* Result Display */}
          {showResult && (
            <div className={`p-3 rounded-lg border-2 ${isCorrect ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isCorrect ? (
                    <Check className="h-5 w-5 text-green-600" />
                  ) : (
                    <X className="h-5 w-5 text-red-600" />
                  )}
                  <span className={`font-medium ${isCorrect ? 'text-green-800' : 'text-red-800'}`}>
                    {isCorrect ? 'Correct!' : 'Incorrect'}
                  </span>
                </div>
                <Button onClick={nextExercise} className="touch-target" size="sm">
                  <SkipForward className="h-4 w-4 mr-1" />
                  Next
                </Button>
              </div>
              
              {!isCorrect && (
                <div className="mt-2 text-sm">
                  <div className="text-muted-foreground">Correct answer:</div>
                  <div className="flex items-center gap-1 mt-1">
                    {currentPattern.correctAnswer.map((note, index) => (
                      <span key={index} className="text-lg bg-white border rounded px-1">
                        {note}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};