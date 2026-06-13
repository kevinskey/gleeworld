import { z } from 'zod';
import { Info } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImageUploadField } from '../ImageUploadField';
import type { BlockModule, BlockEditorFormProps, BlockRenderProps } from '../types';

const schema = z.object({
  title: z.string().default('About us'),
  body: z.string().default(''),
  imageUrl: z.string().default(''),
  imageSide: z.enum(['left', 'right']).default('right'),
});
type Config = z.infer<typeof schema>;

// Render the body as a sequence of paragraphs split on blank lines, with
// lightweight markdown support: lines starting with `## ` become an H3 inside
// the body, lines starting with `### ` become an H4. This gives clients
// enough hierarchy for a real About page without us shipping a full editor.
function BodyContent({ body }: { body: string }) {
  const blocks = body.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  return (
    <>
      {blocks.map((block, i) => {
        if (block.startsWith('## ')) {
          return (
            <h3 key={i} className="normal-case text-xl sm:text-2xl font-semibold text-foreground mt-8 mb-3 first:mt-0">
              {block.slice(3).trim()}
            </h3>
          );
        }
        if (block.startsWith('### ')) {
          return (
            <h4 key={i} className="normal-case text-base sm:text-lg font-semibold text-foreground mt-5 mb-2">
              {block.slice(4).trim()}
            </h4>
          );
        }
        return (
          <p key={i} className="text-base sm:text-lg text-muted-foreground leading-relaxed whitespace-pre-wrap mb-4 last:mb-0">
            {block}
          </p>
        );
      })}
    </>
  );
}

function Render({ config }: BlockRenderProps<Config>) {
  if (!config.body && !config.imageUrl) return null;
  // Float the image so the body text wraps around it. On mobile the float
  // collapses (full width above the text) so wrapping doesn't squeeze copy.
  const img = config.imageUrl ? (
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
      {config.title && (
        <h2 className="normal-case text-2xl sm:text-3xl font-bold mb-6 flex items-center gap-2">
          <Info className="w-6 h-6" style={{ color: 'var(--site-accent)' }} />
          {config.title}
        </h2>
      )}
      {/* Floated image gets pulled out of flow; the clearfix below makes the
          section grow to contain it when text is shorter than the image. */}
      {img}
      <BodyContent body={config.body} />
      <div className="clear-both" />
    </section>
  );
}

function EditorForm({ config, onChange, theme }: BlockEditorFormProps<Config>) {
  const set = (patch: Partial<Config>) => onChange({ ...config, ...patch });
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Title</Label>
        <Input value={config.title} onChange={(e) => set({ title: e.target.value })} placeholder="About us" />
      </div>
      <div className="space-y-1.5">
        <Label>Body</Label>
        <Textarea
          value={config.body}
          onChange={(e) => set({ body: e.target.value })}
          placeholder={"Your story, mission, or director's message.\n\nLeave a blank line between paragraphs.\n\n## Section heading\nStart a line with ## for a heading, ### for a sub-heading."}
          rows={10}
          className="font-mono text-sm"
        />
        <p className="text-[11px] text-slate-500">
          Tip: blank lines separate paragraphs. Start a line with <code>## </code> for a section heading or <code>### </code> for a sub-heading.
        </p>
      </div>
      <ImageUploadField
        label="Photo (optional)"
        prefix="about"
        thumbClass="w-24 h-24"
        value={config.imageUrl}
        onChange={(url) => set({ imageUrl: url })}
        buttonColor={theme?.primaryColor}
      />
      <div className="space-y-1.5">
        <Label>Photo side</Label>
        <Select value={config.imageSide} onValueChange={(v) => set({ imageSide: v as Config['imageSide'] })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="left">Left of text</SelectItem>
            <SelectItem value="right">Right of text</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export const aboutBlock: BlockModule<typeof schema> = {
  type: 'about',
  name: 'About',
  description: 'Tell your story — mission, history, or a director\'s message — with an optional photo.',
  icon: Info,
  tier: 'free',
  group: 'core',
  poweredBy: 'Public Relations',
  configSchema: schema,
  defaultConfig: { title: 'About us', body: '', imageUrl: '', imageSide: 'right' },
  EditorForm,
  Render,
};
