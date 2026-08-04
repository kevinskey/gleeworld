import { useRef, useState, type ReactNode } from 'react';
import { z } from 'zod';
import { Info, Heading2, Heading3, Image as ImageIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ImageUploadField } from '../ImageUploadField';
import { EditableText } from '../EditableText';
import { MediaPicker, type MediaItem } from '../MediaPicker';
import type { BlockModule, BlockEditorFormProps, BlockRenderProps } from '../types';

const schema = z.object({
  title: z.string().default('About us'),
  body: z.string().default(''),
  // Legacy single-image fields — still honored when the body contains no
  // inline image tokens, so tenants who set up About before inline media
  // don't lose their photo. New content should use the inline `![…](…)`
  // syntax below, which supports multiple images and per-image placement.
  imageUrl: z.string().default(''),
  imageSide: z.enum(['left', 'right']).default('right'),
});
type Config = z.infer<typeof schema>;

// Word-style wrap modes for pictures. Aliased legacy names ('left', 'right',
// 'center') stay accepted so already-saved content keeps rendering.
//
//   inline         — In Line with Text: image renders inline in the paragraph
//                    (mid-text if placed on the same line, or on its own line
//                    if the token stands alone).
//   square-left    — Square: image floats left, text wraps to the right against
//                    its rectangular boundary. (Legacy alias: `left`.)
//   square-right   — Square: image floats right, text wraps to the left.
//                    (Legacy alias: `right`.)
//   tight-left     — Tight: floats left, text hugs the visible shape using
//                    CSS shape-outside against the image's alpha channel.
//                    Requires a PNG/WebP with transparency; falls back to
//                    Square for opaque images.
//   tight-right    — Tight, floats right.
//   through-left   — Through: same as tight but with zero shape margin so
//                    text runs right up to the image contour.
//   through-right  — Through, floats right.
//   top-bottom     — Top and Bottom: block image, centered, no side wrap.
//                    (Legacy alias: `center`.)
//   behind         — Behind Text: image fills the paragraph segment as a
//                    faded background, text reads over it.
//   front          — In Front of Text: image overlays the paragraph segment
//                    fully opaque and may cover text (useful for pinning a
//                    graphic on top of a caption).
const WRAP_MODES = [
  'inline',
  'square-left',
  'square-right',
  'tight-left',
  'tight-right',
  'through-left',
  'through-right',
  'top-bottom',
  'behind',
  'front',
] as const;
type WrapMode = typeof WRAP_MODES[number];

const IMG_TOKEN_RE = /^!\[(inline|square-left|square-right|tight-left|tight-right|through-left|through-right|top-bottom|behind|front|left|center|right)\]\(\s*(\S+?)\s*(?:\s+"([^"]*)")?\)\s*$/;

// Same alternation, global, for mid-paragraph inline scanning.
const INLINE_TOKEN_RE = /!\[inline\]\(\s*(\S+?)\s*(?:\s+"([^"]*)")?\)/g;

function normalizeMode(raw: string): WrapMode {
  if (raw === 'left') return 'square-left';
  if (raw === 'right') return 'square-right';
  if (raw === 'center') return 'top-bottom';
  return raw as WrapMode;
}

type ImgToken = { mode: WrapMode; url: string; caption?: string };

function parseImgToken(line: string): ImgToken | null {
  const m = line.match(IMG_TOKEN_RE);
  if (!m) return null;
  return { mode: normalizeMode(m[1]), url: m[2], caption: m[3] || undefined };
}

function modeCategory(mode: WrapMode): 'float' | 'block' | 'inline' | 'overlay' {
  if (mode === 'inline') return 'inline';
  if (mode === 'top-bottom') return 'block';
  if (mode === 'behind' || mode === 'front') return 'overlay';
  return 'float';
}

