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
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { azuraCastService } from '@/services/azuracast';
import { cn } from '@/lib/utils';
import { 
  Radio, Music, Play, Pause, Plus, Edit, Trash2, Users, Volume2, Clock, Settings,
  BarChart3, Search, X, GripVertical, ListMusic, Wifi, Upload, Camera, Mic, Library,
  Headphones, Folder, RefreshCw, ChevronRight, Sparkles, Layers,
  List, Calendar, Server, Activity, History, Webhook, HardDrive, Podcast, Globe, Eye, EyeOff
} from 'lucide-react';
import { RadioPlaylistQueue } from '../radio/RadioPlaylistQueue';
import { BulkUploadDialog } from '@/components/radio/BulkUploadDialog';
import { MediaLibraryDialog } from '@/components/radio/MediaLibraryDialog';
import { DJTransportControl } from '@/components/radio/DJTransportControl';
import { RadioScheduleTimeline } from '@/components/radio/RadioScheduleTimeline';

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
  azuraCastTracks: number;
  totalListeners: number;
  currentlyPlaying: string | null;
  currentArtist: string | null;
  currentPlaylist: string | null;
  currentArt: string | null;
  currentElapsed: number | null;
  currentDuration: number | null;
  playingNext: { title: string | null; artist: string | null; playlist: string | null; art: string | null; duration: number | null; } | null;
  isOnline: boolean;
  isLive: boolean;
  streamerName: string | null;
  lastUpdated: string | null;
}

