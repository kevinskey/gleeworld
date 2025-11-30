import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX, X } from 'lucide-react';

interface VirtualPianoProps {
  className?: string;
  onClose?: () => void;
}

// Base frequencies for one octave starting at C4 (middle C)
const baseWhiteKeysPerOctave = [
  { note: 'C', baseFrequency: 261.63 },
  { note: 'D', baseFrequency: 293.66 },
  { note: 'E', baseFrequency: 329.63 },
  { note: 'F', baseFrequency: 349.23 },
  { note: 'G', baseFrequency: 392.0 },
  { note: 'A', baseFrequency: 440.0 },
  { note: 'B', baseFrequency: 493.88 },
];

const baseBlackKeysPerOctave = [
  { note: 'C#', baseFrequency: 277.18, positionInOctave: 0.5 },
  { note: 'D#', baseFrequency: 311.13, positionInOctave: 1.5 },
  { note: 'F#', baseFrequency: 369.99, positionInOctave: 3.5 },
  { note: 'G#', baseFrequency: 415.3, positionInOctave: 4.5 },
  { note: 'A#', baseFrequency: 466.16, positionInOctave: 5.5 },
];

// Generate 3 octaves of keys based on starting octave
const generateKeys = (startOctave: number) => {
  const whiteKeys: { note: string; octave: number; frequency: number }[] = [];
  const blackKeys: { note: string; octave: number; frequency: number; position: number }[] = [];

  // Generate 3 full octaves
  for (let octaveOffset = 0; octaveOffset < 3; octaveOffset++) {
    const currentOctave = startOctave + octaveOffset;
    const octaveMultiplier = Math.pow(2, currentOctave - 4); // 4 is base (C4)
    const whiteKeyOffset = octaveOffset * 7; // 7 white keys per octave

    baseWhiteKeysPerOctave.forEach((key) => {
      whiteKeys.push({
        note: key.note,
        octave: currentOctave,
        frequency: key.baseFrequency * octaveMultiplier,
      });
    });

    baseBlackKeysPerOctave.forEach((key) => {
      blackKeys.push({
        note: key.note,
        octave: currentOctave,
        frequency: key.baseFrequency * octaveMultiplier,
        position: whiteKeyOffset + key.positionInOctave,
      });
    });
  }

  return { whiteKeys, blackKeys };
};