// Render paragraph text, splitting on any `![inline](url)` tokens so they
// sit mid-line as inline-block images. Text before/after the token stays
// preserved with `whitespace-pre-wrap` semantics.
function renderParagraphText(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  INLINE_TOKEN_RE.lastIndex = 0;
  let i = 0;
  while ((m = INLINE_TOKEN_RE.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(
      <img
        key={`in-${i++}`}
        src={m[1]}
        alt={m[2] ?? ''}
        className="inline-block align-middle mx-1 h-10 cq-sm:h-12 w-auto rounded-md shadow-sm"
        loading="lazy"
      />,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length ? parts : [text];
}

function InlineImage({ token }: { token: ImgToken }) {
  const { mode, url, caption } = token;

  if (mode === 'inline') {
    // Standalone-line inline: shown small, centered on its own line. When
    // the token appears mid-paragraph, `renderParagraphText` handles it and
    // this branch never runs for that token.
    return (
      <span className="block text-center my-3">
        <img
          src={url}
          alt={caption ?? ''}
          className="inline-block align-middle max-w-full h-auto max-h-32 rounded-md shadow-sm"
          loading="lazy"
        />
        {caption && (
          <span className="block text-xs text-muted-foreground italic mt-1">{caption}</span>
        )}
      </span>
    );
  }

  if (mode === 'top-bottom') {
    return (
      <figure className="mx-auto my-4 clear-both max-w-full cq-sm:max-w-[42rem]">
        <img
          src={url}
          alt={caption ?? ''}
          className="w-full h-auto rounded-2xl shadow-lg"
          loading="lazy"
        />
        {caption && (
          <figcaption className="text-xs cq-sm:text-sm text-muted-foreground italic mt-1.5 text-center">
            {caption}
          </figcaption>
        )}
      </figure>
    );
  }

  if (mode === 'behind' || mode === 'front') {
    // Overlay modes live INSIDE a position:relative segment wrapper (set up
    // by flushSegment). 'behind' sits under the text with a fade; 'front'
    // sits on top opaque.
    const layerClass = mode === 'behind'
      ? 'absolute inset-0 -z-10 opacity-20 pointer-events-none'
      : 'absolute inset-0 z-20';
    return (
      <img
        src={url}
        alt={caption ?? ''}
        className={`${layerClass} w-full h-full object-cover rounded-2xl`}
        loading="lazy"
      />
    );
  }

  // Float modes: square-left/right, tight-left/right, through-left/right.
  const side = mode.endsWith('-left') ? 'left' : 'right';
  const floatClass = side === 'left'
    ? 'cq-sm:float-left cq-sm:mr-6 cq-sm:mb-3'
    : 'cq-sm:float-right cq-sm:ml-6 cq-sm:mb-3';
  const isTight = mode.startsWith('tight-') || mode.startsWith('through-');
  const shapeMargin = mode.startsWith('through-') ? '0px' : '8px';
  // `shape-outside: url(...)` reads the image's alpha channel to build the
  // wrap contour. The image must be same-origin OR CORS-enabled — Supabase
  // storage serves with Access-Control-Allow-Origin: *, so `crossOrigin`
  // primes the browser to reuse the CORS-fetched pixels for the shape
  // calculation. Opaque images (JPEG) just fall back to a rectangle.
  const style: React.CSSProperties = isTight
    ? ({
        shapeOutside: `url("${url}")`,
        shapeImageThreshold: 0.5,
        shapeMargin,
      } as React.CSSProperties)
    : {};
  return (
    <figure className={`${floatClass} mb-4 cq-sm:mb-3 max-w-full cq-sm:w-[20rem] cq-md:w-[24rem]`}>
      <img
        src={url}
        alt={caption ?? ''}
        crossOrigin={isTight ? 'anonymous' : undefined}
        style={style}
        className="w-full h-auto rounded-2xl shadow-lg"
        loading="lazy"
      />
      {caption && (
        <figcaption className="text-xs cq-sm:text-sm text-muted-foreground italic mt-1.5 text-center">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

// Render the body as a sequence of blocks split on blank lines. Each block
// can be a heading (`## `, `### `), an image token (alone or with trailing
// text), a horizontal rule / clear (`---`), or a plain paragraph.
//
// Wrap behavior: a left/right image token sits on its own line in the
// author's markdown (that's how the Insert toolbar writes it) but CSS
// floats only wrap content that FOLLOWS them. To avoid dead space beside
// the image, we look ahead: if a lone image block is followed by a plain
// paragraph, we consume both and render them together — image floated,
// paragraph wraps around it. If the next block is a heading, another
// image, or a `---`, the image is standalone (it would clear anyway).
// Center images always render standalone since they don't float.
function BodyContent({ body }: { body: string }) {
  const blocks = body.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);

  // Pre-parse each block so we can peek at the next block during rendering.
  type Parsed =
    | { kind: 'clear' }
    | { kind: 'h2'; text: string }
    | { kind: 'h3'; text: string }
    | { kind: 'img-with-text'; token: ImgToken; rest: string }
    | { kind: 'img-alone'; token: ImgToken }
    | { kind: 'ul'; items: string[] }
    | { kind: 'ol'; items: string[] }
    | { kind: 'para'; text: string };
  // A block whose every line starts with "* ", "- ", or "N. " is a list.
  // We're lenient: a line missing the marker joins the previous item.
  const listItemRe = /^[*\-]\s+(.*)$/;
  const orderedItemRe = /^\d+\.\s+(.*)$/;
  const parseList = (
    lines: string[],
    re: RegExp,
  ): string[] | null => {
    if (!re.test(lines[0])) return null;
    const items: string[] = [];
    for (const line of lines) {
      const m = line.match(re);
      if (m) items.push(m[1]);
      else if (items.length) items[items.length - 1] += ' ' + line.trim();
      else return null;
    }
    return items;
  };
  const parsed: Parsed[] = blocks.map((block) => {
    if (block === '---') return { kind: 'clear' };
    if (block.startsWith('## ')) return { kind: 'h2', text: block.slice(3).trim() };
    if (block.startsWith('### ')) return { kind: 'h3', text: block.slice(4).trim() };
    const lines = block.split(/\n/);
    const firstImg = parseImgToken(lines[0]);
    if (firstImg) {
      const rest = lines.slice(1).join('\n').trim();
      return rest
        ? { kind: 'img-with-text', token: firstImg, rest }
        : { kind: 'img-alone', token: firstImg };
    }
    const ul = parseList(lines, listItemRe);
    if (ul) return { kind: 'ul', items: ul };
    const ol = parseList(lines, orderedItemRe);
    if (ol) return { kind: 'ol', items: ol };
    return { kind: 'para', text: block };
  });

  // Segment strategy: a "segment" is a run of adjacent paragraphs plus any
  // left/right float images that appeared inside/next to them. On flush,
  // the images render FIRST (so CSS floats can affect every paragraph that
  // follows in the same block container), then the paragraphs. This way a
  // single image placed anywhere in a run of paragraphs — before, between,
  // or after — visually appears alongside those paragraphs instead of
  // leaving dead space. Clear points (headings, `---`, or a center image)
  // flush the current segment before rendering themselves.
  type SegChild =
    | { kind: 'para'; text: string }
    | { kind: 'ul'; items: string[] }
    | { kind: 'ol'; items: string[] };

  const out: JSX.Element[] = [];
  let segChildren: SegChild[] = [];
  let segImgs: ImgToken[] = [];
  let segKey = 0;

  // Segment holds: float images (rendered first so text wraps around them),
  // overlay images (behind/front, positioned absolute within the segment
  // div), and children (paragraphs / lists / standalone inline images).
  let segOverlays: ImgToken[] = [];

  const renderChild = (child: SegChild, key: string) => {
    if (child.kind === 'para') {
      return (
        <p
          key={key}
          className="text-base cq-sm:text-lg text-muted-foreground leading-relaxed whitespace-pre-wrap mb-4 last:mb-0"
        >
          {renderParagraphText(child.text)}
        </p>
      );
    }
    if (child.kind === 'ul') {
      return (
        <ul
          key={key}
          className="list-disc pl-6 mb-4 last:mb-0 space-y-1 text-base cq-sm:text-lg text-muted-foreground leading-relaxed marker:text-[color:var(--site-accent)]"
        >
          {child.items.map((it, i) => (
            <li key={i}>{renderParagraphText(it)}</li>
          ))}
        </ul>
      );
    }
    return (
      <ol
        key={key}
        className="list-decimal pl-6 mb-4 last:mb-0 space-y-1 text-base cq-sm:text-lg text-muted-foreground leading-relaxed marker:text-[color:var(--site-accent)]"
      >
        {child.items.map((it, i) => (
          <li key={i}>{renderParagraphText(it)}</li>
        ))}
      </ol>
    );
  };

  const flushSegment = () => {
    if (segChildren.length === 0 && segImgs.length === 0 && segOverlays.length === 0) return;
    const key = `seg-${segKey++}`;
    const hasOverlay = segOverlays.length > 0;
    if (segImgs.length === 0 && !hasOverlay) {
      // No image in this segment — render children directly (avoids an
      // unnecessary wrapping div and keeps last:mb-0 semantics working).
      for (const [i, child] of segChildren.entries()) {
        out.push(renderChild(child, `${key}-c${i}`));
      }
    } else {
      // Overlay images need position:relative on the wrapper so their
      // absolute positioning is scoped to the paragraph run they belong
      // to. min-height keeps the wrapper visible when the segment is
      // image-only.
      const wrapperClass = hasOverlay
        ? 'relative overflow-hidden rounded-2xl [&:not(:first-child)]:mt-2 min-h-[16rem]'
        : '[&:not(:first-child)]:mt-2';
      out.push(
        <div key={key} className={wrapperClass}>
          {segOverlays.map((token, i) => (
            <InlineImage key={`${key}-ov${i}`} token={token} />
          ))}
          {/* Text sits above a `behind` image via z-10; float images sit in
              normal flow (their own float context) between overlays and
              paragraphs. */}
          <div className={hasOverlay ? 'relative z-10 p-4 cq-sm:p-6' : ''}>
            {segImgs.map((token, i) => (
              <InlineImage key={`${key}-img${i}`} token={token} />
            ))}
            {segChildren.map((child, i) => renderChild(child, `${key}-c${i}`))}
            {/* If the segment has no text children (e.g. a lone image right
                before a heading), the floated image would collapse the
                wrapper's height to 0. Force an in-flow line so the section
                takes real vertical space and the following heading's
                clear-both actually sits below it. */}
            {segChildren.length === 0 && <div className="clear-both" />}
          </div>
        </div>,
      );
    }
    segChildren = [];
    segImgs = [];
    segOverlays = [];
  };

  for (const p of parsed) {
    if (p.kind === 'para') {
      segChildren.push({ kind: 'para', text: p.text });
      continue;
    }
    if (p.kind === 'ul') {
      segChildren.push({ kind: 'ul', items: p.items });
      continue;
    }
    if (p.kind === 'ol') {
      segChildren.push({ kind: 'ol', items: p.items });
      continue;
    }
    if (p.kind === 'img-alone') {
      const cat = modeCategory(p.token.mode);
      if (cat === 'block' || cat === 'inline') {
        // Block-level image (top-bottom, or a standalone inline token) —
        // stands alone, flush the segment first so it doesn't get swept
        // into a float run.
        flushSegment();
        const key = `seg-${segKey++}`;
        out.push(
          <div key={key} className="[&:not(:first-child)]:mt-2">
            <InlineImage token={p.token} />
          </div>,
        );
        continue;
      }
      if (cat === 'overlay') {
        segOverlays.push(p.token);
        continue;
      }
      // Float
      segImgs.push(p.token);
      continue;
    }
    if (p.kind === 'img-with-text') {
      const cat = modeCategory(p.token.mode);
      if (cat === 'block' || cat === 'inline') {
        flushSegment();
        const key = `seg-${segKey++}`;
        out.push(
          <div key={key} className="[&:not(:first-child)]:mt-2">
            <InlineImage token={p.token} />
            <p className="text-base cq-sm:text-lg text-muted-foreground leading-relaxed whitespace-pre-wrap mb-4">
              {renderParagraphText(p.rest)}
            </p>
          </div>,
        );
        continue;
      }
      if (cat === 'overlay') {
        segOverlays.push(p.token);
        segChildren.push({ kind: 'para', text: p.rest });
        continue;
      }
      // Float: put image + trailing text into the current segment so any
      // further paragraphs in the same segment also wrap.
      segImgs.push(p.token);
      segChildren.push({ kind: 'para', text: p.rest });
      continue;
    }
    // Clear points below — flush the current segment first.
    flushSegment();
    const key = `seg-${segKey++}`;
    if (p.kind === 'clear') {
      out.push(<div key={key} className="clear-both my-2" />);
    } else if (p.kind === 'h2') {
      out.push(
        <h3
          key={key}
          className="clear-both normal-case text-xl cq-sm:text-2xl font-semibold text-foreground mt-8 mb-3 first:mt-0"
        >
          {p.text}
        </h3>,
      );
    } else if (p.kind === 'h3') {
      out.push(
        <h4
          key={key}
          className="clear-both normal-case text-base cq-sm:text-lg font-semibold text-foreground mt-5 mb-2"
        >
          {p.text}
        </h4>,
      );
    }
  }
  flushSegment();

  return <>{out}</>;
}

function Render({ config, onConfigChange }: BlockRenderProps<Config>) {
  const editable = !!onConfigChange;
  if (!editable && !config.body && !config.imageUrl && !config.title) return null;
  // Legacy single-image fallback: only render the top-of-block image when
  // the body has no inline image tokens of its own. Prevents duplicate
  // photos when a tenant migrates their content into the new syntax.
  const bodyHasInlineImages = /!\[(inline|square-left|square-right|tight-left|tight-right|through-left|through-right|top-bottom|behind|front|left|center|right)\]\(/.test(config.body);
  const legacyImg = !bodyHasInlineImages && config.imageUrl ? (
    <img
      src={config.imageUrl}
      alt=""
      className={`w-full cq-sm:w-[18rem] cq-md:w-[22rem] h-auto max-h-[28rem] object-cover rounded-2xl shadow-lg mb-6 cq-sm:mb-2 ${
        config.imageSide === 'left' ? 'cq-sm:float-left cq-sm:mr-8' : 'cq-sm:float-right cq-sm:ml-8'
      }`}
    />
  ) : null;
  return (
    <section id="about" className="max-w-6xl mx-auto px-4 cq-sm:px-6 py-5">
      {(config.title || editable) && (
        <h2 className="normal-case text-2xl cq-sm:text-3xl font-bold mb-6 flex items-center gap-2">
          <Info className="w-6 h-6 shrink-0" style={{ color: 'var(--site-accent)' }} />
          <EditableText
            as="span"
            editable={editable}
            value={config.title}
            onChange={(v) => onConfigChange?.({ title: v } as Partial<Config>)}
            placeholder="About us"
            ariaLabel="About title"
          />
        </h2>
      )}
      {legacyImg}
      <BodyContent body={config.body} />
      <div className="clear-both" />
    </section>
  );
}

function EditorForm({ config, onChange, theme }: BlockEditorFormProps<Config>) {
  const set = (patch: Partial<Config>) => onChange({ ...config, ...patch });
  const bodyRef = useRef<HTMLTextAreaElement | null>(null);
  // Currently-selected wrap mode for the "Insert picture" button. Persisted
  // only in memory — most tenants pick a favorite mode and reuse it, so
  // remembering it across inserts saves clicks.
  const [wrapMode, setWrapMode] = useState<WrapMode>('square-right');
  // Non-null while the media picker is open. Holds the mode chosen at
  // click-time so an in-flight `setWrapMode` doesn't race the picker.
  const [pickerMode, setPickerMode] = useState<WrapMode | null>(null);

  // Insert a chunk at the textarea cursor position, padding with blank
  // lines so the inserted token stands alone as its own block (required
  // for the BodyContent parser to recognize headings / images). Falls
  // back to appending when the textarea ref isn't ready yet.
  const insertBlock = (text: string) => {
    const el = bodyRef.current;
    const current = config.body;
    if (!el) {
      const sep = current.endsWith('\n\n') || current === '' ? '' : (current.endsWith('\n') ? '\n' : '\n\n');
      set({ body: current + sep + text + '\n' });
      return;
    }
    const start = el.selectionStart ?? current.length;
    const end = el.selectionEnd ?? current.length;
    const before = current.slice(0, start);
    const after = current.slice(end);
    const leading = before.length === 0 || before.endsWith('\n\n')
      ? ''
      : before.endsWith('\n') ? '\n' : '\n\n';
    const trailing = after.length === 0 || after.startsWith('\n\n')
      ? ''
      : after.startsWith('\n') ? '\n' : '\n\n';
    const chunk = leading + text + trailing;
    const next = before + chunk + after;
    set({ body: next });
    requestAnimationFrame(() => {
      const t = bodyRef.current;
      if (!t) return;
      const pos = start + chunk.length;
      t.focus();
      t.setSelectionRange(pos, pos);
    });
  };

  // For `inline` mode we drop the token at the cursor WITHOUT wrapping it
  // in blank lines — that way it renders mid-paragraph. Every other mode
  // needs its own block (blank line above/below) so the BodyContent parser
  // recognizes it as a standalone image block.
  const insertAtCursor = (text: string) => {
    const el = bodyRef.current;
    const current = config.body;
    if (!el) {
      set({ body: current + text });
      return;
    }
    const start = el.selectionStart ?? current.length;
    const end = el.selectionEnd ?? current.length;
    const next = current.slice(0, start) + text + current.slice(end);
    set({ body: next });
    requestAnimationFrame(() => {
      const t = bodyRef.current;
      if (!t) return;
      const pos = start + text.length;
      t.focus();
      t.setSelectionRange(pos, pos);
    });
  };

  const onPickImage = (item: MediaItem) => {
    if (!pickerMode) return;
    const token = `![${pickerMode}](${item.file_url})`;
    if (pickerMode === 'inline') {
      insertAtCursor(token);
    } else {
      insertBlock(token);
    }
    setPickerMode(null);
  };

  const WRAP_LABEL: Record<WrapMode, string> = {
    inline: 'In Line with Text',
    'square-left': 'Square (left)',
    'square-right': 'Square (right)',
    'tight-left': 'Tight (left)',
    'tight-right': 'Tight (right)',
    'through-left': 'Through (left)',
    'through-right': 'Through (right)',
    'top-bottom': 'Top and Bottom',
    behind: 'Behind Text',
    front: 'In Front of Text',
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Title</Label>
        <Input value={config.title} onChange={(e) => set({ title: e.target.value })} placeholder="About us" />
      </div>

      <div className="space-y-1.5">
        <Label>Body</Label>
        {/* Insert toolbar — writes syntax tokens at the cursor so tenants
            don't need to remember `## ` or `![left](…)`. Image buttons open
            the media library filtered to images; the chosen file's URL is
            written into the token so it renders inline. */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-slate-500 mr-1">Insert:</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 gap-1 px-2"
            onClick={() => insertBlock('## Section heading')}
            title="Insert a section heading"
          >
            <Heading2 className="w-3.5 h-3.5" /> Heading
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 gap-1 px-2"
            onClick={() => insertBlock('### Sub-heading')}
            title="Insert a sub-heading"
          >
            <Heading3 className="w-3.5 h-3.5" /> Sub-heading
          </Button>
          <span className="w-px h-5 bg-slate-200 mx-1" aria-hidden />
          <span className="text-slate-500">Wrap:</span>
          <Select value={wrapMode} onValueChange={(v) => setWrapMode(v as WrapMode)}>
            <SelectTrigger className="h-7 w-44 text-xs" aria-label="Picture wrap mode">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WRAP_MODES.map((m) => (
                <SelectItem key={m} value={m} className="text-xs">
                  {WRAP_LABEL[m]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            size="sm"
            className="h-7 gap-1 px-2"
            onClick={() => setPickerMode(wrapMode)}
            title="Insert a picture using the selected wrap style"
          >
            <ImageIcon className="w-3.5 h-3.5" /> Insert picture
          </Button>
        </div>
        <Textarea
          ref={bodyRef}
          value={config.body}
          onChange={(e) => set({ body: e.target.value })}
          placeholder={
            'Your story, mission, or director\'s message.\n\nUse the Insert buttons above to add headings and pictures anywhere in the text.\n\n## Section heading\n### Sub-heading\n\n![square-left](https://example.com/photo.jpg)\nText after a left-float picture wraps around it.\n\n![top-bottom](https://example.com/photo.jpg)\nTop-and-Bottom pictures sit on their own line with no side wrap.'
          }
          rows={12}
          className="font-mono text-sm"
        />
        <div className="text-sm text-slate-500 space-y-1">
          <p>
            Blank lines separate paragraphs. Headings use <code>## </code> / <code>### </code>.
            Bullet lists use <code>* </code> or <code>- </code>; numbered lists use <code>1. </code>.
            Use <code>---</code> on its own line to clear a wrap.
          </p>
          <p>Picture wrap styles (Word-inspired):</p>
          <ul className="list-disc pl-5 space-y-0.5">
            <li><strong>In Line with Text</strong> — picture flows with the paragraph like a large letter.</li>
            <li><strong>Square</strong> — text wraps around the picture's rectangular boundary.</li>
            <li><strong>Tight</strong> — text hugs the picture's visible shape (best with PNG/transparent images).</li>
            <li><strong>Through</strong> — like Tight but with no margin, so text runs right up to the contour.</li>
            <li><strong>Top and Bottom</strong> — picture sits on its own line, text only above and below.</li>
            <li><strong>Behind Text</strong> — picture fills the paragraph area as a faded background.</li>
            <li><strong>In Front of Text</strong> — picture overlays the paragraph on top of the text.</li>
          </ul>
          <p>For a typical photo in a paragraph, <strong>Square</strong> or <strong>Tight</strong> usually works best.</p>
        </div>
      </div>

      <div className="space-y-1.5 border-t border-slate-200 pt-4">
        <Label className="text-xs text-slate-500">Legacy top photo (optional)</Label>
        <p className="text-xs text-slate-500 -mt-1">
          Only shown when the body has no inline pictures. New content should insert pictures inline instead.
        </p>
        <ImageUploadField
          label=""
          prefix="about"
          thumbClass="w-24 h-24"
          value={config.imageUrl}
          onChange={(url) => set({ imageUrl: url })}
          buttonColor={theme?.primaryColor}
        />
      </div>

      <MediaPicker
        open={pickerMode !== null}
        onOpenChange={(v) => { if (!v) setPickerMode(null); }}
        accept="image"
        onPick={onPickImage}
      />
    </div>
  );
}

export const aboutBlock: BlockModule<typeof schema> = {
  type: 'about',
  name: 'About',
  description: 'Tell your story — mission, history, or a director\'s message — with pictures and headings anywhere in the text.',
  icon: Info,
  tier: 'free',
  group: 'core',
  poweredBy: 'Public Relations',
  configSchema: schema,
  defaultConfig: { title: 'About us', body: '', imageUrl: '', imageSide: 'right' },
  EditorForm,
  Render,
};
