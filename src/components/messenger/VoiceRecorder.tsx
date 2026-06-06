// Inline voice recorder for messenger. Records audio via MediaRecorder, uploads
// to messenger-attachments bucket, then calls onUpload with the public URL.
import { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Loader2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function VoiceRecorder({ groupId, userId, onUpload }: { groupId: string; userId: string; onUpload: (url: string) => void }) {
  const { toast } = useToast();
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      recorderRef.current?.stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach((t) => t.stop());
        await upload(blob);
      };
      rec.start();
      recorderRef.current = rec;
      setRecording(true);
      setSeconds(0);
      timerRef.current = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch (e: any) {
      toast({ title: 'Mic blocked', description: e.message || 'Allow microphone access.', variant: 'destructive' });
    }
  }

  function stop() {
    recorderRef.current?.stop();
    setRecording(false);
    if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null; }
  }

  function cancel() {
    if (recorderRef.current && recording) {
      recorderRef.current.onstop = null as any;
      recorderRef.current.stop();
      recorderRef.current.stream?.getTracks().forEach((t) => t.stop());
    }
    setRecording(false);
    setSeconds(0);
    if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null; }
  }

  async function upload(blob: Blob) {
    setUploading(true);
    try {
      const path = `${groupId}/${userId}/${Date.now()}.webm`;
      const { error } = await supabase.storage
        .from('messenger-attachments')
        .upload(path, blob, { contentType: 'audio/webm' });
      if (error) throw error;
      const { data: pub } = supabase.storage.from('messenger-attachments').getPublicUrl(path);
      onUpload(pub.publicUrl);
    } catch (e: any) {
      toast({ title: 'Voice upload failed', description: e.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  }

  if (uploading) {
    return <Button variant="ghost" size="sm" disabled><Loader2 className="w-4 h-4 animate-spin" /></Button>;
  }
  if (recording) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-xs font-mono text-red-500 animate-pulse min-w-[3ch] text-right">{formatTime(seconds)}</span>
        <Button variant="ghost" size="sm" onClick={stop} title="Stop and send">
          <Square className="w-4 h-4 fill-red-500 text-red-500" />
        </Button>
        <Button variant="ghost" size="sm" onClick={cancel} title="Cancel">
          <X className="w-4 h-4" />
        </Button>
      </div>
    );
  }
  return (
    <Button variant="ghost" size="sm" onClick={start} title="Record voice note">
      <Mic className="w-4 h-4" />
    </Button>
  );
}

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}
