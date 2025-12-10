import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { azuraCastService } from '@/services/azuracast';
import { 
  Upload, 
  List, 
  Calendar, 
  Settings, 
  RefreshCw, 
  Plus, 
  Trash2, 
  Edit,
  Music,
  Radio,
  FileAudio,
  Clock,
  Users,
  Mic,
  Server,
  Activity,
  History,
  Webhook,
  HardDrive,
  Podcast,
  Globe,
  Play,
  Pause,
  X,
  Eye,
  EyeOff,
  Copy,
  Check
} from 'lucide-react';

interface Playlist {
  id: number;
  name: string;
  description: string;
  is_enabled: boolean;
  type: string;
  weight: number;
}

interface ScheduleEntry {
  id: number;
  name: string;
  start_time: string;
  end_time: string;
  days: number[];
  playlist_id?: number;
}

interface StationConfig {
  name: string;
  description: string;
  genre: string;
  timezone: string;
  enable_public_page: boolean;
}

interface Streamer {
  id: number;
  streamer_username: string;
  display_name: string;
  is_active: boolean;
  comments: string;
}

interface Mount {
  id: number;
  name: string;
  display_name: string;
  is_default: boolean;
  is_visible_on_public_pages: boolean;
  url: string;
  listeners: { current: number; unique: number; total: number };
}

interface Listener {
  id: number;
  ip: string;
  user_agent: string;
  mount_name: string;
  connected_time: number;
  connected_on: number;
  location?: { city?: string; region?: string; country?: string };
}

interface SongHistoryItem {
  sh_id: number;
  played_at: number;
  duration: number;
  playlist: string;
  streamer: string;
  song: {
    id: string;
    title: string;
    artist: string;
    album: string;
    art: string;
  };
}

interface Webhook {
  id: number;
  name: string;
  type: string;
  is_enabled: boolean;
  triggers: string[];
}

interface SftpUser {
  id: number;
  username: string;
}

interface RemoteRelay {
  id: number;
  display_name: string;
  url: string;
  is_visible_on_public_pages: boolean;
}

