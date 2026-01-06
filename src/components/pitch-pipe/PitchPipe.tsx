import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { unlockAudioContext, setupMobileAudioUnlock, forceUnlockAudio } from '@/utils/mobileAudioUnlock';

interface PitchPipeProps {
  className?: string;
}

// Chromatic scale C4 to C5 (13 notes)
const chromaticNotes = [
  { note: 'C4', display: 'C', frequency: 261.63, isSharp: false },
  { note: 'C#4', display: '♯♭', frequency: 277.18, isSharp: true },
  { note: 'D4', display: 'D', frequency: 293.66, isSharp: false },
  { note: 'D#4', display: '♯♭', frequency: 311.13, isSharp: true },
  { note: 'E4', display: 'E', frequency: 329.63, isSharp: false },
  { note: 'F4', display: 'F', frequency: 349.23, isSharp: false },
  { note: 'F#4', display: '♯♭', frequency: 369.99, isSharp: true },
  { note: 'G4', display: 'G', frequency: 392.00, isSharp: false },
  { note: 'G#4', display: '♯♭', frequency: 415.30, isSharp: true },
  { note: 'A4', display: 'A', frequency: 440.00, isSharp: false },
  { note: 'A#4', display: '♯♭', frequency: 466.16, isSharp: true },
  { note: 'B4', display: 'B', frequency: 493.88, isSharp: false },
  { note: 'C5', display: 'C', frequency: 523.25, isSharp: false },
];

