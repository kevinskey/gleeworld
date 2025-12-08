import { useState, useEffect, useRef } from 'react';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Video, ArrowLeft, Search, Play, Clock, User, Upload, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface TrainingVideo {
  id: string;
  title: string;
  description: string | null;
  file_url: string;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  created_at: string;
  user_id: string;
  is_approved: boolean;
  metadata: any;
}

interface UserProfile {
  first_name: string | null;
  last_name: string | null;
}

const ExecBoardTrainingVideosPage = () => {
  const [videos, setVideos] = useState<TrainingVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVideo, setSelectedVideo] = useState<TrainingVideo | null>(null);
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfile>>({});
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [videoToDelete, setVideoToDelete] = useState<TrainingVideo | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchVideos();
    
    // Subscribe to real-time updates for new videos
    const channel = supabase
      .channel('exec-board-training-videos')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'quick_capture_media',
          filter: 'category=eq.exec_board_video'
        },
        () => {
          fetchVideos();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchVideos = async () => {
    try {
      const { data, error } = await supabase
        .from('quick_capture_media')
        .select('*')
        .eq('category', 'exec_board_video')
        .eq('is_approved', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVideos(data || []);

      // Fetch user profiles for video creators
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(v => v.user_id))];
        const { data: profiles } = await supabase
          .from('gw_profiles')
          .select('user_id, first_name, last_name')
          .in('user_id', userIds);

        if (profiles) {
          const profileMap: Record<string, UserProfile> = {};
          profiles.forEach(p => {
            profileMap[p.user_id] = { first_name: p.first_name, last_name: p.last_name };
          });
          setUserProfiles(profileMap);
        }
      }
    } catch (error) {
      console.error('Error fetching videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredVideos = videos.filter(video =>
    video.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    video.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getCreatorName = (userId: string) => {
    const profile = userProfiles[userId];
    if (profile?.first_name || profile?.last_name) {
      return `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
    }
    return 'Unknown';
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('video/')) {
        toast.error('Please select a video file');
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const generateVideoThumbnail = async (videoUrl: string): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.muted = true;
      video.src = videoUrl;
      
      video.onloadeddata = () => {
        video.currentTime = Math.min(1, video.duration / 2);
      };
      
      video.onseeked = () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.8);
        } else {
          resolve(null);
        }
      };
      
      video.onerror = () => resolve(null);
      setTimeout(() => resolve(null), 5000);
    });
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a video file');
      return;
    }

    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to upload videos');
        return;
      }

      const timestamp = Date.now();
      const fileExt = selectedFile.name.split('.').pop() || 'mp4';
      const fileName = `${user.id}/exec-board-videos/${timestamp}.${fileExt}`;

      // Upload video
      const { error: uploadError } = await supabase.storage
        .from('quick-capture-media')
        .upload(fileName, selectedFile, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('quick-capture-media')
        .getPublicUrl(fileName);

      // Generate thumbnail
      let thumbnailUrl = null;
      if (previewUrl) {
        const thumbnailBlob = await generateVideoThumbnail(previewUrl);
        if (thumbnailBlob) {
          const thumbFileName = `${user.id}/exec-board-videos/thumbnails/${timestamp}.jpg`;
          const { error: thumbError } = await supabase.storage
            .from('quick-capture-media')
            .upload(thumbFileName, thumbnailBlob, { cacheControl: '3600', contentType: 'image/jpeg' });
          
          if (!thumbError) {
            const { data: { publicUrl: thumbUrl } } = supabase.storage
              .from('quick-capture-media')
              .getPublicUrl(thumbFileName);
            thumbnailUrl = thumbUrl;
          }
        }
      }

      // Save to database
      const { error: dbError } = await supabase
        .from('quick_capture_media')
        .insert({
          user_id: user.id,
          category: 'exec_board_video',
          title: uploadTitle.trim() || `Training Video - ${new Date().toLocaleDateString()}`,
          description: uploadDescription.trim() || null,
          file_url: publicUrl,
          thumbnail_url: thumbnailUrl,
          file_type: selectedFile.type,
          file_size: selectedFile.size,
          is_approved: true,
        });

      if (dbError) throw dbError;

      toast.success('Video uploaded successfully!');
      setUploadDialogOpen(false);
      setSelectedFile(null);
      setPreviewUrl('');
      setUploadTitle('');
      setUploadDescription('');
      fetchVideos();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('Failed to upload video: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const resetUploadDialog = () => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl('');
    setUploadTitle('');
    setUploadDescription('');
  };

  const handleDeleteVideo = async () => {
    if (!videoToDelete) return;
    
    setIsDeleting(true);
    try {
      // Delete from database
      const { error: dbError } = await supabase
        .from('quick_capture_media')
        .delete()
        .eq('id', videoToDelete.id);

      if (dbError) throw dbError;

      // Try to delete from storage (extract path from URL)
      try {
        const url = new URL(videoToDelete.file_url);
        const pathParts = url.pathname.split('/quick-capture-media/');
        if (pathParts[1]) {
          await supabase.storage.from('quick-capture-media').remove([pathParts[1]]);
        }
        // Delete thumbnail if exists
        if (videoToDelete.thumbnail_url) {
          const thumbUrl = new URL(videoToDelete.thumbnail_url);
          const thumbParts = thumbUrl.pathname.split('/quick-capture-media/');
          if (thumbParts[1]) {
            await supabase.storage.from('quick-capture-media').remove([thumbParts[1]]);
          }
        }
      } catch (e) {
        console.warn('Could not delete storage files:', e);
      }

      toast.success('Video deleted successfully');
      setVideoToDelete(null);
      fetchVideos();
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error('Failed to delete video: ' + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  if (selectedVideo) {
    return (
      <UniversalLayout>
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <Button 
            variant="ghost" 
            onClick={() => setSelectedVideo(null)}
            className="mb-4 gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Videos
          </Button>

          <Card>
            <CardContent className="p-0">
              <div className="aspect-video bg-black rounded-t-lg overflow-hidden">
                <video
                  src={selectedVideo.file_url}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="p-6">
                <h1 className="text-2xl font-bold mb-2">{selectedVideo.title}</h1>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  <span className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    {getCreatorName(selectedVideo.user_id)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {formatDuration(selectedVideo.duration_seconds)}
                  </span>
                  <span>
                    {format(new Date(selectedVideo.created_at), 'MMM d, yyyy')}
                  </span>
                </div>
                {selectedVideo.description && (
                  <p className="text-muted-foreground">{selectedVideo.description}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </UniversalLayout>
    );
  }

  return (
    <UniversalLayout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/executive-board-workshop')}
          className="mb-4 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Workshop
        </Button>

        {/* Hero Section */}
        <div className="relative rounded-3xl overflow-hidden mb-8 bg-gradient-to-br from-purple-500 via-purple-500/80 to-pink-500/60 p-8 md:p-12">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-50" />
          <div className="relative z-10 text-white">
            <Badge className="bg-white/20 text-white border-white/30 mb-4">Training Library</Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">ExecBoard Training Videos</h1>
            <p className="text-xl text-white/90 max-w-2xl mb-6">
              Watch training videos created by executive board members to learn leadership skills and best practices.
            </p>
            <Dialog open={uploadDialogOpen} onOpenChange={(open) => {
              setUploadDialogOpen(open);
              if (!open) resetUploadDialog();
            }}>
              <DialogTrigger asChild>
                <Button className="gap-2 bg-white text-purple-600 hover:bg-white/90">
                  <Plus className="h-4 w-4" />
                  Upload Training Video
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Upload Training Video
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {!selectedFile ? (
                    <div 
                      className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Video className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-sm text-muted-foreground mb-2">
                        Click to select a video file
                      </p>
                      <p className="text-xs text-muted-foreground">
                        MP4, MOV, WebM supported
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <video 
                        src={previewUrl} 
                        controls 
                        className="w-full max-h-48 object-contain rounded-lg bg-black"
                      />
                      <p className="text-sm text-muted-foreground truncate">
                        {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                      </p>
                    </div>
                  )}
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />

                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      placeholder="Enter video title..."
                      value={uploadTitle}
                      onChange={(e) => setUploadTitle(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe what this video covers..."
                      value={uploadDescription}
                      onChange={(e) => setUploadDescription(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-3 justify-end">
                    <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleUpload} 
                      disabled={!selectedFile || isUploading}
                      className="gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      {isUploading ? 'Uploading...' : 'Upload Video'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search training videos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Videos Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Card key={i} className="animate-pulse">
                <div className="aspect-video bg-muted rounded-t-lg" />
                <CardContent className="p-4">
                  <div className="h-5 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredVideos.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Video className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Training Videos Yet</h3>
              <p className="text-muted-foreground mb-4">
                Be the first to upload a training video!
              </p>
              <Button onClick={() => setUploadDialogOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Upload Video
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVideos.map(video => (
              <ContextMenu key={video.id}>
                <ContextMenuTrigger>
                  <Card 
                    className="cursor-pointer hover:border-primary/50 transition-all hover:shadow-lg group overflow-hidden"
                    onClick={() => setSelectedVideo(video)}
                  >
                    <div className="aspect-video bg-black relative overflow-hidden">
                      {video.thumbnail_url ? (
                        <img 
                          src={video.thumbnail_url} 
                          alt={video.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                          <Video className="h-12 w-12 text-muted-foreground" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                          <Play className="h-8 w-8 text-white fill-white" />
                        </div>
                      </div>
                      {video.duration_seconds && (
                        <Badge className="absolute bottom-2 right-2 bg-black/70">
                          {formatDuration(video.duration_seconds)}
                        </Badge>
                      )}
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold line-clamp-2 mb-1">{video.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {getCreatorName(video.user_id)} • {format(new Date(video.created_at), 'MMM d, yyyy')}
                      </p>
                    </CardContent>
                  </Card>
                </ContextMenuTrigger>
                <ContextMenuContent>
                  <ContextMenuItem 
                    className="text-destructive focus:text-destructive gap-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      setVideoToDelete(video);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Video
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            ))}
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!videoToDelete} onOpenChange={(open) => !open && setVideoToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Training Video</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{videoToDelete?.title}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDeleteVideo}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </UniversalLayout>
  );
};

export default ExecBoardTrainingVideosPage;
