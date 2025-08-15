import { useState } from 'react';
import { ScoreJSON } from '../SightSingingStudio';

export interface GradingResults {
  pitchAcc: number;
  rhythmAcc: number;
  restAcc: number;
  overall: number;
  letter: string;
  perNote: Array<{
    i: number;
    onsetErrMs: number;
    durErrPct: number;
    pitchErrCents: number;
    ok: boolean;
  }>;
  debug: {
    onsets: number[];
    f0: number[];
  };
}

export const useGrading = () => {
  const [gradingResults, setGradingResults] = useState<GradingResults | null>(null);
  const [isGrading, setIsGrading] = useState(false);

  const gradeRecording = async (audioBlob: Blob, jsonScore: ScoreJSON, bpm: number): Promise<GradingResults> => {
    setIsGrading(true);
    
    try {
      // Mock grading with realistic per-note data
      const numNotes = 8; // Simulating 8 notes in the exercise
      const perNote = Array.from({ length: numNotes }, (_, i) => ({
        i,
        onsetErrMs: (Math.random() - 0.5) * 200, // ±100ms error
        durErrPct: (Math.random() - 0.5) * 60, // ±30% duration error
        pitchErrCents: (Math.random() - 0.5) * 200, // ±100 cents error
        ok: Math.random() > 0.3 // 70% chance of being "ok"
      }));
      
      const mockResults: GradingResults = {
        pitchAcc: 0.85,
        rhythmAcc: 0.78,
        restAcc: 0.92,
        overall: 0.83,
        letter: 'B',
        perNote,
        debug: { 
          onsets: Array.from({ length: numNotes }, (_, i) => i * 0.5),
          f0: Array.from({ length: numNotes }, () => 220 + Math.random() * 220)
        }
      };
      
      setGradingResults(mockResults);
      return mockResults;
    } finally {
      setIsGrading(false);
    }
  };

  return {
    gradingResults,
    isGrading,
    gradeRecording
  };
};