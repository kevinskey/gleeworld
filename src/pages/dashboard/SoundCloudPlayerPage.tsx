import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Cloud, ExternalLink, Music, PictureInPicture2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { isSoundCloudSet, isSoundCloudUrl, type SoundCloudTrack } from '@/lib/soundcloud';
import { SoundCloudEmbed } from '@/components/soundcloud/SoundCloudEmbed';
import {
  detachSoundCloudPlayer,
  useFloatingSoundCloudTrack,
  closeSoundCloudPlayer,
} from '@/components/soundcloud/soundcloudPlayerStore';

// Per-device playlist. Deliberately localStorage (not Supabase) for v1 —
// this is a personal listening deck, not shared tenant content.
const LIST_KEY = 'gw:sc-command-center:tracks';

function loadTracks(): SoundCloudTrack[] {
  try {
    const raw = localStorage.getItem(LIST_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((t) => isSoundCloudUrl(t?.url)) : [];
  } catch {
    return [];
  }
}

export default function SoundCloudPlayerPage() {
  const [tracks, setTracks] = useState<SoundCloudTrack[]>(loadTracks);
  const [newUrl, setNewUrl] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [selected, setSelected] = useState<SoundCloudTrack | null>(null);
  const floating = useFloatingSoundCloudTrack();

  useEffect(() => {
    localStorage.setItem(LIST_KEY, JSON.stringify(tracks));
  }, [tracks]);

  const addTrack = () => {
    const url = newUrl.trim();
    if (!isSoundCloudUrl(url)) {
      toast.error('Paste a SoundCloud track, playlist, or artist URL');
      return;
    }
    if (tracks.some((t) => t.url === url)) {
      toast.info('Already in your list');
      return;
    }
    const track = { url, title: newTitle.trim() || undefined };
    setTracks((prev) => [...prev, track]);
    setSelected(track);
    setNewUrl('');
    setNewTitle('');
  };

  const removeTrack = (url: string) => {
    setTracks((prev) => prev.filter((t) => t.url !== url));
    if (selected?.url === url) setSelected(null);
  };

  const detach = (track: SoundCloudTrack) => {
    detachSoundCloudPlayer(track);
    toast.success('Player detached — drag it anywhere. It keeps playing while you navigate.');
  };

  return (
    <UniversalLayout showHeader={false} showFooter={false}>
      <DashboardShell>
        <DashboardPageShell
          title="SoundCloud Player"
          subtitle="Build a listening deck and pop the player out as a floating mini player"
          icon={Cloud}
          maxWidth="4xl"
        >
          <div className="flex flex-col sm:flex-row gap-2 mb-6">
            <Input
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTrack()}
              placeholder="https://soundcloud.com/artist/track-or-playlist"
              className="flex-1"
            />
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTrack()}
              placeholder="Title (optional)"
              className="sm:w-48"
            />
            <Button onClick={addTrack}>
              <Plus className="h-4 w-4 mr-2" /> Add
            </Button>
          </div>

          {selected && (
            <Card className="mb-6 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 border-b">
                <span className="font-semibold truncate">
                  {selected.title || selected.url}
                </span>
                <div className="flex items-center gap-2">
                  {floating?.url === selected.url ? (
                    <Button variant="outline" size="sm" onClick={closeSoundCloudPlayer}>
                      Re-dock
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => detach(selected)}>
                      <PictureInPicture2 className="h-4 w-4 mr-2" /> Detach
                    </Button>
                  )}
                </div>
              </div>
              {/* Hide the inline embed while this track floats so two widgets
                  don't play over each other. */}
              {floating?.url !== selected.url && (
                <SoundCloudEmbed
                  url={selected.url}
                  title={selected.title}
                  visual={!isSoundCloudSet(selected.url)}
                  height={isSoundCloudSet(selected.url) ? 420 : 300}
                />
              )}
            </Card>
          )}

          {tracks.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Music className="h-16 w-16 mx-auto mb-4 opacity-20" />
              <p>No tracks yet. Paste a SoundCloud link above to get started.</p>
            </div>
          )}

          <div className="space-y-2">
            {tracks.map((track) => (
              <Card
                key={track.url}
                className={`hover:shadow-md transition-shadow cursor-pointer ${
                  selected?.url === track.url ? 'border-primary' : ''
                }`}
                onClick={() => setSelected(track)}
              >
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded bg-[#f50]/10 flex items-center justify-center shrink-0">
                    <Cloud className="h-5 w-5 text-[#f50]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{track.title || track.url}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {isSoundCloudSet(track.url) ? 'Playlist' : 'Track'} · {track.url}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title="Detach as floating player"
                    onClick={(e) => {
                      e.stopPropagation();
                      detach(track);
                    }}
                  >
                    <PictureInPicture2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                    <a
                      href={track.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      title="Open on SoundCloud"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-red-600"
                    title="Remove"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeTrack(track.url);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </DashboardPageShell>
      </DashboardShell>
    </UniversalLayout>
  );
}
