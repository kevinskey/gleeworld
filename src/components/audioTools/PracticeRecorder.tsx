// Left slide-out drawer attached to the Metronome that lets a student
// record themselves practicing with the metronome clicking. The audio
// graph is: mic input + metronome tap → MediaStreamDestination →
// MediaRecorder. The metronome's existing scheduler keeps clicking through
// the speakers as usual; we just register a secondary AudioNode tap so
// each click is mirrored into the recording stream.
//
// On save we upload the blob to the `sheet-music` bucket at
//   practice-recordings/{userId}/{timestamp}.webm
// and insert a metadata row into `gw_practice_recordings`. Staff can read
// every recording in the tenant; students see only their own.

import { useEffect, useRef, useState } from 'react';
import { X, Mic, Square, Save, Trash2, Loader2, Music2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  setMetronomeSpeakerVolume,
  startMetronome,
  stopMetronome,
  isMetronomeRunning,
} from '@/lib/audioTools/metronome';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';

interface PracticeRecorderProps {
  open: boolean;
  onClose: () => void;
  /** Snapshot of the metronome settings so the saved row can carry them. */
  bpm: number;
  timeSig: string;
}

type RecordingState = 'idle' | 'recording' | 'processing' | 'review' | 'saving';

export function PracticeRecorder({ open, onClose, bpm, timeSig }: PracticeRecorderProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Find the Practice course the user is actually enrolled in. We used
  // to hardcode course_code = 'STUDENT-PRACTICE', but legacy tenants
  // already have a seeded GLEE000 "Student Practice" course AND the
  // migration created a parallel STUDENT-PRACTICE course — students
  // enrolled in the wrong one would never see their own takes in the
  // class UI. Look up by their actual enrollment instead so the saved
  // course_id always matches the class shell they'll review them in.
  const { data: practiceCourse } = useQuery({
    queryKey: ['student-practice-course', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: enrolls } = await supabase
        .from('gw_course_enrollments')
        .select('course_id')
        .eq('user_id', user!.id);
      const ids = (enrolls ?? []).map((e: any) => e.course_id).filter(Boolean);
      if (ids.length === 0) return null;
      const { data: courses } = await supabase
        .from('gw_courses')
        .select('id, course_code, title')
        .in('id', ids);
      const hit = (courses ?? []).find((c: any) => {
        const code = (c.course_code || '').toUpperCase().replace(/\s+/g, '');
        const title = (c.title || '').toLowerCase();
        return code === 'STUDENT-PRACTICE'
          || code === 'GLEE000'
          || title.includes('student practice');
      });
      return hit ? { id: hit.id } : null;
    },
  });

  const [state, setState] = useState<RecordingState>('idle');
  const [elapsedSec, setElapsedSec] = useState(0);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [title, setTitle] = useState('');
  // When the student wears headphones the metronome can play full-volume
  // through the speaker (= their ears) with zero mic bleed. When using
  // device speakers we duck the click so the mic doesn't pick it up
  // twice. Persist the choice locally so they don't have to re-toggle.
  const [usingHeadphones, setUsingHeadphones] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem('gw.practiceRecorder.headphones') === '1';
  });
  useEffect(() => {
    try { window.localStorage.setItem('gw.practiceRecorder.headphones', usingHeadphones ? '1' : '0'); } catch { /* ignore */ }
  }, [usingHeadphones]);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const tickRef = useRef<number | null>(null);
  // True only when THIS recorder kicked the metronome on. Stop-on-stop
  // should mirror start-on-start: don't stop a metronome the user had
  // already going before they opened the drawer.
  const metronomeAutoStartedRef = useRef(false);
  // Snapshot of the BPM + beatsPerBar in effect at recording start. Used
  // by the offline mixer to regenerate a frame-perfect click track in
  // post-processing (we no longer mix the live metronome into the mic
  // stream — AudioContext-vs-mic clock drift was warping pitch and
  // drifting sync over a 30s recording). Set when recording starts;
  // null means "no metronome in the saved file".
  const recordedClickRef = useRef<{ bpm: number; beatsPerBar: number; startedAt: number } | null>(null);

  // Reset everything when the drawer closes.
  useEffect(() => {
    if (open) return;
    cleanup();
    setState('idle');
    setElapsedSec(0);
    setBlobUrl(null);
    setBlob(null);
    setTitle('');
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Free the object URL when we replace it.
  useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [blobUrl]);

  function cleanup() {
    if (tickRef.current) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      try { recorderRef.current.stop(); } catch { /* ignore */ }
    }
    recorderRef.current = null;
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    setMetronomeSpeakerVolume(1);
    if (metronomeAutoStartedRef.current) {
      stopMetronome();
      metronomeAutoStartedRef.current = false;
    }
    chunksRef.current = [];
    recordedClickRef.current = null;
  }

  async function startRecording() {
    try {
      // Music-friendly mic constraints — keep dynamic range, no DSP fudge.
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
        video: false,
      });
      micStreamRef.current = micStream;

      // iOS Safari quirk: granting mic access flips the audio session into
      // "play and record" mode, which routes output to the earpiece by
      // default. Force the speaker by playing a tiny silent buffer through
      // a temporary HTMLAudioElement (which iOS treats as playback intent).
      try {
        const silent = new Audio(
          'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=',
        );
        silent.loop = true;
        silent.volume = 0;
        silent.play().catch(() => { /* ignore — best-effort speaker hint */ });
      } catch { /* ignore */ }

      // Auto-start the metronome if it isn't running yet — most users open
      // the recorder before pressing the Metronome's own Start button.
      // Remember that WE started it so stopRecording can turn it back off.
      metronomeAutoStartedRef.current = false;
      const beatsPerBar = parseInt(timeSig.split('/')[0], 10) || 4;
      if (!isMetronomeRunning()) {
        try {
          await startMetronome({
            bpm,
            beatsPerBar,
            accentFirstBeat: true,
            subdivision: 1,
          });
          metronomeAutoStartedRef.current = true;
        } catch { /* metronome may already be queued by parent */ }
      }

      // Headphones → full speaker level (the click only enters their ears,
      // not the mic). Device speakers → keep audible enough to play to
      // but soft enough that mic bleed doesn't double up the click.
      setMetronomeSpeakerVolume(usingHeadphones ? 1.0 : 0.5);

      // Record the RAW mic stream — no AudioContext mixing. Mixing through
      // a MediaStreamDestination caused clock drift between the mic input
      // device and the AudioContext sample rate, which produced pitch
      // wobble + sync drift over a 30s recording. We add the click track
      // in a deterministic offline pass at save time instead.
      recordedClickRef.current = { bpm, beatsPerBar, startedAt: performance.now() };

      // Codec pick — iPhone Safari uses AAC in MP4 natively (hardware-
      // accelerated and tuned for music), so prefer it on iOS. Other
      // browsers get Opus in WebM. Bitrate bumped to 256 kbps so the
      // decoded audio that lands in the offline mixer is much closer to
      // CD quality than the ~96-128 kbps browser defaults.
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
        || (navigator.platform === 'MacIntel' && (navigator as any).maxTouchPoints > 1);
      const prefer = isIOS
        ? ['audio/mp4;codecs=mp4a.40.2', 'audio/mp4', 'audio/webm;codecs=opus']
        : ['audio/webm;codecs=opus', 'audio/mp4;codecs=mp4a.40.2', 'audio/mp4'];
      const mimeType = prefer.find((t) => MediaRecorder.isTypeSupported(t)) ?? '';
      const recorder = new MediaRecorder(
        micStream,
        mimeType
          ? { mimeType, audioBitsPerSecond: 256_000 }
          : { audioBitsPerSecond: 256_000 },
      );
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        const rawBlob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        // Run the mix + compressor + normalize NOW so the preview the
        // student hears is the same loud WAV that will be uploaded on
        // Save. Previously preview played the raw mic (always quiet)
        // and saved a much louder file — students thought their
        // recordings were too soft.
        setState('processing');
        let finalBlob = rawBlob;
        const click = recordedClickRef.current;
        if (click) {
          try {
            finalBlob = await mixClickIntoRecording(rawBlob, click.bpm, click.beatsPerBar);
          } catch (mixErr) {
            console.warn('[PracticeRecorder] preview mixdown failed, using raw', mixErr);
          }
        }
        setBlob(finalBlob);
        setBlobUrl(URL.createObjectURL(finalBlob));
        setState('review');
      };
      recorderRef.current = recorder;
      recorder.start();

      setElapsedSec(0);
      tickRef.current = window.setInterval(() => setElapsedSec((s) => s + 1), 1000);
      setState('recording');
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Microphone unavailable',
        description: e?.message ?? 'Could not access the microphone.',
      });
    }
  }

  function stopRecording() {
    if (tickRef.current) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
    try { recorderRef.current?.stop(); } catch { /* ignore */ }
    setMetronomeSpeakerVolume(1); // restore audible level
    if (metronomeAutoStartedRef.current) {
      stopMetronome();
      metronomeAutoStartedRef.current = false;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
  }

  function discard() {
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    setBlob(null);
    setBlobUrl(null);
    setTitle('');
    setElapsedSec(0);
    setState('idle');
  }

  async function save() {
    if (!blob || !user) {
      toast({
        variant: 'destructive',
        title: 'Nothing to save',
        description: !user ? 'You need to be signed in.' : 'No recording captured.',
      });
      return;
    }
    setState('saving');
    try {
      // The blob has already been mixed + compressed + normalized in
      // recorder.onstop (so the preview matches what we save). It's a
      // WAV unless the mixdown failed, in which case it's the raw mic.
      const isWav = blob.type === 'audio/wav';
      const contentType = blob.type || (isWav ? 'audio/wav' : 'audio/webm');
      const ext = isWav ? 'wav' : (blob.type.includes('mp4') ? 'mp4' : 'webm');
      const ts = Date.now();
      const path = `practice-recordings/${user.id}/${ts}.${ext}`;
      console.log('[PracticeRecorder] uploading', { path, size: blob.size, type: contentType });
      const { error: upErr } = await supabase.storage
        .from('sheet-music')
        .upload(path, blob, { contentType, upsert: false });
      if (upErr) {
        console.error('[PracticeRecorder] storage upload error', upErr);
        throw new Error(`Upload: ${upErr.message}`);
      }
      const { data: urlData } = supabase.storage.from('sheet-music').getPublicUrl(path);
      console.log('[PracticeRecorder] inserting row', { user_id: user.id, audio_path: path, course_id: practiceCourse?.id });
      const { error: insErr } = await supabase
        .from('gw_practice_recordings')
        .insert({
          user_id: user.id,
          audio_path: path,
          audio_url: urlData.publicUrl,
          duration_sec: elapsedSec,
          bpm,
          time_sig: timeSig,
          title: title.trim() || `Practice ${new Date().toLocaleString()}`,
          course_id: practiceCourse?.id ?? null,
        });
      if (insErr) {
        console.error('[PracticeRecorder] insert error', insErr);
        throw new Error(`Insert: ${insErr.message}`);
      }
      toast({ title: 'Recording saved', description: 'Your teacher can now listen back.' });
      queryClient.invalidateQueries({ queryKey: ['practice-recordings', user.id] });
      discard();
    } catch (e: any) {
      console.error('[PracticeRecorder] save failed', e);
      toast({
        variant: 'destructive',
        title: 'Save failed',
        description: e?.message ?? 'Could not save the recording.',
      });
      setState('review');
    }
  }

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/40" onClick={state === 'recording' || state === 'saving' ? undefined : onClose} />
      {/* Drawer — full width on phones (where 360px would crowd the screen
          AND default audio controls overflow narrow containers on iOS);
          fixed-width side panel from sm+ up. */}
      <aside
        className="fixed left-0 top-0 z-50 h-full w-screen sm:w-[360px] max-w-full bg-card border-r border-border shadow-2xl flex flex-col overflow-hidden"
        style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <header className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Mic className="w-4 h-4 text-primary" />
            <h2 className="text-base font-semibold">Practice recorder</h2>
          </div>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onClose} disabled={state === 'saving'}>
            <X className="w-4 h-4" />
          </Button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs space-y-2">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Music2 className="w-3.5 h-3.5" />
              <span>Metronome settings will be saved with this take</span>
            </div>
            <div className="font-mono">
              ♩ = {bpm} · {timeSig}
            </div>
            <label className="flex items-center gap-2 pt-1 border-t border-border/60 cursor-pointer">
              <input
                type="checkbox"
                checked={usingHeadphones}
                onChange={(e) => setUsingHeadphones(e.target.checked)}
                disabled={state === 'recording' || state === 'saving'}
                className="h-4 w-4"
              />
              <span className="text-[11px] leading-tight">
                I'm using headphones
                <span className="block text-muted-foreground text-[10px]">
                  Lets the metronome play at full volume without bleeding into the mic
                </span>
              </span>
            </label>
          </div>

          {state === 'idle' && (
            <Button onClick={startRecording} className="w-full" size="lg">
              <Mic className="w-4 h-4 mr-2" /> Start recording
            </Button>
          )}

          {state === 'recording' && (
            <div className="space-y-3 text-center">
              <div className="text-3xl font-mono font-bold tabular-nums">{formatElapsed(elapsedSec)}</div>
              <div className="flex items-center justify-center gap-2 text-xs text-rose-600">
                <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
                Recording with metronome
              </div>
              <Button onClick={stopRecording} variant="destructive" className="w-full" size="lg">
                <Square className="w-4 h-4 mr-2" /> Stop
              </Button>
            </div>
          )}

          {state === 'processing' && (
            <div className="space-y-2 text-center py-4">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
              <p className="text-xs text-muted-foreground">Mixing the metronome in and bringing the level up…</p>
            </div>
          )}

          {(state === 'review' || state === 'saving') && blobUrl && (
            <div className="space-y-3">
              <audio src={blobUrl} controls className="w-full" />
              <div className="text-xs text-muted-foreground text-center">
                {formatElapsed(elapsedSec)} captured
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="practice-title" className="text-xs">Title (optional)</Label>
                <Input
                  id="practice-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Bach BWV 1007, bars 1–8"
                  disabled={state === 'saving'}
                  className="text-sm"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={discard} variant="outline" className="flex-1" disabled={state === 'saving'}>
                  <Trash2 className="w-4 h-4 mr-2" /> Discard
                </Button>
                <Button onClick={save} className="flex-1" disabled={state === 'saving'}>
                  {state === 'saving'
                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving</>
                    : <><Save className="w-4 h-4 mr-2" /> Save</>}
                </Button>
              </div>
            </div>
          )}

          <RecentRecordings />
        </div>
      </aside>
    </>
  );
}

