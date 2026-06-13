import { useEffect, useState } from 'react';
import { z } from 'zod';
import { Image as ImageIcon, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { BlockModule, BlockEditorFormProps, BlockRenderProps } from '../types';

const schema = z.object({
  variant: z.enum(['image', 'slideshow', 'video']).default('image'),
  headline: z.string().default(''),
  subheadline: z.string().default(''),
  ctaLabel: z.string().default(''),
  ctaUrl: z.string().default(''),
  imageUrl: z.string().default(''),
  images: z.array(z.string()).default([]),
  videoUrl: z.string().default(''),
});
type Config = z.infer<typeof schema>;

function youtubeEmbed(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}?autoplay=0&rel=0` : null;
}

function Render({ config }: BlockRenderProps<Config>) {
  const [slide, setSlide] = useState(0);
  const slides = config.variant === 'slideshow' ? config.images.filter(Boolean) : [];
  useEffect(() => {
    if (slides.length < 2) return;
    const t = setInterval(() => setSlide((s) => (s + 1) % slides.length), 5000);
    return () => clearInterval(t);
  }, [slides.length]);

  const bgImage = config.variant === 'image' ? config.imageUrl : slides[slide];
  const embed = config.variant === 'video' ? youtubeEmbed(config.videoUrl) : null;

  return (
    <section id="top" className="relative overflow-hidden text-white" style={{ background: 'var(--site-primary)' }}>
      {bgImage && (
        <img src={bgImage} alt="" className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700" />
      )}
      {bgImage && <div className="absolute inset-0 bg-black/45" />}
      {!bgImage && !embed && (
        <div
          className="absolute inset-0 opacity-80 pointer-events-none"
          style={{ background: 'radial-gradient(90% 70% at 85% 10%, var(--site-accent) 0%, transparent 55%)' }}
        />
      )}
      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-20 sm:py-28 text-center">
        {embed && (
          <div className="aspect-video max-w-3xl mx-auto mb-8 rounded-xl overflow-hidden shadow-2xl">
            <iframe src={embed} className="w-full h-full" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
          </div>
        )}
        {config.headline && (
          <h1 className="font-sans normal-case text-4xl sm:text-6xl font-bold tracking-tight mb-4 leading-tight drop-shadow">
            {config.headline}
          </h1>
        )}
        {config.subheadline && (
          <p className="text-lg sm:text-2xl text-white/85 max-w-2xl mx-auto leading-relaxed">
            {config.subheadline}
          </p>
        )}
        {config.ctaLabel && config.ctaUrl && (
          <div className="mt-8">
            <Button asChild size="lg" className="rounded-full px-8 text-gray-900 bg-white hover:bg-white/90">
              <a href={config.ctaUrl}>{config.ctaLabel}</a>
            </Button>
          </div>
        )}
      </div>
      {slides.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setSlide(i)}
              className={`w-2.5 h-2.5 rounded-full ${i === slide ? 'bg-white' : 'bg-white/40'}`}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function EditorForm({ config, onChange }: BlockEditorFormProps<Config>) {
  const set = (patch: Partial<Config>) => onChange({ ...config, ...patch });
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Style</Label>
        <Select value={config.variant} onValueChange={(v) => set({ variant: v as Config['variant'] })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="image">Single image</SelectItem>
            <SelectItem value="slideshow">Slideshow</SelectItem>
            <SelectItem value="video">Video</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Headline</Label>
        <Input value={config.headline} onChange={(e) => set({ headline: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label>Subheadline</Label>
        <Textarea rows={2} value={config.subheadline} onChange={(e) => set({ subheadline: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label>Button label</Label>
          <Input value={config.ctaLabel} onChange={(e) => set({ ctaLabel: e.target.value })} placeholder="Get tickets" />
        </div>
        <div className="space-y-1.5">
          <Label>Button link</Label>
          <Input value={config.ctaUrl} onChange={(e) => set({ ctaUrl: e.target.value })} placeholder="#events" />
        </div>
      </div>
      {config.variant === 'image' && (
        <div className="space-y-1.5">
          <Label>Image URL</Label>
          <Input value={config.imageUrl} onChange={(e) => set({ imageUrl: e.target.value })} placeholder="https://…" />
        </div>
      )}
      {config.variant === 'slideshow' && (
        <div className="space-y-2">
          <Label>Slides</Label>
          {config.images.map((url, i) => (
            <div key={i} className="flex gap-2">
              <Input
                value={url}
                onChange={(e) => set({ images: config.images.map((u, j) => (j === i ? e.target.value : u)) })}
                placeholder="Image URL"
              />
              <Button variant="ghost" size="icon" onClick={() => set({ images: config.images.filter((_, j) => j !== i) })}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => set({ images: [...config.images, ''] })}>
            <Plus className="w-4 h-4" /> Add slide
          </Button>
        </div>
      )}
      {config.variant === 'video' && (
        <div className="space-y-1.5">
          <Label>YouTube URL</Label>
          <Input value={config.videoUrl} onChange={(e) => set({ videoUrl: e.target.value })} placeholder="https://youtube.com/watch?v=…" />
        </div>
      )}
    </div>
  );
}

export const heroBlock: BlockModule<typeof schema> = {
  type: 'hero',
  name: 'Hero',
  description: 'Big opening section: image, slideshow, or video with a headline.',
  icon: ImageIcon,
  tier: 'free',
  configSchema: schema,
  defaultConfig: {
    variant: 'image', headline: '', subheadline: '',
    ctaLabel: '', ctaUrl: '', imageUrl: '', images: [], videoUrl: '',
  },
  EditorForm,
  Render,
};
