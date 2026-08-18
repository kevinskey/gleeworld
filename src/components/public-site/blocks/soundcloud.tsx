import { z } from 'zod';
import { Music2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { BlockModule, BlockEditorFormProps, BlockRenderProps } from '../types';
import { EmptyBlockPlaceholder } from '../EmptyBlockPlaceholder';

// Streams the tenant's SoundCloud through SoundCloud's own widget. The
// profile is NOT stored here — it comes from branding (ctx.soundcloudUrl,
// sourced from gw_branding_settings.soundcloud_url via get_public_site), so
// filling that field in once lights this block up everywhere it appears,
// and leaving it blank renders nothing rather than an empty shell.
//
// The widget is the only way to play full tracks: SoundCloud's API hands
// app tokens 30-second previews, and its file URLs are signed and expire.
// Requires https://w.soundcloud.com in the CSP frame-src.

const schema = z.object({
  heading: z.string().default('Listen on SoundCloud'),
  /** Optional single set to feature. Blank plays the whole profile. */
  playlistUrl: z.string().default(''),
  /** SoundCloud's tall artwork-forward player vs. the compact bar. */
  visual: z.boolean().default(false),
});
type Config = z.infer<typeof schema>;

function widgetSrc(resourceUrl: string, visual: boolean): string {
  const params = new URLSearchParams({
    url: resourceUrl,
    auto_play: 'false',
    hide_related: 'true',
    show_comments: 'false',
    show_user: 'true',
    show_reposts: 'false',
    visual: visual ? 'true' : 'false',
  });
  return `https://w.soundcloud.com/player/?${params.toString()}`;
}

function Render({ config, ctx, onConfigChange }: BlockRenderProps<Config>) {
  const source = config.playlistUrl.trim() || ctx.soundcloudUrl?.trim() || '';

  if (!source) {
    // In the editor, say what's missing and where to fix it. On the public
    // site, render nothing at all — same contract as music-player with no
    // tracks, which is what makes it safe to ship this block to every
    // tenant whether or not they use SoundCloud.
    return onConfigChange ? <EmptyBlockPlaceholder name="SoundCloud" /> : null;
  }

  return (
    <section id="soundcloud" className="gw-container py-5">
      {config.heading && (
        <h2 className="normal-case text-2xl cq-sm:text-3xl font-bold mb-6 flex items-center gap-2">
          <Music2 className="w-6 h-6" style={{ color: 'var(--site-accent)' }} />
          {config.heading}
        </h2>
      )}
      <div className="rounded-xl border border-border bg-card p-4">
        <iframe
          key={`${source}:${config.visual}`}
          title={config.heading || 'SoundCloud'}
          src={widgetSrc(source, config.visual)}
          width="100%"
          height={config.visual ? 450 : 400}
          frameBorder="0"
          allow="autoplay"
          scrolling="no"
          className="block w-full rounded-lg"
        />
      </div>
    </section>
  );
}

function EditorForm({ config, onChange }: BlockEditorFormProps<Config>) {
  const set = (patch: Partial<Config>) => onChange({ ...config, ...patch });

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

      <div className="space-y-1.5">
        <Label>Feature one playlist (optional)</Label>
        <Input
          value={config.playlistUrl}
          onChange={(e) => set({ playlistUrl: e.target.value })}
          placeholder="https://soundcloud.com/you/sets/spring-concert"
        />
        <p className="text-xs text-slate-500">
          Leave blank to play your whole profile. Your SoundCloud account is set once in
          Settings → Branding, so this block needs no account of its own.
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={config.visual}
          onChange={(e) => set({ visual: e.target.checked })}
          className="accent-sky-600"
        />
        Large artwork player
      </label>
    </div>
  );
}

export const soundcloudBlock: BlockModule<typeof schema> = {
  type: 'soundcloud',
  name: 'SoundCloud',
  description: 'Stream your SoundCloud tracks and playlists. Uses the account set in Branding.',
  icon: Music2,
  tier: 'free',
  group: 'core',
  poweredBy: 'SoundCloud',
  configSchema: schema,
  defaultConfig: { heading: 'Listen on SoundCloud', playlistUrl: '', visual: false },
  EditorForm,
  Render,
};
