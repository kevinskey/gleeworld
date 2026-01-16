import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Edit2, Trash2, Church, Loader2, ExternalLink, Eye, EyeOff, Youtube, Users } from 'lucide-react';
import { useLykeHouseHero, LykeHouseVideo, YouTubeChannelResult, YouTubeChannelVideo } from '@/hooks/useLykeHouseHero';

// Helper to extract YouTube video ID from various URL formats
const extractYouTubeId = (input: string): string => {
  if (!input) return '';
  
  // Already just an ID (11 characters)
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;
  
  // Various YouTube URL patterns
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
  ];
  
  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match) return match[1];
  }
  
  return input;
};

export const LykeHouseHeroManager: React.FC = () => {
  const { 
    allVideos, 
    loading, 
    fetchingChannel,
    addVideo, 
    updateVideo, 
    deleteVideo,
    fetchChannelVideos,
    addVideosFromChannel 
  } = useLykeHouseHero();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<LykeHouseVideo | null>(null);
  const [activeTab, setActiveTab] = useState<'video' | 'channel'>('video');
  
  // Video form state
  const [formData, setFormData] = useState({
    title: '',
    video_id: '',
    is_active: true,
  });
  
  // Channel form state
  const [channelInput, setChannelInput] = useState('');
  const [channelResult, setChannelResult] = useState<YouTubeChannelResult | null>(null);
  const [selectedVideoIds, setSelectedVideoIds] = useState<string[]>([]);
  const [addingFromChannel, setAddingFromChannel] = useState(false);

  const resetForm = () => {
    setFormData({ title: '', video_id: '', is_active: true });
    setEditingVideo(null);
    setChannelInput('');
    setChannelResult(null);
    setSelectedVideoIds([]);
    setActiveTab('video');
  };

  const handleOpenDialog = (video?: LykeHouseVideo) => {
    if (video) {
      setEditingVideo(video);
      setFormData({
        title: video.title || '',
        video_id: video.video_id,
        is_active: video.is_active ?? true,
      });
      setActiveTab('video');
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    const videoId = extractYouTubeId(formData.video_id);
    if (!videoId) return;

    const payload = {
      title: formData.title || null,
      video_id: videoId,
      video_url: `https://youtu.be/${videoId}`,
      thumbnail_url: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
      is_active: formData.is_active,
      source_type: 'video' as const,
    };

    if (editingVideo) {
      await updateVideo(editingVideo.id, payload);
    } else {
      await addVideo(payload);
    }
    setIsDialogOpen(false);
    resetForm();
  };

  const handleFetchChannel = async () => {
    if (!channelInput.trim()) return;
    const result = await fetchChannelVideos(channelInput);
    if (result) {
      setChannelResult(result);
      setSelectedVideoIds(result.videos.map(v => v.video_id)); // Select all by default
    }
  };

  const handleAddSelectedVideos = async () => {
    if (!channelResult || selectedVideoIds.length === 0) return;
    setAddingFromChannel(true);
    await addVideosFromChannel(channelResult, selectedVideoIds);
    setAddingFromChannel(false);
    setIsDialogOpen(false);
    resetForm();
  };

  const toggleVideoSelection = (videoId: string) => {
    setSelectedVideoIds(prev => 
      prev.includes(videoId) 
        ? prev.filter(id => id !== videoId)
        : [...prev, videoId]
    );
  };

  const toggleAllVideos = () => {
    if (!channelResult) return;
    if (selectedVideoIds.length === channelResult.videos.length) {
      setSelectedVideoIds([]);
    } else {
      setSelectedVideoIds(channelResult.videos.map(v => v.video_id));
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this video?')) {
      await deleteVideo(id);
    }
  };

  const handleToggleActive = async (video: LykeHouseVideo) => {
    await updateVideo(video.id, { is_active: !video.is_active });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="ml-2">Loading...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Church className="h-5 w-5 text-primary" />
            Lyke House Hero
          </CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Video
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingVideo ? 'Edit Video' : 'Add Video'}</DialogTitle>
              </DialogHeader>
              
              {!editingVideo && (
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'video' | 'channel')}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="video" className="flex items-center gap-2">
                      <Youtube className="h-4 w-4" />
                      Single Video
                    </TabsTrigger>
                    <TabsTrigger value="channel" className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      From Channel
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="video" className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>YouTube Video ID or URL</Label>
                      <Input
                        value={formData.video_id}
                        onChange={(e) => setFormData({ ...formData, video_id: e.target.value })}
                        placeholder="e.g., dQw4w9WgXcQ or https://youtu.be/dQw4w9WgXcQ"
                      />
                      <p className="text-xs text-muted-foreground">
                        Paste a YouTube URL or just the video ID
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Title (optional)</Label>
                      <Input
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="Video title"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="is-active">Active</Label>
                      <Switch
                        id="is-active"
                        checked={formData.is_active}
                        onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                      />
                    </div>
                    {formData.video_id && extractYouTubeId(formData.video_id) && (
                      <div className="mt-4">
                        <Label className="mb-2 block">Preview</Label>
                        <img
                          src={`https://img.youtube.com/vi/${extractYouTubeId(formData.video_id)}/mqdefault.jpg`}
                          alt="Video thumbnail preview"
                          className="w-full rounded-lg"
                        />
                      </div>
                    )}
                    <div className="flex justify-end gap-2 pt-4">
                      <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                      <Button onClick={handleSave} disabled={!formData.video_id}>
                        Add Video
                      </Button>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="channel" className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>YouTube Channel</Label>
                      <div className="flex gap-2">
                        <Input
                          value={channelInput}
                          onChange={(e) => setChannelInput(e.target.value)}
                          placeholder="e.g., @ChannelName or youtube.com/channel/UC..."
                          className="flex-1"
                        />
                        <Button 
                          onClick={handleFetchChannel} 
                          disabled={fetchingChannel || !channelInput.trim()}
                        >
                          {fetchingChannel ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Fetch'
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Enter a YouTube channel URL, @handle, or channel ID
                      </p>
                    </div>
                    
                    {channelResult && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                          <img 
                            src={channelResult.channel_thumbnail} 
                            alt={channelResult.channel_title}
                            className="w-12 h-12 rounded-full"
                          />
                          <div>
                            <p className="font-medium">{channelResult.channel_title}</p>
                            <p className="text-sm text-muted-foreground">
                              {channelResult.videos.length} videos found
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <Label>Select videos to add</Label>
                          <Button variant="ghost" size="sm" onClick={toggleAllVideos}>
                            {selectedVideoIds.length === channelResult.videos.length ? 'Deselect All' : 'Select All'}
                          </Button>
                        </div>
                        
                        <ScrollArea className="h-64 border rounded-lg">
                          <div className="p-2 space-y-2">
                            {channelResult.videos.map((video) => (
                              <div 
                                key={video.video_id}
                                className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded-lg cursor-pointer"
                                onClick={() => toggleVideoSelection(video.video_id)}
                              >
                                <Checkbox 
                                  checked={selectedVideoIds.includes(video.video_id)}
                                  onCheckedChange={() => toggleVideoSelection(video.video_id)}
                                />
                                <img 
                                  src={video.thumbnail_url} 
                                  alt={video.title}
                                  className="w-24 h-14 object-cover rounded"
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{video.title}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(video.published_at).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                        
                        <div className="flex justify-end gap-2 pt-4">
                          <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                          <Button 
                            onClick={handleAddSelectedVideos} 
                            disabled={selectedVideoIds.length === 0 || addingFromChannel}
                          >
                            {addingFromChannel ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : null}
                            Add {selectedVideoIds.length} Video{selectedVideoIds.length !== 1 ? 's' : ''}
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    {!channelResult && !fetchingChannel && (
                      <div className="text-center py-8 text-muted-foreground">
                        Enter a channel URL and click Fetch to see available videos
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              )}
              
              {editingVideo && (
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>YouTube Video ID or URL</Label>
                    <Input
                      value={formData.video_id}
                      onChange={(e) => setFormData({ ...formData, video_id: e.target.value })}
                      placeholder="e.g., dQw4w9WgXcQ or https://youtu.be/dQw4w9WgXcQ"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Title (optional)</Label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Video title"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="is-active-edit">Active</Label>
                    <Switch
                      id="is-active-edit"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                  </div>
                  {formData.video_id && extractYouTubeId(formData.video_id) && (
                    <div className="mt-4">
                      <Label className="mb-2 block">Preview</Label>
                      <img
                        src={`https://img.youtube.com/vi/${extractYouTubeId(formData.video_id)}/mqdefault.jpg`}
                        alt="Video thumbnail preview"
                        className="w-full rounded-lg"
                      />
                    </div>
                  )}
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleSave} disabled={!formData.video_id}>
                      Update Video
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Manage YouTube videos displayed in the LH100 course home slider
        </p>
      </CardHeader>
      <CardContent>
        {allVideos.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Thumb</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Video ID</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allVideos.map((video) => (
                <TableRow key={video.id}>
                  <TableCell>
                    <img
                      src={video.thumbnail_url || `https://img.youtube.com/vi/${video.video_id}/default.jpg`}
                      alt="Thumbnail"
                      className="w-16 h-10 object-cover rounded"
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    {video.title || <span className="text-muted-foreground italic">No title</span>}
                  </TableCell>
                  <TableCell>
                    <a
                      href={`https://youtu.be/${video.video_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-primary hover:underline"
                    >
                      {video.video_id}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </TableCell>
                  <TableCell>
                    <Badge variant={video.source_type === 'channel' ? 'secondary' : 'outline'}>
                      {video.source_type === 'channel' ? (
                        <><Users className="h-3 w-3 mr-1" /> Channel</>
                      ) : (
                        <><Youtube className="h-3 w-3 mr-1" /> Direct</>
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleActive(video)}
                      className="gap-1"
                    >
                      {video.is_active ? (
                        <>
                          <Eye className="h-4 w-4 text-green-500" />
                          <Badge variant="secondary" className="bg-green-500/10 text-green-600">Active</Badge>
                        </>
                      ) : (
                        <>
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                          <Badge variant="outline">Hidden</Badge>
                        </>
                      )}
                    </Button>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenDialog(video)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(video.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8">
            <Church className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-lg font-medium text-foreground mb-2">No videos added yet</p>
            <p className="text-muted-foreground mb-4">
              Add YouTube videos individually or import from a channel
            </p>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Video
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
