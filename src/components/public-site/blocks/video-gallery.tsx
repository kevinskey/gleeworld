import { useState } from 'react';
import { z } from 'zod';
import { Video, Plus, Trash2, Youtube } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MediaPicker, type MediaItem } from '../MediaPicker';
import type { BlockModule, BlockEditorFormProps, BlockRenderProps } from '../types';

const schema = z.object({
  heading: z.string().default('Watch'),
  layout: z.enum(['single', 'grid']).default('grid'),
  videos: z.array(z.object({
    kind: z.enum(['youtube', 'upload']).default('youtube'),
    url: z.string().default(''),
    title: z.string().default(''),
  })).default([]),
});
type Config = z.infer<typeof schema>;

function youtubeEmbed(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([\w-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}?rel=0` : null;
}

function VideoPlayer({ v }: { v: Config['videos'][number] }) {
  if (v.kind === 'youtube') {
    const embed = youtubeEmbed(v.url);
    if (!embed) return null;
    return (
      <div className="aspect-video w-full rounded-xl overflow-hidden shadow-md bg-black">
        <iframe
          src={embed}
          title={v.title || 'Video'}
          className="w-full h-full"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }
  return (
    <video src={v.url} controls preload="metadata" className="w-full rounded-xl shadow-md bg-black aspect-video object-contain" />
  );
}

function Render({ config }: BlockRenderProps<Config>) {
  const videos = config.videos.filter((v) => v.url);
  if (videos.length === 0) return null;
  return (
    <section id="watch" className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      {config.heading && (
        <h2 className="normal-case text-2xl sm:text-3xl font-bold mb-6 flex items-center gap-2">
          <Video className="w-6 h-6" style={{ color: 'var(--site-accent)' }} />
          {config.heading}
        </h2>
      )}
      <div className={config.layout === 'grid' && videos.length > 1
        ? 'grid sm:grid-cols-2 gap-4'
        : 'space-y-4'}
      >
        {videos.map((v, i) => (
          <div key={i} className="space-y-2">
            <VideoPlayer v={v} />
            {v.title && <p className="text-sm font-medium text-center">{v.title}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}

function EditorForm({ config, onChange }: BlockEditorFormProps<Config>) {
  const set = (patch: Partial<Config>) => onChange({ ...config, ...patch });
  const [pickerOpen, setPickerOpen] = useState(false);
  const updateVideo = (i: number, patch: Partial<Config['videos'][number]>) =>
    set({ videos: config.videos.map((v, j) => (j === i ? { ...v, ...patch } : v)) });
  const removeVideo = (i: number) =>
    set({ videos: config.videos.filter((_, j) => j !== i) });
  const addYoutube = () =>
    set({ videos: [...config.videos, { kind: 'youtube', url: '', title: '' }] });
  const onPicked = (item: MediaItem) =>
    set({ videos: [...config.videos, { kind: 'upload', url: item.file_url, title: item.title }] });

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Section heading</Label>
        <Input value={config.heading} onChange={(e) => set({ heading: e.target.value })} placeholder="Watch" />
      </div>

      <div className="space-y-1.5">
        <Label>Layout</Label>
        <div className="flex gap-2">
          {(['grid', 'single'] as const).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => set({ layout: opt })}
              className={`px-3 py-1.5 rounded-md text-sm border ${
                config.layout === opt
                  ? 'bg-sky-600 text-white border-sky-600'
                  : 'bg-white border-slate-200 hover:border-slate-400'
              }`}
            >
              {opt === 'grid' ? 'Grid' : 'Single column'}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Videos</Label>
        {config.videos.length === 0 && (
          <p className="text-xs text-slate-500">No videos yet. Add a YouTube link or pick one from your media library.</p>
        )}
        {config.videos.map((v, i) => (
          <div key={i} className="rounded-lg border border-slate-200 bg-slate-50/50 p-2 space-y-2">
            <div className="flex items-center gap-2">
              {v.kind === 'youtube' ? <Youtube className="w-3.5 h-3.5 text-red-600" /> : <Video className="w-3.5 h-3.5 text-slate-500" />}
              <span className="text-xs text-slate-500 flex-1 truncate">
                {v.kind === 'youtube' ? 'YouTube link' : 'Uploaded video'} {i + 1}
              </span>
              <button
                type="button"
                onClick={() => removeVideo(i)}
                className="text-slate-400 hover:text-red-600"
                title="Remove video"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <Input
              value={v.title}
              onChange={(e) => updateVideo(i, { title: e.target.value })}
              placeholder="Caption (optional)"
              className="h-8 text-sm"
            />
            {v.kind === 'youtube' ? (
              <Input
                value={v.url}
                onChange={(e) => updateVideo(i, { url: e.target.value })}
                placeholder="https://www.youtube.com/watch?v=…"
                className="h-8 text-sm"
              />
            ) : (
              v.url && <video src={v.url} controls preload="none" className="w-full rounded" />
            )}
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={addYoutube} className="gap-1.5">
            <Youtube className="w-4 h-4 text-red-600" /> Add YouTube link
          </Button>
          <Button variant="outline" size="sm" onClick={() => setPickerOpen(true)} className="gap-1.5">
            <Plus className="w-4 h-4" /> Add from library
          </Button>
        </div>
      </div>

      <MediaPicker open={pickerOpen} onOpenChange={setPickerOpen} accept="video" onPick={onPicked} />
    </div>
  );
}

export const videoGalleryBlock: BlockModule<typeof schema> = {
  type: 'videos',
  name: 'Videos',
  description: 'YouTube links and uploaded video files together. Pick from your media library or upload new.',
  icon: Video,
  tier: 'free',
  group: 'core',
  poweredBy: 'YouTube Management & Media Library',
  configSchema: schema,
  defaultConfig: { heading: 'Watch', layout: 'grid', videos: [] },
  EditorForm,
  Render,
};
