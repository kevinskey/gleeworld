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
  
  // Rest values using simple text symbols that work everywhere
  wholeRest: '■',         // Solid block for whole rest
  halfRest: '■',          // Solid block for half rest  
  quarterRest: '𝄽',       // Try quarter rest, fallback to text
  eighthRest: '𝄾',        // Try eighth rest, fallback to text
  sixteenthRest: '≋',     // Wave symbol for sixteenth rest
  thirtySecondRest: '≈',  // Approx symbol for thirty-second rest
} as const;

export const MusicalNotation: React.FC<MusicalNotationProps> = ({ 
  symbol, 
  className 
}) => {
  return (
    <span 
      className={cn(
        "text-xs leading-none select-none font-bold text-center block",
        className
      )}
      style={{ 
        fontFamily: 'system-ui, -apple-system, "Segoe UI", monospace',
        fontSize: symbol.length > 2 ? '0.7em' : '1.1em',
        minWidth: '1.5em'
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
    case 'whole': return 'WR';     // Text abbreviation
    case 'half': return 'HR';      // Text abbreviation
    case 'quarter': return 'QR';   // Text abbreviation
    case 'eighth': return '8R';    // Text abbreviation
    case '16th': return '16R';     // Text abbreviation
    case '32nd': return '32R';     // Text abbreviation
    default: return 'QR';
  }
};