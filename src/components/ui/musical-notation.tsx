import React from 'react';
import { cn } from '@/lib/utils';

interface MusicalNotationProps {
  symbol: string;
  className?: string;
}

// SMuFL Unicode codepoints for musical symbols
export const MUSICAL_SYMBOLS = {
  // Note values
  wholeNote: '\uE1D2',      // U+E1D2 - Whole note (semibreve)
  halfNote: '\uE1D3',       // U+E1D3 - Half note (minim) stem up
  quarterNote: '\uE1D5',    // U+E1D5 - Quarter note (crotchet) stem up
  eighthNote: '\uE1D7',     // U+E1D7 - Eighth note (quaver) stem up
  sixteenthNote: '\uE1D9',  // U+E1D9 - Sixteenth note (semiquaver) stem up
  thirtySecondNote: '\uE1DB', // U+E1DB - Thirty-second note (demisemiquaver) stem up
  
  // Rest values
  wholeRest: '\uE4E3',      // U+E4E3 - Whole (semibreve) rest
  halfRest: '\uE4E4',       // U+E4E4 - Half (minim) rest
  quarterRest: '\uE4E5',    // U+E4E5 - Quarter (crotchet) rest
  eighthRest: '\uE4E6',     // U+E4E6 - Eighth (quaver) rest
  sixteenthRest: '\uE4E7',  // U+E4E7 - Sixteenth (semiquaver) rest
  thirtySecondRest: '\uE4E8', // U+E4E8 - Thirty-second (demisemiquaver) rest
} as const;

export const MusicalNotation: React.FC<MusicalNotationProps> = ({ 
  symbol, 
  className 
}) => {
  return (
    <span 
      className={cn(
        "font-bravura text-base leading-none select-none",
        className
      )}
      style={{ fontFamily: 'Bravura, serif' }}
    >
      {symbol}
    </span>
  );
};

// Helper functions to get symbols by duration
export const getNoteSymbol = (duration: string): string => {
  switch (duration) {
    case 'whole': return MUSICAL_SYMBOLS.wholeNote;
    case 'half': return MUSICAL_SYMBOLS.halfNote;
    case 'quarter': return MUSICAL_SYMBOLS.quarterNote;
    case 'eighth': return MUSICAL_SYMBOLS.eighthNote;
    case '16th': return MUSICAL_SYMBOLS.sixteenthNote;
    case '32nd': return MUSICAL_SYMBOLS.thirtySecondNote;
    default: return MUSICAL_SYMBOLS.quarterNote;
  }
};

export const getRestSymbol = (duration: string): string => {
  switch (duration) {
    case 'whole': return MUSICAL_SYMBOLS.wholeRest;
    case 'half': return MUSICAL_SYMBOLS.halfRest;
    case 'quarter': return MUSICAL_SYMBOLS.quarterRest;
    case 'eighth': return MUSICAL_SYMBOLS.eighthRest;
    case '16th': return MUSICAL_SYMBOLS.sixteenthRest;
    case '32nd': return MUSICAL_SYMBOLS.thirtySecondRest;
    default: return MUSICAL_SYMBOLS.quarterRest;
  }
};