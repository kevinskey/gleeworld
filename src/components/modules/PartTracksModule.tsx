import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Upload, Mic, Music } from 'lucide-react';
import { toast } from 'sonner';

interface PartTrack {
  id: string;
  piece_title: string;
  voice_part: string;
  audio_url: string | null;
  notes: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

const VOICE_PART_PRESETS = ['SI', 'SII', 'AI', 'AII', 'T', 'B', 'S1', 'S2', 'A1', 'A2', 'T1', 'T2', 'B1', 'B2'];

export const PartTracksModule: React.FC = () => {
  const [tracks, setTracks] = useState<PartTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newPiece, setNewPiece] = useState('');
  const [newPart, setNewPart] = useState('');
  const [newFile, setNewFile] = useState<File | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('gw_part_tracks')
      .select('id, piece_title, voice_part, audio_url, notes, is_active, display_order, created_at')
      .order('piece_title', { ascending: true })
      .order('display_order', { ascending: true });
    if (error) toast.error(`Failed to load: ${error.message}`);
    setTracks((data as PartTrack[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, PartTrack[]>();
    for (const t of tracks) {
      const k = t.piece_title || '(untitled)';
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(t);
    }
    return Array.from(map.entries());
  }, [tracks]);

  const uploadAudio = async (file: File): Promise<string | null> => {
    const ext = file.name.split('.').pop() ?? 'mp3';
    const path = `part-tracks/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage.from('user-files').upload(path, file, { upsert: false });
    if (upErr) {
      toast.error(`Upload failed: ${upErr.message}`);
      return null;
    }
    const { data: pub } = supabase.storage.from('user-files').getPublicUrl(path);
    return pub.publicUrl;
  };

  const addTrack = async () => {
    if (!newPiece.trim() || !newPart.trim()) {
      toast.error('Piece title and voice part are required');
      return;
    }
    setAdding(true);
    try {
      let audioUrl: string | null = null;
      if (newFile) {
        audioUrl = await uploadAudio(newFile);
        if (newFile && !audioUrl) return;
      }
      const { data, error } = await supabase
        .from('gw_part_tracks')
        .insert({
          piece_title: newPiece.trim(),
          voice_part: newPart.trim(),
          audio_url: audioUrl,
          is_active: true,
        })
        .select('id, piece_title, voice_part, audio_url, notes, is_active, display_order, created_at')
        .single();
      if (error) {
        toast.error(`Add failed: ${error.message}`);
        return;
      }
      setTracks(prev => [...prev, data as PartTrack]);
      setNewPiece('');
      setNewPart('');
      setNewFile(null);
      toast.success('Part track added');
    } finally {
      setAdding(false);
    }
  };

  const updateTrack = async (id: string, patch: Partial<PartTrack>) => {
    setTracks(prev => prev.map(t => (t.id === id ? { ...t, ...patch } : t)));
    const { error } = await supabase.from('gw_part_tracks').update(patch).eq('id', id);
    if (error) {
      toast.error(`Save failed: ${error.message}`);
      load();
    }
  };

  const replaceAudio = async (track: PartTrack, file: File) => {
    setUploadingId(track.id);
    try {
      const url = await uploadAudio(file);
      if (url) await updateTrack(track.id, { audio_url: url });
    } finally {
      setUploadingId(null);
    }
  };

  const deleteTrack = async (id: string) => {
    if (!confirm('Delete this part track? This cannot be undone.')) return;
    const { error } = await supabase.from('gw_part_tracks').delete().eq('id', id);
    if (error) {
      toast.error(`Delete failed: ${error.message}`);
      return;
    }
    setTracks(prev => prev.filter(t => t.id !== id));
    toast.success('Deleted');
  };

  if (loading) return <div className="p-6 text-muted-foreground">Loading part tracks…</div>;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Mic className="h-5 w-5" />
          Part Tracks
        </h2>
        <p className="text-sm text-muted-foreground">
          MP3 practice tracks for singers, organized by piece and voice part.
        </p>
      </div>

      <Card className="p-4 space-y-3">
        <Label className="text-sm font-semibold">Add a part track</Label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Piece title</Label>
            <Input
              value={newPiece}
              onChange={e => setNewPiece(e.target.value)}
              placeholder="Lift Every Voice and Sing"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Voice part</Label>
            <Input
              value={newPart}
              onChange={e => setNewPart(e.target.value)}
              placeholder="SI / SII / AI / AII / T / B"
              list="voice-part-presets"
            />
            <datalist id="voice-part-presets">
              {VOICE_PART_PRESETS.map(p => <option key={p} value={p} />)}
            </datalist>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">MP3 file</Label>
            <Input
              type="file"
              accept="audio/*"
              onChange={e => setNewFile(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={addTrack} disabled={adding} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            {adding ? 'Adding…' : 'Add part track'}
          </Button>
        </div>
      </Card>

      {grouped.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          No part tracks yet. Add one above.
        </Card>
      ) : (
        <div className="space-y-4">
          {grouped.map(([piece, list]) => (
            <Card key={piece} className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Music className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold">{piece}</h3>
                <span className="text-xs text-muted-foreground">· {list.length} part{list.length === 1 ? '' : 's'}</span>
              </div>
              <div className="space-y-3">
                {list.map(track => (
                  <div key={track.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded border bg-muted/30">
                    <div className="flex items-center gap-2 sm:w-24">
                      <Badge variant="secondary">{track.voice_part}</Badge>
                    </div>
                    <div className="flex-1 min-w-0">
                      {track.audio_url ? (
                        <audio
                          controls
                          src={track.audio_url}
                          className="w-full max-w-xl h-10"
                          preload="none"
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground italic">No audio uploaded</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <label>
                        <input
                          type="file"
                          accept="audio/*"
                          className="sr-only"
                          onChange={e => {
                            const f = e.target.files?.[0];
                            if (f) replaceAudio(track, f);
                            e.target.value = '';
                          }}
                        />
                        <Button asChild size="icon" variant="ghost" disabled={uploadingId === track.id} aria-label="Replace audio">
                          <span><Upload className="h-4 w-4" /></span>
                        </Button>
                      </label>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteTrack(track.id)}
                        aria-label="Delete"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default PartTracksModule;
