import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mic, Square, RotateCcw, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Metronome } from '@/components/part-tracks/Metronome';

const MAX_SECONDS = 600; // 10 minutes

type Phase = 'idle' | 'countin' | 'recording' | 'encoding' | 'preview';

// Persist click-track preferences so the singer doesn't re-enter them each take.
const SETTINGS_KEY = 'gw_part_tracks_click_settings_v1';
type ClickSettings = {
  bpm: number;
  beatsPerMeasure: number;
  countInMeasures: number;
  clickDuringRecord: boolean;
};
const DEFAULT_SETTINGS: ClickSettings = {
  bpm: 100,
  beatsPerMeasure: 4,
  countInMeasures: 1,
  clickDuringRecord: false,
};
const loadSettings = (): ClickSettings => {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_SETTINGS;
};
const saveSettings = (s: ClickSettings) => {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch {}
};

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
  const [settings, setSettings] = useState<ClickSettings>(() => loadSettings());
  const [countInBeat, setCountInBeat] = useState(0);

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
  const metronomeRef = useRef<Metronome | null>(null);
  const cancelCountInRef = useRef<boolean>(false);

  // Persist settings whenever they change.
  useEffect(() => { saveSettings(settings); }, [settings]);

  const stopAll = () => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    metronomeRef.current?.stop();
    metronomeRef.current = null;
    cancelCountInRef.current = true;
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
    setCountInBeat(0);
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
    cancelCountInRef.current = false;
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
      // Some browsers start AudioContext suspended; explicit resume avoids
      // the metronome clicks getting clipped on the first user gesture.
      if (audioCtx.state === 'suspended') await audioCtx.resume();
      const source = audioCtx.createMediaStreamSource(stream);
      sourceRef.current = source;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;

      // ───── Count-in ─────
      if (settings.countInMeasures > 0) {
        const metronome = new Metronome(audioCtx, settings.bpm, settings.beatsPerMeasure);
        metronomeRef.current = metronome;
        setPhase('countin');
        setCountInBeat(0);
        const totalBeats = settings.countInMeasures * settings.beatsPerMeasure;
        await metronome.start(totalBeats, (ev) => {
          setCountInBeat(ev.beatInMeasure + 1);
        });
        metronomeRef.current = null;
        if (cancelCountInRef.current) return; // user closed the dialog mid-count
      }

      // ───── Recording starts ─────
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

      // Optional continuous click during recording. Resumes seamlessly after
      // the count-in finishes (Web Audio scheduler keeps the beat aligned).
      if (settings.clickDuringRecord) {
        const metronome = new Metronome(audioCtx, settings.bpm, settings.beatsPerMeasure);
        metronome.setVolume(0.35); // softer during recording
        metronomeRef.current = metronome;
        metronome.start(); // runs until stop()
      }
    } catch (err: any) {
      toast.error(`Mic access failed: ${err?.message ?? 'unknown'}`);
      reset();
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
            <div className="space-y-5 py-2">
              <p className="text-sm text-muted-foreground text-center">
                Max 10 minutes. Mic permission required. Headphones recommended so the click doesn't bleed into the recording.
              </p>

              {/* Click track settings */}
              <div className="rounded-md border bg-muted/40 p-3 space-y-3">
                <Label className="text-xs font-semibold uppercase tracking-wide">Click track</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Tempo (BPM)</Label>
                    <Input
                      type="number"
                      min={40}
                      max={240}
                      value={settings.bpm}
                      onChange={e => setSettings(s => ({ ...s, bpm: Math.max(40, Math.min(240, Number(e.target.value) || 0)) }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Time signature</Label>
                    <select
                      value={settings.beatsPerMeasure}
                      onChange={e => setSettings(s => ({ ...s, beatsPerMeasure: Number(e.target.value) }))}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value={2}>2/4</option>
                      <option value={3}>3/4</option>
                      <option value={4}>4/4</option>
                      <option value={6}>6/8</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Count-in measures</Label>
                    <select
                      value={settings.countInMeasures}
                      onChange={e => setSettings(s => ({ ...s, countInMeasures: Number(e.target.value) }))}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value={0}>None</option>
                      <option value={1}>1 measure</option>
                      <option value={2}>2 measures</option>
                    </select>
                  </div>
                  <div className="space-y-1 flex flex-col">
                    <Label className="text-xs">Click during recording</Label>
                    <label className="inline-flex items-center gap-2 mt-1.5 h-10 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.clickDuringRecord}
                        onChange={e => setSettings(s => ({ ...s, clickDuringRecord: e.target.checked }))}
                        className="h-4 w-4 accent-violet-600"
                      />
                      <span>Keep clicking while I sing</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex justify-center">
                <Button onClick={startRecording} size="lg" className="rounded-full h-16 w-16 p-0">
                  <Mic className="h-7 w-7" />
                </Button>
              </div>
            </div>
          )}

          {phase === 'countin' && (
            <div className="flex flex-col items-center gap-4 py-10">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                Count-in · {settings.bpm} BPM · {settings.beatsPerMeasure}/4
              </p>
              <div
                key={countInBeat}
                className="font-bold text-7xl sm:text-8xl tabular-nums text-violet-600 dark:text-violet-300 animate-pulse"
              >
                {countInBeat || '—'}
              </div>
              <p className="text-xs text-muted-foreground">
                Recording starts at the next downbeat.
              </p>
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
