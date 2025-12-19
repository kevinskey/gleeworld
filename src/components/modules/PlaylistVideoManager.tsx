import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Search, Youtube, GripVertical, Check } from 'lucide-react';

interface Video {
  id: string;
  video_id: string;
  title: string;
  thumbnail_url: string | null;
  published_at?: string;
}

interface PlaylistVideo {
  id: string;
  playlist_id: string;
  video_id: string;
  display_order: number;
  video?: Video;
}

interface PlaylistVideoManagerProps {
  playlistId: string;
  playlistTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PlaylistVideoManager: React.FC<PlaylistVideoManagerProps> = ({
  playlistId,
  playlistTitle,
  open,
  onOpenChange,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [playlistVideos, setPlaylistVideos] = useState<PlaylistVideo[]>([]);
  const [availableVideos, setAvailableVideos] = useState<Video[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchPlaylistVideos();
      fetchAvailableVideos();
    }
  }, [open, playlistId]);

  const fetchPlaylistVideos = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_course_playlist_videos')
        .select(`
          id,
          playlist_id,
          video_id,
          display_order
        `)
        .eq('playlist_id', playlistId)
        .order('display_order');

      if (error) throw error;

      // Fetch video details for each playlist video
      if (data && data.length > 0) {
        const videoIds = data.map(pv => pv.video_id);
        const { data: videos } = await supabase
          .from('youtube_videos')
          .select('id, video_id, title, thumbnail_url')
          .in('id', videoIds);

        const videosMap = new Map(videos?.map(v => [v.id, v]) || []);
        const enrichedData = data.map(pv => ({
          ...pv,
          video: videosMap.get(pv.video_id)
        }));
        setPlaylistVideos(enrichedData);
      } else {
        setPlaylistVideos([]);
      }
    } catch (err) {
      console.error('Error fetching playlist videos:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableVideos = async () => {
    try {
      const { data, error } = await supabase
        .from('youtube_videos')
        .select('id, video_id, title, thumbnail_url, published_at')
        .order('published_at', { ascending: false });

      if (error) throw error;
      setAvailableVideos(data || []);
    } catch (err) {
      console.error('Error fetching videos:', err);
    }
  };

  const handleAddVideo = async (video: Video) => {
    try {
      setAdding(video.id);
      const maxOrder = Math.max(...playlistVideos.map(pv => pv.display_order), 0);

      const { error } = await supabase
        .from('gw_course_playlist_videos')
        .insert({
          playlist_id: playlistId,
          video_id: video.id,
          display_order: maxOrder + 1,
          added_by: user?.id
        });

      if (error) throw error;
      toast({ title: 'Video added to playlist' });
      fetchPlaylistVideos();
    } catch (err: any) {
      toast({ title: 'Failed to add video', description: err.message, variant: 'destructive' });
    } finally {
      setAdding(null);
    }
  };

  const handleRemoveVideo = async (playlistVideoId: string) => {
    try {
      const { error } = await supabase
        .from('gw_course_playlist_videos')
        .delete()
        .eq('id', playlistVideoId);

      if (error) throw error;
      toast({ title: 'Video removed from playlist' });
      fetchPlaylistVideos();
    } catch (err: any) {
      toast({ title: 'Failed to remove video', description: err.message, variant: 'destructive' });
    }
  };

  const playlistVideoIds = new Set(playlistVideos.map(pv => pv.video_id));

  const filteredVideos = availableVideos.filter(video =>
    video.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Youtube className="h-5 w-5 text-destructive" />
            Manage Videos: {playlistTitle}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {/* Current Playlist Videos */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              Playlist Videos
              <Badge variant="secondary">{playlistVideos.length}</Badge>
            </h3>
            <ScrollArea className="h-[400px] border rounded-lg p-2">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : playlistVideos.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Youtube className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No videos in this playlist yet.</p>
                  <p className="text-xs">Add videos from the right panel.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {playlistVideos.map((pv, index) => (
                    <div
                      key={pv.id}
                      className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                      <span className="text-xs text-muted-foreground w-5">{index + 1}</span>
                      <div className="w-16 h-9 rounded overflow-hidden bg-muted flex-shrink-0">
                        <img
                          src={pv.video?.thumbnail_url || `https://img.youtube.com/vi/${pv.video?.video_id}/mqdefault.jpg`}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className="flex-1 text-sm truncate">{pv.video?.title || 'Unknown'}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => handleRemoveVideo(pv.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Available Videos */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Add Videos from Channel</h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search videos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <ScrollArea className="h-[350px] border rounded-lg p-2">
              <div className="space-y-2">
                {filteredVideos.map((video) => {
                  const isInPlaylist = playlistVideoIds.has(video.id);
                  return (
                    <div
                      key={video.id}
                      className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
                        isInPlaylist ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted'
                      }`}
                    >
                      <div className="w-20 h-11 rounded overflow-hidden bg-muted flex-shrink-0">
                        <img
                          src={video.thumbnail_url || `https://img.youtube.com/vi/${video.video_id}/mqdefault.jpg`}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className="flex-1 text-sm line-clamp-2">{video.title}</span>
                      {isInPlaylist ? (
                        <Badge variant="secondary" className="flex-shrink-0">
                          <Check className="h-3 w-3 mr-1" />
                          Added
                        </Badge>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 flex-shrink-0"
                          onClick={() => handleAddVideo(video)}
                          disabled={adding === video.id}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  );
                })}
                {filteredVideos.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-sm">No videos found.</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
