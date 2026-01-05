import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Rnd } from 'react-rnd';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX, X } from 'lucide-react';
import { WebAudioSynth, SYNTH_INSTRUMENTS } from '@/utils/webAudioSynth';
import { unlockAudioContext, setupMobileAudioUnlock, forceUnlockAudio, getSharedAudioContext } from '@/utils/mobileAudioUnlock';
interface VirtualPianoProps {
  className?: string;
  onClose?: () => void;
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

// Generate full piano range A0 to C8 (88 keys)
const generateFullPianoKeys = () => {
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

  // A0 and A#0 and B0 first
  whiteKeys.push({ note: 'A', octave: 0, frequency: getFrequency('A', 0) });
  whiteKeys.push({ note: 'B', octave: 0, frequency: getFrequency('B', 0) });
  blackKeys.push({ note: 'A#', octave: 0, frequency: getFrequency('A#', 0), position: 1 });

  // C1 through B7, then C8
  for (let octave = 1; octave <= 8; octave++) {
    const notesToAdd = octave === 8 ? ['C'] : whiteNotes;
    const whiteKeyOffset = (octave - 1) * 7 + 2; // +2 for A0, B0
    
    notesToAdd.forEach((note, idx) => {
      whiteKeys.push({
        note,
        octave,
        frequency: getFrequency(note, octave)
      });
    });

    // Black keys (skip for octave 8)
    if (octave < 8) {
      blackNotes.forEach(({ note, posAfter }) => {
        const whiteIdx = whiteNotes.indexOf(posAfter);
        // Position black key at the right edge of the white key it follows
        // whiteKeyOffset + whiteIdx gives the index of the white key (e.g., C)
        // Adding 1 positions it at the right edge of that white key (between C and D)
        blackKeys.push({
          note,
          octave,
          frequency: getFrequency(note, octave),
          position: whiteKeyOffset + whiteIdx + 1
        });
      });
    }
  }

  return { whiteKeys, blackKeys };
};
export const VirtualPiano: React.FC<VirtualPianoProps> = ({
  className = '',
  onClose
}) => {
  // Full-screen mode when onClose is provided - MUST be defined first
  const isFullScreen = !!onClose;
  
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
  const [dynamicKeyWidth, setDynamicKeyWidth] = useState<number | null>(null);
  const keysContainerRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const synthRef = useRef<WebAudioSynth | null>(null);

  // Detect mobile on mount and resize, calculate dynamic key width for fullscreen
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    const calculateKeyWidth = () => {
      if (onClose && !isMobile) {
        // Double-sized keys for easier touchscreen play (will require scrolling)
        setDynamicKeyWidth(100); // Large fixed width for touch-friendly keys
      }
    };
    checkMobile();
    calculateKeyWidth();
    window.addEventListener('resize', () => {
      checkMobile();
      calculateKeyWidth();
    });
    return () => window.removeEventListener('resize', () => {
      checkMobile();
      calculateKeyWidth();
    });
  }, [onClose, isMobile]);

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
      // Force unlock synchronously first (critical for iOS)
      forceUnlockAudio();
      
      // Get the shared audio context
      const ctx = getSharedAudioContext();
      audioContextRef.current = ctx;
      
      // Resume if suspended
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      
      if (!audioUnlocked && ctx.state === 'running') {
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
        const gap = 2; // 0.5 gap in Tailwind = ~2px
        const keyWithGap = whiteKeyWidth + gap;
        
        // Calculate scroll position based on startOctave
        // Piano layout: A0, B0, then C1-B1, C2-B2, ... C7-B7, C8
        // Index 0 = A0, Index 1 = B0, Index 2 = C1, etc.
        let scrollPosition = 0;
        if (startOctave === 0) {
          // A0-B1: start at beginning
          scrollPosition = 0;
        } else {
          // For octave N, C[N] is at index: 2 + (N-1)*7
          // e.g., C1 at index 2, C2 at index 9, C3 at index 16, C4 at index 23
          const cIndex = 2 + (startOctave - 1) * 7;
          scrollPosition = cIndex * keyWithGap;
        }
        
        keysContainerRef.current.scrollTo({
          left: scrollPosition,
          behavior: 'smooth'
        });
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [startOctave, isMobile]);

  const playNote = useCallback((noteName: string, frequency: number) => {
    console.log('🎹 Playing note:', noteName, 'at frequency:', frequency.toFixed(2), 'Hz');
    
    // CRITICAL: All audio operations must be synchronous within user gesture for iOS
    // Force unlock first - this plays a silent buffer synchronously
    forceUnlockAudio();
    
    // Get shared context immediately (synchronous)
    const ctx = getSharedAudioContext();
    audioContextRef.current = ctx;
    
    // Resume synchronously - fire and forget, don't await
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    
    // Initialize synth synchronously if not already
    if (!synthRef.current) {
      synthRef.current = new WebAudioSynth(ctx);
      synthRef.current.setInstrument(selectedInstrument);
      synthRef.current.setVolume(isMuted ? 0 : volume[0]);
      setSynthReady(true);
    }
    
    // Play the note immediately (synchronous)
    try {
      synthRef.current.playNote(noteName, frequency);
      setActiveNotes(prev => new Set(prev).add(noteName));
      if (!audioUnlocked) setAudioUnlocked(true);
    } catch (error) {
      console.warn('🎹 Synth playNote failed:', error);
    }
  }, [selectedInstrument, isMuted, volume, audioUnlocked]);

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

  // Global pointer/touch end listener to stop all notes immediately (prevents stuck keys)
  useEffect(() => {
    const handleGlobalPointerUp = () => {
      // Force stop all notes immediately when pointer/touch ends
      if (synthRef.current) {
        synthRef.current.forceStopAllNotes();
      }
      setActiveNotes(new Set());
    };

    // Listen for all pointer/touch end events at document level
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
  }, []); // No dependencies - stable listener

  // MIDI Controller Support
  useEffect(() => {
    let midiAccess: MIDIAccess | null = null;
    
    // Convert MIDI note number to note name and frequency
    const midiNoteToName = (midiNote: number): { name: string; frequency: number } => {
      const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
      const octave = Math.floor(midiNote / 12) - 1;
      const noteIndex = midiNote % 12;
      const name = `${noteNames[noteIndex]}${octave}`;
      // A4 (MIDI 69) = 440Hz
      const frequency = 440 * Math.pow(2, (midiNote - 69) / 12);
      return { name, frequency };
    };
    
    const handleMIDIMessage = (event: MIDIMessageEvent) => {
      const [status, note, velocity] = event.data as Uint8Array;
      const command = status & 0xf0;
      
      // Note On (144) or Note Off (128)
      if (command === 144 && velocity > 0) {
        // Note On
        const { name, frequency } = midiNoteToName(note);
        console.log('🎹 MIDI Note On:', name, 'velocity:', velocity);
        
        // Smart scroll: only scroll if the played note is completely off-screen
        if (keysContainerRef.current) {
          const container = keysContainerRef.current;
          const gap = 2;
          const baseWhiteKeyWidth = isMobile ? 50 : 69;
          const whiteKeyWidth = isFullScreen && dynamicKeyWidth ? dynamicKeyWidth : baseWhiteKeyWidth;
          const keyWithGap = whiteKeyWidth + gap;

          // Calculate position for this MIDI note (A0 = MIDI 21)
          const noteInOctave = (note - 21) % 12;
          const octaveFromA0 = Math.floor((note - 21) / 12);
          const whiteKeyMap = [0, 0, 1, 2, 2, 3, 3, 4, 5, 5, 6, 6];
          const whiteKeysBeforeNote = octaveFromA0 * 7 + whiteKeyMap[noteInOctave];

          const noteLeftEdge = whiteKeysBeforeNote * keyWithGap;
          const noteRightEdge = noteLeftEdge + whiteKeyWidth;

          const visibleLeft = container.scrollLeft;
          const visibleRight = visibleLeft + container.clientWidth;

          // Only scroll if the note is truly off-screen, then center it
          if (noteRightEdge < visibleLeft || noteLeftEdge > visibleRight) {
            // Center the note in the viewport
            const noteCenterX = noteLeftEdge + whiteKeyWidth / 2;
            const targetScroll = noteCenterX - container.clientWidth / 2;
            
            const maxScroll = container.scrollWidth - container.clientWidth;
            container.scrollTo({
              left: Math.max(0, Math.min(maxScroll, targetScroll)),
              behavior: 'smooth',
            });
          }
        }
        
        playNote(name, frequency);
      } else if (command === 128 || (command === 144 && velocity === 0)) {
        // Note Off
        const { name } = midiNoteToName(note);
        console.log('🎹 MIDI Note Off:', name);
        stopNote(name);
      }
    };
    
    const setupMIDI = async () => {
      try {
        if (navigator.requestMIDIAccess) {
          midiAccess = await navigator.requestMIDIAccess();
          console.log('🎹 MIDI Access granted');
          
          // Connect to all available MIDI inputs
          midiAccess.inputs.forEach((input) => {
            console.log('🎹 MIDI Input connected:', input.name);
            input.onmidimessage = handleMIDIMessage;
          });
          
          // Listen for new MIDI devices
          midiAccess.onstatechange = (event) => {
            const port = event.port as MIDIInput;
            if (port.type === 'input') {
              if (port.state === 'connected') {
                console.log('🎹 MIDI Device connected:', port.name);
                port.onmidimessage = handleMIDIMessage;
              } else {
                console.log('🎹 MIDI Device disconnected:', port.name);
              }
            }
          };
        } else {
          console.log('🎹 Web MIDI API not supported');
        }
      } catch (error) {
        console.error('🎹 MIDI Access denied:', error);
      }
    };
    
    setupMIDI();
    
    return () => {
      if (midiAccess) {
        midiAccess.inputs.forEach((input) => {
          input.onmidimessage = null;
        });
      }
    };
  }, [playNote, stopNote, isMobile, isFullScreen, dynamicKeyWidth]);

  // Cleanup on unmount - don't close shared audio context
  useEffect(() => {
    return () => {
      // Stop all synth notes but don't close the shared audio context
      if (synthRef.current) {
        synthRef.current.stopAllNotes();
      }
      // Don't close audioContext - it's shared across the app
    };
  }, []);

  // Full-screen mode when onClose is provided
  const pianoContent = <div className={isFullScreen ? "w-full h-full bg-background flex flex-col overflow-hidden" : `w-full flex flex-col ${className}`}>
      {/* Header Bar */}
      <div className="relative z-10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between px-2 sm:px-4 py-2 sm:py-3 border-b border-border bg-card backdrop-blur-sm shrink-0 cursor-move gap-2">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <h2 className="text-sm sm:text-lg font-semibold hidden sm:block">Piano</h2>
          <Select value={startOctave.toString()} onValueChange={value => setStartOctave(parseInt(value, 10))}>
            <SelectTrigger className="w-24 sm:w-32 h-8 sm:h-9 text-xs sm:text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-[100] bg-popover">
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
            <SelectContent className="z-[100] max-h-[300px] bg-popover">
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
          {onClose && <Button 
            variant="ghost" 
            size="sm" 
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onClose();
            }} 
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            className="h-7 w-7 sm:h-9 sm:w-9 p-0 ml-1 no-drag" 
            aria-label="Close piano"
          >
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>}
        </div>
      </div>

      {/* Piano Keyboard Area with 3D frame */}
      <div ref={keysContainerRef} style={{
      scrollbarWidth: 'thin',
      scrollbarColor: 'hsl(var(--primary)) hsl(var(--muted))',
      background: 'linear-gradient(to bottom, #1a1a1a 0%, #0d0d0d 100%)',
      padding: '12px 8px 8px 8px',
      boxShadow: 'inset 0 5px 15px rgba(0,0,0,0.5)'
    }} className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="relative inline-block min-w-max mx-0 py-0">
          {/* White Keys */}
          <div className="relative">
            <div className={isFullScreen ? "flex gap-0.5 h-[240px] sm:h-[384px] md:h-[480px]" : "flex gap-0.5 h-[180px] sm:h-[240px]"}>
              {whiteKeys.map((key, index) => {
              const keyName = `${key.note}${key.octave}`;
              const isActive = activeNotes.has(keyName);
              const whiteKeyWidth = isFullScreen && dynamicKeyWidth ? dynamicKeyWidth : (isMobile ? 50 : 69);
              return <button key={keyName} style={{
                width: `${whiteKeyWidth}px`,
                minWidth: `${whiteKeyWidth}px`,
                boxShadow: isActive 
                  ? 'inset 0 -2px 10px rgba(0,0,0,0.2), inset 0 2px 5px rgba(0,0,0,0.1), 0 0 20px 5px rgba(59, 130, 246, 0.6)' 
                  : '0 8px 15px rgba(0,0,0,0.3), inset -2px 0 3px rgba(0,0,0,0.1), inset 2px 0 3px rgba(255,255,255,0.8)',
                background: isActive 
                  ? 'linear-gradient(to bottom, #bfdbfe 0%, #dbeafe 10%, #eff6ff 50%, #dbeafe 100%)'
                  : 'linear-gradient(to bottom, #ffffff 0%, #f8f8f8 60%, #e8e8e8 90%, #d8d8d8 100%)',
                transform: isActive ? 'translateY(3px) scale(1.02)' : 'translateY(0) scale(1)',
                borderLeft: '1px solid rgba(0,0,0,0.08)',
                borderRight: '1px solid rgba(0,0,0,0.15)',
                borderBottom: isActive ? '2px solid #3b82f6' : '4px solid #c0c0c0',
              }} className={`cursor-pointer transition-all duration-150 flex flex-col items-center justify-end pb-2 sm:pb-4 text-[10px] sm:text-sm font-semibold select-none touch-manipulation ${index === 0 ? 'rounded-bl-lg' : ''} ${index === whiteKeys.length - 1 ? 'rounded-br-lg' : ''}`}
              onPointerDown={(e) => {
                e.preventDefault();
                playNote(keyName, key.frequency);
              }}
              onPointerUp={() => stopNote(keyName)} 
              onPointerLeave={() => {
                if (isActive) stopNote(keyName);
              }}
              onPointerCancel={() => stopNote(keyName)}>
                    <span style={{ color: '#374151' }} className="font-bold">
                      {key.note}
                      <sub className="text-[0.6em]">{key.octave}</sub>
                    </span>
                  </button>;
            })}
            </div>

            {/* Black Keys */}
            <div className="pointer-events-none absolute inset-0 top-0 h-[65%]">
              <div className="relative w-full h-full">
                {blackKeys.map(key => {
                const keyName = `${key.note}${key.octave}`;
                const isActive = activeNotes.has(keyName);
                const whiteKeyWidth = isFullScreen && dynamicKeyWidth ? dynamicKeyWidth : (isMobile ? 50 : 69);
                const blackKeyWidth = Math.floor(whiteKeyWidth * 0.58); // Standard piano ratio
                const gap = 2; // gap-0.5 = 0.125rem ≈ 2px
                // Position accounts for key width + gap between keys
                const leftPosition = key.position * (whiteKeyWidth + gap) - blackKeyWidth / 2;
                return <button key={keyName} className="absolute h-full cursor-pointer transition-all duration-150 flex items-end justify-center pb-2 sm:pb-3 text-[0.65rem] sm:text-xs font-bold pointer-events-auto select-none touch-manipulation" style={{
                  left: `${leftPosition}px`,
                  width: `${blackKeyWidth}px`,
                  minWidth: '36px',
                  maxWidth: '80px',
                  borderRadius: '0 0 6px 6px',
                  boxShadow: isActive 
                    ? 'inset 0 3px 8px rgba(0,0,0,0.6), 0 0 15px 3px rgba(59, 130, 246, 0.7)' 
                    : '0 6px 12px rgba(0,0,0,0.5), inset 0 -15px 20px rgba(50,50,50,0.3), inset 0 1px 0 rgba(255,255,255,0.15)',
                  background: isActive
                    ? 'linear-gradient(to bottom, #1e40af 0%, #2563eb 40%, #1d4ed8 100%)'
                    : 'linear-gradient(to bottom, #2d2d2d 0%, #1a1a1a 30%, #0d0d0d 70%, #1a1a1a 100%)',
                  borderLeft: '1px solid #3a3a3a',
                  borderRight: '1px solid #0a0a0a',
                  borderBottom: isActive ? '2px solid #60a5fa' : '3px solid #0a0a0a',
                  transform: isActive ? 'translateY(2px) scale(1.05)' : 'translateY(0) scale(1)',
                }}
                onPointerDown={(e) => {
                  e.preventDefault();
                  playNote(keyName, key.frequency);
                }}
                onPointerUp={() => stopNote(keyName)} 
                onPointerLeave={() => {
                  if (isActive) stopNote(keyName);
                }}
                onPointerCancel={() => stopNote(keyName)}>
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
      return createPortal(
        <div 
          className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4"
          onTouchStart={handleUserInteraction}
          onClick={handleUserInteraction}
        >
          <div 
            className="bg-background rounded-xl w-full max-w-md max-h-[80vh] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {pianoContent}
          </div>
        </div>,
        document.body
      );
    }
    
    // Desktop: Full width piano with proper key proportions
    const fullWidth = window.innerWidth - 32;
    const fullHeight = Math.min(700, window.innerHeight - 80); // Taller for proper key length
    
    return createPortal(
      <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4" onClick={(e) => {
        // Close when clicking overlay background
        if (e.target === e.currentTarget && onClose) {
          onClose();
        }
      }}>
        <div 
          className="bg-background rounded-lg shadow-2xl overflow-hidden"
          style={{ width: fullWidth, height: fullHeight }}
          onClick={(e) => e.stopPropagation()}
        >
          {pianoContent}
        </div>
      </div>,
      document.body
    );
  }
  return pianoContent;
};
