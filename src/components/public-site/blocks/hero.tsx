import { useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { Image as ImageIcon, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImageUploadField } from '../ImageUploadField';
import type { BlockModule, BlockEditorFormProps, BlockRenderProps } from '../types';

const schema = z.object({
  variant: z.enum(['image', 'slideshow', 'video']).default('image'),
  // How the hero renders its background image:
  //   'fill' — 16:9 aspect ratio, object-cover; portrait photos get
  //            center-cropped. Reliable default for tenants uploading
  //            arbitrary shots.
  //   'fit'  — natural aspect (w-full h-auto); the section grows to
  //            whatever height the image dictates. Preserved for tenants
  //            who baked headline/crest into a specific graphic and
  //            need every pixel visible.
  // Default here is 'fit' so pre-existing blocks (no imageFit field
  // stored) keep their current rendering. New heroes seeded via the
  // block picker get 'fill' from the module's defaultConfig.
  imageFit: z.enum(['fill', 'fit']).default('fit'),
  headline: z.string().default(''),
  subheadline: z.string().default(''),
  ctaLabel: z.string().default(''),
  ctaUrl: z.string().default(''),
  imageUrl: z.string().default(''),
  images: z.array(z.string()).default([]),
  videoUrl: z.string().default(''),
  // Master toggle. When false, the image stands alone — no overlay, no text.
  showTextOverlay: z.boolean().default(true),
  // Per-item visibility + color for each text element shown on top of the image.
  showHeadline: z.boolean().default(true),
  showSubheadline: z.boolean().default(true),
  showCta: z.boolean().default(true),
  showUnderlay: z.boolean().default(true),
  headlineColor: z.string().default('#ffffff'),
  subheadlineColor: z.string().default('#ffffff'),
  ctaColor: z.string().default('#ffffff'),
  underlayColor: z.string().default('#000000'),
  // Per-item font size (px). Sliders in the editor; absent values render at
  // the original Tailwind defaults via fallback in Render.
  headlineSize: z.number().int().min(16).max(160).default(60),
  subheadlineSize: z.number().int().min(12).max(60).default(22),
  ctaSize: z.number().int().min(12).max(36).default(18),
  // Optional list of additional buttons. The first button is still controlled
  // by the legacy ctaLabel/ctaUrl/ctaColor/ctaSize for backward compat.
  buttons: z.array(z.object({
    label: z.string().default(''),
    url: z.string().default(''),
    color: z.string().default('#ffffff'),
    size: z.number().int().min(12).max(36).default(18),
  })).default([]),
  // Position of the text overlay (headline + subheadline) as % of the hero
  // section, 0–100. (50, 50) = centered.
  textX: z.number().min(0).max(100).default(50),
  textY: z.number().min(0).max(100).default(50),
  // Buttons group can be repositioned independently of the text. Defaults to
  // sitting just below the centered text. Old configs without these fields
  // get the defaults via safeConfig — visually identical to the old behavior
  // because the buttons used to sit directly under the text.
  buttonsX: z.number().min(0).max(100).default(50),
  buttonsY: z.number().min(0).max(100).default(70),
});
type Config = z.infer<typeof schema>;

function youtubeEmbed(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}?autoplay=0&rel=0` : null;
}

// Pick a readable text color for a given background.
function contrastText(bg: string): string {
  const hex = bg.replace('#', '');
  if (hex.length !== 6) return '#1a1a1a';
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 150 ? '#1a1a1a' : '#ffffff';
}

// Turn a fixed px size into a fluid `clamp(min, vw-formula, max)` so the
// hero text scales with the viewport instead of staying massive on phones
// and tiny on 4K displays. The user's chosen size is treated as the
// DESKTOP target; mobile floors at ~55% (with a 14px absolute floor so
// nothing becomes illegible).
function fluidPx(px: number): string {
  const max = Math.max(12, Math.round(px));
  const min = Math.max(14, Math.round(max * 0.55));
  // Slope chosen so the size reaches `max` around a 1280px viewport.
  const vw = (max / 12).toFixed(2);
  return `clamp(${min}px, ${vw}vw, ${max}px)`;
}

function Render({ config, onConfigChange }: BlockRenderProps<Config>) {
  const [slide, setSlide] = useState(0);
  const [imgFailed, setImgFailed] = useState(false);
  const slides = config.variant === 'slideshow' ? config.images.filter(Boolean) : [];
  useEffect(() => {
    if (slides.length < 2) return;
    const t = setInterval(() => setSlide((s) => (s + 1) % slides.length), 5000);
    return () => clearInterval(t);
  }, [slides.length]);
  useEffect(() => { setImgFailed(false); }, [config.imageUrl, slides[slide]]);

  // Drag-to-reposition for the two independently movable overlay groups
  // (text and buttons). Only active in the editor preview (onConfigChange is
  // provided). Positions are stored as % of the section so they remain stable
  // across screen sizes. `dragging` tracks which group is currently in motion
  // so we can switch the cursor + suppress the other group's pointer events.
  const sectionRef = useRef<HTMLElement>(null);
  const dragRef = useRef<{
    target: 'text' | 'buttons';
    x: number; y: number;
    sx: number; sy: number;
    rect: DOMRect;
  } | null>(null);
  const [dragging, setDragging] = useState<'text' | 'buttons' | null>(null);
  const draggable = !!onConfigChange;

  const makePointerHandlers = (target: 'text' | 'buttons') => ({
    onPointerDown: (e: React.PointerEvent) => {
      if (!draggable || !sectionRef.current) return;
      const rect = sectionRef.current.getBoundingClientRect();
      const sx = target === 'text' ? (config.textX ?? 50) : (config.buttonsX ?? 50);
      const sy = target === 'text' ? (config.textY ?? 50) : (config.buttonsY ?? 70);
      dragRef.current = { target, x: e.clientX, y: e.clientY, sx, sy, rect };
      setDragging(target);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    onPointerMove: (e: React.PointerEvent) => {
      const s = dragRef.current;
      if (!s || s.target !== target) return;
      const dxPct = ((e.clientX - s.x) / s.rect.width) * 100;
      const dyPct = ((e.clientY - s.y) / s.rect.height) * 100;
      const newX = Math.max(0, Math.min(100, s.sx + dxPct));
      const newY = Math.max(0, Math.min(100, s.sy + dyPct));
      onConfigChange?.(
        target === 'text'
          ? ({ textX: newX, textY: newY } as Partial<Config>)
          : ({ buttonsX: newX, buttonsY: newY } as Partial<Config>),
      );
    },
    onPointerUp: (e: React.PointerEvent) => {
      if (!dragRef.current || dragRef.current.target !== target) return;
      dragRef.current = null;
      setDragging(null);
      try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* noop */ }
    },
  });
  const textDrag = makePointerHandlers('text');
  const buttonsDrag = makePointerHandlers('buttons');

  const rawBgImage = config.variant === 'image' ? config.imageUrl : slides[slide];
  const bgImage = imgFailed ? '' : rawBgImage;
  const embed = config.variant === 'video' ? youtubeEmbed(config.videoUrl) : null;
  const masterOn = config.showTextOverlay !== false;
  // Each text element has its own visibility flag too. They only matter when
  // the master overlay toggle is on.
  const showHeadline = masterOn && config.showHeadline !== false && !!config.headline;
  const showSubheadline = masterOn && config.showSubheadline !== false && !!config.subheadline;
  // Build the list of buttons to render. Newer schema stores buttons in an
  // array; older configs only have the single legacy ctaLabel/ctaUrl pair,
  // which we surface as button #1 so existing tenants keep their CTA.
  const allButtons = (config.buttons && config.buttons.length > 0)
    ? config.buttons.filter((b) => b.label && b.url)
    : (config.ctaLabel && config.ctaUrl
        ? [{ label: config.ctaLabel, url: config.ctaUrl, color: config.ctaColor || '#ffffff', size: config.ctaSize ?? 18 }]
        : []);
  const showCta = masterOn && config.showCta !== false && allButtons.length > 0;
  const showUnderlay = masterOn && config.showUnderlay !== false;
  const hasImage = !!bgImage;

  return (
    <section
      ref={sectionRef}
      id="top"
      className={`relative overflow-hidden text-white max-w-6xl mx-auto px-4 sm:px-6 ${hasImage ? '' : 'min-h-[40vh]'}`}
      style={hasImage ? undefined : { background: 'var(--site-primary)' }}
    >
      {/* Image (when present) always renders at its natural aspect — the
          section's height comes from the image, never from the text overlay,
          so toggling text on/off can't crop the graphic. */}
      {hasImage && (
        // Two shapes depending on config.imageFit:
        //   fill → 16:9 crop, center-covered. A portrait photo can't
        //          take over the page; the section height stays sane on
        //          desktop and phones alike.
        //   fit  → natural aspect (w-full h-auto). Preserves tenants who
        //          baked headline/crest into a specific graphic and need
        //          the whole image visible.
        // Text overlays position off the section, which in fill mode is
        // the 16:9 box and in fit mode is the image's natural rect.
        <img
          src={bgImage}
          alt=""
          className={
            config.imageFit === 'fill'
              ? 'block w-full aspect-video object-cover object-center'
              : 'block w-full h-auto'
          }
          loading="eager"
          onError={() => setImgFailed(true)}
        />
      )}
      {hasImage && showUnderlay && (
        <div
          className="absolute inset-0"
          style={{ backgroundColor: config.underlayColor || '#000000', opacity: 0.45 }}
        />
      )}
      {!hasImage && !embed && (
        <div
          className="absolute inset-0 opacity-80 pointer-events-none"
          style={{ background: 'radial-gradient(90% 70% at 85% 10%, var(--site-accent) 0%, transparent 55%)' }}
        />
      )}
      {embed && (
        <div
          className={`text-center ${hasImage ? 'absolute' : 'relative py-20 sm:py-28 max-w-5xl mx-auto px-4 sm:px-6'}`}
          style={
            hasImage
              ? {
                  left: `${config.textX ?? 50}%`,
                  top: `${config.textY ?? 50}%`,
                  transform: 'translate(-50%, -50%)',
                  width: 'max-content',
                  maxWidth: '100%',
                }
              : undefined
          }
        >
          <div className="aspect-video max-w-3xl mx-auto rounded-xl overflow-hidden shadow-2xl">
            <iframe src={embed} className="w-full h-full" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
          </div>
        </div>
      )}
      {(showHeadline || showSubheadline) && (
        <div
          className={`text-center ${hasImage ? 'absolute max-sm:!left-1/2 max-sm:!w-[92%]' : 'relative pt-20 sm:pt-28 max-w-5xl mx-auto px-4 sm:px-6'} ${
            draggable && hasImage ? (dragging === 'text' ? 'cursor-grabbing' : 'cursor-grab') : ''
          }`}
          style={
            hasImage
              ? {
                  left: `${config.textX ?? 50}%`,
                  top: `${config.textY ?? 50}%`,
                  transform: 'translate(-50%, -50%)',
                  padding: '0 1rem',
                  width: 'max-content',
                  maxWidth: '100%',
                  touchAction: draggable ? 'none' : undefined,
                }
              : undefined
          }
          onPointerDown={hasImage ? textDrag.onPointerDown : undefined}
          onPointerMove={hasImage ? textDrag.onPointerMove : undefined}
          onPointerUp={hasImage ? textDrag.onPointerUp : undefined}
          onPointerCancel={hasImage ? textDrag.onPointerUp : undefined}
        >
          {showHeadline && (
            <h1
              className="normal-case font-bold mb-4 leading-tight drop-shadow"
              style={{
                color: config.headlineColor || '#ffffff',
                fontSize: fluidPx(config.headlineSize ?? 60),
              }}
            >
              {config.headline}
            </h1>
          )}
          {showSubheadline && (
            <p
              className="leading-relaxed"
              style={{
                color: config.subheadlineColor || '#ffffff',
                opacity: 0.9,
                fontSize: fluidPx(config.subheadlineSize ?? 22),
              }}
            >
              {config.subheadline}
            </p>
          )}
          {draggable && hasImage && (
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs bg-slate-900/80 text-white px-2 py-0.5 rounded whitespace-nowrap pointer-events-none select-none">
              Drag text
            </div>
          )}
        </div>
      )}
      {showCta && (
        <div
          className={`text-center ${hasImage ? 'absolute max-sm:!left-1/2 max-sm:!w-[92%]' : 'relative pb-20 sm:pb-28 max-w-5xl mx-auto px-4 sm:px-6'} ${
            draggable && hasImage ? (dragging === 'buttons' ? 'cursor-grabbing' : 'cursor-grab') : ''
          }`}
          style={
            hasImage
              ? {
                  left: `${config.buttonsX ?? 50}%`,
                  top: `${config.buttonsY ?? 70}%`,
                  transform: 'translate(-50%, -50%)',
                  padding: '0 1rem',
                  width: 'max-content',
                  maxWidth: '100%',
                  touchAction: draggable ? 'none' : undefined,
                }
              : undefined
          }
          onPointerDown={hasImage ? buttonsDrag.onPointerDown : undefined}
          onPointerMove={hasImage ? buttonsDrag.onPointerMove : undefined}
          onPointerUp={hasImage ? buttonsDrag.onPointerUp : undefined}
          onPointerCancel={hasImage ? buttonsDrag.onPointerUp : undefined}
        >
          <div className="flex flex-wrap items-center justify-center gap-3">
            {allButtons.map((btn, i) => (
              <Button
                key={i}
                asChild
                size="lg"
                className="rounded-full px-8 py-6 hover:opacity-90 transition-opacity"
                style={{
                  backgroundColor: btn.color || '#ffffff',
                  color: contrastText(btn.color || '#ffffff'),
                  fontSize: fluidPx(btn.size ?? 18),
                }}
              >
                <a
                  href={btn.url}
                  draggable={false}
                  onClick={draggable ? (e) => e.preventDefault() : undefined}
                >
                  {btn.label}
                </a>
              </Button>
            ))}
          </div>
          {draggable && hasImage && (
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs bg-slate-900/80 text-white px-2 py-0.5 rounded whitespace-nowrap pointer-events-none select-none">
              Drag buttons
            </div>
          )}
        </div>
      )}
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

type HeroButton = { label: string; url: string; color: string; size: number };

function normalizeButtons(config: Config): HeroButton[] {
  if (config.buttons && config.buttons.length > 0) {
    return config.buttons.map((b) => ({
      label: b.label ?? '',
      url: b.url ?? '',
      color: b.color || '#ffffff',
      size: b.size ?? 18,
    }));
  }
  if (config.ctaLabel || config.ctaUrl) {
    return [{
      label: config.ctaLabel ?? '',
      url: config.ctaUrl ?? '',
      color: config.ctaColor || '#ffffff',
      size: config.ctaSize ?? 18,
    }];
  }
  return [];
}

function ButtonsEditor({
  show, onShowChange, buttons, onChange,
}: {
  show: boolean;
  onShowChange: (v: boolean) => void;
  buttons: HeroButton[];
  onChange: (buttons: HeroButton[]) => void;
}) {
  const update = (i: number, patch: Partial<HeroButton>) =>
    onChange(buttons.map((b, j) => (j === i ? { ...b, ...patch } : b)));
  const remove = (i: number) => onChange(buttons.filter((_, j) => j !== i));
  const add = () =>
    onChange([...buttons, { label: '', url: '', color: '#ffffff', size: 18 }]);

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={show}
          onChange={(e) => onShowChange(e.target.checked)}
          className="h-4 w-4"
        />
        <span className="text-sm font-medium flex-1">Buttons</span>
      </label>
      {show && (
        <div className="pl-6 space-y-2">
          {buttons.map((btn, i) => (
            <div key={i} className="rounded border border-slate-200 bg-white p-2 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={btn.label}
                  onChange={(e) => update(i, { label: e.target.value })}
                  placeholder="Button label"
                  className="h-8 text-sm"
                />
                <Input
                  value={btn.url}
                  onChange={(e) => update(i, { url: e.target.value })}
                  placeholder="#events or https://…"
                  className="h-8 text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={btn.color}
                  onChange={(e) => update(i, { color: e.target.value })}
                  className="h-6 w-8 rounded border cursor-pointer shrink-0"
                  title="Button color"
                />
                <input
                  type="range"
                  min={12}
                  max={36}
                  step={1}
                  value={btn.size}
                  onChange={(e) => update(i, { size: Number(e.target.value) })}
                  className="flex-1 accent-sky-600"
                />
                <span className="text-xs text-slate-500 tabular-nums w-10 text-right">{btn.size}px</span>
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="text-slate-400 hover:text-red-600"
                  title="Remove button"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={add}
            className="text-xs text-sky-600 hover:underline inline-flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Add button
          </button>
        </div>
      )}
    </div>
  );
}

function TextOverItem({
  label, hint, checked, onCheck, color, onColor,
  size, onSize, sizeMin = 12, sizeMax = 120,
  children,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onCheck: (v: boolean) => void;
  color: string;
  onColor: (c: string) => void;
  size?: number;
  onSize?: (n: number) => void;
  sizeMin?: number;
  sizeMax?: number;
  children?: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onCheck(e.target.checked)}
          className="h-4 w-4"
        />
        <span className="text-sm font-medium flex-1">{label}</span>
        <input
          type="color"
          value={color}
          onChange={(e) => onColor(e.target.value)}
          className="h-6 w-8 rounded border cursor-pointer"
          title={`${label} color`}
        />
      </div>
      {hint && <p className="text-xs text-slate-500 pl-6">{hint}</p>}
      {checked && size !== undefined && onSize && (
        <div className="pl-6 flex items-center gap-2">
          <input
            type="range"
            min={sizeMin}
            max={sizeMax}
            step={1}
            value={size}
            onChange={(e) => onSize(Number(e.target.value))}
            className="flex-1 accent-sky-600"
          />
          <span className="text-xs text-slate-500 tabular-nums w-12 text-right">{size}px</span>
        </div>
      )}
      {checked && children && <div className="pl-6">{children}</div>}
    </div>
  );
}

function EditorForm({ config, onChange, theme }: BlockEditorFormProps<Config>) {
  const set = (patch: Partial<Config>) => onChange({ ...config, ...patch });
  const showOverlay = config.showTextOverlay !== false;
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
      {config.variant === 'image' && (
        <ImageUploadField
          label="Hero image"
          prefix="hero"
          value={config.imageUrl}
          onChange={(url) => set({ imageUrl: url })}
          buttonColor={theme?.primaryColor}
        />
      )}
      {(config.variant === 'image' || config.variant === 'slideshow') && (
        <div className="space-y-1.5">
          <Label>Image shape</Label>
          <Select
            value={config.imageFit ?? 'fit'}
            onValueChange={(v) => set({ imageFit: v as Config['imageFit'] })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="fill">Fill (16:9 — recommended)</SelectItem>
              <SelectItem value="fit">Fit whole image</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-slate-500">
            Fill crops portrait photos to a widescreen banner. Fit shows the full image at any height.
          </p>
        </div>
      )}
      {(config.variant === 'image' || config.variant === 'slideshow') && (
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={showOverlay}
              onChange={(e) => set({ showTextOverlay: e.target.checked })}
              className="h-4 w-4"
            />
            <span className="font-medium">Show text over image</span>
          </label>
          {showOverlay && (
            <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50/50 p-3">
              <TextOverItem
                label="Headline"
                checked={config.showHeadline !== false}
                onCheck={(v) => set({ showHeadline: v })}
                color={config.headlineColor || '#ffffff'}
                onColor={(c) => set({ headlineColor: c })}
                size={config.headlineSize ?? 60}
                onSize={(n) => set({ headlineSize: n })}
                sizeMin={16}
                sizeMax={160}
              >
                <Input
                  value={config.headline}
                  onChange={(e) => set({ headline: e.target.value })}
                  placeholder="Welcome to our choir"
                />
              </TextOverItem>
              <TextOverItem
                label="Subheadline"
                checked={config.showSubheadline !== false}
                onCheck={(v) => set({ showSubheadline: v })}
                color={config.subheadlineColor || '#ffffff'}
                onColor={(c) => set({ subheadlineColor: c })}
                size={config.subheadlineSize ?? 22}
                onSize={(n) => set({ subheadlineSize: n })}
                sizeMin={12}
                sizeMax={60}
              >
                <Textarea
                  rows={2}
                  value={config.subheadline}
                  onChange={(e) => set({ subheadline: e.target.value })}
                  placeholder="A short line that supports the headline"
                />
              </TextOverItem>
              <ButtonsEditor
                show={config.showCta !== false}
                onShowChange={(v) => set({ showCta: v })}
                buttons={normalizeButtons(config)}
                onChange={(buttons) => set({ buttons, ctaLabel: '', ctaUrl: '' })}
              />
              <TextOverItem
                label="Dark underlay"
                hint="Tints the image so text is easier to read."
                checked={config.showUnderlay !== false}
                onCheck={(v) => set({ showUnderlay: v })}
                color={config.underlayColor || '#000000'}
                onColor={(c) => set({ underlayColor: c })}
              />
              <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                <span className="text-xs text-slate-500">
                  Drag the text and buttons separately on the preview.
                </span>
                <button
                  type="button"
                  onClick={() => set({ textX: 50, textY: 50, buttonsX: 50, buttonsY: 70 })}
                  className="text-xs text-sky-600 hover:underline"
                >
                  Reset positions
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      {config.variant === 'video' && (
        <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50/50 p-3">
          <TextOverItem
            label="Headline"
            checked={config.showHeadline !== false}
            onCheck={(v) => set({ showHeadline: v })}
            color={config.headlineColor || '#ffffff'}
            onColor={(c) => set({ headlineColor: c })}
          >
            <Input value={config.headline} onChange={(e) => set({ headline: e.target.value })} />
          </TextOverItem>
          <TextOverItem
            label="Subheadline"
            checked={config.showSubheadline !== false}
            onCheck={(v) => set({ showSubheadline: v })}
            color={config.subheadlineColor || '#ffffff'}
            onColor={(c) => set({ subheadlineColor: c })}
          >
            <Textarea rows={2} value={config.subheadline} onChange={(e) => set({ subheadline: e.target.value })} />
          </TextOverItem>
          <ButtonsEditor
            show={config.showCta !== false}
            onShowChange={(v) => set({ showCta: v })}
            buttons={normalizeButtons(config)}
            onChange={(buttons) => set({ buttons, ctaLabel: '', ctaUrl: '' })}
          />
        </div>
      )}
      {config.variant === 'slideshow' && (
        <div className="space-y-3">
          <Label>Slides</Label>
          {config.images.map((url, i) => (
            <div key={i} className="rounded-lg border border-slate-200 p-3 space-y-2 bg-slate-50/50">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-600">Slide {i + 1}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => set({ images: config.images.filter((_, j) => j !== i) })}
                  title="Remove slide"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <ImageUploadField
                label=""
                prefix="hero"
                value={url}
                onChange={(newUrl) => set({ images: config.images.map((u, j) => (j === i ? newUrl : u)) })}
                buttonColor={theme?.primaryColor}
              />
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
  description: 'Big opening section: image, slideshow, or video with a headline and call-to-action.',
  icon: ImageIcon,
  tier: 'free',
  group: 'core',
  poweredBy: 'Hero Manager',
  configSchema: schema,
  defaultConfig: {
    variant: 'image', imageFit: 'fill', headline: '', subheadline: '',
    ctaLabel: '', ctaUrl: '', imageUrl: '', images: [], videoUrl: '',
    showTextOverlay: true,
    showHeadline: true, showSubheadline: true, showCta: true, showUnderlay: true,
    headlineColor: '#ffffff', subheadlineColor: '#ffffff',
    ctaColor: '#ffffff', underlayColor: '#000000',
    headlineSize: 60, subheadlineSize: 22, ctaSize: 18,
    buttons: [],
    textX: 50, textY: 50,
    buttonsX: 50, buttonsY: 70,
  },
  EditorForm,
  Render,
};
