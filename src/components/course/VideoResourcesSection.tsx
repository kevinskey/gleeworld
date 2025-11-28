import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Video, Youtube, Upload, Plus, Trash2, Edit2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface VideoResource {
  id: string;
  title: string;
  description: string | null;
  video_type: 'youtube' | 'upload';
  youtube_url: string | null;
  video_path: string | null;
  display_order: number;
}

interface VideoResourcesSectionProps {
  courseId: string;
}

export function VideoResourcesSection({ courseId }: VideoResourcesSectionProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newVideo, setNewVideo] = useState({
    title: '',
    description: '',
    video_type: 'youtube' as 'youtube' | 'upload',
    youtube_url: '',
  });
  const [uploadingVideo, setUploadingVideo] = useState(false);

  const isAdmin = (user as any)?.is_admin || (user as any)?.is_super_admin;

  // Fetch video resources
  const { data: videos, isLoading } = useQuery({
    queryKey: ['course-videos', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_video_resources')
        .select('*')
        .eq('course_id', courseId)
        .eq('is_published', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as VideoResource[];
    },
  });

  // Add video mutation
  const addVideoMutation = useMutation({
    mutationFn: async (videoData: typeof newVideo) => {
      const { data, error } = await supabase
        .from('course_video_resources')
        .insert([
          {
            course_id: courseId,
            title: videoData.title,
            description: videoData.description,
            video_type: videoData.video_type,
            youtube_url: videoData.youtube_url || null,
            created_by: user?.id,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-videos', courseId] });
      toast.success('Video added successfully');
      setIsAddDialogOpen(false);
      setNewVideo({
        title: '',
        description: '',
        video_type: 'youtube',
        youtube_url: '',
      });
    },
    onError: (error) => {
      toast.error('Failed to add video');
      console.error(error);
    },
  });

  // Delete video mutation
  const deleteVideoMutation = useMutation({
    mutationFn: async (videoId: string) => {
      const { error } = await supabase
        .from('course_video_resources')
        .delete()
        .eq('id', videoId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-videos', courseId] });
      toast.success('Video deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete video');
      console.error(error);
    },
  });

  const handleVideoUpload = async (file: File, videoId: string) => {
    setUploadingVideo(true);
    try {
      const fileName = `${courseId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('course-videos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { error: updateError } = await supabase
        .from('course_video_resources')
        .update({ video_path: fileName })
        .eq('id', videoId);

      if (updateError) throw updateError;

      queryClient.invalidateQueries({ queryKey: ['course-videos', courseId] });
      toast.success('Video uploaded successfully');
    } catch (error) {
      toast.error('Failed to upload video');
      console.error(error);
    } finally {
      setUploadingVideo(false);
    }
  };

  const getYouTubeEmbedUrl = (url: string) => {
    const videoId = url.match(/(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/watch\?.+&v=))([^\/&?]+)/)?.[1];
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  };

  const getVideoUrl = (video: VideoResource) => {
    if (video.video_type === 'youtube' && video.youtube_url) {
      return getYouTubeEmbedUrl(video.youtube_url);
    } else if (video.video_path) {
      const { data } = supabase.storage
        .from('course-videos')
        .getPublicUrl(video.video_path);
      return data.publicUrl;
    }
    return null;
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading videos...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Video Resources
          </CardTitle>
          {isAdmin && (
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Video
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Video Resource</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Title</label>
                    <Input
                      value={newVideo.title}
                      onChange={(e) => setNewVideo({ ...newVideo, title: e.target.value })}
                      placeholder="Video title"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Description</label>
                    <Textarea
                      value={newVideo.description}
                      onChange={(e) => setNewVideo({ ...newVideo, description: e.target.value })}
                      placeholder="Video description"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Video Type</label>
                    <Select
                      value={newVideo.video_type}
                      onValueChange={(value: 'youtube' | 'upload') =>
                        setNewVideo({ ...newVideo, video_type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="youtube">
                          <div className="flex items-center gap-2">
                            <Youtube className="h-4 w-4" />
                            YouTube Link
                          </div>
                        </SelectItem>
                        <SelectItem value="upload">
                          <div className="flex items-center gap-2">
                            <Upload className="h-4 w-4" />
                            Upload Video
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {newVideo.video_type === 'youtube' && (
                    <div>
                      <label className="text-sm font-medium">YouTube URL</label>
                      <Input
                        value={newVideo.youtube_url}
                        onChange={(e) => setNewVideo({ ...newVideo, youtube_url: e.target.value })}
                        placeholder="https://www.youtube.com/watch?v=..."
                      />
                    </div>
                  )}
                  <Button
                    onClick={() => addVideoMutation.mutate(newVideo)}
                    disabled={!newVideo.title || (newVideo.video_type === 'youtube' && !newVideo.youtube_url)}
                    className="w-full"
                  >
                    Add Video
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {videos && videos.length > 0 ? (
          <div className="grid gap-6">
            {videos.map((video) => {
              const videoUrl = getVideoUrl(video);
              return (
                <div key={video.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-lg">{video.title}</h3>
                      {video.description && (
                        <p className="text-sm text-muted-foreground mt-1">{video.description}</p>
                      )}
                      <Badge variant="secondary" className="mt-2">
                        {video.video_type === 'youtube' ? (
                          <><Youtube className="h-3 w-3 mr-1" /> YouTube</>
                        ) : (
                          <><Upload className="h-3 w-3 mr-1" /> Uploaded</>
                        )}
                      </Badge>
                    </div>
                    {isAdmin && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteVideoMutation.mutate(video.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  {videoUrl ? (
                    <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                      {video.video_type === 'youtube' ? (
                        <iframe
                          src={videoUrl}
                          className="w-full h-full"
                          allowFullScreen
                          title={video.title}
                        />
                      ) : (
                        <video controls className="w-full h-full">
                          <source src={videoUrl} />
                          Your browser does not support the video tag.
                        </video>
                      )}
                    </div>
                  ) : video.video_type === 'upload' && isAdmin ? (
                    <div className="border-2 border-dashed rounded-lg p-8 text-center">
                      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mb-4">Upload video file</p>
                      <Input
                        type="file"
                        accept="video/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleVideoUpload(file, video.id);
                        }}
                        disabled={uploadingVideo}
                      />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No video resources available yet
          </div>
        )}
      </CardContent>
    </Card>
  );
}
