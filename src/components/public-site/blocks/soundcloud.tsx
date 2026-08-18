import { z } from 'zod';
import { Cloud, Plus, Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { buildSoundCloudEmbedUrl, isSoundCloudSet, isSoundCloudUrl } from '@/lib/soundcloud';
import type { BlockModule, BlockEditorFormProps, BlockRenderProps } from '../types';

const schema = z.object({
  heading: z.string().default('Listen on SoundCloud'),
  items: z.array(z.object({
    url: z.string().default(''),
    title: z.string().default(''),
  })).default([]),
  /** Big-artwork widget layout; compact row player when off. */
  visual: z.boolean().default(true),
});
type Config = z.infer<typeof schema>;

function embedHeight(url: string, visual: boolean): number {
  if (isSoundCloudSet(url)) return 420;
  return visual ? 300 : 166;
}

function Render({ config, ctx }: BlockRenderProps<Config>) {
  const items = config.items.filter((i) => isSoundCloudUrl(i.url));
  if (items.length === 0) return null;
  return (
    <section id="soundcloud" className="gw-container py-5">
      {config.heading && (
        <h2 className="normal-case text-2xl sm:text-3xl font-bold mb-6 flex items-center gap-2">
          <Cloud className="w-6 h-6" style={{ color: 'var(--site-accent)' }} />
          {config.heading}
        </h2>
      )}
      <div className="space-y-4 max-w-3xl">
        {items.map((item, i) => (
          <div key={i} className="rounded-xl overflow-hidden border border-border bg-card">
            {item.title && (
              <div className="px-4 pt-3 pb-1 font-semibold">{item.title}</div>
            )}
            <iframe
              title={item.title || `SoundCloud player ${i + 1}`}
              src={buildSoundCloudEmbedUrl(item.url, {
                color: ctx.theme.accentColor,
                visual: config.visual && !isSoundCloudSet(item.url),
              })}
              height={embedHeight(item.url, config.visual)}
              className="w-full block"
              style={{ border: 'none' }}
              allow="autoplay"
              loading="lazy"
            />
          </div>
        ))}
      </div>
    </section>
  );
}

function EditorForm({ config, onChange }: BlockEditorFormProps<Config>) {
  const set = (patch: Partial<Config>) => onChange({ ...config, ...patch });
  const updateItem = (i: number, patch: Partial<Config['items'][number]>) =>
    set({ items: config.items.map((it, j) => (j === i ? { ...it, ...patch } : it)) });
  const removeItem = (i: number) =>
    set({ items: config.items.filter((_, j) => j !== i) });

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Section heading</Label>
        <Input
          value={config.heading}
          onChange={(e) => set({ heading: e.target.value })}
          placeholder="Listen on SoundCloud"
        />
      </div>

      <div className="flex items-center justify-between">
        <Label className="text-sm">Large artwork layout</Label>
        <Switch checked={config.visual} onCheckedChange={(v) => set({ visual: v })} />
      </div>

      <div className="space-y-2">
        <Label>Tracks & playlists</Label>
        {config.items.length === 0 && (
          <p className="text-xs text-slate-500">
            Paste any public SoundCloud track, playlist, or artist URL.
          </p>
        )}
        {config.items.map((item, i) => (
          <div key={i} className="rounded-lg border border-slate-200 bg-slate-50/50 p-2 space-y-2">
            <div className="flex items-center gap-2">
              <GripVertical className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="text-xs text-slate-500 flex-1 truncate">Item {i + 1}</span>
              <button
                type="button"
                onClick={() => removeItem(i)}
                className="text-slate-400 hover:text-red-600"
                title="Remove"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <Input
              value={item.url}
              onChange={(e) => updateItem(i, { url: e.target.value })}
              placeholder="https://soundcloud.com/artist/track"
              className="h-8 text-sm"
            />
            {item.url && !isSoundCloudUrl(item.url) && (
              <p className="text-xs text-red-600">That doesn't look like a SoundCloud URL.</p>
            )}
            <Input
              value={item.title}
              onChange={(e) => updateItem(i, { title: e.target.value })}
              placeholder="Display title (optional)"
              className="h-8 text-sm"
            />
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={() => set({ items: [...config.items, { url: '', title: '' }] })}
          className="gap-1.5"
        >
          <Plus className="w-4 h-4" /> Add SoundCloud link
        </Button>
      </div>
    </div>
  );
}

export const soundcloudBlock: BlockModule<typeof schema> = {
  type: 'soundcloud',
  name: 'SoundCloud',
  description: 'Embed SoundCloud tracks, playlists, or artist pages. No account connection required.',
  icon: Cloud,
  tier: 'free',
  group: 'core',
  configSchema: schema,
  defaultConfig: { heading: 'Listen on SoundCloud', items: [], visual: true },
  EditorForm,
  Render,
};
