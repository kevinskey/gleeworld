import { useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { Image as ImageIcon, Plus, Trash2, GripVertical, MoveDiagonal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImageUploadField } from '../ImageUploadField';
import { EditableText } from '../EditableText';
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
  // Optional mobile-specific caps. When set, fluidPx uses these as the min
  // of the clamp() instead of its default 55%-of-desktop derivation, so
  // narrow viewports render at the mobile size rather than the derived
  // one. Absent = fall back to the auto formula.
  headlineSizeMobile: z.number().int().min(12).max(80).optional(),
  subheadlineSizeMobile: z.number().int().min(10).max(48).optional(),
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
  // Per-field placement (Canva-style). ABSENT = the field renders inside
  // the classic centered stack at textX/textY, pixel-identical to configs
  // saved before these fields existed. A field's first drag measures its
  // current on-screen center and seeds these, so pulling one field out of
  // the stack never causes a visual jump.
  headlineX: z.number().min(0).max(100).optional(),
  headlineY: z.number().min(0).max(100).optional(),
  subheadlineX: z.number().min(0).max(100).optional(),
  subheadlineY: z.number().min(0).max(100).optional(),
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
// and tiny on 4K displays. Desktop = `px`. Mobile = `mobilePx` when the
// user set one; otherwise auto-derives at ~55% of desktop (14px absolute
// floor so nothing becomes illegible).
//
// The auto-derived mobile floor is CAPPED at 40px: the floor exists for
// legibility, and 55% of a large desktop headline (easy to reach with
// the corner-resize handle) used to become an un-fitting phone size —
// e.g. 160px desktop → 88px clamp MINIMUM, overflowing a 390px viewport.
// With the cap, big headlines scale down to the fluid term on phones. An
// explicit mobilePx is still honored as-is. Exported for tests.
//
// Sizes are in cqw (container-query width units — the hero section is a
// container, see .gw-hero-section), NOT vw: the builder's phone preview
// renders the page in a narrow canvas where the browser viewport is still
// desktop-sized, so vw-based text stayed huge. cqw tracks the hero's own
// width, which is correct on real phones, in the preview canvas, and in
// iframes alike.
export function fluidPx(px: number, mobilePx?: number): string {
  const max = Math.max(12, Math.round(px));
  const autoMin = Math.max(14, Math.min(40, Math.round(max * 0.55)));
  const min = typeof mobilePx === 'number'
    ? Math.max(12, Math.min(max, Math.round(mobilePx)))
    : autoMin;
  // Slope chosen so the size reaches `max` around a 1280px-wide hero.
  const cqw = (max / 12).toFixed(2);
  return `clamp(${min}px, ${cqw}cqw, ${max}px)`;
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
  type DragTarget = 'text' | 'buttons' | 'headline' | 'subheadline';
  const dragRef = useRef<{
    target: DragTarget;
    x: number; y: number;
    sx: number; sy: number;
    rect: DOMRect;
    /** Half the dragged box's size as % of the section — clamps keep the
     * whole box inside the hero instead of letting half of it hang off. */
    halfW: number; halfH: number;
  } | null>(null);
  const [dragging, setDragging] = useState<DragTarget | null>(null);
  const draggable = !!onConfigChange;

  // Start coords for a drag. Per-field targets without stored coords are
  // seeded from the element's CURRENT rendered center so pulling a field
  // out of the legacy stack keeps it exactly where it appears.
  const dragStartCoords = (target: DragTarget, el: HTMLElement, section: DOMRect): { sx: number; sy: number } => {
    if (target === 'text') return { sx: config.textX ?? 50, sy: config.textY ?? 50 };
    if (target === 'buttons') return { sx: config.buttonsX ?? 50, sy: config.buttonsY ?? 70 };
    const storedX = target === 'headline' ? config.headlineX : config.subheadlineX;
    const storedY = target === 'headline' ? config.headlineY : config.subheadlineY;
    if (storedX != null && storedY != null) return { sx: storedX, sy: storedY };
    const r = el.getBoundingClientRect();
    return {
      sx: ((r.left + r.width / 2 - section.left) / section.width) * 100,
      sy: ((r.top + r.height / 2 - section.top) / section.height) * 100,
    };
  };
  const dragPatch = (target: DragTarget, x: number, y: number): Partial<Config> => {
    switch (target) {
      case 'text': return { textX: x, textY: y };
      case 'buttons': return { buttonsX: x, buttonsY: y };
      case 'headline': return { headlineX: x, headlineY: y };
      case 'subheadline': return { subheadlineX: x, subheadlineY: y };
    }
  };

  const makePointerHandlers = (target: DragTarget, opts?: { fieldEl?: () => HTMLElement | null }) => ({
    onPointerDown: (e: React.PointerEvent) => {
      if (!draggable || !sectionRef.current) return;
      // Per-field handles must not also start the stack/group drag.
      if (target === 'headline' || target === 'subheadline') e.stopPropagation();
      const rect = sectionRef.current.getBoundingClientRect();
      // Measure the FIELD box, not the grip handle the pointer landed on —
      // it feeds both coord seeding and the containment clamp.
      const measureEl = opts?.fieldEl?.()
        ?? ((e.currentTarget as HTMLElement).closest('[data-hero-field]') as HTMLElement | null)
        ?? (e.currentTarget as HTMLElement);
      const { sx, sy } = dragStartCoords(target, measureEl, rect);
      const box = measureEl.getBoundingClientRect();
      const halfW = Math.min(50, (box.width / 2 / rect.width) * 100);
      const halfH = Math.min(50, (box.height / 2 / rect.height) * 100);
      dragRef.current = { target, x: e.clientX, y: e.clientY, sx, sy, rect, halfW, halfH };
      setDragging(target);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    onPointerMove: (e: React.PointerEvent) => {
      const s = dragRef.current;
      if (!s || s.target !== target) return;
      const dxPct = ((e.clientX - s.x) / s.rect.width) * 100;
      const dyPct = ((e.clientY - s.y) / s.rect.height) * 100;
      // Clamp the box CENTER so the whole box stays inside the section —
      // "responsiveness is an epic fail" screenshot: half the headline
      // hanging off the left edge.
      const newX = Math.max(s.halfW, Math.min(100 - s.halfW, s.sx + dxPct));
      const newY = Math.max(s.halfH, Math.min(100 - s.halfH, s.sy + dyPct));
      onConfigChange?.(dragPatch(target, newX, newY));
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

  // Corner-handle resize per field — a direct-manipulation view of the same
  // headlineSize/subheadlineSize values the settings sliders edit. Bounds
  // mirror the zod schema so a drag can never produce an unsaveable config.
  const resizeRef = useRef<{ field: 'headline' | 'subheadline'; x: number; size: number } | null>(null);
  const RESIZE_BOUNDS = { headline: [16, 160], subheadline: [12, 60] } as const;
  const makeResizeHandlers = (field: 'headline' | 'subheadline') => ({
    onPointerDown: (e: React.PointerEvent) => {
      if (!draggable) return;
      e.stopPropagation();
      const size = field === 'headline' ? (config.headlineSize ?? 60) : (config.subheadlineSize ?? 22);
      resizeRef.current = { field, x: e.clientX, size };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    onPointerMove: (e: React.PointerEvent) => {
      const r = resizeRef.current;
      if (!r || r.field !== field) return;
      const [lo, hi] = RESIZE_BOUNDS[field];
      // 200px of horizontal drag doubles/halves the size — direct enough to
      // feel connected to the pointer without being twitchy.
      const next = Math.max(lo, Math.min(hi, Math.round(r.size * (1 + (e.clientX - r.x) / 200))));
      onConfigChange?.(
        field === 'headline'
          ? ({ headlineSize: next } as Partial<Config>)
          : ({ subheadlineSize: next } as Partial<Config>),
      );
    },
    onPointerUp: (e: React.PointerEvent) => {
      if (!resizeRef.current || resizeRef.current.field !== field) return;
      resizeRef.current = null;
      try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* noop */ }
    },
  });

  const rawBgImage = config.variant === 'image' ? config.imageUrl : slides[slide];
  const bgImage = imgFailed ? '' : rawBgImage;
  const embed = config.variant === 'video' ? youtubeEmbed(config.videoUrl) : null;
  const masterOn = config.showTextOverlay !== false;
  const editable = !!onConfigChange;
  // Each text element has its own visibility flag too. They only matter when
  // the master overlay toggle is on. In edit mode we ALSO render when the
  // text is empty, so tenants have somewhere to click and start typing.
  const showHeadline = masterOn && config.showHeadline !== false && (!!config.headline || editable);
  const showSubheadline = masterOn && config.showSubheadline !== false && (!!config.subheadline || editable);
  // Build the list of buttons to render. Newer schema stores buttons in an
  // array; older configs only have the single legacy ctaLabel/ctaUrl pair,
  // which we surface as button #1 so existing tenants keep their CTA.
  // Each entry keeps a `source` tag so inline label edits know which slot
  // in the config to write back to.
  type ButtonWithSource = {
    label: string;
    url: string;
    color: string;
    size: number;
    source: 'legacy' | 'array';
    arrayIndex?: number;
  };
  const allButtons: ButtonWithSource[] = (config.buttons && config.buttons.length > 0)
    ? config.buttons
        .map((b, i) => ({
          label: b.label,
          url: b.url,
          color: b.color || '#ffffff',
          size: b.size ?? 18,
          source: 'array' as const,
          arrayIndex: i,
        }))
        // On the public site we hide half-filled buttons, but in the editor we
        // keep them visible so tenants can finish typing without the button
        // disappearing between keystrokes.
        .filter((b) => editable || (b.label && b.url))
    : (config.ctaLabel && config.ctaUrl
        ? [{
            label: config.ctaLabel,
            url: config.ctaUrl,
            color: config.ctaColor || '#ffffff',
            size: config.ctaSize ?? 18,
            source: 'legacy' as const,
          }]
        : []);
  const showCta = masterOn && config.showCta !== false && allButtons.length > 0;
  const showUnderlay = masterOn && config.showUnderlay !== false;
  const hasImage = !!bgImage;

  return (
    <section
      ref={sectionRef}
      id="top"
      className={`gw-hero-section relative overflow-hidden text-white max-w-6xl mx-auto w-full ${hasImage ? '' : 'min-h-[40vh]'}`}
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
        // Section no longer has inner padding, so the image is w-full = section
        // width. Underlay uses inset-0 to match — full section coverage,
        // no gutters to worry about.
        <div
          className="absolute inset-0 pointer-events-none"
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
        // When the hero variant is Video (no background image), the embed IS
        // the hero — fill the section width at 16:9, same footprint an image
        // would take. Was max-w-3xl mx-auto with padding all around, which
        // rendered as a small centered card in a sea of primary color.
        // When an image is also present (rare — variant=image but videoUrl
        // set), keep the draggable centered overlay behavior so the video
        // sits over the image like a play card.
        hasImage ? (
          <div
            className="absolute text-center"
            style={{
              left: `${config.textX ?? 50}%`,
              top: `${config.textY ?? 50}%`,
              transform: 'translate(-50%, -50%)',
              width: 'max-content',
              maxWidth: '100%',
            }}
          >
            <div className="aspect-video w-[min(90vw,48rem)] rounded-xl overflow-hidden shadow-2xl">
              <iframe src={embed} className="w-full h-full" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
            </div>
          </div>
        ) : (
          <div className="block w-full aspect-video">
            <iframe
              src={embed}
              className="w-full h-full block"
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          </div>
        )
      )}
      {(() => {
        // Per-field placement: a field with stored coords "floats" free of
        // the stack (only meaningful over an image, where positioning is
        // absolute). Coordless fields keep rendering in the legacy stack —
        // pixel-identical to pre-feature configs.
        const headlineFloating = hasImage && config.headlineX != null && config.headlineY != null;
        const subFloating = hasImage && config.subheadlineX != null && config.subheadlineY != null;
        const stackFields = [
          showHeadline && !headlineFloating ? 'headline' : null,
          showSubheadline && !subFloating ? 'subheadline' : null,
        ].filter(Boolean) as Array<'headline' | 'subheadline'>;

        const fieldText = (field: 'headline' | 'subheadline') => field === 'headline' ? (
          <EditableText
            as="h1"
            editable={editable}
            value={config.headline}
            onChange={(v) => onConfigChange?.({ headline: v } as Partial<Config>)}
            placeholder="Your headline"
            ariaLabel="Hero headline"
            className="normal-case font-bold mb-4 leading-tight drop-shadow"
            style={{
              color: config.headlineColor || '#ffffff',
              fontSize: fluidPx(config.headlineSize ?? 60, config.headlineSizeMobile),
            }}
          />
        ) : (
          <EditableText
            as="p"
            editable={editable}
            value={config.subheadline}
            onChange={(v) => onConfigChange?.({ subheadline: v } as Partial<Config>)}
            placeholder="A short line under the headline"
            ariaLabel="Hero subheadline"
            className="leading-relaxed"
            style={{
              color: config.subheadlineColor || '#ffffff',
              opacity: 0.9,
              fontSize: fluidPx(config.subheadlineSize ?? 22, config.subheadlineSizeMobile),
            }}
          />
        );

        // Hover handles: grip (move just this field) + corner (resize its
        // font). The grip drag seeds per-field coords from the measured
        // center, which is what pulls a field out of the stack.
        const fieldHandles = (field: 'headline' | 'subheadline') => {
          if (!draggable || !hasImage) return null;
          const drag = makePointerHandlers(field);
          const resize = makeResizeHandlers(field);
          return (
            <>
              <span
                {...drag}
                className="absolute -left-8 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded bg-slate-900/80 text-white cursor-grab opacity-0 group-hover/field:opacity-100 transition-opacity select-none"
                title={`Drag to move the ${field}`}
              >
                <GripVertical className="w-3.5 h-3.5" />
              </span>
              <span
                {...resize}
                className="absolute -right-7 -bottom-1 flex h-6 w-6 items-center justify-center rounded bg-slate-900/80 text-white cursor-nwse-resize opacity-0 group-hover/field:opacity-100 transition-opacity select-none"
                title={`Drag to resize the ${field}`}
              >
                <MoveDiagonal className="w-3.5 h-3.5" />
              </span>
            </>
          );
        };

        const floatingField = (field: 'headline' | 'subheadline') => {
          const x = field === 'headline' ? config.headlineX : config.subheadlineX;
          const y = field === 'headline' ? config.headlineY : config.subheadlineY;
          const drag = draggable ? makePointerHandlers(field) : null;
          return (
            <div
              key={field}
              data-hero-field
              className={`gw-hero-overlay text-center absolute group/field ${
                draggable ? (dragging === field ? 'cursor-grabbing' : 'cursor-grab') : ''
              }`}
              style={{
                left: `${x}%`,
                top: `${y}%`,
                transform: 'translate(-50%, -50%)',
                padding: '0 1rem',
                width: 'max-content',
                maxWidth: '100%',
                touchAction: draggable ? 'none' : undefined,
              }}
              onPointerDown={drag?.onPointerDown}
              onPointerMove={drag?.onPointerMove}
              onPointerUp={drag?.onPointerUp}
              onPointerCancel={drag?.onPointerUp}
            >
              {fieldText(field)}
              {fieldHandles(field)}
            </div>
          );
        };

        return (
          <>
            {stackFields.length > 0 && (
              <div
                className={`text-center ${hasImage ? 'gw-hero-overlay absolute' : 'relative pt-20 cq-sm:pt-28 max-w-5xl mx-auto px-4 cq-sm:px-6'} ${
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
                {stackFields.map((field) => (
                  <div key={field} data-hero-field className="relative group/field">
                    {fieldText(field)}
                    {fieldHandles(field)}
                  </div>
                ))}
                {draggable && hasImage && (
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs bg-slate-900/80 text-white px-2 py-0.5 rounded whitespace-nowrap pointer-events-none select-none">
                    Drag text · grip = one field · corner = resize
                  </div>
                )}
              </div>
            )}
            {showHeadline && headlineFloating && floatingField('headline')}
            {showSubheadline && subFloating && floatingField('subheadline')}
          </>
        );
      })()}
      {showCta && (
        <div
          className={`text-center ${hasImage ? 'gw-hero-overlay absolute' : 'relative pb-20 cq-sm:pb-28 max-w-5xl mx-auto px-4 cq-sm:px-6'} ${
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
            {allButtons.map((btn, i) => {
              // Route the label edit back to whichever slot this button came
              // from — the legacy top-level ctaLabel field, or a specific
              // index in the newer buttons[] array.
              const commitLabel = (v: string) => {
                if (btn.source === 'legacy') {
                  onConfigChange?.({ ctaLabel: v } as Partial<Config>);
                  return;
                }
                const idx = btn.arrayIndex ?? 0;
                const nextButtons = config.buttons.map((b, j) => (j === idx ? { ...b, label: v } : b));
                onConfigChange?.({ buttons: nextButtons } as Partial<Config>);
              };
              // Editor: skip the anchor so contentEditable owns the click.
              // Public site: keep the anchor + Button asChild wrap intact.
              if (editable) {
                return (
                  <Button
                    key={i}
                    size="lg"
                    className="rounded-full px-8 py-6 hover:opacity-90 transition-opacity"
                    style={{
                      backgroundColor: btn.color || '#ffffff',
                      color: contrastText(btn.color || '#ffffff'),
                      fontSize: fluidPx(btn.size ?? 18),
                    }}
                    onClick={(e) => e.preventDefault()}
                  >
                    <EditableText
                      as="span"
                      editable
                      value={btn.label}
                      onChange={commitLabel}
                      placeholder="Button text"
                      ariaLabel="Button label"
                    />
                  </Button>
                );
              }
              return (
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
              );
            })}
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
  mobileSize, onMobileSize, mobileSizeMin = 12, mobileSizeMax = 80,
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
  /** Optional per-item override for the size to render at on mobile (below
   *  ~640px). When undefined, mobile auto-derives at 55% of desktop size. */
  mobileSize?: number;
  onMobileSize?: (n: number | undefined) => void;
  mobileSizeMin?: number;
  mobileSizeMax?: number;
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
          <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500 w-14">Desktop</span>
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
      {checked && size !== undefined && onMobileSize && (
        // Mobile size is optional — the small "Auto" button clears the override
        // so the fluidPx auto-derivation takes back over (~55% of desktop).
        <div className="pl-6 flex items-center gap-2">
          <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500 w-14">Mobile</span>
          <input
            type="range"
            min={mobileSizeMin}
            max={Math.min(mobileSizeMax, size)}
            step={1}
            value={mobileSize ?? Math.max(mobileSizeMin, Math.round(size * 0.55))}
            onChange={(e) => onMobileSize(Number(e.target.value))}
            className="flex-1 accent-sky-600"
          />
          <span className="text-xs text-slate-500 tabular-nums w-12 text-right">
            {mobileSize ?? Math.round(size * 0.55)}px
          </span>
          <button
            type="button"
            onClick={() => onMobileSize(undefined)}
            className="text-[10px] font-medium text-sky-600 hover:text-sky-700 disabled:text-slate-400"
            disabled={mobileSize === undefined}
            title="Clear mobile override — auto-scale from desktop size"
          >
            Auto
          </button>
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
                mobileSize={config.headlineSizeMobile}
                onMobileSize={(n) => set({ headlineSizeMobile: n })}
                mobileSizeMin={12}
                mobileSizeMax={80}
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
                mobileSize={config.subheadlineSizeMobile}
                onMobileSize={(n) => set({ subheadlineSizeMobile: n })}
                mobileSizeMin={10}
                mobileSizeMax={48}
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
                  onClick={() => set({
                    textX: 50, textY: 50, buttonsX: 50, buttonsY: 70,
                    // Clear per-field placements — fields return to the stack.
                    headlineX: undefined, headlineY: undefined,
                    subheadlineX: undefined, subheadlineY: undefined,
                  })}
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
