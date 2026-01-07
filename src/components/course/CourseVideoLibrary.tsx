import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { 
  Video, Play, RefreshCw, Plus, Search, ExternalLink, Trash2, 
  Youtube, Clock, Eye, Calendar, Star, StarOff, Link2, X
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { 
  extractYouTubeVideoId, 
  getYouTubeThumbnail, 
  formatYouTubeDuration,
  DEFAULT_COURSE_CHANNELS,
  GLEE_WORLD_RADIO_CHANNEL_HANDLE
} from '@/utils/youtubeUtils';
import { YouTubeVideoModal } from '@/components/youtube/YouTubeVideoModal';

interface YouTubeVideo {
  id: string;
  video_id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  duration: string;
  published_at: string;
  view_count: number;
  video_url: string;
  is_featured?: boolean;
  channel_id?: string;
}

interface YouTubeChannel {
  id: string;
  channel_id: string;
  channel_name: string;
  channel_url: string;
  subscriber_count: number;
  video_count: number;
}

interface CourseVideoLibraryProps {
  courseId: string;
  isInstructor?: boolean;
}

export const CourseVideoLibrary: React.FC<CourseVideoLibraryProps> = ({ 
  courseId, 
  isInstructor = false 
}) => {
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [channels, setChannels] = useState<YouTubeChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeChannel, setActiveChannel] = useState<string>('all');
  const [selectedVideo, setSelectedVideo] = useState<YouTubeVideo | null>(null);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  
  // Add channel dialog
  const [addChannelOpen, setAddChannelOpen] = useState(false);
  const [newChannelInput, setNewChannelInput] = useState('');
  const [addingChannel, setAddingChannel] = useState(false);
  
  // Add video by URL dialog
  const [addVideoOpen, setAddVideoOpen] = useState(false);
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [addingVideo, setAddingVideo] = useState(false);

  // Fetch videos and channels
  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch channels
      const { data: channelsData, error: channelsError } = await supabase
        .from('youtube_channels')
        .select('*')
        .order('channel_name');
      
      if (channelsError) throw channelsError;
      setChannels(channelsData || []);
      
      // Fetch videos
      const { data: videosData, error: videosError } = await supabase
        .from('youtube_videos')
        .select('*')
        .order('published_at', { ascending: false })
        .limit(100);
      
      if (videosError) throw videosError;
      setVideos(videosData || []);
      
    } catch (error) {
      console.error('Error fetching video library:', error);
      toast.error('Failed to load video library');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [courseId]);

  // Sync channel videos
  const syncChannel = async (channelInput: string) => {
    try {
      setSyncing(true);
      toast.info(`Syncing videos from ${channelInput}...`);
      
      const { data, error } = await supabase.functions.invoke('sync-youtube-videos', {
        body: { channelInput, maxResults: 25 }
      });
      
      if (error) throw error;
      
      await fetchData();
      toast.success(`Synced ${data?.videosAdded || 0} videos successfully!`);
    } catch (error) {
      console.error('Error syncing channel:', error);
      toast.error('Failed to sync channel. Please try again.');
    } finally {
      setSyncing(false);
    }
  };

  // Sync default GleeWorld Radio channel
  const syncDefaultChannel = () => {
    syncChannel(GLEE_WORLD_RADIO_CHANNEL_HANDLE);
  };

  // Add new channel
  const handleAddChannel = async () => {
    if (!newChannelInput.trim()) return;
    
    try {
      setAddingChannel(true);
      await syncChannel(newChannelInput.trim());
      setNewChannelInput('');
      setAddChannelOpen(false);
    } catch (error) {
      console.error('Error adding channel:', error);
    } finally {
      setAddingChannel(false);
    }
  };

  // Add video by URL
  const handleAddVideoByUrl = async () => {
    if (!newVideoUrl.trim()) return;
    
    const videoId = extractYouTubeVideoId(newVideoUrl);
    if (!videoId) {
      toast.error('Invalid YouTube URL');
      return;
    }
    
    try {
      setAddingVideo(true);
      
      // Check if video already exists
      const { data: existing } = await supabase
        .from('youtube_videos')
        .select('id')
        .eq('video_id', videoId)
        .maybeSingle();
      
      if (existing) {
        toast.info('This video is already in the library');
        setNewVideoUrl('');
        setAddVideoOpen(false);
        return;
      }
      
      // Get or create a default channel for manual additions
      let defaultChannelId = channels[0]?.id;
      
      if (!defaultChannelId) {
        // Create a placeholder channel for manual additions
        const { data: newChannel, error: channelError } = await supabase
          .from('youtube_channels')
          .insert({
            channel_id: 'manual_additions',
            channel_name: 'Manual Additions',
            channel_url: '',
            subscriber_count: 0,
            video_count: 0
          })
          .select('id')
          .single();
        
        if (channelError && !channelError.message.includes('duplicate')) {
          throw channelError;
        }
        
        defaultChannelId = newChannel?.id || channels[0]?.id;
      }
      
      if (!defaultChannelId) {
        toast.error('Please sync a channel first before adding individual videos');
        setAddingVideo(false);
        return;
      }
      
      // Add basic video info (will be enriched by sync later)
      const { error } = await supabase
        .from('youtube_videos')
        .insert({
          channel_id: defaultChannelId,
          video_id: videoId,
          title: `Video ${videoId}`,
          description: '',
          thumbnail_url: getYouTubeThumbnail(videoId, 'high'),
          video_url: `https://www.youtube.com/watch?v=${videoId}`,
          duration: 'PT0S',
          view_count: 0
        });
      
      if (error) throw error;
      
      await fetchData();
      toast.success('Video added to library!');
      setNewVideoUrl('');
      setAddVideoOpen(false);
    } catch (error) {
      console.error('Error adding video:', error);
      toast.error('Failed to add video');
    } finally {
      setAddingVideo(false);
    }
  };

  // Toggle featured status
  const toggleFeatured = async (video: YouTubeVideo) => {
    try {
      const { error } = await supabase
        .from('youtube_videos')
        .update({ is_featured: !video.is_featured })
        .eq('id', video.id);
      
      if (error) throw error;
      
      setVideos(prev => prev.map(v => 
        v.id === video.id ? { ...v, is_featured: !v.is_featured } : v
      ));
      
      toast.success(video.is_featured ? 'Removed from featured' : 'Added to featured');
    } catch (error) {
      console.error('Error toggling featured:', error);
      toast.error('Failed to update video');
    }
  };

  // Delete video
  const deleteVideo = async (videoId: string) => {
    try {
      const { error } = await supabase
        .from('youtube_videos')
        .delete()
        .eq('id', videoId);
      
      if (error) throw error;
      
      setVideos(prev => prev.filter(v => v.id !== videoId));
      toast.success('Video removed from library');
    } catch (error) {
      console.error('Error deleting video:', error);
      toast.error('Failed to remove video');
    }
  };

  // Filter videos
  const filteredVideos = videos.filter(video => {
    const matchesSearch = !searchQuery || 
      video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      video.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesChannel = activeChannel === 'all' || 
      video.channel_id === activeChannel ||
      (activeChannel === 'featured' && video.is_featured);
    
    return matchesSearch && matchesChannel;
  });

  // Play video
  const playVideo = (video: YouTubeVideo) => {
    setSelectedVideo(video);
    setVideoModalOpen(true);
  };

  const VideoCard = ({ video }: { video: YouTubeVideo }) => (
    <Card className="group overflow-hidden hover:ring-2 hover:ring-primary/50 transition-all cursor-pointer">
      <div className="relative aspect-video" onClick={() => playVideo(video)}>
        <img 
          src={video.thumbnail_url || getYouTubeThumbnail(video.video_id, 'high')}
          alt={video.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="bg-red-600 rounded-full p-3">
            <Play className="h-6 w-6 text-white fill-white" />
          </div>
        </div>
        {video.duration && video.duration !== 'PT0S' && (
          <Badge className="absolute bottom-2 right-2 bg-black/80 text-white text-xs">
            {formatYouTubeDuration(video.duration)}
          </Badge>
        )}
        {video.is_featured && (
          <Badge className="absolute top-2 left-2 bg-yellow-500 text-black text-xs">
            <Star className="h-3 w-3 mr-1" /> Featured
          </Badge>
        )}
      </div>
      <CardContent className="p-3">
        <h3 className="font-medium text-sm line-clamp-2 mb-2">{video.title}</h3>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            {video.view_count > 0 && (
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {video.view_count.toLocaleString()}
              </span>
            )}
            {video.published_at && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(video.published_at), 'MMM d, yyyy')}
              </span>
            )}
          </div>
          {isInstructor && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => { e.stopPropagation(); toggleFeatured(video); }}
              >
                {video.is_featured ? (
                  <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                ) : (
                  <StarOff className="h-3 w-3" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-destructive"
                onClick={(e) => { e.stopPropagation(); deleteVideo(video.id); }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Youtube className="h-5 w-5 text-red-600" />
            Video Library
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="space-y-2">
                <Skeleton className="aspect-video rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Youtube className="h-5 w-5 text-red-600" />
              Video Library
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={syncDefaultChannel}
                disabled={syncing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                Sync GleeWorld Radio
              </Button>
              {isInstructor && (
                <>
                  <Dialog open={addChannelOpen} onOpenChange={setAddChannelOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Channel
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add YouTube Channel</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Channel URL or Handle</Label>
                          <Input
                            value={newChannelInput}
                            onChange={(e) => setNewChannelInput(e.target.value)}
                            placeholder="@ChannelHandle or youtube.com/@channel"
                          />
                          <p className="text-xs text-muted-foreground">
                            Enter the YouTube channel handle (e.g., @GleeWorldRadio) or full URL
                          </p>
                        </div>
                        <div className="border rounded-lg p-3 bg-muted/50">
                          <h4 className="text-sm font-medium mb-2">Quick Add:</h4>
                          <div className="flex flex-wrap gap-2">
                            {DEFAULT_COURSE_CHANNELS.map(ch => (
                              <Button
                                key={ch.handle}
                                variant="secondary"
                                size="sm"
                                onClick={() => {
                                  setNewChannelInput(ch.handle);
                                }}
                              >
                                {ch.name}
                              </Button>
                            ))}
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setAddChannelOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleAddChannel} disabled={addingChannel || !newChannelInput.trim()}>
                          {addingChannel ? (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              Syncing...
                            </>
                          ) : (
                            <>
                              <Plus className="h-4 w-4 mr-2" />
                              Add & Sync
                            </>
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  
                  <Dialog open={addVideoOpen} onOpenChange={setAddVideoOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Link2 className="h-4 w-4 mr-2" />
                        Add Video
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Video by URL</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>YouTube Video URL</Label>
                          <Input
                            value={newVideoUrl}
                            onChange={(e) => setNewVideoUrl(e.target.value)}
                            placeholder="https://youtube.com/watch?v=..."
                          />
                        </div>
                        {newVideoUrl && extractYouTubeVideoId(newVideoUrl) && (
                          <div className="border rounded-lg overflow-hidden">
                            <img 
                              src={getYouTubeThumbnail(extractYouTubeVideoId(newVideoUrl)!, 'medium')}
                              alt="Video preview"
                              className="w-full aspect-video object-cover"
                            />
                          </div>
                        )}
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setAddVideoOpen(false)}>
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleAddVideoByUrl} 
                          disabled={addingVideo || !extractYouTubeVideoId(newVideoUrl)}
                        >
                          {addingVideo ? (
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Plus className="h-4 w-4 mr-2" />
                          )}
                          Add Video
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search videos..."
                className="pl-9"
              />
            </div>
            <Tabs value={activeChannel} onValueChange={setActiveChannel} className="w-full sm:w-auto">
              <TabsList className="grid grid-cols-3 w-full sm:w-auto">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="featured">Featured</TabsTrigger>
                {channels.slice(0, 1).map(ch => (
                  <TabsTrigger key={ch.id} value={ch.id} className="truncate max-w-[100px]">
                    {ch.channel_name?.split(' ')[0] || 'Channel'}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          {/* Video Grid */}
          {filteredVideos.length === 0 ? (
            <div className="text-center py-12">
              <Youtube className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No videos yet</h3>
              <p className="text-muted-foreground mb-4">
                {videos.length === 0 
                  ? 'Sync a YouTube channel to populate your video library'
                  : 'No videos match your search'}
              </p>
              {videos.length === 0 && (
                <Button onClick={syncDefaultChannel} disabled={syncing}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                  Sync GleeWorld Radio
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredVideos.map(video => (
                <VideoCard key={video.id} video={video} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Channels Section */}
      {channels.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">YouTube Channels</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {channels.map(channel => (
                <div 
                  key={channel.id}
                  className="flex items-center gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="bg-red-600 text-white rounded-full p-2">
                    <Youtube className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">{channel.channel_name}</h4>
                    <p className="text-xs text-muted-foreground">
                      {channel.video_count} videos • {channel.subscriber_count?.toLocaleString()} subscribers
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => syncChannel(`@${channel.channel_name?.replace(/\s/g, '')}`)}
                      disabled={syncing}
                    >
                      <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                    </Button>
                    <a
                      href={channel.channel_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center h-8 w-8 hover:bg-accent rounded-md"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Video Modal */}
      <YouTubeVideoModal
        isOpen={videoModalOpen}
        onClose={() => {
          setVideoModalOpen(false);
          setSelectedVideo(null);
        }}
        videoId={selectedVideo?.video_id || ''}
        title={selectedVideo?.title}
      />
    </div>
  );
};

export default CourseVideoLibrary;
