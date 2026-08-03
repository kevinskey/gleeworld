import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Music, Upload, Search, Loader2, Headphones, Youtube, X, Library as LibraryIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { useSheetMusicTracks } from '@/hooks/useSheetMusicTracks';
import type { ScoreRow } from './types';

export function AttachAudioDialog({
  score, userId, onOpenChange, onSaved,
}: {
  score: ScoreRow | null;
  userId: string | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const open = !!score;
  const [tab, setTab] = useState<'file' | 'youtube' | 'media' | 'apple'>('file');
  const [file, setFile] = useState<File | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [title, setTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [mediaPick, setMediaPick] = useState<{ id: string; title: string; file_url: string } | null>(null);
  const [mediaSearch, setMediaSearch] = useState('');
  // Multi-track state. tracks list comes from the new audio_tracks table.
  const { tracks, addTrack, setDefaultTrack, deleteTrack } = useSheetMusicTracks(score?.id);
  const [addingTrack, setAddingTrack] = useState(false);
  // Apple Music tab state. Search is debounced through useEffect below.
  const [appleSearch, setAppleSearch] = useState('');
  const [appleResults, setAppleResults] = useState<Array<{ id: string; title: string; artist: string; album: string; artworkUrl: string | null; storefront: string }>>([]);
  const [appleSearching, setAppleSearching] = useState(false);
  const [appleErr, setAppleErr] = useState<string | null>(null);
  const [applePick, setApplePick] = useState<{ id: string; title: string; artist: string; storefront: string; artworkUrl: string | null } | null>(null);

  // Audio items in this tenant's media library — used by the "From Media
  // Library" tab so users can bind a backing track they already uploaded
  // without re-uploading. RLS scopes results to the current tenant.
  const { data: mediaAudio = [], isLoading: mediaLoading } = useQuery({
    queryKey: ['media-library-audio', open],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_media_library')
        .select('id, title, file_url, file_type, category, tags')
        .or('file_type.ilike.audio%,file_type.eq.audio')
        .eq('is_deleted', false)
        .order('title')
        .limit(500);
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; title: string; file_url: string; file_type: string; category: string; tags: string[] | null }>;
    },
  });

  // Reset form whenever a new score is opened.
  useEffect(() => {
    if (score) {
      const initialTitle = score.audio_title ?? '';
      const hasApple = !!(score as any).apple_music_id;
      const isYouTubeUrl = !!score.audio_url && /youtu(be\.com|\.be)/i.test(score.audio_url);
      setTab(hasApple ? 'apple' : isYouTubeUrl ? 'youtube' : 'file');
      setYoutubeUrl(isYouTubeUrl ? (score.audio_url ?? '') : '');
      setFile(null);
      setTitle(initialTitle);
      setMediaPick(null);
      setMediaSearch('');
      setAppleSearch('');
      setAppleResults([]);
      setAppleErr(null);
      setApplePick(hasApple ? {
        id: (score as any).apple_music_id,
        title: (score as any).apple_music_title ?? initialTitle ?? '',
        artist: (score as any).apple_music_artist ?? '',
        storefront: (score as any).apple_music_storefront ?? 'us',
        artworkUrl: (score as any).apple_music_artwork_url ?? null,
      } : null);
    }
  }, [score]);

  // Debounced Apple Music catalog search. Triggers MusicKit JS load + token
  // fetch on the first non-empty term, then runs a search per keystroke
  // pause. We never block the dialog open on this — it's lazy on the tab.
  useEffect(() => {
    if (tab !== 'apple') return;
    const term = appleSearch.trim();
    if (!term) { setAppleResults([]); setAppleErr(null); return; }
    let cancelled = false;
    setAppleSearching(true);
    setAppleErr(null);
    const handle = window.setTimeout(async () => {
      try {
        const { searchAppleMusic } = await import('@/lib/musicKit');
        const { songs } = await searchAppleMusic(term);
        if (!cancelled) setAppleResults(songs);
      } catch (e: any) {
        if (!cancelled) setAppleErr(e?.message ?? 'Apple Music search failed.');
      } finally {
        if (!cancelled) setAppleSearching(false);
      }
    }, 300);
    return () => { cancelled = true; window.clearTimeout(handle); };
  }, [tab, appleSearch]);

  const filteredMedia = useMemo(() => {
    const s = mediaSearch.trim().toLowerCase();
    if (!s) return mediaAudio;
    return mediaAudio.filter((m) =>
      m.title?.toLowerCase().includes(s) ||
      (m.tags ?? []).some((t) => t.toLowerCase().includes(s)),
    );
  }, [mediaAudio, mediaSearch]);

  // Saves the current tab's selection as a NEW track in
  // gw_sheet_music_audio_tracks. The first track per score auto-becomes
  // default (server-side via the hook). Legacy gw_sheet_music columns
  // are mirrored to the new default so callers that haven't migrated
  // (older PDFViewerWithAnnotations builds, the iOS app on a stale build)
  // still load the same recording.
  async function handleSave() {
    if (!score || !userId) return;
    setSubmitting(true);
    try {
      const label = title.trim() || (
        tab === 'apple' ? (applePick?.title ?? 'Apple Music') :
        tab === 'media' ? (mediaPick?.title ?? 'Recording') :
        tab === 'youtube' ? 'YouTube' :
        file ? file.name.replace(/\.[^.]+$/, '') : 'Recording'
      );

      const trackPayload: any = { label, kind: tab === 'apple' ? 'apple_music' : tab === 'media' ? 'media_library' : tab === 'youtube' ? 'youtube' : 'file' };

      if (tab === 'file') {
        if (!file) { toast.error('Pick an MP3 first.'); setSubmitting(false); return; }
        const ext = file.name.split('.').pop() || 'mp3';
        const path = `audio/${score.id}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from('sheet-music')
          .upload(path, file, { contentType: file.type, upsert: true });
        if (uploadErr) throw uploadErr;
        trackPayload.audio_url = supabase.storage.from('sheet-music').getPublicUrl(path).data.publicUrl;
        trackPayload.audio_title = label;
      } else if (tab === 'youtube') {
        const url = youtubeUrl.trim();
        if (!url || !/youtu(be\.com|\.be)/i.test(url)) {
          toast.error(!url ? 'Paste a YouTube URL first.' : 'That doesn’t look like a YouTube URL.');
          setSubmitting(false); return;
        }
        trackPayload.audio_url = url;
        trackPayload.audio_title = label;
      } else if (tab === 'media') {
        if (!mediaPick) { toast.error('Pick an audio file from your media library.'); setSubmitting(false); return; }
        trackPayload.audio_url = mediaPick.file_url;
        trackPayload.audio_title = label;
      } else if (tab === 'apple') {
        if (!applePick) { toast.error('Search and pick an Apple Music track.'); setSubmitting(false); return; }
        trackPayload.apple_music_id = applePick.id;
        trackPayload.apple_music_storefront = applePick.storefront;
        trackPayload.apple_music_title = applePick.title;
        trackPayload.apple_music_artist = applePick.artist;
        trackPayload.apple_music_artwork_url = applePick.artworkUrl;
      }

      const isFirst = tracks.length === 0;
      const inserted = await addTrack.mutateAsync(trackPayload);

      // Mirror to legacy columns when this is (or becomes) the default,
      // so existing read paths keep working without redeploying.
      if (isFirst || inserted.is_default) {
        await supabase.from('gw_sheet_music').update(
          trackPayload.kind === 'apple_music' ? {
            audio_url: null, audio_title: inserted.label,
            apple_music_id: trackPayload.apple_music_id,
            apple_music_storefront: trackPayload.apple_music_storefront,
            apple_music_title: trackPayload.apple_music_title,
            apple_music_artist: trackPayload.apple_music_artist,
            apple_music_artwork_url: trackPayload.apple_music_artwork_url,
          } : {
            audio_url: trackPayload.audio_url, audio_title: inserted.label,
            apple_music_id: null, apple_music_storefront: null,
            apple_music_title: null, apple_music_artist: null, apple_music_artwork_url: null,
          },
        ).eq('id', score.id);
      }

      toast.success('Track added.');
      setAddingTrack(false);
      // Reset the picker fields so the next "Add a track" starts clean.
      setFile(null); setYoutubeUrl(''); setMediaPick(null); setApplePick(null);
      setTitle('');
      onSaved();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to add track.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Audio tracks</DialogTitle>
          <DialogDescription>
            Bind one or many recordings to this score (Rehearsal, Accompaniment, Reference…). The default loads automatically; pick another from the audio companion.
          </DialogDescription>
        </DialogHeader>

        {/* Existing tracks list. Empty state nudges the user to add one. */}
        <div className="space-y-1">
          {tracks.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-2">No tracks yet.</p>
          ) : (
            <ul className="border rounded-md divide-y">
              {tracks.map((t) => (
                <li key={t.id} className="flex items-center gap-2 px-2 py-1.5">
                  <span className="shrink-0">
                    {t.kind === 'apple_music' ? <Music className="w-3.5 h-3.5 text-pink-500" /> :
                     t.kind === 'youtube' ? <Youtube className="w-3.5 h-3.5 text-red-500" /> :
                     t.kind === 'media_library' ? <LibraryIcon className="w-3.5 h-3.5 text-muted-foreground" /> :
                     <Headphones className="w-3.5 h-3.5 text-muted-foreground" />}
                  </span>
                  <span className="text-sm flex-1 truncate">{t.label}</span>
                  <button
                    type="button"
                    onClick={() => setDefaultTrack.mutate(t.id)}
                    className={`text-xs uppercase tracking-wider px-1.5 py-0.5 rounded transition-colors ${
                      t.is_default
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent'
                    }`}
                    title={t.is_default ? 'Default — auto-loads when score opens' : 'Set as default'}
                  >
                    {t.is_default ? 'Default' : 'Set default'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { if (confirm(`Delete track "${t.label}"?`)) deleteTrack.mutate(t.id); }}
                    className="text-muted-foreground hover:text-destructive p-0.5"
                    title="Delete"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {!addingTrack && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setAddingTrack(true)}
              className="w-full mt-2"
            >
              <Upload className="w-4 h-4 mr-1.5" /> Add a track
            </Button>
          )}
        </div>

        {/* Four source tabs are wider than the dialog's inner width on a phone.
            DialogContent scrolls vertically but not horizontally, so this row
            needs its own horizontal scroll or the last tab is unreachable. */}
        {addingTrack && <div className="flex gap-2 border-b border-border overflow-x-auto -mx-4 px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => setTab('file')}
            className={
              tab === 'file'
                ? 'inline-flex shrink-0 whitespace-nowrap items-center gap-1.5 px-3 py-2 min-h-[44px] lg:min-h-0 text-sm font-semibold border-b-2 border-primary text-primary -mb-px'
                : 'inline-flex shrink-0 whitespace-nowrap items-center gap-1.5 px-3 py-2 min-h-[44px] lg:min-h-0 text-sm text-muted-foreground hover:text-foreground'
            }
          >
            <Upload className="w-4 h-4" /> Upload
          </button>
          <button
            type="button"
            onClick={() => setTab('media')}
            className={
              tab === 'media'
                ? 'inline-flex shrink-0 whitespace-nowrap items-center gap-1.5 px-3 py-2 min-h-[44px] lg:min-h-0 text-sm font-semibold border-b-2 border-primary text-primary -mb-px'
                : 'inline-flex shrink-0 whitespace-nowrap items-center gap-1.5 px-3 py-2 min-h-[44px] lg:min-h-0 text-sm text-muted-foreground hover:text-foreground'
            }
          >
            <LibraryIcon className="w-4 h-4" /> Media Library
          </button>
          <button
            type="button"
            onClick={() => setTab('youtube')}
            className={
              tab === 'youtube'
                ? 'inline-flex shrink-0 whitespace-nowrap items-center gap-1.5 px-3 py-2 min-h-[44px] lg:min-h-0 text-sm font-semibold border-b-2 border-primary text-primary -mb-px'
                : 'inline-flex shrink-0 whitespace-nowrap items-center gap-1.5 px-3 py-2 min-h-[44px] lg:min-h-0 text-sm text-muted-foreground hover:text-foreground'
            }
          >
            <Youtube className="w-4 h-4" /> YouTube
          </button>
          <button
            type="button"
            onClick={() => setTab('apple')}
            className={
              tab === 'apple'
                ? 'inline-flex shrink-0 whitespace-nowrap items-center gap-1.5 px-3 py-2 min-h-[44px] lg:min-h-0 text-sm font-semibold border-b-2 border-primary text-primary -mb-px'
                : 'inline-flex shrink-0 whitespace-nowrap items-center gap-1.5 px-3 py-2 min-h-[44px] lg:min-h-0 text-sm text-muted-foreground hover:text-foreground'
            }
          >
            <Music className="w-4 h-4" /> Apple Music
          </button>
        </div>}

        {addingTrack && <div className="space-y-3 pt-2">
          {tab === 'file' && (
            <div>
              <Label className="text-sm">MP3 file</Label>
              <Input
                type="file"
                accept="audio/mpeg,audio/mp3,audio/wav,audio/aac,audio/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="cursor-pointer"
              />
            </div>
          )}
          {tab === 'youtube' && (
            <div>
              <Label className="text-sm">YouTube URL</Label>
              <Input
                type="url"
                placeholder="https://www.youtube.com/watch?v=..."
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Video stays hidden during playback — only the audio plays.
              </p>
            </div>
          )}
          {tab === 'apple' && (
            <div className="space-y-2">
              <Label className="text-sm">Search Apple Music</Label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={appleSearch}
                  onChange={(e) => setAppleSearch(e.target.value)}
                  placeholder="Song, artist, or album…"
                  className="pl-8 h-9"
                />
              </div>
              {appleErr && (
                <p className="text-xs text-destructive">{appleErr}</p>
              )}
              <p className="text-xs text-muted-foreground italic">
                Playback requires an active Apple Music subscription. Free users will see a subscription prompt when they hit play.
              </p>
              <div className="border rounded-md max-h-60 overflow-y-auto divide-y">
                {applePick && !appleSearch.trim() && (
                  <div className="p-3 flex items-center gap-3 bg-accent/30">
                    {applePick.artworkUrl && (
                      <img src={applePick.artworkUrl} alt="" className="w-10 h-10 rounded shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{applePick.title}</div>
                      <div className="text-xs text-muted-foreground truncate">{applePick.artist}</div>
                    </div>
                    <span className="text-xs uppercase tracking-wider text-primary">Picked</span>
                  </div>
                )}
                {appleSearching ? (
                  <div className="p-4 text-center text-xs text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin inline mr-1" /> Searching Apple Music…
                  </div>
                ) : appleResults.length === 0 && appleSearch.trim() && !appleErr ? (
                  <div className="p-4 text-center text-xs text-muted-foreground italic">
                    No matches in the Apple Music catalog.
                  </div>
                ) : (
                  appleResults.map((r) => {
                    const picked = applePick?.id === r.id;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => {
                          setApplePick({ id: r.id, title: r.title, artist: r.artist, storefront: r.storefront, artworkUrl: r.artworkUrl });
                          if (!title.trim()) setTitle(r.title);
                        }}
                        className={
                          picked
                            ? 'w-full flex items-center gap-3 px-3 py-2 text-left bg-accent/60'
                            : 'w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-accent/40'
                        }
                      >
                        {r.artworkUrl ? (
                          <img src={r.artworkUrl} alt="" className="w-10 h-10 rounded shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded bg-muted shrink-0 flex items-center justify-center">
                            <Music className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{r.title}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {r.artist}{r.album ? ` · ${r.album}` : ''}
                          </div>
                        </div>
                        {picked && <Headphones className="w-3.5 h-3.5 text-primary shrink-0" />}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
          {tab === 'media' && (
            <div className="space-y-2">
              <Label className="text-sm">Pick a track from your Media Library</Label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={mediaSearch}
                  onChange={(e) => setMediaSearch(e.target.value)}
                  placeholder="Search title or tag…"
                  className="pl-8 h-9"
                />
              </div>
              <div className="border rounded-md max-h-60 overflow-y-auto divide-y">
                {mediaLoading ? (
                  <div className="p-4 text-center text-xs text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin inline mr-1" /> Loading…
                  </div>
                ) : filteredMedia.length === 0 ? (
                  <div className="p-4 text-center text-xs text-muted-foreground italic">
                    {mediaSearch
                      ? 'No matches in your media library.'
                      : 'No audio in the media library yet. Upload one in Media Library first.'}
                  </div>
                ) : (
                  filteredMedia.map((m) => {
                    const picked = mediaPick?.id === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setMediaPick({ id: m.id, title: m.title, file_url: m.file_url });
                          if (!title.trim()) setTitle(m.title);
                        }}
                        className={
                          picked
                            ? 'w-full flex items-center gap-2 px-3 py-2 text-left bg-accent/60'
                            : 'w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-accent/40'
                        }
                      >
                        <Music className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="text-sm truncate flex-1">{m.title}</span>
                        {picked && <Headphones className="w-3.5 h-3.5 text-primary shrink-0" />}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          <div>
            <Label className="text-sm">Track label</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Rehearsal, Accompaniment, Reference…"
            />
          </div>
        </div>}

        <DialogFooter className="flex-row items-center justify-between sm:justify-between gap-2">
          <div />
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Close
            </Button>
            {addingTrack && (
              <>
                <Button variant="ghost" onClick={() => setAddingTrack(false)} disabled={submitting}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={submitting}>
                  {submitting ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Headphones className="w-4 h-4 mr-1.5" />}
                  Add
                </Button>
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
