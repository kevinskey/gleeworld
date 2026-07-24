import { useRef, useState } from 'react';
import { z } from 'zod';
import { Info, Heading2, Heading3, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
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

// Inline image token: `![left|center|right](url "optional caption")`
// - left/right → CSS float so surrounding paragraph text wraps
// - center     → block image, centered, clears floats above
// The caption is optional. Whitespace around the URL is tolerated.
const IMG_TOKEN_RE = /^!\[(left|center|right)\]\(\s*(\S+?)\s*(?:\s+"([^"]*)")?\)\s*$/;

type ImgToken = { side: 'left' | 'center' | 'right'; url: string; caption?: string };

function parseImgToken(line: string): ImgToken | null {
  const m = line.match(IMG_TOKEN_RE);
  if (!m) return null;
  return { side: m[1] as ImgToken['side'], url: m[2], caption: m[3] || undefined };
}

function InlineImage({ token }: { token: ImgToken }) {
  const isCenter = token.side === 'center';
  const floatClass = token.side === 'left'
    ? 'sm:float-left sm:mr-6 sm:mb-3'
    : token.side === 'right'
      ? 'sm:float-right sm:ml-6 sm:mb-3'
      : 'mx-auto block clear-both';
  const wrapClass = `${floatClass} mb-4 sm:mb-3 max-w-full ${
    isCenter ? 'sm:max-w-[42rem]' : 'sm:w-[20rem] md:w-[24rem]'
  }`;
  return (
    <figure className={wrapClass}>
      <img
        src={token.url}
        alt={token.caption ?? ''}
        className="w-full h-auto rounded-2xl shadow-lg"
        loading="lazy"
      />
      {token.caption && (
        <figcaption className="text-xs sm:text-sm text-muted-foreground italic mt-1.5 text-center">
          {token.caption}
        </figcaption>
      )}
    </figure>
  );
}

// Render the body as a sequence of blocks split on blank lines. Each block
// can be a heading (`## `, `### `), a lone image token, an image token
// followed by paragraph text (image floats, text wraps), a horizontal
// rule / clear (`---`), or a plain paragraph. Headings and centered images
// auto-clear so they never end up wrapping around a previously-floated
// image.
function BodyContent({ body }: { body: string }) {
  const blocks = body.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  return (
    <>
      {blocks.map((block, i) => {
        if (block === '---') {
          return <div key={i} className="clear-both my-2" />;
        }
        if (block.startsWith('## ')) {
          return (
            <h3
              key={i}
              className="clear-both normal-case text-xl sm:text-2xl font-semibold text-foreground mt-8 mb-3 first:mt-0"
            >
              {block.slice(3).trim()}
            </h3>
          );
        }
        if (block.startsWith('### ')) {
          return (
            <h4
              key={i}
              className="clear-both normal-case text-base sm:text-lg font-semibold text-foreground mt-5 mb-2"
            >
              {block.slice(4).trim()}
            </h4>
          );
        }
        // Image-first block: first line is a token, rest becomes a
        // paragraph that will wrap around the floated image.
        const lines = block.split(/\n/);
        const firstImg = parseImgToken(lines[0]);
        if (firstImg) {
          const rest = lines.slice(1).join('\n').trim();
          return (
            <div key={i} className="[&:not(:first-child)]:mt-2">
              <InlineImage token={firstImg} />
              {rest && (
                <p className="text-base sm:text-lg text-muted-foreground leading-relaxed whitespace-pre-wrap mb-4">
                  {rest}
                </p>
              )}
            </div>
          );
        }
        return (
          <p
            key={i}
            className="text-base sm:text-lg text-muted-foreground leading-relaxed whitespace-pre-wrap mb-4 last:mb-0"
          >
            {block}
          </p>
        );
      })}
    </>
  );
}

function Render({ config, onConfigChange }: BlockRenderProps<Config>) {
  const editable = !!onConfigChange;
  if (!editable && !config.body && !config.imageUrl && !config.title) return null;
  // Legacy single-image fallback: only render the top-of-block image when
  // the body has no inline image tokens of its own. Prevents duplicate
  // photos when a tenant migrates their content into the new syntax.
  const bodyHasInlineImages = /!\[(left|center|right)\]\(/.test(config.body);
  const legacyImg = !bodyHasInlineImages && config.imageUrl ? (
    <img
      src={config.imageUrl}
      alt=""
      className={`w-full sm:w-[18rem] md:w-[22rem] h-auto max-h-[28rem] object-cover rounded-2xl shadow-lg mb-6 sm:mb-2 ${
        config.imageSide === 'left' ? 'sm:float-left sm:mr-8' : 'sm:float-right sm:ml-8'
      }`}
    />
  ) : null;
  return (
    <section id="about" className="max-w-6xl mx-auto px-4 sm:px-6 py-5">
      {(config.title || editable) && (
        <h2 className="normal-case text-2xl sm:text-3xl font-bold mb-6 flex items-center gap-2">
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
  // Picker state doubles as the "pending side" for the next inserted image.
  // Null = closed. When set to a side, the picker opens; on pick we
  // insert `![side](url)` at the current cursor position in the body.
  const [imgPickerSide, setImgPickerSide] = useState<ImgToken['side'] | null>(null);

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

  const onPickImage = (item: MediaItem) => {
    if (!imgPickerSide) return;
    insertBlock(`![${imgPickerSide}](${item.file_url})`);
    setImgPickerSide(null);
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
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 gap-1 px-2"
            onClick={() => setImgPickerSide('left')}
            title="Insert a picture that floats left with text wrapping to the right"
          >
            <AlignLeft className="w-3.5 h-3.5" /> Pic left
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 gap-1 px-2"
            onClick={() => setImgPickerSide('center')}
            title="Insert a centered picture on its own line"
          >
            <AlignCenter className="w-3.5 h-3.5" /> Pic center
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 gap-1 px-2"
            onClick={() => setImgPickerSide('right')}
            title="Insert a picture that floats right with text wrapping to the left"
          >
            <AlignRight className="w-3.5 h-3.5" /> Pic right
          </Button>
        </div>
        <Textarea
          ref={bodyRef}
          value={config.body}
          onChange={(e) => set({ body: e.target.value })}
          placeholder={
            'Your story, mission, or director\'s message.\n\nUse the Insert buttons above to add headings and pictures anywhere in the text.\n\n## Section heading\n### Sub-heading\n\n![left](https://example.com/photo.jpg)\nText after a left-float image wraps to its right.\n\n![center](https://example.com/photo.jpg)\nCentered images break to their own line.'
          }
          rows={12}
          className="font-mono text-sm"
        />
        <p className="text-sm text-slate-500">
          Blank lines separate paragraphs. Headings use <code>## </code> / <code>### </code>.
          Pictures use <code>![left](url)</code>, <code>![center](url)</code>, or <code>![right](url)</code>
          {' '}— text wraps around left/right images automatically. Use <code>---</code> on its own line to clear a wrap.
        </p>
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
        open={imgPickerSide !== null}
        onOpenChange={(v) => { if (!v) setImgPickerSide(null); }}
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
