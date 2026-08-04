import { useCallback, useEffect, useState } from 'react';
import { z } from 'zod';
import { ImagePlus, Plus, Trash2, GripVertical, X, ChevronLeft, ChevronRight } from 'lucide-react';
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

// Viewer mode replaces the grid in-place — it renders in the same block
// section, so it never covers surrounding app chrome (sidebar, topbar) when
// this block is inside the editor's preview panel. Prev/next + close live
// under the big photo; Esc + arrow keys work when the container is focused
// (autofocus on mount).
function GalleryViewer({
  items, index, onIndex, onClose,
}: {
  items: { url: string; caption: string }[];
  index: number;
  onIndex: (next: number) => void;
  onClose: () => void;
}) {
  const total = items.length;
  const prev = useCallback(() => onIndex((index - 1 + total) % total), [index, total, onIndex]);
  const next = useCallback(() => onIndex((index + 1) % total), [index, total, onIndex]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, prev, next]);

  const active = items[index];
  if (!active) return null;
  return (
    <div className="relative bg-black rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={onClose}
        className="absolute top-2 right-2 z-10 text-white/85 hover:text-white p-2 rounded-full bg-black/40 hover:bg-black/60 transition-colors"
        aria-label="Back to gallery"
      >
        <X className="w-5 h-5" />
      </button>
      {total > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 text-white/85 hover:text-white p-2 rounded-full bg-black/40 hover:bg-black/60 transition-colors"
            aria-label="Previous photo"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            type="button"
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 text-white/85 hover:text-white p-2 rounded-full bg-black/40 hover:bg-black/60 transition-colors"
            aria-label="Next photo"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}
      <figure className="flex flex-col items-center">
        <img
          src={active.url}
          alt={active.caption}
          className="max-h-[70vh] w-auto max-w-full object-contain"
        />
        {(active.caption || total > 1) && (
          <figcaption className="w-full flex items-center justify-between px-4 py-3 text-sm text-white/85 bg-black/60">
            <span className="truncate">{active.caption}</span>
            {total > 1 && (
              <span className="tabular-nums text-xs text-white/60 ml-3 shrink-0">{index + 1} / {total}</span>
            )}
          </figcaption>
        )}
      </figure>
    </div>
  );
}

function Render({ config }: BlockRenderProps<Config>) {
  const items = config.items.filter((i) => i.url);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  if (items.length === 0) return null;

  const openAt = (i: number) => setOpenIndex(i);
  // Common button classes for the click-to-open thumbnails. Rendering the
  // wrapper as <button> gives keyboard focusability + Enter/Space activation
  // for free.
  const thumbBtn =
    'block w-full h-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 rounded-lg';

  return (
    <section id="gallery" className="gw-container py-5">
      {config.heading && (
        <h2 className="normal-case text-2xl sm:text-3xl font-bold mb-6 flex items-center gap-2">
          <ImagePlus className="w-6 h-6" style={{ color: 'var(--site-accent)' }} />
          {config.heading}
        </h2>
      )}
      {openIndex !== null ? (
        <GalleryViewer items={items} index={openIndex} onIndex={setOpenIndex} onClose={() => setOpenIndex(null)} />
      ) : config.layout === 'featured' ? (
        <div className="grid lg:grid-cols-3 gap-4">
          {(() => {
            const [first, ...rest] = items;
            return (
              <>
                <figure className="lg:col-span-2 rounded-xl overflow-hidden bg-muted">
                  <button type="button" onClick={() => openAt(0)} className={thumbBtn} aria-label={first.caption || 'Open photo'}>
                    <img src={first.url} alt={first.caption} className="w-full h-full object-cover aspect-video cursor-zoom-in" />
                  </button>
                  {first.caption && <figcaption className="text-sm text-muted-foreground mt-2">{first.caption}</figcaption>}
                </figure>
                <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
                  {rest.slice(0, 4).map((it, i) => (
                    <figure key={i} className="rounded-xl overflow-hidden bg-muted">
                      <button type="button" onClick={() => openAt(i + 1)} className={thumbBtn} aria-label={it.caption || 'Open photo'}>
                        <img src={it.url} alt={it.caption} className="w-full aspect-square object-cover cursor-zoom-in" />
                      </button>
                    </figure>
                  ))}
                </div>
              </>
            );
          })()}
        </div>
      ) : (
        <div className={
          config.layout === 'masonry'
            ? 'columns-2 sm:columns-3 lg:columns-4 gap-3 [&>*]:mb-3 [&>*]:break-inside-avoid'
            : 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3'
        }>
          {items.map((it, i) => (
            <figure key={i} className="rounded-lg overflow-hidden bg-muted">
              <button type="button" onClick={() => openAt(i)} className={thumbBtn} aria-label={it.caption || 'Open photo'}>
                <img
                  src={it.url}
                  alt={it.caption}
                  className={
                    (config.layout === 'masonry' ? 'w-full h-auto' : 'w-full aspect-square object-cover')
                    + ' cursor-zoom-in'
                  }
                  loading="lazy"
                />
              </button>
              {it.caption && (
                <figcaption className="text-xs text-muted-foreground p-2 truncate">{it.caption}</figcaption>
              )}
            </figure>
          ))}
        </div>
      )}
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
