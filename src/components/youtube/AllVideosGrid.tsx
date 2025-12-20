import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Youtube, Loader2, ArrowUpDown, Calendar, Eye, SortAsc, SortDesc } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { YouTubeVideoModal } from '@/components/youtube/YouTubeVideoModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface YouTubeVideo {
  id: string;
  video_id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  published_at: string;
  view_count: number;
  duration: string | null;
}

type SortOption = 'date_desc' | 'date_asc' | 'views_desc' | 'views_asc' | 'title_asc' | 'title_desc';

const VIDEOS_PER_PAGE = 12;

const sortOptions: { value: SortOption; label: string; icon: React.ReactNode }[] = [
  { value: 'date_desc', label: 'Newest First', icon: <Calendar className="h-4 w-4" /> },
  { value: 'date_asc', label: 'Oldest First', icon: <Calendar className="h-4 w-4" /> },
  { value: 'views_desc', label: 'Most Views', icon: <Eye className="h-4 w-4" /> },
  { value: 'views_asc', label: 'Least Views', icon: <Eye className="h-4 w-4" /> },
  { value: 'title_asc', label: 'Title (A-Z)', icon: <SortAsc className="h-4 w-4" /> },
  { value: 'title_desc', label: 'Title (Z-A)', icon: <SortDesc className="h-4 w-4" /> },
];

const formatViewCount = (count: number): string => {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
};

interface AllVideosGridProps {
  maxHeight?: string;
  showTitle?: boolean;
  className?: string;
}

export const AllVideosGrid: React.FC<AllVideosGridProps> = ({
  maxHeight = '600px',
  showTitle = true,
  className = ''
}) => {
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedVideo, setSelectedVideo] = useState<YouTubeVideo | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('date_desc');
  const scrollRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const getSortConfig = (sort: SortOption) => {
    switch (sort) {
      case 'date_desc':
        return { column: 'published_at', ascending: false };
      case 'date_asc':
        return { column: 'published_at', ascending: true };
      case 'views_desc':
        return { column: 'view_count', ascending: false };
      case 'views_asc':
        return { column: 'view_count', ascending: true };
      case 'title_asc':
        return { column: 'title', ascending: true };
      case 'title_desc':
        return { column: 'title', ascending: false };
      default:
        return { column: 'published_at', ascending: false };
    }
  };

  const fetchVideos = useCallback(async (offset: number = 0, append: boolean = false, sort: SortOption = sortBy) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      // Get total count on first load
      if (!append) {
        const { count } = await supabase
          .from('youtube_videos')
          .select('*', { count: 'exact', head: true });
        setTotalCount(count || 0);
      }

      const { column, ascending } = getSortConfig(sort);

      const { data, error } = await supabase
        .from('youtube_videos')
        .select('id, video_id, title, description, thumbnail_url, published_at, view_count, duration')
        .order(column, { ascending })
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
  }, [sortBy]);

  useEffect(() => {
    fetchVideos(0, false, sortBy);
  }, [sortBy]);

  const handleSortChange = (newSort: SortOption) => {
    if (newSort !== sortBy) {
      setSortBy(newSort);
      setVideos([]);
      setHasMore(true);
      if (scrollRef.current) {
        scrollRef.current.scrollTop = 0;
      }
    }
  };

  // Infinite scroll handler
  const handleScroll = useCallback(() => {
    if (!scrollRef.current || loadingMore || !hasMore) return;
    
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    if (scrollHeight - scrollTop - clientHeight < 200) {
      fetchVideos(videos.length, true, sortBy);
    }
  }, [loadingMore, hasMore, videos.length, fetchVideos, sortBy]);

  const getVideoThumbnail = (video: YouTubeVideo) => {
    if (video.thumbnail_url) return video.thumbnail_url;
    return `https://img.youtube.com/vi/${video.video_id}/hqdefault.jpg`;
  };

  const currentSortLabel = sortOptions.find(opt => opt.value === sortBy)?.label || 'Sort';

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        {showTitle && <Skeleton className="h-10 w-64 mx-auto" />}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="aspect-video rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (videos.length === 0 && !loading) {
    return null;
  }

  return (
    <div className={className}>
      {showTitle && (
        <div className="text-center mb-4 md:mb-6">
          <div className="flex items-center justify-center gap-2 sm:gap-3 mb-2">
            <Youtube className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 text-red-500" />
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-dancing font-bold text-primary">
              All Videos
            </h2>
            <Youtube className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 text-red-500" />
          </div>
          <p className="text-primary/80 text-xs sm:text-sm md:text-base font-medium">
            {totalCount > 0 ? `${totalCount} videos from our channel` : 'Browse our complete video collection'}
          </p>
        </div>
      )}

      {/* Sort Controls */}
      <div className="flex justify-end mb-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-md">
              <ArrowUpDown className="h-4 w-4" />
              <span className="hidden sm:inline">{currentSortLabel}</span>
              <span className="sm:hidden">Sort</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-white dark:bg-popover border border-border shadow-xl z-50">
            {sortOptions.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => handleSortChange(option.value)}
                className={`cursor-pointer ${sortBy === option.value ? 'bg-primary/10 text-primary font-medium' : 'text-foreground'}`}
              >
                <span className="flex items-center gap-2">
                  {option.icon}
                  {option.label}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Scrollable Video Grid */}
      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        className="overflow-y-auto rounded-lg"
        style={{ maxHeight }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4 p-1">
          {videos.map((video) => (
            <Card 
              key={video.id}
              className="group cursor-pointer overflow-hidden bg-white dark:bg-card border border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-xl shadow-md"
              onClick={() => setSelectedVideo(video)}
            >
              <div className="relative aspect-video overflow-hidden">
                <img
                  src={getVideoThumbnail(video)}
                  alt={video.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  onError={(e) => {
                    e.currentTarget.src = `https://img.youtube.com/vi/${video.video_id}/hqdefault.jpg`;
                  }}
                />
                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/50 transition-colors duration-300" />
                
                {/* Play button overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-red-600 rounded-full p-3 transform transition-transform duration-300 group-hover:scale-110 shadow-xl">
                    <Play className="h-5 w-5 md:h-6 md:w-6 text-white fill-white" />
                  </div>
                </div>

                {/* Duration badge */}
                {video.duration && (
                  <span className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-0.5 rounded">
                    {video.duration}
                  </span>
                )}
              </div>
              
              <CardContent className="p-3 bg-white dark:bg-card">
                <h3 className="font-semibold text-gray-900 dark:text-foreground line-clamp-2 text-sm mb-1">
                  {video.title}
                </h3>
                <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-muted-foreground">
                  {video.view_count > 0 && (
                    <>
                      <span>{formatViewCount(video.view_count)} views</span>
                      <span>•</span>
                    </>
                  )}
                  <span>{new Date(video.published_at).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Loading indicator */}
        <div ref={loadMoreRef} className="flex justify-center py-6">
          {loadingMore && (
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          )}
          {!hasMore && videos.length > 0 && (
            <p className="text-sm text-primary/70 font-medium">All videos loaded</p>
          )}
        </div>
      </div>

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

export default AllVideosGrid;
