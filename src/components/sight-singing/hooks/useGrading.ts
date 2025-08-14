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
      // Mock grading for now - replace with actual audio analysis
      const mockResults: GradingResults = {
        pitchAcc: 0.85,
        rhythmAcc: 0.78,
        restAcc: 0.92,
        overall: 0.83,
        letter: 'B',
        perNote: [],
        debug: { onsets: [], f0: [] }
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