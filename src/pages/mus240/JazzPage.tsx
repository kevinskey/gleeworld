import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAudioResources } from '@/hooks/useAudioResources';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export default function JazzPage() {
  const { resources, loading, getFileUrl, refetch } = useAudioResources('jazz');
  const { toast } = useToast();
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    file: null as File | null,
  });
  
  const audioRef = useRef<HTMLAudioElement>(null);

  const currentTrack = resources[currentTrackIndex];

  // Update audio source when track changes
  useEffect(() => {
    if (audioRef.current && currentTrack) {
      const audioUrl = getFileUrl(currentTrack.file_path);
      audioRef.current.src = audioUrl;
      audioRef.current.load();
      
      if (isPlaying) {
        audioRef.current.play().catch(err => {
          console.error('Playback error:', err);
          toast({
            title: 'Playback Error',
            description: 'Unable to play audio file',
            variant: 'destructive',
          });
        });
      }
    }
  }, [currentTrackIndex, currentTrack, getFileUrl]);

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => {
      if (currentTrackIndex < resources.length - 1) {
        setCurrentTrackIndex(prev => prev + 1);
      } else {
        setIsPlaying(false);
        setCurrentTrackIndex(0);
      }
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [currentTrackIndex, resources.length]);

  const togglePlayPause = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(err => {
        console.error('Playback error:', err);
        toast({
          title: 'Playback Error',
          description: 'Unable to play audio file',
          variant: 'destructive',
        });
      });
    }
    setIsPlaying(!isPlaying);
  };

  const playTrack = (index: number) => {
    setCurrentTrackIndex(index);
    setIsPlaying(true);
  };

  const previousTrack = () => {
    if (currentTrackIndex > 0) {
      setCurrentTrackIndex(prev => prev - 1);
    }
  };

  const nextTrack = () => {
    if (currentTrackIndex < resources.length - 1) {
      setCurrentTrackIndex(prev => prev + 1);
    }
  };

  const handleSeek = (value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
    if (newVolume === 0) {
      setIsMuted(true);
    } else {
      setIsMuted(false);
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.volume = volume || 0.5;
        setIsMuted(false);
      } else {
        audioRef.current.volume = 0;
        setIsMuted(true);
      }
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check if it's audio
      if (!file.type.startsWith('audio/')) {
        toast({
          title: 'Invalid File',
          description: 'Please select an audio file (MP3, WAV, etc.)',
          variant: 'destructive',
        });
        return;
      }
      setUploadForm({ ...uploadForm, file });
    }
  };

  const handleUpload = async () => {
    if (!uploadForm.file || !uploadForm.title) {
      toast({
        title: 'Missing Information',
        description: 'Please provide a title and select a file',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    try {
      // Create unique file path
      const fileExt = uploadForm.file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `jazz/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('mus240-audio')
        .upload(filePath, uploadForm.file);

      if (uploadError) throw uploadError;

      // Get audio duration
      const audioDuration = await new Promise<number>((resolve) => {
        const audio = new Audio();
        audio.src = URL.createObjectURL(uploadForm.file!);
        audio.addEventListener('loadedmetadata', () => {
          resolve(Math.floor(audio.duration));
        });
      });

      // Insert into database
      const { error: dbError } = await supabase
        .from('mus240_audio_resources')
        .insert({
          title: uploadForm.title,
          description: uploadForm.description || null,
          file_path: filePath,
          file_size: uploadForm.file.size,
          category: 'jazz',
          duration: audioDuration,
          uploaded_by: user?.id,
        });

      if (dbError) throw dbError;

      toast({
        title: 'Upload Successful',
        description: 'Jazz track added successfully',
      });

      // Reset form
      setUploadForm({ title: '', description: '', file: null });
      setIsUploadOpen(false);
      
      // Refresh list
      refetch();
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload Failed',
        description: 'Failed to upload jazz track',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading jazz tracks..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <Link to="/classes/mus240">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to MUS240
            </Button>
          </Link>
          
          {isAdmin() && (
            <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Jazz Track
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Upload Jazz Track</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={uploadForm.title}
                      onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                      placeholder="e.g., Take Five - Dave Brubeck"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={uploadForm.description}
                      onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                      placeholder="Optional details about the track..."
                      rows={3}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="file">Audio File (MP3, WAV) *</Label>
                    <Input
                      id="file"
                      type="file"
                      accept="audio/*"
                      onChange={handleFileChange}
                    />
                    {uploadForm.file && (
                      <p className="text-sm text-muted-foreground">
                        Selected: {uploadForm.file.name} ({(uploadForm.file.size / 1024 / 1024).toFixed(2)} MB)
                      </p>
                    )}
                  </div>
                  
                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setIsUploadOpen(false)}
                      disabled={uploading}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleUpload}
                      disabled={uploading || !uploadForm.file || !uploadForm.title}
                    >
                      {uploading ? (
                        <>
                          <LoadingSpinner size="sm" className="mr-2" />
                          Uploading...
                        </>
                      ) : (
                        'Upload'
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-foreground">Jazz Collection</h1>
          <p className="text-muted-foreground">
            Explore and listen to jazz recordings from the MUS240 audio library
          </p>
        </div>

        {resources.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">No jazz tracks available yet.</p>
          </Card>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Track List */}
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">Tracks</h2>
              <div className="space-y-2">
                {resources.map((track, index) => (
                  <Card
                    key={track.id}
                    className={`p-4 cursor-pointer transition-colors hover:bg-accent ${
                      currentTrackIndex === index ? 'bg-accent border-primary' : ''
                    }`}
                    onClick={() => playTrack(index)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-foreground">{track.title}</h3>
                        {track.description && (
                          <p className="text-sm text-muted-foreground">{track.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        {track.duration && (
                          <span className="text-sm text-muted-foreground">
                            {formatTime(track.duration)}
                          </span>
                        )}
                        {currentTrackIndex === index && isPlaying ? (
                          <Pause className="h-5 w-5 text-primary" />
                        ) : (
                          <Play className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Player */}
            <div className="lg:col-span-1">
              <Card className="p-6 sticky top-6">
                <div className="space-y-6">
                  {/* Now Playing */}
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">
                      Now Playing
                    </p>
                    {currentTrack ? (
                      <>
                        <h3 className="font-semibold text-lg text-foreground">
                          {currentTrack.title}
                        </h3>
                        {currentTrack.description && (
                          <p className="text-sm text-muted-foreground">
                            {currentTrack.description}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-muted-foreground">No track selected</p>
                    )}
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <Slider
                      value={[currentTime]}
                      max={duration || 100}
                      step={0.1}
                      onValueChange={handleSeek}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center justify-center gap-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={previousTrack}
                      disabled={currentTrackIndex === 0}
                    >
                      <SkipBack className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="default"
                      size="icon"
                      className="h-12 w-12"
                      onClick={togglePlayPause}
                      disabled={!currentTrack}
                    >
                      {isPlaying ? (
                        <Pause className="h-6 w-6" />
                      ) : (
                        <Play className="h-6 w-6" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={nextTrack}
                      disabled={currentTrackIndex === resources.length - 1}
                    >
                      <SkipForward className="h-5 w-5" />
                    </Button>
                  </div>

                  {/* Volume */}
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleMute}
                    >
                      {isMuted || volume === 0 ? (
                        <VolumeX className="h-4 w-4" />
                      ) : (
                        <Volume2 className="h-4 w-4" />
                      )}
                    </Button>
                    <Slider
                      value={[isMuted ? 0 : volume]}
                      max={1}
                      step={0.01}
                      onValueChange={handleVolumeChange}
                      className="flex-1"
                    />
                  </div>

                  {/* Track Info */}
                  <div className="pt-4 border-t border-border text-xs text-muted-foreground">
                    <p>Track {currentTrackIndex + 1} of {resources.length}</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* Hidden Audio Element */}
        <audio ref={audioRef} />
      </div>
    </div>
  );
}
