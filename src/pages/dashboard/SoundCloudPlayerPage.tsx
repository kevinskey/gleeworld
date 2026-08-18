// SoundCloud — the Command Center listening surface.
//
// Plays the tenant's SoundCloud profile through SoundCloud's own widget,
// organized by the playlists ("sets") that already exist on the account.
// Nothing is downloaded or copied: the widget streams full tracks straight
// from SoundCloud, so new uploads appear here with no sync job to maintain.
//
// Why embeds rather than our own <audio>: app-token stream URLs resolve to
// cf-preview-media 30-second previews, and there is no unauthenticated file
// URL to link (401/429). The widget is the only route to full audio that
// does not require every listener to connect a SoundCloud account.
//
// The profile comes from branding (gw_branding_settings.soundcloud_url),
// the same way youtube_channel_handle does — no account is baked into
// shared code. Distinct from /soundcloud, the 2025 OAuth search page.

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { useBrandingSettings } from '@/hooks/useBrandingSettings';
import { Music, ListMusic, ExternalLink, Loader2, Settings } from 'lucide-react';

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

const SOFT_CARD = 'border-0 rounded-2xl bg-card';
const SOFT_CARD_STYLE: React.CSSProperties = {
  boxShadow: '0 3px 6px rgba(15,23,42,0.08), 0 10px 20px -6px rgba(15,23,42,0.18)',
};

/** SoundCloud's embeddable player for any track, set, or profile URL. */
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

export default function SoundCloudPlayerPage() {
  const { settings, isLoading: brandingLoading } = useBrandingSettings();
  const profileUrl = settings.soundcloud_url?.trim() || '';
  // null = the whole profile ("All tracks"); otherwise the selected set.
  const [selected, setSelected] = useState<Playlist | null>(null);

  const { data, isLoading, error } = useQuery<ProfileResponse>({
    queryKey: ['soundcloud-profile', profileUrl],
    enabled: !!profileUrl,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('soundcloud-playlists', {
        body: { profileUrl },
      });
      if (error) throw error;
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
      return data as ProfileResponse;
    },
  });

  const playlists = useMemo(
    () => [...(data?.playlists ?? [])].sort((a, b) => b.trackCount - a.trackCount),
    [data],
  );
  const nowPlayingUrl = selected?.permalinkUrl || data?.user.permalinkUrl || profileUrl;

  const body = () => {
    if (brandingLoading) return null;

    if (!profileUrl) {
      return (
        <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
          <CardContent className="py-10 text-center">
            <Music className="w-8 h-8 mx-auto mb-3 opacity-50" />
            <p className="font-medium mb-1">No SoundCloud profile set</p>
            <p className="text-sm text-muted-foreground mb-4">
              Add your profile URL in Workspace Settings and your tracks and playlists show up here.
            </p>
            <Button variant="outline" size="sm" asChild>
              <a href="/dashboard/workspace">
                <Settings className="w-4 h-4 mr-1.5" /> Open Workspace Settings
              </a>
            </Button>
          </CardContent>
        </Card>
      );
    }

    if (isLoading) {
      return (
        <div className="flex items-center gap-2 text-muted-foreground py-10 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading playlists…
        </div>
      );
    }

    if (error) {
      return (
        <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
          <CardContent className="py-10 text-center">
            <p className="font-medium mb-1">Couldn't reach SoundCloud</p>
            <p className="text-sm text-muted-foreground">
              {(error as Error).message}. The player below may still work.
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <>
        {/* One widget, re-pointed as the selection changes: 30 mounted
            iframes would each open their own player and their own network
            connection. */}
        <Card className={`${SOFT_CARD} mb-5 overflow-hidden`} style={SOFT_CARD_STYLE}>
          <CardContent className="p-0">
            <iframe
              key={nowPlayingUrl}
              title={selected ? `SoundCloud — ${selected.title}` : 'SoundCloud — all tracks'}
              src={widgetSrc(nowPlayingUrl)}
              width="100%"
              height={selected ? 450 : 450}
              frameBorder="0"
              allow="autoplay"
              scrolling="no"
              className="block w-full"
            />
          </CardContent>
        </Card>

        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="text-sm font-semibold text-muted-foreground">
            {playlists.length} playlist{playlists.length === 1 ? '' : 's'}
          </h2>
          {data?.user.permalinkUrl && (
            <Button variant="ghost" size="sm" asChild>
              <a href={data.user.permalinkUrl} target="_blank" rel="noreferrer">
                Open on SoundCloud <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
              </a>
            </Button>
          )}
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <PlaylistRow
            label="All tracks"
            count={data?.user.trackCount ?? 0}
            active={selected === null}
            onClick={() => setSelected(null)}
          />
          {playlists.map((p) => (
            <PlaylistRow
              key={p.id}
              label={p.title}
              count={p.trackCount}
              active={selected?.id === p.id}
              onClick={() => setSelected(p)}
            />
          ))}
        </div>
      </>
    );
  };

  return (
    <UniversalLayout showHeader={false} showFooter={false}>
      <DashboardShell>
        <DashboardPageShell
          title="SoundCloud"
          subtitle={
            data?.user.username
              ? `${data.user.username} — ${data.user.trackCount} tracks, streamed from SoundCloud.`
              : 'Your SoundCloud tracks and playlists.'
          }
        >
          {body()}
        </DashboardPageShell>
      </DashboardShell>
    </UniversalLayout>
  );
}

function PlaylistRow({
  label, count, active, onClick,
}: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <Card
      className={`${SOFT_CARD} cursor-pointer transition-colors ${active ? 'ring-2 ring-primary' : ''}`}
      style={SOFT_CARD_STYLE}
      onClick={onClick}
    >
      <CardContent className="py-3 px-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <ListMusic className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-medium truncate">{label}</div>
          <div className="text-xs text-muted-foreground">
            {count} track{count === 1 ? '' : 's'}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
