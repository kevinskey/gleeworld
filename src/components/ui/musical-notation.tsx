import React from 'react';

export const MUSICAL_SYMBOLS = {
  // Note values
  wholeNote: '𝅝',
  halfNote: '𝅗𝅥',
  quarterNote: '𝅘𝅥',
  eighthNote: '𝅘𝅥𝅮',
  sixteenthNote: '𝅘𝅥𝅯',
  
  // Rests
  wholeRest: '𝄻',
  halfRest: '𝄼',
  quarterRest: '𝄽',
  eighthRest: '𝄾',
  sixteenthRest: '𝄿',
  
  // Clefs
  trebleClef: '𝄞',
  bassClef: '𝄢',
  altoClef: '𝄡',
  
  // Accidentals
  sharp: '♯',
  flat: '♭',
  natural: '♮',
  doubleSharp: '𝄪',
  doubleFlat: '𝄫',
  
  // Time signatures
  commonTime: '𝄴',
  cutTime: '𝄵',
  
  // Dynamics
  forte: '𝑓',
  piano: '𝑝',
  mezzo: '𝑚',
  
  // Articulations
  staccato: '.',
  accent: '>',
  tenuto: '‒',
  
  // Key signature sharps (order of sharps)
  keySignatureOrder: ['F♯', 'C♯', 'G♯', 'D♯', 'A♯', 'E♯', 'B♯'],
  keySignatureFlatOrder: ['B♭', 'E♭', 'A♭', 'D♭', 'G♭', 'C♭', 'F♭']
};

// Helper functions for backward compatibility
export const getNoteSymbol = (noteType: string) => {
  const symbolMap: Record<string, string> = {
    'whole': MUSICAL_SYMBOLS.wholeNote,
    'half': MUSICAL_SYMBOLS.halfNote,
    'quarter': MUSICAL_SYMBOLS.quarterNote,
    'eighth': MUSICAL_SYMBOLS.eighthNote,
    'sixteenth': MUSICAL_SYMBOLS.sixteenthNote
  };
  return symbolMap[noteType] || MUSICAL_SYMBOLS.quarterNote;
};

export const getRestSymbol = (restType: string) => {
  const symbolMap: Record<string, string> = {
    'whole': MUSICAL_SYMBOLS.wholeRest,
    'half': MUSICAL_SYMBOLS.halfRest,
    'quarter': MUSICAL_SYMBOLS.quarterRest,
    'eighth': MUSICAL_SYMBOLS.eighthRest,
    'sixteenth': MUSICAL_SYMBOLS.sixteenthRest
  };
  return symbolMap[restType] || MUSICAL_SYMBOLS.quarterRest;
};

export const KEY_SIGNATURES = {
  'C major': '',
  'G major': '♯',
  'D major': '♯♯',
  'A major': '♯♯♯',
  'E major': '♯♯♯♯',
  'B major': '♯♯♯♯♯',
  'F♯ major': '♯♯♯♯♯♯',
  'C♯ major': '♯♯♯♯♯♯♯',
  
  'F major': '♭',
  'B♭ major': '♭♭',
  'E♭ major': '♭♭♭',
  'A♭ major': '♭♭♭♭',
  'D♭ major': '♭♭♭♭♭',
  'G♭ major': '♭♭♭♭♭♭',
  'C♭ major': '♭♭♭♭♭♭♭'
};

export const SCALE_PATTERNS = {
  major: [2, 2, 1, 2, 2, 2, 1], // Whole, Whole, Half, Whole, Whole, Whole, Half
  naturalMinor: [2, 1, 2, 2, 1, 2, 2], // W, H, W, W, H, W, W
  harmonicMinor: [2, 1, 2, 2, 1, 3, 1], // W, H, W, W, H, W+H, H
  melodicMinor: [2, 1, 2, 2, 2, 2, 1] // W, H, W, W, W, W, H (ascending)
};

export const CHORD_QUALITIES = {
  major: [4, 3], // Major 3rd + minor 3rd
  minor: [3, 4], // Minor 3rd + major 3rd
  diminished: [3, 3], // Minor 3rd + minor 3rd
  augmented: [4, 4] // Major 3rd + major 3rd
};