export const RadioManagement = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const { toast } = useToast();

  // Radio stats
  const [radioStats, setRadioStats] = useState<RadioStats>({
    totalTracks: 0, azuraCastTracks: 0, totalListeners: 0, currentlyPlaying: null,
    currentArtist: null, currentPlaylist: null, currentArt: null, currentElapsed: null,
    currentDuration: null, playingNext: null, isOnline: false, isLive: false,
    streamerName: null, lastUpdated: null
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

  // AzuraCast data
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [stationConfig, setStationConfig] = useState<any>(null);
  const [streamers, setStreamers] = useState<any[]>([]);
  const [mounts, setMounts] = useState<any[]>([]);
  const [listeners, setListeners] = useState<any[]>([]);
  const [songHistory, setSongHistory] = useState<any[]>([]);
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [sftpUsers, setSftpUsers] = useState<any[]>([]);

  // Track unsupported features
  const [unsupportedFeatures, setUnsupportedFeatures] = useState<Set<string>>(new Set());

  // Form states
  const [newPlaylist, setNewPlaylist] = useState({ name: '', description: '', type: 'default' as 'default' | 'scheduled' | 'once_per_x_songs' | 'once_per_x_minutes', weight: 3, is_enabled: true });
  const [newStreamer, setNewStreamer] = useState({ streamer_username: '', streamer_password: '', display_name: '', is_active: true });
  const [newWebhook, setNewWebhook] = useState({ name: '', type: 'discord', webhook_url: '', triggers: ['song_changed'] });
  const [newSftpUser, setNewSftpUser] = useState({ username: '', password: '' });

  useEffect(() => {
    connectToAzuraCast();
  }, []);

  useEffect(() => {
    filterTracks();
  }, [tracks, searchQuery, activeSource, categoryFilter]);

  const connectToAzuraCast = async () => {
    try {
      setLoading(true);
      await azuraCastService.getStationConfig();
      setIsConnected(true);
      await loadAllData();
      toast({ title: "Connected", description: "AzuraCast connected successfully" });
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
      fetchRadioStats(),
      loadPlaylists(),
      loadSchedule(),
      loadStationConfig(),
      loadStreamers(),
      loadMounts(),
      loadListeners(),
      loadSongHistory(),
      loadWebhooks(),
      loadSftpUsers()
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
          allTracks.push({ id: `music_${track.id}`, title: track.title, artist_info: track.artist || 'Glee Club', audio_url: track.audio_url!, category: 'performance', duration_seconds: track.duration || 180, play_count: track.play_count || 0, is_public: true, created_at: track.created_at, source: 'music' });
        });
      }
      if (alumnaeAudioResult.data) {
        alumnaeAudioResult.data.forEach(track => {
          allTracks.push({ id: `alumni_${track.id}`, title: track.title, artist_info: 'Alumnae Story', audio_url: track.audio_url!, category: 'alumni_story', duration_seconds: track.duration_seconds || 300, play_count: 0, is_public: track.is_approved || false, created_at: track.created_at, source: 'alumni' });
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
      const nowPlaying = await azuraCastService.getNowPlaying();
      if (nowPlaying) {
        setRadioStats(prev => ({
          ...prev,
          currentlyPlaying: nowPlaying.now_playing?.song?.title || null,
          currentArtist: nowPlaying.now_playing?.song?.artist || null,
          currentPlaylist: nowPlaying.now_playing?.playlist || null,
          currentArt: nowPlaying.now_playing?.song?.art || null,
          currentElapsed: nowPlaying.now_playing?.elapsed || null,
          currentDuration: nowPlaying.now_playing?.duration || null,
          totalListeners: nowPlaying.listeners?.current || 0,
          isOnline: true,
          isLive: nowPlaying.live?.is_live || false,
          streamerName: nowPlaying.live?.streamer_name || null,
          playingNext: nowPlaying.playing_next ? { title: nowPlaying.playing_next.song?.title || null, artist: nowPlaying.playing_next.song?.artist || null, playlist: nowPlaying.playing_next.playlist || null, art: nowPlaying.playing_next.song?.art || null, duration: nowPlaying.playing_next.duration || null } : null
        }));
      }
      const azuraCount = await azuraCastService.getMediaCount();
      setRadioStats(prev => ({ ...prev, azuraCastTracks: azuraCount }));
    } catch (error) {
      console.error('Error fetching radio stats:', error);
    }
  };

  const isUnsupportedError = (error: any): boolean => {
    const errorStr = String(error?.message || error || '');
    return errorStr.includes('StationUnsupportedException') || errorStr.includes('does not currently support');
  };

  const loadPlaylists = async () => { try { setPlaylists(await azuraCastService.getPlaylists() || []); } catch (e) { console.error(e); } };
  const loadSchedule = async () => { try { setSchedule(await azuraCastService.getSchedule() || []); } catch (e) { console.error(e); } };
  const loadStationConfig = async () => { try { setStationConfig(await azuraCastService.getStationConfig()); } catch (e) { console.error(e); } };
  const loadStreamers = async () => { 
    try { 
      setStreamers(await azuraCastService.getStreamers() || []); 
      setUnsupportedFeatures(prev => { const next = new Set(prev); next.delete('streamers'); return next; });
    } catch (e: any) { 
      console.error(e); 
      if (isUnsupportedError(e)) setUnsupportedFeatures(prev => new Set(prev).add('streamers'));
    } 
  };
  const loadMounts = async () => { try { setMounts(await azuraCastService.getMounts() || []); } catch (e) { console.error(e); } };
  const loadListeners = async () => { try { setListeners(await azuraCastService.getListeners() || []); } catch (e) { console.error(e); } };
  const loadSongHistory = async () => { try { setSongHistory(await azuraCastService.getSongHistory() || []); } catch (e) { console.error(e); } };
  const loadWebhooks = async () => { try { setWebhooks(await azuraCastService.getWebhooks() || []); } catch (e) { console.error(e); } };
  const loadSftpUsers = async () => { 
    try { 
      setSftpUsers(await azuraCastService.getSftpUsers() || []); 
      setUnsupportedFeatures(prev => { const next = new Set(prev); next.delete('sftp'); return next; });
    } catch (e: any) { 
      console.error(e); 
      if (isUnsupportedError(e)) setUnsupportedFeatures(prev => new Set(prev).add('sftp'));
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

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTimestamp = (timestamp: number) => new Date(timestamp * 1000).toLocaleString();

  const restartStation = async () => {
    if (!confirm('Restart the station?')) return;
    try {
      await azuraCastService.restartStation();
      toast({ title: "Station restarting" });
    } catch (error) {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const createPlaylist = async () => {
    if (!newPlaylist.name.trim()) return;
    try {
      await azuraCastService.createPlaylist(newPlaylist);
      toast({ title: "Playlist created" });
      setNewPlaylist({ name: '', description: '', type: 'default', weight: 3, is_enabled: true });
      await loadPlaylists();
    } catch (e) { toast({ title: "Error", variant: "destructive" }); }
  };

  const createStreamer = async () => {
    if (!newStreamer.streamer_username.trim()) return;
    try {
      await azuraCastService.createStreamer(newStreamer);
      toast({ title: "DJ created" });
      setNewStreamer({ streamer_username: '', streamer_password: '', display_name: '', is_active: true });
      await loadStreamers();
    } catch (e) { toast({ title: "Error", variant: "destructive" }); }
  };

  const createWebhook = async () => {
    if (!newWebhook.name.trim() || !newWebhook.webhook_url.trim()) return;
    try {
      await azuraCastService.createWebhook(newWebhook);
      toast({ title: "Webhook created" });
      setNewWebhook({ name: '', type: 'discord', webhook_url: '', triggers: ['song_changed'] });
      await loadWebhooks();
    } catch (e) { toast({ title: "Error", variant: "destructive" }); }
  };

  const createSftpUser = async () => {
    if (!newSftpUser.username.trim()) return;
    try {
      await azuraCastService.createSftpUser(newSftpUser);
      toast({ title: "SFTP user created" });
      setNewSftpUser({ username: '', password: '' });
      await loadSftpUsers();
    } catch (e) { toast({ title: "Error", variant: "destructive" }); }
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const webhookTypes = ['discord', 'telegram', 'twitter', 'tunein', 'generic'];
  const webhookTriggers = ['song_changed', 'live_connect', 'live_disconnect', 'station_offline', 'station_online'];

  const mediaSources = [
    { id: 'all', name: 'All', count: tracks.length },
    { id: 'archive', name: 'Archive', count: tracks.filter(t => !t.id.startsWith('music_') && !t.id.startsWith('alumni_')).length },
    { id: 'music', name: 'Music', count: tracks.filter(t => t.id.startsWith('music_')).length },
    { id: 'alumni', name: 'Alumni', count: tracks.filter(t => t.id.startsWith('alumni_')).length },
  ];

  return (
    <div className="space-y-4">
      {/* Header - compact status bar only */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-lg border border-slate-700 p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Radio className="h-5 w-5 text-primary" />
              <span className="text-lg font-bold text-white">Glee World Radio</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-slate-800 text-xs"><Music className="h-3 w-3 mr-1" />{radioStats.totalTracks} local</Badge>
              <Badge className="bg-purple-500/20 text-purple-400 text-xs"><Radio className="h-3 w-3 mr-1" />{radioStats.azuraCastTracks} server</Badge>
              <Badge className="bg-green-500/20 text-green-400 text-xs"><Users className="h-3 w-3 mr-1" />{radioStats.totalListeners}</Badge>
              {radioStats.isOnline ? (
                <Badge className="bg-emerald-500 text-xs"><Wifi className="h-3 w-3 mr-1" />{radioStats.isLive ? 'LIVE' : 'ONLINE'}</Badge>
              ) : (
                <Badge variant="destructive" className="text-xs"><Wifi className="h-3 w-3 mr-1" />OFFLINE</Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleSync} disabled={loading} className="border-slate-600 text-white hover:bg-slate-700 h-8">
              <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />Sync
            </Button>
            <Button variant="outline" size="sm" onClick={restartStation} className="border-red-600 text-red-400 hover:bg-red-500/20 h-8">
              <RefreshCw className="h-3 w-3 mr-1" />Restart
            </Button>
          </div>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto gap-1 p-1 bg-slate-800 border border-slate-700">
          <TabsTrigger value="dashboard" className="text-xs data-[state=active]:bg-primary"><Radio className="h-3 w-3 mr-1" />Dashboard</TabsTrigger>
          <TabsTrigger value="queue" className="text-xs data-[state=active]:bg-primary"><ListMusic className="h-3 w-3 mr-1" />Queue</TabsTrigger>
          <TabsTrigger value="library" className="text-xs data-[state=active]:bg-primary"><Library className="h-3 w-3 mr-1" />Library</TabsTrigger>
          <TabsTrigger value="playlists" className="text-xs data-[state=active]:bg-primary"><List className="h-3 w-3 mr-1" />Playlists</TabsTrigger>
          <TabsTrigger value="schedule" className="text-xs data-[state=active]:bg-primary"><Calendar className="h-3 w-3 mr-1" />Schedule</TabsTrigger>
          <TabsTrigger value="djs" className="text-xs data-[state=active]:bg-primary"><Mic className="h-3 w-3 mr-1" />DJs</TabsTrigger>
          <TabsTrigger value="mounts" className="text-xs data-[state=active]:bg-primary"><Server className="h-3 w-3 mr-1" />Mounts</TabsTrigger>
          <TabsTrigger value="listeners" className="text-xs data-[state=active]:bg-primary"><Users className="h-3 w-3 mr-1" />Listeners</TabsTrigger>
          <TabsTrigger value="history" className="text-xs data-[state=active]:bg-primary"><History className="h-3 w-3 mr-1" />History</TabsTrigger>
          <TabsTrigger value="webhooks" className="text-xs data-[state=active]:bg-primary"><Webhook className="h-3 w-3 mr-1" />Webhooks</TabsTrigger>
          <TabsTrigger value="sftp" className="text-xs data-[state=active]:bg-primary"><HardDrive className="h-3 w-3 mr-1" />SFTP</TabsTrigger>
          <TabsTrigger value="config" className="text-xs data-[state=active]:bg-primary"><Settings className="h-3 w-3 mr-1" />Config</TabsTrigger>
        </TabsList>

        {/* DASHBOARD */}
        <TabsContent value="dashboard" className="space-y-4 mt-4">
          <DJTransportControl stationState={{ isOnline: radioStats.isOnline, isLive: radioStats.isLive, streamerName: radioStats.streamerName, currentlyPlaying: radioStats.currentlyPlaying, currentArtist: radioStats.currentArtist, listenerCount: radioStats.totalListeners }} onRefresh={handleSync} />
          <RadioScheduleTimeline onRefresh={handleSync} currentSongElapsed={radioStats.currentElapsed} currentSongDuration={radioStats.currentDuration} currentSongTitle={radioStats.currentlyPlaying} />
        </TabsContent>

        {/* QUEUE */}
        <TabsContent value="queue" className="mt-4">
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader className="py-3 border-b border-slate-700">
              <CardTitle className="text-sm text-white flex items-center gap-2"><ListMusic className="h-4 w-4" />Playlist Queue</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <RadioPlaylistQueue availableTracks={filteredTracks} onRefreshTracks={fetchTracks} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* LIBRARY */}
        <TabsContent value="library" className="mt-4">
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader className="py-3 border-b border-slate-700">
              <CardTitle className="text-sm text-white flex items-center justify-between">
                <span className="flex items-center gap-2"><Library className="h-4 w-4" />Media Library</span>
                <div className="flex gap-2">
                  <BulkUploadDialog onUploadComplete={() => { fetchTracks(); toast({ title: "Uploaded" }); }} />
                  <Button variant="outline" size="sm" onClick={() => setShowMediaLibrary(true)} className="border-slate-600 text-white">
                    <Plus className="h-4 w-4 mr-1" />Browse
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="flex flex-wrap gap-2">
                {mediaSources.map(src => (
                  <Button key={src.id} variant={activeSource === src.id ? 'default' : 'outline'} size="sm" onClick={() => setActiveSource(src.id)} className="text-xs">
                    {src.name} <Badge variant="secondary" className="ml-1 h-5">{src.count}</Badge>
                  </Button>
                ))}
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 bg-slate-800 border-slate-600 text-white" />
                </div>
              </div>
              <ScrollArea className="h-[400px]">
                <div className="space-y-1">
                  {filteredTracks.map(track => (
                    <div key={track.id} className="flex items-center gap-3 p-3 bg-slate-800/50 hover:bg-slate-800 rounded-lg group">
                      <Button variant="ghost" size="sm" onClick={() => handlePlayTrack(track)} className={cn("h-8 w-8 p-0 rounded-full", currentlyPlaying === track.id ? "bg-primary text-primary-foreground" : "bg-slate-700")}>
                        {currentlyPlaying === track.id ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
                      </Button>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{track.title}</p>
                        <p className="text-xs text-slate-400">{track.artist_info || 'Unknown'} • {formatDuration(track.duration_seconds)}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px]">{track.source}</Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PLAYLISTS */}
        <TabsContent value="playlists" className="mt-4">
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader className="py-3 border-b border-slate-700">
              <CardTitle className="text-sm text-white flex items-center justify-between">
                <span className="flex items-center gap-2"><List className="h-4 w-4" />Playlists</span>
                <Badge className="bg-slate-700">{playlists.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-3 gap-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                <Input value={newPlaylist.name} onChange={(e) => setNewPlaylist(p => ({ ...p, name: e.target.value }))} placeholder="Name" className="bg-slate-800 border-slate-600 text-white" />
                <Select value={newPlaylist.type} onValueChange={(v) => setNewPlaylist(p => ({ ...p, type: v as 'default' | 'scheduled' | 'once_per_x_songs' | 'once_per_x_minutes' }))}>
                  <SelectTrigger className="bg-slate-800 border-slate-600 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600">
                    <SelectItem value="default">Default</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="once_per_x_songs">Once per X songs</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={createPlaylist}><Plus className="h-4 w-4 mr-2" />Create</Button>
              </div>
              <ScrollArea className="h-[300px]">
                {playlists.map(p => (
                  <div key={p.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700 mb-2">
                    <div>
                      <p className="font-medium text-white">{p.name}</p>
                      <p className="text-xs text-slate-400">{p.type} • Weight: {p.weight}</p>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={p.is_enabled ? "default" : "secondary"}>{p.is_enabled ? 'Active' : 'Off'}</Badge>
                      <Button variant="ghost" size="sm" onClick={() => azuraCastService.deletePlaylist(p.id).then(loadPlaylists)} className="text-red-400"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                ))}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SCHEDULE */}
        <TabsContent value="schedule" className="mt-4">
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader className="py-3 border-b border-slate-700">
              <CardTitle className="text-sm text-white flex items-center gap-2"><Calendar className="h-4 w-4" />Schedule</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <ScrollArea className="h-[300px]">
                {schedule.map(entry => (
                  <div key={entry.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700 mb-2">
                    <div>
                      <p className="font-medium text-white">{entry.name}</p>
                      <p className="text-xs text-slate-400">{entry.start_time} - {entry.end_time} • {entry.days?.map((d: number) => dayNames[d]).join(', ')}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => azuraCastService.deleteScheduleEntry(entry.id).then(loadSchedule).catch((e) => toast({ title: 'Cannot Delete', description: e.message || 'Schedule items are managed through playlists', variant: 'destructive' }))} className="text-red-400"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* DJS */}
        <TabsContent value="djs" className="mt-4">
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader className="py-3 border-b border-slate-700">
              <CardTitle className="text-sm text-white flex items-center justify-between">
                <span className="flex items-center gap-2"><Mic className="h-4 w-4" />Live DJs</span>
                <Badge className="bg-slate-700">{streamers.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {unsupportedFeatures.has('streamers') ? (
                <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <Server className="h-8 w-8 text-amber-400" />
                  <div>
                    <p className="font-medium text-amber-200">Live DJs Not Available</p>
                    <p className="text-sm text-amber-400/80">This station does not have DJ/streamer functionality enabled. Contact your AzuraCast administrator to enable live streaming support.</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-4 gap-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                    <Input value={newStreamer.streamer_username} onChange={(e) => setNewStreamer(p => ({ ...p, streamer_username: e.target.value }))} placeholder="Username" className="bg-slate-800 border-slate-600 text-white" />
                    <Input type="password" value={newStreamer.streamer_password} onChange={(e) => setNewStreamer(p => ({ ...p, streamer_password: e.target.value }))} placeholder="Password" className="bg-slate-800 border-slate-600 text-white" />
                    <Input value={newStreamer.display_name} onChange={(e) => setNewStreamer(p => ({ ...p, display_name: e.target.value }))} placeholder="Display Name" className="bg-slate-800 border-slate-600 text-white" />
                    <Button onClick={createStreamer}><Plus className="h-4 w-4 mr-2" />Add DJ</Button>
                  </div>
                  <ScrollArea className="h-[250px]">
                    {streamers.map(s => (
                      <div key={s.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700 mb-2">
                        <div>
                          <p className="font-medium text-white">{s.display_name || s.streamer_username}</p>
                          <p className="text-xs text-slate-400">@{s.streamer_username}</p>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant={s.is_active ? "default" : "secondary"}>{s.is_active ? 'Active' : 'Off'}</Badge>
                          <Button variant="ghost" size="sm" onClick={() => azuraCastService.deleteStreamer(s.id).then(loadStreamers)} className="text-red-400"><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    ))}
                  </ScrollArea>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* MOUNTS */}
        <TabsContent value="mounts" className="mt-4">
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader className="py-3 border-b border-slate-700">
              <CardTitle className="text-sm text-white flex items-center justify-between">
                <span className="flex items-center gap-2"><Server className="h-4 w-4" />Mount Points</span>
                <Badge className="bg-slate-700">{mounts.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <ScrollArea className="h-[300px]">
                {mounts.map(m => (
                  <div key={m.id} className="p-3 bg-slate-800/50 rounded-lg border border-slate-700 mb-2">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-white">{m.display_name || m.name}</p>
                      <div className="flex gap-2">
                        {m.is_default && <Badge className="bg-blue-500">Default</Badge>}
                        <Badge variant={m.is_visible_on_public_pages ? "default" : "secondary"}>{m.is_visible_on_public_pages ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}</Badge>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 font-mono truncate">{m.url}</p>
                    <div className="flex gap-4 mt-2 text-xs text-slate-400">
                      <span><Users className="h-3 w-3 inline mr-1" />{m.listeners?.current || 0} current</span>
                      <span>{m.listeners?.unique || 0} unique</span>
                    </div>
                  </div>
                ))}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* LISTENERS */}
        <TabsContent value="listeners" className="mt-4">
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader className="py-3 border-b border-slate-700">
              <CardTitle className="text-sm text-white flex items-center justify-between">
                <span className="flex items-center gap-2"><Users className="h-4 w-4" />Listeners</span>
                <Badge className="bg-green-500">{listeners.length} online</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <ScrollArea className="h-[300px]">
                {listeners.length === 0 ? (
                  <p className="text-center text-slate-400 py-8">No active listeners</p>
                ) : (
                  listeners.map(l => (
                    <div key={l.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700 mb-2">
                      <div>
                        <p className="text-sm font-medium text-white font-mono">{l.ip}</p>
                        <p className="text-xs text-slate-400 truncate max-w-[300px]">{l.user_agent}</p>
                        <p className="text-xs text-slate-500">Mount: {l.mount_name} • {formatDuration(l.connected_time)}</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => azuraCastService.disconnectListener(l.id).then(loadListeners)} className="text-red-400"><X className="h-4 w-4" /></Button>
                    </div>
                  ))
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* HISTORY */}
        <TabsContent value="history" className="mt-4">
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader className="py-3 border-b border-slate-700">
              <CardTitle className="text-sm text-white flex items-center justify-between">
                <span className="flex items-center gap-2"><History className="h-4 w-4" />Song History</span>
                <Button variant="ghost" size="sm" onClick={loadSongHistory}><RefreshCw className="h-4 w-4" /></Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <ScrollArea className="h-[350px]">
                {songHistory.map(item => (
                  <div key={item.sh_id} className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700 mb-2">
                    {item.song?.art ? <img src={item.song.art} alt="" className="h-12 w-12 rounded" /> : <div className="h-12 w-12 bg-slate-700 rounded flex items-center justify-center"><Music className="h-5 w-5 text-slate-400" /></div>}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">{item.song?.title}</p>
                      <p className="text-xs text-slate-400">{item.song?.artist}</p>
                      <p className="text-xs text-slate-500">{formatTimestamp(item.played_at)} • {formatDuration(item.duration)}</p>
                    </div>
                  </div>
                ))}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* WEBHOOKS */}
        <TabsContent value="webhooks" className="mt-4">
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader className="py-3 border-b border-slate-700">
              <CardTitle className="text-sm text-white flex items-center justify-between">
                <span className="flex items-center gap-2"><Webhook className="h-4 w-4" />Webhooks</span>
                <Badge className="bg-slate-700">{webhooks.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-3 gap-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                <Input value={newWebhook.name} onChange={(e) => setNewWebhook(p => ({ ...p, name: e.target.value }))} placeholder="Name" className="bg-slate-800 border-slate-600 text-white" />
                <Select value={newWebhook.type} onValueChange={(v) => setNewWebhook(p => ({ ...p, type: v }))}>
                  <SelectTrigger className="bg-slate-800 border-slate-600 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600">
                    {webhookTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button onClick={createWebhook}><Plus className="h-4 w-4 mr-2" />Create</Button>
              </div>
              <Input value={newWebhook.webhook_url} onChange={(e) => setNewWebhook(p => ({ ...p, webhook_url: e.target.value }))} placeholder="Webhook URL" className="bg-slate-800 border-slate-600 text-white" />
              <ScrollArea className="h-[200px]">
                {webhooks.map(w => (
                  <div key={w.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700 mb-2">
                    <div>
                      <p className="font-medium text-white">{w.name}</p>
                      <p className="text-xs text-slate-400">{w.type} • {w.triggers?.join(', ')}</p>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={w.is_enabled ? "default" : "secondary"}>{w.is_enabled ? 'On' : 'Off'}</Badge>
                      <Button variant="ghost" size="sm" onClick={() => azuraCastService.testWebhook(w.id)} className="text-blue-400"><Play className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => azuraCastService.deleteWebhook(w.id).then(loadWebhooks)} className="text-red-400"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                ))}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SFTP */}
        <TabsContent value="sftp" className="mt-4">
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader className="py-3 border-b border-slate-700">
              <CardTitle className="text-sm text-white flex items-center justify-between">
                <span className="flex items-center gap-2"><HardDrive className="h-4 w-4" />SFTP Users</span>
                <Badge className="bg-slate-700">{sftpUsers.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {unsupportedFeatures.has('sftp') ? (
                <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <HardDrive className="h-8 w-8 text-amber-400" />
                  <div>
                    <p className="font-medium text-amber-200">SFTP Not Available</p>
                    <p className="text-sm text-amber-400/80">This station does not have SFTP functionality enabled. Contact your AzuraCast administrator to enable SFTP support.</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                    <Input value={newSftpUser.username} onChange={(e) => setNewSftpUser(p => ({ ...p, username: e.target.value }))} placeholder="Username" className="bg-slate-800 border-slate-600 text-white" />
                    <Input type="password" value={newSftpUser.password} onChange={(e) => setNewSftpUser(p => ({ ...p, password: e.target.value }))} placeholder="Password" className="bg-slate-800 border-slate-600 text-white" />
                    <Button onClick={createSftpUser}><Plus className="h-4 w-4 mr-2" />Add</Button>
                  </div>
                  <ScrollArea className="h-[200px]">
                    {sftpUsers.map(u => (
                      <div key={u.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700 mb-2">
                        <p className="font-medium text-white font-mono">{u.username}</p>
                        <Button variant="ghost" size="sm" onClick={() => azuraCastService.deleteSftpUser(u.id).then(loadSftpUsers)} className="text-red-400"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    ))}
                  </ScrollArea>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* CONFIG */}
        <TabsContent value="config" className="mt-4">
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader className="py-3 border-b border-slate-700">
              <CardTitle className="text-sm text-white flex items-center gap-2"><Settings className="h-4 w-4" />Station Config</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {stationConfig ? (
                <div className="grid grid-cols-2 gap-4">
                  <div><Label className="text-slate-400 text-xs">Name</Label><Input value={stationConfig.name || ''} readOnly className="bg-slate-800 border-slate-600 text-white" /></div>
                  <div><Label className="text-slate-400 text-xs">Genre</Label><Input value={stationConfig.genre || ''} readOnly className="bg-slate-800 border-slate-600 text-white" /></div>
                  <div><Label className="text-slate-400 text-xs">Timezone</Label><Input value={stationConfig.timezone || ''} readOnly className="bg-slate-800 border-slate-600 text-white" /></div>
                  <div><Label className="text-slate-400 text-xs">Public Page</Label><Input value={stationConfig.enable_public_page ? 'Enabled' : 'Disabled'} readOnly className="bg-slate-800 border-slate-600 text-white" /></div>
                  <div className="col-span-2"><Label className="text-slate-400 text-xs">Description</Label><Textarea value={stationConfig.description || ''} readOnly className="bg-slate-800 border-slate-600 text-white" /></div>
                </div>
              ) : <p className="text-slate-400 text-center py-8">Loading...</p>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Media Library Dialog */}
      <MediaLibraryDialog open={showMediaLibrary} onOpenChange={setShowMediaLibrary} onAddToPlaylist={(track) => { toast({ title: "Added", description: `"${track.title}" added` }); fetchTracks(); setShowMediaLibrary(false); }} />
    </div>
  );
};