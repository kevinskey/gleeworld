// /youtube — the tenant's video library. Started as a YouTube channel view;
// now hosts every provider AddYouTubeVideoForm can accept (Vimeo, TikTok,
// direct uploads, etc.) plus edit / filter / sort / attach-to-playlist
// tooling. Server-side pagination was dropped in favor of a single fetch
// (up to LIBRARY_HARD_CAP rows) because the toolbar filters client-side —
// if a tenant blows past that cap we'll revisit and paginate server-side
// per-tab instead.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Play, Youtube, Loader2, Search, ArrowUpDown, Star, Upload, Pencil,
  Share2, ListPlus, Check, Users, Inbox, Plus, Trash2, ListVideo, Bookmark,
  RefreshCw,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { YouTubeVideoModal } from '@/components/youtube/YouTubeVideoModal';
import { AddYouTubeVideoForm } from '@/components/youtube/AddYouTubeVideoForm';
import { YouTubeSearchField } from '@/components/youtube/YouTubeSearchField';
import { YouTubeResultsPanel } from '@/components/youtube/YouTubeResultsPanel';
import { useYouTubeSearch, type YouTubeHit } from '@/hooks/useYouTubeSearch';
import { addVideoToLibrary, youTubeSource } from '@/lib/videoLibrary';
import { EditVideoDialog, type EditVideoRow } from '@/components/youtube/EditVideoDialog';
import { AddToPlaylistDialog } from '@/components/youtube/AddToPlaylistDialog';
import { ShareVideoDialog } from '@/components/youtube/ShareVideoDialog';
import { PlaylistDetailDialog } from '@/components/youtube/PlaylistDetailDialog';
import { useUserRole } from '@/hooks/useUserRole';
import { useBrandingSettings } from '@/hooks/useBrandingSettings';
import { usePersonalPlaylists, useSharedWithMe, type Playlist } from '@/hooks/useVideoLibrary';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { parseVideoSource, providerLabel } from '@/lib/videoSources';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';

interface VideoRow {
  id: string;
  video_id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  video_url: string;
  duration: string | null;
  view_count: number | null;
  published_at: string | null;
  category: string | null;
  tags: string[] | null;
  is_featured: boolean | null;
}

type Tab = 'all' | 'featured' | 'uploads' | 'playlists' | 'shared';
type Sort = 'recent' | 'oldest' | 'title' | 'views';

const LIBRARY_HARD_CAP = 500;

const formatViewCount = (count: number): string => {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return count.toString();
};

const formatDate = (dateString: string | null): string => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
};

