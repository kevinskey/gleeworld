import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Music, Mic2, Download, Play, Square, Save, RefreshCw, Pause, Mic, Share2, Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import MicTest from '@/components/media/MicTest';
import { getFileUrl } from '@/utils/storage';
import { useAudioRecorder } from '@/components/sight-singing/hooks/useAudioRecorder';
import { useKaraokeRecordings } from '@/hooks/useKaraokeRecordings';

// @ts-ignore - lamejs has no types
import lamejs from 'lamejs';

interface MediaItem {
  id: string;
  title?: string | null;
  file_url: string;
  file_type?: string | null;
  file_path?: string | null;
  bucket_id?: string | null;
}

export const KaraokeModule: React.FC = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(true);
  const [mode, setMode] = useState<'menu' | 'practice' | 'record' | 'setup'>('menu');
  const [savedRecording, setSavedRecording] = useState<{ blob: Blob; url: string } | null>(null);
  const { isRecording, recordingDuration, audioBlob, startRecording: startSimpleRecording, stopRecording: stopSimpleRecording, clearRecording: clearSimpleRecording } = useAudioRecorder();
  const { uploadRecording } = useKaraokeRecordings();
  
  const [track, setTrack] = useState<MediaItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [micPermission, setMicPermission] = useState<'unknown'|'granted'|'denied'>('unknown');
  const [micVolume, setMicVolume] = useState(1);
  const [trackVolume, setTrackVolume] = useState(0.9);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [mixSourceBlob, setMixSourceBlob] = useState<Blob | null>(null);
  const [mixedMp3, setMixedMp3] = useState<Blob | null>(null);
  const [mixing, setMixing] = useState(false);
  const [isPracticePlaying, setIsPracticePlaying] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [autoMix, setAutoMix] = useState(true);

  // Generate preview URL for raw mic recording
  useEffect(() => {
    if (!recordedBlob) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(recordedBlob);
    setPreviewUrl(url);
    console.log('[Karaoke] Preview URL set', { url, size: recordedBlob.size, type: recordedBlob.type });
  }, [recordedBlob]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const previewSetRef = useRef(false);
  const lastAutoMixedRef = useRef<Blob | null>(null);

  // Fallback Web Audio recording
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const micSourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const monitorGainRef = useRef<GainNode | null>(null);
  const webAudioChunksRef = useRef<Float32Array[]>([]);
  const [recorderMode, setRecorderMode] = useState<'mediarecorder' | 'webaudio'>('mediarecorder');

  useEffect(() => {
    // Attempt to locate the backing track automatically
    const fetchTrack = async () => {
      try {
        setLoading(true);
        const { data, error } = await (supabase
          .from('gw_media_library') as any)
          .select('id,title,file_url,file_path,bucket_id')
          .ilike('title', 'Choice Band%')
          .order('created_at', { ascending: false })
          .limit(1);
        if (error) throw error;
        const item = data && data[0];
        if (item && item.file_url) {
          setTrack(item as MediaItem);
        } else {
          toast("Could not find 'Choice Band' in Media Library. Please upload it.");
        }
      } catch (e) {
        console.error(e);
        toast("Error loading media library.");
      } finally {
        setLoading(false);
      }
    };
    fetchTrack();
  }, []);

  useEffect(() => {
    // Keep audio element volume in sync
    if (audioElRef.current) {
      audioElRef.current.volume = Math.max(0, Math.min(1, trackVolume));
    }
  }, [trackVolume]);

  // Keep live monitor gain in sync with UI
  useEffect(() => {
    if (monitorGainRef.current) {
      try { monitorGainRef.current.gain.value = micVolume; } catch {}
    }
  }, [micVolume]);

  useEffect(() => {
    // Check mic permission on load (don't request it automatically)
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.enumerateDevices()
        .then(devices => {
          const hasMic = devices.some(device => device.kind === 'audioinput');
          if (hasMic) {
            console.log('Microphone detected, waiting for user to request permission');
            // Don't auto-request permission, just set to unknown
            setMicPermission('unknown');
          } else {
            console.log('No microphone detected');
            setMicPermission('denied');
          }
        })
        .catch(err => {
          console.error('Error checking devices:', err);
        });
    }
  }, []);

  // Resolve a playable URL (handles private buckets via signed URLs)
  const resolveTrackUrl = async (): Promise<string> => {
    if (!track) return '';
    try {
      if (track.bucket_id && track.file_path) {
        const url = await getFileUrl(track.bucket_id, track.file_path);
        return url || track.file_url;
      }
    } catch (e) {
      console.error('Failed to resolve signed URL', e);
    }
    return track.file_url;
  };

  const requestMicPermission = async () => {
    const stopAll = (stream: MediaStream) => {
      stream.getTracks().forEach(t => {
        t.stop();
        console.log('Stopped track:', t.label);
      });
    };

    try {
      console.log('Requesting microphone permission (preferred constraints)...');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          channelCount: 1,
          sampleRate: 48000
        } as MediaTrackConstraints
      });
      console.log('Microphone permission granted');
      setMicPermission('granted');
      stopAll(stream);
      toast("Microphone access granted!");
    } catch (primaryErr: any) {
      console.warn('Primary mic request failed:', primaryErr?.name, primaryErr);

      // Retry with minimal constraints – some devices reject advanced constraints
      try {
        console.log('Retrying microphone permission with minimal constraints...');
        const fallbackStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log('Microphone permission granted (fallback)');
        setMicPermission('granted');
        stopAll(fallbackStream);
        toast("Microphone access granted!");
      } catch (err: any) {
        console.error('Microphone permission error (fallback):', err);

        // One more attempt: try targeting a specific input device
        try {
          console.log('Enumerating devices to try a specific microphone...');
          const devices = await navigator.mediaDevices.enumerateDevices();
          const mics = devices.filter(d => d.kind === 'audioinput');
          if (mics.length > 0) {
            const preferred = mics[0];
            console.log('Trying deviceId:', preferred.deviceId, preferred.label || '(label hidden until granted)');
            const specificStream = await navigator.mediaDevices.getUserMedia({
              audio: { deviceId: { exact: preferred.deviceId } }
            });
            console.log('Microphone permission granted (device-specific)');
            setMicPermission('granted');
            stopAll(specificStream);
            toast("Microphone access granted!");
            return;
          }
        } catch (specificErr: any) {
          console.warn('Device-specific request failed:', specificErr?.name, specificErr);
        }

        setMicPermission('denied');
        const errorName = err?.name || primaryErr?.name || '';
        if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError') {
          toast("Microphone access denied. Allow access in Chrome (lock icon) and macOS Settings > Privacy & Security > Microphone.");
        } else if (errorName === 'NotFoundError' || errorName === 'DevicesNotFoundError') {
          toast("No microphone found. Please connect a microphone or select the correct input in Chrome settings.");
        } else if (errorName === 'NotReadableError') {
          toast("Mic couldn't start. Close other tabs, disable extensions using the mic, then retry. If on macOS, enable Chrome under System Settings > Privacy & Security > Microphone and restart Chrome.");
        } else if (errorName === 'OverconstrainedError' || errorName === 'AbortError') {
          toast("Mic not available with current settings. Please retry or select another input device in Chrome.");
        } else {
          toast("Failed to access microphone. Error: " + (err?.message || primaryErr?.message || 'Unknown error'));
        }
      }
    }
  };

  const chooseSupportedMimeType = (): string | undefined => {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4'
    ];
    for (const t of types) {
      try {
        if ((window as any).MediaRecorder && (MediaRecorder as any).isTypeSupported?.(t)) return t;
      } catch {}
    }
    return undefined;
  };

  const createWavBlob = (buffers: Float32Array[], sampleRate: number): Blob => {
    let length = 0;
    for (const b of buffers) length += b.length;
    const pcmFloat = new Float32Array(length);
    let offset = 0;
    for (const b of buffers) { pcmFloat.set(b, offset); offset += b.length; }

    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = sampleRate * numChannels * bitsPerSample / 8;
    const blockAlign = numChannels * bitsPerSample / 8;

    const buffer = new ArrayBuffer(44 + pcmFloat.length * 2);
    const view = new DataView(buffer);
    const writeString = (off: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)); };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + pcmFloat.length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    writeString(36, 'data');
    view.setUint32(40, pcmFloat.length * 2, true);

    let idx = 44;
    for (let i = 0; i < pcmFloat.length; i++) {
      let s = Math.max(-1, Math.min(1, pcmFloat[i]));
      view.setInt16(idx, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      idx += 2;
    }

    return new Blob([view], { type: 'audio/wav' });
  };

  // Ensure browser-playable audio; if not, transcode to WAV via Web Audio
  const ensurePlayableBlob = async (inBlob: Blob): Promise<Blob> => {
    try {
      const testEl = document.createElement('audio');
      const type = inBlob.type || 'audio/webm';
      if (testEl.canPlayType(type)) return inBlob;
    } catch {}
    try {
      const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
      const ctx = audioCtxRef.current || new Ctx();
      const ab = await inBlob.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(ab.slice(0));
      const pcm = audioBuffer.getChannelData(0);
      const copy = new Float32Array(pcm.length);
      copy.set(pcm);
      return createWavBlob([copy], audioBuffer.sampleRate || ctx.sampleRate || 44100);
    } catch (e) {
      console.warn('Transcode to WAV failed, using original blob', e);
      return inBlob;
    }
  };

  const startWebAudioRecording = async (stream: MediaStream, setMode: boolean = true) => {
    if (scriptProcessorRef.current) {
      console.log('WebAudio tap already running');
      return;
    }
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    const ctx = audioCtxRef.current || new Ctx();
    audioCtxRef.current = ctx;
      if (ctx.state === 'suspended') {
        try { await ctx.resume(); } catch {}
      }
    const source = ctx.createMediaStreamSource(stream);
    micSourceNodeRef.current = source;
    const sp = ctx.createScriptProcessor(1024, 1, 1);
    scriptProcessorRef.current = sp;
    webAudioChunksRef.current = [];
    sp.onaudioprocess = (e) => {
      const input = e.inputBuffer.getChannelData(0);
      webAudioChunksRef.current.push(new Float32Array(input));
    };
    source.connect(sp);
    // Ensure the ScriptProcessor is pulled by the graph (silent tap)
    const nullGain = ctx.createGain();
    nullGain.gain.value = 0;
    sp.connect(nullGain).connect(ctx.destination);
    // Monitoring is handled via a separate gain chain
    if (setMode) setRecorderMode('webaudio');
  };
  const stopWebAudioRecording = () => {
    scriptProcessorRef.current?.disconnect();
    const sr = audioCtxRef.current?.sampleRate || 44100;
    const chunks = webAudioChunksRef.current;
    if (chunks.length) {
      const blob = createWavBlob(chunks, sr);
      setRecordedBlob(blob);
      setMixSourceBlob(blob);
      previewSetRef.current = true;
      console.log('WebAudio recording stopped, preview ready', { size: blob.size, type: blob.type, chunks: chunks.length });
      toast("Mic recording captured.");
    }
    webAudioChunksRef.current = [];
    scriptProcessorRef.current = null;
  };

  const stopWebAudioTap = (): Blob | null => {
    scriptProcessorRef.current?.disconnect();
    const sr = audioCtxRef.current?.sampleRate || 44100;
    const chunks = webAudioChunksRef.current;
    let blob: Blob | null = null;
    if (chunks.length) {
      blob = createWavBlob(chunks, sr);
    }
    webAudioChunksRef.current = [];
    scriptProcessorRef.current = null;
    return blob;
  };

  const startRecording = async () => {
    // Reset preview state and buffers for a fresh take
    console.log('[Karaoke] startRecording invoked');
    previewSetRef.current = false;
    setRecordedBlob(null);
    setMixSourceBlob(null);
    setPreviewUrl(null);
    setMixedMp3(null);
    recordedChunksRef.current = [];

    if (!track) {
      toast("No backing track loaded — recording mic only.");
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          channelCount: 1,
          sampleRate: 48000
        } as MediaTrackConstraints
      });
      micStreamRef.current = stream;

      // Ensure AudioContext and build monitor chain so singer hears themselves
      const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
      let ctx = audioCtxRef.current;
      if (!ctx) {
        try { ctx = new Ctx({ latencyHint: 'interactive', sampleRate: 48000 }); } catch { ctx = new Ctx(); }
      }
      audioCtxRef.current = ctx;
      if (ctx.state === 'suspended') {
        try { await ctx.resume(); } catch {}
      }
      try {
        micSourceNodeRef.current = ctx.createMediaStreamSource(stream);
        monitorGainRef.current = ctx.createGain();
        monitorGainRef.current.gain.value = micVolume;
        micSourceNodeRef.current.connect(monitorGainRef.current).connect(ctx.destination);
      } catch (e) {
        console.warn('Mic monitor setup failed', e);
      }

      // Start a parallel WebAudio tap to guarantee preview
      await startWebAudioRecording(stream, false);
      console.log('Parallel WebAudio tap started');

      // Decide recording mode (fall back safely if MediaRecorder fails)
      const mime = chooseSupportedMimeType();
      try {
        if ((window as any).MediaRecorder && mime) {
          const mr = new MediaRecorder(stream, { mimeType: mime, audioBitsPerSecond: 256000 });
          recordedChunksRef.current = [];
          mr.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
              recordedChunksRef.current.push(e.data);
              console.log('MediaRecorder dataavailable', { size: e.data.size, chunks: recordedChunksRef.current.length });
            } else {
              console.warn('MediaRecorder dataavailable empty');
            }
          };
          mr.onstop = async () => {
            console.log('MediaRecorder onstop fired', { chunks: recordedChunksRef.current.length });
            const raw = new Blob(recordedChunksRef.current, { type: mime });
            const playable = await ensurePlayableBlob(raw);
            setRecordedBlob(playable);
            previewSetRef.current = true;
            console.log('MediaRecorder stopped, preview ready', { size: playable.size, type: playable.type });
            toast("Mic recording captured.");
          };
          mediaRecorderRef.current = mr;
          setRecorderMode('mediarecorder');
        } else {
          await startWebAudioRecording(stream);
        }
      } catch (err) {
        console.warn('MediaRecorder init failed — using WebAudio fallback', err);
        await startWebAudioRecording(stream);
      }

      // Start recorder first
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'recording') {
        // Small slice to ensure frequent dataavailable events
        mediaRecorderRef.current.start(100);
      }
      // Note: isRecording state is managed by useAudioRecorder hook

      // Play the backing track if available (safe iOS prime)
      if (track) {
        const srcUrl = await resolveTrackUrl();
        if (!audioElRef.current) {
          const a = new Audio();
          a.preload = 'auto';
          (a as any).playsInline = true;
          a.crossOrigin = 'anonymous';
          audioElRef.current = a;
        }
        const el = audioElRef.current;
        if (el.crossOrigin !== 'anonymous') el.crossOrigin = 'anonymous';
        if (el.src !== srcUrl) el.src = srcUrl;
        el.currentTime = 0;
        el.muted = true;
        el.volume = 0;

        try {
          await el.play();
        } catch (e) {
          console.warn('Autoplay rejected during recording start', e);
        }
        setTimeout(() => {
          el.muted = false;
          el.volume = Math.max(0, Math.min(1, trackVolume));
        }, 80);
      }

      toast("Recording started.");
    } catch (err: any) {
      console.error('startRecording error', err);
      const name = err?.name || '';
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        setMicPermission('denied');
        toast("Microphone blocked. Use the lock icon in the address bar to allow mic, then try again.");
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        toast("No microphone detected. Plug in or select a mic in system settings.");
      } else {
        toast("Failed to access microphone.");
      }
    }
  };

  const stopRecording = async () => {
    console.log('[Karaoke] stopRecording invoked', { mode: recorderMode, mrState: mediaRecorderRef.current?.state });
    // Stop depending on the active recorder mode
    if (recorderMode === 'webaudio') {
      stopWebAudioRecording();
    } else if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.requestData?.();
      } catch {}
      mediaRecorderRef.current.stop();

      // Harvest parallel WebAudio tap immediately for a guaranteed preview
      try {
        const tapBlob = stopWebAudioTap();
        if (tapBlob) {
          setMixSourceBlob(tapBlob);
        }
        if (tapBlob && !previewSetRef.current) {
          setRecordedBlob(tapBlob);
          previewSetRef.current = true;
          console.log('Preview generated from WebAudio tap', { size: tapBlob.size, type: tapBlob.type });
        }
      } catch (e) {
        console.warn('Stopping WebAudio tap failed', e);
      }

      // Fallback in case MediaRecorder onstop is delayed
      setTimeout(async () => {
        try {
          if (!previewSetRef.current && recordedChunksRef.current.length) {
            const type = (mediaRecorderRef.current as any)?.mimeType || 'audio/webm';
            const fallbackBlob = new Blob(recordedChunksRef.current, { type });
            const playable = await ensurePlayableBlob(fallbackBlob);
            setRecordedBlob(playable);
            previewSetRef.current = true;
            console.log('Fallback preview prepared', { size: playable.size, type: playable.type });
          }
        } catch (e) {
          console.warn('Fallback preview failed', e);
        }
      }, 1200);
    }
    if (audioElRef.current) audioElRef.current.pause();
    micStreamRef.current?.getTracks().forEach(t => t.stop());

    // Tear down monitoring chain
    try {
      monitorGainRef.current?.disconnect();
      monitorGainRef.current = null;
      micSourceNodeRef.current?.disconnect();
      micSourceNodeRef.current = null;
    } catch {}

    // Note: isRecording state is managed by useAudioRecorder hook
    setTimeout(() => {
      try {
        if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
          audioCtxRef.current.close();
        }
      } catch (_) {}
    }, 1200);

    // Final guard: report if no preview was prepared
    setTimeout(() => {
      if (!previewSetRef.current) {
        console.warn('[Karaoke] No preview captured', { chunks: recordedChunksRef.current.length, webAudioBuffers: webAudioChunksRef.current.length });
        toast("No audio captured. Please check microphone permissions and try again.");
      }
    }, 1800);

  };

  const clearRecording = () => {
    try { audioElRef.current?.pause(); } catch {}
    setRecordedBlob(null);
    setMixSourceBlob(null);
    setMixedMp3(null);
    setPreviewUrl(null);
    toast("Recording cleared. Ready for a new take.");
  };

  const togglePractice = async () => {
    if (!track) {
      toast("No backing track found.");
      return;
    }
    try {
      const createOrUpdateEl = () => {
        if (!audioElRef.current) {
          const a = new Audio();
          a.preload = 'auto';
          (a as any).playsInline = true;
          a.crossOrigin = 'anonymous';
          audioElRef.current = a;
        }
        const el2 = audioElRef.current!;
        // Ensure crossorigin is set BEFORE assigning src
        if (el2.crossOrigin !== 'anonymous') el2.crossOrigin = 'anonymous';
        if (el2.src !== track.file_url) {
          el2.src = track.file_url;
        }
        return el2;
      };
      const el = createOrUpdateEl();

      // Ensure we use a playable URL (signed for private buckets)
      const srcUrl = await resolveTrackUrl();
      if (el.src !== srcUrl) {
        el.src = srcUrl;
      }

      // Wait for decodable state to avoid play() rejection (fallback + timeout)
      await new Promise<void>((resolve) => {
        if (el.readyState >= 2) return resolve();
        let settled = false;
        const onReady = () => {
          if (settled) return;
          settled = true;
          el.removeEventListener('canplaythrough', onReady);
          el.removeEventListener('loadeddata', onReady);
          resolve();
        };
        const to = setTimeout(() => {
          if (settled) return;
          settled = true;
          el.removeEventListener('canplaythrough', onReady);
          el.removeEventListener('loadeddata', onReady);
          resolve();
        }, 1500);
        el.addEventListener('canplaythrough', onReady, { once: true });
        el.addEventListener('loadeddata', onReady, { once: true });
        el.load();
      });

      if (isPracticePlaying) {
        el.pause();
        setIsPracticePlaying(false);
        return;
      }

      // Prime with muted playback (iOS/silent switch safe), then unmute
      el.muted = true;
      el.volume = 0;
      el.currentTime = 0;
      await el.play();
      setTimeout(() => {
        el.muted = false;
        el.volume = Math.max(0, Math.min(1, trackVolume));
      }, 80);

      setIsPracticePlaying(true);
      el.onended = () => setIsPracticePlaying(false);
      el.onerror = (ev: any) => {
        console.error('Audio error', ev);
        toast("Audio error: unable to play the backing track.");
      };
    } catch (e: any) {
      console.error('Practice play error', e);
      toast(e?.message || "Playback blocked. Tap Enable Audio above or disable Silent Mode and try again.");
    }
  };
  const enableAudio = async () => {
    try {
      if (!audioCtxRef.current) {
        const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
        audioCtxRef.current = new Ctx();
      }
      if (audioCtxRef.current.state === 'suspended') {
        await audioCtxRef.current.resume();
      }
      if (track) {
        if (!audioElRef.current) {
          audioElRef.current = new Audio(track.file_url);
        } else if (audioElRef.current.src !== track.file_url) {
          audioElRef.current.src = track.file_url;
        }
        audioElRef.current.muted = true;
        audioElRef.current.volume = 0;
        audioElRef.current.currentTime = 0;
        try {
          await audioElRef.current.play();
          audioElRef.current.pause();
        } catch (_) {
          // ignore – some browsers won't play muted programmatically
        }
        audioElRef.current.muted = false;
        audioElRef.current.volume = Math.max(0, Math.min(1, trackVolume));
      }
      setAudioReady(true);
      toast("Audio enabled.");
    } catch (e) {
      console.error(e);
      toast("Could not enable audio. Please tap again.");
    }
  };
  const floatTo16BitPCM = (input: Float32Array) => {
    const output = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return output;
  };
  const encodeToMp3 = (audioBuffer: AudioBuffer): Blob => {
    const numChannels = 1; // we will render mono
    const sampleRate = audioBuffer.sampleRate;
    const kbps = 192;
    const encoder = new (lamejs as any).Mp3Encoder(numChannels, sampleRate, kbps);

    const samples = audioBuffer.getChannelData(0); // mono
    const blockSize = 1152;
    const mp3Data: Uint8Array[] = [];
    let i = 0;
    while (i < samples.length) {
      const chunk = samples.subarray(i, i + blockSize);
      const mono = floatTo16BitPCM(chunk);
      const mp3buf: Uint8Array = encoder.encodeBuffer(mono);
      if (mp3buf.length > 0) mp3Data.push(mp3buf);
      i += blockSize;
    }
    const end = encoder.flush();
    if (end.length > 0) mp3Data.push(end);

    return new Blob(mp3Data as BlobPart[], { type: 'audio/mpeg' });
  };
  const mixAndEncode = async () => {
    if (mixing) return;
    if (!recordedBlob) {
      toast("Nothing to mix yet.");
      return;
    }
    setMixing(true);
    let ctx: AudioContext | null = null;
    try {
      ctx = new AudioContext();
      const micBlob = mixSourceBlob || recordedBlob;

      // Decode mic first (must succeed)
      let micBuf: AudioBuffer;
      try {
        const micAb = await micBlob.arrayBuffer();
        micBuf = await ctx.decodeAudioData(micAb.slice(0));
      } catch (e) {
        console.error('Decode mic failed', e);
        toast("Could not decode mic recording.");
        return;
      }

      // Try to decode backing track; if it fails, export mic-only
      let trackBuf: AudioBuffer | null = null;
      try {
        if (track) {
          const trackUrl = (await resolveTrackUrl()) || track.file_url;
          const trackAb = await fetch(trackUrl).then(r => r.arrayBuffer());
          trackBuf = await ctx.decodeAudioData(trackAb.slice(0));
        }
      } catch (e) {
        console.warn('Decode track failed, exporting mic-only', e);
      }

      // Use mono offline context for simpler MP3 encode
      const sampleRate = 44100;
      // Render only as long as the mic recording to avoid huge offline buffers
      const duration = micBuf.duration;
      console.log('[Karaoke] Mix params', {
        micDuration: micBuf.duration,
        trackDuration: trackBuf?.duration ?? null,
        sampleRate,
        frames: Math.ceil(duration * sampleRate),
      });
      const length = Math.ceil(duration * sampleRate);
      const offline = new OfflineAudioContext(1, length, sampleRate);

      // Mic source + gain
      const micSource = offline.createBufferSource();
      const micMono = offline.createBuffer(1, Math.floor(micBuf.duration * sampleRate), sampleRate);
      const tmpMic = micBuf.numberOfChannels > 1
        ? (() => {
            const chL = micBuf.getChannelData(0);
            const chR = micBuf.getChannelData(1);
            const mono = new Float32Array(Math.min(chL.length, chR.length));
            for (let i = 0; i < mono.length; i++) mono[i] = (chL[i] + chR[i]) / 2;
            return mono;
          })()
        : micBuf.getChannelData(0);
      micMono.copyToChannel(tmpMic.subarray(0, micMono.length), 0);
      micSource.buffer = micMono;
      const micGainNode = offline.createGain();
      micGainNode.gain.value = micVolume;
      micSource.connect(micGainNode).connect(offline.destination);

      // Track source + gain (optional)
      if (trackBuf) {
        const trackSource = offline.createBufferSource();
        const trackMono = offline.createBuffer(1, Math.floor(duration * sampleRate), sampleRate);
        const tmpTrack = trackBuf.numberOfChannels > 1
          ? (() => {
              const chL = trackBuf.getChannelData(0);
              const chR = trackBuf.getChannelData(1);
              const mono = new Float32Array(Math.min(chL.length, chR.length));
              for (let i = 0; i < mono.length; i++) mono[i] = (chL[i] + chR[i]) / 2;
              return mono;
            })()
          : trackBuf.getChannelData(0);
        trackMono.copyToChannel(tmpTrack.subarray(0, trackMono.length), 0);
        trackSource.buffer = trackMono;
        const trackGain = offline.createGain();
        trackGain.gain.value = trackVolume;
        trackSource.connect(trackGain).connect(offline.destination);
        trackSource.start(0);
      }

      micSource.start(0);

      const rendered = await offline.startRendering();
      const mp3Blob = encodeToMp3(rendered);
      setMixedMp3(mp3Blob);
      toast(trackBuf ? "Mix rendered. You can download or save to library." : "Mic exported. Backing track could not be decoded.");
    } catch (e) {
      console.error('Mix error', e);
      toast("Mixing failed. Your browser may not support decoding this audio.");
    } finally {
      try { await ctx?.close(); } catch {}
      setMixing(false);
    }
  };
  // Auto-mix once per new take
  useEffect(() => {
    if (!autoMix || !recordedBlob || !track) return;
    if (lastAutoMixedRef.current === recordedBlob) return;
    lastAutoMixedRef.current = recordedBlob;
    void mixAndEncode();
  }, [autoMix, recordedBlob, track]);
  const downloadMp3 = () => {
    if (!mixedMp3) return;
    const url = URL.createObjectURL(mixedMp3);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(track?.title || 'choice-band')}-karaoke-mix.mp3`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const saveToLibrary = async () => {
    if (!user || !mixedMp3) {
      toast("No MP3 to save or not authenticated.");
      return;
    }
    try {
      setLoading(true);
      const date = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      const ymd = `${date.getFullYear()}${pad(date.getMonth()+1)}${pad(date.getDate())}`;
      const filePath = `${user.id}/karaoke/${ymd}-${crypto.randomUUID()}-choice-band-mix.mp3`;

      const { error: upErr } = await supabase.storage
        .from('service-images')
        .upload(filePath, mixedMp3, { contentType: 'audio/mpeg' });
      if (upErr) throw upErr;

      const { data: { publicUrl } } = supabase.storage
        .from('service-images')
        .getPublicUrl(filePath);

      const { error: insertErr } = await supabase
        .from('gw_media_library')
        .insert({
          title: `${track?.title || 'Choice Band'} Karaoke Mix`,
          description: 'Karaoke mix recorded in-app',
          file_url: publicUrl,
          file_path: filePath,
          file_type: 'audio/mpeg',
          mime_type: 'audio/mpeg',
          file_size: mixedMp3.size,
          category: 'karaoke',
          uploaded_by: user.id,
          is_public: true,
          is_featured: false
        });
      if (insertErr) throw insertErr;
      toast("Saved to Media Library.");
    } catch (e) {
      console.error(e);
      toast("Failed to save to library.");
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleRecord = async () => {
    if (isRecording) {
      stopSimpleRecording();
    } else {
      clearSimpleRecording();
      setSavedRecording(null);
      await startSimpleRecording();
    }
  };

  const handleSaveRecording = () => {
    if (audioBlob) {
      const url = URL.createObjectURL(audioBlob);
      setSavedRecording({ blob: audioBlob, url });
      toast("Recording saved! Ready to share.");
    }
  };

  const handleShare = async () => {
    if (!savedRecording || !user) {
      toast("Please record something first and make sure you're logged in");
      return;
    }

    try {
      const result = await uploadRecording(
        savedRecording.blob,
        "My Karaoke Performance",
        "A Choice to Change the World"
      );

      if (result.success) {
        toast("Your karaoke recording has been posted!");
        clearSimpleRecording();
        setSavedRecording(null);
        setMode('menu');
      }
    } catch (error) {
      console.error('Error sharing recording:', error);
      toast("Failed to share recording. Please try again.");
    }
  };

  const handleDownload = () => {
    if (savedRecording) {
      const a = document.createElement('a');
      a.href = savedRecording.url;
      a.download = `karaoke-recording-${Date.now()}.webm`;
      a.click();
      toast("Recording downloaded!");
    }
  };

  const renderContent = () => {
    if (mode === 'menu') {
      return (
        <div className="space-y-3 p-2 sm:p-4">
          {/* Title */}
          <Card className="p-4 sm:p-8 border-4 border-foreground bg-background">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-center leading-tight tracking-tight">
              <span className="inline-block text-outline-bold text-2xl sm:text-3xl">A CHOICE</span>
              <br />
              <span className="inline-block text-outline-bold text-2xl sm:text-3xl">TO CHANGE</span>
              <br />
              <span className="inline-block text-outline-bold text-2xl sm:text-3xl">THE WORLD</span>
              <br />
              <span className="text-4xl sm:text-5xl md:text-6xl mt-2 block">KARAOKE</span>
              <br />
              <span className="text-4xl sm:text-5xl md:text-6xl">CHALLENGE</span>
            </h1>
          </Card>

          {/* Practice Button */}
          <Button
            onClick={() => setMode('practice')}
            className="w-full h-20 sm:h-24 text-2xl sm:text-3xl font-black border-4 border-foreground bg-background text-foreground hover:bg-muted active:scale-95 transition-transform text-outline flex items-center justify-start px-4 sm:px-6 gap-3"
            variant="outline"
          >
            <Play className="h-12 w-12 sm:h-14 sm:w-14 fill-destructive text-destructive flex-shrink-0" />
            <span className="text-outline">PRACTICE</span>
          </Button>

          {/* Record Button */}
          <Button
            onClick={() => setMode('record')}
            className="w-full h-20 sm:h-24 text-2xl sm:text-3xl font-black border-4 border-foreground bg-background hover:bg-muted active:scale-95 transition-transform flex items-center justify-start px-4 sm:px-6 gap-3"
            variant="outline"
          >
            <Play className="h-12 w-12 sm:h-14 sm:w-14 fill-destructive text-destructive flex-shrink-0" />
            <span className="text-destructive font-black text-outline-red">RECORD</span>
          </Button>

          {/* Share Button */}
          <Button
            onClick={handleShare}
            disabled={!savedRecording}
            className="w-full h-20 sm:h-24 text-3xl sm:text-4xl border-4 border-foreground bg-background text-foreground hover:bg-muted active:scale-95 transition-transform font-script disabled:opacity-50"
            variant="outline"
          >
            Share
          </Button>

          {/* Download Button */}
          <Button
            onClick={handleDownload}
            disabled={!savedRecording}
            className="w-full h-20 sm:h-24 text-3xl sm:text-4xl border-4 border-foreground bg-background text-foreground hover:bg-muted active:scale-95 transition-transform font-script disabled:opacity-50"
            variant="outline"
          >
            Download
          </Button>

          {/* Setup Button */}
          <Button
            onClick={() => setMode('setup')}
            className="w-full h-20 sm:h-24 text-3xl sm:text-4xl font-black border-4 border-foreground bg-destructive text-destructive-foreground hover:bg-destructive/90 active:scale-95 transition-transform"
          >
            SETUP
          </Button>
        </div>
      );
    }

    if (mode === 'record') {
      return (
        <div className="space-y-4 p-2 sm:p-4">
          <Button
            onClick={() => setMode('menu')}
            variant="outline"
            className="mb-2 h-12 text-base active:scale-95 transition-transform"
          >
            ← Back to Menu
          </Button>

          <Card className="p-4 sm:p-6 border-4 border-foreground">
            <h2 className="text-2xl sm:text-3xl font-black text-center mb-4 sm:mb-6 text-outline">RECORD MODE</h2>
            
            <div className="flex flex-col items-center gap-4 sm:gap-6">
              {/* Recording Duration */}
              <div className="text-5xl sm:text-6xl font-mono font-bold tabular-nums">
                {formatDuration(recordingDuration)}
              </div>

              {/* Record/Stop Button - Extra large touch target */}
              <Button
                onClick={handleRecord}
                size="lg"
                className={`h-28 w-28 sm:h-32 sm:w-32 rounded-full active:scale-90 transition-transform ${
                  isRecording 
                    ? 'bg-destructive hover:bg-destructive/90' 
                    : 'bg-primary hover:bg-primary/90'
                }`}
              >
                {isRecording ? (
                  <div className="h-10 w-10 sm:h-12 sm:w-12 bg-white rounded-sm" />
                ) : (
                  <Mic className="h-14 w-14 sm:h-16 sm:w-16" />
                )}
              </Button>

              {/* Save Recording Button */}
              {audioBlob && !isRecording && (
                <Button
                  onClick={handleSaveRecording}
                  size="lg"
                  className="w-full h-14 sm:h-16 text-lg sm:text-xl font-bold active:scale-95 transition-transform"
                >
                  Save Recording
                </Button>
              )}

              {/* Audio Preview */}
              {savedRecording && (
                <div className="w-full">
                  <audio controls src={savedRecording.url} className="w-full h-12" />
                </div>
              )}
            </div>
          </Card>
        </div>
      );
    }

    if (mode === 'setup') {
      return (
        <div className="space-y-2 p-2 sm:p-4 max-h-[80vh] overflow-y-auto">
          <Button
            onClick={() => setMode('menu')}
            variant="outline"
            className="mb-2 h-10 text-sm active:scale-95 transition-transform"
          >
            ← Back to Menu
          </Button>
          <Card className="p-3 sm:p-6 border-4 border-foreground">
            <h2 className="text-lg sm:text-2xl font-black text-center mb-3 sm:mb-6 text-outline">SETUP</h2>
            
            <Accordion type="multiple" defaultValue={['permissions', 'volumes']} className="space-y-2">
              {/* Microphone Permission - Collapsible */}
              <AccordionItem value="permissions" className="border rounded-lg px-3">
                <AccordionTrigger className="text-sm sm:text-base font-bold hover:no-underline py-2">
                  Microphone Access
                </AccordionTrigger>
                <AccordionContent className="pb-3">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <span className="text-xs sm:text-sm text-muted-foreground">
                      Status: <span className={`font-bold ${micPermission === 'granted' ? 'text-green-600' : 'text-amber-600'}`}>
                        {micPermission === 'granted' ? 'Granted' : micPermission === 'denied' ? 'Denied' : 'Not Requested'}
                      </span>
                    </span>
                    {micPermission !== 'granted' && (
                      <Button 
                        size="sm" 
                        onClick={requestMicPermission}
                        className="w-full sm:w-auto h-10 text-xs active:scale-95 transition-transform"
                      >
                        Enable Mic
                      </Button>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Volume Controls - Collapsible */}
              <AccordionItem value="volumes" className="border rounded-lg px-3">
                <AccordionTrigger className="text-sm sm:text-base font-bold hover:no-underline py-2">
                  Volume Controls
                </AccordionTrigger>
                <AccordionContent className="space-y-3 pb-3">
                  {/* Mic Volume */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs sm:text-sm font-medium">Mic</span>
                      <span className="text-xs tabular-nums text-muted-foreground">{Math.round(micVolume*100)}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mic2 className="h-4 w-4 text-primary flex-shrink-0"/>
                      <Slider 
                        value={[Math.round(micVolume*100)]} 
                        onValueChange={(v)=>setMicVolume((v[0]||0)/100)} 
                        className="flex-1"
                      />
                    </div>
                  </div>

                  {/* Track Volume */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs sm:text-sm font-medium">Music</span>
                      <span className="text-xs tabular-nums text-muted-foreground">{Math.round(trackVolume*100)}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Music className="h-4 w-4 text-primary flex-shrink-0"/>
                      <Slider 
                        value={[Math.round(trackVolume*100)]} 
                        onValueChange={(v)=>setTrackVolume((v[0]||0)/100)} 
                        className="flex-1"
                      />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Mic Test - Collapsible */}
              <AccordionItem value="mictest" className="border rounded-lg px-3">
                <AccordionTrigger className="text-sm sm:text-base font-bold hover:no-underline py-2">
                  Mic Test
                </AccordionTrigger>
                <AccordionContent className="pb-3">
                  <div className="bg-muted/50 rounded p-2">
                    <MicTest />
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Track Info - Collapsible */}
              {track && (
                <AccordionItem value="track" className="border rounded-lg px-3">
                  <AccordionTrigger className="text-sm sm:text-base font-bold hover:no-underline py-2">
                    Backing Track
                  </AccordionTrigger>
                  <AccordionContent className="pb-3">
                    <div className="text-xs sm:text-sm">
                      <div className="font-medium truncate">{track.title}</div>
                      <div className="text-[10px] sm:text-xs text-muted-foreground truncate mt-1">{track.file_url}</div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>
          </Card>
        </div>
      );
    }

    return (
      <div className="space-y-3 p-2 sm:p-4">
        <Button
          onClick={() => setMode('menu')}
          variant="outline"
          className="mb-2 h-12 text-base active:scale-95 transition-transform"
        >
          ← Back to Menu
        </Button>
        <Card className="p-4 sm:p-6">
          <h2 className="text-xl sm:text-2xl font-black text-center text-outline">PRACTICE MODE</h2>
          <p className="text-center mt-4 text-sm sm:text-base text-muted-foreground">
            Practice mode coming soon...
          </p>
        </Card>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2 h-12 text-base active:scale-95 transition-transform">
          <Mic2 className="h-5 w-5" />
          Open Karaoke Studio
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-3xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto bg-background p-0">
        <DialogTitle className="sr-only">Karaoke Challenge Studio</DialogTitle>
        <DialogDescription className="sr-only">
          Record your voice over the Choice Band track and save your performance
        </DialogDescription>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
};

export default KaraokeModule;
