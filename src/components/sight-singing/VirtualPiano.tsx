import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX } from 'lucide-react';

interface VirtualPianoProps {
  className?: string;
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

export const VirtualPiano: React.FC<VirtualPianoProps> = ({ className = '' }) => {
  const [isPlaying, setIsPlaying] = useState<string | null>(null);
  const [volume, setVolume] = useState([0.3]);
  const [isMuted, setIsMuted] = useState(false);
  const [startOctave, setStartOctave] = useState<number>(3); // Default starts at C3
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

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
    const audioContext = await initAudioContext();
    
    if (!audioContext || audioContext.state !== 'running') {
      console.warn('AudioContext not available or not running');
      return;
    }

    // Stop any currently playing note
    stopNote();
    
    // Create oscillator and gain nodes
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    oscillator.type = 'sine';
    
    const currentVolume = isMuted ? 0 : volume[0];
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(currentVolume, audioContext.currentTime + 0.02);
    
    oscillator.start();
    
    oscillatorRef.current = oscillator;
    gainNodeRef.current = gainNode;
    setIsPlaying(noteName);
  }, [volume, isMuted, initAudioContext]);

  const stopNote = useCallback(() => {
    if (oscillatorRef.current && gainNodeRef.current && audioContextRef.current) {
      try {
        const currentTime = audioContextRef.current.currentTime;
        gainNodeRef.current.gain.linearRampToValueAtTime(0, currentTime + 0.05);
        
        setTimeout(() => {
          oscillatorRef.current?.stop();
          oscillatorRef.current = null;
          gainNodeRef.current = null;
        }, 50);
      } catch (error) {
        // Oscillator might already be stopped
        oscillatorRef.current = null;
        gainNodeRef.current = null;
      }
    }
    setIsPlaying(null);
  }, []);

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (gainNodeRef.current && audioContextRef.current) {
      const newVolume = !isMuted ? 0 : volume[0];
      gainNodeRef.current.gain.setValueAtTime(newVolume, audioContextRef.current.currentTime);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopNote();
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, [stopNote]);

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Virtual Piano</span>
          <div className="flex items-center gap-2">
            <Select value={startOctave.toString()} onValueChange={(value) => setStartOctave(parseInt(value))}>
              <SelectTrigger className="w-24 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">C1-C3</SelectItem>
                <SelectItem value="2">C2-C4</SelectItem>
                <SelectItem value="3">C3-C5</SelectItem>
                <SelectItem value="4">C4-C6</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleMute}
              className="h-8 w-8"
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
            <div className="w-20">
              <Slider
                value={volume}
                onValueChange={setVolume}
                max={1}
                min={0}
                step={0.1}
                className="w-full"
              />
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Piano Keyboard */}
        <div className="relative w-full h-32 bg-gray-100 p-2 rounded-lg overflow-x-auto">
          {/* White Keys */}
          <div className="flex h-full min-w-max">
            {whiteKeys.map((key, index) => {
              const keyName = `${key.note}${key.octave}`;
              return (
                <div
                  key={keyName}
                  className={`w-10 h-full cursor-pointer transition-all duration-100 flex items-end justify-center pb-2 text-xs font-medium select-none border-r border-gray-300 last:border-r-0 ${
                    isPlaying === keyName
                      ? "bg-blue-200 shadow-inner transform translate-y-1"
                      : "bg-white hover:bg-gray-50 shadow-md"
                  } ${index === 0 ? "rounded-l-md" : ""} ${index === whiteKeys.length - 1 ? "rounded-r-md" : ""}`}
                  style={{
                    boxShadow: isPlaying === keyName 
                      ? "inset 0 2px 4px rgba(0,0,0,0.3)" 
                      : "0 2px 4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.8)"
                  }}
                  onMouseDown={() => playNote(key.frequency, keyName)}
                  onMouseUp={stopNote}
                  onMouseLeave={stopNote}
                  onTouchStart={() => playNote(key.frequency, keyName)}
                  onTouchEnd={stopNote}
                >
                  <span className="text-gray-700 text-xs">{key.note}</span>
                </div>
              );
            })}
          </div>
          
          {/* Black Keys */}
          <div className="absolute top-2 left-2 right-2 h-20 pointer-events-none">
            {blackKeys.map((key) => {
              const keyName = `${key.note}${key.octave}`;
              const leftOffset = key.position * 40 + 16; // 40px per white key + padding
              
              return (
                <div
                  key={keyName}
                  className={`absolute w-6 h-full cursor-pointer transition-all duration-100 flex items-end justify-center pb-2 text-xs font-medium pointer-events-auto select-none ${
                    isPlaying === keyName
                      ? "bg-gray-600 shadow-inner transform translate-y-1"
                      : "bg-gray-900 hover:bg-gray-800"
                  }`}
                  style={{
                    left: `${leftOffset}px`,
                    borderRadius: "0 0 4px 4px",
                    boxShadow: isPlaying === keyName 
                      ? "inset 0 2px 4px rgba(0,0,0,0.6)" 
                      : "0 2px 6px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)"
                  }}
                  onMouseDown={() => playNote(key.frequency, keyName)}
                  onMouseUp={stopNote}
                  onMouseLeave={stopNote}
                  onTouchStart={() => playNote(key.frequency, keyName)}
                  onTouchEnd={stopNote}
                >
                  <span className="text-white text-xs">{key.note}</span>
                </div>
              );
            })}
          </div>
        </div>
        
        <div className="text-center mt-4">
          {isPlaying && (
            <div className="text-sm text-muted-foreground">
              Playing: <span className="font-semibold text-primary">{isPlaying}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};