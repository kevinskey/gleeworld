// Ported from the standalone songwriter app's client/src/components/RecorderPanel.tsx.
// Mic capture / device-picker / metering logic is kept close to the source —
// only the upload path and Tailwind classes changed for this app's data
// layer and light theme + shadcn design tokens.
//
// Deliberate changes for this port:
//  - The old app uploaded via a multer/fetch REST client with a manual
//    "review → label → Save" step. That data layer is gone. Here, a take
//    is uploaded automatically the instant recording stops, using
//    pickRecordingMime()/uploadRecording() from '@/lib/songwriting/recordingsApi'.
//  - SAFETY-CRITICAL: the local blob (+ its object URL) is kept in state
//    from the moment recording stops until uploadRecording() RESOLVES.
//    On failure the take is never discarded — a persistent banner (with
//    Retry, which re-calls uploadRecording with the SAME blob, and Discard)
//    stays up, and the take remains locally playable the whole time. Only a
//    successful upload clears it. This mirrors the Part Tracks lesson
//    (reference_gleeworld_storage / project_part_tracks_fix): a failed take
//    must never be lost.
//  - gw_song_recordings has no `label` column (unlike the old app's
//    Recording.label), so there's no rename affordance here.
//  - Dictation (Web Speech) is NOT duplicated in this component — it
//    already lives in SectionBlock.tsx (Task 8), wired to the focused
//    lyric line. This panel is audio-take recording/playback only.

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Circle, Loader2, RotateCcw, Square, Trash2, X } from 'lucide-react';
import {
  pickRecordingMime,
  uploadRecording,
  listRecordings,
  deleteRecording,
} from '@/lib/songwriting/recordingsApi';
import type { SongRecording } from '@/lib/songwriting/recordingsApi';

const MAX_BYTES = 25 * 1024 * 1024;
const INPUT_STORAGE_KEY = 'songwriting:audioInputId';

type RecState = 'idle' | 'recording' | 'uploading' | 'failed';

type PendingTake = {
  blob: Blob;
  url: string;
  mimeType: string;
  ext: string;
  durationMs: number;
};

