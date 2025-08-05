import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { 
  Radio, 
  Plus, 
  Edit, 
  Trash2, 
  Play, 
  Pause, 
  BarChart3, 
  Users, 
  Settings, 
  RefreshCw,
  Headphones,
  Music,
  List,
  Upload
} from 'lucide-react';

interface ShoutcastStream {
  id: string;
  name: string;
  description: string;
  stream_url: string;
  mount_point: string;
  port: number;
  admin_password: string;
  dj_password: string;
  source_password: string;
  max_listeners: number;
  genre: string;
  is_active: boolean;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

interface ShoutcastStats {
  id: string;
  stream_id: string;
  current_listeners: number;
  peak_listeners: number;
  total_listeners: number;
  current_song: string;
  stream_start_time: string;
  bitrate: number;
  sample_rate: number;
  stream_status: string;
  recorded_at: string;
}

interface ShoutcastPlaylist {
  id: string;
  stream_id: string;
  name: string;
  description: string;
  is_active: boolean;
  shuffle_enabled: boolean;
  repeat_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export const ShoutcastManagement = () => {
  const [streams, setStreams] = useState<ShoutcastStream[]>([]);
  const [stats, setStats] = useState<ShoutcastStats[]>([]);
  const [playlists, setPlaylists] = useState<ShoutcastPlaylist[]>([]);
  const [selectedStream, setSelectedStream] = useState<ShoutcastStream | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    stream_url: '',
    mount_point: '',
    port: 8000,
    admin_password: '',
    dj_password: '',
    source_password: '',
    max_listeners: 100,
    genre: '',
    is_active: true,
    is_public: false
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch streams
      const { data: streamsData, error: streamsError } = await supabase
        .from('gw_shoutcast_streams')
        .select('*')
        .order('created_at', { ascending: false });

      if (streamsError) throw streamsError;
      
      // Fetch stats
      const { data: statsData, error: statsError } = await supabase
        .from('gw_shoutcast_stats')
        .select('*')
        .order('recorded_at', { ascending: false });

      if (statsError) throw statsError;

      // Fetch playlists
      const { data: playlistsData, error: playlistsError } = await supabase
        .from('gw_shoutcast_playlists')
        .select('*')
        .order('created_at', { ascending: false });

      if (playlistsError) throw playlistsError;

      setStreams(streamsData || []);
      setStats(statsData || []);
      setPlaylists(playlistsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch Shoutcast data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStream = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_shoutcast_streams')
        .insert([{
          ...formData,
          created_by: (await supabase.auth.getUser()).data.user?.id
        }])
        .select()
        .single();

      if (error) throw error;

      setStreams([data, ...streams]);
      setIsCreateDialogOpen(false);
      resetForm();
      
      toast({
        title: "Success",
        description: "Shoutcast stream created successfully",
      });
    } catch (error) {
      console.error('Error creating stream:', error);
      toast({
        title: "Error",
        description: "Failed to create Shoutcast stream",
        variant: "destructive",
      });
    }
  };

  const handleUpdateStream = async () => {
    if (!selectedStream) return;

    try {
      const { data, error } = await supabase
        .from('gw_shoutcast_streams')
        .update(formData)
        .eq('id', selectedStream.id)
        .select()
        .single();

      if (error) throw error;

      setStreams(streams.map(s => s.id === selectedStream.id ? data : s));
      setIsEditDialogOpen(false);
      setSelectedStream(null);
      resetForm();
      
      toast({
        title: "Success",
        description: "Shoutcast stream updated successfully",
      });
    } catch (error) {
      console.error('Error updating stream:', error);
      toast({
        title: "Error",
        description: "Failed to update Shoutcast stream",
        variant: "destructive",
      });
    }
  };

