import React, { useRef, useEffect, useState } from 'react';
import { Piano } from 'lucide-react';

interface VirtualPianoProps {
  isEnabled: boolean;
  keySignature?: string;
  voiceRange?: 'soprano' | 'alto';
  className?: string;
}

interface PianoKey {
  note: string;
  frequency: number;
  isBlack: boolean;
  position: number;
}

// Enhanced note frequencies for better audio quality - Extended range
const NOTE_FREQUENCIES = {
  'F3': 174.61, 'F#3': 185.00, 'G3': 196.00, 'G#3': 207.65, 'A3': 220.00,
  'A#3': 233.08, 'B3': 246.94,
  'C4': 261.63, 'C#4': 277.18, 'D4': 293.66, 'D#4': 311.13, 'E4': 329.63,
  'F4': 349.23, 'F#4': 369.99, 'G4': 392.00, 'G#4': 415.30, 'A4': 440.00,
  'A#4': 466.16, 'B4': 493.88,
  'C5': 523.25, 'C#5': 554.37, 'D5': 587.33, 'D#5': 622.25, 'E5': 659.25,
  'F5': 698.46, 'F#5': 739.99, 'G5': 783.99, 'G#5': 830.61, 'A5': 880.00
};

const SOLFEGE_MAPPING = {
  'C': 'Do', 'C#': 'Di', 'D': 'Re', 'D#': 'Ri', 'E': 'Mi',
  'F': 'Fa', 'F#': 'Fi', 'G': 'Sol', 'G#': 'Si', 'A': 'La',
  'A#': 'Li', 'B': 'Ti'
};