function formatTime(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// url is null when the audio could not be signed. The take is still real and
// still listed — see listRecordings in recordingsApi.
type RecordingRow = SongRecording & { url: string | null };

// Errors surfaced here come from supabase-js, the MediaDevices/MediaRecorder
// APIs, and our own throws. None of those guarantee an Error instance, so
// narrow instead of assuming `.message` exists.
function errMessage(e: unknown, fallback: string): string {
  if (e instanceof Error && e.message) return e.message;
  if (typeof e === 'string' && e) return e;
  const m = (e as { message?: unknown } | null)?.message;
  return typeof m === 'string' && m ? m : fallback;
}

export default function RecorderPanel({ songId, compact = false }: { songId: string; compact?: boolean }) {
  const [recordings, setRecordings] = useState<RecordingRow[]>([]);
  const [state, setState] = useState<RecState>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [size, setSize] = useState(0);
  const [pendingTake, setPendingTake] = useState<PendingTake | null>(null);
  // Input-device picker — empty list until the user has granted mic
  // permission at least once (browsers withhold labels otherwise).
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string>(() => localStorage.getItem(INPUT_STORAGE_KEY) || 'default');

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const tickRef = useRef<number | null>(null);
  const totalBytesRef = useRef<number>(0);
  // Latest pendingTake for the unmount-cleanup effect (which must not
  // re-run on every tick).
  const pendingTakeRef = useRef<PendingTake | null>(null);
  useEffect(() => { pendingTakeRef.current = pendingTake; }, [pendingTake]);

  function loadRecordings() {
    listRecordings(songId)
      .then(setRecordings)
      .catch((e: unknown) => toast.error(errMessage(e, 'Could not load recordings')));
  }

  useEffect(() => {
    loadRecordings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songId]);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (tickRef.current) window.clearInterval(tickRef.current);
    if (pendingTakeRef.current) URL.revokeObjectURL(pendingTakeRef.current.url);
  }, []);

  async function refreshDevices() {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      setDevices(all.filter((d) => d.kind === 'audioinput'));
    } catch { /* ignore — secure-context or unsupported */ }
  }

  useEffect(() => {
    refreshDevices();
    const md = navigator.mediaDevices;
    md?.addEventListener?.('devicechange', refreshDevices);
    return () => md?.removeEventListener?.('devicechange', refreshDevices);
  }, []);

  useEffect(() => {
    localStorage.setItem(INPUT_STORAGE_KEY, deviceId);
  }, [deviceId]);

  // If the saved device went away (unplugged USB mic, etc.), fall back.
  useEffect(() => {
    if (deviceId === 'default') return;
    if (devices.length === 0) return;
    const stillThere = devices.some((d) => d.deviceId === deviceId);
    if (!stillThere) setDeviceId('default');
  }, [devices, deviceId]);

  async function startRecording() {
    if (typeof MediaRecorder === 'undefined') {
      toast.error('Recording is not supported in this browser');
      return;
    }
    const audioConstraint: MediaTrackConstraints | true =
      deviceId === 'default' ? true : { deviceId: { exact: deviceId } };
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraint });
    } catch (err: unknown) {
      const errName = (err as { name?: string } | null)?.name;
      // If the saved exact-id input no longer works (unplugged etc.), retry default.
      if (errName === 'OverconstrainedError' && deviceId !== 'default') {
        toast.message('Selected input unavailable — falling back to default mic');
        setDeviceId('default');
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (err2: unknown) {
          toast.error(errMessage(err2, 'Could not access microphone'));
          return;
        }
      } else if (errName === 'NotAllowedError') {
        toast.error('Microphone access denied. Enable it in your browser settings.');
        return;
      } else if (errName === 'NotFoundError') {
        toast.error('No microphone found.');
        return;
      } else {
        toast.error(errMessage(err, 'Could not access microphone'));
        return;
      }
    }
    streamRef.current = stream;
    // Once permission is granted, device labels become readable.
    refreshDevices();

    const { mimeType, ext } = pickRecordingMime();
    let rec: MediaRecorder;
    try {
      rec = new MediaRecorder(stream, { mimeType });
    } catch (err: unknown) {
      toast.error(errMessage(err, 'Could not start recorder'));
      stream.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      return;
    }
    recorderRef.current = rec;
    chunksRef.current = [];
    totalBytesRef.current = 0;
    startTimeRef.current = Date.now();

    rec.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        chunksRef.current.push(e.data);
        totalBytesRef.current += e.data.size;
        setSize(totalBytesRef.current);
        if (totalBytesRef.current >= MAX_BYTES) {
          toast.message('Reached 25 MB cap — stopping');
          stopRecording();
        }
      }
    };
    rec.onstop = () => {
      const durationMs = Date.now() - startTimeRef.current;
      const type = rec.mimeType || mimeType;
      const blob = new Blob(chunksRef.current, { type });
      chunksRef.current = [];
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      if (tickRef.current) {
        window.clearInterval(tickRef.current);
        tickRef.current = null;
      }
      const url = URL.createObjectURL(blob);
      const take: PendingTake = { blob, url, mimeType: type, ext, durationMs };
      setPendingTake(take);
      void doUpload(take);
    };

    rec.start(1000);
    setState('recording');
    setElapsed(0);
    setSize(0);
    tickRef.current = window.setInterval(() => {
      setElapsed(Date.now() - startTimeRef.current);
    }, 250);
  }

  function stopRecording() {
    const rec = recorderRef.current;
    if (rec && rec.state !== 'inactive') {
      try { rec.stop(); } catch { /* noop */ }
    } else {
      // Defensive: clean up if recorder is missing
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      if (tickRef.current) {
        window.clearInterval(tickRef.current);
        tickRef.current = null;
      }
      setState('idle');
    }
  }

  // Uploads a pending take. Called automatically right after recording
  // stops, and again (with the SAME blob) when the user hits Retry after a
  // failure. The take is only cleared from state on success — a failure
  // leaves it fully intact (blob + local object URL) so nothing is lost.
  async function doUpload(take: PendingTake) {
    setState('uploading');
    try {
      await uploadRecording({
        songId,
        blob: take.blob,
        mimeType: take.mimeType,
        ext: take.ext,
        durationMs: take.durationMs,
      });
      URL.revokeObjectURL(take.url);
      setPendingTake(null);
      setState('idle');
      toast.success('Recording saved');
      loadRecordings();
    } catch {
      setState('failed');
      toast.error('Upload failed — take kept locally');
    }
  }

  function discardPendingTake() {
    if (pendingTake) URL.revokeObjectURL(pendingTake.url);
    setPendingTake(null);
    setElapsed(0);
    setSize(0);
    setState('idle');
  }

  async function handleDelete(rec: RecordingRow) {
    if (!window.confirm('Delete this recording? This cannot be undone.')) return;
    try {
      await deleteRecording(rec);
      setRecordings((prev) => prev.filter((r) => r.id !== rec.id));
    } catch (e: unknown) {
      toast.error(errMessage(e, 'Delete failed'));
    }
  }

  const inputOptions: Array<{ id: string; label: string }> = [
    { id: 'default', label: 'Default (system mic)' },
    ...devices.map((d, i) => ({
      id: d.deviceId,
      label: d.label || `Microphone ${i + 1}`,
    })),
  ];

  return (
    <div className={compact ? 'space-y-2' : 'space-y-4'}>
      <div className="flex items-center gap-2 flex-wrap">
        {inputOptions.length > 1 && state === 'idle' && (
          <select
            value={deviceId}
            onChange={(e) => setDeviceId(e.target.value)}
            title="Choose audio input"
            className="border border-border rounded px-2 py-1 bg-card text-sm max-w-[200px] truncate text-foreground focus:outline-none focus:border-primary"
          >
            {inputOptions.map((o) => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
        )}
        {state === 'idle' && (
          <button
            onClick={startRecording}
            className="inline-flex items-center gap-2 rounded-md bg-rose-600 hover:bg-rose-700 text-white font-medium text-sm px-3 py-1.5"
          >
            <Circle className="w-4 h-4 fill-current" />
            Record
          </button>
        )}
        {state === 'recording' && (
          <>
            <button
              onClick={stopRecording}
              className="inline-flex items-center gap-2 rounded-md bg-foreground hover:opacity-90 text-background font-medium text-sm px-3 py-1.5"
            >
              <Square className="w-4 h-4 fill-current" />
              Stop
            </button>
            <span className="inline-flex items-center gap-2 text-muted-foreground text-sm">
              <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
              {formatTime(elapsed)}
              <span className="text-muted-foreground/70">· {formatSize(size)}</span>
            </span>
          </>
        )}
        {state === 'uploading' && (
          <span className="inline-flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Uploading…
          </span>
        )}
      </div>

      {pendingTake && (state === 'uploading' || state === 'failed') && (
        <div className="border border-border rounded-md p-3 space-y-2 bg-card">
          <audio controls src={pendingTake.url} className="w-full" />
          {state === 'failed' && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <span className="text-sm text-rose-600 flex-1">Upload failed — take kept locally</span>
              <div className="flex gap-2">
                <button
                  onClick={() => doUpload(pendingTake)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md bg-primary text-primary-foreground hover:opacity-90"
                >
                  <RotateCcw className="w-4 h-4" />
                  Retry
                </button>
                <button
                  onClick={discardPendingTake}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border border-border text-muted-foreground hover:bg-muted"
                >
                  <X className="w-4 h-4" />
                  Discard
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {recordings.length === 0 ? (
        !compact && <p className="text-sm text-muted-foreground">No recordings yet.</p>
      ) : compact ? (
        <details className="border border-border rounded-md bg-card">
          <summary className="px-2.5 py-1.5 cursor-pointer text-sm font-medium text-foreground select-none">
            {recordings.length} recording{recordings.length === 1 ? '' : 's'} — tap to expand
          </summary>
          <ul className="space-y-2 p-2 border-t border-border">
            {recordings.map((r) => renderRecordingItem(r))}
          </ul>
        </details>
      ) : (
        <ul className="space-y-3">
          {recordings.map((r) => renderRecordingItem(r))}
        </ul>
      )}
    </div>
  );

  function renderRecordingItem(r: RecordingRow) {
    const padding = compact ? 'p-2' : 'p-3';
    return (
      <li key={r.id} className={`border border-border rounded-md ${padding} bg-card`}>
        <div className="flex items-center justify-between mb-2 gap-2">
          <span className="text-sm text-muted-foreground">
            {new Date(r.created_at).toLocaleString()}
          </span>
          <button
            onClick={() => handleDelete(r)}
            className="text-muted-foreground hover:text-rose-600 p-1"
            title="Delete recording"
            aria-label="Delete recording"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        {/* A take with no signed url is still a real, saved take — show it and
            say what is wrong. Hiding it is what made five recordings look like
            they had never been made. */}
        {r.url ? (
          <audio controls preload="none" src={r.url} className="w-full" />
        ) : (
          <p className="text-sm text-rose-600">
            Saved, but the audio could not be loaded right now. It is not lost — try reloading in a moment.
          </p>
        )}
        <div className="mt-1 text-sm text-muted-foreground flex gap-3">
          <span>{formatSize(r.size_bytes)}</span>
          {r.duration_ms ? <span>{formatTime(r.duration_ms)}</span> : null}
        </div>
      </li>
    );
  }
}
