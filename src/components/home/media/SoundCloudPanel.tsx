// SoundCloudPanel — the Command Center media-zone sibling of
// /dashboard/soundcloud-player (SoundCloudPlayerPage).
//
// Same data contract as the full page, deliberately byte-for-byte: the
// tenant's profile comes from branding (gw_branding_settings.soundcloud_url)
// and the playlist catalog from the 'soundcloud-playlists' edge function.
// Playback is SoundCloud's own widget iframe — see the full page's header
// comment for why embeds beat our own <audio> (app-token stream URLs resolve
// to 30-second previews; the widget is the only route to full audio without
// every listener connecting a SoundCloud account).
//
// Compact by design: one header row with a playlist <select>, then the
// widget filling whatever height the parent grid row grants. No search, no
// sharing admin, no track list — that all lives on the full page; this panel
// is "put a set on and keep working".

import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBrandingSettings } from '@/hooks/useBrandingSettings';
import { attachSoundCloudVolume } from '@/lib/soundcloud/widgetVolume';
import { Music, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// —— Shapes copied verbatim from SoundCloudPlayerPage: this panel calls the
// same edge function with the same body, so drift here would be a lie about
// the wire format, not a customization.
interface Playlist {
  id: number;
  title: string;
  trackCount: number;
  permalinkUrl: string;
}

interface ProfileResponse {
  user: { id: number; username: string; permalinkUrl: string; trackCount: number };
  playlists: Playlist[];
}

/** Sentinel <select> value for "point the widget at the whole profile".
 *  Playlist ids are numeric, so a non-numeric string can never collide. */
const ALL_TRACKS = 'all';

/** SoundCloud's embeddable player URL — identical params to the full page.
 *  visual:false keeps the widget in list mode so many tracks are visible
 *  instead of one giant artwork pane, which matters at panel heights. */
function widgetSrc(resourceUrl: string): string {
  const params = new URLSearchParams({
    url: resourceUrl,
    auto_play: 'false',
    hide_related: 'true',
    show_comments: 'false',
    show_user: 'true',
    show_reposts: 'false',
    visual: 'false',
  });
  return `https://w.soundcloud.com/player/?${params.toString()}`;
}

export function SoundCloudPanel() {
  const { settings, isLoading: brandingLoading } = useBrandingSettings();
  const profileUrl = settings.soundcloud_url?.trim() || '';

  // What the <select> chose. null = nothing chosen yet, in which case we
  // default to the first playlist once the catalog arrives (per spec) rather
  // than the whole profile — a curated set is a better first impression than
  // a 500-track reverse-chron dump.
  const [choice, setChoice] = useState<string | null>(null);

  const { data, isLoading, error, refetch, isRefetching } = useQuery<ProfileResponse>({
    queryKey: ['sc-panel', profileUrl],
    enabled: !!profileUrl,
    staleTime: 15 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('soundcloud-playlists', {
        body: { profileUrl },
      });
      if (error) throw error;
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
      return data as ProfileResponse;
    },
  });

  // Biggest sets first, mirroring the full page's ordering, so the default
  // selection (first entry) is the account's meatiest playlist.
  const playlists = [...(data?.playlists ?? [])].sort((a, b) => b.trackCount - a.trackCount);

  const effectiveChoice =
    choice ?? (playlists.length > 0 ? String(playlists[0]?.id) : ALL_TRACKS);
  const selectedPlaylist = playlists.find((p) => String(p.id) === effectiveChoice);
  const nowPlayingUrl =
    selectedPlaylist?.permalinkUrl || data?.user.permalinkUrl || profileUrl;

  // Bind each freshly-keyed iframe to the app-wide SoundCloud volume level —
  // same idiom as the full page. attachSoundCloudVolume returns its own
  // cleanup, and the effect re-runs when the key (URL) remounts the frame.
  const frameRef = useRef<HTMLIFrameElement>(null);
  useEffect(() => attachSoundCloudVolume(frameRef.current), [nowPlayingUrl]);

  return (
    <div className="h-full w-full min-h-0 flex flex-col bg-card border border-border rounded-xl overflow-hidden">
      {/* Header: identity + the playlist picker. shrink-0 so the widget body
          below is the only thing that flexes. */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border shrink-0">
        <Music className="w-4 h-4 text-orange-500 shrink-0" aria-hidden />
        <span className="text-sm font-semibold">SoundCloud</span>
        {profileUrl && (
          <select
            value={effectiveChoice}
            onChange={(e) => setChoice(e.target.value)}
            aria-label="Choose a playlist"
            disabled={isLoading || !!error}
            // Native <select> on purpose: a shadcn Select popover inside a
            // fixed-height grid cell fights the overflow-hidden card, and the
            // OS picker is fine for a flat list of set titles.
            className={cn(
              'ml-auto min-w-0 max-w-[60%] truncate rounded-md border border-border bg-background',
              'px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring',
            )}
          >
            {playlists.map((p) => (
              <option key={p.id} value={String(p.id)}>
                {p.title} ({p.trackCount})
              </option>
            ))}
            <option value={ALL_TRACKS}>All tracks{data ? ` (${data.user.trackCount})` : ''}</option>
          </select>
        )}
      </div>

      {/* Body: exactly one of empty state / skeleton / error / widget. */}
      <div className="flex-1 min-h-0">
        {!brandingLoading && !profileUrl ? (
          // No profile configured — quiet, not an error: most tenants simply
          // haven't set one up yet.
          <div className="h-full flex flex-col items-center justify-center gap-2 px-6 text-center">
            <Music className="w-6 h-6 opacity-40" aria-hidden />
            <p className="text-sm text-muted-foreground">
              Add your SoundCloud profile in Site Setup → Branding
            </p>
          </div>
        ) : brandingLoading || isLoading ? (
          // Skeleton: rows shaped like the widget's track list so the swap to
          // the real iframe doesn't jump.
          <div className="h-full p-3 space-y-2 animate-pulse" aria-hidden>
            <div className="h-16 rounded-lg bg-muted" />
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-7 rounded bg-muted" />
            ))}
          </div>
        ) : error ? (
          <div className="h-full flex flex-col items-center justify-center gap-2 px-6 text-center">
            <p className="text-sm font-medium">Couldn't reach SoundCloud</p>
            <p className="text-xs text-muted-foreground">{(error as Error).message}</p>
            <button
              type="button"
              onClick={() => void refetch()}
              disabled={isRefetching}
              className="mt-1 inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors disabled:opacity-50"
            >
              {isRefetching && <Loader2 className="w-3 h-3 animate-spin" aria-hidden />}
              Retry
            </button>
          </div>
        ) : (
          // One widget, re-pointed as the selection changes — the key forces
          // a full remount because the widget doesn't reload on src swaps
          // reliably, and a fresh frame also re-runs the volume binding.
          <iframe
            ref={frameRef}
            key={nowPlayingUrl}
            title={selectedPlaylist ? `SoundCloud — ${selectedPlaylist.title}` : 'SoundCloud — all tracks'}
            src={widgetSrc(nowPlayingUrl)}
            frameBorder="0"
            allow="autoplay"
            className="block h-full w-full"
          />
        )}
      </div>
    </div>
  );
}