export const VirtualPiano: React.FC<VirtualPianoProps> = ({
  isEnabled,
  keySignature = 'C',
  voiceRange = 'soprano',
  className = ''
}) => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set());
  const [showSolfege, setShowSolfege] = useState(false);

  useEffect(() => {
    if (isEnabled) {
      // Initialize Web Audio API
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (error) {
        console.warn('Web Audio API not supported');
      }
    }

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [isEnabled]);

  const playNote = async (frequency: number, duration: number = 0.5) => {
    if (!audioContextRef.current || !isEnabled) return;

    try {
      // Resume audio context if suspended (required for user interaction)
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      const oscillator = audioContextRef.current.createOscillator();
      const gainNode = audioContextRef.current.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);

      // Use a more pleasant waveform for piano-like sound
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(frequency, audioContextRef.current.currentTime);

      // Create envelope for more realistic piano sound
      gainNode.gain.setValueAtTime(0, audioContextRef.current.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, audioContextRef.current.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.1, audioContextRef.current.currentTime + 0.3);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContextRef.current.currentTime + duration);

      oscillator.start(audioContextRef.current.currentTime);
      oscillator.stop(audioContextRef.current.currentTime + duration);
    } catch (error) {
      console.error('Error playing note:', error);
    }
  };

  const playReferenceScale = () => {
    if (!isEnabled) return;

    const scaleNotes = voiceRange === 'soprano' 
      ? ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5']
      : ['F3', 'G3', 'A3', 'B3', 'C4', 'D4', 'E4', 'F4'];

    scaleNotes.forEach((note, index) => {
      setTimeout(() => {
        const frequency = NOTE_FREQUENCIES[note as keyof typeof NOTE_FREQUENCIES];
        if (frequency) {
          playNote(frequency, 0.8);
          
          // Visual feedback
          setActiveKeys(prev => new Set([...prev, note]));
          setTimeout(() => {
            setActiveKeys(prev => {
              const newSet = new Set(prev);
              newSet.delete(note);
              return newSet;
            });
          }, 600);
        }
      }, index * 400);
    });
  };

  const handleKeyPress = (note: string) => {
    if (!isEnabled) return;

    const frequency = NOTE_FREQUENCIES[note as keyof typeof NOTE_FREQUENCIES];
    if (frequency) {
      playNote(frequency);
      
      // Visual feedback
      setActiveKeys(prev => new Set([...prev, note]));
      setTimeout(() => {
        setActiveKeys(prev => {
          const newSet = new Set(prev);
          newSet.delete(note);
          return newSet;
        });
      }, 300);
    }
  };

  const getKeyRange = () => {
    if (voiceRange === 'soprano') {
      return ['C4', 'C#4', 'D4', 'D#4', 'E4', 'F4', 'F#4', 'G4', 'G#4', 'A4', 'A#4', 'B4', 'C5', 'C#5', 'D5', 'D#5', 'E5', 'F5', 'F#5', 'G5', 'G#5', 'A5'];
    } else {
      return ['F3', 'F#3', 'G3', 'G#3', 'A3', 'A#3', 'B3', 'C4', 'C#4', 'D4', 'D#4', 'E4', 'F4', 'F#4', 'G4', 'G#4', 'A4', 'A#4', 'B4', 'C5', 'C#5', 'D5', 'D#5', 'E5', 'F5', 'F#5', 'G5', 'G#5', 'A5'];
    }
  };

  const getSolfegeFor = (note: string) => {
    const noteName = note.replace(/\d+/, '');
    return SOLFEGE_MAPPING[noteName as keyof typeof SOLFEGE_MAPPING] || '';
  };

  const isBlackKey = (note: string) => note.includes('#');

  if (!isEnabled) {
    return (
      <div className={`p-4 bg-muted/30 rounded-lg border-2 border-dashed ${className}`}>
        <div className="text-center text-muted-foreground">
          <Piano className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Piano is disabled</p>
        </div>
      </div>
    );
  }

  const keyRange = getKeyRange();
  const whiteKeys = keyRange.filter(note => !isBlackKey(note));
  const blackKeys = keyRange.filter(note => isBlackKey(note));

  return (
    <div className={`bg-background border-2 border-border rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-3 bg-muted/30 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Piano className="h-4 w-4" />
            <span className="text-sm font-medium">Virtual Piano ({voiceRange})</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowSolfege(!showSolfege)}
              className="text-xs px-2 py-1 bg-primary/10 border border-primary/20 rounded hover:bg-primary/20 transition-colors"
            >
              {showSolfege ? 'Hide' : 'Show'} Solfège
            </button>
            <button
              onClick={playReferenceScale}
              className="text-xs px-3 py-1 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
            >
              Play Scale
            </button>
          </div>
        </div>
      </div>

      {/* Piano Keys */}
      <div className="p-4">
        <div className="relative inline-block">
          {/* White Keys */}
          <div className="flex">
            {whiteKeys.map((note, index) => (
              <button
                key={note}
                onMouseDown={() => handleKeyPress(note)}
                className={`
                  relative w-12 h-32 bg-white border border-gray-300 
                  hover:bg-gray-50 active:bg-gray-100 transition-colors
                  ${activeKeys.has(note) ? 'bg-primary/20 border-primary' : ''}
                  ${index === 0 ? 'rounded-l' : ''}
                  ${index === whiteKeys.length - 1 ? 'rounded-r' : ''}
                `}
              >
                <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-center">
                  <div className="text-xs font-medium text-gray-700">
                    {note.replace(/\d+/, '')}
                  </div>
                  {showSolfege && (
                    <div className="text-xs text-primary font-medium">
                      {getSolfegeFor(note)}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Black Keys */}
          <div className="absolute top-0 flex">
            {whiteKeys.map((whiteKey, index) => {
              const blackKeyAfter = whiteKey.replace(/\d+/, '') + '#' + whiteKey.match(/\d+/)?.[0];
              const hasBlackKey = blackKeys.includes(blackKeyAfter);
              
              if (!hasBlackKey || index === whiteKeys.length - 1) {
                return <div key={index} className="w-12" />;
              }

              return (
                <div key={index} className="w-12 relative">
                  <button
                    onMouseDown={() => handleKeyPress(blackKeyAfter)}
                    className={`
                      absolute right-0 w-8 h-20 bg-gray-800 border border-gray-600
                      hover:bg-gray-700 active:bg-gray-600 transition-colors rounded-b
                      transform translate-x-1/2 z-10
                      ${activeKeys.has(blackKeyAfter) ? 'bg-primary border-primary' : ''}
                    `}
                  >
                    <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-center">
                      <div className="text-xs font-medium text-white">
                        {blackKeyAfter.replace(/\d+/, '')}
                      </div>
                      {showSolfege && (
                        <div className="text-xs text-yellow-300 font-medium">
                          {getSolfegeFor(blackKeyAfter)}
                        </div>
                      )}
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-4 text-xs text-muted-foreground text-center">
          Click keys to play notes • "Play Scale" for reference melody • Toggle solfège syllables
        </div>
      </div>
    </div>
  );
};