interface MusicalNotationProps {
  type?: 'staff' | 'note' | 'rhythm' | 'key-signature' | 'chord';
  clef?: 'treble' | 'bass' | 'alto';
  timeSignature?: string;
  keySignature?: string;
  notes?: string[];
  rhythmPattern?: string[];
  symbol?: string;
  className?: string;
}

export const MusicalNotation: React.FC<MusicalNotationProps> = ({
  type = 'note',
  clef = 'treble',
  timeSignature,
  keySignature,
  notes = [],
  rhythmPattern = [],
  symbol,
  className = ''
}) => {
  // If symbol prop is provided, render it directly (for backward compatibility)
  if (symbol) {
    return <span className={`musical-symbol ${className}`}>{symbol}</span>;
  }
  const getClefSymbol = () => {
    switch (clef) {
      case 'treble': return MUSICAL_SYMBOLS.trebleClef;
      case 'bass': return MUSICAL_SYMBOLS.bassClef;
      case 'alto': return MUSICAL_SYMBOLS.altoClef;
      default: return MUSICAL_SYMBOLS.trebleClef;
    }
  };

  const renderStaff = () => (
    <div className={`musical-staff ${className}`}>
      <div className="staff-lines">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="staff-line" />
        ))}
      </div>
      <div className="staff-content">
        <span className="clef-symbol text-4xl">{getClefSymbol()}</span>
        {keySignature && (
          <span className="key-signature text-2xl ml-2">
            {KEY_SIGNATURES[keySignature as keyof typeof KEY_SIGNATURES]}
          </span>
        )}
        {timeSignature && (
          <span className="time-signature text-2xl ml-2">{timeSignature}</span>
        )}
        <div className="notes-container ml-4">
          {notes.map((note, index) => (
            <span key={index} className="note text-3xl ml-1">{note}</span>
          ))}
        </div>
      </div>
    </div>
  );

  const renderRhythm = () => (
    <div className={`rhythm-notation ${className}`}>
      {rhythmPattern.map((symbol, index) => (
        <span key={index} className="rhythm-symbol text-4xl mr-2">
          {MUSICAL_SYMBOLS[symbol as keyof typeof MUSICAL_SYMBOLS] || symbol}
        </span>
      ))}
    </div>
  );

  const renderKeySignature = () => (
    <div className={`key-signature-display ${className}`}>
      <span className="clef text-4xl">{getClefSymbol()}</span>
      <span className="signature text-3xl ml-2">
        {keySignature && KEY_SIGNATURES[keySignature as keyof typeof KEY_SIGNATURES]}
      </span>
    </div>
  );

  switch (type) {
    case 'staff':
      return renderStaff();
    case 'rhythm':
      return renderRhythm();
    case 'key-signature':
      return renderKeySignature();
    default:
      return (
        <div className={`musical-notation ${className}`}>
          {notes.join(' ')}
        </div>
      );
  }
};

// CSS styles for musical notation
export const musicalNotationStyles = `
.musical-staff {
  position: relative;
  width: 100%;
  height: 120px;
  margin: 20px 0;
}

.staff-lines {
  position: absolute;
  width: 100%;
  height: 80px;
  top: 20px;
}

.staff-line {
  position: absolute;
  width: 100%;
  height: 1px;
  background-color: #333;
  left: 0;
}

.staff-line:nth-child(1) { top: 0; }
.staff-line:nth-child(2) { top: 20px; }
.staff-line:nth-child(3) { top: 40px; }
.staff-line:nth-child(4) { top: 60px; }
.staff-line:nth-child(5) { top: 80px; }

.staff-content {
  position: absolute;
  top: 0;
  left: 10px;
  display: flex;
  align-items: center;
  height: 120px;
  z-index: 10;
}

.rhythm-notation {
  display: flex;
  align-items: center;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  margin: 10px 0;
}

.key-signature-display {
  display: flex;
  align-items: center;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  margin: 10px 0;
}
`;