export const VirtualPiano: React.FC<VirtualPianoProps> = ({ className = '', onClose }) => {
  console.log('🎹 VirtualPiano mounted (full-screen):', { className, hasOnClose: !!onClose });
  const [activeNotes, setActiveNotes] = useState<Set<string>>(new Set());
  const [volume, setVolume] = useState([0.4]);
  const [isMuted, setIsMuted] = useState(false);
  const [startOctave, setStartOctave] = useState<number>(3); // Default starts at C3
  const audioContextRef = useRef<AudioContext | null>(null);
  const activeOscillatorsRef = useRef<
    Map<string, { oscillator: OscillatorNode; gainNode: GainNode }>
  >(new Map());

  // Generate 3 octaves starting from selected octave
  const { whiteKeys, blackKeys } = generateKeys(startOctave);

  const initAudioContext = useCallback(async () => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      console.log('🎹 Creating new AudioContext for VirtualPiano');
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    // Always try to resume if suspended (required for mobile browsers)
    if (audioContextRef.current.state === 'suspended') {
      try {
        console.log('🔊 Attempting to resume AudioContext...');
        await audioContextRef.current.resume();
        console.log('✅ AudioContext resumed, state:', audioContextRef.current.state);
      } catch (error) {
        console.error('❌ Failed to resume AudioContext:', error);
        // Try creating fresh context
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        await audioContextRef.current.resume();
      }
    }

    console.log('🎹 AudioContext ready, state:', audioContextRef.current.state);
    return audioContextRef.current;
  }, []);

  const playNote = useCallback(
    async (frequency: number, noteName: string) => {
      if (activeOscillatorsRef.current.has(noteName)) return; // Already playing

      const audioContext = await initAudioContext();
      if (!audioContext || audioContext.state !== 'running') return;

      // Create oscillator and gain nodes with ADSR envelope
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
      oscillator.type = 'triangle'; // Warmer sound than sine

      const currentVolume = isMuted ? 0 : volume[0];
      const now = audioContext.currentTime;

      // ADSR envelope for smoother sound
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(currentVolume * 0.8, now + 0.01); // Attack
      gainNode.gain.linearRampToValueAtTime(currentVolume * 0.6, now + 0.05); // Decay
      gainNode.gain.setValueAtTime(currentVolume * 0.6, now + 0.05); // Sustain

      oscillator.start();

      activeOscillatorsRef.current.set(noteName, { oscillator, gainNode });
      setActiveNotes((prev) => new Set(prev).add(noteName));
    },
    [volume, isMuted, initAudioContext],
  );

  const stopNote = useCallback((noteName: string) => {
    const nodes = activeOscillatorsRef.current.get(noteName);
    if (!nodes || !audioContextRef.current) return;

    try {
      const now = audioContextRef.current.currentTime;
      // Release envelope
      nodes.gainNode.gain.cancelScheduledValues(now);
      nodes.gainNode.gain.setValueAtTime(nodes.gainNode.gain.value, now);
      nodes.gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

      setTimeout(() => {
        nodes.oscillator.stop();
        activeOscillatorsRef.current.delete(noteName);
      }, 150);
    } catch (error) {
      activeOscillatorsRef.current.delete(noteName);
    }

    setActiveNotes((prev) => {
      const next = new Set(prev);
      next.delete(noteName);
      return next;
    });
  }, []);

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (audioContextRef.current) {
      const newVolume = !isMuted ? 0 : volume[0];
      activeOscillatorsRef.current.forEach(({ gainNode }) => {
        gainNode.gain.setValueAtTime(newVolume, audioContextRef.current!.currentTime);
      });
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      activeOscillatorsRef.current.forEach((nodes) => {
        try {
          nodes.oscillator.stop();
        } catch (e) {}
      });
      activeOscillatorsRef.current.clear();
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  return (
    <div className={`fixed inset-0 z-[9999] bg-background flex flex-col ${className}`}>
      {/* Header Bar */}
      <div className="relative z-10 flex items-center justify-between px-4 py-3 border-b border-border bg-card backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">Virtual Piano</h2>
          <Select
            value={startOctave.toString()}
            onValueChange={(value) => setStartOctave(parseInt(value, 10))}
          >
            <SelectTrigger className="w-28 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-[110]">
              <SelectItem value="1">C1-C3</SelectItem>
              <SelectItem value="2">C2-C4</SelectItem>
              <SelectItem value="3">C3-C5</SelectItem>
              <SelectItem value="4">C4-C6</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={toggleMute} className="h-9 w-9">
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
          <div className="w-24 hidden sm:block">
            <Slider
              value={volume}
              onValueChange={setVolume}
              max={1}
              min={0}
              step={0.1}
              className="w-full"
            />
          </div>
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-9 w-9"
              aria-label="Close piano"
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>

      {/* Piano Keyboard Area */}
      <div className="flex-1 flex items-stretch justify-center bg-gradient-to-b from-muted/30 to-muted/10 overflow-auto">
        <div className="relative w-full max-w-6xl mx-auto py-4 px-2 sm:px-4">
          {/* White Keys */}
          <div className="relative w-full">
            <div className="flex w-full justify-center gap-0.5 h-[260px] sm:h-[320px] md:h-[360px]">
              {whiteKeys.map((key, index) => {
                const keyName = `${key.note}${key.octave}`;
                const isActive = activeNotes.has(keyName);
                return (
                  <button
                    key={keyName}
                    className={`flex-1 min-w-[55px] sm:min-w-[65px] landscape:min-w-[70px] max-w-[100px] cursor-pointer transition-all duration-75 flex flex-col items-center justify-end pb-3 sm:pb-4 text-xs sm:text-sm font-semibold select-none border-r-2 border-gray-300/50 last:border-r-0 touch-manipulation ${
                      isActive
                        ? 'bg-primary/30 shadow-inner scale-[0.98]'
                        : 'bg-white hover:bg-gray-50 shadow-lg active:bg-primary/20 active:scale-[0.98]'
                    } ${index === 0 ? 'rounded-l-xl' : ''} ${index === whiteKeys.length - 1 ? 'rounded-r-xl' : ''}`}
                    style={{
                      boxShadow: isActive
                        ? 'inset 0 6px 12px rgba(0,0,0,0.35)'
                        : '0 6px 12px rgba(0,0,0,0.2), inset 0 3px 0 rgba(255,255,255,0.9)',
                    }}
                    onMouseDown={() => playNote(key.frequency, keyName)}
                    onMouseUp={() => stopNote(keyName)}
                    onMouseLeave={() => stopNote(keyName)}
                    onTouchStart={(e) => {
                      e.preventDefault();
                      playNote(key.frequency, keyName);
                    }}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      stopNote(keyName);
                    }}
                 >
                    <span className="text-gray-700 font-bold">
                      {key.note}
                      <sub className="text-[0.6em]">{key.octave}</sub>
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Black Keys */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[60%] flex justify-center">
              <div className="relative w-full">
                {blackKeys.map((key) => {
                  const keyName = `${key.note}${key.octave}`;
                  const isActive = activeNotes.has(keyName);
                  const whiteKeyWidth = 100 / whiteKeys.length;
                  const blackKeyWidth = Math.min(whiteKeyWidth * 0.65, 8);
                  const leftPercentage = (key.position / whiteKeys.length) * 100 - blackKeyWidth / 2;

                  return (
                    <button
                      key={keyName}
                      className={`absolute h-full cursor-pointer transition-all duration-75 flex items-end justify-center pb-2 sm:pb-3 text-[0.65rem] sm:text-xs font-bold pointer-events-auto select-none touch-manipulation ${
                        isActive
                          ? 'bg-gray-700 shadow-inner scale-[0.96]'
                          : 'bg-gray-900 hover:bg-gray-800 active:bg-gray-700 active:scale-[0.96]'
                      }`}
                      style={{
                        left: `${leftPercentage}%`,
                        width: `${blackKeyWidth}%`,
                        minWidth: '36px',
                        maxWidth: '60px',
                        borderRadius: '0 0 8px 8px',
                        boxShadow: isActive
                          ? 'inset 0 5px 10px rgba(0,0,0,0.9)'
                          : '0 5px 12px rgba(0,0,0,0.7), inset 0 2px 0 rgba(255,255,255,0.2)',
                      }}
                      onMouseDown={() => playNote(key.frequency, keyName)}
                      onMouseUp={() => stopNote(keyName)}
                      onMouseLeave={() => stopNote(keyName)}
                      onTouchStart={(e) => {
                        e.preventDefault();
                        playNote(key.frequency, keyName);
                      }}
                      onTouchEnd={(e) => {
                        e.preventDefault();
                        stopNote(keyName);
                      }}
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
    </div>
  );
};
