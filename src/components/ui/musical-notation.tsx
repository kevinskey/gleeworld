import React from 'react';
import { cn } from '@/lib/utils';

interface MusicalNotationProps {
  symbol: string;
  className?: string;
}

// Fallback Unicode musical symbols that work with common fonts
export const MUSICAL_SYMBOLS = {
  // Note values using common Unicode musical symbols
  wholeNote: '𝅝',        // U+1D15D - Whole note
  halfNote: '𝅗𝅥',        // U+1D157 - Half note
  quarterNote: '♩',       // U+2669 - Quarter note (commonly supported)
  eighthNote: '♪',        // U+266A - Eighth note (commonly supported)
  sixteenthNote: '𝅘𝅥𝅯',    // U+1D15F - Sixteenth note
  thirtySecondNote: '𝅘𝅥𝅰', // U+1D160 - Thirty-second note
  
  // Rest values using common Unicode musical symbols
  wholeRest: '𝄻',        // U+1D13B - Whole rest
  halfRest: '𝄼',         // U+1D13C - Half rest
  quarterRest: '𝄽',      // U+1D13D - Quarter rest
  eighthRest: '𝄾',       // U+1D13E - Eighth rest
  sixteenthRest: '𝄿',    // U+1D13F - Sixteenth rest
  thirtySecondRest: '𝅀', // U+1D140 - Thirty-second rest
} as const;

export const MusicalNotation: React.FC<MusicalNotationProps> = ({ 
  symbol, 
  className 
}) => {
  return (
    <span 
      className={cn(
        "text-base leading-none select-none font-medium",
        className
      )}
      style={{ 
        fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
        fontSize: '1.2em'
      }}
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