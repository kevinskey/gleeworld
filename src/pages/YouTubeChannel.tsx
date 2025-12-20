import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Youtube, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { YouTubeVideoModal } from '@/components/youtube/YouTubeVideoModal';

interface YouTubeVideo {
  id: string;
  video_id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  duration: string;
  view_count: number;
  published_at: string;
}

const VIDEOS_PER_PAGE = 12;

const formatViewCount = (count: number): string => {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export const YouTubeChannel: React.FC = () => {
  const navigate = useNavigate();
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<YouTubeVideo | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const fetchVideos = useCallback(async (offset: number = 0, append: boolean = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      // Get total count
      if (!append) {
        const { count } = await supabase
          .from('youtube_videos')
          .select('*', { count: 'exact', head: true });
        setTotalCount(count || 0);
      }

      const { data, error } = await supabase
        .from('youtube_videos')
        .select('id, video_id, title, description, thumbnail_url, duration, view_count, published_at')
        .order('published_at', { ascending: false })
        .range(offset, offset + VIDEOS_PER_PAGE - 1);

      if (!error && data) {
        if (append) {
          setVideos(prev => [...prev, ...data]);
        } else {
          setVideos(data);
        }
        setHasMore(data.length === VIDEOS_PER_PAGE);
      }
    } catch (err) {
      console.error('Error fetching videos:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchVideos(0, false);
  }, [fetchVideos]);

  // Infinite scroll observer
  useEffect(() => {
    if (loading) return;

    const handleObserver = (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting && hasMore && !loadingMore) {
        fetchVideos(videos.length, true);
      }
    };

    observerRef.current = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: '100px',
      threshold: 0.1
    });

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [loading, hasMore, loadingMore, videos.length, fetchVideos]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/')}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-destructive flex items-center justify-center">
                  <Youtube className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground">Spelman College Glee Club</h1>
                  <p className="text-sm text-muted-foreground">
                    {totalCount > 0 ? `${totalCount} videos` : `${videos.length} videos`}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-destructive" />
          </div>
        ) : videos.length === 0 ? (
          <div className="text-center py-20">
            <Youtube className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
            <h2 className="text-xl font-semibold text-foreground mb-2">No videos yet</h2>
            <p className="text-muted-foreground">Videos will appear here once they're synced.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {videos.map((video) => (
                <div
                  key={video.id}
                  className="group cursor-pointer rounded-xl overflow-hidden bg-card border border-border hover:border-destructive/50 transition-all hover:shadow-lg"
                  onClick={() => setSelectedVideo(video)}
                >
                  <div className="aspect-video relative">
                    <img
                      src={video.thumbnail_url || `https://img.youtube.com/vi/${video.video_id}/hqdefault.jpg`}
                      alt={video.title}
                      className="w-full h-full object-cover"
                    />
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
                  </div>
                  <div className="p-4">
                    <h3 className="font-medium text-foreground line-clamp-2 mb-2 group-hover:text-destructive transition-colors">
                      {video.title}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {video.view_count > 0 && (
                        <>
                          <span>{formatViewCount(video.view_count)} views</span>
                          <span>•</span>
                        </>
                      )}
                      <span>{formatDate(video.published_at)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Infinite scroll trigger */}
            <div ref={loadMoreRef} className="flex justify-center py-8">
              {loadingMore && (
                <Loader2 className="h-6 w-6 animate-spin text-destructive" />
              )}
              {!hasMore && videos.length > 0 && (
                <p className="text-sm text-muted-foreground">All videos loaded</p>
              )}
            </div>
          </>
        )}
      </main>

      {/* Video Modal */}
      <YouTubeVideoModal
        isOpen={!!selectedVideo}
        onClose={() => setSelectedVideo(null)}
        videoId={selectedVideo?.video_id || ''}
        title={selectedVideo?.title}
      />
    </div>
  );
};

export default YouTubeChannel;
