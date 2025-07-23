import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { UniversalLayout } from "@/components/layout/UniversalLayout";
import { 
  Bell, 
  Calendar, 
  Heart, 
  Users, 
  BookOpen, 
  History, 
  Mic, 
  MapPin,
  Filter,
  Play,
  Pause,
  Volume2
} from "lucide-react";
import { format } from "date-fns";
import { AddStoryDialog } from "@/components/alumnae/AddStoryDialog";
import { toast } from "sonner";

interface AlumnaeNotification {
  id: string;
  title: string;
  content: string;
  notification_type: string;
  created_at: string;
}

interface AlumnaeStory {
  id: string;
  title: string;
  content: string;
  image_url?: string;
  graduation_year?: number;
  created_at: string;
  user_id: string;
}

interface AudioStory {
  id: string;
  title: string;
  audio_url: string;
  graduation_year?: number;
  duration_seconds?: number;
  tags: string[];
  created_at: string;
}

interface BulletinPost {
  id: string;
  title: string;
  content: string;
  category: string;
  created_at: string;
}

interface GleeHistory {
  id: string;
  title: string;
  description: string;
  year_occurred: number;
  years_ago: number;
  category: string;
  image_url?: string;
}

interface AudioTrack {
  id: string;
  title: string;
  audio_url: string;
  duration_seconds?: number;
  artist_info?: string;
  performance_date?: string;
  category: string;
}

interface AlumnaeProfile {
  id: string;
  full_name: string;
  graduation_year?: number;
  voice_part?: string;
  bio?: string;
  headshot_url?: string;
  mentor_opt_in: boolean;
  verified: boolean;
}