export const YouTubeChannel: React.FC = () => {
  const { isAdmin } = useUserRole();
  const { toast } = useToast();

  const [videos, setVideos] = useState<VideoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<VideoRow | null>(null);

  // ── Inline playback ───────────────────────────────────────────────────
  // Tapping a YouTube thumbnail plays it IN the card (no modal). Leaving
  // the page unmounts the iframe, which stops playback — deliberate
  // (Kevin 2026-08-03: videos must NOT keep playing after leaving).
  const [inlineId, setInlineId] = useState<string | null>(null);
  const playInline = (video: VideoRow) => setInlineId(video.id);
  const stopInlineTracking = () => setInlineId(null);

  const [tab, setTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('__all__');
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<Sort>('recent');

  const [editing, setEditing] = useState<EditVideoRow | null>(null);
  const [playlistTargetId, setPlaylistTargetId] = useState<string | null>(null);
  const [shareTarget, setShareTarget] = useState<{ id: string; title: string; type: 'video' | 'playlist' } | null>(null);
  const [openPlaylist, setOpenPlaylist] = useState<Playlist | null>(null);
  const [newPlaylistTitle, setNewPlaylistTitle] = useState('');
  const [showNewPlaylistForm, setShowNewPlaylistForm] = useState(false);

  const personal = usePersonalPlaylists();
  const sharedInbox = useSharedWithMe();
  const branding = useBrandingSettings();
  const channelHandle = (branding.settings as { youtube_channel_handle?: string } | null)?.youtube_channel_handle || '';
  const [syncing, setSyncing] = useState(false);

  // ── YouTube search ────────────────────────────────────────────────────
  // Searching all of YouTube, as opposed to `search` above which filters the
  // library already loaded. While a YouTube search is active it takes over the
  // grid area; clearing it restores the library and its filters untouched.
  const yt = useYouTubeSearch(10);
  const [addingId, setAddingId] = useState<string | null>(null);
  const ytActive = yt.term !== '';

  // Only covers the first LIBRARY_HARD_CAP rows, so this is a UI convenience —
  // the 23505 duplicate path in addVideoToLibrary stays the real guard.
  const existingVideoIds = useMemo(
    () => new Set(videos.map((v) => v.video_id)),
    [videos],
  );

  const fetchVideos = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('youtube_videos')
        .select('id, video_id, title, description, thumbnail_url, video_url, duration, view_count, published_at, category, tags, is_featured')
        .order('published_at', { ascending: false, nullsFirst: false })
        .limit(LIBRARY_HARD_CAP);
      if (error) throw error;
      setVideos((data as VideoRow[]) || []);
    } catch (err) {
      console.error('Error fetching videos:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchVideos(); }, [fetchVideos]);

  const addHit = async (hit: YouTubeHit) => {
    setAddingId(hit.videoId);
    try {
      const result = await addVideoToLibrary(youTubeSource(hit.videoId), hit.title);
      if (result.outcome === 'duplicate') {
        toast({ title: 'Already added', description: 'That video is already in the library.' });
        return;
      }
      if (result.outcome === 'failed') {
        toast({ title: 'Could not add video', description: result.message, variant: 'destructive' });
        return;
      }
      toast({ title: 'Video added', description: 'It is in your library now.' });
      fetchVideos();
    } finally {
      setAddingId(null);
    }
  };

  // Preview reuses the existing modal, which wants a VideoRow — same shape the
  // playlist dialog synthesizes for its rows.
  const previewHit = (hit: YouTubeHit) => {
    stopInlineTracking();
    setSelectedVideo({
      id: '', video_id: hit.videoId, title: hit.title, description: hit.description,
      thumbnail_url: hit.thumbnail, video_url: hit.url, duration: null, view_count: null,
      published_at: hit.publishedAt, category: null, tags: null, is_featured: null,
    });
  };

  // Compute the tag and category vocabulary from what's actually in the
  // library — so the filter chips only show things a user has tagged.
  const { allCategories, allTags } = useMemo(() => {
    const cats = new Set<string>();
    const tagCounts = new Map<string, number>();
    for (const v of videos) {
      if (v.category) cats.add(v.category);
      for (const t of v.tags ?? []) tagCounts.set(t, (tagCounts.get(t) || 0) + 1);
    }
    return {
      allCategories: [...cats].sort((a, b) => a.localeCompare(b)),
      allTags: [...tagCounts.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t),
    };
  }, [videos]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = videos;

    if (tab === 'featured') list = list.filter((v) => v.is_featured);
    else if (tab === 'uploads') {
      list = list.filter((v) => {
        const p = parseVideoSource(v.video_url);
        return p?.provider === 'direct';
      });
    }

    if (category !== '__all__') list = list.filter((v) => v.category === category);
    if (activeTags.size > 0) {
      list = list.filter((v) => {
        const vt = new Set(v.tags ?? []);
        for (const t of activeTags) if (!vt.has(t)) return false;
        return true;
      });
    }
    if (q) {
      list = list.filter((v) =>
        v.title.toLowerCase().includes(q) ||
        (v.description || '').toLowerCase().includes(q) ||
        (v.category || '').toLowerCase().includes(q) ||
        (v.tags || []).some((t) => t.toLowerCase().includes(q))
      );
    }

    const sorted = [...list];
    switch (sort) {
      case 'oldest':
        sorted.sort((a, b) => (a.published_at || '').localeCompare(b.published_at || ''));
        break;
      case 'title':
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'views':
        sorted.sort((a, b) => (b.view_count || 0) - (a.view_count || 0));
        break;
      case 'recent':
      default:
        sorted.sort((a, b) => (b.published_at || '').localeCompare(a.published_at || ''));
    }
    return sorted;
  }, [videos, tab, search, category, activeTags, sort]);

  const toggleTag = (t: string) => {
    setActiveTags((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t); else next.add(t);
      return next;
    });
  };

  const copyShareLink = async (v: VideoRow) => {
    // Deep-linking to a single row isn't wired yet — but the canonical
    // provider URL is always shareable, so hand that out for now.
    // TODO: /videos/:id route that highlights the row in the library.
    const parsed = parseVideoSource(v.video_url);
    const url = parsed?.canonicalUrl || v.video_url;
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: 'Link copied', description: url });
    } catch {
      toast({ title: 'Could not copy', description: url, variant: 'destructive' });
    }
  };

  // One-click feature toggle. The Edit dialog can also set is_featured, but
  // starring is a per-video curation gesture, not a metadata edit — opening a
  // modal per video to build a Featured row is unusable at library scale.
  // Optimistic, with a revert on failure. The .select() is load-bearing:
  // a tenant whose RLS rejects the write returns zero rows and no error, so
  // without it a silent no-op would look like success.
  const toggleFeatured = async (video: VideoRow) => {
    const next = !video.is_featured;
    setVideos((prev) => prev.map((v) => (v.id === video.id ? { ...v, is_featured: next } : v)));
    const { data, error } = await supabase
      .from('youtube_videos')
      .update({ is_featured: next })
      .eq('id', video.id)
      .select('id');
    if (error || !data?.length) {
      setVideos((prev) => prev.map((v) => (v.id === video.id ? { ...v, is_featured: !next } : v)));
      toast({
        title: 'Could not update',
        description: error?.message || 'The change was rejected — check permissions.',
        variant: 'destructive',
      });
      return;
    }
    toast({ title: next ? 'Added to Featured' : 'Removed from Featured' });
  };

  const tabs: { key: Tab; label: string; icon?: React.ComponentType<{ className?: string }> }[] = [
    { key: 'all', label: 'All' },
    { key: 'featured', label: 'Featured', icon: Star },
    { key: 'uploads', label: 'Uploads', icon: Upload },
    { key: 'playlists', label: 'My Playlists', icon: ListVideo },
    { key: 'shared', label: 'Shared with me', icon: Inbox },
  ];

  const saveToPlaylist = async (playlistId: string, videoId: string, playlistTitle: string) => {
    const err = await personal.addVideo(playlistId, videoId);
    if (err) {
      if ((err as { code?: string }).code === '23505') {
        toast({ title: 'Already in that playlist' });
      } else {
        toast({ title: 'Could not save', description: (err as Error).message, variant: 'destructive' });
      }
      return;
    }
    toast({ title: 'Saved', description: `Added to "${playlistTitle}"` });
  };

  const syncChannel = async () => {
    if (!channelHandle) {
      toast({
        title: 'No YouTube channel set',
        description: 'Set one in Workspace Settings → Branding first.',
        variant: 'destructive',
      });
      return;
    }
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('youtube-channel-sync', {
        body: { handle: channelHandle, max: 50 },
      });
      if (error) {
        toast({ title: 'Sync failed', description: error.message, variant: 'destructive' });
        return;
      }
      const d = data as { channel_title?: string; fetched?: number; inserted?: number; updated?: number; error?: string };
      if (d?.error) {
        toast({ title: 'Sync failed', description: d.error, variant: 'destructive' });
        return;
      }
      toast({
        title: 'Channel synced',
        description: `${d.channel_title || channelHandle}: ${d.inserted ?? 0} new, ${d.updated ?? 0} updated`,
      });
      fetchVideos();
    } catch (e) {
      toast({ title: 'Sync failed', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setSyncing(false);
    }
  };

  const createPlaylistInline = async () => {
    const title = newPlaylistTitle.trim();
    if (!title) return;
    const p = await personal.create(title);
    if (p) {
      setNewPlaylistTitle('');
      setShowNewPlaylistForm(false);
      toast({ title: 'Playlist created' });
    }
  };

  return (
    <UniversalLayout showHeader={false} showFooter={false}>
      <DashboardShell>
        {/* Header + toolbar share one container with compact spacing —
            the old stacked containers (py-4 + mb-6 + py-4 + space-y-6)
            pushed the video grid below the fold (Kevin 2026-08-03). */}
        <main className="container mx-auto px-4 pt-3 pb-4 space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="w-10 h-10 rounded-full bg-destructive flex items-center justify-center">
              <Youtube className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground leading-tight">Video Library</h1>
              <p className="text-sm text-muted-foreground leading-tight">
                {videos.length} video{videos.length === 1 ? '' : 's'}
                {filtered.length !== videos.length && ` · ${filtered.length} shown`}
              </p>
            </div>
            {/* ml-auto on a flex-wrap row: sits right of the title on desktop,
                drops to its own full-width line on phones. */}
            <div className="w-full sm:w-auto sm:ml-auto">
              <YouTubeSearchField
                searching={yt.searching}
                active={ytActive}
                onSearch={(term) => { void yt.search(term); }}
                onClear={yt.clear}
              />
            </div>
          </div>
          {isAdmin() && (
            <div className="flex items-start gap-2 flex-wrap">
              <AddYouTubeVideoForm onAdded={() => fetchVideos()} />
              {channelHandle && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={syncChannel}
                  disabled={syncing}
                  className="gap-1.5"
                  title={`Import latest uploads from @${channelHandle}`}
                >
                  {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  Sync @{channelHandle}
                </Button>
              )}
            </div>
          )}

          {/* Toolbar: tabs (underlined library-style), search, sort */}
          {!ytActive && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 flex-wrap overflow-x-auto border-b border-border -mx-4 px-4">
                {tabs.map(({ key, label, icon: Icon }) => {
                  const active = tab === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setTab(key)}
                      className={`relative flex items-center gap-1.5 px-1 py-2 text-sm transition-colors whitespace-nowrap ${
                        active
                          ? 'text-foreground font-semibold'
                          : 'text-foreground/60 hover:text-foreground'
                      }`}
                    >
                      {Icon && <Icon className={`w-4 h-4 ${active ? 'text-destructive' : ''}`} />}
                      {label}
                      <span
                        className={`absolute left-0 right-0 -bottom-px h-0.5 rounded-full transition-colors ${
                          active ? 'bg-destructive' : 'bg-transparent'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex-1 min-w-[180px]">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search title, description, tags…"
                      className="pl-8 text-sm h-9"
                    />
                  </div>
                </div>

                <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
                  <SelectTrigger className="h-9 w-[160px] text-xs">
                    <ArrowUpDown className="w-3.5 h-3.5 mr-1" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">Recent first</SelectItem>
                    <SelectItem value="oldest">Oldest first</SelectItem>
                    <SelectItem value="title">Title A→Z</SelectItem>
                    <SelectItem value="views">Most viewed</SelectItem>
                  </SelectContent>
                </Select>

                {tab !== 'playlists' && tab !== 'shared' && allCategories.length > 0 && (
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="h-9 w-[160px] text-xs"><SelectValue placeholder="Category" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All categories</SelectItem>
                      {allCategories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {allTags.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] uppercase tracking-wide text-muted-foreground mr-1">Tags:</span>
                  {allTags.map((t) => {
                    const active = activeTags.has(t);
                    return (
                      <button
                        key={t}
                        onClick={() => toggleTag(t)}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border transition-colors ${
                          active
                            ? 'bg-destructive text-white border-destructive'
                            : 'bg-muted/40 text-muted-foreground border-border hover:text-foreground'
                        }`}
                      >
                        {active && <Check className="w-3 h-3" />}
                        {t}
                      </button>
                    );
                  })}
                  {activeTags.size > 0 && (
                    <button
                      onClick={() => setActiveTags(new Set())}
                      className="text-[11px] text-muted-foreground hover:text-foreground ml-1 underline underline-offset-2"
                    >
                      clear
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {ytActive ? (
            <YouTubeResultsPanel
              hits={yt.hits}
              searching={yt.searching}
              error={yt.error}
              term={yt.term}
              canAdd={isAdmin()}
              existingVideoIds={existingVideoIds}
              addingId={addingId}
              onAdd={addHit}
              onPreview={previewHit}
              onBack={yt.clear}
            />
          ) : tab === 'playlists' ? (
            <PlaylistsPanel
              playlists={personal.playlists}
              loading={personal.loading}
              showForm={showNewPlaylistForm}
              newTitle={newPlaylistTitle}
              onNewTitleChange={setNewPlaylistTitle}
              onShowForm={() => setShowNewPlaylistForm(true)}
              onHideForm={() => { setShowNewPlaylistForm(false); setNewPlaylistTitle(''); }}
              onCreate={createPlaylistInline}
              onRename={personal.rename}
              onDelete={personal.remove}
              onShare={(p) => setShareTarget({ id: p.id, title: p.title, type: 'playlist' })}
              onOpen={(p) => setOpenPlaylist(p)}
            />
          ) : tab === 'shared' ? (
            <SharedInboxPanel
              shares={sharedInbox.shares}
              loading={sharedInbox.loading}
              videos={videos}
              onOpenVideo={(v) => setSelectedVideo(v)}
            />
          ) : loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-destructive" />
            </div>
          ) : videos.length === 0 ? (
            <div className="text-center py-20">
              <Youtube className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
              <h2 className="text-xl font-semibold text-foreground mb-2">No videos yet</h2>
              <p className="text-muted-foreground">Add a video with the button above.</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-muted-foreground text-sm">
                {tab === 'featured' && !search.trim()
                  ? 'Nothing featured yet. Star a video on the All tab to feature it here.'
                  : 'No videos match those filters.'}
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 text-xs"
                onClick={() => { setSearch(''); setCategory('__all__'); setActiveTags(new Set()); setTab('all'); }}
              >
                Clear filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filtered.map((video) => {
                const parsed = video.video_url ? parseVideoSource(video.video_url) : null;
                const isYouTube = !parsed || parsed.provider === 'youtube';
                const fallbackThumb = isYouTube
                  ? `https://img.youtube.com/vi/${video.video_id}/hqdefault.jpg`
                  : parsed?.thumbnailUrl || '';
                return (
                  <div
                    key={video.id}
                    className="group relative rounded-xl overflow-hidden bg-card border border-border hover:border-destructive/50 transition-all hover:shadow-lg"
                  >
                    {inlineId === video.id ? (
                    <div className="aspect-video relative bg-black">
                      <iframe
                        src={`https://www.youtube.com/embed/${video.video_id}?autoplay=1&playsinline=1&rel=0`}
                        title={video.title}
                        className="w-full h-full"
                        allow="autoplay; encrypted-media; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                    ) : (
                    <div
                      className="aspect-video relative bg-muted cursor-pointer"
                      onClick={() => (isYouTube ? playInline(video) : setSelectedVideo(video))}
                    >
                      {video.thumbnail_url || fallbackThumb ? (
                        <img
                          src={video.thumbnail_url || fallbackThumb}
                          alt={video.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/60">
                          <Play className="h-10 w-10 text-muted-foreground/40" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-14 h-14 rounded-full bg-destructive flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                          <Play className="h-6 w-6 text-white fill-white ml-1" />
                        </div>
                      </div>
                      {video.duration && (
                        <span className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                          {video.duration}
                        </span>
                      )}
                      {video.is_featured && (
                        <span className="absolute top-2 left-2 inline-flex items-center gap-1 bg-yellow-400 text-black text-[10px] font-semibold px-1.5 py-0.5 rounded">
                          <Star className="w-3 h-3 fill-black" /> Featured
                        </span>
                      )}
                      {parsed && parsed.provider !== 'youtube' && (
                        <span className="absolute top-2 right-2 bg-black/70 text-white text-[10px] font-medium px-1.5 py-0.5 rounded">
                          {providerLabel(parsed.provider)}
                        </span>
                      )}
                    </div>
                    )}
                    <div className="p-3 space-y-1.5">
                      {/* Explicit text-sm: the global h3 rule in index.css is
                          22px/700, which lets the metadata block outweigh the
                          thumbnail — the video must stay the dominant element. */}
                      <h3
                        className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-destructive transition-colors cursor-pointer"
                        // Title = theater mode (modal). Stop the inline
                        // tracker first so the unmount handoff doesn't dock
                        // a video the user just re-opened in the modal.
                        onClick={() => { stopInlineTracking(); setSelectedVideo(video); }}
                      >
                        {video.title}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {(video.view_count ?? 0) > 0 && (
                          <>
                            <span>{formatViewCount(video.view_count!)} views</span>
                            <span>•</span>
                          </>
                        )}
                        <span>{formatDate(video.published_at)}</span>
                      </div>
                      {video.category && (
                        <div className="text-[11px] text-muted-foreground">
                          <span className="inline-block px-1.5 py-0.5 rounded bg-muted">{video.category}</span>
                        </div>
                      )}
                      {video.tags && video.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {video.tags.slice(0, 4).map((t) => (
                            <button
                              key={t}
                              onClick={(e) => { e.stopPropagation(); toggleTag(t); }}
                              className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted/60 text-muted-foreground hover:text-foreground"
                            >
                              #{t}
                            </button>
                          ))}
                          {video.tags.length > 4 && (
                            <span className="text-[10px] text-muted-foreground">+{video.tags.length - 4}</span>
                          )}
                        </div>
                      )}
                      <div className="flex items-center gap-1 pt-1 border-t border-border/60">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs px-2"
                          onClick={(e) => { e.stopPropagation(); setShareTarget({ id: video.id, title: video.title, type: 'video' }); }}
                          title="Share with a user or course"
                        >
                          <Share2 className="w-3.5 h-3.5 mr-1" /> Share
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs px-2"
                              onClick={(e) => e.stopPropagation()}
                              title="Save to a playlist"
                            >
                              <Bookmark className="w-3.5 h-3.5 mr-1" /> Save
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" onClick={(e) => e.stopPropagation()}>
                            {personal.playlists.length === 0 && (
                              <div className="px-2 py-1.5 text-xs text-muted-foreground">No playlists yet.</div>
                            )}
                            {personal.playlists.map((p) => (
                              <DropdownMenuItem
                                key={p.id}
                                onClick={(e) => { e.stopPropagation(); saveToPlaylist(p.id, video.id, p.title); }}
                              >
                                <ListVideo className="w-3.5 h-3.5 mr-2" /> {p.title}
                              </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={async (e) => {
                                e.stopPropagation();
                                const title = window.prompt('New playlist name');
                                if (!title?.trim()) return;
                                const p = await personal.create(title.trim());
                                if (p) await saveToPlaylist(p.id, video.id, p.title);
                              }}
                            >
                              <Plus className="w-3.5 h-3.5 mr-2" /> New playlist…
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs px-2"
                          onClick={(e) => { e.stopPropagation(); copyShareLink(video); }}
                          title="Copy shareable link"
                        >
                          <ListPlus className="w-3.5 h-3.5" />
                        </Button>
                        {isAdmin() && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs px-2"
                              onClick={(e) => { e.stopPropagation(); toggleFeatured(video); }}
                              title={video.is_featured ? 'Remove from Featured' : 'Add to Featured'}
                              aria-pressed={!!video.is_featured}
                              aria-label={video.is_featured ? 'Remove from Featured' : 'Add to Featured'}
                            >
                              <Star
                                className={`w-3.5 h-3.5 ${video.is_featured ? 'fill-current text-amber-500' : ''}`}
                              />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs px-2"
                              onClick={(e) => { e.stopPropagation(); setPlaylistTargetId(video.id); }}
                              title="Add to a course playlist"
                            >
                              <Users className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs px-2 ml-auto"
                              onClick={(e) => { e.stopPropagation(); setEditing(video); }}
                              title="Edit video metadata"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>

        <YouTubeVideoModal
          isOpen={!!selectedVideo}
          onClose={() => setSelectedVideo(null)}
          videoId={selectedVideo?.video_id || ''}
          title={selectedVideo?.title}
          url={selectedVideo?.video_url}
        />
        <EditVideoDialog
          open={!!editing}
          video={editing}
          categorySuggestions={allCategories}
          onClose={() => setEditing(null)}
          onSaved={() => fetchVideos()}
        />
        <AddToPlaylistDialog
          open={!!playlistTargetId}
          videoRowId={playlistTargetId}
          onClose={() => setPlaylistTargetId(null)}
          onAdded={() => { /* no-op — playlist state lives elsewhere */ }}
        />
        <ShareVideoDialog
          open={!!shareTarget}
          resourceType={shareTarget?.type || 'video'}
          resourceId={shareTarget?.id}
          resourceLabel={shareTarget?.title || ''}
          onClose={() => setShareTarget(null)}
          onShared={() => sharedInbox.refresh()}
        />
        <PlaylistDetailDialog
          playlist={openPlaylist}
          open={!!openPlaylist}
          onClose={() => setOpenPlaylist(null)}
          onShare={(p) => setShareTarget({ id: p.id, title: p.title, type: 'playlist' })}
          onRename={(p) => {
            const t = window.prompt('Rename playlist', p.title);
            if (t && t.trim() && t !== p.title) personal.rename(p.id, t.trim());
          }}
          onPlay={(v) => {
            setSelectedVideo({
              id: '',
              video_id: v.video_id,
              title: v.title,
              description: null,
              thumbnail_url: null,
              video_url: v.video_url,
              duration: null,
              view_count: null,
              published_at: null,
              category: null,
              tags: null,
              is_featured: null,
            });
          }}
          onChanged={() => personal.refresh()}
        />
      </DashboardShell>
    </UniversalLayout>
  );
};

// ── Playlists tab ────────────────────────────────────────────────────
function PlaylistsPanel({
  playlists, loading, showForm, newTitle, onNewTitleChange, onShowForm, onHideForm, onCreate,
  onRename, onDelete, onShare, onOpen,
}: {
  playlists: Playlist[];
  loading: boolean;
  showForm: boolean;
  newTitle: string;
  onNewTitleChange: (t: string) => void;
  onShowForm: () => void;
  onHideForm: () => void;
  onCreate: () => Promise<void> | void;
  onRename: (id: string, title: string) => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
  onShare: (p: Playlist) => void;
  onOpen: (p: Playlist) => void;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-destructive" />
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <div>
        {showForm ? (
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="text-xs font-medium text-muted-foreground">Playlist title</label>
              <Input
                value={newTitle}
                onChange={(e) => onNewTitleChange(e.target.value)}
                placeholder="e.g. Concert warmups"
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') onCreate(); }}
              />
            </div>
            <Button size="sm" onClick={() => onCreate()} disabled={!newTitle.trim()}>Create</Button>
            <Button size="sm" variant="ghost" onClick={onHideForm}>Cancel</Button>
          </div>
        ) : (
          <Button size="sm" onClick={onShowForm} className="gap-1.5">
            <Plus className="w-4 h-4" /> New playlist
          </Button>
        )}
      </div>

      {playlists.length === 0 ? (
        <div className="text-center py-20">
          <ListVideo className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No playlists yet. Create one to start organizing videos.</p>
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {playlists.map((p) => (
            <li
              key={p.id}
              className="p-4 flex items-center gap-3 cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => onOpen(p)}
              title="Open playlist"
            >
              <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center shrink-0">
                <ListVideo className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{p.title}</div>
                <div className="text-[11px] text-muted-foreground">
                  {p.item_count ?? 0} video{p.item_count === 1 ? '' : 's'} · Updated {new Date(p.updated_at).toLocaleDateString()}
                </div>
              </div>
              <Button size="sm" variant="ghost" className="text-xs" onClick={(e) => { e.stopPropagation(); onShare(p); }}>
                <Share2 className="w-3.5 h-3.5 mr-1" /> Share
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  const title = window.prompt('Rename playlist', p.title);
                  if (title && title.trim() && title !== p.title) onRename(p.id, title.trim());
                }}
              >
                Rename
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-xs text-destructive hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm(`Delete "${p.title}"?`)) onDelete(p.id);
                }}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Shared with me tab ───────────────────────────────────────────────
function SharedInboxPanel({
  shares, loading, videos, onOpenVideo,
}: {
  shares: { id: string; resource_type: string; resource_id: string | null; note: string | null; created_at: string; recipient_type: string }[];
  loading: boolean;
  videos: VideoRow[];
  onOpenVideo: (v: VideoRow) => void;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-destructive" />
      </div>
    );
  }
  const byVideoId = new Map(videos.map((v) => [v.id, v]));
  const items = shares
    .filter((s) => s.resource_type === 'video' && s.resource_id && byVideoId.has(s.resource_id))
    .map((s) => ({ share: s, video: byVideoId.get(s.resource_id!)! }));

  if (items.length === 0) {
    return (
      <div className="text-center py-20">
        <Inbox className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">Nothing shared with you yet.</p>
      </div>
    );
  }
  return (
    <ul className="space-y-3">
      {items.map(({ share, video }) => (
        <li key={share.id} className="flex gap-3 p-3 rounded-xl border border-border bg-card">
          <button
            className="shrink-0 aspect-video w-40 rounded overflow-hidden bg-muted"
            onClick={() => onOpenVideo(video)}
          >
            {video.thumbnail_url ? (
              <img src={video.thumbnail_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Play className="w-6 h-6 text-muted-foreground/40" />
              </div>
            )}
          </button>
          <div className="flex-1 min-w-0">
            <button
              className="text-sm font-medium hover:text-destructive text-left line-clamp-2"
              onClick={() => onOpenVideo(video)}
            >
              {video.title}
            </button>
            {share.note && (
              <p className="text-xs text-muted-foreground mt-1 italic">"{share.note}"</p>
            )}
            <div className="text-[11px] text-muted-foreground mt-1">
              Shared {new Date(share.created_at).toLocaleDateString()}
              {share.recipient_type === 'course' && ' · via a course'}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default YouTubeChannel;
