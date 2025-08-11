import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Mic2, Square, Play } from 'lucide-react';

interface MicTestProps {
  className?: string;
}

export const MicTest: React.FC<MicTestProps> = ({ className }) => {
  const [testing, setTesting] = useState(false);
  const [level, setLevel] = useState(0); // 0-100
  const [status, setStatus] = useState<'idle'|'granted'|'denied'|'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafIdRef = useRef<number | null>(null);

  const stopAll = () => {
    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    sourceRef.current?.disconnect();
    analyserRef.current?.disconnect();
    ctxRef.current?.close();
    streamRef.current?.getTracks().forEach(t => t.stop());
    sourceRef.current = null;
    analyserRef.current = null;
    ctxRef.current = null;
    streamRef.current = null;
  };

  useEffect(() => {
    return () => stopAll();
  }, []);

  const tick = () => {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const buffer = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(buffer);
    // Compute RMS
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
      const v = (buffer[i] - 128) / 128; // -1..1
      sum += v * v;
    }
    const rms = Math.sqrt(sum / buffer.length); // 0..1
    const pct = Math.min(100, Math.max(0, Math.round(rms * 120))); // scale a bit
    setLevel(pct);
    rafIdRef.current = requestAnimationFrame(tick);
  };

  const startTest = async () => {
    try {
      setStatus('idle');
      setErrorMsg(null);

      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus('error');
        setErrorMsg('getUserMedia not supported. Use Chrome/Safari over HTTPS.');
        return;
      }

      // Prefer enhanced constraints, fallback to basic
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            channelCount: 1,
            sampleRate: 44100,
          } as MediaTrackConstraints
        });
      } catch (e) {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      streamRef.current = stream;

      const Ctx: any = (window as any).AudioContext || (window as any).webkitAudioContext;
      const ctx: AudioContext = new Ctx({ sampleRate: 44100 });
      ctxRef.current = ctx;
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      const src = ctx.createMediaStreamSource(stream!);
      sourceRef.current = src;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.85;
      analyserRef.current = analyser;
      src.connect(analyser);

      setTesting(true);
      setStatus('granted');
      rafIdRef.current = requestAnimationFrame(tick);
    } catch (e: any) {
      console.error('Mic test error', e);
      const name = e?.name || '';
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        setStatus('denied');
        setErrorMsg('Permission blocked. Tap the lock icon in the address bar to enable the microphone, then try again.');
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setStatus('error');
        setErrorMsg('No microphone detected. Plug in a mic or select one in system settings.');
      } else {
        setStatus('error');
        setErrorMsg(e?.message || 'Unknown error.');
      }
      setTesting(false);
    }
  };

  const stopTest = () => {
    stopAll();
    setTesting(false);
    setLevel(0);
  };

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Mic2 className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Microphone Test</span>
        </div>
        {!testing ? (
          <Button size="sm" onClick={startTest}>
            <Play className="mr-2 h-4 w-4" /> Start Test
          </Button>
        ) : (
          <Button size="sm" variant="destructive" onClick={stopTest}>
            <Square className="mr-2 h-4 w-4" /> Stop
          </Button>
        )}
      </div>

      <div className="h-3 rounded-md bg-muted overflow-hidden border border-border">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${level}%` }}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={level}
          role="progressbar"
        />
      </div>

      <div className="mt-2 text-xs text-muted-foreground space-y-1">
        {status === 'idle' && 'Click Start Test and allow microphone access.'}
        {status === 'granted' && 'Speak into your mic — the bar should react to your voice.'}
        {status === 'denied' && 'Microphone blocked. Check browser permissions (lock icon) and try again.'}
        {status === 'error' && 'An error occurred while accessing your microphone.'}
        {errorMsg && <div className="text-destructive">{errorMsg}</div>}
      </div>
    </div>
  );
};

export default MicTest;