export default function AlumnaeLegacyLounge() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { userProfile } = useUserProfile(user);
  
  const [notifications, setNotifications] = useState<AlumnaeNotification[]>([]);
  const [stories, setStories] = useState<AlumnaeStory[]>([]);
  const [audioStories, setAudioStories] = useState<AudioStory[]>([]);
  const [bulletinPosts, setBulletinPosts] = useState<BulletinPost[]>([]);
  const [gleeHistory, setGleeHistory] = useState<GleeHistory[]>([]);
  const [audioTracks, setAudioTracks] = useState<AudioTrack[]>([]);
  const [alumnaeProfiles, setAlumnaeProfiles] = useState<AlumnaeProfile[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [isAddStoryDialogOpen, setIsAddStoryDialogOpen] = useState(false);
  const [selectedDecade, setSelectedDecade] = useState<string>("all");
  const [bulletinFilter, setBulletinFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);

  // Check if user is verified alumna - we'll need to fetch this from gw_profiles directly
  const [isVerifiedAlumna, setIsVerifiedAlumna] = useState(false);

  useEffect(() => {
    const checkAlumnaStatus = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('gw_profiles')
        .select('role, verified')
        .eq('user_id', user.id)
        .single();
      
      setIsVerifiedAlumna(data?.role === 'alumna' && data?.verified === true);
    };
    
    checkAlumnaStatus();
  }, [user]);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchData();
  }, [user, navigate]);

  const fetchData = async () => {
    try {
      // Fetch notifications
      const { data: notificationsData } = await supabase
        .from('gw_alumnae_notifications')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(5);

      // Fetch alumnae stories
      const { data: storiesData } = await supabase
        .from('alumnae_stories')
        .select('*')
        .eq('is_approved', true)
        .order('created_at', { ascending: false })
        .limit(10);

      // Fetch audio stories
      const { data: audioStoriesData } = await supabase
        .from('alumnae_audio_stories')
        .select('*')
        .eq('is_approved', true)
        .order('created_at', { ascending: false })
        .limit(6);

      // Fetch bulletin posts
      const { data: bulletinData } = await supabase
        .from('bulletin_posts')
        .select('*')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(10);

      // Fetch "On This Day" content
      const { data: historyData } = await supabase
        .rpc('get_on_this_day_content');

      // Fetch audio archive
      const { data: audioData } = await supabase
        .from('audio_archive')
        .select('*')
        .eq('is_public', true)
        .eq('category', 'performance')
        .order('performance_date', { ascending: false })
        .limit(8);

      // Fetch verified alumnae profiles
      const { data: profilesData } = await supabase
        .from('gw_profiles')
        .select('*')
        .eq('role', 'alumna')
        .eq('verified', true)
        .order('graduation_year', { ascending: false })
        .limit(20);

      setNotifications(notificationsData || []);
      setStories(storiesData || []);
      setAudioStories(audioStoriesData || []);
      setBulletinPosts(bulletinData || []);
      setGleeHistory(historyData || []);
      setAudioTracks(audioData || []);
      setAlumnaeProfiles(profilesData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error loading content');
    } finally {
      setLoading(false);
    }
  };

  const handleMentorOptIn = async () => {
    if (!user || !isVerifiedAlumna) return;
    
    try {
      const { error } = await supabase
        .from('gw_profiles')
        .update({ mentor_opt_in: !userProfile?.mentor_opt_in })
        .eq('user_id', user.id);

      if (error) throw error;
      toast.success(`Mentor status ${userProfile?.mentor_opt_in ? 'disabled' : 'enabled'}`);
      // Refresh user profile data
      window.location.reload();
    } catch (error) {
      console.error('Error updating mentor status:', error);
      toast.error('Failed to update mentor status');
    }
  };

  const filteredBulletinPosts = bulletinPosts.filter(post => {
    if (bulletinFilter === 'all') return true;
    return post.category?.toLowerCase() === bulletinFilter.toLowerCase();
  });

  const filteredAlumnaeProfiles = alumnaeProfiles.filter(profile => {
    const matchesDecade = selectedDecade === 'all' || 
      (profile.graduation_year && Math.floor(profile.graduation_year / 10) * 10 === parseInt(selectedDecade));
    const matchesSearch = searchTerm === '' || 
      profile.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      profile.voice_part?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesDecade && matchesSearch;
  });

  const uniqueDecades = [...new Set(alumnaeProfiles
    .filter(p => p.graduation_year)
    .map(p => Math.floor(p.graduation_year! / 10) * 10))]
    .sort((a, b) => b - a);

  if (loading) {
    return (
      <UniversalLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </UniversalLayout>
    );
  }

  if (!isVerifiedAlumna) {
    return (
      <UniversalLayout>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Card>
            <CardContent className="text-center py-12">
              <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-2xl font-bold mb-4">Access Restricted</h2>
              <p className="text-muted-foreground mb-6">
                This area is exclusively for verified Spelman College Glee Club alumnae.
                Please contact an administrator to verify your alumni status.
              </p>
              <Button onClick={() => navigate('/alumnae')}>
                Return to Alumnae Landing
              </Button>
            </CardContent>
          </Card>
        </div>
      </UniversalLayout>
    );
  }

  return (
    <UniversalLayout>
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-serif text-primary">
            Legacy Lounge
          </h1>
          <p className="text-xl text-muted-foreground">
            The heart of Spelman Glee Club sisterhood and memories
          </p>
        </div>

        {/* Notifications Panel */}
        {notifications.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Important Updates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="p-3 rounded-lg border-l-4 border-primary bg-primary/5"
                  >
                    <h4 className="font-semibold">{notification.title}</h4>
                    <p className="text-sm text-muted-foreground">{notification.content}</p>
                    <Badge variant="secondary" className="mt-1">
                      {notification.notification_type}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* On This Day */}
            {gleeHistory.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    On This Day in Glee History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {gleeHistory.map((item) => (
                      <div key={item.id} className="border-l-4 border-gold pl-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold">{item.title}</h4>
                            <p className="text-sm text-muted-foreground">{item.description}</p>
                            <Badge variant="outline" className="mt-1">
                              {item.years_ago} years ago ({item.year_occurred})
                            </Badge>
                          </div>
                          {item.image_url && (
                            <img
                              src={item.image_url}
                              alt={item.title}
                              className="w-16 h-16 rounded-lg object-cover ml-4"
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Bulletin Board */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Bulletin Board
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant={bulletinFilter === 'all' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setBulletinFilter('all')}
                    >
                      All
                    </Button>
                    <Button
                      variant={bulletinFilter === 'reunion' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setBulletinFilter('reunion')}
                    >
                      Reunion
                    </Button>
                    <Button
                      variant={bulletinFilter === 'mentoring' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setBulletinFilter('mentoring')}
                    >
                      Mentoring
                    </Button>
                    <Button
                      variant={bulletinFilter === 'memories' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setBulletinFilter('memories')}
                    >
                      Memories
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredBulletinPosts.length > 0 ? (
                    filteredBulletinPosts.map((post) => (
                      <div key={post.id} className="p-4 border rounded-lg">
                        <h4 className="font-semibold mb-2">{post.title}</h4>
                        <p className="text-sm text-muted-foreground mb-2">{post.content}</p>
                        <div className="flex justify-between items-center">
                          <Badge variant="secondary">{post.category}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(post.created_at), 'MMM dd, yyyy')}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      No bulletin posts available
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Memory Wall */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Memory Wall
                  </span>
                  <Button onClick={() => setIsAddStoryDialogOpen(true)}>
                    Share Your Story
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {stories.map((story) => (
                    <div key={story.id} className="border rounded-lg overflow-hidden">
                      {story.image_url && (
                        <img
                          src={story.image_url}
                          alt={story.title}
                          className="w-full h-32 object-cover"
                        />
                      )}
                      <div className="p-4">
                        <h4 className="font-semibold mb-2">{story.title}</h4>
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-3">
                          {story.content}
                        </p>
                        <div className="flex justify-between items-center">
                          {story.graduation_year && (
                            <Badge variant="outline">
                              Class of {story.graduation_year}
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(story.created_at), 'MMM dd, yyyy')}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Oral History */}
            {audioStories.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mic className="h-5 w-5" />
                    Oral History Collection
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {audioStories.map((story) => (
                      <div key={story.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h4 className="font-semibold">{story.title}</h4>
                          {story.graduation_year && (
                            <Badge variant="outline" className="mt-1">
                              Class of {story.graduation_year}
                            </Badge>
                          )}
                          <div className="flex gap-2 mt-2">
                            {story.tags.map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // Toggle audio playback
                            if (currentlyPlaying === story.id) {
                              setCurrentlyPlaying(null);
                            } else {
                              setCurrentlyPlaying(story.id);
                              // In a real implementation, you'd handle audio playback here
                            }
                          }}
                        >
                          {currentlyPlaying === story.id ? (
                            <Pause className="h-4 w-4" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            {/* Mentor Circle */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5" />
                  Mentor Circle
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <div className="mb-4">
                  {userProfile?.mentor_opt_in ? (
                    <Badge variant="default" className="mb-4">
                      ✨ Active Mentor
                    </Badge>
                  ) : (
                    <p className="text-sm text-muted-foreground mb-4">
                      Share your wisdom with current members
                    </p>
                  )}
                </div>
                <Button
                  onClick={handleMentorOptIn}
                  variant={userProfile?.mentor_opt_in ? "outline" : "default"}
                  className="w-full"
                >
                  {userProfile?.mentor_opt_in ? 'Leave Mentor Circle' : 'Join as Mentor'}
                </Button>
              </CardContent>
            </Card>

            {/* Glee Soundtrack */}
            {audioTracks.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Volume2 className="h-5 w-5" />
                    Glee Soundtrack
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {audioTracks.slice(0, 5).map((track) => (
                      <div
                        key={track.id}
                        className="flex items-center justify-between p-2 rounded hover:bg-muted/50"
                      >
                        <div>
                          <p className="font-medium text-sm">{track.title}</p>
                          {track.artist_info && (
                            <p className="text-xs text-muted-foreground">{track.artist_info}</p>
                          )}
                        </div>
                        <Button variant="ghost" size="sm">
                          <Play className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Where Are They Now */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Where Are They Now
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Search alumnae..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="flex-1"
                    />
                    <select
                      value={selectedDecade}
                      onChange={(e) => setSelectedDecade(e.target.value)}
                      className="px-3 py-2 border rounded-md"
                    >
                      <option value="all">All Decades</option>
                      {uniqueDecades.map((decade) => (
                        <option key={decade} value={decade.toString()}>
                          {decade}s
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {filteredAlumnaeProfiles.map((profile) => (
                      <div key={profile.id} className="flex items-center gap-3 p-3 border rounded-lg">
                        {profile.headshot_url ? (
                          <img
                            src={profile.headshot_url}
                            alt={profile.full_name}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <Users className="h-6 w-6 text-primary" />
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="font-medium text-sm">{profile.full_name}</p>
                          <div className="flex gap-2 mt-1">
                            {profile.graduation_year && (
                              <Badge variant="outline" className="text-xs">
                                {profile.graduation_year}
                              </Badge>
                            )}
                            {profile.voice_part && (
                              <Badge variant="secondary" className="text-xs">
                                {profile.voice_part}
                              </Badge>
                            )}
                            {profile.mentor_opt_in && (
                              <Badge variant="default" className="text-xs">
                                Mentor
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Add Story Dialog */}
        <AddStoryDialog
          open={isAddStoryDialogOpen}
          onOpenChange={setIsAddStoryDialogOpen}
          onStoryAdded={fetchData}
        />
      </div>
    </UniversalLayout>
  );
}