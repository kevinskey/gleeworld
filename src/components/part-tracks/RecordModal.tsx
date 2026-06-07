import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Mic, Square, RotateCcw, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const MAX_SECONDS = 600; // 10 minutes

type Phase = 'idle' | 'recording' | 'encoding' | 'preview';

interface RecordModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (mp3Blob: Blob) => Promise<void> | void;
  title?: string;
}

export const RecordModal: React.FC<RecordModalProps> = ({ open, onClose, onSave, title }) => {
  const [phase, setPhase] = useState<Phase>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const mp3BlobRef = useRef<Blob | null>(null);

  const stopAll = () => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch {}
    }
    mediaRecorderRef.current = null;
    sourceRef.current?.disconnect();
    sourceRef.current = null;
    analyserRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
  };

  const reset = () => {
    stopAll();
    chunksRef.current = [];
    mp3BlobRef.current = null;
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setElapsed(0);
    setPhase('idle');
  };

  useEffect(() => {
    if (!open) reset();
    return () => stopAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const drawWaveform = () => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    const buf = new Uint8Array(analyser.fftSize);

    const tick = () => {
      analyser.getByteTimeDomainData(buf);
      ctx.fillStyle = 'rgba(15, 23, 42, 1)'; // slate-900
      ctx.fillRect(0, 0, w, h);
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgb(167, 139, 250)'; // violet-400
      ctx.beginPath();
      const slice = w / buf.length;
      let x = 0;
      for (let i = 0; i < buf.length; i++) {
        const v = buf[i] / 128.0;
        const y = (v * h) / 2;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        x += slice;
      }
      ctx.lineTo(w, h / 2);
      ctx.stroke();

      // elapsed timer
      const sec = (performance.now() - startTimeRef.current) / 1000;
      setElapsed(sec);
      if (sec >= MAX_SECONDS) {
        handleStop();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      sourceRef.current = source;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : '';
      const rec = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = rec;
      chunksRef.current = [];
      rec.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      rec.onstop = async () => {
        await encodeAndPreview();
      };
      rec.start(250);
      startTimeRef.current = performance.now();
      setPhase('recording');
      drawWaveform();
    } catch (err: any) {
      toast.error(`Mic access failed: ${err?.message ?? 'unknown'}`);
    }
  };

  const handleStop = () => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach(t => t.stop());
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch {}
    }
    setPhase('encoding');
  };

  const encodeAndPreview = async () => {
    try {
      const raw = new Blob(chunksRef.current, { type: chunksRef.current[0]?.type || 'audio/webm' });
      const arrayBuffer = await raw.arrayBuffer();
      // Decode to PCM via a fresh AudioContext (don't reuse the recording one — it's closing).
      const decodeCtx = new AudioContext();
      const audioBuffer = await decodeCtx.decodeAudioData(arrayBuffer.slice(0));
      const sampleRate = audioBuffer.sampleRate;
      // Downmix to mono.
      const ch0 = audioBuffer.getChannelData(0);
      let samples = ch0;
      if (audioBuffer.numberOfChannels > 1) {
        const ch1 = audioBuffer.getChannelData(1);
        samples = new Float32Array(ch0.length);
        for (let i = 0; i < ch0.length; i++) samples[i] = (ch0[i] + ch1[i]) * 0.5;
      }
      await decodeCtx.close();

      const worker = new Worker(
        new URL('@/lib/mp3-encoder.worker.ts', import.meta.url),
        { type: 'module' }
      );
      const mp3Bytes: Uint8Array = await new Promise((resolve, reject) => {
        worker.onmessage = (e) => {
          resolve(e.data.mp3);
          worker.terminate();
        };
        worker.onerror = (e) => {
          worker.terminate();
          reject(e);
        };
        worker.postMessage({ samples, sampleRate, bitrate: 128 }, [samples.buffer]);
      });

      const mp3Blob = new Blob([mp3Bytes], { type: 'audio/mpeg' });
      mp3BlobRef.current = mp3Blob;
      const url = URL.createObjectURL(mp3Blob);
      setPreviewUrl(url);
      setPhase('preview');
    } catch (err: any) {
      toast.error(`Encode failed: ${err?.message ?? 'unknown'}`);
      reset();
    }
  };

  const handleSave = async () => {
    if (!mp3BlobRef.current) return;
    setSaving(true);
    try {
      await onSave(mp3BlobRef.current);
      reset();
      onClose();
    } catch (err: any) {
      toast.error(`Save failed: ${err?.message ?? 'unknown'}`);
    } finally {
      setSaving(false);
    }
  };

  const mmss = (s: number) => {
    const m = Math.floor(s / 60);
    const r = Math.floor(s % 60);
    return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title ?? 'Record part track'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {phase === 'idle' && (
            <div className="flex flex-col items-center gap-4 py-6">
              <p className="text-sm text-muted-foreground text-center">
                Click record to start. Max 10 minutes. Mic permission required.
              </p>
              <Button onClick={startRecording} size="lg" className="rounded-full h-16 w-16 p-0">
                <Mic className="h-7 w-7" />
              </Button>
            </div>
          )}

          {phase === 'recording' && (
            <div className="space-y-3">
              <canvas ref={canvasRef} width={480} height={120} className="w-full rounded bg-slate-900" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
                  <span className="font-mono text-lg tabular-nums">{mmss(elapsed)}</span>
                  <span className="text-xs text-muted-foreground">/ 10:00</span>
                </div>
                <Button onClick={handleStop} variant="destructive">
                  <Square className="h-4 w-4 mr-2" /> Stop
                </Button>
              </div>
            </div>
          )}

          {phase === 'encoding' && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Encoding MP3…</p>
            </div>
          )}

          {phase === 'preview' && previewUrl && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Preview your recording before saving.</p>
              <audio controls src={previewUrl} className="w-full" />
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="ghost" onClick={reset} disabled={saving}>
                  <RotateCcw className="h-4 w-4 mr-2" /> Re-record
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Save MP3
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RecordModal;
