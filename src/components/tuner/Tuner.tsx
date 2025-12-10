import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { forceUnlockAudio, getSharedAudioContext } from '@/utils/mobileAudioUnlock';

interface TunerReading {
  note: string;
  frequency: number;
  cents: number; // negative = flat, positive = sharp
  isStable: boolean;
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

function freqToNote(frequency: number) {
  const A4 = 440;
  const n = Math.round(12 * Math.log2(frequency / A4));
  const noteIndex = (n + 9) % 12; // A -> 9 maps to A index in NOTE_NAMES
  const octave = 4 + Math.floor((n + 9) / 12);
  const noteName = NOTE_NAMES[(noteIndex + 12) % 12];
  const exactFreq = A4 * Math.pow(2, n / 12);
  const cents = 1200 * Math.log2(frequency / exactFreq);
  return { note: `${noteName}${octave}`, cents, exactFreq };
}

function autoCorrelate(buf: Float32Array, sampleRate: number): number | null {
  // Adapted from Chris Wilson's auto-correlation technique
  const SIZE = buf.length;
  const MAX_SAMPLES = Math.floor(SIZE / 2);
  let bestOffset = -1;
  let bestCorrelation = 0;
  let rms = 0;
  for (let i = 0; i < SIZE; i++) {
    const val = buf[i];
    rms += val * val;
  }
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.01) return null; // too little signal

  let lastCorrelation = 1;
  for (let offset = 0; offset < MAX_SAMPLES; offset++) {
    let correlation = 0;
    for (let i = 0; i < MAX_SAMPLES; i++) {
      correlation += Math.abs(buf[i] - buf[i + offset]);
    }
    correlation = 1 - correlation / MAX_SAMPLES;
    if (correlation > 0.9 && correlation > lastCorrelation) {
      bestCorrelation = correlation;
      bestOffset = offset;
    } else if (bestCorrelation > 0.9 && correlation < lastCorrelation) {
      // peak passed
      const period = bestOffset;
      const frequency = sampleRate / period;
      return frequency;
    }
    lastCorrelation = correlation;
  }
  if (bestCorrelation > 0.9) {
    const frequency = sampleRate / bestOffset;
    return frequency;
  }
  return null;
}

export const Tuner: React.FC<{ className?: string }>
  = ({ className = '' }) => {
  const [isListening, setIsListening] = useState(false);
  const [reading, setReading] = useState<TunerReading | null>(null);
  const [error, setError] = useState<string | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const rafRef = useRef<number | null>(null);

  const start = async () => {
    try {
      // Force unlock audio for mobile compatibility
      forceUnlockAudio();
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      
      // Use shared audio context for mobile compatibility
      const audioCtx = getSharedAudioContext();
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }
      
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.85;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      audioCtxRef.current = audioCtx;
      analyserRef.current = analyser;
      micSourceRef.current = source;
      setIsListening(true);
      setError(null);

      const buffer = new Float32Array(analyser.fftSize);

      const tick = () => {
        if (!analyserRef.current || !audioCtxRef.current) return;
        analyserRef.current.getFloatTimeDomainData(buffer);
        const freq = autoCorrelate(buffer, audioCtxRef.current.sampleRate);
        if (freq && freq > 50 && freq < 2000) {
          const { note, cents } = freqToNote(freq);
          const isStable = Math.abs(cents) < 5;
          setReading({ note, frequency: freq, cents, isStable });
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch (e: any) {
      setError(e?.message || 'Microphone access denied');
      setIsListening(false);
    }
  };

  const stop = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    // Don't close the shared audio context
    audioCtxRef.current = null;
    analyserRef.current = null;
    micSourceRef.current = null;
    setIsListening(false);
  };

  useEffect(() => () => stop(), []);

  const rotation = useMemo(() => {
    if (!reading) return 0;
    const clamped = Math.max(-50, Math.min(50, reading.cents));
    return (clamped / 50) * 45; // +/- 45deg for +/-50 cents
  }, [reading]);

  return (
    <div className={`bg-background border border-border rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-medium">Tuner</div>
        <button
          onClick={isListening ? stop : start}
          className={`inline-flex items-center gap-2 text-xs px-3 py-1 rounded-md border transition-colors ${
            isListening ? 'bg-destructive text-destructive-foreground border-destructive/40' : 'bg-primary text-primary-foreground border-primary/40'
          }`}
        >
          {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          {isListening ? 'Stop' : 'Listen'}
        </button>
      </div>

      {/* Dial */}
      <div className="flex flex-col items-center">
        <div className="relative w-40 h-24">
          <div className="absolute inset-0 flex items-end justify-center">
            <div className="w-32 h-16 rounded-t-full border-2 border-border bg-muted/30" />
          </div>
          {/* center tick */}
          <div className="absolute left-1/2 -translate-x-1/2 bottom-0 w-0.5 h-10 bg-primary" />
          {/* pointer */}
          <div
            className="absolute left-1/2 bottom-0 origin-bottom h-12"
            style={{ transform: `translateX(-50%) rotate(${rotation}deg)` }}
          >
            <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-b-[18px] border-l-transparent border-r-transparent border-b-primary" />
          </div>
          {/* labels */}
          <div className="absolute inset-x-0 bottom-0 text-[10px] text-muted-foreground flex justify-between px-4">
            <span>-50¢</span>
            <span>0¢</span>
            <span>+50¢</span>
          </div>
        </div>

        <div className="mt-3 text-center">
          <div className="text-2xl font-semibold tracking-wide">
            {reading ? reading.note.replace(/(\d)$/,' $1') : '--'}
          </div>
          <div className={`text-xs ${reading?.isStable ? 'text-primary' : 'text-muted-foreground'}`}>
            {reading ? `${reading.frequency.toFixed(1)} Hz • ${reading.cents > 0 ? '+' : ''}${reading.cents.toFixed(1)}¢` : 'Start microphone'}
          </div>
          {error && <div className="text-xs text-destructive mt-2">{error}</div>}
        </div>
      </div>
    </div>
  );
};
