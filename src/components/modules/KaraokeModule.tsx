import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Music, Mic2, Download, Play, Square, Save, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// @ts-ignore - lamejs has no types
import lamejs from 'lamejs';

interface MediaItem {
  id: string;
  title?: string | null;
  file_url: string;
  file_type?: string | null;
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

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Attempt to locate the backing track automatically
    const fetchTrack = async () => {
      try {
        setLoading(true);
        const { data, error } = await (supabase
          .from('gw_media_library') as any)
          .select('id,title,file_url')
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
    // Check microphone permission
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        setMicPermission('granted');
        stream.getTracks().forEach(t => t.stop());
      })
      .catch(() => setMicPermission('denied'));
  }, []);

  const startRecording = async () => {
    if (!track) {
      toast("No backing track found.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      // Prepare MediaRecorder for mic
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus' : 'audio/webm';
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

      // Play the backing track and start recording simultaneously
      if (!audioElRef.current) {
        audioElRef.current = new Audio(track.file_url);
      } else {
        audioElRef.current.src = track.file_url;
      }
      audioElRef.current.volume = Math.max(0, Math.min(1, trackVolume));
      audioElRef.current.currentTime = 0;

      await audioElRef.current.play();
      mr.start(100); // gather data every 100ms
      setIsRecording(true);
      toast("Recording started. Sing along now!");
    } catch (err) {
      console.error(err);
      toast("Failed to access microphone.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (audioElRef.current) audioElRef.current.pause();
    micStreamRef.current?.getTracks().forEach(t => t.stop());
    setIsRecording(false);
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
              <Button onClick={startRecording} disabled={loading || micPermission==='denied' || !track}>
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
        <Card className="bg-background/50 border-border">
          <CardHeader>
            <CardTitle>Backing Track</CardTitle>
            <CardDescription>Auto-selected from your Media Library</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm">
              {loading ? 'Loading…' : track ? (
                <div className="flex items-center justify-between gap-4">
                  <div className="truncate">
                    <div className="font-medium truncate">{track.title}</div>
                    <div className="text-xs text-muted-foreground truncate">{track.file_url}</div>
                  </div>
                  <div className="flex items-center gap-4 min-w-[220px]">
                    <div className="flex items-center gap-2 w-full">
                      <Music className="h-4 w-4 text-primary"/>
                      <Slider value={[Math.round(trackVolume*100)]} onValueChange={(v)=>setTrackVolume((v[0]||0)/100)} className="w-40"/>
                    </div>
                  </div>
                </div>
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
            <div className="text-xs text-muted-foreground">
              Permission: {micPermission}
            </div>
          </CardContent>
        </Card>

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
