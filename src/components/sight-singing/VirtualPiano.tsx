import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Rnd } from 'react-rnd';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX, X } from 'lucide-react';
import { WebAudioSynth, SYNTH_INSTRUMENTS } from '@/utils/webAudioSynth';
import { unlockAudioContext, setupMobileAudioUnlock, forceUnlockAudio } from '@/utils/mobileAudioUnlock';
interface VirtualPianoProps {
  className?: string;
  onClose?: () => void;
}

// Base frequencies for one octave starting at C4 (middle C)
const baseWhiteKeysPerOctave = [{
  note: 'C',
  baseFrequency: 261.63
}, {
  note: 'D',
  baseFrequency: 293.66
}, {
  note: 'E',
  baseFrequency: 329.63
}, {
  note: 'F',
  baseFrequency: 349.23
}, {
  note: 'G',
  baseFrequency: 392.0
}, {
  note: 'A',
  baseFrequency: 440.0
}, {
  note: 'B',
  baseFrequency: 493.88
}];
const baseBlackKeysPerOctave = [{
  note: 'C#',
  baseFrequency: 277.18,
  positionInOctave: 0.5
}, {
  note: 'D#',
  baseFrequency: 311.13,
  positionInOctave: 1.5
}, {
  note: 'F#',
  baseFrequency: 369.99,
  positionInOctave: 3.5
}, {
  note: 'G#',
  baseFrequency: 415.3,
  positionInOctave: 4.5
}, {
  note: 'A#',
  baseFrequency: 466.16,
  positionInOctave: 5.5
}];

