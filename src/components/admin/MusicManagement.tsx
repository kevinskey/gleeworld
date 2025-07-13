import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useMusicPlayer } from "@/contexts/MusicPlayerContext";
import { useMusic } from "@/hooks/useMusic";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Music,
  Album,
  Upload,
  Trash2,
  Edit,
  Play,
  Pause,
  Heart,
  Image,
  Eye,
  ArrowUp,
  ArrowDown
} from "lucide-react";

export const MusicManagement = () => {
  const { user } = useAuth();
  const { tracks, albums, loading, refetch } = useMusic();
  const { playTrack, currentTrack, isPlaying, togglePlayPause } = useMusicPlayer();
  const { toast } = useToast();
  
  // ALL useState hooks must be called at the top, before any conditional logic
  const [selectedTracks, setSelectedTracks] = useState<Set<string>>(new Set());
  const [selectedAlbum, setSelectedAlbum] = useState<any>(null);
  const [batchDownloading, setBatchDownloading] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [isCreatingAlbum, setIsCreatingAlbum] = useState(false);
  const [isCreatingTrack, setIsCreatingTrack] = useState(false);
  const [editingAlbum, setEditingAlbum] = useState<any>(null);
  const [editingTrack, setEditingTrack] = useState<any>(null);
  const [albumForm, setAlbumForm] = useState({
    title: '',
    artist: '',
    description: '',
    release_date: '',
    cover_image_url: ''
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [trackForm, setTrackForm] = useState({
    title: '',
    artist: '',
    album_id: '',
    audio_url: '',
    duration: 0,
    track_number: 1,
    genre: '',
    lyrics: ''
  });
  const [batchUploading, setBatchUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{[key: string]: number}>({});
  const [dragActive, setDragActive] = useState(false);
  const [albumSortBy, setAlbumSortBy] = useState<'title' | 'artist' | 'release_date' | 'created_at'>('title');
  const [albumSortOrder, setAlbumSortOrder] = useState<'asc' | 'desc'>('asc');
  const [trackSortBy, setTrackSortBy] = useState<'title' | 'album' | 'artist' | 'created_at'>('title');
  const [trackSortOrder, setTrackSortOrder] = useState<'asc' | 'desc'>('asc');
  const [albumTrackSortBy, setAlbumTrackSortBy] = useState<'track_number' | 'title' | 'artist' | 'duration'>('track_number');
  const [albumTrackSortOrder, setAlbumTrackSortOrder] = useState<'asc' | 'desc'>('asc');

  // Sorted albums memo - must be with other hooks, before any early returns
  const sortedAlbums = useMemo(() => {
    if (!albums.length) return albums;
    
    return [...albums].sort((a, b) => {
      let aValue: any;
      let bValue: any;
      
      switch (albumSortBy) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'artist':
          aValue = a.artist.toLowerCase();
          bValue = b.artist.toLowerCase();
          break;
        case 'release_date':
          aValue = a.release_date ? new Date(a.release_date) : new Date(0);
          bValue = b.release_date ? new Date(b.release_date) : new Date(0);
          break;
        case 'created_at':
          aValue = (a as any).created_at ? new Date((a as any).created_at) : new Date(0);
          bValue = (b as any).created_at ? new Date((b as any).created_at) : new Date(0);
          break;
        default:
          return 0;
      }
      
      if (aValue < bValue) return albumSortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return albumSortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [albums, albumSortBy, albumSortOrder]);

  // Sorted tracks memo - must be with other hooks, before any early returns
  const sortedTracks = useMemo(() => {
    if (!tracks.length) return tracks;
    
    return [...tracks].sort((a, b) => {
      let aValue: any;
      let bValue: any;
      
      switch (trackSortBy) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'artist':
          aValue = a.artist.toLowerCase();
          bValue = b.artist.toLowerCase();
          break;
        case 'album':
          aValue = a.album?.title?.toLowerCase() || 'zzz'; // Put tracks without albums last
          bValue = b.album?.title?.toLowerCase() || 'zzz';
          break;
        case 'created_at':
          aValue = (a as any).created_at ? new Date((a as any).created_at) : new Date(0);
          bValue = (b as any).created_at ? new Date((b as any).created_at) : new Date(0);
          break;
        default:
          return 0;
      }
      
      if (aValue < bValue) return trackSortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return trackSortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [tracks, trackSortBy, trackSortOrder]);

  // Sorted album tracks memo for album detail view
  const sortedAlbumTracks = useMemo(() => {
    if (!selectedAlbum?.tracks?.length) return selectedAlbum?.tracks || [];
    
    return [...selectedAlbum.tracks].sort((a: any, b: any) => {
      let aValue: any;
      let bValue: any;
      
      switch (albumTrackSortBy) {
        case 'track_number':
          aValue = a.track_number || 999;
          bValue = b.track_number || 999;
          break;
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'artist':
          aValue = a.artist.toLowerCase();
          bValue = b.artist.toLowerCase();
          break;
        case 'duration':
          aValue = a.duration || 0;
          bValue = b.duration || 0;
          break;
        default:
          return 0;
      }
      
      if (aValue < bValue) return albumTrackSortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return albumTrackSortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [selectedAlbum?.tracks, albumTrackSortBy, albumTrackSortOrder]);

  // Get user role
  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user) {
        setRoleLoading(false);
        return;
      }

      try {
        const { data } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        
        setUserRole(data?.role || null);
      } catch (error) {
        console.error('Error fetching user role:', error);
      } finally {
        setRoleLoading(false);
      }
    };

    fetchUserRole();
  }, [user]);

  // Check if user has permissions - allow admins and super-admins to manage music
  const canManageMusic = userRole === 'super-admin' || userRole === 'admin';

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!canManageMusic) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">You don't have permission to manage music. Only admins and super admins can manage music tracks and albums.</p>
      </div>
    );
  }
  const handleCreateAlbum = async () => {
    if (!user || !albumForm.title || !albumForm.artist) {
      console.log('Validation failed:', { user: !!user, title: albumForm.title, artist: albumForm.artist });
      return;
    }

    console.log('Creating album with data:', {
      ...albumForm,
      created_by: user.id,
      release_date: albumForm.release_date || null
    });

    try {
      const { data, error } = await supabase
        .from('music_albums')
        .insert({
          ...albumForm,
          created_by: user.id,
          release_date: albumForm.release_date || null
        })
        .select();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Album created successfully:', data);

      toast({
        title: "Album created",
        description: `"${albumForm.title}" has been added to the music library`
      });

      setAlbumForm({
        title: '',
        artist: '',
        description: '',
        release_date: '',
        cover_image_url: ''
      });
      setIsCreatingAlbum(false);
      refetch();
    } catch (error) {
      console.error('Error creating album:', error);
      toast({
        title: "Error",
        description: "Failed to create album",
        variant: "destructive"
      });
    }
  };

  const handleUpdateAlbum = async () => {
    if (!editingAlbum || !albumForm.title || !albumForm.artist) return;

    try {
      const { error } = await supabase
        .from('music_albums')
        .update({
          title: albumForm.title,
          artist: albumForm.artist,
          description: albumForm.description,
          release_date: albumForm.release_date || null,
          cover_image_url: albumForm.cover_image_url
        })
        .eq('id', editingAlbum.id);

      if (error) throw error;

      toast({
        title: "Album updated",
        description: `"${albumForm.title}" has been updated`
      });

      setEditingAlbum(null);
      setAlbumForm({
        title: '',
        artist: '',
        description: '',
        release_date: '',
        cover_image_url: ''
      });
      refetch();
    } catch (error) {
      console.error('Error updating album:', error);
      toast({
        title: "Error",
        description: "Failed to update album",
        variant: "destructive"
      });
    }
  };

  const startEditingAlbum = (album: any) => {
    setEditingAlbum(album);
    setAlbumForm({
      title: album.title,
      artist: album.artist,
      description: album.description || '',
      release_date: album.release_date || '',
      cover_image_url: album.cover_image_url || ''
    });
  };

  const handleCreateTrack = async () => {
    if (!user || !trackForm.title || !trackForm.artist || !trackForm.audio_url) return;

    try {
      const { error } = await supabase
        .from('music_tracks')
        .insert({
          ...trackForm,
          created_by: user.id,
          album_id: trackForm.album_id === 'no-album' ? null : trackForm.album_id || null
        });

      if (error) throw error;

      toast({
        title: "Track added",
        description: `"${trackForm.title}" has been added to the music library`
      });

      setTrackForm({
        title: '',
        artist: '',
        album_id: '',
        audio_url: '',
        duration: 0,
        track_number: 1,
        genre: '',
        lyrics: ''
      });
      setIsCreatingTrack(false);
      setSelectedAlbum(null); // Close album view if open
      refetch();
    } catch (error) {
      console.error('Error creating track:', error);
      toast({
        title: "Error",
        description: "Failed to add track",
        variant: "destructive"
      });
    }
  };

  const handleUpdateTrack = async () => {
    if (!editingTrack || !trackForm.title || !trackForm.artist || !trackForm.audio_url) return;

    try {
      const { error } = await supabase
        .from('music_tracks')
        .update({
          title: trackForm.title,
          artist: trackForm.artist,
          album_id: trackForm.album_id === 'no-album' ? null : trackForm.album_id || null,
          audio_url: trackForm.audio_url,
          duration: trackForm.duration,
          track_number: trackForm.track_number,
          genre: trackForm.genre,
          lyrics: trackForm.lyrics
        })
        .eq('id', editingTrack.id);

      if (error) throw error;

      toast({
        title: "Track updated",
        description: `"${trackForm.title}" has been updated`
      });

      setEditingTrack(null);
      setTrackForm({
        title: '',
        artist: '',
        album_id: '',
        audio_url: '',
        duration: 0,
        track_number: 1,
        genre: '',
        lyrics: ''
      });
      refetch();
    } catch (error) {
      console.error('Error updating track:', error);
      toast({
        title: "Error",
        description: "Failed to update track",
        variant: "destructive"
      });
    }
  };

  const startEditingTrack = (track: any) => {
    setEditingTrack(track);
    setTrackForm({
      title: track.title,
      artist: track.artist,
      album_id: track.album?.id || 'no-album',
      audio_url: track.audio_url,
      duration: track.duration,
      track_number: track.track_number || 1,
      genre: track.genre || '',
      lyrics: track.lyrics || ''
    });
  };

  const openAlbumForTrackAdd = (album: any) => {
    setSelectedAlbum(null); // Close album view first
    setTrackForm({
      title: '',
      artist: album.artist, // Pre-fill with album artist
      album_id: album.id,
      audio_url: '',
      duration: 0,
      track_number: (album.tracks?.length || 0) + 1, // Auto-increment track number
      genre: '',
      lyrics: ''
    });
    setIsCreatingTrack(true);
  };

  const handleImageUpload = async (file: File) => {
    if (!user) return;

    setUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}_${Date.now()}.${fileExt}`;
      const filePath = `album-covers/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('user-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('user-files')
        .getPublicUrl(filePath);

      setAlbumForm(prev => ({ ...prev, cover_image_url: publicUrl }));

      toast({
        title: "Image uploaded",
        description: "Album cover has been uploaded successfully"
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Error",
        description: "Failed to upload image",
        variant: "destructive"
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleAudioUpload = async (file: File): Promise<string> => {
    if (!user) throw new Error('User not authenticated');

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}_${Date.now()}.${fileExt}`;
    const filePath = `audio-tracks/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('user-files')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('user-files')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const extractAudioMetadata = async (file: File): Promise<Partial<typeof trackForm>> => {
    // Extract filename without extension for title
    const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
    
    return new Promise((resolve) => {
      const audio = new Audio();
      const url = URL.createObjectURL(file);
      
      audio.onloadedmetadata = () => {
        const duration = Math.round(audio.duration);
        URL.revokeObjectURL(url);
        resolve({
          title: nameWithoutExt,
          duration: duration || 0,
        });
      };
      
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        resolve({
          title: nameWithoutExt,
          duration: 0,
        });
      };
      
      audio.src = url;
    });
  };

  const handleFileSelect = async (files: FileList | File[]) => {
    const audioFiles = Array.from(files).filter(file => 
      file.type.startsWith('audio/') || 
      file.name.toLowerCase().endsWith('.mp3') || 
      file.name.toLowerCase().endsWith('.wav') ||
      file.name.toLowerCase().endsWith('.aiff') ||
      file.name.toLowerCase().endsWith('.aif')
    );

    if (audioFiles.length === 0) {
      toast({
        title: "No audio files",
        description: "Please select MP3, WAV, or AIFF files",
        variant: "destructive"
      });
      return;
    }

    if (audioFiles.length === 1) {
      // Single file - use existing single track dialog
      const file = audioFiles[0];
      try {
        const metadata = await extractAudioMetadata(file);
        const audioUrl = await handleAudioUpload(file);
        
        setTrackForm(prev => ({
          ...prev,
          title: metadata.title || '',
          duration: metadata.duration || 0,
          audio_url: audioUrl,
        }));

        toast({
          title: "File uploaded",
          description: `"${file.name}" has been uploaded and is ready to save`
        });
      } catch (error) {
        console.error('Error uploading file:', error);
        toast({
          title: "Upload failed",
          description: "Failed to upload audio file",
          variant: "destructive"
        });
      }
    } else {
      // Multiple files - batch upload
      await handleBatchUpload(audioFiles);
    }
  };

  const handleBatchUpload = async (files: File[]) => {
    setBatchUploading(true);
    setUploadProgress({});
    
    const successfulUploads: any[] = [];
    const failedUploads: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const progressKey = file.name;
      
      try {
        // Update progress
        setUploadProgress(prev => ({ ...prev, [progressKey]: 25 }));
        
        // Extract metadata
        const metadata = await extractAudioMetadata(file);
        setUploadProgress(prev => ({ ...prev, [progressKey]: 50 }));
        
        // Upload file
        const audioUrl = await handleAudioUpload(file);
        setUploadProgress(prev => ({ ...prev, [progressKey]: 75 }));
        
        // Create track in database
        const trackData = {
          title: metadata.title || file.name.replace(/\.[^/.]+$/, ""),
          artist: trackForm.artist || 'Unknown Artist',
          album_id: trackForm.album_id === 'no-album' ? null : trackForm.album_id || null,
          audio_url: audioUrl,
          duration: metadata.duration || 0,
          track_number: (trackForm.track_number || 1) + i,
          genre: trackForm.genre || '',
          lyrics: '',
          created_by: user!.id
        };

        const { error } = await supabase
          .from('music_tracks')
          .insert(trackData);

        if (error) throw error;

        setUploadProgress(prev => ({ ...prev, [progressKey]: 100 }));
        successfulUploads.push(trackData);
        
      } catch (error) {
        console.error(`Error uploading ${file.name}:`, error);
        failedUploads.push(file.name);
        setUploadProgress(prev => ({ ...prev, [progressKey]: -1 })); // -1 indicates error
      }
    }

    setBatchUploading(false);
    
    if (successfulUploads.length > 0) {
      toast({
        title: "Batch upload completed",
        description: `${successfulUploads.length} tracks uploaded successfully${failedUploads.length > 0 ? `, ${failedUploads.length} failed` : ''}`
      });
      
      // Reset form and close dialog
      setTrackForm({
        title: '',
        artist: '',
        album_id: '',
        audio_url: '',
        duration: 0,
        track_number: 1,
        genre: '',
        lyrics: ''
      });
      setIsCreatingTrack(false);
      setSelectedAlbum(null);
      refetch();
    }

    if (failedUploads.length > 0 && successfulUploads.length === 0) {
      toast({
        title: "Upload failed",
        description: `Failed to upload ${failedUploads.length} file(s)`,
        variant: "destructive"
      });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files);
    }
  };

  const handleDeleteTrack = async (trackId: string, trackTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${trackTitle}"?`)) return;

    try {
      const { error } = await supabase
        .from('music_tracks')
        .delete()
        .eq('id', trackId);

      if (error) throw error;

      toast({
        title: "Track deleted",
        description: `"${trackTitle}" has been removed from the library`
      });
      refetch();
    } catch (error) {
      console.error('Error deleting track:', error);
      toast({
        title: "Error",
        description: "Failed to delete track",
        variant: "destructive"
      });
    }
  };

  const handleDeleteAlbum = async (albumId: string, albumTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${albumTitle}"? This will not delete the tracks.`)) return;

    try {
      const { error } = await supabase
        .from('music_albums')
        .delete()
        .eq('id', albumId);

      if (error) throw error;

      toast({
        title: "Album deleted",
        description: `"${albumTitle}" has been removed from the library`
      });
      refetch();
    } catch (error) {
      console.error('Error deleting album:', error);
      toast({
        title: "Error",
        description: "Failed to delete album",
        variant: "destructive"
      });
    }
  };

  const toggleTrackSelection = (trackId: string) => {
    const newSelection = new Set(selectedTracks);
    if (newSelection.has(trackId)) {
      newSelection.delete(trackId);
    } else {
      newSelection.add(trackId);
    }
    setSelectedTracks(newSelection);
  };

  const handleSelectAll = () => {
    const allTrackIds = tracks?.map(track => track.id) || [];
    if (selectedTracks.size === allTrackIds.length) {
      setSelectedTracks(new Set());
    } else {
      setSelectedTracks(new Set(allTrackIds));
    }
  };

  const downloadTrackWithTitle = async (track: any) => {
    try {
      const response = await fetch(track.audio_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      // Create filename from track title, removing invalid characters
      const sanitizedTitle = track.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const fileExtension = track.audio_url.split('.').pop() || 'mp3';
      const filename = `${sanitizedTitle}.${fileExtension}`;
      
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading track:', error);
      toast({
        title: "Download failed",
        description: `Failed to download "${track.title}"`,
        variant: "destructive"
      });
    }
  };

  const handleBatchDownload = async () => {
    if (selectedTracks.size === 0) {
      toast({
        title: "No tracks selected",
        description: "Please select tracks to download",
        variant: "destructive"
      });
      return;
    }

    setBatchDownloading(true);
    const selectedTracksList = tracks?.filter(track => selectedTracks.has(track.id)) || [];
    
    try {
      for (const track of selectedTracksList) {
        await downloadTrackWithTitle(track);
        // Small delay between downloads to prevent overwhelming the browser
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      toast({
        title: "Batch download complete",
        description: `Downloaded ${selectedTracksList.length} tracks`
      });
      
      setSelectedTracks(new Set()); // Clear selection after download
    } catch (error) {
      console.error('Error in batch download:', error);
      toast({
        title: "Batch download failed",
        description: "Some downloads may have failed",
        variant: "destructive"
      });
    } finally {
      setBatchDownloading(false);
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Music Management</h2>
        <div className="flex space-x-2">
          <Dialog open={isCreatingAlbum || !!editingAlbum} onOpenChange={(open) => {
            if (!open) {
              setIsCreatingAlbum(false);
              setEditingAlbum(null);
              setAlbumForm({
                title: '',
                artist: '',
                description: '',
                release_date: '',
                cover_image_url: ''
              });
            } else if (open && !editingAlbum) {
              setIsCreatingAlbum(true);
            }
          }}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <Album className="h-4 w-4 mr-2" />
                Add Album
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingAlbum ? 'Edit Album' : 'Create New Album'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="album-title">Title *</Label>
                  <Input
                    id="album-title"
                    value={albumForm.title}
                    onChange={(e) => setAlbumForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Album title"
                  />
                </div>
                <div>
                  <Label htmlFor="album-artist">Artist *</Label>
                  <Input
                    id="album-artist"
                    value={albumForm.artist}
                    onChange={(e) => setAlbumForm(prev => ({ ...prev, artist: e.target.value }))}
                    placeholder="Artist name"
                  />
                </div>
                <div>
                  <Label htmlFor="album-cover">Album Cover</Label>
                  <div className="space-y-3">
                    {albumForm.cover_image_url && (
                      <div className="flex items-center space-x-3">
                        <img
                          src={albumForm.cover_image_url}
                          alt="Album cover preview"
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setAlbumForm(prev => ({ ...prev, cover_image_url: '' }))}
                        >
                          Remove
                        </Button>
                      </div>
                    )}
                    <div className="flex space-x-2">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(file);
                        }}
                        disabled={uploadingImage}
                        className="flex-1"
                      />
                      <Button
                        variant="outline"
                        disabled={uploadingImage}
                        className="px-3"
                      >
                        {uploadingImage ? (
                          <div className="h-4 w-4 animate-spin border-2 border-current border-t-transparent rounded-full" />
                        ) : (
                          <Upload className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <div className="text-sm text-gray-500">
                      Or paste image URL:
                    </div>
                    <Input
                      value={albumForm.cover_image_url}
                      onChange={(e) => setAlbumForm(prev => ({ ...prev, cover_image_url: e.target.value }))}
                      placeholder="https://example.com/cover.jpg"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="album-release">Release Date</Label>
                  <Input
                    id="album-release"
                    type="date"
                    value={albumForm.release_date}
                    onChange={(e) => setAlbumForm(prev => ({ ...prev, release_date: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="album-description">Description</Label>
                  <Textarea
                    id="album-description"
                    value={albumForm.description}
                    onChange={(e) => setAlbumForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Album description"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => {
                    setIsCreatingAlbum(false);
                    setEditingAlbum(null);
                    setAlbumForm({
                      title: '',
                      artist: '',
                      description: '',
                      release_date: '',
                      cover_image_url: ''
                    });
                  }}>
                    Cancel
                  </Button>
                  <Button onClick={editingAlbum ? handleUpdateAlbum : handleCreateAlbum}>
                    {editingAlbum ? 'Update Album' : 'Create Album'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isCreatingTrack || !!editingTrack} onOpenChange={(open) => {
            if (!open) {
              setIsCreatingTrack(false);
              setEditingTrack(null);
              setTrackForm({
                title: '',
                artist: '',
                album_id: '',
                audio_url: '',
                duration: 0,
                track_number: 1,
                genre: '',
                lyrics: ''
              });
            }
          }}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-2" />
                Add Track
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingTrack ? 'Edit Track' : 'Add New Track'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {/* File Upload Section */}
                <div className="space-y-4">
                  <div>
                    <Label>Audio Files Upload</Label>
                    <div 
                      className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                        dragActive ? 'border-primary bg-primary/5' : 'border-gray-300'
                      }`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-600 mb-2">
                        Drag and drop MP3, WAV, or AIFF files here, or click to select
                      </p>
                      <Input
                        type="file"
                        accept="audio/*,.mp3,.wav,.aiff,.aif"
                        multiple
                        onChange={(e) => {
                          const files = e.target.files;
                          if (files) handleFileSelect(files);
                        }}
                        className="hidden"
                        id="audio-upload"
                      />
                      <Label htmlFor="audio-upload">
                        <Button variant="outline" className="cursor-pointer" asChild>
                          <span>Select Files</span>
                        </Button>
                      </Label>
                      <p className="text-xs text-gray-500 mt-2">
                        Single file: fills form below • Multiple files: batch upload with current settings
                      </p>
                    </div>
                  </div>

                  {/* Batch Upload Progress */}
                  {batchUploading && (
                    <div className="space-y-2">
                      <h4 className="font-medium">Upload Progress</h4>
                      <div className="space-y-1">
                        {Object.entries(uploadProgress).map(([filename, progress]) => (
                          <div key={filename} className="flex items-center space-x-2">
                            <span className="text-sm truncate flex-1">{filename}</span>
                            <div className="w-20 bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full transition-all ${
                                  progress === -1 ? 'bg-red-500' : progress === 100 ? 'bg-green-500' : 'bg-primary'
                                }`}
                                style={{ width: progress === -1 ? '100%' : `${progress}%` }}
                              />
                            </div>
                            <span className="text-xs w-12">
                              {progress === -1 ? 'Error' : progress === 100 ? 'Done' : `${progress}%`}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Manual Track Details Form */}
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Track Details (for single upload or batch defaults)</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="track-title">Title *</Label>
                      <Input
                        id="track-title"
                        value={trackForm.title}
                        onChange={(e) => setTrackForm(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Track title"
                      />
                    </div>
                    <div>
                      <Label htmlFor="track-artist">Artist *</Label>
                      <Input
                        id="track-artist"
                        value={trackForm.artist}
                        onChange={(e) => setTrackForm(prev => ({ ...prev, artist: e.target.value }))}
                        placeholder="Artist name"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="track-album">Album</Label>
                    <Select value={trackForm.album_id} onValueChange={(value) => setTrackForm(prev => ({ ...prev, album_id: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an album (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no-album">No Album</SelectItem>
                        {albums.map((album) => (
                          <SelectItem key={album.id} value={album.id}>
                            {album.title} - {album.artist}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="track-audio">Audio URL * (or upload file above)</Label>
                    <Input
                      id="track-audio"
                      value={trackForm.audio_url}
                      onChange={(e) => setTrackForm(prev => ({ ...prev, audio_url: e.target.value }))}
                      placeholder="https://example.com/audio.mp3"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="track-duration">Duration (seconds)</Label>
                      <Input
                        id="track-duration"
                        type="number"
                        value={trackForm.duration}
                        onChange={(e) => setTrackForm(prev => ({ ...prev, duration: Number(e.target.value) }))}
                        placeholder="180"
                      />
                    </div>
                    <div>
                      <Label htmlFor="track-number">Track Number</Label>
                      <Input
                        id="track-number"
                        type="number"
                        value={trackForm.track_number}
                        onChange={(e) => setTrackForm(prev => ({ ...prev, track_number: Number(e.target.value) }))}
                        placeholder="1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="track-genre">Genre</Label>
                      <Input
                        id="track-genre"
                        value={trackForm.genre}
                        onChange={(e) => setTrackForm(prev => ({ ...prev, genre: e.target.value }))}
                        placeholder="Gospel"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="track-lyrics">Lyrics</Label>
                    <Textarea
                      id="track-lyrics"
                      value={trackForm.lyrics}
                      onChange={(e) => setTrackForm(prev => ({ ...prev, lyrics: e.target.value }))}
                      placeholder="Track lyrics..."
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => {
                      setIsCreatingTrack(false);
                      setEditingTrack(null);
                      setTrackForm({
                        title: '',
                        artist: '',
                        album_id: '',
                        audio_url: '',
                        duration: 0,
                        track_number: 1,
                        genre: '',
                        lyrics: ''
                      });
                    }}>
                      Cancel
                    </Button>
                    <Button onClick={editingTrack ? handleUpdateTrack : handleCreateTrack}>
                      {editingTrack ? 'Update Track' : 'Add Track'}
                    </Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Albums Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Album className="h-5 w-5 mr-2" />
              Albums ({albums.length})
            </CardTitle>
            <div className="flex items-center gap-2">
              <Select value={albumSortBy} onValueChange={(value: any) => setAlbumSortBy(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-200 shadow-lg z-50">
                  <SelectItem value="title">Title</SelectItem>
                  <SelectItem value="artist">Artist</SelectItem>
                  <SelectItem value="release_date">Release Date</SelectItem>
                  <SelectItem value="created_at">Date Added</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const newOrder = albumSortOrder === 'asc' ? 'desc' : 'asc';
                  console.log('Album sort order changing from', albumSortOrder, 'to', newOrder);
                  setAlbumSortOrder(newOrder);
                }}
                className="px-2"
              >
                {albumSortOrder === 'asc' ? (
                  <ArrowUp className="h-4 w-4" />
                ) : (
                  <ArrowDown className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {albums.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No albums found. Create your first album!</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedAlbums.map((album) => (
                <Card key={album.id} className="hover:shadow-md transition-shadow cursor-pointer group">
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <div 
                        className="w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/40 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0"
                        onClick={() => setSelectedAlbum(album)}
                      >
                        {album.cover_image_url ? (
                          <img
                            src={album.cover_image_url}
                            alt={`${album.title} cover`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Album className="h-8 w-8 text-primary" />
                        )}
                      </div>
                      <div 
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => setSelectedAlbum(album)}
                      >
                        <h3 className="font-semibold text-gray-900 truncate group-hover:text-primary transition-colors">{album.title}</h3>
                        <p className="text-sm text-gray-600 truncate">{album.artist}</p>
                        <p className="text-xs text-gray-500">{album.tracks?.length || 0} tracks</p>
                      </div>
                      <div className="flex space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedAlbum(album);
                          }}
                          className="text-green-500 hover:text-green-700"
                          title="View album details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditingAlbum(album);
                          }}
                          className="text-blue-500 hover:text-blue-700"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteAlbum(album.id, album.title);
                          }}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Album Detail Modal */}
      {selectedAlbum && (
        <Dialog open={!!selectedAlbum} onOpenChange={() => setSelectedAlbum(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/40 rounded-lg flex items-center justify-center overflow-hidden">
                  {selectedAlbum.cover_image_url ? (
                    <img
                      src={selectedAlbum.cover_image_url}
                      alt={`${selectedAlbum.title} cover`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Album className="h-6 w-6 text-primary" />
                  )}
                </div>
                <div>
                  <div className="text-xl font-bold">{selectedAlbum.title}</div>
                  <div className="text-sm text-gray-600">{selectedAlbum.artist}</div>
                </div>
              </DialogTitle>
              <DialogDescription>
                {selectedAlbum.description || 'No description available'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Tracks ({selectedAlbum.tracks?.length || 0})</h3>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    <Select value={albumTrackSortBy} onValueChange={(value: any) => setAlbumTrackSortBy(value)}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border border-gray-200 shadow-lg z-50">
                        <SelectItem value="track_number">Track #</SelectItem>
                        <SelectItem value="title">Title</SelectItem>
                        <SelectItem value="artist">Artist</SelectItem>
                        <SelectItem value="duration">Duration</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newOrder = albumTrackSortOrder === 'asc' ? 'desc' : 'asc';
                        console.log('Album track sort order changing from', albumTrackSortOrder, 'to', newOrder);
                        setAlbumTrackSortOrder(newOrder);
                      }}
                      className="px-2"
                    >
                      {albumTrackSortOrder === 'asc' ? (
                        <ArrowUp className="h-4 w-4" />
                      ) : (
                        <ArrowDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <Button 
                    onClick={() => openAlbumForTrackAdd(selectedAlbum)}
                    className="bg-primary hover:bg-primary/90"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Track to Album
                  </Button>
                </div>
              </div>

              {selectedAlbum.tracks?.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <Music className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">No tracks in this album yet.</p>
                  <Button 
                    onClick={() => openAlbumForTrackAdd(selectedAlbum)}
                    className="mt-3"
                    variant="outline"
                  >
                    Add First Track
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {sortedAlbumTracks.map((track: any, index: number) => (
                    <div
                      key={track.id}
                      className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="w-8 h-8 bg-primary/20 rounded flex items-center justify-center text-sm font-medium text-primary">
                        {track.track_number || index + 1}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 truncate">{track.title}</h4>
                        <p className="text-sm text-gray-600 truncate">{track.artist}</p>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <div className="flex items-center" title="Play count">
                          <Play className="h-4 w-4 mr-1" />
                          <span className="text-xs">{track.play_count || 0} plays</span>
                        </div>
                        <span>{Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}</span>
                      </div>
                      
                      <div className="flex space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (currentTrack?.id === track.id && isPlaying) {
                              togglePlayPause();
                            } else {
                              playTrack(track, sortedAlbumTracks);
                            }
                          }}
                          className="text-primary hover:text-primary/80"
                          title="Play track"
                        >
                          {currentTrack?.id === track.id && isPlaying ? (
                            <Pause className="h-4 w-4" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEditingTrack(track)}
                          className="text-blue-500 hover:text-blue-700"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteTrack(track.id, track.title)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => downloadTrackWithTitle(track)}
                          className="text-green-500 hover:text-green-700"
                          title="Download track"
                        >
                          <Upload className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Tracks Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Music className="h-5 w-5 mr-2" />
            Tracks ({tracks.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Tracks ({tracks?.length || 0})</h3>
            <div className="flex items-center gap-2">
              {tracks && tracks.length > 0 && (
                <>
                  <Select value={trackSortBy} onValueChange={(value: any) => setTrackSortBy(value)}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-gray-200 shadow-lg z-50">
                      <SelectItem value="title">Title</SelectItem>
                      <SelectItem value="album">Album</SelectItem>
                      <SelectItem value="artist">Artist</SelectItem>
                      <SelectItem value="created_at">Date Added</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newOrder = trackSortOrder === 'asc' ? 'desc' : 'asc';
                      console.log('Track sort order changing from', trackSortOrder, 'to', newOrder);
                      setTrackSortOrder(newOrder);
                    }}
                    className="px-2"
                  >
                    {trackSortOrder === 'asc' ? (
                      <ArrowUp className="h-4 w-4" />
                    ) : (
                      <ArrowDown className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAll}
                    className="text-xs"
                  >
                    {selectedTracks.size === tracks.length ? 'Deselect All' : 'Select All'}
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleBatchDownload}
                    disabled={selectedTracks.size === 0 || batchDownloading}
                    className="text-xs"
                  >
                    {batchDownloading ? 'Downloading...' : `Download Selected (${selectedTracks.size})`}
                  </Button>
                </>
              )}
            </div>
          </div>
          {tracks.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No tracks found. Add your first track!</p>
          ) : (
            <div className="space-y-2">
              {sortedTracks.map((track) => (
                <div
                  key={track.id}
                  className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedTracks.has(track.id)}
                    onChange={() => toggleTrackSelection(track.id)}
                    className="w-4 h-4 text-primary bg-white border-gray-300 rounded focus:ring-primary"
                  />
                  <div className="relative w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/40 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0 group">
                    {track.album?.cover_image_url ? (
                      <img
                        src={track.album.cover_image_url}
                        alt={`${track.album.title} cover`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Music className="h-6 w-6 text-primary" />
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (currentTrack?.id === track.id && isPlaying) {
                            togglePlayPause();
                          } else {
                            playTrack(track, tracks);
                          }
                        }}
                        className="text-white hover:text-white hover:bg-white/20 p-1 h-8 w-8"
                      >
                        {currentTrack?.id === track.id && isPlaying ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">{track.title}</h3>
                    <p className="text-sm text-gray-600 truncate">{track.artist}</p>
                    {track.album && (
                      <p className="text-xs text-gray-500 truncate">{track.album.title}</p>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <div className="flex items-center" title="Play count">
                      <Play className="h-4 w-4 mr-1" />
                      <span className="text-xs">{track.play_count} plays</span>
                    </div>
                    <div className="flex items-center">
                      <Heart className="h-4 w-4 mr-1" />
                      {track.likeCount || 0}
                    </div>
                    <span>{Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}</span>
                  </div>
                  
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => startEditingTrack(track)}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteTrack(track.id, track.title)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => downloadTrackWithTitle(track)}
                      className="text-green-500 hover:text-green-700"
                      title="Download track"
                    >
                      <Upload className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};