  const handleDeleteStream = async (streamId: string) => {
    try {
      const { error } = await supabase
        .from('gw_shoutcast_streams')
        .delete()
        .eq('id', streamId);

      if (error) throw error;

      setStreams(streams.filter(s => s.id !== streamId));
      
      toast({
        title: "Success",
        description: "Shoutcast stream deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting stream:', error);
      toast({
        title: "Error",
        description: "Failed to delete Shoutcast stream",
        variant: "destructive",
      });
    }
  };

  const handleEditClick = (stream: ShoutcastStream) => {
    setSelectedStream(stream);
    setFormData({
      name: stream.name,
      description: stream.description || '',
      stream_url: stream.stream_url,
      mount_point: stream.mount_point,
      port: stream.port,
      admin_password: stream.admin_password || '',
      dj_password: stream.dj_password || '',
      source_password: stream.source_password || '',
      max_listeners: stream.max_listeners,
      genre: stream.genre || '',
      is_active: stream.is_active,
      is_public: stream.is_public
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      stream_url: '',
      mount_point: '',
      port: 8000,
      admin_password: '',
      dj_password: '',
      source_password: '',
      max_listeners: 100,
      genre: '',
      is_active: true,
      is_public: false
    });
  };

  const getStreamStats = (streamId: string) => {
    return stats.find(s => s.stream_id === streamId);
  };

  if (loading) {
    return (
      <UniversalLayout>
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-8 w-8 animate-spin" />
        </div>
      </UniversalLayout>
    );
  }

  return (
    <UniversalLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Shoutcast Management</h1>
            <p className="text-muted-foreground">Manage your Shoutcast streaming infrastructure</p>
          </div>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create Stream
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Shoutcast Stream</DialogTitle>
                <DialogDescription>Configure a new Shoutcast streaming server</DialogDescription>
              </DialogHeader>
              
              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Stream Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Glee World Radio"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="genre">Genre</Label>
                  <Input
                    id="genre"
                    value={formData.genre}
                    onChange={(e) => setFormData({...formData, genre: e.target.value})}
                    placeholder="Classical, Gospel, etc."
                  />
                </div>
                
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Description of the stream"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="stream_url">Stream URL</Label>
                  <Input
                    id="stream_url"
                    value={formData.stream_url}
                    onChange={(e) => setFormData({...formData, stream_url: e.target.value})}
                    placeholder="http://your-server.com"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="mount_point">Mount Point</Label>
                  <Input
                    id="mount_point"
                    value={formData.mount_point}
                    onChange={(e) => setFormData({...formData, mount_point: e.target.value})}
                    placeholder="/stream"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="port">Port</Label>
                  <Input
                    type="number"
                    id="port"
                    value={formData.port}
                    onChange={(e) => setFormData({...formData, port: parseInt(e.target.value)})}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="max_listeners">Max Listeners</Label>
                  <Input
                    type="number"
                    id="max_listeners"
                    value={formData.max_listeners}
                    onChange={(e) => setFormData({...formData, max_listeners: parseInt(e.target.value)})}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="admin_password">Admin Password</Label>
                  <Input
                    type="password"
                    id="admin_password"
                    value={formData.admin_password}
                    onChange={(e) => setFormData({...formData, admin_password: e.target.value})}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="source_password">Source Password</Label>
                  <Input
                    type="password"
                    id="source_password"
                    value={formData.source_password}
                    onChange={(e) => setFormData({...formData, source_password: e.target.value})}
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
                  />
                  <Label htmlFor="is_active">Active</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_public"
                    checked={formData.is_public}
                    onCheckedChange={(checked) => setFormData({...formData, is_public: checked})}
                  />
                  <Label htmlFor="is_public">Public</Label>
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateStream}>
                  Create Stream
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="streams" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="streams" className="flex items-center gap-2">
              <Radio className="h-4 w-4" />
              Streams
            </TabsTrigger>
            <TabsTrigger value="statistics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Statistics
            </TabsTrigger>
            <TabsTrigger value="playlists" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              Playlists
            </TabsTrigger>
          </TabsList>

          <TabsContent value="streams" className="space-y-6">
            <div className="grid gap-6">
              {streams.map((stream) => {
                const streamStats = getStreamStats(stream.id);
                return (
                  <Card key={stream.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <Radio className="h-5 w-5" />
                            {stream.name}
                            <Badge variant={stream.is_active ? "default" : "secondary"}>
                              {stream.is_active ? "Active" : "Inactive"}
                            </Badge>
                            {stream.is_public && <Badge variant="outline">Public</Badge>}
                          </CardTitle>
                          <CardDescription>{stream.description}</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleEditClick(stream)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Stream</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this stream? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteStream(stream.id)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm font-medium">Stream URL</p>
                          <p className="text-sm text-muted-foreground">{stream.stream_url}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Mount Point</p>
                          <p className="text-sm text-muted-foreground">{stream.mount_point}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Port</p>
                          <p className="text-sm text-muted-foreground">{stream.port}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Max Listeners</p>
                          <p className="text-sm text-muted-foreground">{stream.max_listeners}</p>
                        </div>
                        {streamStats && (
                          <>
                            <div>
                              <p className="text-sm font-medium">Current Listeners</p>
                              <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {streamStats.current_listeners}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-medium">Current Song</p>
                              <p className="text-sm text-muted-foreground">{streamStats.current_song || 'No data'}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium">Status</p>
                              <Badge variant={streamStats.stream_status === 'online' ? "default" : "secondary"}>
                                {streamStats.stream_status}
                              </Badge>
                            </div>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="statistics" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {stats.map((stat) => {
                const stream = streams.find(s => s.id === stat.stream_id);
                return (
                  <Card key={stat.id}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        {stream?.name || 'Unknown Stream'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium">Current Listeners</p>
                          <p className="text-2xl font-bold">{stat.current_listeners}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Peak Listeners</p>
                          <p className="text-2xl font-bold">{stat.peak_listeners}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Total Listeners</p>
                          <p className="text-2xl font-bold">{stat.total_listeners}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Bitrate</p>
                          <p className="text-2xl font-bold">{stat.bitrate || 'N/A'} kbps</p>
                        </div>
                      </div>
                      {stat.current_song && (
                        <div className="mt-4 p-3 bg-muted rounded-lg">
                          <p className="text-sm font-medium flex items-center gap-2">
                            <Music className="h-4 w-4" />
                            Now Playing
                          </p>
                          <p className="text-sm">{stat.current_song}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="playlists" className="space-y-6">
            <div className="text-center py-20">
              <List className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Playlist Management</h3>
              <p className="text-muted-foreground mb-4">Playlist management features coming soon</p>
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Upload Music Files
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Shoutcast Stream</DialogTitle>
              <DialogDescription>Update stream configuration</DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit_name">Stream Name</Label>
                <Input
                  id="edit_name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit_genre">Genre</Label>
                <Input
                  id="edit_genre"
                  value={formData.genre}
                  onChange={(e) => setFormData({...formData, genre: e.target.value})}
                />
              </div>
              
              <div className="col-span-2 space-y-2">
                <Label htmlFor="edit_description">Description</Label>
                <Textarea
                  id="edit_description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit_stream_url">Stream URL</Label>
                <Input
                  id="edit_stream_url"
                  value={formData.stream_url}
                  onChange={(e) => setFormData({...formData, stream_url: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit_mount_point">Mount Point</Label>
                <Input
                  id="edit_mount_point"
                  value={formData.mount_point}
                  onChange={(e) => setFormData({...formData, mount_point: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit_port">Port</Label>
                <Input
                  type="number"
                  id="edit_port"
                  value={formData.port}
                  onChange={(e) => setFormData({...formData, port: parseInt(e.target.value)})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit_max_listeners">Max Listeners</Label>
                <Input
                  type="number"
                  id="edit_max_listeners"
                  value={formData.max_listeners}
                  onChange={(e) => setFormData({...formData, max_listeners: parseInt(e.target.value)})}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit_is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
                />
                <Label htmlFor="edit_is_active">Active</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit_is_public"
                  checked={formData.is_public}
                  onCheckedChange={(checked) => setFormData({...formData, is_public: checked})}
                />
                <Label htmlFor="edit_is_public">Public</Label>
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateStream}>
                Update Stream
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </UniversalLayout>
  );
};