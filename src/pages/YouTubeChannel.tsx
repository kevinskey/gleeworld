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
  Share2, ListPlus, Check,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { YouTubeVideoModal } from '@/components/youtube/YouTubeVideoModal';
import { AddYouTubeVideoForm } from '@/components/youtube/AddYouTubeVideoForm';
import { EditVideoDialog, type EditVideoRow } from '@/components/youtube/EditVideoDialog';
import { AddToPlaylistDialog } from '@/components/youtube/AddToPlaylistDialog';
import { useUserRole } from '@/hooks/useUserRole';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { parseVideoSource, providerLabel } from '@/lib/videoSources';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

type Tab = 'all' | 'featured' | 'uploads';
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

  const [tab, setTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('__all__');
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<Sort>('recent');

  const [editing, setEditing] = useState<EditVideoRow | null>(null);
  const [playlistTargetId, setPlaylistTargetId] = useState<string | null>(null);

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

  const tabs: { key: Tab; label: string; icon?: React.ComponentType<{ className?: string }> }[] = [
    { key: 'all', label: 'All' },
    { key: 'featured', label: 'Featured', icon: Star },
    { key: 'uploads', label: 'Uploads', icon: Upload },
  ];

  return (
    <UniversalLayout showHeader={false} showFooter={false}>
      <DashboardShell>
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full bg-destructive flex items-center justify-center">
              <Youtube className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Video Library</h1>
              <p className="text-sm text-muted-foreground">
                {videos.length} video{videos.length === 1 ? '' : 's'}
                {filtered.length !== videos.length && ` · ${filtered.length} shown`}
              </p>
            </div>
          </div>
        </div>

        <main className="container mx-auto px-4 py-4 space-y-6">
          {isAdmin() && <AddYouTubeVideoForm onAdded={() => fetchVideos()} />}

          {/* Toolbar: tabs, search, sort */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="inline-flex rounded-md border border-border bg-muted/40 p-0.5 text-xs">
                {tabs.map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setTab(key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors ${
                      tab === key ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {Icon && <Icon className="w-3.5 h-3.5" />}
                    {label}
                  </button>
                ))}
              </div>

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

              {allCategories.length > 0 && (
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

          {loading ? (
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
              <p className="text-muted-foreground text-sm">No videos match those filters.</p>
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
                    <div
                      className="aspect-video relative bg-muted cursor-pointer"
                      onClick={() => setSelectedVideo(video)}
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
                    <div className="p-4 space-y-2">
                      <h3
                        className="font-medium text-foreground line-clamp-2 group-hover:text-destructive transition-colors cursor-pointer"
                        onClick={() => setSelectedVideo(video)}
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
                          onClick={(e) => { e.stopPropagation(); copyShareLink(video); }}
                          title="Copy shareable link"
                        >
                          <Share2 className="w-3.5 h-3.5 mr-1" /> Share
                        </Button>
                        {isAdmin() && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs px-2"
                              onClick={(e) => { e.stopPropagation(); setPlaylistTargetId(video.id); }}
                              title="Add to a course playlist"
                            >
                              <ListPlus className="w-3.5 h-3.5 mr-1" /> Playlist
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
      </DashboardShell>
    </UniversalLayout>
  );
};

export default YouTubeChannel;
