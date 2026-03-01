import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { radioCoService } from '@/services/radioco';
import { cn } from '@/lib/utils';
import { useRadioChannels } from '@/hooks/useRadioChannels';
import { useRadioPlayer } from '@/hooks/useRadioPlayer';
import { 
  Radio, Music, Play, Pause, Plus, Edit, Trash2, Users, Volume2, Clock, Settings,
  BarChart3, Search, X, GripVertical, ListMusic, Wifi, Upload, Camera, Mic, Library,
  Headphones, Folder, RefreshCw, ChevronRight, Sparkles, Layers,
  List, ExternalLink
} from 'lucide-react';
import { BulkUploadDialog } from '@/components/radio/BulkUploadDialog';
import { MediaLibraryDialog } from '@/components/radio/MediaLibraryDialog';
import { RadioChannelsTab } from '@/components/radio/RadioChannelsTab';

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
  source?: string;
}

interface RadioStats {
  totalTracks: number;
  totalListeners: number;
  currentlyPlaying: string | null;
  currentArtist: string | null;
  currentArt: string | null;
  isOnline: boolean;
  lastUpdated: string | null;
}

export const RadioManagement = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const { toast } = useToast();
  
  // Use shared radio channels hook for station selection
  const { channels, selectedChannel, selectChannel, isLoading: channelsLoading } = useRadioChannels();

  // Get switchStream from radio player hook to actually change the audio
  const { switchStream } = useRadioPlayer();

  // Radio stats
  const [radioStats, setRadioStats] = useState<RadioStats>({
    totalTracks: 0, 
    totalListeners: 0, 
    currentlyPlaying: null,
    currentArtist: null, 
    currentArt: null, 
    isOnline: false,
    lastUpdated: null
  });

  // Local tracks
  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  const [filteredTracks, setFilteredTracks] = useState<AudioTrack[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSource, setActiveSource] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<AudioTrack | null>(null);
  const [formData, setFormData] = useState({ title: '', artist_info: '', category: 'performance', is_public: true });
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingTrack, setEditingTrack] = useState<AudioTrack | null>(null);
  const [editFormData, setEditFormData] = useState({ title: '', artist_info: '' });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    connectToRadioCo();
  }, []);

  useEffect(() => {
    filterTracks();
  }, [tracks, searchQuery, activeSource, categoryFilter]);

  // Poll Radio.co status every 15 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchRadioStats();
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const connectToRadioCo = async () => {
    try {
      setLoading(true);
      await fetchRadioStats();
      setIsConnected(true);
      await loadAllData();
      toast({ title: "Connected", description: "Radio.co connected successfully" });
    } catch (error) {
      console.error('Connection error:', error);
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const loadAllData = async () => {
    await Promise.all([
      fetchTracks(),
      fetchRadioStats()
    ]);
  };

  const fetchTracks = async () => {
    try {
      const [audioArchiveResult, musicTracksResult, alumnaeAudioResult] = await Promise.all([
        supabase.from('audio_archive').select('*').order('created_at', { ascending: false }),
        supabase.from('music_tracks').select('id, title, artist, audio_url, duration, play_count, created_at').not('audio_url', 'is', null),
        supabase.from('alumnae_audio_stories').select('id, title, audio_url, duration_seconds, created_at, is_approved').not('audio_url', 'is', null)
      ]);

      const allTracks: AudioTrack[] = [];
      
      if (audioArchiveResult.data) {
        audioArchiveResult.data.forEach(track => {
          allTracks.push({ id: track.id, title: track.title, artist_info: track.artist_info, audio_url: track.audio_url, category: track.category, duration_seconds: track.duration_seconds, play_count: track.play_count || 0, is_public: track.is_public, created_at: track.created_at, source: 'archive' });
        });
      }
      if (musicTracksResult.data) {
        musicTracksResult.data.forEach(track => {
          allTracks.push({
            id: `music_${track.id}`,
            title: track.title,
            artist_info: track.artist || 'Glee Club',
            audio_url: track.audio_url!,
            category: 'performance',
            duration_seconds: track.duration ?? null,
            play_count: track.play_count || 0,
            is_public: true,
            created_at: track.created_at,
            source: 'music'
          });
        });
      }
      if (alumnaeAudioResult.data) {
        alumnaeAudioResult.data.forEach(track => {
          allTracks.push({
            id: `alumni_${track.id}`,
            title: track.title,
            artist_info: 'Alumnae Story',
            audio_url: track.audio_url!,
            category: 'alumni_story',
            duration_seconds: track.duration_seconds ?? null,
            play_count: 0,
            is_public: track.is_approved || false,
            created_at: track.created_at,
            source: 'alumni'
          });
        });
      }
      allTracks.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setTracks(allTracks);
      setRadioStats(prev => ({ ...prev, totalTracks: allTracks.length }));
    } catch (error) {
      console.error('Error fetching tracks:', error);
    }
  };

  const fetchRadioStats = async () => {
    try {
      const stationId = 'sd0d2e77cf';
      const status = await radioCoService.getStatus(stationId);
      
      setRadioStats(prev => ({
        ...prev,
        isOnline: status.status === 'online',
        currentlyPlaying: status.current_track?.title || null,
        currentArtist: null, // Radio.co track title often includes artist
        currentArt: status.current_track?.artwork_url_large || status.current_track?.artwork_url || status.logo_url || null,
        totalListeners: 0, // Radio.co public API doesn't expose listener count
        lastUpdated: new Date().toISOString()
      }));
    } catch (error) {
      console.error('Error fetching radio stats:', error);
      setRadioStats(prev => ({ ...prev, isOnline: false }));
    }
  };

  const filterTracks = () => {
    let filtered = tracks.filter(track => {
      const matchesSearch = !searchQuery || track.title.toLowerCase().includes(searchQuery.toLowerCase()) || (track.artist_info?.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = categoryFilter === 'all' || track.category === categoryFilter;
      let matchesSource = true;
      if (activeSource === 'archive') matchesSource = !track.id.startsWith('music_') && !track.id.startsWith('alumni_');
      else if (activeSource === 'music') matchesSource = track.id.startsWith('music_');
      else if (activeSource === 'alumni') matchesSource = track.id.startsWith('alumni_');
      return matchesSearch && matchesCategory && matchesSource;
    });
    setFilteredTracks(filtered);
  };

  const handlePlayTrack = async (track: AudioTrack) => {
    if (audioElement) { audioElement.pause(); }
    if (currentlyPlaying === track.id) { setCurrentlyPlaying(null); setAudioElement(null); return; }
    const audio = new Audio(track.audio_url);
    audio.addEventListener('ended', () => { setCurrentlyPlaying(null); setAudioElement(null); });
    setCurrentlyPlaying(track.id);
    setAudioElement(audio);
    await audio.play();
  };

  const handleSync = async () => {
    toast({ title: "Syncing..." });
    await loadAllData();
    toast({ title: "Synced" });
  };

  const handleEditTrack = (track: AudioTrack) => {
    setEditingTrack(track);
    setEditFormData({ title: track.title, artist_info: track.artist_info || '' });
    setShowEditDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!editingTrack) return;
    setIsSaving(true);
    try {
      const realId = editingTrack.id.replace(/^(music_|alumni_)/, '');
      let tableName = 'audio_archive';
      if (editingTrack.source === 'music') tableName = 'music_tracks';
      else if (editingTrack.source === 'alumni') tableName = 'alumnae_audio_stories';

      const updateData: any = { title: editFormData.title };
      if (tableName === 'audio_archive') updateData.artist_info = editFormData.artist_info;
      else if (tableName === 'music_tracks') updateData.artist = editFormData.artist_info;

      const { error } = await supabase.from(tableName as 'audio_archive').update(updateData).eq('id', realId);
      if (error) throw error;
      toast({ title: "Saved", description: "Track updated successfully" });
      setShowEditDialog(false);
      await fetchTracks();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTrack = async (track: AudioTrack) => {
    if (!confirm(`Delete "${track.title}"?`)) return;
    try {
      const realId = track.id.replace(/^(music_|alumni_)/, '');
      let tableName = 'audio_archive';
      if (track.source === 'music') tableName = 'music_tracks';
      else if (track.source === 'alumni') tableName = 'alumnae_audio_stories';

      const { error } = await supabase.from(tableName as 'audio_archive').delete().eq('id', realId);
      if (error) throw error;
      toast({ title: "Deleted" });
      await fetchTracks();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handlePlayRadioStream = () => {
    const listenUrl = radioCoService.getListenUrl('sd0d2e77cf');
    switchStream(listenUrl, 'Glee World Radio');
  };

  const handleManageInRadioCo = () => {
    window.open('https://studio.radio.co/', '_blank');
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const categories = ['performance', 'rehearsal', 'archived', 'featured', 'alumni_story'];

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Radio className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-xl font-semibold">Radio Management</h2>
            <p className="text-sm text-muted-foreground">Glee World Radio • Radio.co</p>
          </div>
          <Badge variant={isConnected && radioStats.isOnline ? "default" : "secondary"}>
            {radioStats.isOnline ? 'Online' : 'Offline'}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleSync} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleManageInRadioCo}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Manage in Radio.co
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="channels">Channels</TabsTrigger>
          <TabsTrigger value="library">Library</TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Now Playing Card */}
            <Card className="col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Music className="h-4 w-4" />
                  Now Playing
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  {radioStats.currentArt ? (
                    <img src={radioStats.currentArt} alt="Album art" className="w-20 h-20 rounded-lg object-cover" />
                  ) : (
                    <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center">
                      <Music className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-lg">{radioStats.currentlyPlaying || 'No track playing'}</p>
                    {radioStats.currentArtist && (
                      <p className="text-muted-foreground">{radioStats.currentArtist}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2">
                      <Badge variant={radioStats.isOnline ? "default" : "secondary"}>
                        {radioStats.isOnline ? 'Online' : 'Offline'}
                      </Badge>
                      <Button size="sm" onClick={handlePlayRadioStream}>
                        <Play className="h-4 w-4 mr-2" />
                        Listen
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Library Tracks</span>
                  <span className="font-medium">{radioStats.totalTracks}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant={radioStats.isOnline ? "default" : "outline"}>
                    {radioStats.isOnline ? 'Broadcasting' : 'Offline'}
                  </Badge>
                </div>
                {radioStats.lastUpdated && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Last Updated</span>
                    <span>{new Date(radioStats.lastUpdated).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Channels Tab */}
        <TabsContent value="channels">
          <RadioChannelsTab />
        </TabsContent>

        {/* Library Tab */}
        <TabsContent value="library" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tracks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={activeSource} onValueChange={setActiveSource}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="archive">Archive</SelectItem>
                <SelectItem value="music">Music Tracks</SelectItem>
                <SelectItem value="alumni">Alumnae</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat.replace('_', ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <BulkUploadDialog onUploadComplete={fetchTracks} />
          </div>

          {/* Track List */}
          <ScrollArea className="h-[500px]">
            <div className="space-y-2">
              {filteredTracks.map(track => (
                <Card key={track.id} className="p-3">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handlePlayTrack(track)}
                    >
                      {currentlyPlaying === track.id ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{track.title}</p>
                      <p className="text-sm text-muted-foreground truncate">{track.artist_info || 'Unknown Artist'}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">{track.category}</Badge>
                    <span className="text-sm text-muted-foreground">{formatDuration(track.duration_seconds)}</span>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditTrack(track)}>
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteTrack(track)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
              {filteredTracks.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No tracks found
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Track</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input
                value={editFormData.title}
                onChange={(e) => setEditFormData(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div>
              <Label>Artist</Label>
              <Input
                value={editFormData.artist_info}
                onChange={(e) => setEditFormData(prev => ({ ...prev, artist_info: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Media Library Dialog */}
      <MediaLibraryDialog open={showMediaLibrary} onOpenChange={setShowMediaLibrary} />
    </div>
  );
};
