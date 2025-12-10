import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Clock
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

export const AzuraCastAdminPanel = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [stationConfig, setStationConfig] = useState<StationConfig | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadMetadata, setUploadMetadata] = useState({
    title: '',
    artist: '',
    album: '',
    genre: ''
  });
  const [loading, setLoading] = useState(false);
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

  const connectToAzuraCast = async () => {
    try {
      setLoading(true);
      console.log('AzuraCast: Testing connection via proxy...');
      
      // Test connection by fetching station info via proxy
      console.log('AzuraCast: Testing connection with getStationConfig...');
      const stationConfig = await azuraCastService.getStationConfig();
      console.log('AzuraCast: Connection successful, station config:', stationConfig);
      
      setIsConnected(true);
      
      // Load initial data
      console.log('AzuraCast: Loading initial data...');
      await Promise.all([
        loadPlaylists(),
        loadSchedule(),
        loadStationConfig()
      ]);

      toast({
        title: "Connected",
        description: "Successfully connected to AzuraCast admin API",
      });
    } catch (error) {
      console.error('AzuraCast Connection error:', error);
      console.error('AzuraCast Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      setIsConnected(false);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.log('AzuraCast Error message:', errorMessage);
      
      let description = "Failed to connect to AzuraCast. ";
      
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
        description += "Network error: Check that radio.gleeworld.org is accessible and has CORS enabled.";
      } else if (errorMessage.includes('401') || errorMessage.includes('403')) {
        description += "Authentication error: Invalid API key or insufficient permissions.";
      } else if (errorMessage.includes('Failed to construct')) {
        description += "API key format error: Please check your API key contains only valid characters.";
      } else if (errorMessage.includes('500')) {
        description += "Server error: AzuraCast server is experiencing issues.";
      } else {
        description += `Error: ${errorMessage}`;
      }
      
      toast({
        title: "Connection Failed",
        description,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadPlaylists = async () => {
    try {
      const data = await azuraCastService.getPlaylists();
      setPlaylists(data);
    } catch (error) {
      console.error('Error loading playlists:', error);
    }
  };

  const loadSchedule = async () => {
    try {
      const data = await azuraCastService.getSchedule();
      setSchedule(data);
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

  const handleFileUpload = async () => {
    if (!selectedFile) {
      toast({
        title: "Error",
        description: "Please select a file to upload",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      await azuraCastService.uploadFile(selectedFile, uploadMetadata);
      
      toast({
        title: "Success",
        description: `File "${selectedFile.name}" uploaded successfully`,
      });
      
      setSelectedFile(null);
      setUploadMetadata({ title: '', artist: '', album: '', genre: '' });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload file to AzuraCast",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createPlaylist = async () => {
    if (!newPlaylist.name.trim()) {
      toast({
        title: "Error",
        description: "Please enter a playlist name",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      await azuraCastService.createPlaylist(newPlaylist);
      
      toast({
        title: "Success",
        description: `Playlist "${newPlaylist.name}" created successfully`,
      });
      
      setNewPlaylist({
        name: '',
        description: '',
        type: 'default',
        weight: 3,
        is_enabled: true
      });
      
      await loadPlaylists();
    } catch (error) {
      console.error('Error creating playlist:', error);
      toast({
        title: "Error",
        description: "Failed to create playlist",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deletePlaylist = async (playlistId: number, playlistName: string) => {
    if (!confirm(`Are you sure you want to delete playlist "${playlistName}"?`)) {
      return;
    }

    try {
      setLoading(true);
      await azuraCastService.deletePlaylist(playlistId);
      
      toast({
        title: "Success",
        description: `Playlist "${playlistName}" deleted successfully`,
      });
      
      await loadPlaylists();
    } catch (error) {
      console.error('Error deleting playlist:', error);
      toast({
        title: "Error",
        description: "Failed to delete playlist",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createScheduleEntry = async () => {
    if (!newSchedule.name.trim() || !newSchedule.start_time || !newSchedule.end_time) {
      toast({
        title: "Error",
        description: "Please fill in all required schedule fields",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      await azuraCastService.createScheduleEntry(newSchedule);
      
      toast({
        title: "Success",
        description: `Schedule entry "${newSchedule.name}" created successfully`,
      });
      
      setNewSchedule({
        name: '',
        start_time: '',
        end_time: '',
        days: [],
        playlist_id: undefined
      });
      
      await loadSchedule();
    } catch (error) {
      console.error('Error creating schedule entry:', error);
      toast({
        title: "Error",
        description: "Failed to create schedule entry",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const restartStation = async () => {
    if (!confirm('Are you sure you want to restart the radio station? This will briefly interrupt the broadcast.')) {
      return;
    }

    try {
      setLoading(true);
      await azuraCastService.restartStation();
      
      toast({
        title: "Success",
        description: "Station restart initiated successfully",
      });
    } catch (error) {
      console.error('Error restarting station:', error);
      toast({
        title: "Error",
        description: "Failed to restart station",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  if (!isConnected) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Radio className="h-5 w-5" />
              Connect to AzuraCast Admin API
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 border rounded-lg bg-muted/50">
              <h4 className="font-medium mb-2">Connection Status:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Using secure server-side proxy</li>
                <li>• API key stored in Supabase secrets</li>
                <li>• Admin permissions verified</li>
                <li>• Connecting to radio.gleeworld.org</li>
              </ul>
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={connectToAzuraCast}
                disabled={loading}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Radio className="h-4 w-4 mr-2" />
                    Connect to AzuraCast
                  </>
                )}
              </Button>
              
              <Button 
                variant="outline"
                onClick={async () => {
                  try {
                    console.log('Testing basic connectivity to radio.gleeworld.org...');
                    const response = await fetch('https://radio.gleeworld.org/api/nowplaying/glee_world_radio', {
                      method: 'GET',
                      mode: 'cors'
                    });
                    console.log('Basic connectivity test result:', response.status);
                    if (response.ok) {
                      toast({ title: "Connectivity Test", description: "Basic connection to AzuraCast server successful" });
                    } else {
                      toast({ title: "Connectivity Test", description: `Server responded with ${response.status}`, variant: "destructive" });
                    }
                  } catch (error) {
                    console.error('Connectivity test failed:', error);
                    toast({ title: "Connectivity Test", description: "Failed to reach AzuraCast server", variant: "destructive" });
                  }
                }}
                disabled={loading}
              >
                Test Connection
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">AzuraCast Admin Panel</h2>
          <p className="text-muted-foreground">Manage your radio station directly</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={restartStation} disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Restart Station
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIsConnected(false)}>
            Disconnect
          </Button>
        </div>
      </div>

      <Tabs defaultValue="upload" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="upload">File Upload</TabsTrigger>
          <TabsTrigger value="playlists">Playlists</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="config">Station Config</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload to AzuraCast Media Library
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="file">Audio File</Label>
                <Input
                  id="file"
                  type="file"
                  accept="audio/*"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={uploadMetadata.title}
                    onChange={(e) => setUploadMetadata(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Song title"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="artist">Artist</Label>
                  <Input
                    id="artist"
                    value={uploadMetadata.artist}
                    onChange={(e) => setUploadMetadata(prev => ({ ...prev, artist: e.target.value }))}
                    placeholder="Artist name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="album">Album</Label>
                  <Input
                    id="album"
                    value={uploadMetadata.album}
                    onChange={(e) => setUploadMetadata(prev => ({ ...prev, album: e.target.value }))}
                    placeholder="Album name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="genre">Genre</Label>
                  <Input
                    id="genre"
                    value={uploadMetadata.genre}
                    onChange={(e) => setUploadMetadata(prev => ({ ...prev, genre: e.target.value }))}
                    placeholder="Music genre"
                  />
                </div>
              </div>
              
              <Button onClick={handleFileUpload} disabled={loading || !selectedFile}>
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload to AzuraCast
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="playlists" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <List className="h-5 w-5" />
                Playlist Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg">
                <div className="space-y-2">
                  <Label htmlFor="playlistName">Playlist Name</Label>
                  <Input
                    id="playlistName"
                    value={newPlaylist.name}
                    onChange={(e) => setNewPlaylist(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter playlist name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="playlistType">Type</Label>
                  <Select 
                    value={newPlaylist.type} 
                    onValueChange={(value: any) => setNewPlaylist(prev => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Default</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="once_per_x_songs">Once per X songs</SelectItem>
                      <SelectItem value="once_per_x_minutes">Once per X minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="playlistDesc">Description</Label>
                  <Textarea
                    id="playlistDesc"
                    value={newPlaylist.description}
                    onChange={(e) => setNewPlaylist(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Playlist description"
                  />
                </div>
                <Button onClick={createPlaylist} disabled={loading} className="col-span-2">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Playlist
                </Button>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-medium">Existing Playlists</h3>
                {playlists.map(playlist => (
                  <div key={playlist.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{playlist.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {playlist.type} • Weight: {playlist.weight} • 
                        {playlist.is_enabled ? ' Enabled' : ' Disabled'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => deletePlaylist(playlist.id, playlist.name)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Schedule Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg">
                <div className="space-y-2">
                  <Label htmlFor="scheduleName">Schedule Name</Label>
                  <Input
                    id="scheduleName"
                    value={newSchedule.name}
                    onChange={(e) => setNewSchedule(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Schedule entry name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="playlist">Playlist</Label>
                  <Select 
                    value={newSchedule.playlist_id?.toString() || ''} 
                    onValueChange={(value) => setNewSchedule(prev => ({ 
                      ...prev, 
                      playlist_id: value ? parseInt(value) : undefined 
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select playlist" />
                    </SelectTrigger>
                    <SelectContent>
                      {playlists.map(playlist => (
                        <SelectItem key={playlist.id} value={playlist.id.toString()}>
                          {playlist.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="startTime">Start Time</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={newSchedule.start_time}
                    onChange={(e) => setNewSchedule(prev => ({ ...prev, start_time: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endTime">End Time</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={newSchedule.end_time}
                    onChange={(e) => setNewSchedule(prev => ({ ...prev, end_time: e.target.value }))}
                  />
                </div>
                <Button onClick={createScheduleEntry} disabled={loading} className="col-span-2">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Schedule Entry
                </Button>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-medium">Current Schedule</h3>
                {schedule.map(entry => (
                  <div key={entry.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{entry.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {entry.start_time} - {entry.end_time}
                        {entry.days && entry.days.length > 0 && (
                          <span> • {entry.days.map(d => dayNames[d]).join(', ')}</span>
                        )}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Station Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {stationConfig && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Station Name</Label>
                      <Input value={stationConfig.name} readOnly />
                    </div>
                    <div className="space-y-2">
                      <Label>Genre</Label>
                      <Input value={stationConfig.genre} readOnly />
                    </div>
                    <div className="space-y-2">
                      <Label>Timezone</Label>
                      <Input value={stationConfig.timezone} readOnly />
                    </div>
                    <div className="space-y-2">
                      <Label>Public Page</Label>
                      <Input value={stationConfig.enable_public_page ? 'Enabled' : 'Disabled'} readOnly />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea value={stationConfig.description} readOnly />
                  </div>
                  <Button variant="outline">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Configuration
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};