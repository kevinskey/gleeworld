import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Headphones, Plus, Trash2, Play, Pause, Upload } from 'lucide-react';
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

interface AudioResource {
  id: string;
  title: string;
  description: string | null;
  audio_path: string;
  duration_seconds: number | null;
  display_order: number;
}

interface AudioExamplesSectionProps {
  courseId: string;
}

export function AudioExamplesSection({ courseId }: AudioExamplesSectionProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newAudio, setNewAudio] = useState({
    title: '',
    description: '',
  });
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  const isAdmin = (user as any)?.is_admin || (user as any)?.is_super_admin;

  // Fetch audio resources
  const { data: audioFiles, isLoading } = useQuery({
    queryKey: ['course-audio', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_audio_resources')
        .select('*')
        .eq('course_id', courseId)
        .eq('is_published', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as AudioResource[];
    },
  });

  // Add audio mutation
  const addAudioMutation = useMutation({
    mutationFn: async (audioData: typeof newAudio & { audioFile: File }) => {
      const fileName = `${courseId}/${Date.now()}-${audioData.audioFile.name}`;
      
      // Upload file
      const { error: uploadError } = await supabase.storage
        .from('course-audio')
        .upload(fileName, audioData.audioFile);

      if (uploadError) throw uploadError;

      // Create database record
      const { data, error } = await supabase
        .from('course_audio_resources')
        .insert([
          {
            course_id: courseId,
            title: audioData.title,
            description: audioData.description,
            audio_path: fileName,
            created_by: user?.id,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-audio', courseId] });
      toast.success('Audio file added successfully');
      setIsAddDialogOpen(false);
      setNewAudio({ title: '', description: '' });
    },
    onError: (error) => {
      toast.error('Failed to add audio file');
      console.error(error);
    },
  });

  // Delete audio mutation
  const deleteAudioMutation = useMutation({
    mutationFn: async (audio: AudioResource) => {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('course-audio')
        .remove([audio.audio_path]);

      if (storageError) throw storageError;

      // Delete database record
      const { error } = await supabase
        .from('course_audio_resources')
        .delete()
        .eq('id', audio.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-audio', courseId] });
      toast.success('Audio file deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete audio file');
      console.error(error);
    },
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!newAudio.title) {
      toast.error('Please enter a title first');
      return;
    }

    addAudioMutation.mutate({ ...newAudio, audioFile: file });
  };

  const getAudioUrl = (audioPath: string) => {
    const { data } = supabase.storage
      .from('course-audio')
      .getPublicUrl(audioPath);
    return data.publicUrl;
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading audio examples...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Headphones className="h-5 w-5" />
            Audio Examples
          </CardTitle>
          {isAdmin && (
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Audio
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Audio Example</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Title</label>
                    <Input
                      value={newAudio.title}
                      onChange={(e) => setNewAudio({ ...newAudio, title: e.target.value })}
                      placeholder="Audio title"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Description</label>
                    <Textarea
                      value={newAudio.description}
                      onChange={(e) => setNewAudio({ ...newAudio, description: e.target.value })}
                      placeholder="Audio description"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Audio File (MP3)</label>
                    <Input
                      type="file"
                      accept="audio/mpeg,audio/mp3,audio/wav"
                      onChange={handleFileUpload}
                      disabled={!newAudio.title || addAudioMutation.isPending}
                    />
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {audioFiles && audioFiles.length > 0 ? (
          <div className="space-y-3">
            {audioFiles.map((audio) => (
              <div key={audio.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold">{audio.title}</h3>
                    {audio.description && (
                      <p className="text-sm text-muted-foreground mt-1">{audio.description}</p>
                    )}
                    {audio.duration_seconds && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Duration: {formatDuration(audio.duration_seconds)}
                      </p>
                    )}
                  </div>
                  {isAdmin && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteAudioMutation.mutate(audio)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <audio
                  controls
                  className="w-full mt-3"
                  src={getAudioUrl(audio.audio_path)}
                  onPlay={() => setPlayingAudioId(audio.id)}
                  onPause={() => setPlayingAudioId(null)}
                >
                  Your browser does not support the audio element.
                </audio>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No audio examples available yet
          </div>
        )}
      </CardContent>
    </Card>
  );
}
