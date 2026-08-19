import { useEffect, useMemo, useRef, useState } from 'react';
import { z } from 'zod';
import { Music2, Plus, Trash2, Search, Loader2, ListMusic, AudioLines } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useBrandingSettings } from '@/hooks/useBrandingSettings';
import { attachSoundCloudVolume } from '@/lib/soundcloud/widgetVolume';
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

const itemSchema = z.object({
  url: z.string().default(''),
  title: z.string().default(''),
  kind: z.enum(['playlist', 'track']).default('playlist'),
});

const schema = z.object({
  heading: z.string().default('Listen on SoundCloud'),
  /** Curated playlists/tracks. Empty = play the whole profile. */
  items: z.array(itemSchema).default([]),
  /**
   * Superseded by `items`. Kept so rows written before the picker existed
   * keep working: a lone playlistUrl is read as a single item.
   */
  playlistUrl: z.string().default(''),
  /** SoundCloud's tall artwork-forward player vs. the compact bar. */
  visual: z.boolean().default(false),
});
type Config = z.infer<typeof schema>;
type Item = z.infer<typeof itemSchema>;

interface CatalogItem { id: number; title: string; permalinkUrl: string }
interface CatalogResponse {
  user: { username: string; permalinkUrl: string; trackCount: number };
  playlists: Array<CatalogItem & { trackCount: number }>;
  tracks: Array<CatalogItem & { durationMs: number }>;
}

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

/** Curated items, falling back to the pre-picker single-URL config. */
function itemsOf(config: Config): Item[] {
  if (config.items.length) return config.items.filter((i) => i.url.trim());
  const legacy = config.playlistUrl.trim();
  return legacy ? [{ url: legacy, title: '', kind: 'playlist' }] : [];
}

