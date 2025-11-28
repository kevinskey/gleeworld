import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Upload, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { useAudioResources } from '@/hooks/useAudioResources';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface UploadFile {
  file: File;
  title: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
}

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
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const extractTitleFromFilename = (filename: string): string => {
    // Remove extension
    const nameWithoutExt = filename.replace(/\.(mp3|wav|m4a|flac|ogg|aac)$/i, '');
    
    // Replace underscores and hyphens with spaces
    const cleaned = nameWithoutExt.replace(/[_-]/g, ' ');
    
    // Capitalize first letter of each word
    return cleaned
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const handleFiles = (files: FileList | File[]) => {
    const audioFiles = Array.from(files).filter(file => file.type.startsWith('audio/'));
    
    if (audioFiles.length === 0) {
      toast({
        title: 'No Audio Files',
        description: 'Please select audio files (MP3, WAV, etc.)',
        variant: 'destructive',
      });
      return;
    }

    const newUploadFiles: UploadFile[] = audioFiles.map(file => ({
      file,
      title: extractTitleFromFilename(file.name),
      status: 'pending' as const,
      progress: 0,
    }));

    setUploadFiles(newUploadFiles);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  const removeFile = (index: number) => {
    setUploadFiles(prev => prev.filter((_, i) => i !== index));
  };

  const updateFileTitle = (index: number, title: string) => {
    setUploadFiles(prev => prev.map((f, i) => i === index ? { ...f, title } : f));
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleBulkUpload = async () => {
    if (uploadFiles.length === 0) return;

    setUploading(true);
    
    try {
      // Mark all as uploading
      setUploadFiles(prev => prev.map(f => ({ ...f, status: 'uploading' as const, progress: 50 })));

      // Convert files to base64
      const filesData = await Promise.all(
        uploadFiles.map(async (uploadFile) => ({
          name: uploadFile.file.name,
          data: await convertFileToBase64(uploadFile.file),
          title: uploadFile.title,
          size: uploadFile.file.size,
        }))
      );

      // Call edge function
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        'https://oopmlreysjzuxzylyheb.supabase.co/functions/v1/upload-jazz-tracks',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ files: filesData }),
        }
      );

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      // Mark all as success immediately
      setUploadFiles(prev => prev.map(f => ({ ...f, status: 'success' as const, progress: 100 })));

      toast({
        title: 'Upload Started',
        description: `${uploadFiles.length} track${uploadFiles.length > 1 ? 's' : ''} uploading in background. Refresh in a moment to see them.`,
      });

      // Refresh after a short delay
      setTimeout(() => {
        refetch();
      }, 2000);
    } catch (error) {
      console.error('Upload error:', error);
      setUploadFiles(prev => prev.map(f => ({ 
        ...f, 
        status: 'error' as const, 
        error: 'Upload failed' 
      })));
      toast({
        title: 'Upload Failed',
        description: 'Failed to start upload',
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
          <Link to="/mus-240">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to MUS240
            </Button>
          </Link>
          
          {isAdmin() && (
            <Dialog open={isUploadOpen} onOpenChange={(open) => {
              setIsUploadOpen(open);
              if (!open) {
                setUploadFiles([]);
                setUploading(false);
              }
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Jazz Tracks
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Bulk Upload Jazz Tracks</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  {/* Drop Zone */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                      isDragging 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50 hover:bg-accent/50'
                    }`}
                  >
                    <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-lg font-medium mb-2">
                      Drag & drop audio files here
                    </p>
                    <p className="text-sm text-muted-foreground mb-4">
                      or click to browse (MP3, WAV, M4A, FLAC, OGG)
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Titles will be auto-generated from filenames
                    </p>
                  </div>
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="audio/*"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />

                  {/* File List */}
                  {uploadFiles.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-base font-semibold">
                          Files to Upload ({uploadFiles.length})
                        </Label>
                        {!uploading && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setUploadFiles([])}
                          >
                            Clear All
                          </Button>
                        )}
                      </div>
                      
                      <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {uploadFiles.map((uploadFile, index) => (
                          <Card key={index} className="p-3">
                            <div className="space-y-2">
                              <div className="flex items-start gap-2">
                                <div className="flex-1 space-y-2">
                                  <div className="flex items-center gap-2">
                                    <Input
                                      value={uploadFile.title}
                                      onChange={(e) => updateFileTitle(index, e.target.value)}
                                      disabled={uploading}
                                      className="flex-1"
                                      placeholder="Track title"
                                    />
                                    {!uploading && uploadFile.status === 'pending' && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeFile(index)}
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    )}
                                    {uploadFile.status === 'success' && (
                                      <Check className="h-5 w-5 text-green-600" />
                                    )}
                                  </div>
                                  
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span>{uploadFile.file.name}</span>
                                    <span>•</span>
                                    <span>{(uploadFile.file.size / 1024 / 1024).toFixed(2)} MB</span>
                                    <span>•</span>
                                    <span className="uppercase">{uploadFile.file.type.split('/')[1]}</span>
                                  </div>
                                  
                                  {uploadFile.status === 'uploading' && (
                                    <Progress value={uploadFile.progress} className="h-1" />
                                  )}
                                  
                                  {uploadFile.status === 'error' && (
                                    <p className="text-xs text-destructive">{uploadFile.error}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Actions */}
                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setIsUploadOpen(false)}
                      disabled={uploading}
                    >
                      {uploadFiles.some(f => f.status === 'success') ? 'Done' : 'Cancel'}
                    </Button>
                    <Button
                      onClick={handleBulkUpload}
                      disabled={uploading || uploadFiles.length === 0 || uploadFiles.every(f => f.status !== 'pending')}
                    >
                      {uploading ? (
                        <>
                          <LoadingSpinner size="sm" className="mr-2" />
                          Uploading...
                        </>
                      ) : (
                        `Upload ${uploadFiles.filter(f => f.status === 'pending').length} Track${uploadFiles.filter(f => f.status === 'pending').length !== 1 ? 's' : ''}`
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
