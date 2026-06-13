import { useState } from 'react';
import { z } from 'zod';
import { Music, Plus, Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MediaPicker, type MediaItem } from '../MediaPicker';
import type { BlockModule, BlockEditorFormProps, BlockRenderProps } from '../types';

const schema = z.object({
  heading: z.string().default('Listen'),
  tracks: z.array(z.object({
    url: z.string().default(''),
    title: z.string().default(''),
    artist: z.string().default(''),
  })).default([]),
});
type Config = z.infer<typeof schema>;

function Render({ config }: BlockRenderProps<Config>) {
  const tracks = config.tracks.filter((t) => t.url);
  if (tracks.length === 0) return null;
  return (
    <section id="music" className="max-w-3xl mx-auto px-4 sm:px-6 py-14">
      {config.heading && (
        <h2 className="normal-case text-2xl sm:text-3xl font-bold mb-6 flex items-center gap-2">
          <Music className="w-6 h-6" style={{ color: 'var(--site-accent)' }} />
          {config.heading}
        </h2>
      )}
      <div className="space-y-4">
        {tracks.map((t, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-2">
            {(t.title || t.artist) && (
              <div className="flex items-baseline gap-2">
                {t.title && <span className="font-semibold">{t.title}</span>}
                {t.artist && <span className="text-sm text-muted-foreground">— {t.artist}</span>}
              </div>
            )}
            <audio src={t.url} controls preload="none" className="w-full" />
          </div>
        ))}
      </div>
    </section>
  );
}

function EditorForm({ config, onChange }: BlockEditorFormProps<Config>) {
  const set = (patch: Partial<Config>) => onChange({ ...config, ...patch });
  const [pickerOpen, setPickerOpen] = useState(false);
  const updateTrack = (i: number, patch: Partial<Config['tracks'][number]>) =>
    set({ tracks: config.tracks.map((t, j) => (j === i ? { ...t, ...patch } : t)) });
  const removeTrack = (i: number) =>
    set({ tracks: config.tracks.filter((_, j) => j !== i) });
  const onPicked = (item: MediaItem) =>
    set({ tracks: [...config.tracks, { url: item.file_url, title: item.title, artist: '' }] });

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Section heading</Label>
        <Input value={config.heading} onChange={(e) => set({ heading: e.target.value })} placeholder="Listen" />
      </div>

      <div className="space-y-2">
        <Label>Tracks</Label>
        {config.tracks.length === 0 && (
          <p className="text-xs text-slate-500">No tracks yet. Add one from your media library.</p>
        )}
        {config.tracks.map((t, i) => (
          <div key={i} className="rounded-lg border border-slate-200 bg-slate-50/50 p-2 space-y-2">
            <div className="flex items-center gap-2">
              <GripVertical className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="text-xs text-slate-500 flex-1 truncate">Track {i + 1}</span>
              <button
                type="button"
                onClick={() => removeTrack(i)}
                className="text-slate-400 hover:text-red-600"
                title="Remove track"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <Input
              value={t.title}
              onChange={(e) => updateTrack(i, { title: e.target.value })}
              placeholder="Track title"
              className="h-8 text-sm"
            />
            <Input
              value={t.artist}
              onChange={(e) => updateTrack(i, { artist: e.target.value })}
              placeholder="Artist (optional)"
              className="h-8 text-sm"
            />
            {t.url && (
              <audio src={t.url} controls className="w-full h-8" preload="none" />
            )}
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => setPickerOpen(true)} className="gap-1.5">
          <Plus className="w-4 h-4" /> Add track from library
        </Button>
      </div>

      <MediaPicker open={pickerOpen} onOpenChange={setPickerOpen} accept="audio" onPick={onPicked} />
    </div>
  );
}

export const musicPlayerBlock: BlockModule<typeof schema> = {
  type: 'music-player',
  name: 'Music Player',
  description: 'Stream tracks, recordings, or playlists. Pick from your music library or upload new.',
  icon: Music,
  tier: 'free',
  group: 'core',
  poweredBy: 'Music Library',
  configSchema: schema,
  defaultConfig: { heading: 'Listen', tracks: [] },
  EditorForm,
  Render,
};
