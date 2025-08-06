import React from 'react';
import { GraduationCap } from 'lucide-react';

interface SolfegeDisplayProps {
  isEnabled: boolean;
  keySignature?: string;
  voiceRange?: 'soprano' | 'alto';
  currentNote?: string;
  className?: string;
}

const SOLFEGE_SYLLABLES = {
  'C': { syllable: 'Do', color: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800' },
  'C#': { syllable: 'Di', color: 'bg-red-200 text-red-900 border-red-300 dark:bg-red-800/20 dark:text-red-200 dark:border-red-700' },
  'D': { syllable: 'Re', color: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800' },
  'D#': { syllable: 'Ri', color: 'bg-orange-200 text-orange-900 border-orange-300 dark:bg-orange-800/20 dark:text-orange-200 dark:border-orange-700' },
  'E': { syllable: 'Mi', color: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800' },
  'F': { syllable: 'Fa', color: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800' },
  'F#': { syllable: 'Fi', color: 'bg-green-200 text-green-900 border-green-300 dark:bg-green-800/20 dark:text-green-200 dark:border-green-700' },
  'G': { syllable: 'Sol', color: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800' },
  'G#': { syllable: 'Si', color: 'bg-blue-200 text-blue-900 border-blue-300 dark:bg-blue-800/20 dark:text-blue-200 dark:border-blue-700' },
  'A': { syllable: 'La', color: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800' },
  'A#': { syllable: 'Li', color: 'bg-purple-200 text-purple-900 border-purple-300 dark:bg-purple-800/20 dark:text-purple-200 dark:border-purple-700' },
  'B': { syllable: 'Ti', color: 'bg-pink-100 text-pink-800 border-pink-200 dark:bg-pink-900/20 dark:text-pink-300 dark:border-pink-800' },
};

export const SolfegeDisplay: React.FC<SolfegeDisplayProps> = ({
  isEnabled,
  keySignature = 'C',
  voiceRange = 'soprano',
  currentNote,
  className = ''
}) => {
  const getScaleNotes = () => {
    if (voiceRange === 'soprano') {
      return [
        { note: 'C4', letter: 'C' },
        { note: 'D4', letter: 'D' },
        { note: 'E4', letter: 'E' },
        { note: 'F4', letter: 'F' },
        { note: 'G4', letter: 'G' }
      ];
    } else {
      return [
        { note: 'G3', letter: 'G' },
        { note: 'A3', letter: 'A' },
        { note: 'B3', letter: 'B' },
        { note: 'C4', letter: 'C' },
        { note: 'D4', letter: 'D' }
      ];
    }
  };

  const getSolfegeInfo = (letter: string) => {
    return SOLFEGE_SYLLABLES[letter as keyof typeof SOLFEGE_SYLLABLES] || 
           { syllable: '?', color: 'bg-gray-100 text-gray-800 border-gray-200' };
  };

  if (!isEnabled) {
    return (
      <div className={`p-4 bg-muted/30 rounded-lg border-2 border-dashed ${className}`}>
        <div className="text-center text-muted-foreground">
          <GraduationCap className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Solfège is disabled</p>
        </div>
      </div>
    );
  }

  const scaleNotes = getScaleNotes();

  return (
    <div className={`bg-background border-2 border-border rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-3 bg-muted/30 border-b border-border">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-4 w-4" />
          <span className="text-sm font-medium">Solfège Syllables ({voiceRange})</span>
          {currentNote && (
            <span className="ml-auto text-xs px-2 py-1 bg-primary/20 border border-primary/40 rounded">
              Current: {currentNote}
            </span>
          )}
        </div>
      </div>

      {/* Solfège Scale */}
      <div className="p-4">
        <div className="grid grid-cols-5 gap-3">
          {scaleNotes.map(({ note, letter }, index) => {
            const solfegeInfo = getSolfegeInfo(letter);
            const isActive = currentNote === note;
            
            return (
              <div 
                key={note}
                className={`
                  relative p-3 rounded-lg border-2 text-center transition-all duration-200
                  ${isActive 
                    ? 'ring-2 ring-primary ring-offset-2 scale-105 shadow-lg' 
                    : 'hover:scale-105'
                  }
                  ${solfegeInfo.color}
                `}
              >
                <div className="space-y-1">
                  <div className="text-lg font-bold">
                    {solfegeInfo.syllable}
                  </div>
                  <div className="text-xs font-medium opacity-80">
                    {note}
                  </div>
                  <div className="text-xs opacity-60">
                    Scale degree {index + 1}
                  </div>
                </div>
                
                {isActive && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full animate-pulse" />
                )}
              </div>
            );
          })}
        </div>

        {/* Solfège Information */}
        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
          <h4 className="text-sm font-medium mb-2">Solfège Guide:</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="space-y-1">
              <div><strong>Do (1st):</strong> Tonic - Home base</div>
              <div><strong>Re (2nd):</strong> Supertonic</div>
              <div><strong>Mi (3rd):</strong> Mediant</div>
            </div>
            <div className="space-y-1">
              <div><strong>Fa (4th):</strong> Subdominant</div>
              <div><strong>Sol (5th):</strong> Dominant</div>
              <div className="text-muted-foreground mt-2">
                Use these syllables to internalize pitch relationships
              </div>
            </div>
          </div>
        </div>

        {/* Practice Tips */}
        <div className="mt-3 text-xs text-muted-foreground text-center bg-primary/5 p-2 rounded">
          💡 <strong>Tip:</strong> Sing along with the syllables to develop relative pitch recognition
        </div>
      </div>
    </div>
  );
};