function RecentRecordings() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ['practice-recordings', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_practice_recordings')
        .select('id, title, audio_url, duration_sec, bpm, time_sig, teacher_notes, created_at')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="pt-2 border-t border-border">
      <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">
        Your recordings
      </h3>
      {isLoading && <div className="text-xs text-muted-foreground">Loading…</div>}
      {!isLoading && (!data || data.length === 0) && (
        <p className="text-xs text-muted-foreground italic">
          Recordings you save will show up here for your teacher to review.
        </p>
      )}
      {data && data.length > 0 && (
        <ul className="space-y-2">
          {data.map((r) => (
            <li key={r.id} className="rounded border border-border bg-background p-2 text-xs space-y-1 min-w-0">
              <div className="flex items-start justify-between gap-2 min-w-0">
                <div className="font-semibold leading-snug truncate flex-1 min-w-0">{r.title}</div>
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                </span>
              </div>
              <div className="text-[10px] text-muted-foreground truncate">
                ♩ = {r.bpm} · {r.time_sig} · {formatElapsed(Math.round(Number(r.duration_sec) || 0))}
              </div>
              <audio src={r.audio_url} controls className="w-full max-w-full h-8" />
              {r.teacher_notes && (
                <div className="text-[11px] text-foreground bg-amber-50 border border-amber-200 rounded px-2 py-1 mt-1">
                  <span className="font-semibold">Teacher: </span>{r.teacher_notes}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function formatElapsed(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// Mix a metronome click track into the raw mic recording offline. Using
// an OfflineAudioContext means the click is generated at the same sample
// rate as the mic blob — no live device clocks, no drift, no pitch
// wobble. Returns a new WAV blob (PCM 16-bit) ready to upload.
async function mixClickIntoRecording(
  micBlob: Blob,
  bpm: number,
  beatsPerBar: number,
): Promise<Blob> {
  const arrayBuffer = await micBlob.arrayBuffer();
  // Decode the mic blob with a throwaway context to learn its rate/length.
  const probeCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  let micBuffer: AudioBuffer;
  try {
    micBuffer = await probeCtx.decodeAudioData(arrayBuffer.slice(0));
  } finally {
    try { await probeCtx.close(); } catch { /* ignore */ }
  }
  const sampleRate = micBuffer.sampleRate;
  const lengthSamples = micBuffer.length;
  const channels = Math.max(1, micBuffer.numberOfChannels);

  const offline = new OfflineAudioContext(channels, lengthSamples, sampleRate);
  // Mic chain: source → preamp gain → soft-knee compressor → final makeup.
  // The compressor squashes transients (key clicks, breaths) so peak-
  // normalization doesn't get anchored to a single spike, letting the
  // actual music underneath come up to a useful level. Settings tuned
  // for a single-instrument practice recording, not broadcast loudness.
  const micSrc = offline.createBufferSource();
  micSrc.buffer = micBuffer;
  const preGain = offline.createGain();
  preGain.gain.value = 12.0; // big upfront boost; the compressor + limiter rein it in
  const compressor = offline.createDynamicsCompressor();
  compressor.threshold.value = -34; // tighter than before so RMS rises
  compressor.knee.value = 20;       // smooth onset
  compressor.ratio.value = 10;      // close to limiting — flattens dynamics for loud playback
  compressor.attack.value = 0.003;
  compressor.release.value = 0.15;
  const makeup = offline.createGain();
  makeup.gain.value = 4.0; // +12 dB post-compressor — final loudness driver
  micSrc.connect(preGain).connect(compressor).connect(makeup).connect(offline.destination);

  // Click track — clicks live much quieter in the final mix than they
  // sound through speakers (~3× quieter) so the piano takes the
  // foreground. Accent on beat 1, regular tone on the others.
  const totalDuration = micBuffer.duration;
  const secondsPerBeat = 60 / bpm;
  let beat = 0;
  for (let when = 0; when < totalDuration; when += secondsPerBeat) {
    const isAccent = beat % beatsPerBar === 0;
    const freq = isAccent ? 1500 : 1000;
    const peak = isAccent ? 0.12 : 0.08;
    const osc = offline.createOscillator();
    const env = offline.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, when);
    env.gain.setValueAtTime(0.0001, when);
    env.gain.exponentialRampToValueAtTime(peak, when + 0.001);
    env.gain.exponentialRampToValueAtTime(0.0001, when + 0.06);
    osc.connect(env).connect(offline.destination);
    osc.start(when);
    osc.stop(when + 0.08);
    beat += 1;
  }

  micSrc.start(0);
  const rendered = await offline.startRendering();
  // Soft-clip at 0.85 to catch transients before the final lift, then
  // peak-normalize to full scale (0 dBFS). softClip's tanh curve keeps
  // any post-clip residue inside the ceiling, so int16 PCM conversion
  // won't overflow.
  softClipAudioBuffer(rendered, 0.85);
  normalizeAudioBuffer(rendered, 1.0);
  return audioBufferToWavBlob(rendered);
}

// Tanh-style soft clipper — gently rounds peaks above `threshold` back
// toward 1.0 instead of hard-clipping them, so the compressor's quick
// transient leakage doesn't introduce digital crackle.
function softClipAudioBuffer(buffer: AudioBuffer, threshold: number): void {
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < data.length; i++) {
      const v = data[i];
      if (Math.abs(v) <= threshold) continue;
      const sign = v >= 0 ? 1 : -1;
      const excess = Math.abs(v) - threshold;
      // Squash the over-threshold portion through tanh.
      data[i] = sign * (threshold + (1 - threshold) * Math.tanh(excess / (1 - threshold)));
    }
  }
}

function normalizeAudioBuffer(buffer: AudioBuffer, targetPeak: number): void {
  let peak = 0;
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < data.length; i++) {
      const v = Math.abs(data[i]);
      if (v > peak) peak = v;
    }
  }
  if (peak === 0 || peak >= targetPeak) return;
  const gain = targetPeak / peak;
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < data.length; i++) data[i] *= gain;
  }
}

// Write an AudioBuffer out as a 16-bit PCM WAV file. Browser-portable
// (no need for an MP3 encoder), and matches the offline render exactly.
function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const numSamples = buffer.length;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = numSamples * blockAlign;
  const bufferSize = 44 + dataSize;
  const out = new ArrayBuffer(bufferSize);
  const view = new DataView(out);

  // RIFF chunk
  writeStr(view, 0, 'RIFF');
  view.setUint32(4, bufferSize - 8, true);
  writeStr(view, 8, 'WAVE');
  // fmt sub-chunk
  writeStr(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  // data sub-chunk
  writeStr(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Interleave channels, clamp + convert float → int16
  const channels: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) channels.push(buffer.getChannelData(c));
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    for (let c = 0; c < numChannels; c++) {
      const sample = Math.max(-1, Math.min(1, channels[c][i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }
  }
  return new Blob([out], { type: 'audio/wav' });
}

function writeStr(view: DataView, offset: number, s: string) {
  for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
}
