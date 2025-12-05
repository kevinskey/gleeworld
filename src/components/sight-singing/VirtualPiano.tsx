import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Rnd } from 'react-rnd';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX, X, Loader2 } from 'lucide-react';
import { SoundfontPlayer } from '@/utils/soundfontLoader';
import { unlockAudioContext, setupMobileAudioUnlock } from '@/utils/mobileAudioUnlock';
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

// General MIDI Instrument List (128 instruments)
const GM_INSTRUMENTS = [
// Piano (1-8)
{
  id: 0,
  name: 'Acoustic Grand Piano',
  category: 'Piano'
}, {
  id: 1,
  name: 'Bright Acoustic Piano',
  category: 'Piano'
}, {
  id: 2,
  name: 'Electric Grand Piano',
  category: 'Piano'
}, {
  id: 3,
  name: 'Honky-tonk Piano',
  category: 'Piano'
}, {
  id: 4,
  name: 'Electric Piano 1',
  category: 'Piano'
}, {
  id: 5,
  name: 'Electric Piano 2',
  category: 'Piano'
}, {
  id: 6,
  name: 'Harpsichord',
  category: 'Piano'
}, {
  id: 7,
  name: 'Clavinet',
  category: 'Piano'
},
// Chromatic Percussion (9-16)
{
  id: 8,
  name: 'Celesta',
  category: 'Chromatic Percussion'
}, {
  id: 9,
  name: 'Glockenspiel',
  category: 'Chromatic Percussion'
}, {
  id: 10,
  name: 'Music Box',
  category: 'Chromatic Percussion'
}, {
  id: 11,
  name: 'Vibraphone',
  category: 'Chromatic Percussion'
}, {
  id: 12,
  name: 'Marimba',
  category: 'Chromatic Percussion'
}, {
  id: 13,
  name: 'Xylophone',
  category: 'Chromatic Percussion'
}, {
  id: 14,
  name: 'Tubular Bells',
  category: 'Chromatic Percussion'
}, {
  id: 15,
  name: 'Dulcimer',
  category: 'Chromatic Percussion'
},
// Organ (17-24)
{
  id: 16,
  name: 'Drawbar Organ',
  category: 'Organ'
}, {
  id: 17,
  name: 'Percussive Organ',
  category: 'Organ'
}, {
  id: 18,
  name: 'Rock Organ',
  category: 'Organ'
}, {
  id: 19,
  name: 'Church Organ',
  category: 'Organ'
}, {
  id: 20,
  name: 'Reed Organ',
  category: 'Organ'
}, {
  id: 21,
  name: 'Accordion',
  category: 'Organ'
}, {
  id: 22,
  name: 'Harmonica',
  category: 'Organ'
}, {
  id: 23,
  name: 'Tango Accordion',
  category: 'Organ'
},
// Guitar (25-32)
{
  id: 24,
  name: 'Acoustic Guitar (nylon)',
  category: 'Guitar'
}, {
  id: 25,
  name: 'Acoustic Guitar (steel)',
  category: 'Guitar'
}, {
  id: 26,
  name: 'Electric Guitar (jazz)',
  category: 'Guitar'
}, {
  id: 27,
  name: 'Electric Guitar (clean)',
  category: 'Guitar'
}, {
  id: 28,
  name: 'Electric Guitar (muted)',
  category: 'Guitar'
}, {
  id: 29,
  name: 'Overdriven Guitar',
  category: 'Guitar'
}, {
  id: 30,
  name: 'Distortion Guitar',
  category: 'Guitar'
}, {
  id: 31,
  name: 'Guitar Harmonics',
  category: 'Guitar'
},
// Bass (33-40)
{
  id: 32,
  name: 'Acoustic Bass',
  category: 'Bass'
}, {
  id: 33,
  name: 'Electric Bass (finger)',
  category: 'Bass'
}, {
  id: 34,
  name: 'Electric Bass (pick)',
  category: 'Bass'
}, {
  id: 35,
  name: 'Fretless Bass',
  category: 'Bass'
}, {
  id: 36,
  name: 'Slap Bass 1',
  category: 'Bass'
}, {
  id: 37,
  name: 'Slap Bass 2',
  category: 'Bass'
}, {
  id: 38,
  name: 'Synth Bass 1',
  category: 'Bass'
}, {
  id: 39,
  name: 'Synth Bass 2',
  category: 'Bass'
},
// Strings (41-48)
{
  id: 40,
  name: 'Violin',
  category: 'Strings'
}, {
  id: 41,
  name: 'Viola',
  category: 'Strings'
}, {
  id: 42,
  name: 'Cello',
  category: 'Strings'
}, {
  id: 43,
  name: 'Contrabass',
  category: 'Strings'
}, {
  id: 44,
  name: 'Tremolo Strings',
  category: 'Strings'
}, {
  id: 45,
  name: 'Pizzicato Strings',
  category: 'Strings'
}, {
  id: 46,
  name: 'Orchestral Harp',
  category: 'Strings'
}, {
  id: 47,
  name: 'Timpani',
  category: 'Strings'
},
// Ensemble (49-56)
{
  id: 48,
  name: 'String Ensemble 1',
  category: 'Ensemble'
}, {
  id: 49,
  name: 'String Ensemble 2',
  category: 'Ensemble'
}, {
  id: 50,
  name: 'Synth Strings 1',
  category: 'Ensemble'
}, {
  id: 51,
  name: 'Synth Strings 2',
  category: 'Ensemble'
}, {
  id: 52,
  name: 'Choir Aahs',
  category: 'Ensemble'
}, {
  id: 53,
  name: 'Voice Oohs',
  category: 'Ensemble'
}, {
  id: 54,
  name: 'Synth Voice',
  category: 'Ensemble'
}, {
  id: 55,
  name: 'Orchestra Hit',
  category: 'Ensemble'
},
// Brass (57-64)
{
  id: 56,
  name: 'Trumpet',
  category: 'Brass'
}, {
  id: 57,
  name: 'Trombone',
  category: 'Brass'
}, {
  id: 58,
  name: 'Tuba',
  category: 'Brass'
}, {
  id: 59,
  name: 'Muted Trumpet',
  category: 'Brass'
}, {
  id: 60,
  name: 'French Horn',
  category: 'Brass'
}, {
  id: 61,
  name: 'Brass Section',
  category: 'Brass'
}, {
  id: 62,
  name: 'Synth Brass 1',
  category: 'Brass'
}, {
  id: 63,
  name: 'Synth Brass 2',
  category: 'Brass'
},
// Reed (65-72)
{
  id: 64,
  name: 'Soprano Sax',
  category: 'Reed'
}, {
  id: 65,
  name: 'Alto Sax',
  category: 'Reed'
}, {
  id: 66,
  name: 'Tenor Sax',
  category: 'Reed'
}, {
  id: 67,
  name: 'Baritone Sax',
  category: 'Reed'
}, {
  id: 68,
  name: 'Oboe',
  category: 'Reed'
}, {
  id: 69,
  name: 'English Horn',
  category: 'Reed'
}, {
  id: 70,
  name: 'Bassoon',
  category: 'Reed'
}, {
  id: 71,
  name: 'Clarinet',
  category: 'Reed'
},
// Pipe (73-80)
{
  id: 72,
  name: 'Piccolo',
  category: 'Pipe'
}, {
  id: 73,
  name: 'Flute',
  category: 'Pipe'
}, {
  id: 74,
  name: 'Recorder',
  category: 'Pipe'
}, {
  id: 75,
  name: 'Pan Flute',
  category: 'Pipe'
}, {
  id: 76,
  name: 'Blown Bottle',
  category: 'Pipe'
}, {
  id: 77,
  name: 'Shakuhachi',
  category: 'Pipe'
}, {
  id: 78,
  name: 'Whistle',
  category: 'Pipe'
}, {
  id: 79,
  name: 'Ocarina',
  category: 'Pipe'
},
// Synth Lead (81-88)
{
  id: 80,
  name: 'Lead 1 (square)',
  category: 'Synth Lead'
}, {
  id: 81,
  name: 'Lead 2 (sawtooth)',
  category: 'Synth Lead'
}, {
  id: 82,
  name: 'Lead 3 (calliope)',
  category: 'Synth Lead'
}, {
  id: 83,
  name: 'Lead 4 (chiff)',
  category: 'Synth Lead'
}, {
  id: 84,
  name: 'Lead 5 (charang)',
  category: 'Synth Lead'
}, {
  id: 85,
  name: 'Lead 6 (voice)',
  category: 'Synth Lead'
}, {
  id: 86,
  name: 'Lead 7 (fifths)',
  category: 'Synth Lead'
}, {
  id: 87,
  name: 'Lead 8 (bass + lead)',
  category: 'Synth Lead'
},
// Synth Pad (89-96)
{
  id: 88,
  name: 'Pad 1 (new age)',
  category: 'Synth Pad'
}, {
  id: 89,
  name: 'Pad 2 (warm)',
  category: 'Synth Pad'
}, {
  id: 90,
  name: 'Pad 3 (polysynth)',
  category: 'Synth Pad'
}, {
  id: 91,
  name: 'Pad 4 (choir)',
  category: 'Synth Pad'
}, {
  id: 92,
  name: 'Pad 5 (bowed)',
  category: 'Synth Pad'
}, {
  id: 93,
  name: 'Pad 6 (metallic)',
  category: 'Synth Pad'
}, {
  id: 94,
  name: 'Pad 7 (halo)',
  category: 'Synth Pad'
}, {
  id: 95,
  name: 'Pad 8 (sweep)',
  category: 'Synth Pad'
},
// Synth Effects (97-104)
{
  id: 96,
  name: 'FX 1 (rain)',
  category: 'Synth Effects'
}, {
  id: 97,
  name: 'FX 2 (soundtrack)',
  category: 'Synth Effects'
}, {
  id: 98,
  name: 'FX 3 (crystal)',
  category: 'Synth Effects'
}, {
  id: 99,
  name: 'FX 4 (atmosphere)',
  category: 'Synth Effects'
}, {
  id: 100,
  name: 'FX 5 (brightness)',
  category: 'Synth Effects'
}, {
  id: 101,
  name: 'FX 6 (goblins)',
  category: 'Synth Effects'
}, {
  id: 102,
  name: 'FX 7 (echoes)',
  category: 'Synth Effects'
}, {
  id: 103,
  name: 'FX 8 (sci-fi)',
  category: 'Synth Effects'
},
// Ethnic (105-112)
{
  id: 104,
  name: 'Sitar',
  category: 'Ethnic'
}, {
  id: 105,
  name: 'Banjo',
  category: 'Ethnic'
}, {
  id: 106,
  name: 'Shamisen',
  category: 'Ethnic'
}, {
  id: 107,
  name: 'Koto',
  category: 'Ethnic'
}, {
  id: 108,
  name: 'Kalimba',
  category: 'Ethnic'
}, {
  id: 109,
  name: 'Bag pipe',
  category: 'Ethnic'
}, {
  id: 110,
  name: 'Fiddle',
  category: 'Ethnic'
}, {
  id: 111,
  name: 'Shanai',
  category: 'Ethnic'
},
// Percussive (113-120)
{
  id: 112,
  name: 'Tinkle Bell',
  category: 'Percussive'
}, {
  id: 113,
  name: 'Agogo',
  category: 'Percussive'
}, {
  id: 114,
  name: 'Steel Drums',
  category: 'Percussive'
}, {
  id: 115,
  name: 'Woodblock',
  category: 'Percussive'
}, {
  id: 116,
  name: 'Taiko Drum',
  category: 'Percussive'
}, {
  id: 117,
  name: 'Melodic Tom',
  category: 'Percussive'
}, {
  id: 118,
  name: 'Synth Drum',
  category: 'Percussive'
}, {
  id: 119,
  name: 'Reverse Cymbal',
  category: 'Percussive'
},
// Sound Effects (121-128)
{
  id: 120,
  name: 'Guitar Fret Noise',
  category: 'Sound Effects'
}, {
  id: 121,
  name: 'Breath Noise',
  category: 'Sound Effects'
}, {
  id: 122,
  name: 'Seashore',
  category: 'Sound Effects'
}, {
  id: 123,
  name: 'Bird Tweet',
  category: 'Sound Effects'
}, {
  id: 124,
  name: 'Telephone Ring',
  category: 'Sound Effects'
}, {
  id: 125,
  name: 'Helicopter',
  category: 'Sound Effects'
}, {
  id: 126,
  name: 'Applause',
  category: 'Sound Effects'
}, {
  id: 127,
  name: 'Gunshot',
  category: 'Sound Effects'
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
  const [startOctave, setStartOctave] = useState<number>(3); // Default starts at C3
  const [pianoSize, setPianoSize] = useState({
    width: 900,
    height: 600
  });
  const [pianoPosition, setPianoPosition] = useState({ x: 0, y: 0 });
  
  // Center piano on mount
  useEffect(() => {
    const centerX = Math.max(0, (window.innerWidth - pianoSize.width) / 2);
    const centerY = Math.max(0, (window.innerHeight - pianoSize.height) / 2);
    setPianoPosition({ x: centerX, y: centerY });
  }, []);
  const [selectedInstrument, setSelectedInstrument] = useState<number>(0);
  const [isMobile, setIsMobile] = useState(false);
  const [isLoadingSoundfont, setIsLoadingSoundfont] = useState(false);
  const [soundfontReady, setSoundfontReady] = useState(false);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const keysContainerRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const soundfontPlayerRef = useRef<SoundfontPlayer | null>(null);
  const activeOscillatorsRef = useRef<Map<string, {
    oscillators: OscillatorNode[];
    gainNode: GainNode;
  }>>(new Map());

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

      // Initialize soundfont player if not already
      if (!soundfontPlayerRef.current && audioContextRef.current) {
        soundfontPlayerRef.current = new SoundfontPlayer(audioContextRef.current);
      }
      return audioContextRef.current;
    } catch (error) {
      console.error('❌ Failed to initialize AudioContext:', error);
      return null;
    }
  }, [audioUnlocked]);

  // Handle touch/click to unlock audio on mobile (must be user-initiated)
  const handleUserInteraction = useCallback(async () => {
    if (!audioUnlocked) {
      await initAudioContext();
    }
  }, [audioUnlocked, initAudioContext]);

  // Load soundfont when instrument changes
  useEffect(() => {
    const loadSoundfont = async () => {
      const audioContext = await initAudioContext();
      if (!audioContext || !soundfontPlayerRef.current) return;
      setIsLoadingSoundfont(true);
      setSoundfontReady(false);
      try {
        const success = await soundfontPlayerRef.current.loadInstrument(selectedInstrument);
        setSoundfontReady(success);
        if (success) {
          soundfontPlayerRef.current.setVolume(isMuted ? 0 : volume[0]);
        }
      } catch (error) {
        console.warn('🎹 Soundfont loading failed, using fallback synthesis:', error);
        setSoundfontReady(false);
      }
      setIsLoadingSoundfont(false);
    };
    loadSoundfont();
  }, [selectedInstrument, initAudioContext, isMuted, volume]);

  // Update soundfont volume when volume changes
  useEffect(() => {
    if (soundfontPlayerRef.current) {
      soundfontPlayerRef.current.setVolume(isMuted ? 0 : volume[0]);
    }
  }, [volume, isMuted]);

  // Scroll to selected octave range when dropdown changes
  useEffect(() => {
    if (keysContainerRef.current) {
      const whiteKeyWidth = window.innerWidth >= 640 ? 69 : 60;
      let scrollPosition = 0;
      if (startOctave === 0) {
        scrollPosition = 0;
      } else if (startOctave === 1) {
        scrollPosition = whiteKeyWidth * 9;
      } else {
        scrollPosition = whiteKeyWidth * (2 + (startOctave - 1) * 7);
      }
      keysContainerRef.current.scrollTo({
        left: scrollPosition,
        behavior: 'smooth'
      });
    }
  }, [startOctave]);
  const playNote = useCallback(async (frequency: number, noteName: string) => {
    // Always ensure audio context is initialized and unlocked (mobile requirement)
    const audioContext = await initAudioContext();
    if (!audioContext) {
      console.error('🎹 No AudioContext available');
      return;
    }

    // Ensure context is running
    if (audioContext.state !== 'running') {
      try {
        await audioContext.resume();
        console.log('🔊 AudioContext resumed for playNote');
      } catch (err) {
        console.error('🎹 Failed to resume AudioContext:', err);
        return;
      }
    }

    // Try soundfont first if ready and has buffers loaded
    let soundfontPlayed = false;
    if (soundfontReady && soundfontPlayerRef.current && soundfontPlayerRef.current.isReady()) {
      try {
        await soundfontPlayerRef.current.playNote(noteName);
        setActiveNotes(prev => new Set(prev).add(noteName));
        soundfontPlayed = true;
        console.log('🎹 Soundfont played:', noteName);
      } catch (error) {
        console.warn('🎹 Soundfont playNote failed, using fallback:', error);
        soundfontPlayed = false;
      }
    }

    // If soundfont didn't play, use oscillator synthesis (always works)
    if (soundfontPlayed) return;
    if (activeOscillatorsRef.current.has(noteName)) return;

    // Clean oscillator synthesis - simple and reliable
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Use sine wave for cleaner sound
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    oscillator.type = 'sine';
    const currentVolume = isMuted ? 0 : volume[0];
    const now = audioContext.currentTime;

    // Simple envelope - immediate attack, gradual decay
    gainNode.gain.setValueAtTime(currentVolume * 0.8, now);
    gainNode.gain.exponentialRampToValueAtTime(currentVolume * 0.3, now + 0.5);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 2);
    oscillator.start();
    console.log('🎵 Playing note (synthesis):', noteName, 'at', frequency, 'Hz');
    activeOscillatorsRef.current.set(noteName, {
      oscillators: [oscillator],
      gainNode
    });
    setActiveNotes(prev => new Set(prev).add(noteName));
  }, [volume, isMuted, initAudioContext, soundfontReady]);
  const stopNote = useCallback((noteName: string) => {
    // Stop soundfont note if player exists
    if (soundfontPlayerRef.current) {
      soundfontPlayerRef.current.stopNote(noteName);
    }

    // Also stop oscillator if it exists (fallback mode)
    const nodes = activeOscillatorsRef.current.get(noteName);
    if (nodes && audioContextRef.current) {
      try {
        const now = audioContextRef.current.currentTime;
        nodes.gainNode.gain.cancelScheduledValues(now);
        nodes.gainNode.gain.setValueAtTime(nodes.gainNode.gain.value, now);
        nodes.gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        setTimeout(() => {
          nodes.oscillators.forEach(osc => {
            try {
              osc.stop();
            } catch (e) {}
          });
          activeOscillatorsRef.current.delete(noteName);
        }, 150);
      } catch (error) {
        activeOscillatorsRef.current.delete(noteName);
      }
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
      activeOscillatorsRef.current.forEach(({
        gainNode
      }) => {
        gainNode.gain.setValueAtTime(newVolume, audioContextRef.current!.currentTime);
      });
    }
    if (soundfontPlayerRef.current) {
      soundfontPlayerRef.current.setVolume(!isMuted ? 0 : volume[0]);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Stop all oscillators
      activeOscillatorsRef.current.forEach(nodes => {
        nodes.oscillators.forEach(osc => {
          try {
            osc.stop();
          } catch (e) {}
        });
      });
      activeOscillatorsRef.current.clear();

      // Stop all soundfont notes
      if (soundfontPlayerRef.current) {
        soundfontPlayerRef.current.stopAllNotes();
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
          <Select value={selectedInstrument.toString()} onValueChange={value => setSelectedInstrument(parseInt(value, 10))} disabled={isLoadingSoundfont}>
            <SelectTrigger className="w-32 sm:w-48 h-8 sm:h-9 text-xs sm:text-sm">
              <SelectValue placeholder="Instrument" />
            </SelectTrigger>
            <SelectContent className="z-[2147483648] max-h-[300px] bg-popover">
              {GM_INSTRUMENTS.map(instrument => <SelectItem key={instrument.id} value={instrument.id.toString()}>
                  {instrument.name}
                </SelectItem>)}
            </SelectContent>
          </Select>
          {isLoadingSoundfont && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          {soundfontReady && !isLoadingSoundfont && <span className="text-xs text-green-500 hidden sm:inline">✓</span>}
        </div>

        <div className="flex items-center gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={toggleMute} className="h-8 w-8 sm:h-9 sm:w-9">
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
          <div className="w-20 sm:w-24">
            <Slider value={volume} onValueChange={setVolume} max={1} min={0} step={0.1} className="w-full" />
          </div>
          {onClose && <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 sm:h-9 sm:w-9" aria-label="Close piano">
              <X className="h-5 w-5" />
            </Button>}
        </div>
      </div>

      {/* Piano Keyboard Area */}
      <div ref={keysContainerRef} style={{
      scrollbarWidth: 'thin',
      scrollbarColor: 'hsl(var(--primary)) hsl(var(--muted))'
    }} className="">
        <div className="relative inline-block px-2 min-w-full mx-0 sm:px-0 py-0">
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
                boxShadow: isActive ? 'inset 0 6px 12px rgba(0,0,0,0.35)' : '0 6px 12px rgba(0,0,0,0.2), inset 0 3px 0 rgba(255,255,255,0.9)'
              }} className={`cursor-pointer transition-all duration-75 flex flex-col items-center justify-end pb-2 sm:pb-4 text-[10px] sm:text-sm font-semibold select-none border-r border-gray-300/50 last:border-r-0 touch-manipulation ${isActive ? 'bg-primary/30 shadow-inner scale-[0.98]' : 'bg-white hover:bg-gray-50 shadow-lg active:bg-primary/20 active:scale-[0.98]'} ${index === 0 ? 'rounded-l-lg sm:rounded-l-xl' : ''} ${index === whiteKeys.length - 1 ? 'rounded-r-lg sm:rounded-r-xl' : ''}`} onMouseDown={() => playNote(key.frequency, keyName)} onMouseUp={() => stopNote(keyName)} onMouseLeave={() => stopNote(keyName)} onTouchStart={e => {
                e.preventDefault();
                playNote(key.frequency, keyName);
              }} onTouchEnd={e => {
                e.preventDefault();
                stopNote(keyName);
              }}>
                    <span className="text-gray-700 font-bold">
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
                return <button key={keyName} className={`absolute h-full cursor-pointer transition-all duration-75 flex items-end justify-center pb-2 sm:pb-3 text-[0.65rem] sm:text-xs font-bold pointer-events-auto select-none touch-manipulation ${isActive ? 'bg-gray-700 shadow-inner scale-[0.96]' : 'bg-gray-900 hover:bg-gray-800 active:bg-gray-700 active:scale-[0.96]'}`} style={{
                  left: `${leftPosition}px`,
                  width: `${blackKeyWidth}px`,
                  minWidth: '36px',
                  maxWidth: '60px',
                  borderRadius: '0 0 8px 8px',
                  boxShadow: isActive ? 'inset 0 5px 10px rgba(0,0,0,0.9)' : '0 5px 12px rgba(0,0,0,0.7), inset 0 2px 0 rgba(255,255,255,0.2)'
                }} onMouseDown={() => playNote(key.frequency, keyName)} onMouseUp={() => stopNote(keyName)} onMouseLeave={() => stopNote(keyName)} onTouchStart={e => {
                  e.preventDefault();
                  playNote(key.frequency, keyName);
                }} onTouchEnd={e => {
                  e.preventDefault();
                  stopNote(keyName);
                }}>
                      <span className="text-white">{key.note.replace('#', '♯')}</span>
                    </button>;
              })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>;
  if (isFullScreen) {
    // On mobile, use a full-screen fixed overlay instead of Rnd
    if (isMobile) {
      return <div className="fixed inset-0 z-[2147483647] bg-background flex flex-col">
          {pianoContent}
        </div>;
    }
    return <Rnd size={{
      width: pianoSize.width,
      height: pianoSize.height
    }} position={{
      x: pianoPosition.x,
      y: pianoPosition.y
    }} onDragStop={(e, d) => {
      setPianoPosition({
        x: d.x,
        y: d.y
      });
    }} onResizeStop={(e, direction, ref, delta, position) => {
      setPianoSize({
        width: parseInt(ref.style.width),
        height: parseInt(ref.style.height)
      });
      setPianoPosition(position);
    }} minWidth={600} minHeight={400} maxWidth={1400} maxHeight={900} dragHandleClassName="cursor-move" className="z-[2147483647]" bounds="window">
        {pianoContent}
      </Rnd>;
  }
  return pianoContent;
};