// Generate full piano range A0 to C8 (88 keys)
const generateFullPianoKeys = () => {
  const whiteKeys: {
    note: string;
    octave: number;
    frequency: number;
  }[] = [];
  const blackKeys: {
    note: string;
    octave: number;
    frequency: number;
    position: number;
  }[] = [];

  // Start with A0 and B0
  const a0Freq = 27.5; // A0 base frequency
  whiteKeys.push({
    note: 'A',
    octave: 0,
    frequency: a0Freq
  });
  whiteKeys.push({
    note: 'B',
    octave: 0,
    frequency: a0Freq * Math.pow(2, 2 / 12)
  });
  blackKeys.push({
    note: 'A#',
    octave: 0,
    frequency: a0Freq * Math.pow(2, 1 / 12),
    position: 0.5
  });

  // Generate C1 through C8
  for (let octave = 1; octave <= 8; octave++) {
    const octaveMultiplier = Math.pow(2, octave - 4); // 4 is base (C4 = middle C)
    const whiteKeyOffset = (octave - 1) * 7 + 2; // +2 for A0, B0

    // Add white keys for this octave (or just C for octave 8)
    const keysToAdd = octave === 8 ? [baseWhiteKeysPerOctave[0]] : baseWhiteKeysPerOctave;
    keysToAdd.forEach(key => {
      whiteKeys.push({
        note: key.note,
        octave: octave,
        frequency: key.baseFrequency * octaveMultiplier
      });
    });

    // Add black keys for this octave (skip for octave 8)
    if (octave < 8) {
      baseBlackKeysPerOctave.forEach(key => {
        blackKeys.push({
          note: key.note,
          octave: octave,
          frequency: key.baseFrequency * octaveMultiplier,
          position: whiteKeyOffset + key.positionInOctave
        });
      });
    }
  }
  return {
    whiteKeys,
    blackKeys
  };
};
export const VirtualPiano: React.FC<VirtualPianoProps> = ({
  className = '',
  onClose
}) => {
  console.log('🎹 VirtualPiano mounted (full-screen):', {
    className,
    hasOnClose: !!onClose
  });
  const [activeNotes, setActiveNotes] = useState<Set<string>>(new Set());
  const [volume, setVolume] = useState([0.4]);
  const [isMuted, setIsMuted] = useState(false);
  const [startOctave, setStartOctave] = useState<number>(3); // Default starts at C3-B4 (shows A4)
  const [pianoSize, setPianoSize] = useState({
    width: 900,
    height: 600
  });
  
  // Compute initial centered position (runs once on first render)
  const getInitialPosition = () => {
    if (typeof window !== 'undefined') {
      return {
        x: Math.max(0, (window.innerWidth - 900) / 2),
        y: Math.max(0, (window.innerHeight - 600) / 2)
      };
    }
    return { x: 100, y: 100 };
  };
  
  const [pianoPosition, setPianoPosition] = useState(getInitialPosition);
  const [selectedInstrument, setSelectedInstrument] = useState<number>(0);
  const [isMobile, setIsMobile] = useState(false);
  const [synthReady, setSynthReady] = useState(false);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const keysContainerRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const synthRef = useRef<WebAudioSynth | null>(null);

  // Detect mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Setup mobile audio unlock on mount
  useEffect(() => {
    const cleanup = setupMobileAudioUnlock();
    return cleanup;
  }, []);

  // Calculate scale factor based on window size
  const baseWidth = 900;
  const baseHeight = 600;
  const scaleX = pianoSize.width / baseWidth;
  const scaleY = pianoSize.height / baseHeight;
  const scale = Math.min(scaleX, scaleY); // Maintain aspect ratio

  // Generate full 88-key piano range (A0-C8)
  const {
    whiteKeys,
    blackKeys
  } = generateFullPianoKeys();

  // Initialize audio context with mobile unlock
  const initAudioContext = useCallback(async () => {
    try {
      // Use shared unlock utility for iOS compatibility
      const ctx = await unlockAudioContext();
      audioContextRef.current = ctx;
      
      if (!audioUnlocked) {
        setAudioUnlocked(true);
        console.log('✅ Audio unlocked for mobile');
      }

      // Initialize synth if not already
      if (!synthRef.current && audioContextRef.current) {
        synthRef.current = new WebAudioSynth(audioContextRef.current);
        synthRef.current.setInstrument(selectedInstrument);
        synthRef.current.setVolume(isMuted ? 0 : volume[0]);
        setSynthReady(true);
        console.log('🎹 WebAudioSynth initialized');
      }
      return audioContextRef.current;
    } catch (error) {
      console.error('❌ Failed to initialize AudioContext:', error);
      return null;
    }
  }, [audioUnlocked, selectedInstrument, isMuted, volume]);

  // Handle touch/click to unlock audio on mobile (must be user-initiated)
  const handleUserInteraction = useCallback(async () => {
    if (!audioUnlocked) {
      await initAudioContext();
    }
  }, [audioUnlocked, initAudioContext]);

  // Update synth when instrument changes - also create synth if audio context exists
  useEffect(() => {
    // If synth exists, update instrument
    if (synthRef.current) {
      synthRef.current.setInstrument(selectedInstrument);
      console.log('🎹 Instrument changed to:', SYNTH_INSTRUMENTS.find(i => i.id === selectedInstrument)?.name || 'Unknown');
    } 
    // If audio context exists but synth doesn't, create it with correct instrument
    else if (audioContextRef.current) {
      synthRef.current = new WebAudioSynth(audioContextRef.current);
      synthRef.current.setInstrument(selectedInstrument);
      synthRef.current.setVolume(isMuted ? 0 : volume[0]);
      setSynthReady(true);
      console.log('🎹 WebAudioSynth created with instrument:', SYNTH_INSTRUMENTS.find(i => i.id === selectedInstrument)?.name || 'Unknown');
    }
  }, [selectedInstrument, isMuted, volume]);

  // Update synth volume when volume changes
  useEffect(() => {
    if (synthRef.current) {
      synthRef.current.setVolume(isMuted ? 0 : volume[0]);
    }
  }, [volume, isMuted]);

  // Scroll to selected octave range when dropdown changes or on mount
  useEffect(() => {
    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      if (keysContainerRef.current) {
        const whiteKeyWidth = isMobile ? 50 : 69;
        let scrollPosition = 0;
        if (startOctave === 0) {
          scrollPosition = 0;
        } else if (startOctave === 1) {
          scrollPosition = whiteKeyWidth * 9;
        } else {
          // Calculate position: octave 4 (middle C) should be centered
          scrollPosition = whiteKeyWidth * (2 + (startOctave - 1) * 7);
        }
        keysContainerRef.current.scrollTo({
          left: scrollPosition,
          behavior: 'smooth'
        });
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [startOctave, isMobile]);

  const playNote = useCallback(async (frequency: number, noteName: string) => {
    console.log('🎹 playNote called:', noteName, frequency);
    
    // Force unlock audio on first interaction (critical for mobile)
    try {
      await forceUnlockAudio();
    } catch (e) {
      console.log('🔊 Force unlock during playNote:', e);
    }
    
    // Always ensure audio context is initialized and unlocked (mobile requirement)
    const audioContext = await initAudioContext();
    if (!audioContext) {
      console.error('🎹 No AudioContext available');
      return;
    }

    // Ensure context is running - critical for mobile
    if (audioContext.state !== 'running') {
      try {
        await audioContext.resume();
        await new Promise(resolve => setTimeout(resolve, 50));
        console.log('🔊 AudioContext resumed for playNote, state:', audioContext.state);
      } catch (err) {
        console.error('🎹 Failed to resume AudioContext:', err);
        return;
      }
    }

    // Use the WebAudioSynth to play the note
    if (synthRef.current) {
      try {
        await synthRef.current.playNote(noteName, frequency);
        setActiveNotes(prev => new Set(prev).add(noteName));
        console.log('🎹 Synth played:', noteName, 'at', frequency, 'Hz');
      } catch (error) {
        console.warn('🎹 Synth playNote failed:', error);
      }
    } else {
      console.warn('🎹 No synth available');
    }
  }, [initAudioContext]);

  const stopNote = useCallback((noteName: string) => {
    // Stop synth note
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Stop all synth notes
      if (synthRef.current) {
        synthRef.current.stopAllNotes();
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Full-screen mode when onClose is provided
  const isFullScreen = !!onClose;
  const pianoContent = <div className={isFullScreen ? "w-full h-full bg-background flex flex-col rounded-none md:rounded-lg overflow-hidden shadow-2xl" : `w-full flex flex-col ${className}`} style={isFullScreen && !isMobile ? {
    transform: `scale(${scale})`,
    transformOrigin: 'top left',
    width: `${baseWidth}px`,
    height: `${baseHeight}px`
  } : undefined}>
      {/* Header Bar */}
      <div className="relative z-10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between px-2 sm:px-4 py-2 sm:py-3 border-b border-border bg-card backdrop-blur-sm shrink-0 cursor-move gap-2">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <h2 className="text-sm sm:text-lg font-semibold hidden sm:block">Piano</h2>
          <Select value={startOctave.toString()} onValueChange={value => setStartOctave(parseInt(value, 10))}>
            <SelectTrigger className="w-24 sm:w-32 h-8 sm:h-9 text-xs sm:text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-[2147483648] bg-popover">
              <SelectItem value="0">A0-B1</SelectItem>
              <SelectItem value="1">C1-B2</SelectItem>
              <SelectItem value="2">C2-B3</SelectItem>
              <SelectItem value="3">C3-B4</SelectItem>
              <SelectItem value="4">C4-B5</SelectItem>
              <SelectItem value="5">C5-B6</SelectItem>
              <SelectItem value="6">C6-B7</SelectItem>
              <SelectItem value="7">C7-C8</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedInstrument.toString()} onValueChange={value => setSelectedInstrument(parseInt(value, 10))}>
            <SelectTrigger className="w-32 sm:w-48 h-8 sm:h-9 text-xs sm:text-sm">
              <SelectValue placeholder="Instrument" />
            </SelectTrigger>
            <SelectContent className="z-[2147483648] max-h-[300px] bg-popover">
              {SYNTH_INSTRUMENTS.map(instrument => <SelectItem key={instrument.id} value={instrument.id.toString()}>
                  {instrument.name}
                </SelectItem>)}
            </SelectContent>
          </Select>
          {synthReady && <span className="text-xs text-green-500 hidden sm:inline">✓ Ready</span>}
        </div>

        <div className="flex items-center gap-1 sm:gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={toggleMute} className="h-7 w-7 sm:h-9 sm:w-9 p-0">
            {isMuted ? <VolumeX className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <Volume2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
          </Button>
          <div className="w-14 sm:w-24">
            <Slider value={volume} onValueChange={setVolume} max={1} min={0} step={0.1} className="w-full" />
          </div>
          {onClose && <Button variant="ghost" size="sm" onClick={onClose} className="h-7 w-7 sm:h-9 sm:w-9 p-0 ml-1" aria-label="Close piano">
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>}
        </div>
      </div>

      {/* Piano Keyboard Area - Scrollable */}
      <div ref={keysContainerRef} style={{
      scrollbarWidth: 'thin',
      scrollbarColor: 'hsl(var(--primary)) hsl(var(--muted))'
    }} className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="relative inline-block px-2 min-w-max mx-0 sm:px-0 py-0">
          {/* White Keys */}
          <div className="relative">
            <div className={isFullScreen ? "flex gap-0.5 h-[200px] sm:h-[320px] md:h-[400px]" : "flex gap-0.5 h-[180px] sm:h-[240px]"}>
              {whiteKeys.map((key, index) => {
              const keyName = `${key.note}${key.octave}`;
              const isActive = activeNotes.has(keyName);
              const whiteKeyWidth = isMobile ? 50 : 69;
              return <button key={keyName} style={{
                width: `${whiteKeyWidth}px`,
                minWidth: `${whiteKeyWidth}px`,
                boxShadow: isActive ? 'inset 0 6px 12px rgba(0,0,0,0.35)' : '0 6px 12px rgba(0,0,0,0.2), inset 0 3px 0 rgba(255,255,255,0.9)',
                backgroundColor: isActive ? '#e0e7ff' : '#FFFFFF',
              }} className={`cursor-pointer transition-all duration-75 flex flex-col items-center justify-end pb-2 sm:pb-4 text-[10px] sm:text-sm font-semibold select-none border-r border-gray-300/50 last:border-r-0 touch-manipulation ${isActive ? 'shadow-inner scale-[0.98]' : 'hover:bg-gray-50 shadow-lg active:scale-[0.98]'} ${index === 0 ? 'rounded-l-lg sm:rounded-l-xl' : ''} ${index === whiteKeys.length - 1 ? 'rounded-r-lg sm:rounded-r-xl' : ''}`} 
              onPointerDown={(e) => {
                e.preventDefault();
                playNote(key.frequency, keyName);
              }} 
              onPointerUp={() => stopNote(keyName)} 
              onPointerLeave={() => stopNote(keyName)}
              onPointerCancel={() => stopNote(keyName)}
              onTouchEnd={(e) => {
                e.preventDefault();
                stopNote(keyName);
              }}
              onTouchCancel={() => stopNote(keyName)}>
                    <span style={{ color: '#374151' }} className="font-bold">
                      {key.note}
                      <sub className="text-[0.6em]">{key.octave}</sub>
                    </span>
                  </button>;
            })}
            </div>

            {/* Black Keys */}
            <div className="pointer-events-none absolute inset-0 top-0 h-[60%]">
              <div className="relative w-full h-full">
                {blackKeys.map(key => {
                const keyName = `${key.note}${key.octave}`;
                const isActive = activeNotes.has(keyName);
                const whiteKeyWidth = isMobile ? 50 : 69; // Smaller on mobile
                const blackKeyWidth = isMobile ? 34 : 46;
                const leftPosition = key.position * whiteKeyWidth - blackKeyWidth / 2;
                return <button key={keyName} className={`absolute h-full cursor-pointer transition-all duration-75 flex items-end justify-center pb-2 sm:pb-3 text-[0.65rem] sm:text-xs font-bold pointer-events-auto select-none touch-manipulation ${isActive ? 'shadow-inner scale-[0.96]' : 'hover:opacity-90 active:scale-[0.96]'}`} style={{
                  left: `${leftPosition}px`,
                  width: `${blackKeyWidth}px`,
                  minWidth: '36px',
                  maxWidth: '60px',
                  borderRadius: '0 0 8px 8px',
                  boxShadow: isActive ? 'inset 0 5px 10px rgba(0,0,0,0.9)' : '0 5px 12px rgba(0,0,0,0.7), inset 0 2px 0 rgba(255,255,255,0.2)',
                  backgroundColor: isActive ? '#374151' : '#111827',
                }} 
                onPointerDown={(e) => {
                  e.preventDefault();
                  playNote(key.frequency, keyName);
                }} 
                onPointerUp={() => stopNote(keyName)} 
                onPointerLeave={() => stopNote(keyName)}
                onPointerCancel={() => stopNote(keyName)}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  stopNote(keyName);
                }}
                onTouchCancel={() => stopNote(keyName)}>
                      <span style={{ color: '#FFFFFF' }}>{key.note.replace('#', '♯')}</span>
                    </button>;
              })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>;
  if (isFullScreen) {
    // On mobile, use a compact modal instead of full screen
    if (isMobile) {
      return (
        <div 
          className="fixed inset-0 z-[2147483647] bg-black/50 flex items-center justify-center p-4"
          onTouchStart={handleUserInteraction}
          onClick={handleUserInteraction}
        >
          <div 
            className="bg-background rounded-xl w-full max-w-md max-h-[80vh] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {pianoContent}
          </div>
        </div>
      );
    }
    // Calculate centered position for Rnd default
    const centerX = Math.max(0, (window.innerWidth - pianoSize.width) / 2);
    const centerY = Math.max(0, (window.innerHeight - pianoSize.height) / 2);
    
    // Wrap Rnd in a fixed overlay to ensure proper viewport positioning
    return (
      <div className="fixed inset-0 z-[2147483646]" onClick={(e) => {
        // Close when clicking overlay background
        if (e.target === e.currentTarget && onClose) {
          onClose();
        }
      }}>
        <Rnd 
          default={{
            x: centerX,
            y: centerY,
            width: pianoSize.width,
            height: pianoSize.height
          }}
          onResizeStop={(e, direction, ref, delta, position) => {
            setPianoSize({
              width: parseInt(ref.style.width),
              height: parseInt(ref.style.height)
            });
          }} 
          minWidth={600} 
          minHeight={400} 
          maxWidth={1400} 
          maxHeight={900} 
          dragHandleClassName="cursor-move" 
          className="z-[2147483647]" 
          bounds="parent"
        >
          {pianoContent}
        </Rnd>
      </div>
    );
  }
  return pianoContent;
};