import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Rnd } from 'react-rnd';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX, X, Maximize2, Minimize2, GripHorizontal } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { WebAudioSynth, SYNTH_INSTRUMENTS } from '@/utils/webAudioSynth';
import { forceUnlockAudio, getSharedAudioContext, setupMobileAudioUnlock } from '@/utils/mobileAudioUnlock';

interface DockablePianoProps {
  onClose: () => void;
  className?: string;
}

// Calculate frequency using equal temperament (A4 = 440Hz)
const getFrequency = (note: string, octave: number): number => {
  const noteOffsets: Record<string, number> = {
    'C': -9, 'C#': -8, 'D': -7, 'D#': -6, 'E': -5, 'F': -4,
    'F#': -3, 'G': -2, 'G#': -1, 'A': 0, 'A#': 1, 'B': 2
  };
  const semitones = noteOffsets[note] + (octave - 4) * 12;
  return 440 * Math.pow(2, semitones / 12);
};

// Generate 2 octaves of keys (compact mode)
const generateCompactPianoKeys = (startOctave: number, octaveCount: number = 2) => {
  const whiteKeys: { note: string; octave: number; frequency: number }[] = [];
  const blackKeys: { note: string; octave: number; frequency: number; position: number }[] = [];
  
  const whiteNotes = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const blackNotes = [
    { note: 'C#', posAfter: 'C' },
    { note: 'D#', posAfter: 'D' },
    { note: 'F#', posAfter: 'F' },
    { note: 'G#', posAfter: 'G' },
    { note: 'A#', posAfter: 'A' }
  ];

  for (let o = 0; o < octaveCount; o++) {
    const octave = startOctave + o;
    whiteNotes.forEach((note) => {
      whiteKeys.push({
        note,
        octave,
        frequency: getFrequency(note, octave)
      });
    });

    blackNotes.forEach(({ note, posAfter }) => {
      const whiteIdx = whiteNotes.indexOf(posAfter);
      blackKeys.push({
        note,
        octave,
        frequency: getFrequency(note, octave),
        position: o * 7 + whiteIdx + 1
      });
    });
  }

  return { whiteKeys, blackKeys };
};

