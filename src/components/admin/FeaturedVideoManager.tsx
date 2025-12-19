import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Star, 
  Plus, 
  Trash2, 
  GripVertical, 
  Youtube,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff
} from 'lucide-react';

interface FeaturedVideo {
  id: string;
  video_id: string;
  display_order: number;
  is_active: boolean;
  youtube_videos?: {
    video_id: string;
    title: string;
    thumbnail_url: string;
    duration: string;
  };
}

interface AvailableVideo {
  id: string;
  video_id: string;
  title: string;
  thumbnail_url: string;
}

export const FeaturedVideoManager: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [featuredVideos, setFeaturedVideos] = useState<FeaturedVideo[]>([]);
  const [availableVideos, setAvailableVideos] = useState<AvailableVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);

  useEffect(() => {
    fetchFeaturedVideos();
    fetchAvailableVideos();
  }, []);

  const fetchFeaturedVideos = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_featured_videos')
        .select(`
          id,
          video_id,
          display_order,
          is_active,
          youtube_videos (
            video_id,
            title,
            thumbnail_url,
            duration
          )
        `)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setFeaturedVideos((data || []) as FeaturedVideo[]);
    } catch (err) {
      console.error('Error fetching featured videos:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableVideos = async () => {
    try {
      const { data, error } = await supabase
        .from('youtube_videos')
        .select('id, video_id, title, thumbnail_url')
        .order('title');

      if (error) throw error;
      setAvailableVideos(data || []);
    } catch (err) {
      console.error('Error fetching available videos:', err);
    }
  };

  const handleAddFeatured = async (videoId: string) => {
    try {
      const maxOrder = Math.max(...featuredVideos.map(v => v.display_order), 0);
      
      const { error } = await supabase
        .from('gw_featured_videos')
        .insert({
          video_id: videoId,
          display_order: maxOrder + 1,
          is_active: true,
          created_by: user?.id
        });

      if (error) throw error;
      toast({ title: 'Video added to featured carousel' });
      fetchFeaturedVideos();
      setShowAddDialog(false);
    } catch (err) {
      console.error('Error adding featured video:', err);
      toast({ title: 'Failed to add video', variant: 'destructive' });
    }
  };

  const handleRemoveFeatured = async (id: string) => {
    try {
      const { error } = await supabase
        .from('gw_featured_videos')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Video removed from featured carousel' });
      setFeaturedVideos(prev => prev.filter(v => v.id !== id));
    } catch (err) {
      console.error('Error removing featured video:', err);
      toast({ title: 'Failed to remove video', variant: 'destructive' });
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('gw_featured_videos')
        .update({ is_active: !isActive })
        .eq('id', id);

      if (error) throw error;
      setFeaturedVideos(prev => prev.map(v => 
        v.id === id ? { ...v, is_active: !isActive } : v
      ));
    } catch (err) {
      console.error('Error toggling video status:', err);
    }
  };

  const handleReorder = async (id: string, direction: 'up' | 'down') => {
    const index = featuredVideos.findIndex(v => v.id === id);
    if (index === -1) return;
    
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= featuredVideos.length) return;

    const newVideos = [...featuredVideos];
    const [moved] = newVideos.splice(index, 1);
    newVideos.splice(newIndex, 0, moved);

    try {
      for (let i = 0; i < newVideos.length; i++) {
        await supabase
          .from('gw_featured_videos')
          .update({ display_order: i })
          .eq('id', newVideos[i].id);
      }
      
      setFeaturedVideos(newVideos.map((v, i) => ({ ...v, display_order: i })));
    } catch (err) {
      console.error('Error reordering videos:', err);
    }
  };

  const unfeaturedVideos = availableVideos.filter(
    av => !featuredVideos.some(fv => fv.video_id === av.id)
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-1/3" />
            <div className="h-20 bg-muted rounded" />
            <div className="h-20 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                Featured Video Carousel
              </CardTitle>
              <CardDescription>
                Manage videos displayed on the public landing page carousel
              </CardDescription>
            </div>
            <Button onClick={() => setShowAddDialog(!showAddDialog)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Video
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {showAddDialog && (
            <Card className="bg-muted/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Select a video to feature</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-64 overflow-y-auto">
                  {unfeaturedVideos.map((video) => (
                    <button
                      key={video.id}
                      onClick={() => handleAddFeatured(video.id)}
                      className="text-left rounded-lg overflow-hidden border border-border hover:border-primary transition-colors"
                    >
                      <div className="aspect-video bg-muted">
                        <img
                          src={video.thumbnail_url || `https://img.youtube.com/vi/${video.video_id}/mqdefault.jpg`}
                          alt={video.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-2">
                        <p className="text-xs font-medium line-clamp-2">{video.title}</p>
                      </div>
                    </button>
                  ))}
                  {unfeaturedVideos.length === 0 && (
                    <p className="col-span-full text-center text-muted-foreground py-4">
                      All videos are already featured
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {featuredVideos.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Youtube className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No featured videos yet</p>
              <p className="text-sm">Add videos to display them on the landing page</p>
            </div>
          ) : (
            <div className="space-y-2">
              {featuredVideos.map((video, index) => (
                <div
                  key={video.id}
                  className={`flex items-center gap-4 p-3 rounded-lg border ${
                    video.is_active ? 'bg-card' : 'bg-muted/50 opacity-60'
                  }`}
                >
                  <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                  
                  <div className="w-24 h-14 rounded overflow-hidden bg-muted flex-shrink-0">
                    <img
                      src={video.youtube_videos?.thumbnail_url || `https://img.youtube.com/vi/${video.youtube_videos?.video_id}/mqdefault.jpg`}
                      alt={video.youtube_videos?.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {video.youtube_videos?.title || 'Unknown Video'}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={video.is_active ? 'default' : 'secondary'}>
                        {video.is_active ? 'Active' : 'Hidden'}
                      </Badge>
                      {video.youtube_videos?.duration && (
                        <Badge variant="outline">{video.youtube_videos.duration}</Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleReorder(video.id, 'up')}
                      disabled={index === 0}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleReorder(video.id, 'down')}
                      disabled={index === featuredVideos.length - 1}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggleActive(video.id, video.is_active)}
                    >
                      {video.is_active ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveFeatured(video.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
