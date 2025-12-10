import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Radio, 
  Music, 
  Play, 
  Pause, 
  Plus, 
  Edit, 
  Trash2, 
  Upload, 
  Users, 
  Volume2,
  Clock,
  Settings,
  BarChart3,
  Search,
  Filter,
  ArrowUpDown,
  X,
  Calendar,
  GripVertical,
  Save,
  Pencil,
  Music2,
  Church,
  Sparkles
} from 'lucide-react';
import { RadioTimeline } from '../radio/RadioTimeline';
import { MediaUploadButton } from '@/components/media/MediaUploadButton';
import { BulkUploadDialog } from '@/components/radio/BulkUploadDialog';
import { MediaLibraryDialog } from '@/components/radio/MediaLibraryDialog';
import { AzuraCastAdminPanel } from './AzuraCastAdminPanel';
import { cn } from '@/lib/utils';

interface AudioTrack {
  id: string;
  title: string;
  artist_info: string | null;
  audio_url: string;
  category: string;
  duration_seconds: number | null;
  play_count: number;
  is_public: boolean;
  created_at: string;
}

interface RadioStats {
  totalTracks: number;
  totalListeners: number;
  currentlyPlaying: string | null;
  uptime: string;
}

export const RadioManagement = () => {
  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  const [filteredTracks, setFilteredTracks] = useState<AudioTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'title' | 'artist' | 'date' | 'plays'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [radioStats, setRadioStats] = useState<RadioStats>({
    totalTracks: 0,
    totalListeners: 127,
    currentlyPlaying: null,
    uptime: '24/7'
  });
  const [selectedTrack, setSelectedTrack] = useState<AudioTrack | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);
  const { toast } = useToast();

  // Form states for editing/adding tracks
  const [formData, setFormData] = useState({
    title: '',
    artist_info: '',
    category: 'performance',
    is_public: true
  });

  useEffect(() => {
    fetchTracks();
    fetchRadioStats();
  }, []);

  useEffect(() => {
    filterAndSortTracks();
  }, [tracks, searchQuery, categoryFilter, sortBy, sortOrder]);

  const fetchTracks = async () => {
    try {
      setLoading(true);
      
      // Fetch ALL audio tracks from multiple sources
      const [audioArchiveResult, musicTracksResult, alumnaeAudioResult] = await Promise.all([
        // Audio archive table  
        supabase
          .from('audio_archive')
          .select('*')
          .order('created_at', { ascending: false }),
        
        // Music tracks table
        supabase
          .from('music_tracks')
          .select('id, title, artist, audio_url, duration, play_count, created_at')
          .not('audio_url', 'is', null),
          
        // Alumnae audio stories
        supabase
          .from('alumnae_audio_stories')
          .select('id, title, audio_url, duration_seconds, created_at, is_approved')
          .not('audio_url', 'is', null)
      ]);

      const allTracks: AudioTrack[] = [];

      // Add audio archive tracks
      if (audioArchiveResult.data) {
        audioArchiveResult.data.forEach(track => {
          allTracks.push({
            id: track.id,
            title: track.title,
            artist_info: track.artist_info,
            audio_url: track.audio_url,
            category: track.category,
            duration_seconds: track.duration_seconds,
            play_count: track.play_count || 0,
            is_public: track.is_public,
            created_at: track.created_at
          });
        });
      }

      // Add music tracks (convert to AudioTrack format)
      if (musicTracksResult.data) {
        musicTracksResult.data.forEach(track => {
          allTracks.push({
            id: `music_${track.id}`,
            title: track.title,
            artist_info: track.artist || 'Glee Club',
            audio_url: track.audio_url,
            category: 'performance',
            duration_seconds: track.duration || 180,
            play_count: track.play_count || 0,
            is_public: true, // Default to true for music tracks
            created_at: track.created_at
          });
        });
      }

      // Add alumnae audio stories
      if (alumnaeAudioResult.data) {
        alumnaeAudioResult.data.forEach(track => {
          allTracks.push({
            id: `alumni_${track.id}`,
            title: track.title,
            artist_info: 'Alumnae Story',
            audio_url: track.audio_url,
            category: 'alumni_story',
            duration_seconds: track.duration_seconds || 300,
            play_count: 0,
            is_public: track.is_approved || false,
            created_at: track.created_at
          });
        });
      }

      // Sort by creation date (newest first)
      allTracks.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      console.log(`RadioManagement: Found ${allTracks.length} total audio tracks`);
      setTracks(allTracks);
      setRadioStats(prev => ({ ...prev, totalTracks: allTracks.length }));
      
    } catch (error) {
      console.error('Error fetching tracks:', error);
      toast({
        title: "Error",
        description: "Failed to fetch radio tracks",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRadioStats = async () => {
    // This would integrate with actual radio streaming stats
    // For now, using mock data
    setRadioStats(prev => ({
      ...prev,
      totalListeners: Math.floor(Math.random() * 200) + 50,
      currentlyPlaying: tracks[0]?.title || null
    }));
  };

  const filterAndSortTracks = () => {
    let filtered = tracks.filter(track => {
      const matchesSearch = !searchQuery || 
        track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (track.artist_info && track.artist_info.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = categoryFilter === 'all' || track.category === categoryFilter;
      
      return matchesSearch && matchesCategory;
    });

    // Sort the filtered results
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'artist':
          comparison = (a.artist_info || '').localeCompare(b.artist_info || '');
          break;
        case 'date':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'plays':
          comparison = a.play_count - b.play_count;
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    setFilteredTracks(filtered);
  };

  const handlePlayTrack = async (track: AudioTrack) => {
    try {
      // Stop current audio if playing
      if (audioElement) {
        audioElement.pause();
        audioElement.currentTime = 0;
      }

      if (currentlyPlaying === track.id) {
        // If same track is playing, stop it
        setCurrentlyPlaying(null);
        setAudioElement(null);
        setRadioStats(prev => ({ ...prev, currentlyPlaying: null }));
        return;
      }

      // Create new audio element
      const audio = new Audio(track.audio_url);
      
      audio.addEventListener('loadstart', () => {
        console.log('Loading audio:', track.title);
      });

      audio.addEventListener('canplay', () => {
        console.log('Audio ready to play:', track.title);
      });

      audio.addEventListener('error', (e) => {
        console.error('Audio error:', e);
        toast({
          title: "Playback Error",
          description: "Failed to play audio track",
          variant: "destructive",
        });
        setCurrentlyPlaying(null);
        setAudioElement(null);
      });

      audio.addEventListener('ended', () => {
        setCurrentlyPlaying(null);
        setAudioElement(null);
        setRadioStats(prev => ({ ...prev, currentlyPlaying: null }));
      });

      // Set state before playing
      setCurrentlyPlaying(track.id);
      setAudioElement(audio);
      setRadioStats(prev => ({ ...prev, currentlyPlaying: track.title }));

      // Start playback
      await audio.play();
      
      toast({
        title: "Now Playing",
        description: `${track.title} by ${track.artist_info || 'Unknown Artist'}`,
      });

    } catch (error) {
      console.error('Error playing track:', error);
      toast({
        title: "Playback Error",
        description: "Failed to play audio track",
        variant: "destructive",
      });
      setCurrentlyPlaying(null);
      setAudioElement(null);
    }
  };

  // Get unique categories for filter dropdown
  const getCategories = () => {
    const categories = new Set(tracks.map(track => track.category).filter(Boolean));
    return Array.from(categories);
  };

  const handleEditTrack = (track: AudioTrack) => {
    setSelectedTrack(track);
    setFormData({
      title: track.title,
      artist_info: track.artist_info || '',
      category: track.category,
      is_public: track.is_public
    });
    setIsEditing(true);
  };

  const handleDeleteTrack = async (trackId: string) => {
    if (!confirm('Are you sure you want to delete this track?')) {
      return;
    }

    try {
      // Stop playback if this track is currently playing
      if (currentlyPlaying === trackId) {
        if (audioElement) {
          audioElement.pause();
          audioElement.currentTime = 0;
        }
        setCurrentlyPlaying(null);
        setAudioElement(null);
      }

      const { error } = await supabase
        .from('audio_archive')
        .delete()
        .eq('id', trackId);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Track deleted successfully",
      });
      
      fetchTracks();
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Error",
        description: "Failed to delete track",
        variant: "destructive",
      });
    }
  };

  const handleSaveTrack = async () => {
    try {
      if (selectedTrack) {
        // Update existing track
        const { error } = await supabase
          .from('audio_archive')
          .update(formData)
          .eq('id', selectedTrack.id);

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Track updated successfully",
        });
      }
      
      setIsEditing(false);
      setSelectedTrack(null);
      setFormData({ title: '', artist_info: '', category: 'performance', is_public: true });
      fetchTracks();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save track",
        variant: "destructive",
      });
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'Unknown';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'performance': return 'bg-blue-100 text-blue-800';
      case 'announcement': return 'bg-green-100 text-green-800';
      case 'interlude': return 'bg-purple-100 text-purple-800';
      case 'alumni_story': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Radio Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tracks</CardTitle>
            <Music className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{radioStats.totalTracks}</div>
            <p className="text-xs text-muted-foreground">Audio files in library</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Live Listeners</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{radioStats.totalListeners}</div>
            <p className="text-xs text-muted-foreground">Currently tuned in</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Radio Status</CardTitle>
            <Radio className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">LIVE</div>
            <p className="text-xs text-muted-foreground">Broadcasting {radioStats.uptime}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Now Playing</CardTitle>
            <Volume2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium truncate">
              {radioStats.currentlyPlaying || 'No track playing'}
            </div>
            <p className="text-xs text-muted-foreground">Current broadcast</p>
          </CardContent>
        </Card>
      </div>

      {/* Three-Panel Layout: Track Library + Timeline + AzuraCast Admin */}
      <div className="grid grid-cols-1 xl:grid-cols-3 lg:grid-cols-2 gap-6">
        {/* Left Side: Track Library */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Music className="h-5 w-5" />
                Audio Track Library
              </CardTitle>
              <div className="flex gap-2">
                <BulkUploadDialog 
                  onUploadComplete={() => {
                    fetchTracks();
                    toast({
                      title: "Upload Complete",
                      description: "New tracks have been uploaded to the library",
                    });
                  }}
                />
                <Button 
                  size="sm"
                  onClick={() => setShowMediaLibrary(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Track
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search and Filters */}
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex-1 min-w-64">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search tracks or artists..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-10 bg-muted/50 border-border/50"
                    />
                    {searchQuery && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-1 top-1 h-8 w-8 p-0 hover:bg-muted"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {getCategories().map(category => (
                        <SelectItem key={category} value={category}>
                          {category.charAt(0).toUpperCase() + category.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center gap-2">
                  <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                  <Select value={sortBy} onValueChange={(value: 'title' | 'artist' | 'date' | 'plays') => setSortBy(value)}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date">Date</SelectItem>
                      <SelectItem value="title">Title</SelectItem>
                      <SelectItem value="artist">Artist</SelectItem>
                      <SelectItem value="plays">Plays</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="px-3"
                  >
                    {sortOrder === 'asc' ? '↑' : '↓'}
                  </Button>
                </div>
              </div>

              <ScrollArea className="h-[600px]">
                <div className="space-y-3">
                  {filteredTracks.map((track) => (
                    <Card 
                      key={track.id} 
                      className="hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing"
                      draggable={true}
                      onDragStart={(e) => {
                        e.dataTransfer.setData('application/json', JSON.stringify(track));
                        e.dataTransfer.effectAllowed = 'copy';
                      }}
                    >
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="font-semibold">{track.title}</h4>
                              <Badge className={getCategoryColor(track.category)}>
                                {track.category}
                              </Badge>
                              {!track.is_public && (
                                <Badge variant="outline">Private</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mb-1">
                              Artist: {track.artist_info || 'Unknown'}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDuration(track.duration_seconds)}
                              </span>
                              <span className="flex items-center gap-1">
                                <BarChart3 className="h-3 w-3" />
                                {track.play_count} plays
                              </span>
                              <span>
                                Added {new Date(track.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-2 ml-4">
                            <Button 
                              size="lg" 
                              variant="ghost"
                              onClick={() => handlePlayTrack(track)}
                              className={currentlyPlaying === track.id ? "bg-primary/10 text-primary" : ""}
                            >
                              {currentlyPlaying === track.id ? (
                                <Pause className="h-8 w-8" />
                              ) : (
                                <Play className="h-8 w-8" />
                              )}
                            </Button>
                            <Button 
                              size="lg" 
                              variant="ghost"
                              onClick={() => handleEditTrack(track)}
                              className="hover:bg-muted/50"
                            >
                              <Edit className="h-6 w-6" />
                            </Button>
                            <Button 
                              size="lg" 
                              variant="ghost"
                              onClick={() => handleDeleteTrack(track.id)}
                              className="hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 className="h-6 w-6" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {filteredTracks.length === 0 && !loading && (
                    <div className="text-center py-8 text-muted-foreground">
                      {searchQuery || categoryFilter !== 'all' ? 'No tracks match your filters' : 'No tracks in the library yet'}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Center: Timeline */}
        <div className="space-y-4">
          <RadioTimeline 
            onTrackScheduled={(track) => {
              console.log('Track scheduled:', track);
              toast({
                title: "Track Scheduled",
                description: `"${track.title}" scheduled for ${track.scheduledTime}`,
              });
            }}
          />
        </div>

        {/* Right Side: AzuraCast Admin Panel */}
        <div className="space-y-4">
          <AzuraCastAdminPanel />
        </div>
      </div>

      {/* Additional Tabs for Analytics and Settings */}
      <Tabs defaultValue="analytics" className="w-full mt-8">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Radio Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Analytics dashboard coming soon
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Radio Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Radio configuration settings coming soon
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Track Dialog */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Edit Track</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="artist">Artist</Label>
                <Input
                  id="artist"
                  value={formData.artist_info}
                  onChange={(e) => setFormData(prev => ({ ...prev, artist_info: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="performance">Performance</SelectItem>
                    <SelectItem value="announcement">Announcement</SelectItem>
                    <SelectItem value="interlude">Interlude</SelectItem>
                    <SelectItem value="alumni_story">Alumni Story</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_public"
                  checked={formData.is_public}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_public: e.target.checked }))}
                />
                <Label htmlFor="is_public">Public Track</Label>
              </div>
              <div className="flex gap-2 pt-4">
                <Button onClick={handleSaveTrack} className="flex-1">
                  Save Changes
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setIsEditing(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Media Library Dialog */}
      <MediaLibraryDialog
        open={showMediaLibrary}
        onOpenChange={setShowMediaLibrary}
        onAddToPlaylist={(track) => {
          console.log('Track added from library:', track);
          toast({
            title: "Track Added",
            description: `"${track.title}" added to radio library`,
          });
          fetchTracks();
          setShowMediaLibrary(false);
        }}
      />
    </div>
  );
};