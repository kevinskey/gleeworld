import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Play, Youtube, ExternalLink, ListVideo } from 'lucide-react';

interface Playlist {
  id: string;
  title: string;
  description: string | null;
  playlist_url: string | null;
  is_public: boolean;
}

interface PlaylistVideo {
  id: string;
  video_id: string;
  display_order: number;
  youtube_videos?: {
    id: string;
    video_id: string;
    title: string;
    thumbnail_url: string;
    duration: string;
  };
}

interface CoursePlaylistDisplayProps {
  courseId: string;
  className?: string;
}

export const CoursePlaylistDisplay: React.FC<CoursePlaylistDisplayProps> = ({ 
  courseId,
  className 
}) => {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [playlistVideos, setPlaylistVideos] = useState<Record<string, PlaylistVideo[]>>({});
  const [activePlaylist, setActivePlaylist] = useState<string | null>(null);
  const [activeVideo, setActiveVideo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlaylists();
  }, [courseId]);

  const fetchPlaylists = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_course_playlists')
        .select('*')
        .eq('course_id', courseId)
        .eq('is_public', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setPlaylists(data || []);
      
      if (data && data.length > 0) {
        setActivePlaylist(data[0].id);
        // Fetch videos for the first playlist
        fetchPlaylistVideos(data[0].id);
      }
    } catch (err) {
      console.error('Error fetching playlists:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlaylistVideos = async (playlistId: string) => {
    if (playlistVideos[playlistId]) return;
    
    try {
      const { data, error } = await supabase
        .from('gw_course_playlist_videos')
        .select(`
          id,
          video_id,
          display_order,
          youtube_videos (
            id,
            video_id,
            title,
            thumbnail_url,
            duration
          )
        `)
        .eq('playlist_id', playlistId)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setPlaylistVideos(prev => ({
        ...prev,
        [playlistId]: data || []
      }));
      
      // Set first video as active if no video selected
      if (data && data.length > 0 && !activeVideo) {
        const firstVideo = data[0].youtube_videos;
        if (firstVideo) {
          setActiveVideo(firstVideo.video_id);
        }
      }
    } catch (err) {
      console.error('Error fetching playlist videos:', err);
    }
  };

  const handlePlaylistChange = (playlistId: string) => {
    setActivePlaylist(playlistId);
    setActiveVideo(null);
    fetchPlaylistVideos(playlistId);
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-1/3" />
            <div className="aspect-video bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (playlists.length === 0) {
    return null; // Don't show anything if no playlists
  }

  const currentVideos = activePlaylist ? playlistVideos[activePlaylist] || [] : [];
  const currentPlaylist = playlists.find(p => p.id === activePlaylist);

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Youtube className="h-5 w-5 text-red-500" />
            Course Videos
          </CardTitle>
          {currentPlaylist?.playlist_url && (
            <Button variant="ghost" size="sm" asChild>
              <a 
                href={currentPlaylist.playlist_url} 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                YouTube
              </a>
            </Button>
          )}
        </div>
        
        {/* Playlist Tabs */}
        {playlists.length > 1 && (
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-2 pt-2">
              {playlists.map((playlist) => (
                <Button
                  key={playlist.id}
                  variant={activePlaylist === playlist.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handlePlaylistChange(playlist.id)}
                  className="flex-shrink-0"
                >
                  <ListVideo className="h-4 w-4 mr-2" />
                  {playlist.title}
                </Button>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Active Video Player */}
        {activeVideo && (
          <div className="aspect-video bg-black rounded-lg overflow-hidden">
            <iframe
              src={`https://www.youtube.com/embed/${activeVideo}?rel=0&modestbranding=1`}
              title="Video Player"
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}

        {/* Video List */}
        {currentVideos.length > 0 && (
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-3 pb-2">
              {currentVideos.map((pv) => {
                const video = pv.youtube_videos;
                if (!video) return null;
                
                return (
                  <button
                    key={pv.id}
                    onClick={() => setActiveVideo(video.video_id)}
                    className={`flex-shrink-0 w-48 rounded-lg overflow-hidden border transition-all ${
                      activeVideo === video.video_id 
                        ? 'ring-2 ring-primary border-primary' 
                        : 'border-border hover:border-muted-foreground'
                    }`}
                  >
                    <div className="relative aspect-video bg-muted">
                      <img
                        src={video.thumbnail_url || `https://img.youtube.com/vi/${video.video_id}/mqdefault.jpg`}
                        alt={video.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <Play className="h-8 w-8 text-white" />
                      </div>
                      {video.duration && (
                        <Badge className="absolute bottom-1 right-1 text-xs bg-black/70">
                          {video.duration}
                        </Badge>
                      )}
                      {activeVideo === video.video_id && (
                        <Badge className="absolute top-1 left-1 text-xs bg-primary">
                          Playing
                        </Badge>
                      )}
                    </div>
                    <div className="p-2">
                      <p className="text-xs font-medium text-left line-clamp-2 whitespace-normal">
                        {video.title}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        )}

        {/* Empty State */}
        {currentVideos.length === 0 && activePlaylist && (
          <div className="text-center py-8 text-muted-foreground">
            <Youtube className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No videos in this playlist yet.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
