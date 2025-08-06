import React, { useEffect, useState } from 'react';

interface Note {
  note: string;
  time: number;
  duration?: number;
}

interface SolfegeAnnotationsProps {
  notes: Note[];
  keySignature: string;
  className?: string;
}

const SOLFEGE_MAPPING = {
  'C': 'Do', 'C#': 'Di', 'D': 'Re', 'D#': 'Ri', 'E': 'Mi',
  'F': 'Fa', 'F#': 'Fi', 'G': 'Sol', 'G#': 'Si', 'A': 'La',
  'A#': 'Li', 'B': 'Ti'
};

const SOLFEGE_COLORS = {
  'Do': 'text-red-600 bg-red-100',
  'Di': 'text-red-500 bg-red-50',
  'Re': 'text-orange-600 bg-orange-100',
  'Ri': 'text-orange-500 bg-orange-50',
  'Mi': 'text-yellow-600 bg-yellow-100',
  'Fa': 'text-green-600 bg-green-100',
  'Fi': 'text-green-500 bg-green-50',
  'Sol': 'text-blue-600 bg-blue-100',
  'Si': 'text-blue-500 bg-blue-50',
  'La': 'text-purple-600 bg-purple-100',
  'Li': 'text-purple-500 bg-purple-50',
  'Ti': 'text-pink-600 bg-pink-100'
};

export const SolfegeAnnotations: React.FC<SolfegeAnnotationsProps> = ({
  notes,
  keySignature,
  className = ""
}) => {
  const [notePositions, setNotePositions] = useState<Array<{x: number, y: number, solfege: string}>>([]);

  const getSolfegeForNote = (noteName: string): string => {
    // Extract just the note letter (C, D, E, etc.) from the full note name
    const noteBase = noteName.replace(/\d+/, '');
    
    // Get the tonic based on key signature
    let tonic = 'C';
    if (keySignature.includes('♯') || keySignature.includes('#')) {
      // Sharp keys: G, D, A, E, B, F#, C#
      const sharpKeys = ['G', 'D', 'A', 'E', 'B', 'F#', 'C#'];
      const keyLetter = keySignature.replace(/[♯#\s]/g, '');
      if (sharpKeys.includes(keyLetter)) {
        tonic = keyLetter;
      }
    } else if (keySignature.includes('♭') || keySignature.includes('b')) {
      // Flat keys: F, Bb, Eb, Ab, Db, Gb, Cb
      const flatKeys = {'F': 'F', 'B♭': 'Bb', 'E♭': 'Eb', 'A♭': 'Ab', 'D♭': 'Db', 'G♭': 'Gb', 'C♭': 'Cb'};
      const keyMatch = Object.keys(flatKeys).find(key => keySignature.includes(key));
      if (keyMatch) {
        tonic = flatKeys[keyMatch as keyof typeof flatKeys];
      }
    }
    
    // Calculate scale degree relative to tonic
    const chromatic = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const tonicIndex = chromatic.indexOf(tonic);
    const noteIndex = chromatic.indexOf(noteBase);
    
    if (tonicIndex === -1 || noteIndex === -1) {
      return SOLFEGE_MAPPING[noteBase as keyof typeof SOLFEGE_MAPPING] || '?';
    }
    
    // Calculate the interval from tonic
    let interval = (noteIndex - tonicIndex + 12) % 12;
    
    // Map intervals to solfège
    const intervalToSolfege = ['Do', 'Di', 'Re', 'Ri', 'Mi', 'Fa', 'Fi', 'Sol', 'Si', 'La', 'Li', 'Ti'];
    return intervalToSolfege[interval] || '?';
  };

  useEffect(() => {
    // Wait for the music to be rendered, then find note positions
    const timer = setTimeout(() => {
      const container = document.querySelector('.sheet-music-container');
      if (!container) return;

      // Look for SVG elements that represent notes
      const svgElements = container.querySelectorAll('svg');
      const positions: Array<{x: number, y: number, solfege: string}> = [];

      svgElements.forEach((svg) => {
        // Find note head elements (usually circles or ellipses in music notation SVGs)
        const noteHeads = svg.querySelectorAll('ellipse, circle, path[d*="M"]');
        
        noteHeads.forEach((noteHead, index) => {
          if (index < notes.length) {
            const rect = noteHead.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            
            // Calculate position relative to container
            const x = rect.left - containerRect.left + rect.width / 2;
            const y = rect.top - containerRect.top - 20; // Position above the note
            
            const solfege = getSolfegeForNote(notes[index].note);
            
            positions.push({ x, y, solfege });
          }
        });
      });

      setNotePositions(positions);
    }, 500); // Give time for music to render

    return () => clearTimeout(timer);
  }, [notes, keySignature]);

  return (
    <div className={className}>
      {notePositions.map((pos, index) => (
        <div
          key={index}
          className={`absolute text-xs font-bold rounded px-1 py-0.5 border shadow-sm ${
            SOLFEGE_COLORS[pos.solfege as keyof typeof SOLFEGE_COLORS] || 'text-gray-600 bg-gray-100'
          }`}
          style={{
            left: pos.x - 15, // Center the label
            top: pos.y,
            transform: 'translateX(-50%)',
            zIndex: 10
          }}
        >
          {pos.solfege}
        </div>
      ))}
    </div>
  );
};