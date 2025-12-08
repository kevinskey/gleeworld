import { useState, useEffect } from 'react';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Video, ArrowLeft, Search, Play, Clock, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

interface TrainingVideo {
  id: string;
  title: string;
  description: string | null;
  file_url: string;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  created_at: string;
  user_id: string;
  is_approved: boolean;
  metadata: any;
}

interface UserProfile {
  first_name: string | null;
  last_name: string | null;
}

const ExecBoardTrainingVideosPage = () => {
  const [videos, setVideos] = useState<TrainingVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVideo, setSelectedVideo] = useState<TrainingVideo | null>(null);
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfile>>({});
  const navigate = useNavigate();

  useEffect(() => {
    fetchVideos();
    
    // Subscribe to real-time updates for new videos
    const channel = supabase
      .channel('exec-board-training-videos')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'quick_capture_media',
          filter: 'category=eq.exec_board_video'
        },
        () => {
          fetchVideos();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchVideos = async () => {
    try {
      const { data, error } = await supabase
        .from('quick_capture_media')
        .select('*')
        .eq('category', 'exec_board_video')
        .eq('is_approved', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVideos(data || []);

      // Fetch user profiles for video creators
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(v => v.user_id))];
        const { data: profiles } = await supabase
          .from('gw_profiles')
          .select('user_id, first_name, last_name')
          .in('user_id', userIds);

        if (profiles) {
          const profileMap: Record<string, UserProfile> = {};
          profiles.forEach(p => {
            profileMap[p.user_id] = { first_name: p.first_name, last_name: p.last_name };
          });
          setUserProfiles(profileMap);
        }
      }
    } catch (error) {
      console.error('Error fetching videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredVideos = videos.filter(video =>
    video.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    video.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getCreatorName = (userId: string) => {
    const profile = userProfiles[userId];
    if (profile?.first_name || profile?.last_name) {
      return `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
    }
    return 'Unknown';
  };

  if (selectedVideo) {
    return (
      <UniversalLayout>
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <Button 
            variant="ghost" 
            onClick={() => setSelectedVideo(null)}
            className="mb-4 gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Videos
          </Button>

          <Card>
            <CardContent className="p-0">
              <div className="aspect-video bg-black rounded-t-lg overflow-hidden">
                <video
                  src={selectedVideo.file_url}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="p-6">
                <h1 className="text-2xl font-bold mb-2">{selectedVideo.title}</h1>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  <span className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    {getCreatorName(selectedVideo.user_id)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {formatDuration(selectedVideo.duration_seconds)}
                  </span>
                  <span>
                    {format(new Date(selectedVideo.created_at), 'MMM d, yyyy')}
                  </span>
                </div>
                {selectedVideo.description && (
                  <p className="text-muted-foreground">{selectedVideo.description}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </UniversalLayout>
    );
  }

  return (
    <UniversalLayout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/executive-board-workshop')}
          className="mb-4 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Workshop
        </Button>

        {/* Hero Section */}
        <div className="relative rounded-3xl overflow-hidden mb-8 bg-gradient-to-br from-purple-500 via-purple-500/80 to-pink-500/60 p-8 md:p-12">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-50" />
          <div className="relative z-10 text-white">
            <Badge className="bg-white/20 text-white border-white/30 mb-4">Training Library</Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">ExecBoard Training Videos</h1>
            <p className="text-xl text-white/90 max-w-2xl">
              Watch training videos created by executive board members to learn leadership skills and best practices.
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search training videos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Videos Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Card key={i} className="animate-pulse">
                <div className="aspect-video bg-muted rounded-t-lg" />
                <CardContent className="p-4">
                  <div className="h-5 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredVideos.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Video className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Training Videos Yet</h3>
              <p className="text-muted-foreground mb-4">
                Be the first to upload a training video using the Quick Capture feature in the header.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVideos.map(video => (
              <Card 
                key={video.id} 
                className="cursor-pointer hover:border-primary/50 transition-all hover:shadow-lg group overflow-hidden"
                onClick={() => setSelectedVideo(video)}
              >
                <div className="aspect-video bg-black relative overflow-hidden">
                  {video.thumbnail_url ? (
                    <img 
                      src={video.thumbnail_url} 
                      alt={video.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                      <Video className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                      <Play className="h-8 w-8 text-white fill-white" />
                    </div>
                  </div>
                  {video.duration_seconds && (
                    <Badge className="absolute bottom-2 right-2 bg-black/70">
                      {formatDuration(video.duration_seconds)}
                    </Badge>
                  )}
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold line-clamp-2 mb-1">{video.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {getCreatorName(video.user_id)} • {format(new Date(video.created_at), 'MMM d, yyyy')}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </UniversalLayout>
  );
};

export default ExecBoardTrainingVideosPage;
