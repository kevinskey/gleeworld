import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { 
  Video, Search, ExternalLink, Library, Youtube, 
  Loader2, Play, Check, Plus, Link
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { extractYouTubeVideoId, getYouTubeThumbnail, DEFAULT_COURSE_CHANNELS } from '@/utils/youtubeUtils';

interface SelectedResource {
  title: string;
  url: string;
  description?: string;
  duration?: string;
  source: 'course' | 'media' | 'youtube' | 'manual';
}

interface ModuleResourcePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (resource: SelectedResource) => void;
  resourceType?: string;
  courseId?: string;
}

interface CourseVideo {
  id: string;
  title: string;
  description: string | null;
  youtube_url: string | null;
  video_path: string | null;
  video_type: string;
}

interface MediaItem {
  id: string;
  title: string;
  file_url: string | null;
  file_type: string | null;
  description: string | null;
}

interface YouTubeChannelVideo {
  video_id: string;
  title: string;
  thumbnail_url: string;
  published_at: string;
}

export const ModuleResourcePicker: React.FC<ModuleResourcePickerProps> = ({
  open,
  onOpenChange,
  onSelect,
  resourceType = 'video',
  courseId = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37' // MUS-240 UUID
}) => {
  const [activeTab, setActiveTab] = useState<'course' | 'media' | 'youtube' | 'manual'>('course');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Course videos
  const [courseVideos, setCourseVideos] = useState<CourseVideo[]>([]);
  
  // Media library
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  
  // YouTube
  const [ytVideos, setYtVideos] = useState<YouTubeChannelVideo[]>([]);
  const [ytChannel, setYtChannel] = useState(DEFAULT_COURSE_CHANNELS[0].handle);
  const [ytLoading, setYtLoading] = useState(false);
  
  // Manual entry
  const [manualUrl, setManualUrl] = useState('');
  const [manualTitle, setManualTitle] = useState('');
  const [manualDescription, setManualDescription] = useState('');
  const [manualDuration, setManualDuration] = useState('');

  useEffect(() => {
    if (open) {
      fetchCourseVideos();
      fetchMediaItems();
    }
  }, [open, courseId]);

  const fetchCourseVideos = async () => {
    try {
      const { data, error } = await supabase
        .from('course_video_resources')
        .select('id, title, description, youtube_url, video_path, video_type')
        .eq('course_id', courseId)
        .eq('is_published', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setCourseVideos(data || []);
    } catch (err) {
      console.error('Error fetching course videos:', err);
    }
  };

  const fetchMediaItems = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_media_library')
        .select('id, title, file_url, file_type, description')
        .or('file_type.ilike.%video%,file_type.ilike.%mp4%,file_type.eq.video')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setMediaItems(data || []);
    } catch (err) {
      console.error('Error fetching media items:', err);
    }
  };

  const fetchYouTubeVideos = async () => {
    try {
      setYtLoading(true);
      const { data, error } = await supabase.functions.invoke('youtube-channel-videos', {
        body: { channelInput: ytChannel, maxResults: 20 }
      });

      if (error) throw error;
      setYtVideos(data?.videos || []);
    } catch (err) {
      console.error('Error fetching YouTube videos:', err);
      toast.error('Failed to fetch YouTube videos');
    } finally {
      setYtLoading(false);
    }
  };

  const handleSelectCourseVideo = (video: CourseVideo) => {
    const url = video.youtube_url || video.video_path || '';
    onSelect({
      title: video.title,
      url,
      description: video.description || undefined,
      source: 'course'
    });
    onOpenChange(false);
  };

  const handleSelectMediaItem = (item: MediaItem) => {
    onSelect({
      title: item.title,
      url: item.file_url || '',
      description: item.description || undefined,
      source: 'media'
    });
    onOpenChange(false);
  };

  const handleSelectYouTubeVideo = (video: YouTubeChannelVideo) => {
    const url = `https://www.youtube.com/watch?v=${video.video_id}`;
    onSelect({
      title: video.title,
      url,
      source: 'youtube'
    });
    onOpenChange(false);
  };

  const handleManualSubmit = () => {
    if (!manualUrl.trim()) {
      toast.error('Please enter a URL');
      return;
    }
    
    // Auto-detect title from YouTube if possible
    let title = manualTitle.trim();
    if (!title) {
      const videoId = extractYouTubeVideoId(manualUrl);
      if (videoId) {
        title = 'YouTube Video';
      } else {
        title = 'Video Resource';
      }
    }

    onSelect({
      title,
      url: manualUrl.trim(),
      description: manualDescription.trim() || undefined,
      duration: manualDuration.trim() || undefined,
      source: 'manual'
    });
    
    // Reset form
    setManualUrl('');
    setManualTitle('');
    setManualDescription('');
    setManualDuration('');
    onOpenChange(false);
  };

  const filteredCourseVideos = courseVideos.filter(v =>
    v.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredMediaItems = mediaItems.filter(m =>
    m.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredYtVideos = ytVideos.filter(v =>
    v.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Select Video Resource
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="course" className="text-xs">
              <Library className="h-3.5 w-3.5 mr-1" />
              Course
            </TabsTrigger>
            <TabsTrigger value="media" className="text-xs">
              <Video className="h-3.5 w-3.5 mr-1" />
              Media
            </TabsTrigger>
            <TabsTrigger value="youtube" className="text-xs">
              <Youtube className="h-3.5 w-3.5 mr-1" />
              YouTube
            </TabsTrigger>
            <TabsTrigger value="manual" className="text-xs">
              <Link className="h-3.5 w-3.5 mr-1" />
              URL
            </TabsTrigger>
          </TabsList>

          {/* Search bar for list tabs */}
          {activeTab !== 'manual' && (
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search videos..."
                className="pl-9"
              />
            </div>
          )}

          {/* Course Videos Tab */}
          <TabsContent value="course" className="mt-0">
            <ScrollArea className="h-[400px]">
              {filteredCourseVideos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Video className="h-10 w-10 mb-2 opacity-50" />
                  <p className="text-sm">No course videos found</p>
                  <p className="text-xs">Add videos in the Resources tab first</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredCourseVideos.map((video) => {
                    const videoId = video.youtube_url ? extractYouTubeVideoId(video.youtube_url) : null;
                    const thumbnail = videoId ? getYouTubeThumbnail(videoId, 'medium') : null;

                    return (
                      <div
                        key={video.id}
                        onClick={() => handleSelectCourseVideo(video)}
                        className="flex gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
                      >
                        <div className="w-24 h-16 flex-shrink-0 rounded overflow-hidden bg-muted">
                          {thumbnail ? (
                            <img src={thumbnail} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Play className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm line-clamp-1">{video.title}</h4>
                          {video.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                              {video.description}
                            </p>
                          )}
                          <Badge variant="outline" className="text-xs mt-1">
                            {video.video_type === 'youtube' ? 'YouTube' : 'Upload'}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Media Library Tab */}
          <TabsContent value="media" className="mt-0">
            <ScrollArea className="h-[400px]">
              {filteredMediaItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Library className="h-10 w-10 mb-2 opacity-50" />
                  <p className="text-sm">No video files in media library</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredMediaItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleSelectMediaItem(item)}
                      className="flex gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
                    >
                      <div className="w-10 h-10 rounded bg-muted flex items-center justify-center flex-shrink-0">
                        <Video className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm line-clamp-1">{item.title}</h4>
                        {item.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* YouTube Channel Tab */}
          <TabsContent value="youtube" className="mt-0">
            <div className="flex gap-2 mb-3">
              <select
                value={ytChannel}
                onChange={(e) => setYtChannel(e.target.value)}
                className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                {DEFAULT_COURSE_CHANNELS.map((ch) => (
                  <option key={ch.handle} value={ch.handle}>
                    {ch.name}
                  </option>
                ))}
              </select>
              <Button 
                size="sm" 
                onClick={fetchYouTubeVideos}
                disabled={ytLoading}
              >
                {ytLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-1" />
                    Load
                  </>
                )}
              </Button>
            </div>

            <ScrollArea className="h-[350px]">
              {ytVideos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Youtube className="h-10 w-10 mb-2 opacity-50" />
                  <p className="text-sm">Click "Load" to fetch videos</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredYtVideos.map((video) => (
                    <div
                      key={video.video_id}
                      onClick={() => handleSelectYouTubeVideo(video)}
                      className="flex gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
                    >
                      <div className="w-24 h-16 flex-shrink-0 rounded overflow-hidden bg-muted">
                        <img 
                          src={video.thumbnail_url} 
                          alt="" 
                          className="w-full h-full object-cover" 
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm line-clamp-2">{video.title}</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(video.published_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Manual URL Entry Tab */}
          <TabsContent value="manual" className="mt-0">
            <div className="space-y-4 py-2">
              <div>
                <Label>Video URL *</Label>
                <Input
                  value={manualUrl}
                  onChange={(e) => setManualUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=... or any video URL"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Supports YouTube, Vimeo, or direct video links
                </p>
              </div>
              
              <div>
                <Label>Title</Label>
                <Input
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  placeholder="Video title (optional)"
                />
              </div>
              
              <div>
                <Label>Description</Label>
                <Textarea
                  value={manualDescription}
                  onChange={(e) => setManualDescription(e.target.value)}
                  placeholder="Brief description (optional)"
                  rows={2}
                />
              </div>
              
              <div>
                <Label>Duration</Label>
                <Input
                  value={manualDuration}
                  onChange={(e) => setManualDuration(e.target.value)}
                  placeholder="e.g., 15 min"
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button onClick={handleManualSubmit}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Video
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
