// Image — one picture at its natural aspect ratio.
//
// The gallery block's layouts all crop (featured forces 16:9), which
// butchers posters and flyers; this block never crops. Born from the
// retirement-page flyer rendering as a short widescreen slab.
import { z } from 'zod';
import { Image as ImageIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { BlockModule, BlockEditorFormProps, BlockRenderProps } from '../types';

const schema = z.object({
  url: z.string().default(''),
  alt: z.string().default(''),
  caption: z.string().default(''),
  /** Optional link the image points at (e.g. #rsvp). */
  linkUrl: z.string().default(''),
  rounded: z.boolean().default(true),
  // Fill the parent column's height (object-cover crop) — for a tall
  // poster beside a card that should match heights (Kevin, 2026-08-13).
  cover: z.boolean().default(false),
});
type Config = z.infer<typeof schema>;

function Render({ config }: BlockRenderProps<Config>) {
  if (!config.url) return null;
  const img = config.cover ? (
    <span className="block relative h-full min-h-[380px]">
      <img
        src={config.url}
        alt={config.alt}
        className={`absolute inset-0 w-full h-full object-cover ${config.rounded ? 'rounded-xl' : ''}`}
        loading="lazy"
      />
    </span>
  ) : (
    <img
      src={config.url}
      alt={config.alt}
      className={`w-full h-auto ${config.rounded ? 'rounded-xl' : ''}`}
      loading="lazy"
    />
  );
  return (
    <section className={`gw-container ${config.cover ? 'h-full' : ''}`}>
      <figure className={config.cover ? 'h-full' : ''}>
        {config.linkUrl ? <a href={config.linkUrl} className={config.cover ? 'block h-full' : ''}>{img}</a> : img}
        {config.caption && (
          <figcaption className="text-sm text-muted-foreground mt-2 text-center">{config.caption}</figcaption>
        )}
      </figure>
    </section>
  );
}

function EditorForm({ config, onChange }: BlockEditorFormProps<Config>) {
  const set = (patch: Partial<Config>) => onChange({ ...config, ...patch });
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Image URL</Label>
        <Input value={config.url} onChange={(e) => set({ url: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label>Alt text</Label>
        <Input value={config.alt} onChange={(e) => set({ alt: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label>Caption (optional)</Label>
        <Input value={config.caption} onChange={(e) => set({ caption: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label>Link (optional)</Label>
        <Input value={config.linkUrl} onChange={(e) => set({ linkUrl: e.target.value })} placeholder="#rsvp or https://…" />
      </div>
    </div>
  );
}

export const imageBlock: BlockModule<typeof schema> = {
  type: 'image',
  name: 'Image',
  description: 'One picture at its natural shape — never cropped. Posters, flyers, artwork.',
  icon: ImageIcon,
  tier: 'free',
  group: 'core',
  configSchema: schema,
  defaultConfig: schema.parse({}),
  EditorForm,
  Render,
};
