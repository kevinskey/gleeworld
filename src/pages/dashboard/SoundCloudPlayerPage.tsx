import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Cloud, ExternalLink, ListMusic, Loader2, Music, PictureInPicture2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import {
  fetchSoundCloudMeta,
  isSoundCloudUrl,
  soundCloudKind,
  type SoundCloudMeta,
  type SoundCloudTrack,
} from '@/lib/soundcloud';
import { SoundCloudEmbed } from '@/components/soundcloud/SoundCloudEmbed';
import {
  detachSoundCloudPlayer,
  useFloatingSoundCloudTrack,
  closeSoundCloudPlayer,
} from '@/components/soundcloud/soundcloudPlayerStore';

// Per-device deck. Deliberately localStorage (not Supabase) for v1 —
// this is a personal listening surface, not shared tenant content.
const LIST_KEY = 'gw:sc-command-center:tracks';

const KIND_LABEL = { playlist: 'Playlist', artist: 'Artist', track: 'Track' } as const;

function loadTracks(): SoundCloudTrack[] {
  try {
    const raw = localStorage.getItem(LIST_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((t) => isSoundCloudUrl(t?.url)) : [];
  } catch {
    return [];
  }
}

/** oEmbed metadata (title / author / artwork) for a deck item. */
function useMeta(url: string | null): SoundCloudMeta | null {
  const [meta, setMeta] = useState<SoundCloudMeta | null>(null);
  useEffect(() => {
    let alive = true;
    setMeta(null);
    if (url) fetchSoundCloudMeta(url).then((m) => { if (alive) setMeta(m); });
    return () => { alive = false; };
  }, [url]);
  return meta;
}

function Artwork({ url, meta, className }: { url: string; meta: SoundCloudMeta | null; className?: string }) {
  const [broken, setBroken] = useState(false);
  if (meta?.thumbnailUrl && !broken) {
    return (
      <img
        src={meta.thumbnailUrl}
        alt=""
        className={cn('object-cover bg-muted', className)}
        onError={() => setBroken(true)}
      />
    );
  }
  return (
    <div className={cn('bg-muted flex items-center justify-center', className)}>
      {soundCloudKind(url) === 'track'
        ? <Music className="w-5 h-5 text-muted-foreground" />
        : <ListMusic className="w-5 h-5 text-muted-foreground" />}
    </div>
  );
}

function DeckRow({
  track, active, onSelect, onDetach, onRemove,
}: {
  track: SoundCloudTrack;
  active: boolean;
  onSelect: () => void;
  onDetach: () => void;
  onRemove: () => void;
}) {
  const meta = useMeta(track.url);
  const kind = KIND_LABEL[soundCloudKind(track.url)];
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(); } }}
      className={cn(
        'group flex items-center gap-3 p-2 pr-1 cursor-pointer border-l-2 transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active ? 'border-primary bg-muted' : 'border-transparent hover:bg-muted/60',
      )}
    >
      <Artwork url={track.url} meta={meta} className="w-12 h-12 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm truncate', active ? 'font-semibold' : 'font-medium')}>
          {track.title || meta?.title || track.url}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {kind}{meta?.authorName ? ` · ${meta.authorName}` : ''}
        </p>
      </div>
      <div className="flex items-center shrink-0">
        <Button
          variant="ghost" size="icon" className="h-9 w-9"
          title="Pop out as floating player"
          onClick={(e) => { e.stopPropagation(); onDetach(); }}
        >
          <PictureInPicture2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost" size="icon"
          className="h-9 w-9 text-muted-foreground hover:text-destructive"
          title="Remove from deck"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function SoundCloudPlayerPage() {
  const [tracks, setTracks] = useState<SoundCloudTrack[]>(loadTracks);
  const [newUrl, setNewUrl] = useState('');
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState<SoundCloudTrack | null>(() => loadTracks()[0] ?? null);
  const floating = useFloatingSoundCloudTrack();
  const selectedMeta = useMeta(selected?.url ?? null);

  useEffect(() => {
    localStorage.setItem(LIST_KEY, JSON.stringify(tracks));
  }, [tracks]);

  const addTrack = async () => {
    const url = newUrl.trim();
    if (!isSoundCloudUrl(url)) {
      toast.error('Paste a SoundCloud track, playlist, or artist link');
      return;
    }
    if (tracks.some((t) => t.url === url)) {
      toast.info('Already in your deck');
      return;
    }
    setAdding(true);
    const meta = await fetchSoundCloudMeta(url);
    setAdding(false);
    const track: SoundCloudTrack = { url, title: meta?.title ?? undefined };
    setTracks((prev) => [...prev, track]);
    setSelected(track);
    setNewUrl('');
  };

  const removeTrack = (url: string) => {
    setTracks((prev) => {
      const next = prev.filter((t) => t.url !== url);
      if (selected?.url === url) setSelected(next[0] ?? null);
      return next;
    });
  };

  const kind = selected ? soundCloudKind(selected.url) : 'track';
  const selectedTitle = selected ? (selected.title || selectedMeta?.title || selected.url) : '';
  const isFloatingSelected = !!selected && floating?.url === selected.url;

  return (
    <UniversalLayout showHeader={false} showFooter={false}>
      <DashboardShell>
        <DashboardPageShell
          title="SoundCloud Player"
          subtitle="Your listening deck — pop any item out as a floating mini player"
          icon={Cloud}
          maxWidth="6xl"
        >
          {tracks.length === 0 ? (
            <div className="bg-card shadow-card border border-border py-16 px-6 text-center">
              <Cloud className="h-14 w-14 mx-auto mb-4 text-muted-foreground/40" />
              <h3 className="font-semibold mb-1">Start your deck</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Paste any public SoundCloud track, playlist, or artist link below.
              </p>
              <div className="flex gap-2 max-w-xl mx-auto">
                <Input
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addTrack()}
                  placeholder="https://soundcloud.com/…"
                  className="flex-1"
                />
                <Button onClick={addTrack} disabled={adding}>
                  {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  <span className="ml-2">Add</span>
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] items-start">
              {/* Now-playing stage */}
              <div className="bg-card shadow-card border border-border min-w-0">
                {selected && (
                  <>
                    <div className="flex items-center gap-3 p-3 border-b border-border">
                      <Artwork url={selected.url} meta={selectedMeta} className="w-10 h-10 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate leading-tight">{selectedTitle}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {KIND_LABEL[kind]}
                          {selectedMeta?.authorName ? ` · ${selectedMeta.authorName}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isFloatingSelected ? (
                          <Button variant="outline" size="sm" onClick={closeSoundCloudPlayer}>
                            Re-dock
                          </Button>
                        ) : (
                          <Button variant="outline" size="sm" onClick={() => detachSoundCloudPlayer(selected)}>
                            <PictureInPicture2 className="h-4 w-4 sm:mr-2" />
                            <span className="hidden sm:inline">Pop out</span>
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-9 w-9" asChild>
                          <a
                            href={selected.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Open on SoundCloud"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                    </div>
                    {isFloatingSelected ? (
                      <div className="py-20 px-6 text-center">
                        <PictureInPicture2 className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                        <p className="text-sm text-muted-foreground">
                          Playing in the floating mini player — drag it anywhere.
                        </p>
                      </div>
                    ) : (
                      <SoundCloudEmbed
                        url={selected.url}
                        title={selectedTitle}
                        visual={kind === 'track'}
                        height={kind === 'track' ? 360 : 460}
                      />
                    )}
                  </>
                )}
              </div>

              {/* Deck rail */}
              <div className="bg-card shadow-card border border-border min-w-0">
                <div className="p-3 border-b border-border">
                  <div className="flex items-baseline justify-between mb-2">
                    <h3 className="font-semibold text-sm">Your deck</h3>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {tracks.length} {tracks.length === 1 ? 'item' : 'items'}
                    </span>
                  </div>
                  <div className="flex gap-1.5">
                    <Input
                      value={newUrl}
                      onChange={(e) => setNewUrl(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addTrack()}
                      placeholder="Paste a SoundCloud link"
                      className="flex-1 h-9 text-sm"
                    />
                    <Button size="sm" className="h-9" onClick={addTrack} disabled={adding} aria-label="Add to deck">
                      {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="divide-y divide-border/60">
                  {tracks.map((track) => (
                    <DeckRow
                      key={track.url}
                      track={track}
                      active={selected?.url === track.url}
                      onSelect={() => setSelected(track)}
                      onDetach={() => detachSoundCloudPlayer(track)}
                      onRemove={() => removeTrack(track.url)}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </DashboardPageShell>
      </DashboardShell>
    </UniversalLayout>
  );
}
