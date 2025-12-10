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
  Wifi,
  Upload,
  Camera,
  Mic,
  Library,
  Headphones,
  Folder,
  ArrowRight,
  RefreshCw,
  ChevronRight,
  Sparkles,
  Layers
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
  source?: string;
}

interface RadioStats {
  totalTracks: number;
  totalListeners: number;
  currentlyPlaying: string | null;
  uptime: string;
}

interface MediaSource {
  id: string;
  name: string;
  iconType: 'layers' | 'music' | 'headphones' | 'users' | 'camera';
  count: number;
  color: string;
}

export const RadioManagement = () => {
  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  const [filteredTracks, setFilteredTracks] = useState<AudioTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSource, setActiveSource] = useState<string>('all');
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
  const [activePanel, setActivePanel] = useState<'sources' | 'queue'>('sources');
  const [mediaSources, setMediaSources] = useState<MediaSource[]>([]);
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
  }, [tracks, searchQuery, activeSource, categoryFilter, sortBy, sortOrder]);

  useEffect(() => {
    // Update media source counts
    const archiveCount = tracks.filter(t => !t.id.startsWith('music_') && !t.id.startsWith('alumni_') && !t.id.startsWith('capture_')).length;
    const musicCount = tracks.filter(t => t.id.startsWith('music_')).length;
    const alumniCount = tracks.filter(t => t.id.startsWith('alumni_')).length;
    const captureCount = tracks.filter(t => t.id.startsWith('capture_')).length;

    const newSources: MediaSource[] = [
      { id: 'all', name: 'All Sources', iconType: 'layers', count: tracks.length, color: 'bg-primary' },
      { id: 'archive', name: 'Audio Archive', iconType: 'music', count: archiveCount, color: 'bg-blue-500' },
      { id: 'music', name: 'Music Library', iconType: 'headphones', count: musicCount, color: 'bg-purple-500' },
      { id: 'alumni', name: 'Alumni Stories', iconType: 'users', count: alumniCount, color: 'bg-amber-500' },
      { id: 'capture', name: 'Glee Cam', iconType: 'camera', count: captureCount, color: 'bg-pink-500' },
    ];

    setMediaSources(newSources);
  }, [tracks]);

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
            is_public: track.is_public, created_at: track.created_at, source: 'archive'
          });
        });
      }

      if (musicTracksResult.data) {
        musicTracksResult.data.forEach(track => {
          allTracks.push({
            id: `music_${track.id}`, title: track.title, artist_info: track.artist || 'Glee Club',
            audio_url: track.audio_url!, category: 'performance',
            duration_seconds: track.duration || 180, play_count: track.play_count || 0,
            is_public: true, created_at: track.created_at, source: 'music'
          });
        });
      }

      if (alumnaeAudioResult.data) {
        alumnaeAudioResult.data.forEach(track => {
          allTracks.push({
            id: `alumni_${track.id}`, title: track.title, artist_info: 'Alumnae Story',
            audio_url: track.audio_url!, category: 'alumni_story',
            duration_seconds: track.duration_seconds || 300, play_count: 0,
            is_public: track.is_approved || false, created_at: track.created_at, source: 'alumni'
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
      
      let matchesSource = true;
      if (activeSource === 'archive') matchesSource = !track.id.startsWith('music_') && !track.id.startsWith('alumni_') && !track.id.startsWith('capture_');
      else if (activeSource === 'music') matchesSource = track.id.startsWith('music_');
      else if (activeSource === 'alumni') matchesSource = track.id.startsWith('alumni_');
      else if (activeSource === 'capture') matchesSource = track.id.startsWith('capture_');
      
      return matchesSearch && matchesCategory && matchesSource;
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
      announcement: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      interlude: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
      alumni_story: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      capture: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
    };
    return colors[category] || 'bg-muted text-muted-foreground border-border';
  };

  const getSourceBadge = (source: string) => {
    const colors: Record<string, string> = {
      archive: 'bg-blue-500/20 text-blue-400',
      music: 'bg-purple-500/20 text-purple-400',
      alumni: 'bg-amber-500/20 text-amber-400',
      capture: 'bg-pink-500/20 text-pink-400',
    };
    return colors[source] || 'bg-muted text-muted-foreground';
  };

  return (
    <div className="space-y-4">
      {/* Header Stats Bar */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-lg border border-slate-700 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Radio className="h-5 w-5 text-primary" />
              <span className="text-lg font-bold text-white">Glee World Radio</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-full">
                <Music className="h-4 w-4 text-blue-400" />
                <span className="text-sm font-medium text-white">{radioStats.totalTracks}</span>
                <span className="text-xs text-slate-400">tracks</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-full">
                <Users className="h-4 w-4 text-green-400" />
                <span className="text-sm font-medium text-white">{radioStats.totalListeners}</span>
                <span className="text-xs text-slate-400">listeners</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 rounded-full">
                <Wifi className="h-4 w-4 text-emerald-400 animate-pulse" />
                <span className="text-sm font-bold text-emerald-400">LIVE</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchTracks} className="text-white border-slate-600 bg-slate-800 hover:bg-slate-700">
              <RefreshCw className="h-4 w-4 mr-2" />
              Sync
            </Button>
          </div>
        </div>
        
        {/* Now Playing */}
        {radioStats.currentlyPlaying && (
          <div className="mt-4 flex items-center gap-3 px-4 py-2 bg-slate-800/50 rounded-lg border border-slate-700">
            <Volume2 className="h-4 w-4 text-primary animate-pulse" />
            <span className="text-xs text-slate-400">Now Playing:</span>
            <span className="text-sm font-medium text-white">{radioStats.currentlyPlaying}</span>
          </div>
        )}
      </div>

      {/* Two-Panel Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Panel - Content Sources */}
        <div className="lg:col-span-7 space-y-4">
          {/* Quick Add Section */}
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader className="py-3 px-4 border-b border-slate-700">
              <CardTitle className="text-sm font-medium text-white flex items-center gap-2">
                <Plus className="h-4 w-4 text-primary" />
                Add Content to Radio
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="contents">
                  <BulkUploadDialog onUploadComplete={() => { fetchTracks(); toast({ title: "Uploaded", description: "Tracks added to library" }); }} />
                </div>
                <Button variant="outline" onClick={() => setShowMediaLibrary(true)} 
                  className="h-20 flex-col gap-2 bg-purple-500/10 border-purple-500/30 hover:bg-purple-500/20 text-white">
                  <Library className="h-6 w-6 text-purple-400" />
                  <span className="text-xs">Media Library</span>
                </Button>
                <Button variant="outline" 
                  className="h-20 flex-col gap-2 bg-pink-500/10 border-pink-500/30 hover:bg-pink-500/20 text-white">
                  <Camera className="h-6 w-6 text-pink-400" />
                  <span className="text-xs">Glee Cam</span>
                </Button>
                <Button variant="outline" 
                  className="h-20 flex-col gap-2 bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20 text-white">
                  <Mic className="h-6 w-6 text-amber-400" />
                  <span className="text-xs">Record Voice</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Source Tabs */}
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader className="py-2 px-4 border-b border-slate-700">
              <div className="flex flex-wrap items-center gap-2">
                {mediaSources.map((source) => (
                  <Button
                    key={source.id}
                    variant={activeSource === source.id ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setActiveSource(source.id)}
                    className={cn(
                      "h-8 text-xs gap-2",
                      activeSource === source.id 
                        ? "bg-primary text-primary-foreground" 
                        : "text-slate-300 hover:text-white hover:bg-slate-800"
                    )}
                  >
                    {source.iconType === 'layers' && <Layers className="h-4 w-4" />}
                    {source.iconType === 'music' && <Music className="h-4 w-4" />}
                    {source.iconType === 'headphones' && <Headphones className="h-4 w-4" />}
                    {source.iconType === 'users' && <Users className="h-4 w-4" />}
                    {source.iconType === 'camera' && <Camera className="h-4 w-4" />}
                    <span>{source.name}</span>
                    <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-slate-700">
                      {source.count}
                    </Badge>
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="p-3">
              {/* Search & Filters */}
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search tracks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-9 pl-9 pr-9 bg-slate-800 border-slate-600 text-white placeholder:text-slate-400"
                  />
                  {searchQuery && (
                    <Button variant="ghost" size="sm" onClick={() => setSearchQuery('')}
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 text-slate-400 hover:text-white">
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="h-9 w-32 bg-slate-800 border-slate-600 text-white">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600">
                    <SelectItem value="all" className="text-white">All Categories</SelectItem>
                    {getCategories().map(cat => (
                      <SelectItem key={cat} value={cat} className="text-white capitalize">{cat.replace('_', ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="sm" onClick={() => setSortOrder(o => o === 'asc' ? 'desc' : 'asc')}
                  className="h-9 px-3 text-slate-300 hover:text-white hover:bg-slate-800">
                  {sortOrder === 'asc' ? '↑' : '↓'} {sortBy}
                </Button>
              </div>

              {/* Track List */}
              <ScrollArea className="h-[400px]">
                <div className="space-y-1">
                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : filteredTracks.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                      <Music className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">{searchQuery || categoryFilter !== 'all' ? 'No matching tracks' : 'No tracks yet'}</p>
                    </div>
                  ) : (
                    filteredTracks.map((track) => (
                      <div 
                        key={track.id}
                        className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 group cursor-grab transition-colors"
                        draggable 
                        onDragStart={(e) => {
                          e.dataTransfer.setData('application/json', JSON.stringify(track));
                          e.dataTransfer.effectAllowed = 'copy';
                        }}
                      >
                        <GripVertical className="h-4 w-4 text-slate-500 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handlePlayTrack(track)}
                          className={cn(
                            "h-8 w-8 p-0 shrink-0 rounded-full",
                            currentlyPlaying === track.id 
                              ? "bg-primary text-primary-foreground" 
                              : "bg-slate-700 text-slate-300 hover:bg-primary hover:text-primary-foreground"
                          )}
                        >
                          {currentlyPlaying === track.id ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
                        </Button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-white truncate">{track.title}</span>
                            {track.source && (
                              <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-4 shrink-0 border-0", getSourceBadge(track.source))}>
                                {track.source}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-400">
                            <span className="truncate">{track.artist_info || 'Unknown'}</span>
                            <span className="flex items-center gap-1 shrink-0">
                              <Clock className="h-3 w-3" />{formatDuration(track.duration_seconds)}
                            </span>
                            {track.play_count > 0 && (
                              <span className="flex items-center gap-1 shrink-0">
                                <BarChart3 className="h-3 w-3" />{track.play_count}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="sm" onClick={() => handleEditTrack(track)} 
                            className="h-7 w-7 p-0 text-slate-400 hover:text-white hover:bg-slate-700">
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteTrack(track.id)}
                            className="h-7 w-7 p-0 text-slate-400 hover:text-red-400 hover:bg-slate-700">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" 
                            className="h-7 px-2 text-slate-400 hover:text-primary hover:bg-slate-700">
                            <Plus className="h-3.5 w-3.5 mr-1" />
                            <span className="text-xs">Queue</span>
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel - Queue & Controls */}
        <div className="lg:col-span-5 space-y-4">
          <Tabs defaultValue="queue" className="w-full">
            <TabsList className="w-full h-10 p-1 bg-slate-800 border border-slate-700">
              <TabsTrigger value="queue" className="flex-1 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-slate-300">
                <ListMusic className="h-4 w-4 mr-2" />
                Queue
              </TabsTrigger>
              <TabsTrigger value="azuracast" className="flex-1 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-slate-300">
                <Radio className="h-4 w-4 mr-2" />
                AzuraCast
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex-1 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-slate-300">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="queue" className="mt-4">
              <Card className="bg-slate-900 border-slate-700">
                <CardHeader className="py-3 px-4 border-b border-slate-700">
                  <CardTitle className="text-sm font-medium text-white flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Playlist Queue
                    <Badge variant="secondary" className="ml-auto bg-slate-700 text-slate-300">
                      Drag tracks here
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <RadioPlaylistQueue availableTracks={filteredTracks} onRefreshTracks={fetchTracks} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="azuracast" className="mt-4">
              <AzuraCastAdminPanel />
            </TabsContent>

            <TabsContent value="settings" className="mt-4">
              <Card className="bg-slate-900 border-slate-700">
                <CardHeader className="py-3 px-4 border-b border-slate-700">
                  <CardTitle className="text-sm font-medium text-white flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Radio Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <p className="text-sm text-slate-400 text-center py-8">Configuration options coming soon</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Edit Dialog */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => setIsEditing(false)}>
          <Card className="w-full max-w-md mx-4 bg-slate-900 border-slate-700" onClick={e => e.stopPropagation()}>
            <CardHeader className="py-4 px-5 border-b border-slate-700">
              <CardTitle className="text-base text-white">Edit Track</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-5">
              <div>
                <Label className="text-sm text-slate-300">Title</Label>
                <Input 
                  value={formData.title} 
                  onChange={(e) => setFormData(p => ({ ...p, title: e.target.value }))}
                  className="mt-1.5 bg-slate-800 border-slate-600 text-white" 
                />
              </div>
              <div>
                <Label className="text-sm text-slate-300">Artist</Label>
                <Input 
                  value={formData.artist_info} 
                  onChange={(e) => setFormData(p => ({ ...p, artist_info: e.target.value }))}
                  className="mt-1.5 bg-slate-800 border-slate-600 text-white" 
                />
              </div>
              <div>
                <Label className="text-sm text-slate-300">Category</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData(p => ({ ...p, category: v }))}>
                  <SelectTrigger className="mt-1.5 bg-slate-800 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600">
                    <SelectItem value="performance" className="text-white">Performance</SelectItem>
                    <SelectItem value="announcement" className="text-white">Announcement</SelectItem>
                    <SelectItem value="interlude" className="text-white">Interlude</SelectItem>
                    <SelectItem value="alumni_story" className="text-white">Alumni Story</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input 
                  type="checkbox" 
                  checked={formData.is_public}
                  onChange={(e) => setFormData(p => ({ ...p, is_public: e.target.checked }))}
                  className="rounded border-slate-600 bg-slate-800" 
                />
                Public Track
              </label>
              <div className="flex gap-3 pt-2">
                <Button onClick={handleSaveTrack} className="flex-1">Save Changes</Button>
                <Button variant="outline" onClick={() => setIsEditing(false)} 
                  className="flex-1 border-slate-600 text-slate-300 hover:text-white hover:bg-slate-800">
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <MediaLibraryDialog 
        open={showMediaLibrary} 
        onOpenChange={setShowMediaLibrary}
        onAddToPlaylist={(track) => {
          toast({ title: "Added", description: `"${track.title}" added to library` });
          fetchTracks();
          setShowMediaLibrary(false);
        }} 
      />
    </div>
  );
};
