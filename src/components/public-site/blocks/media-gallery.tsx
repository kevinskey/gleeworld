import { useState } from 'react';
import { z } from 'zod';
import { ImagePlus, Plus, Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MediaPicker, type MediaItem } from '../MediaPicker';
import type { BlockModule, BlockEditorFormProps, BlockRenderProps } from '../types';

// Media Gallery accepts both audio and video — but for visual layout we focus
// on images, which are the most common gallery item. Re-uses MediaPicker;
// pictures come from the same media-library bucket so anything uploaded to
// the Media Library admin module is reusable here.
const schema = z.object({
  heading: z.string().default('Gallery'),
  layout: z.enum(['grid', 'masonry', 'featured']).default('grid'),
  items: z.array(z.object({
    url: z.string().default(''),
    caption: z.string().default(''),
  })).default([]),
});
type Config = z.infer<typeof schema>;

function Render({ config }: BlockRenderProps<Config>) {
  const items = config.items.filter((i) => i.url);
  if (items.length === 0) return null;

  if (config.layout === 'featured') {
    const [first, ...rest] = items;
    return (
      <section id="gallery" className="max-w-6xl mx-auto px-4 sm:px-6 py-14">
        {config.heading && (
          <h2 className="normal-case text-2xl sm:text-3xl font-bold mb-6 flex items-center gap-2">
            <ImagePlus className="w-6 h-6" style={{ color: 'var(--site-accent)' }} />
            {config.heading}
          </h2>
        )}
        <div className="grid lg:grid-cols-3 gap-4">
          <figure className="lg:col-span-2 rounded-xl overflow-hidden bg-muted">
            <img src={first.url} alt={first.caption} className="w-full h-full object-cover aspect-video" />
            {first.caption && <figcaption className="text-sm text-muted-foreground mt-2">{first.caption}</figcaption>}
          </figure>
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
            {rest.slice(0, 4).map((it, i) => (
              <figure key={i} className="rounded-xl overflow-hidden bg-muted">
                <img src={it.url} alt={it.caption} className="w-full aspect-square object-cover" />
              </figure>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="gallery" className="max-w-6xl mx-auto px-4 sm:px-6 py-14">
      {config.heading && (
        <h2 className="normal-case text-2xl sm:text-3xl font-bold mb-6 flex items-center gap-2">
          <ImagePlus className="w-6 h-6" style={{ color: 'var(--site-accent)' }} />
          {config.heading}
        </h2>
      )}
      <div className={
        config.layout === 'masonry'
          ? 'columns-2 sm:columns-3 lg:columns-4 gap-3 [&>*]:mb-3 [&>*]:break-inside-avoid'
          : 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3'
      }>
        {items.map((it, i) => (
          <figure key={i} className="rounded-lg overflow-hidden bg-muted">
            <img
              src={it.url}
              alt={it.caption}
              className={config.layout === 'masonry' ? 'w-full h-auto' : 'w-full aspect-square object-cover'}
              loading="lazy"
            />
            {it.caption && (
              <figcaption className="text-xs text-muted-foreground p-2 truncate">{it.caption}</figcaption>
            )}
          </figure>
        ))}
      </div>
    </section>
  );
}

function EditorForm({ config, onChange }: BlockEditorFormProps<Config>) {
  const set = (patch: Partial<Config>) => onChange({ ...config, ...patch });
  const [pickerOpen, setPickerOpen] = useState(false);
  const updateItem = (i: number, patch: Partial<Config['items'][number]>) =>
    set({ items: config.items.map((it, j) => (j === i ? { ...it, ...patch } : it)) });
  const removeItem = (i: number) => set({ items: config.items.filter((_, j) => j !== i) });
  const onPicked = (item: MediaItem) =>
    set({ items: [...config.items, { url: item.file_url, caption: item.title }] });

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Section heading</Label>
        <Input value={config.heading} onChange={(e) => set({ heading: e.target.value })} placeholder="Gallery" />
      </div>
      <div className="space-y-1.5">
        <Label>Layout</Label>
        <Select value={config.layout} onValueChange={(v) => set({ layout: v as Config['layout'] })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="grid">Equal grid</SelectItem>
            <SelectItem value="masonry">Masonry</SelectItem>
            <SelectItem value="featured">Featured + thumbnails</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Photos</Label>
        {config.items.length === 0 && (
          <p className="text-xs text-slate-500">No photos yet. Add one from your media library.</p>
        )}
        {config.items.map((it, i) => (
          <div key={i} className="rounded-lg border border-slate-200 bg-slate-50/50 p-2 flex items-center gap-2">
            <GripVertical className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            {it.url && <img src={it.url} alt="" className="w-10 h-10 object-cover rounded shrink-0" />}
            <Input
              value={it.caption}
              onChange={(e) => updateItem(i, { caption: e.target.value })}
              placeholder="Caption (optional)"
              className="h-8 text-sm flex-1"
            />
            <button
              type="button"
              onClick={() => removeItem(i)}
              className="text-slate-400 hover:text-red-600"
              title="Remove"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => setPickerOpen(true)} className="gap-1.5">
          <Plus className="w-4 h-4" /> Add photo from library
        </Button>
      </div>
      <MediaPicker open={pickerOpen} onOpenChange={setPickerOpen} accept="image" onPick={onPicked} />
    </div>
  );
}

export const mediaGalleryBlock: BlockModule<typeof schema> = {
  type: 'media-gallery',
  name: 'Media Gallery',
  description: 'A photo gallery — grid, masonry, or one featured image with thumbnails.',
  icon: ImagePlus,
  tier: 'free',
  group: 'core',
  poweredBy: 'Media Library',
  configSchema: schema,
  defaultConfig: { heading: 'Gallery', layout: 'grid', items: [] },
  EditorForm,
  Render,
};