export const AzuraCastAdminPanel = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [stationConfig, setStationConfig] = useState<StationConfig | null>(null);
  const [streamers, setStreamers] = useState<Streamer[]>([]);
  const [mounts, setMounts] = useState<Mount[]>([]);
  const [listeners, setListeners] = useState<Listener[]>([]);
  const [songHistory, setSongHistory] = useState<SongHistoryItem[]>([]);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [sftpUsers, setSftpUsers] = useState<SftpUser[]>([]);
  const [remoteRelays, setRemoteRelays] = useState<RemoteRelay[]>([]);
  const [podcasts, setPodcasts] = useState<any[]>([]);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadMetadata, setUploadMetadata] = useState({
    title: '',
    artist: '',
    album: '',
    genre: ''
  });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('upload');
  const { toast } = useToast();

  const [newPlaylist, setNewPlaylist] = useState({
    name: '',
    description: '',
    type: 'default' as const,
    weight: 3,
    is_enabled: true
  });

  const [newSchedule, setNewSchedule] = useState({
    name: '',
    start_time: '',
    end_time: '',
    days: [] as number[],
    playlist_id: undefined as number | undefined
  });

  const [newStreamer, setNewStreamer] = useState({
    streamer_username: '',
    streamer_password: '',
    display_name: '',
    comments: '',
    is_active: true
  });

  const [newWebhook, setNewWebhook] = useState({
    name: '',
    type: 'discord',
    webhook_url: '',
    triggers: ['song_changed'] as string[]
  });

  const [newSftpUser, setNewSftpUser] = useState({
    username: '',
    password: ''
  });

  const connectToAzuraCast = async () => {
    try {
      setLoading(true);
      const stationConfig = await azuraCastService.getStationConfig();
      setIsConnected(true);
      
      await loadAllData();

      toast({
        title: "Connected",
        description: "Successfully connected to AzuraCast admin API",
      });
    } catch (error) {
      console.error('AzuraCast Connection error:', error);
      setIsConnected(false);
      
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Failed to connect",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAllData = async () => {
    await Promise.all([
      loadPlaylists(),
      loadSchedule(),
      loadStationConfig(),
      loadStreamers(),
      loadMounts(),
      loadListeners(),
      loadSongHistory(),
      loadWebhooks(),
      loadSftpUsers(),
      loadRemoteRelays(),
      loadPodcasts()
    ]);
  };

  const loadPlaylists = async () => {
    try {
      const data = await azuraCastService.getPlaylists();
      setPlaylists(data || []);
    } catch (error) {
      console.error('Error loading playlists:', error);
    }
  };

  const loadSchedule = async () => {
    try {
      const data = await azuraCastService.getSchedule();
      setSchedule(data || []);
    } catch (error) {
      console.error('Error loading schedule:', error);
    }
  };

  const loadStationConfig = async () => {
    try {
      const data = await azuraCastService.getStationConfig();
      setStationConfig(data);
    } catch (error) {
      console.error('Error loading station config:', error);
    }
  };

  const loadStreamers = async () => {
    try {
      const data = await azuraCastService.getStreamers();
      setStreamers(data || []);
    } catch (error) {
      console.error('Error loading streamers:', error);
    }
  };

  const loadMounts = async () => {
    try {
      const data = await azuraCastService.getMounts();
      setMounts(data || []);
    } catch (error) {
      console.error('Error loading mounts:', error);
    }
  };

  const loadListeners = async () => {
    try {
      const data = await azuraCastService.getListeners();
      setListeners(data || []);
    } catch (error) {
      console.error('Error loading listeners:', error);
    }
  };

  const loadSongHistory = async () => {
    try {
      const data = await azuraCastService.getSongHistory();
      setSongHistory(data || []);
    } catch (error) {
      console.error('Error loading song history:', error);
    }
  };

  const loadWebhooks = async () => {
    try {
      const data = await azuraCastService.getWebhooks();
      setWebhooks(data || []);
    } catch (error) {
      console.error('Error loading webhooks:', error);
    }
  };

  const loadSftpUsers = async () => {
    try {
      const data = await azuraCastService.getSftpUsers();
      setSftpUsers(data || []);
    } catch (error) {
      console.error('Error loading SFTP users:', error);
    }
  };

  const loadRemoteRelays = async () => {
    try {
      const data = await azuraCastService.getRemoteRelays();
      setRemoteRelays(data || []);
    } catch (error) {
      console.error('Error loading remote relays:', error);
    }
  };

  const loadPodcasts = async () => {
    try {
      const data = await azuraCastService.getPodcasts();
      setPodcasts(data || []);
    } catch (error) {
      console.error('Error loading podcasts:', error);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) {
      toast({ title: "Error", description: "Please select a file to upload", variant: "destructive" });
      return;
    }

    try {
      setLoading(true);
      await azuraCastService.uploadFile(selectedFile, uploadMetadata);
      toast({ title: "Success", description: `File "${selectedFile.name}" uploaded successfully` });
      setSelectedFile(null);
      setUploadMetadata({ title: '', artist: '', album: '', genre: '' });
    } catch (error) {
      toast({ title: "Upload Failed", description: "File upload not yet implemented via proxy", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const createPlaylist = async () => {
    if (!newPlaylist.name.trim()) {
      toast({ title: "Error", description: "Please enter a playlist name", variant: "destructive" });
      return;
    }

    try {
      setLoading(true);
      await azuraCastService.createPlaylist(newPlaylist);
      toast({ title: "Success", description: `Playlist "${newPlaylist.name}" created` });
      setNewPlaylist({ name: '', description: '', type: 'default', weight: 3, is_enabled: true });
      await loadPlaylists();
    } catch (error) {
      toast({ title: "Error", description: "Failed to create playlist", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const deletePlaylist = async (playlistId: number, playlistName: string) => {
    if (!confirm(`Delete playlist "${playlistName}"?`)) return;

    try {
      setLoading(true);
      await azuraCastService.deletePlaylist(playlistId);
      toast({ title: "Deleted", description: `Playlist "${playlistName}" deleted` });
      await loadPlaylists();
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete playlist", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const createStreamer = async () => {
    if (!newStreamer.streamer_username.trim() || !newStreamer.streamer_password.trim()) {
      toast({ title: "Error", description: "Username and password required", variant: "destructive" });
      return;
    }

    try {
      setLoading(true);
      await azuraCastService.createStreamer(newStreamer);
      toast({ title: "Success", description: `Streamer "${newStreamer.display_name || newStreamer.streamer_username}" created` });
      setNewStreamer({ streamer_username: '', streamer_password: '', display_name: '', comments: '', is_active: true });
      await loadStreamers();
    } catch (error) {
      toast({ title: "Error", description: "Failed to create streamer", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const deleteStreamer = async (streamerId: number, streamerName: string) => {
    if (!confirm(`Delete streamer "${streamerName}"?`)) return;

    try {
      setLoading(true);
      await azuraCastService.deleteStreamer(streamerId);
      toast({ title: "Deleted", description: `Streamer "${streamerName}" deleted` });
      await loadStreamers();
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete streamer", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const disconnectListener = async (listenerId: number) => {
    try {
      await azuraCastService.disconnectListener(listenerId);
      toast({ title: "Disconnected", description: "Listener disconnected" });
      await loadListeners();
    } catch (error) {
      toast({ title: "Error", description: "Failed to disconnect listener", variant: "destructive" });
    }
  };

  const createWebhook = async () => {
    if (!newWebhook.name.trim() || !newWebhook.webhook_url.trim()) {
      toast({ title: "Error", description: "Name and URL required", variant: "destructive" });
      return;
    }

    try {
      setLoading(true);
      await azuraCastService.createWebhook(newWebhook);
      toast({ title: "Success", description: `Webhook "${newWebhook.name}" created` });
      setNewWebhook({ name: '', type: 'discord', webhook_url: '', triggers: ['song_changed'] });
      await loadWebhooks();
    } catch (error) {
      toast({ title: "Error", description: "Failed to create webhook", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const deleteWebhook = async (webhookId: number, webhookName: string) => {
    if (!confirm(`Delete webhook "${webhookName}"?`)) return;

    try {
      await azuraCastService.deleteWebhook(webhookId);
      toast({ title: "Deleted", description: `Webhook "${webhookName}" deleted` });
      await loadWebhooks();
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete webhook", variant: "destructive" });
    }
  };

  const testWebhook = async (webhookId: number) => {
    try {
      await azuraCastService.testWebhook(webhookId);
      toast({ title: "Sent", description: "Test webhook sent" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to test webhook", variant: "destructive" });
    }
  };

  const createSftpUser = async () => {
    if (!newSftpUser.username.trim() || !newSftpUser.password.trim()) {
      toast({ title: "Error", description: "Username and password required", variant: "destructive" });
      return;
    }

    try {
      setLoading(true);
      await azuraCastService.createSftpUser(newSftpUser);
      toast({ title: "Success", description: `SFTP user "${newSftpUser.username}" created` });
      setNewSftpUser({ username: '', password: '' });
      await loadSftpUsers();
    } catch (error) {
      toast({ title: "Error", description: "Failed to create SFTP user", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const deleteSftpUser = async (userId: number, username: string) => {
    if (!confirm(`Delete SFTP user "${username}"?`)) return;

    try {
      await azuraCastService.deleteSftpUser(userId);
      toast({ title: "Deleted", description: `SFTP user "${username}" deleted` });
      await loadSftpUsers();
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete SFTP user", variant: "destructive" });
    }
  };

  const restartStation = async () => {
    if (!confirm('Restart the station? This will briefly interrupt the broadcast.')) return;

    try {
      setLoading(true);
      await azuraCastService.restartStation();
      toast({ title: "Success", description: "Station restart initiated" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to restart station", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const webhookTypes = ['discord', 'telegram', 'twitter', 'tunein', 'generic'];
  const webhookTriggers = ['song_changed', 'live_connect', 'live_disconnect', 'station_offline', 'station_online'];

  if (!isConnected) {
    return (
      <Card className="bg-slate-900 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Radio className="h-5 w-5" />
            Connect to AzuraCast Admin API
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 border border-slate-700 rounded-lg bg-slate-800/50">
            <h4 className="font-medium mb-2 text-white">Connection Status:</h4>
            <ul className="text-sm text-slate-400 space-y-1">
              <li>• Using secure server-side proxy</li>
              <li>• API key stored in Supabase secrets</li>
              <li>• Admin permissions verified</li>
            </ul>
          </div>
          
          <Button onClick={connectToAzuraCast} disabled={loading} className="w-full">
            {loading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Radio className="h-4 w-4 mr-2" />}
            {loading ? 'Connecting...' : 'Connect to AzuraCast'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">AzuraCast Admin</h2>
          <p className="text-sm text-slate-400">Complete radio station management</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadAllData} disabled={loading} className="border-slate-600 text-white hover:bg-slate-800">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={restartStation} disabled={loading} className="border-red-600 text-red-400 hover:bg-red-500/20">
            <RefreshCw className="h-4 w-4 mr-2" />
            Restart
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setIsConnected(false)} className="text-slate-400 hover:text-white">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1 p-1 bg-slate-800 border border-slate-700">
          <TabsTrigger value="upload" className="text-xs data-[state=active]:bg-primary"><Upload className="h-3 w-3 mr-1" />Upload</TabsTrigger>
          <TabsTrigger value="playlists" className="text-xs data-[state=active]:bg-primary"><List className="h-3 w-3 mr-1" />Playlists</TabsTrigger>
          <TabsTrigger value="schedule" className="text-xs data-[state=active]:bg-primary"><Calendar className="h-3 w-3 mr-1" />Schedule</TabsTrigger>
          <TabsTrigger value="streamers" className="text-xs data-[state=active]:bg-primary"><Mic className="h-3 w-3 mr-1" />DJs</TabsTrigger>
          <TabsTrigger value="mounts" className="text-xs data-[state=active]:bg-primary"><Server className="h-3 w-3 mr-1" />Mounts</TabsTrigger>
          <TabsTrigger value="listeners" className="text-xs data-[state=active]:bg-primary"><Users className="h-3 w-3 mr-1" />Listeners</TabsTrigger>
          <TabsTrigger value="history" className="text-xs data-[state=active]:bg-primary"><History className="h-3 w-3 mr-1" />History</TabsTrigger>
          <TabsTrigger value="webhooks" className="text-xs data-[state=active]:bg-primary"><Webhook className="h-3 w-3 mr-1" />Webhooks</TabsTrigger>
          <TabsTrigger value="sftp" className="text-xs data-[state=active]:bg-primary"><HardDrive className="h-3 w-3 mr-1" />SFTP</TabsTrigger>
          <TabsTrigger value="relays" className="text-xs data-[state=active]:bg-primary"><Globe className="h-3 w-3 mr-1" />Relays</TabsTrigger>
          <TabsTrigger value="podcasts" className="text-xs data-[state=active]:bg-primary"><Podcast className="h-3 w-3 mr-1" />Podcasts</TabsTrigger>
          <TabsTrigger value="config" className="text-xs data-[state=active]:bg-primary"><Settings className="h-3 w-3 mr-1" />Config</TabsTrigger>
        </TabsList>

        {/* UPLOAD TAB */}
        <TabsContent value="upload">
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader className="py-3 border-b border-slate-700">
              <CardTitle className="text-sm text-white flex items-center gap-2">
                <Upload className="h-4 w-4" />Upload to AzuraCast Media Library
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="space-y-2">
                <Label className="text-white">Audio File</Label>
                <Input type="file" accept="audio/*" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} className="bg-slate-800 border-slate-600 text-white" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white">Title</Label>
                  <Input value={uploadMetadata.title} onChange={(e) => setUploadMetadata(prev => ({ ...prev, title: e.target.value }))} placeholder="Song title" className="bg-slate-800 border-slate-600 text-white" />
                </div>
                <div className="space-y-2">
                  <Label className="text-white">Artist</Label>
                  <Input value={uploadMetadata.artist} onChange={(e) => setUploadMetadata(prev => ({ ...prev, artist: e.target.value }))} placeholder="Artist name" className="bg-slate-800 border-slate-600 text-white" />
                </div>
                <div className="space-y-2">
                  <Label className="text-white">Album</Label>
                  <Input value={uploadMetadata.album} onChange={(e) => setUploadMetadata(prev => ({ ...prev, album: e.target.value }))} placeholder="Album name" className="bg-slate-800 border-slate-600 text-white" />
                </div>
                <div className="space-y-2">
                  <Label className="text-white">Genre</Label>
                  <Input value={uploadMetadata.genre} onChange={(e) => setUploadMetadata(prev => ({ ...prev, genre: e.target.value }))} placeholder="Genre" className="bg-slate-800 border-slate-600 text-white" />
                </div>
              </div>
              
              <Button onClick={handleFileUpload} disabled={loading || !selectedFile}>
                <Upload className="h-4 w-4 mr-2" />Upload
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PLAYLISTS TAB */}
        <TabsContent value="playlists">
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader className="py-3 border-b border-slate-700">
              <CardTitle className="text-sm text-white flex items-center justify-between">
                <span className="flex items-center gap-2"><List className="h-4 w-4" />Playlists</span>
                <Badge className="bg-slate-700">{playlists.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                <Input value={newPlaylist.name} onChange={(e) => setNewPlaylist(prev => ({ ...prev, name: e.target.value }))} placeholder="Playlist name" className="bg-slate-800 border-slate-600 text-white" />
                <Select value={newPlaylist.type} onValueChange={(v: any) => setNewPlaylist(prev => ({ ...prev, type: v }))}>
                  <SelectTrigger className="bg-slate-800 border-slate-600 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600">
                    <SelectItem value="default">Default</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="once_per_x_songs">Once per X songs</SelectItem>
                    <SelectItem value="once_per_x_minutes">Once per X minutes</SelectItem>
                  </SelectContent>
                </Select>
                <Input type="number" value={newPlaylist.weight} onChange={(e) => setNewPlaylist(prev => ({ ...prev, weight: parseInt(e.target.value) || 1 }))} placeholder="Weight (1-10)" className="bg-slate-800 border-slate-600 text-white" />
                <Button onClick={createPlaylist} disabled={loading}><Plus className="h-4 w-4 mr-2" />Create</Button>
              </div>
              
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {playlists.map(playlist => (
                    <div key={playlist.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                      <div>
                        <p className="font-medium text-white">{playlist.name}</p>
                        <p className="text-xs text-slate-400">{playlist.type} • Weight: {playlist.weight}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={playlist.is_enabled ? "default" : "secondary"}>{playlist.is_enabled ? 'Active' : 'Disabled'}</Badge>
                        <Button variant="ghost" size="sm" onClick={() => deletePlaylist(playlist.id, playlist.name)} className="text-red-400 hover:text-red-300"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SCHEDULE TAB */}
        <TabsContent value="schedule">
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader className="py-3 border-b border-slate-700">
              <CardTitle className="text-sm text-white flex items-center gap-2"><Calendar className="h-4 w-4" />Schedule</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-3 gap-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                <Input value={newSchedule.name} onChange={(e) => setNewSchedule(prev => ({ ...prev, name: e.target.value }))} placeholder="Schedule name" className="bg-slate-800 border-slate-600 text-white" />
                <Input type="time" value={newSchedule.start_time} onChange={(e) => setNewSchedule(prev => ({ ...prev, start_time: e.target.value }))} className="bg-slate-800 border-slate-600 text-white" />
                <Input type="time" value={newSchedule.end_time} onChange={(e) => setNewSchedule(prev => ({ ...prev, end_time: e.target.value }))} className="bg-slate-800 border-slate-600 text-white" />
              </div>
              <div className="flex flex-wrap gap-2">
                {dayNames.map((day, i) => (
                  <Button key={i} variant={newSchedule.days.includes(i) ? 'default' : 'outline'} size="sm" onClick={() => setNewSchedule(prev => ({ ...prev, days: prev.days.includes(i) ? prev.days.filter(d => d !== i) : [...prev.days, i] }))} className="text-xs">{day}</Button>
                ))}
                <Button onClick={() => azuraCastService.createScheduleEntry(newSchedule).then(() => { loadSchedule(); toast({ title: "Created" }); })} disabled={loading}><Plus className="h-4 w-4 mr-2" />Add</Button>
              </div>
              
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {schedule.map(entry => (
                    <div key={entry.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                      <div>
                        <p className="font-medium text-white">{entry.name}</p>
                        <p className="text-xs text-slate-400">{entry.start_time} - {entry.end_time} • {entry.days?.map(d => dayNames[d]).join(', ')}</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => azuraCastService.deleteScheduleEntry(entry.id).then(loadSchedule)} className="text-red-400"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* STREAMERS (DJs) TAB */}
        <TabsContent value="streamers">
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader className="py-3 border-b border-slate-700">
              <CardTitle className="text-sm text-white flex items-center justify-between">
                <span className="flex items-center gap-2"><Mic className="h-4 w-4" />Live DJs / Streamers</span>
                <Badge className="bg-slate-700">{streamers.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                <Input value={newStreamer.streamer_username} onChange={(e) => setNewStreamer(prev => ({ ...prev, streamer_username: e.target.value }))} placeholder="Username" className="bg-slate-800 border-slate-600 text-white" />
                <Input type="password" value={newStreamer.streamer_password} onChange={(e) => setNewStreamer(prev => ({ ...prev, streamer_password: e.target.value }))} placeholder="Password" className="bg-slate-800 border-slate-600 text-white" />
                <Input value={newStreamer.display_name} onChange={(e) => setNewStreamer(prev => ({ ...prev, display_name: e.target.value }))} placeholder="Display name" className="bg-slate-800 border-slate-600 text-white" />
                <Button onClick={createStreamer} disabled={loading}><Plus className="h-4 w-4 mr-2" />Add DJ</Button>
              </div>
              
              <ScrollArea className="h-[250px]">
                <div className="space-y-2">
                  {streamers.map(streamer => (
                    <div key={streamer.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                      <div>
                        <p className="font-medium text-white">{streamer.display_name || streamer.streamer_username}</p>
                        <p className="text-xs text-slate-400">@{streamer.streamer_username}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={streamer.is_active ? "default" : "secondary"}>{streamer.is_active ? 'Active' : 'Disabled'}</Badge>
                        <Button variant="ghost" size="sm" onClick={() => deleteStreamer(streamer.id, streamer.display_name || streamer.streamer_username)} className="text-red-400"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* MOUNTS TAB */}
        <TabsContent value="mounts">
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader className="py-3 border-b border-slate-700">
              <CardTitle className="text-sm text-white flex items-center justify-between">
                <span className="flex items-center gap-2"><Server className="h-4 w-4" />Mount Points</span>
                <Badge className="bg-slate-700">{mounts.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {mounts.map(mount => (
                    <div key={mount.id} className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium text-white">{mount.display_name || mount.name}</p>
                        <div className="flex items-center gap-2">
                          {mount.is_default && <Badge className="bg-blue-500">Default</Badge>}
                          <Badge variant={mount.is_visible_on_public_pages ? "default" : "secondary"}>
                            {mount.is_visible_on_public_pages ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-xs text-slate-400 font-mono truncate">{mount.url}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                        <span className="flex items-center gap-1"><Users className="h-3 w-3" />{mount.listeners?.current || 0} current</span>
                        <span>{mount.listeners?.unique || 0} unique</span>
                        <span>{mount.listeners?.total || 0} total</span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* LISTENERS TAB */}
        <TabsContent value="listeners">
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader className="py-3 border-b border-slate-700">
              <CardTitle className="text-sm text-white flex items-center justify-between">
                <span className="flex items-center gap-2"><Users className="h-4 w-4" />Current Listeners</span>
                <Badge className="bg-green-500">{listeners.length} online</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {listeners.length === 0 ? (
                    <p className="text-center text-slate-400 py-8">No active listeners</p>
                  ) : (
                    listeners.map(listener => (
                      <div key={listener.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                        <div>
                          <p className="text-sm font-medium text-white font-mono">{listener.ip}</p>
                          <p className="text-xs text-slate-400 truncate max-w-[300px]">{listener.user_agent}</p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                            <span>Mount: {listener.mount_name}</span>
                            <span>Connected: {formatDuration(listener.connected_time)}</span>
                            {listener.location?.city && <span>{listener.location.city}, {listener.location.country}</span>}
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => disconnectListener(listener.id)} className="text-red-400"><X className="h-4 w-4" /></Button>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* HISTORY TAB */}
        <TabsContent value="history">
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader className="py-3 border-b border-slate-700">
              <CardTitle className="text-sm text-white flex items-center justify-between">
                <span className="flex items-center gap-2"><History className="h-4 w-4" />Song History</span>
                <Button variant="ghost" size="sm" onClick={loadSongHistory} className="text-slate-400"><RefreshCw className="h-4 w-4" /></Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <ScrollArea className="h-[350px]">
                <div className="space-y-2">
                  {songHistory.map(item => (
                    <div key={item.sh_id} className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                      {item.song.art ? (
                        <img src={item.song.art} alt="" className="h-12 w-12 rounded object-cover" />
                      ) : (
                        <div className="h-12 w-12 bg-slate-700 rounded flex items-center justify-center"><Music className="h-5 w-5 text-slate-400" /></div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white truncate">{item.song.title}</p>
                        <p className="text-xs text-slate-400 truncate">{item.song.artist}</p>
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                          <span>{formatTimestamp(item.played_at)}</span>
                          <span>{formatDuration(item.duration)}</span>
                          {item.playlist && <Badge variant="outline" className="text-[10px] h-4">{item.playlist}</Badge>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* WEBHOOKS TAB */}
        <TabsContent value="webhooks">
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader className="py-3 border-b border-slate-700">
              <CardTitle className="text-sm text-white flex items-center justify-between">
                <span className="flex items-center gap-2"><Webhook className="h-4 w-4" />Webhooks</span>
                <Badge className="bg-slate-700">{webhooks.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                <Input value={newWebhook.name} onChange={(e) => setNewWebhook(prev => ({ ...prev, name: e.target.value }))} placeholder="Webhook name" className="bg-slate-800 border-slate-600 text-white" />
                <Select value={newWebhook.type} onValueChange={(v) => setNewWebhook(prev => ({ ...prev, type: v }))}>
                  <SelectTrigger className="bg-slate-800 border-slate-600 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600">
                    {webhookTypes.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input value={newWebhook.webhook_url} onChange={(e) => setNewWebhook(prev => ({ ...prev, webhook_url: e.target.value }))} placeholder="Webhook URL" className="col-span-2 bg-slate-800 border-slate-600 text-white" />
              </div>
              <div className="flex flex-wrap gap-2">
                {webhookTriggers.map(trigger => (
                  <Button key={trigger} variant={newWebhook.triggers.includes(trigger) ? 'default' : 'outline'} size="sm" onClick={() => setNewWebhook(prev => ({ ...prev, triggers: prev.triggers.includes(trigger) ? prev.triggers.filter(t => t !== trigger) : [...prev.triggers, trigger] }))} className="text-xs">{trigger.replace('_', ' ')}</Button>
                ))}
                <Button onClick={createWebhook} disabled={loading}><Plus className="h-4 w-4 mr-2" />Create</Button>
              </div>
              
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {webhooks.map(webhook => (
                    <div key={webhook.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                      <div>
                        <p className="font-medium text-white">{webhook.name}</p>
                        <p className="text-xs text-slate-400">{webhook.type} • {webhook.triggers?.join(', ')}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={webhook.is_enabled ? "default" : "secondary"}>{webhook.is_enabled ? 'Active' : 'Disabled'}</Badge>
                        <Button variant="ghost" size="sm" onClick={() => testWebhook(webhook.id)} className="text-blue-400"><Play className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => deleteWebhook(webhook.id, webhook.name)} className="text-red-400"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SFTP TAB */}
        <TabsContent value="sftp">
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader className="py-3 border-b border-slate-700">
              <CardTitle className="text-sm text-white flex items-center justify-between">
                <span className="flex items-center gap-2"><HardDrive className="h-4 w-4" />SFTP Users</span>
                <Badge className="bg-slate-700">{sftpUsers.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-3 gap-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                <Input value={newSftpUser.username} onChange={(e) => setNewSftpUser(prev => ({ ...prev, username: e.target.value }))} placeholder="Username" className="bg-slate-800 border-slate-600 text-white" />
                <Input type="password" value={newSftpUser.password} onChange={(e) => setNewSftpUser(prev => ({ ...prev, password: e.target.value }))} placeholder="Password" className="bg-slate-800 border-slate-600 text-white" />
                <Button onClick={createSftpUser} disabled={loading}><Plus className="h-4 w-4 mr-2" />Add User</Button>
              </div>
              
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {sftpUsers.map(user => (
                    <div key={user.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                      <p className="font-medium text-white font-mono">{user.username}</p>
                      <Button variant="ghost" size="sm" onClick={() => deleteSftpUser(user.id, user.username)} className="text-red-400"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* RELAYS TAB */}
        <TabsContent value="relays">
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader className="py-3 border-b border-slate-700">
              <CardTitle className="text-sm text-white flex items-center justify-between">
                <span className="flex items-center gap-2"><Globe className="h-4 w-4" />Remote Relays</span>
                <Badge className="bg-slate-700">{remoteRelays.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {remoteRelays.length === 0 ? (
                    <p className="text-center text-slate-400 py-8">No remote relays configured</p>
                  ) : (
                    remoteRelays.map(relay => (
                      <div key={relay.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                        <div>
                          <p className="font-medium text-white">{relay.display_name}</p>
                          <p className="text-xs text-slate-400 font-mono truncate max-w-[400px]">{relay.url}</p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => azuraCastService.deleteRemoteRelay(relay.id).then(loadRemoteRelays)} className="text-red-400"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PODCASTS TAB */}
        <TabsContent value="podcasts">
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader className="py-3 border-b border-slate-700">
              <CardTitle className="text-sm text-white flex items-center justify-between">
                <span className="flex items-center gap-2"><Podcast className="h-4 w-4" />Podcasts</span>
                <Badge className="bg-slate-700">{podcasts.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {podcasts.length === 0 ? (
                    <p className="text-center text-slate-400 py-8">No podcasts configured</p>
                  ) : (
                    podcasts.map((podcast: any) => (
                      <div key={podcast.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                        <div>
                          <p className="font-medium text-white">{podcast.title}</p>
                          <p className="text-xs text-slate-400">{podcast.description}</p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => azuraCastService.deletePodcast(podcast.id).then(loadPodcasts)} className="text-red-400"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CONFIG TAB */}
        <TabsContent value="config">
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader className="py-3 border-b border-slate-700">
              <CardTitle className="text-sm text-white flex items-center gap-2"><Settings className="h-4 w-4" />Station Configuration</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {stationConfig ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-white">Station Name</Label>
                      <Input value={stationConfig.name || ''} readOnly className="bg-slate-800 border-slate-600 text-white" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white">Genre</Label>
                      <Input value={stationConfig.genre || ''} readOnly className="bg-slate-800 border-slate-600 text-white" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white">Timezone</Label>
                      <Input value={stationConfig.timezone || ''} readOnly className="bg-slate-800 border-slate-600 text-white" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white">Public Page</Label>
                      <Input value={stationConfig.enable_public_page ? 'Enabled' : 'Disabled'} readOnly className="bg-slate-800 border-slate-600 text-white" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white">Description</Label>
                    <Textarea value={stationConfig.description || ''} readOnly className="bg-slate-800 border-slate-600 text-white" rows={3} />
                  </div>
                </div>
              ) : (
                <p className="text-slate-400 text-center py-8">Loading configuration...</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};