import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  Users, 
  Volume2,
  Clock,
  Settings,
  BarChart3,
  Search,
  X,
  GripVertical,
  ListMusic,
  Wifi
} from 'lucide-react';
import { RadioPlaylistQueue } from '../radio/RadioPlaylistQueue';
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
      const [audioArchiveResult, musicTracksResult, alumnaeAudioResult] = await Promise.all([
        supabase.from('audio_archive').select('*').order('created_at', { ascending: false }),
        supabase.from('music_tracks').select('id, title, artist, audio_url, duration, play_count, created_at').not('audio_url', 'is', null),
        supabase.from('alumnae_audio_stories').select('id, title, audio_url, duration_seconds, created_at, is_approved').not('audio_url', 'is', null)
      ]);

      const allTracks: AudioTrack[] = [];

      if (audioArchiveResult.data) {
        audioArchiveResult.data.forEach(track => {
          allTracks.push({
            id: track.id, title: track.title, artist_info: track.artist_info,
            audio_url: track.audio_url, category: track.category,
            duration_seconds: track.duration_seconds, play_count: track.play_count || 0,
            is_public: track.is_public, created_at: track.created_at
          });
        });
      }

      if (musicTracksResult.data) {
        musicTracksResult.data.forEach(track => {
          allTracks.push({
            id: `music_${track.id}`, title: track.title, artist_info: track.artist || 'Glee Club',
            audio_url: track.audio_url, category: 'performance',
            duration_seconds: track.duration || 180, play_count: track.play_count || 0,
            is_public: true, created_at: track.created_at
          });
        });
      }

      if (alumnaeAudioResult.data) {
        alumnaeAudioResult.data.forEach(track => {
          allTracks.push({
            id: `alumni_${track.id}`, title: track.title, artist_info: 'Alumnae Story',
            audio_url: track.audio_url, category: 'alumni_story',
            duration_seconds: track.duration_seconds || 300, play_count: 0,
            is_public: track.is_approved || false, created_at: track.created_at
          });
        });
      }

      allTracks.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setTracks(allTracks);
      setRadioStats(prev => ({ ...prev, totalTracks: allTracks.length }));
    } catch (error) {
      console.error('Error fetching tracks:', error);
      toast({ title: "Error", description: "Failed to fetch radio tracks", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchRadioStats = async () => {
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

    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'title': comparison = a.title.localeCompare(b.title); break;
        case 'artist': comparison = (a.artist_info || '').localeCompare(b.artist_info || ''); break;
        case 'date': comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime(); break;
        case 'plays': comparison = a.play_count - b.play_count; break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    setFilteredTracks(filtered);
  };

  const handlePlayTrack = async (track: AudioTrack) => {
    try {
      if (audioElement) { audioElement.pause(); audioElement.currentTime = 0; }
      if (currentlyPlaying === track.id) {
        setCurrentlyPlaying(null); setAudioElement(null);
        setRadioStats(prev => ({ ...prev, currentlyPlaying: null }));
        return;
      }
      const audio = new Audio(track.audio_url);
      audio.addEventListener('error', () => {
        toast({ title: "Playback Error", description: "Failed to play audio", variant: "destructive" });
        setCurrentlyPlaying(null); setAudioElement(null);
      });
      audio.addEventListener('ended', () => {
        setCurrentlyPlaying(null); setAudioElement(null);
        setRadioStats(prev => ({ ...prev, currentlyPlaying: null }));
      });
      setCurrentlyPlaying(track.id); setAudioElement(audio);
      setRadioStats(prev => ({ ...prev, currentlyPlaying: track.title }));
      await audio.play();
    } catch (error) {
      toast({ title: "Playback Error", description: "Failed to play audio", variant: "destructive" });
      setCurrentlyPlaying(null); setAudioElement(null);
    }
  };

  const getCategories = () => Array.from(new Set(tracks.map(track => track.category).filter(Boolean)));

  const handleEditTrack = (track: AudioTrack) => {
    setSelectedTrack(track);
    setFormData({ title: track.title, artist_info: track.artist_info || '', category: track.category, is_public: track.is_public });
    setIsEditing(true);
  };

  const handleDeleteTrack = async (trackId: string) => {
    if (!confirm('Delete this track?')) return;
    try {
      if (currentlyPlaying === trackId && audioElement) {
        audioElement.pause(); setCurrentlyPlaying(null); setAudioElement(null);
      }
      const { error } = await supabase.from('audio_archive').delete().eq('id', trackId);
      if (error) throw error;
      toast({ title: "Deleted", description: "Track removed" });
      fetchTracks();
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    }
  };

  const handleSaveTrack = async () => {
    try {
      if (selectedTrack) {
        const { error } = await supabase.from('audio_archive').update(formData).eq('id', selectedTrack.id);
        if (error) throw error;
        toast({ title: "Saved", description: "Track updated" });
      }
      setIsEditing(false); setSelectedTrack(null);
      setFormData({ title: '', artist_info: '', category: 'performance', is_public: true });
      fetchTracks();
    } catch (error) {
      toast({ title: "Error", description: "Failed to save", variant: "destructive" });
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getCategoryBadge = (category: string) => {
    const colors: Record<string, string> = {
      performance: 'bg-primary/20 text-primary border-primary/30',
      announcement: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
      interlude: 'bg-violet-500/20 text-violet-700 dark:text-violet-400 border-violet-500/30',
      alumni_story: 'bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30',
    };
    return colors[category] || 'bg-muted text-muted-foreground border-border';
  };

  return (
    <div className="space-y-3">
      {/* Compact Stats Bar */}
      <div className="flex flex-wrap items-center gap-3 p-2 bg-card/50 border border-border rounded-lg">
        <div className="flex items-center gap-2 px-3 py-1">
          <Music className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-medium">{radioStats.totalTracks} tracks</span>
        </div>
        <div className="w-px h-4 bg-border" />
        <div className="flex items-center gap-2 px-3 py-1">
          <Users className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-medium">{radioStats.totalListeners} listeners</span>
        </div>
        <div className="w-px h-4 bg-border" />
        <div className="flex items-center gap-2 px-3 py-1">
          <Wifi className="h-3.5 w-3.5 text-emerald-500" />
          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">LIVE</span>
        </div>
        <div className="w-px h-4 bg-border" />
        <div className="flex items-center gap-2 px-3 py-1 flex-1 min-w-0">
          <Volume2 className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="text-xs truncate">{radioStats.currentlyPlaying || 'No track playing'}</span>
        </div>
      </div>

      {/* Main Tabbed Interface */}
      <Tabs defaultValue="library" className="w-full">
        <TabsList className="h-8 p-0.5 bg-muted/50">
          <TabsTrigger value="library" className="text-xs h-7 px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <ListMusic className="h-3 w-3 mr-1.5" />Library
          </TabsTrigger>
          <TabsTrigger value="queue" className="text-xs h-7 px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <GripVertical className="h-3 w-3 mr-1.5" />Queue
          </TabsTrigger>
          <TabsTrigger value="azuracast" className="text-xs h-7 px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Radio className="h-3 w-3 mr-1.5" />AzuraCast
          </TabsTrigger>
          <TabsTrigger value="settings" className="text-xs h-7 px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Settings className="h-3 w-3 mr-1.5" />Settings
          </TabsTrigger>
        </TabsList>

        {/* Library Tab */}
        <TabsContent value="library" className="mt-2">
          <Card className="border-border/50">
            <CardHeader className="py-2 px-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search tracks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-7 pl-7 pr-7 text-xs bg-muted/30"
                  />
                  {searchQuery && (
                    <Button variant="ghost" size="sm" onClick={() => setSearchQuery('')}
                      className="absolute right-0.5 top-1/2 -translate-y-1/2 h-6 w-6 p-0">
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="h-7 w-28 text-xs"><SelectValue placeholder="Category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">All</SelectItem>
                    {getCategories().map(cat => (
                      <SelectItem key={cat} value={cat} className="text-xs capitalize">{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={(v: typeof sortBy) => setSortBy(v)}>
                  <SelectTrigger className="h-7 w-20 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date" className="text-xs">Date</SelectItem>
                    <SelectItem value="title" className="text-xs">Title</SelectItem>
                    <SelectItem value="plays" className="text-xs">Plays</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={() => setSortOrder(o => o === 'asc' ? 'desc' : 'asc')}
                  className="h-7 w-7 p-0 text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</Button>
                <div className="flex gap-1 ml-auto">
                  <BulkUploadDialog onUploadComplete={() => { fetchTracks(); toast({ title: "Uploaded", description: "Tracks added" }); }} />
                  <Button size="sm" onClick={() => setShowMediaLibrary(true)} className="h-7 text-xs px-2">
                    <Plus className="h-3 w-3 mr-1" />Add
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-2">
              <ScrollArea className="h-[calc(100vh-280px)] min-h-[300px]">
                <div className="space-y-1">
                  {filteredTracks.map((track) => (
                    <div key={track.id}
                      className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 group cursor-grab"
                      draggable onDragStart={(e) => {
                        e.dataTransfer.setData('application/json', JSON.stringify(track));
                        e.dataTransfer.effectAllowed = 'copy';
                      }}>
                      <GripVertical className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                      <Button variant="ghost" size="sm" onClick={() => handlePlayTrack(track)}
                        className={cn("h-6 w-6 p-0 shrink-0", currentlyPlaying === track.id && "text-primary bg-primary/10")}>
                        {currentlyPlaying === track.id ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                      </Button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium truncate text-foreground">{track.title}</span>
                          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-4 shrink-0", getCategoryBadge(track.category))}>
                            {track.category}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                          <span className="truncate">{track.artist_info || 'Unknown'}</span>
                          <span className="flex items-center gap-0.5 shrink-0">
                            <Clock className="h-2.5 w-2.5" />{formatDuration(track.duration_seconds)}
                          </span>
                          <span className="flex items-center gap-0.5 shrink-0">
                            <BarChart3 className="h-2.5 w-2.5" />{track.play_count}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="sm" onClick={() => handleEditTrack(track)} className="h-6 w-6 p-0">
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteTrack(track.id)}
                          className="h-6 w-6 p-0 hover:text-destructive">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {filteredTracks.length === 0 && !loading && (
                    <div className="text-center py-6 text-xs text-muted-foreground">
                      {searchQuery || categoryFilter !== 'all' ? 'No matching tracks' : 'No tracks yet'}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Queue Tab */}
        <TabsContent value="queue" className="mt-2">
          <RadioPlaylistQueue availableTracks={filteredTracks} onRefreshTracks={fetchTracks} />
        </TabsContent>

        {/* AzuraCast Tab */}
        <TabsContent value="azuracast" className="mt-2">
          <AzuraCastAdminPanel />
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="mt-2">
          <Card className="border-border/50">
            <CardHeader className="py-2 px-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Settings className="h-4 w-4" />Radio Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground text-center py-8">Configuration options coming soon</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setIsEditing(false)}>
          <Card className="w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm">Edit Track</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-4 pt-0">
              <div>
                <Label className="text-xs">Title</Label>
                <Input value={formData.title} onChange={(e) => setFormData(p => ({ ...p, title: e.target.value }))}
                  className="h-8 text-xs mt-1" />
              </div>
              <div>
                <Label className="text-xs">Artist</Label>
                <Input value={formData.artist_info} onChange={(e) => setFormData(p => ({ ...p, artist_info: e.target.value }))}
                  className="h-8 text-xs mt-1" />
              </div>
              <div>
                <Label className="text-xs">Category</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData(p => ({ ...p, category: v }))}>
                  <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="performance" className="text-xs">Performance</SelectItem>
                    <SelectItem value="announcement" className="text-xs">Announcement</SelectItem>
                    <SelectItem value="interlude" className="text-xs">Interlude</SelectItem>
                    <SelectItem value="alumni_story" className="text-xs">Alumni Story</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={formData.is_public}
                  onChange={(e) => setFormData(p => ({ ...p, is_public: e.target.checked }))}
                  className="rounded border-border" />
                Public Track
              </label>
              <div className="flex gap-2 pt-2">
                <Button onClick={handleSaveTrack} className="flex-1 h-8 text-xs">Save</Button>
                <Button variant="outline" onClick={() => setIsEditing(false)} className="flex-1 h-8 text-xs">Cancel</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <MediaLibraryDialog open={showMediaLibrary} onOpenChange={setShowMediaLibrary}
        onAddToPlaylist={(track) => {
          toast({ title: "Added", description: `"${track.title}" added to library` });
          fetchTracks();
          setShowMediaLibrary(false);
        }} />
    </div>
  );
};
