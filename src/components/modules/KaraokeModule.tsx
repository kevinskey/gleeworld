import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Music, Mic2, Download, Play, Square, Save, RefreshCw, Pause } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import MicTest from '@/components/media/MicTest';
import { getFileUrl } from '@/utils/storage';

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
  const [track, setTrack] = useState<MediaItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [micPermission, setMicPermission] = useState<'unknown'|'granted'|'denied'>('unknown');
  const [micVolume, setMicVolume] = useState(1);
  const [trackVolume, setTrackVolume] = useState(0.9);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [mixedMp3, setMixedMp3] = useState<Blob | null>(null);
  const [mixing, setMixing] = useState(false);
  const [isPracticePlaying, setIsPracticePlaying] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Generate preview URL for raw mic recording
  useEffect(() => {
    if (!recordedBlob) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(recordedBlob);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [recordedBlob]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Fallback Web Audio recording
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const micSourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
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

  useEffect(() => {
    // Probe mic permission without keeping the stream
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        setMicPermission('granted');
        stream.getTracks().forEach(t => t.stop());
      })
      .catch(() => setMicPermission('denied'));
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
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
      setMicPermission('granted');
      stream.getTracks().forEach(t => t.stop());
      toast("Microphone enabled.");
    } catch {
      setMicPermission('denied');
      toast("Microphone access was denied.");
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

  const startWebAudioRecording = async (stream: MediaStream) => {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    const ctx = audioCtxRef.current || new Ctx();
    audioCtxRef.current = ctx;
    if (ctx.state === 'suspended') {
      try { await ctx.resume(); } catch {}
    }
    const source = ctx.createMediaStreamSource(stream);
    micSourceNodeRef.current = source;
    const sp = ctx.createScriptProcessor(4096, 1, 1);
    scriptProcessorRef.current = sp;
    webAudioChunksRef.current = [];
    sp.onaudioprocess = (e) => {
      const input = e.inputBuffer.getChannelData(0);
      webAudioChunksRef.current.push(new Float32Array(input));
    };
    source.connect(sp);
    sp.connect(ctx.destination);
    setRecorderMode('webaudio');
  };

  const stopWebAudioRecording = () => {
    scriptProcessorRef.current?.disconnect();
    micSourceNodeRef.current?.disconnect();
    const sr = audioCtxRef.current?.sampleRate || 44100;
    const chunks = webAudioChunksRef.current;
    if (chunks.length) {
      const blob = createWavBlob(chunks, sr);
      setRecordedBlob(blob);
      toast("Mic recording captured.");
    }
    webAudioChunksRef.current = [];
    scriptProcessorRef.current = null;
    micSourceNodeRef.current = null;
  };

  const startRecording = async () => {
    if (!track) {
      toast("No backing track loaded — recording mic only.");
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
      micStreamRef.current = stream;

      // Decide recording mode (fall back safely if MediaRecorder fails)
      const mime = chooseSupportedMimeType();
      try {
        if ((window as any).MediaRecorder && mime) {
          const mr = new MediaRecorder(stream, { mimeType: mime });
          recordedChunksRef.current = [];
          mr.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) recordedChunksRef.current.push(e.data);
          };
          mr.onstop = () => {
            const blob = new Blob(recordedChunksRef.current, { type: mime });
            setRecordedBlob(blob);
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
        mediaRecorderRef.current.start(100);
      }
      setIsRecording(true);

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

  const stopRecording = () => {
    // Stop depending on the active recorder mode
    if (recorderMode === 'webaudio') {
      stopWebAudioRecording();
    } else if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (audioElRef.current) audioElRef.current.pause();
    micStreamRef.current?.getTracks().forEach(t => t.stop());
    setIsRecording(false);
    try {
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close();
      }
    } catch (_) {}

  };

  const clearRecording = () => {
    try { audioElRef.current?.pause(); } catch {}
    setRecordedBlob(null);
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
        }, 2000);
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

    return new Blob(mp3Data, { type: 'audio/mpeg' });
  };
  const mixAndEncode = async () => {
    if (!recordedBlob || !track) {
      toast("Nothing to mix yet.");
      return;
    }
    setMixing(true);
    try {
      const ctx = new AudioContext();
      const [trackBuf, micBuf] = await Promise.all([
        fetch(track.file_url).then(r => r.arrayBuffer()).then(ab => ctx.decodeAudioData(ab.slice(0))),
        recordedBlob.arrayBuffer().then(ab => ctx.decodeAudioData(ab.slice(0)))
      ]);

      // Use mono offline context for simpler MP3 encode
      const sampleRate = 44100;
      const duration = Math.max(trackBuf.duration, micBuf.duration);
      const length = Math.ceil(duration * sampleRate);
      const offline = new OfflineAudioContext(1, length, sampleRate);

      // Track source + gain
      const trackSource = offline.createBufferSource();
      // Resample into offline context
      const trackMono = offline.createBuffer(1, Math.floor(trackBuf.duration * sampleRate), sampleRate);
      // Downmix to mono
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

      trackSource.start(0);
      micSource.start(0);

      const rendered = await offline.startRendering();
      const mp3Blob = encodeToMp3(rendered);
      setMixedMp3(mp3Blob);
      toast("Mix rendered. You can download or save to library.");
    } catch (e) {
      console.error(e);
      toast("Mixing failed. Your browser may not support decoding the mic recording.");
    } finally {
      setMixing(false);
    }
  };
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

  return (
    <div className="min-h-[60vh]">
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-primary/10 p-2 text-primary"><Mic2 className="h-5 w-5"/></div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Karaoke Studio</h1>
              <p className="text-sm text-muted-foreground">Record your voice over "Choice Band" and save a mix</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isRecording ? (
              <Button onClick={startRecording} disabled={loading || micPermission==='denied'}>
                <Play className="mr-2 h-4 w-4"/> Start Recording
              </Button>
            ) : (
              <Button variant="destructive" onClick={stopRecording}>
                <Square className="mr-2 h-4 w-4"/> Stop
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {!audioReady && (
          <Card className="bg-background/50 border-border">
            <CardHeader>
              <CardTitle>Enable Audio</CardTitle>
              <CardDescription>Browsers require a tap to allow sound.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={enableAudio}>Enable Audio</Button>
            </CardContent>
          </Card>
        )}
        <Card className="bg-background/50 border-border">
          <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Backing Track</CardTitle>
              <CardDescription>Auto-selected from your Media Library</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={togglePractice} disabled={isRecording || !track}>
                {isPracticePlaying ? <Pause className="mr-2 h-4 w-4"/> : <Play className="mr-2 h-4 w-4"/>}
                {isPracticePlaying ? 'Pause' : 'Play'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm space-y-3">
              {loading ? 'Loading…' : track ? (
                <>
                  <div className="flex items-center justify-between gap-4">
                    <div className="truncate">
                      <div className="font-medium truncate">{track.title}</div>
                      <div className="text-xs text-muted-foreground truncate">{track.file_url}</div>
                    </div>
                    <div className="flex items-center gap-4 min-w-[200px]">
                      <div className="flex items-center gap-2 w-full">
                        <Music className="h-4 w-4 text-primary"/>
                        <Slider value={[Math.round(trackVolume*100)]} onValueChange={(v)=>setTrackVolume((v[0]||0)/100)} className="w-40"/>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div>No track found named "Choice Band".</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-background/50 border-border">
          <CardHeader>
            <CardTitle>Microphone</CardTitle>
            <CardDescription>Adjust mic volume for the final mix</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Mic2 className="h-4 w-4 text-primary"/>
              <Slider value={[Math.round(micVolume*100)]} onValueChange={(v)=>setMicVolume((v[0]||0)/100)} className="w-40"/>
              <span className="text-xs text-muted-foreground">{Math.round(micVolume*100)}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Permission: {micPermission}</span>
              {micPermission !== 'granted' && (
                <Button size="sm" variant="secondary" onClick={requestMicPermission}>
                  Enable Microphone
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-background/50 border-border">
          <CardHeader>
            <CardTitle>Microphone Test</CardTitle>
            <CardDescription>Check input levels before recording</CardDescription>
          </CardHeader>
          <CardContent>
            <MicTest />
          </CardContent>
        </Card>

        {recordedBlob && (
          <Card className="bg-background/50 border-border">
            <CardHeader>
              <CardTitle>Recording Preview</CardTitle>
              <CardDescription>Listen before mixing or save</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <audio controls src={previewUrl || undefined} className="w-full" />
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={clearRecording}>
                  Start Over
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="bg-background/50 border-border">
          <CardHeader>
            <CardTitle>Mix & Export</CardTitle>
            <CardDescription>Create an MP3 of your performance</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3">
            <Button onClick={mixAndEncode} disabled={mixing || !recordedBlob}>
              {mixing ? <RefreshCw className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
              {mixing ? 'Mixing…' : 'Render Mix'}
            </Button>
            <Button variant="secondary" onClick={downloadMp3} disabled={!mixedMp3}>
              <Download className="mr-2 h-4 w-4"/> Download MP3
            </Button>
            <Button variant="outline" onClick={saveToLibrary} disabled={!mixedMp3 || loading}>
              Save to Library
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default KaraokeModule;