export const PitchPipe = ({ className = '' }: PitchPipeProps) => {
  const [isPlaying, setIsPlaying] = useState<string | null>(null);
  const [volume, setVolume] = useState([0.4]);
  const [isMuted, setIsMuted] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorsRef = useRef<OscillatorNode[]>([]);
  const gainNodeRef = useRef<GainNode | null>(null);

  // Setup mobile audio unlock on mount
  useEffect(() => {
    const cleanup = setupMobileAudioUnlock();
    return cleanup;
  }, []);

  const initAudioContext = useCallback(async () => {
    try {
      forceUnlockAudio();
      const ctx = await unlockAudioContext();
      audioContextRef.current = ctx;
      return ctx;
    } catch (error) {
      console.error('Failed to initialize AudioContext:', error);
      return null;
    }
  }, []);

  // Create flute-like sound using multiple oscillators
  const startTone = useCallback(async (frequency: number, note: string) => {
    forceUnlockAudio();
    
    const audioContext = await initAudioContext();
    if (!audioContext || audioContext.state !== 'running') {
      console.warn('AudioContext not available or not running');
      return;
    }

    // Stop any existing tone
    stopTone();

    const masterGain = audioContext.createGain();
    masterGain.connect(audioContext.destination);
    
    const currentVolume = isMuted ? 0 : volume[0];
    masterGain.gain.setValueAtTime(0, audioContext.currentTime);
    masterGain.gain.linearRampToValueAtTime(currentVolume * 0.5, audioContext.currentTime + 0.08);

    // Flute-like timbre: fundamental + soft harmonics
    const harmonics = [
      { ratio: 1, gain: 1.0 },      // Fundamental
      { ratio: 2, gain: 0.3 },      // 2nd harmonic (soft)
      { ratio: 3, gain: 0.1 },      // 3rd harmonic (very soft)
    ];

    const oscillators: OscillatorNode[] = [];

    harmonics.forEach(({ ratio, gain: harmonicGain }) => {
      const osc = audioContext.createOscillator();
      const oscGain = audioContext.createGain();
      
      osc.type = 'sine';
      osc.frequency.value = frequency * ratio;
      oscGain.gain.value = harmonicGain;
      
      osc.connect(oscGain);
      oscGain.connect(masterGain);
      osc.start();
      oscillators.push(osc);
    });

    // Add slight vibrato for more realism
    const lfo = audioContext.createOscillator();
    const lfoGain = audioContext.createGain();
    lfo.type = 'sine';
    lfo.frequency.value = 5; // 5Hz vibrato
    lfoGain.gain.value = 2; // 2Hz pitch deviation
    lfo.connect(lfoGain);
    oscillators.forEach(osc => lfoGain.connect(osc.frequency));
    lfo.start();
    oscillators.push(lfo);

    oscillatorsRef.current = oscillators;
    gainNodeRef.current = masterGain;
    setIsPlaying(note);
  }, [volume, isMuted, initAudioContext]);

  const stopTone = useCallback(() => {
    if (gainNodeRef.current && audioContextRef.current) {
      try {
        gainNodeRef.current.gain.linearRampToValueAtTime(0, audioContextRef.current.currentTime + 0.08);
        setTimeout(() => {
          oscillatorsRef.current.forEach(osc => {
            try { osc.stop(); } catch {}
          });
          oscillatorsRef.current = [];
          gainNodeRef.current = null;
        }, 100);
      } catch {
        oscillatorsRef.current = [];
        gainNodeRef.current = null;
      }
    }
    setIsPlaying(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTone();
    };
  }, [stopTone]);

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (gainNodeRef.current && audioContextRef.current) {
      const newVolume = !isMuted ? 0 : volume[0] * 0.5;
      gainNodeRef.current.gain.setValueAtTime(newVolume, audioContextRef.current.currentTime);
    }
  };

  const handleVolumeChange = (newVolume: number[]) => {
    setVolume(newVolume);
    if (gainNodeRef.current && audioContextRef.current && !isMuted) {
      gainNodeRef.current.gain.setValueAtTime(newVolume[0] * 0.5, audioContextRef.current.currentTime);
    }
  };

  // Handle touch/mouse events for press-and-hold
  const handleNoteStart = (note: typeof chromaticNotes[0]) => (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    startTone(note.frequency, note.note);
  };

  const handleNoteEnd = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    stopTone();
  };

  // Calculate position for each note around the circle
  const getPosition = (index: number, total: number) => {
    // Start from top (12 o'clock) and go clockwise
    const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
    const radius = 42; // percentage from center
    return {
      x: 50 + radius * Math.cos(angle),
      y: 50 + radius * Math.sin(angle),
      rotation: (index / total) * 360 - 90 + 90, // Rotate text to be readable
    };
  };

  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      {/* Circular Pitch Pipe */}
      <div 
        className="relative w-72 h-72 sm:w-80 sm:h-80 rounded-full shadow-2xl select-none"
        style={{
          background: 'radial-gradient(circle at 30% 30%, #3a3a3a 0%, #1a1a1a 50%, #0f0f0f 100%)',
          boxShadow: 'inset 0 2px 20px rgba(0,0,0,0.5), 0 8px 32px rgba(0,0,0,0.4), 0 0 0 4px #2a2a2a',
        }}
      >
        {/* Center decoration */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full flex items-center justify-center"
          style={{
            background: 'radial-gradient(circle at 40% 40%, #3a3a3a 0%, #1a1a1a 100%)',
            boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.6), 0 1px 2px rgba(255,255,255,0.1)',
          }}
        >
          <div className="text-center">
            <div className="text-[10px] text-gray-400 font-medium tracking-wider">CHROMATIC</div>
            <div className="text-[10px] text-gray-400 font-medium tracking-wider">PITCH PIPE</div>
            <div className="text-2xl text-gray-300 mt-1">𝄞</div>
          </div>
        </div>

        {/* Center bolt */}
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full z-10"
          style={{
            background: 'linear-gradient(145deg, #4a4a4a, #2a2a2a)',
            boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.2), 0 2px 4px rgba(0,0,0,0.5)',
          }}
        />

        {/* Note buttons arranged in a circle */}
        {chromaticNotes.map((note, index) => {
          const pos = getPosition(index, chromaticNotes.length);
          const isActive = isPlaying === note.note;
          
          return (
            <button
              key={note.note}
              onMouseDown={handleNoteStart(note)}
              onMouseUp={handleNoteEnd}
              onMouseLeave={handleNoteEnd}
              onTouchStart={handleNoteStart(note)}
              onTouchEnd={handleNoteEnd}
              onTouchCancel={handleNoteEnd}
              className="absolute flex items-center justify-center transition-all duration-75 touch-none"
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                transform: `translate(-50%, -50%)`,
                width: note.isSharp ? '32px' : '36px',
                height: note.isSharp ? '32px' : '36px',
              }}
            >
              <span
                className={`font-bold transition-all duration-75 ${
                  note.isSharp ? 'text-xs' : 'text-base'
                } ${
                  isActive 
                    ? 'text-amber-400 scale-125 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]' 
                    : 'text-gray-200 hover:text-white'
                }`}
                style={{
                  textShadow: isActive 
                    ? '0 0 10px rgba(251,191,36,0.8)' 
                    : '0 1px 2px rgba(0,0,0,0.8)',
                }}
              >
                {note.isSharp ? (
                  <span className="flex flex-col items-center leading-none">
                    <span className="text-[10px]">♯↑♭</span>
                  </span>
                ) : (
                  note.note
                )}
              </span>
            </button>
          );
        })}

        {/* Decorative ring */}
        <div 
          className="absolute inset-4 rounded-full pointer-events-none"
          style={{
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        />
        <div 
          className="absolute inset-16 rounded-full pointer-events-none"
          style={{
            border: '1px solid rgba(255,255,255,0.05)',
          }}
        />
      </div>

      {/* Volume Controls */}
      <div className="flex items-center gap-3 bg-card/50 px-4 py-2 rounded-full border border-border">
        <button
          onClick={toggleMute}
          className="p-1.5 hover:bg-muted rounded-full transition-colors"
        >
          {isMuted ? <VolumeX className="h-4 w-4 text-muted-foreground" /> : <Volume2 className="h-4 w-4" />}
        </button>
        <Slider
          value={volume}
          onValueChange={handleVolumeChange}
          max={1}
          min={0}
          step={0.1}
          className="w-24"
        />
      </div>

      {/* Instructions */}
      <p className="text-xs text-muted-foreground text-center">
        Press and hold any note to play
      </p>
    </div>
  );
};