function Render({ config, ctx, onConfigChange }: BlockRenderProps<Config>) {
  const items = itemsOf(config);
  const profile = ctx.soundcloudUrl?.trim() || '';
  const [active, setActive] = useState(0);

  const current = items[Math.min(active, Math.max(0, items.length - 1))];
  const source = current?.url || profile;

  // Turn the widget down to the app-wide level. Hooks run before the early
  // return below so the hook order stays stable when a block goes from
  // "nothing curated" to having a source.
  const frameRef = useRef<HTMLIFrameElement>(null);
  useEffect(() => attachSoundCloudVolume(frameRef.current), [source, config.visual]);

  // Nothing curated and no profile set: in the editor say so, on the public
  // site render nothing at all — the same contract music-player keeps with
  // no tracks, and what makes this block safe on every tenant.
  if (!items.length && !profile) {
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

      {/* Tabs only earn their space once there is a choice to make. */}
      {items.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {items.map((it, i) => {
            const on = i === active;
            return (
              <button
                key={`${it.url}-${i}`}
                type="button"
                onClick={() => setActive(i)}
                className="rounded-full px-3 py-1.5 text-sm border transition-colors"
                style={on
                  ? { background: 'var(--site-accent)', color: '#fff', borderColor: 'var(--site-accent)' }
                  : { borderColor: 'var(--site-accent)', color: 'var(--site-accent)' }}
              >
                {it.title || (it.kind === 'track' ? 'Track' : 'Playlist')}
              </button>
            );
          })}
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-4">
        {/* Keyed on the source so switching tabs remounts the widget rather
            than leaving the previous track playing underneath. */}
        <iframe
          ref={frameRef}
          key={`${source}:${config.visual}`}
          title={current?.title || config.heading || 'SoundCloud'}
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
  const [pickerOpen, setPickerOpen] = useState(false);
  const items = config.items.length ? config.items : itemsOf(config);

  const add = (item: Item) => {
    if (items.some((i) => i.url === item.url)) return;
    set({ items: [...items, item], playlistUrl: '' });
  };
  const remove = (i: number) => set({ items: items.filter((_, j) => j !== i), playlistUrl: '' });

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

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Playlists & tracks</Label>
          <Button type="button" variant="outline" size="sm" onClick={() => setPickerOpen(true)}>
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Add from SoundCloud
          </Button>
        </div>

        {items.length === 0 ? (
          <p className="text-xs text-slate-500">
            Nothing picked — the block plays your whole SoundCloud profile. Add playlists or
            tracks to choose exactly what visitors see.
          </p>
        ) : (
          <>
            {items.map((it, i) => (
              <div key={`${it.url}-${i}`} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/50 p-2">
                {it.kind === 'track'
                  ? <AudioLines className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  : <ListMusic className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                <span className="text-xs flex-1 truncate">{it.title || it.url}</span>
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="text-slate-400 hover:text-rose-600 shrink-0"
                  aria-label={`Remove ${it.title || 'item'}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {items.length > 1 && (
              <p className="text-xs text-slate-500">
                Visitors get a button per item and one player that swaps between them.
              </p>
            )}
          </>
        )}
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

      <CatalogPicker open={pickerOpen} onOpenChange={setPickerOpen} onPick={add} />
    </div>
  );
}

/** Lists the tenant's SoundCloud playlists and tracks to choose from. */
function CatalogPicker({
  open, onOpenChange, onPick,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onPick: (item: Item) => void;
}) {
  // BlockEditorFormProps carries no render context, and this only ever runs
  // inside the admin editor, so the profile is read from branding directly.
  const { settings } = useBrandingSettings();
  const profileUrl = settings.soundcloud_url?.trim() || null;
  const [query, setQuery] = useState('');
  const [data, setData] = useState<CatalogResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetched on open rather than on mount: 549 tracks is not something to
  // pull every time the editor renders a block form.
  const load = async () => {
    if (data || loading || !profileUrl) return;
    setLoading(true);
    setError(null);
    try {
      const { data: res, error: err } = await supabase.functions.invoke('soundcloud-playlists', {
        body: { profileUrl, includeTracks: true },
      });
      if (err) throw err;
      if ((res as { error?: string })?.error) throw new Error((res as { error: string }).error);
      setData(res as CatalogResponse);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const q = query.trim().toLowerCase();
  const playlists = useMemo(
    () => (data?.playlists ?? []).filter((p) => !q || p.title?.toLowerCase().includes(q)),
    [data, q],
  );
  const tracks = useMemo(
    () => (data?.tracks ?? []).filter((t) => !q || t.title?.toLowerCase().includes(q)).slice(0, 200),
    [data, q],
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => { onOpenChange(v); if (v) void load(); }}
    >
      {/* min-w-0 on the body: DialogContent is a grid, and long track titles
          blow the track out on phones without it. */}
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add from SoundCloud</DialogTitle>
          <DialogDescription>
            {profileUrl
              ? 'Pick playlists or individual tracks to feature on your public site.'
              : 'Set your SoundCloud profile in Settings → Branding first.'}
          </DialogDescription>
        </DialogHeader>

        <div className="min-w-0 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search playlists and tracks"
              className="pl-9"
              disabled={!profileUrl}
            />
          </div>

          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading your SoundCloud…
            </div>
          )}
          {error && <p className="text-sm text-rose-600">{error}</p>}

          {data && (
            <div className="max-h-80 overflow-y-auto space-y-3">
              {playlists.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-slate-500 uppercase">Playlists</p>
                  {playlists.map((p) => (
                    <PickRow
                      key={p.id}
                      icon={<ListMusic className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                      title={p.title}
                      meta={`${p.trackCount} track${p.trackCount === 1 ? '' : 's'}`}
                      onClick={() => onPick({ url: p.permalinkUrl, title: p.title, kind: 'playlist' })}
                    />
                  ))}
                </div>
              )}
              {tracks.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-slate-500 uppercase">Tracks</p>
                  {tracks.map((t) => (
                    <PickRow
                      key={t.id}
                      icon={<AudioLines className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                      title={t.title}
                      meta={t.durationMs ? `${Math.round(t.durationMs / 60000)} min` : ''}
                      onClick={() => onPick({ url: t.permalinkUrl, title: t.title, kind: 'track' })}
                    />
                  ))}
                </div>
              )}
              {playlists.length === 0 && tracks.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">Nothing matches that search.</p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PickRow({
  icon, title, meta, onClick,
}: { icon: React.ReactNode; title: string; meta: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left flex items-center gap-2 rounded-lg border border-slate-200 p-2 hover:bg-slate-50 transition-colors min-w-0"
    >
      {icon}
      <span className="text-sm flex-1 truncate">{title || 'Untitled'}</span>
      {meta && <span className="text-xs text-slate-400 shrink-0">{meta}</span>}
      <Plus className="w-3.5 h-3.5 text-slate-400 shrink-0" />
    </button>
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
  defaultConfig: { heading: 'Listen on SoundCloud', items: [], playlistUrl: '', visual: false },
  EditorForm,
  Render,
};