export const DockablePiano: React.FC<DockablePianoProps> = ({ onClose, className }) => {
  const [activeNotes, setActiveNotes] = useState<Set<string>>(new Set());
  const [volume, setVolume] = useState([0.4]);
  const [isMuted, setIsMuted] = useState(false);
  const [startOctave, setStartOctave] = useState<number>(4); // Default C4-B5
  const [octaveCount, setOctaveCount] = useState<1 | 2 | 3>(2);
  const [selectedInstrument, setSelectedInstrument] = useState<number>(0);
  const [synthReady, setSynthReady] = useState(false);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [opacity, setOpacity] = useState(0.95);
  const [isDraggable, setIsDraggable] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ width: '100%', height: 160 });
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const synthRef = useRef<WebAudioSynth | null>(null);

  // Setup mobile audio unlock
  useEffect(() => {
    const cleanup = setupMobileAudioUnlock();
    return cleanup;
  }, []);

  // Generate keys based on settings
  const { whiteKeys, blackKeys } = useMemo(
    () => generateCompactPianoKeys(startOctave, octaveCount),
    [startOctave, octaveCount]
  );

  // Initialize synth when instrument changes
  useEffect(() => {
    if (synthRef.current) {
      synthRef.current.setInstrument(selectedInstrument);
    } else if (audioContextRef.current) {
      synthRef.current = new WebAudioSynth(audioContextRef.current);
      synthRef.current.setInstrument(selectedInstrument);
      synthRef.current.setVolume(isMuted ? 0 : volume[0]);
      setSynthReady(true);
    }
  }, [selectedInstrument, isMuted, volume]);

  // Update volume
  useEffect(() => {
    if (synthRef.current) {
      synthRef.current.setVolume(isMuted ? 0 : volume[0]);
    }
  }, [volume, isMuted]);

  const playNote = useCallback((noteName: string, frequency: number, velocity: number = 100) => {
    forceUnlockAudio();
    const ctx = getSharedAudioContext();
    audioContextRef.current = ctx;
    
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    
    if (!synthRef.current) {
      synthRef.current = new WebAudioSynth(ctx);
      synthRef.current.setInstrument(selectedInstrument);
      synthRef.current.setVolume(isMuted ? 0 : volume[0]);
      setSynthReady(true);
    }
    
    try {
      synthRef.current.playNote(noteName, frequency, velocity);
      setActiveNotes(prev => new Set(prev).add(noteName));
      if (!audioUnlocked) setAudioUnlocked(true);
    } catch (error) {
      console.warn('🎹 Synth playNote failed:', error);
    }
  }, [selectedInstrument, isMuted, volume, audioUnlocked]);

  const stopNote = useCallback((noteName: string) => {
    if (synthRef.current) {
      synthRef.current.stopNote(noteName);
    }
    setActiveNotes(prev => {
      const next = new Set(prev);
      next.delete(noteName);
      return next;
    });
  }, []);

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (synthRef.current) {
      synthRef.current.setVolume(!isMuted ? 0 : volume[0]);
    }
  };

  // Global pointer/touch end listener
  useEffect(() => {
    const handleGlobalPointerUp = () => {
      if (synthRef.current) {
        synthRef.current.forceStopAllNotes();
      }
      setActiveNotes(new Set());
    };

    document.addEventListener('pointerup', handleGlobalPointerUp);
    document.addEventListener('pointercancel', handleGlobalPointerUp);
    document.addEventListener('touchend', handleGlobalPointerUp);
    document.addEventListener('touchcancel', handleGlobalPointerUp);

    return () => {
      document.removeEventListener('pointerup', handleGlobalPointerUp);
      document.removeEventListener('pointercancel', handleGlobalPointerUp);
      document.removeEventListener('touchend', handleGlobalPointerUp);
      document.removeEventListener('touchcancel', handleGlobalPointerUp);
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (synthRef.current) {
        synthRef.current.stopAllNotes();
      }
    };
  }, []);

  const keyHeight = isExpanded ? 140 : 100;
  const whiteKeyWidth = Math.max(36, Math.floor((window.innerWidth - 32) / (octaveCount * 7)));

  const pianoContent = (
    <div 
      className="flex flex-col bg-card border-t border-border shadow-2xl"
      style={{ opacity }}
    >
      {/* Compact Header */}
      <div className="flex items-center justify-between px-2 py-1 bg-muted/50 border-b border-border gap-1">
        {/* Drag Handle */}
        {isDraggable && (
          <div className="cursor-move p-1">
            <GripHorizontal className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
        
        {/* Controls */}
        <div className="flex items-center gap-1 flex-1 overflow-x-auto">
          <Select value={startOctave.toString()} onValueChange={v => setStartOctave(parseInt(v, 10))}>
            <SelectTrigger className="w-16 h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-[10001]">
              <SelectItem value="2">C2</SelectItem>
              <SelectItem value="3">C3</SelectItem>
              <SelectItem value="4">C4</SelectItem>
              <SelectItem value="5">C5</SelectItem>
              <SelectItem value="6">C6</SelectItem>
            </SelectContent>
          </Select>
          
          <ToggleGroup 
            type="single" 
            value={octaveCount.toString()} 
            onValueChange={(val) => val && setOctaveCount(parseInt(val, 10) as 1 | 2 | 3)}
            className="h-7"
          >
            <ToggleGroupItem value="1" className="h-7 px-2 text-xs">1</ToggleGroupItem>
            <ToggleGroupItem value="2" className="h-7 px-2 text-xs">2</ToggleGroupItem>
            <ToggleGroupItem value="3" className="h-7 px-2 text-xs">3</ToggleGroupItem>
          </ToggleGroup>
          
          <Select value={selectedInstrument.toString()} onValueChange={v => setSelectedInstrument(parseInt(v, 10))}>
            <SelectTrigger className="w-24 h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-[10001] max-h-[200px]">
              {SYNTH_INSTRUMENTS.slice(0, 8).map(instrument => (
                <SelectItem key={instrument.id} value={instrument.id.toString()}>
                  {instrument.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Right Controls */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={toggleMute} className="h-7 w-7 p-0">
            {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
          </Button>
          <Slider 
            value={volume} 
            onValueChange={setVolume} 
            max={1} 
            min={0} 
            step={0.1} 
            className="w-12 hidden sm:block" 
          />
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsExpanded(!isExpanded)} 
            className="h-7 w-7 p-0"
          >
            {isExpanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClose} 
            className="h-7 w-7 p-0"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Piano Keys */}
      <div 
        className="overflow-x-auto overflow-y-hidden"
        style={{
          background: 'linear-gradient(to bottom, #1a1a1a 0%, #0d0d0d 100%)',
          padding: '8px 4px 4px 4px',
        }}
      >
        <div className="relative inline-block min-w-max mx-auto">
          {/* White Keys */}
          <div className="relative flex gap-0.5" style={{ height: keyHeight }}>
            {whiteKeys.map((key, index) => {
              const keyName = `${key.note}${key.octave}`;
              const isActive = activeNotes.has(keyName);
              return (
                <button
                  key={keyName}
                  style={{
                    width: `${whiteKeyWidth}px`,
                    minWidth: '36px',
                    boxShadow: isActive 
                      ? 'inset 0 -2px 10px rgba(0,0,0,0.2), 0 0 15px 3px rgba(59, 130, 246, 0.6)' 
                      : '0 6px 12px rgba(0,0,0,0.3), inset -2px 0 3px rgba(0,0,0,0.1)',
                    background: isActive 
                      ? 'linear-gradient(to bottom, #bfdbfe 0%, #dbeafe 10%, #eff6ff 50%, #dbeafe 100%)'
                      : 'linear-gradient(to bottom, #ffffff 0%, #f8f8f8 60%, #e8e8e8 90%, #d8d8d8 100%)',
                    transform: isActive ? 'translateY(2px)' : 'translateY(0)',
                    borderBottom: isActive ? '2px solid #3b82f6' : '3px solid #c0c0c0',
                    borderRadius: index === 0 ? '0 0 0 6px' : index === whiteKeys.length - 1 ? '0 0 6px 0' : '0 0 4px 4px',
                  }}
                  className="cursor-pointer transition-all duration-100 flex flex-col items-center justify-end pb-1 text-[9px] font-semibold select-none touch-manipulation"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    playNote(keyName, key.frequency);
                  }}
                  onPointerUp={() => stopNote(keyName)}
                  onPointerLeave={() => isActive && stopNote(keyName)}
                  onPointerCancel={() => stopNote(keyName)}
                >
                  <span className="text-gray-600">
                    {key.note}<sub className="text-[0.6em]">{key.octave}</sub>
                  </span>
                </button>
              );
            })}
          </div>

          {/* Black Keys */}
          <div className="pointer-events-none absolute inset-0 top-0" style={{ height: '60%' }}>
            <div className="relative w-full h-full">
              {blackKeys.map(key => {
                const keyName = `${key.note}${key.octave}`;
                const isActive = activeNotes.has(keyName);
                const blackKeyWidth = Math.floor(whiteKeyWidth * 0.58);
                const gap = 2;
                const leftPosition = key.position * (whiteKeyWidth + gap) - blackKeyWidth / 2;
                
                return (
                  <button
                    key={keyName}
                    className="absolute h-full cursor-pointer transition-all duration-100 flex items-end justify-center pb-1 text-[8px] font-bold pointer-events-auto select-none touch-manipulation"
                    style={{
                      left: `${leftPosition}px`,
                      width: `${blackKeyWidth}px`,
                      minWidth: '24px',
                      borderRadius: '0 0 4px 4px',
                      boxShadow: isActive 
                        ? 'inset 0 3px 8px rgba(0,0,0,0.6), 0 0 12px 2px rgba(59, 130, 246, 0.7)' 
                        : '0 4px 8px rgba(0,0,0,0.5)',
                      background: isActive
                        ? 'linear-gradient(to bottom, #1e40af 0%, #2563eb 40%, #1d4ed8 100%)'
                        : 'linear-gradient(to bottom, #2d2d2d 0%, #1a1a1a 30%, #0d0d0d 70%, #1a1a1a 100%)',
                      transform: isActive ? 'translateY(2px)' : 'translateY(0)',
                    }}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      playNote(keyName, key.frequency);
                    }}
                    onPointerUp={() => stopNote(keyName)}
                    onPointerLeave={() => isActive && stopNote(keyName)}
                    onPointerCancel={() => stopNote(keyName)}
                  >
                    <span className="text-white">{key.note.replace('#', '♯')}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Render as docked panel at bottom
  return createPortal(
    <div 
      className="fixed bottom-0 left-0 right-0 safe-bottom"
      style={{ 
        zIndex: 99999, // Higher than any other z-index to ensure visibility
        transform: 'translateZ(0)', // Force GPU acceleration
        pointerEvents: 'auto',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)'
      }}
    >
      {pianoContent}
    </div>,
    document.body
  );
};
