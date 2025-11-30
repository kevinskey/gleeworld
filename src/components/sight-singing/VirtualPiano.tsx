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
  { note: 'G', baseFrequency: 392.00 },
  { note: 'A', baseFrequency: 440.00 },
  { note: 'B', baseFrequency: 493.88 },
];

const baseBlackKeysPerOctave = [
  { note: 'C#', baseFrequency: 277.18, positionInOctave: 0.5 },
  { note: 'D#', baseFrequency: 311.13, positionInOctave: 1.5 },
  { note: 'F#', baseFrequency: 369.99, positionInOctave: 3.5 },
  { note: 'G#', baseFrequency: 415.30, positionInOctave: 4.5 },
  { note: 'A#', baseFrequency: 466.16, positionInOctave: 5.5 },
];

// Generate 3 octaves of keys based on starting octave
const generateKeys = (startOctave: number) => {
  const whiteKeys = [];
  const blackKeys = [];
  
  // Generate 3 full octaves
  for (let octaveOffset = 0; octaveOffset < 3; octaveOffset++) {
    const currentOctave = startOctave + octaveOffset;
    const octaveMultiplier = Math.pow(2, currentOctave - 4); // 4 is base (C4)
    const whiteKeyOffset = octaveOffset * 7; // 7 white keys per octave
    
    baseWhiteKeysPerOctave.forEach((key, index) => {
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
  const [activeNotes, setActiveNotes] = useState<Set<string>>(new Set());
  const [volume, setVolume] = useState([0.4]);
  const [isMuted, setIsMuted] = useState(false);
  const [startOctave, setStartOctave] = useState<number>(3); // Default starts at C3
  const audioContextRef = useRef<AudioContext | null>(null);
  const activeOscillatorsRef = useRef<Map<string, { oscillator: OscillatorNode; gainNode: GainNode }>>(new Map());

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

  const playNote = useCallback(async (frequency: number, noteName: string) => {
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
    setActiveNotes(prev => new Set(prev).add(noteName));
  }, [volume, isMuted, initAudioContext]);

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
    
    setActiveNotes(prev => {
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
    <div className={`fixed inset-0 z-50 bg-background flex flex-col ${className}`}>
      {/* Header Bar */}
      <div className="flex items-center justify-between p-3 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">Virtual Piano</h2>
          <Select value={startOctave.toString()} onValueChange={(value) => setStartOctave(parseInt(value))}>
            <SelectTrigger className="w-28 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">C1-C3</SelectItem>
              <SelectItem value="2">C2-C4</SelectItem>
              <SelectItem value="3">C3-C5</SelectItem>
              <SelectItem value="4">C4-C6</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleMute}
            className="h-9 w-9"
          >
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
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>

      {/* Piano Keyboard - Full Screen */}
      <div className="flex-1 flex items-center justify-center bg-muted/20 overflow-hidden">
        <div className="relative w-full h-full max-h-[400px] landscape:max-h-[70vh] flex items-center justify-center">
          <div className="relative w-full max-w-[95vw] landscape:max-w-[90vw] h-48 landscape:h-[60vh] landscape:max-h-64">
            {/* White Keys */}
            <div className="flex h-full w-full justify-center">
              {whiteKeys.map((key, index) => {
                const keyName = `${key.note}${key.octave}`;
                const isActive = activeNotes.has(keyName);
                return (
                  <div
                    key={keyName}
                    className={`flex-1 min-w-[50px] max-w-[80px] cursor-pointer transition-all duration-75 flex items-end justify-center pb-4 text-sm font-semibold select-none border-r-2 border-gray-300 last:border-r-0 ${
                      isActive
                        ? "bg-primary/20 shadow-inner transform translate-y-1"
                        : "bg-white hover:bg-gray-50 shadow-lg active:bg-primary/10"
                    } ${index === 0 ? "rounded-l-lg" : ""} ${index === whiteKeys.length - 1 ? "rounded-r-lg" : ""}`}
                    style={{
                      boxShadow: isActive 
                        ? "inset 0 4px 8px rgba(0,0,0,0.3)" 
                        : "0 4px 8px rgba(0,0,0,0.15), inset 0 2px 0 rgba(255,255,255,0.9)"
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
                    <span className="text-gray-700">{key.note}{key.octave}</span>
                  </div>
                );
              })}
            </div>
            
            {/* Black Keys */}
            <div className="absolute inset-x-0 top-0 h-[60%] pointer-events-none flex justify-center">
              <div className="relative w-full max-w-full">
                {blackKeys.map((key) => {
                  const keyName = `${key.note}${key.octave}`;
                  const isActive = activeNotes.has(keyName);
                  const whiteKeyWidth = 100 / whiteKeys.length;
                  const blackKeyWidth = whiteKeyWidth * 0.65;
                  const leftPercentage = (key.position / whiteKeys.length) * 100 - (blackKeyWidth / 2);
                  
                  return (
                    <div
                      key={keyName}
                      className={`absolute h-full cursor-pointer transition-all duration-75 flex items-end justify-center pb-3 text-xs font-semibold pointer-events-auto select-none ${
                        isActive
                          ? "bg-gray-700 shadow-inner transform translate-y-1"
                          : "bg-gray-900 hover:bg-gray-800 active:bg-gray-700"
                      }`}
                      style={{
                        left: `${leftPercentage}%`,
                        width: `${blackKeyWidth}%`,
                        minWidth: '32px',
                        maxWidth: '52px',
                        borderRadius: "0 0 6px 6px",
                        boxShadow: isActive 
                          ? "inset 0 4px 8px rgba(0,0,0,0.8)" 
                          : "0 4px 10px rgba(0,0,0,0.6), inset 0 2px 0 rgba(255,255,255,0.15)"
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
                      <span className="text-white text-xs">{key.note}</span>
                    </div>
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