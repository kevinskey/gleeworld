import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useMusic } from "@/hooks/useMusic";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  Heart,
  Image
} from "lucide-react";

export const MusicManagement = () => {
  const { user } = useAuth();
  const { tracks, albums, loading, refetch } = useMusic();
  const { toast } = useToast();
  
  const [isCreatingAlbum, setIsCreatingAlbum] = useState(false);
  const [isCreatingTrack, setIsCreatingTrack] = useState(false);
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

  const handleCreateAlbum = async () => {
    if (!user || !albumForm.title || !albumForm.artist) return;

    try {
      const { error } = await supabase
        .from('music_albums')
        .insert({
          ...albumForm,
          created_by: user.id,
          release_date: albumForm.release_date || null
        });

      if (error) throw error;

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

  const handleCreateTrack = async () => {
    if (!user || !trackForm.title || !trackForm.artist || !trackForm.audio_url) return;

    try {
      const { error } = await supabase
        .from('music_tracks')
        .insert({
          ...trackForm,
          created_by: user.id,
          album_id: trackForm.album_id || null
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
          <Dialog open={isCreatingAlbum} onOpenChange={setIsCreatingAlbum}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <Album className="h-4 w-4 mr-2" />
                Add Album
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Album</DialogTitle>
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
                  <Button variant="outline" onClick={() => setIsCreatingAlbum(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateAlbum}>
                    Create Album
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isCreatingTrack} onOpenChange={setIsCreatingTrack}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-2" />
                Add Track
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Track</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
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
                      <SelectItem value="">No Album</SelectItem>
                      {albums.map((album) => (
                        <SelectItem key={album.id} value={album.id}>
                          {album.title} - {album.artist}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="track-audio">Audio URL *</Label>
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
                  <Button variant="outline" onClick={() => setIsCreatingTrack(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateTrack}>
                    Add Track
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Albums Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Album className="h-5 w-5 mr-2" />
            Albums ({albums.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {albums.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No albums found. Create your first album!</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {albums.map((album) => (
                <Card key={album.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/40 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
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
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">{album.title}</h3>
                        <p className="text-sm text-gray-600 truncate">{album.artist}</p>
                        <p className="text-xs text-gray-500">{album.tracks?.length || 0} tracks</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteAlbum(album.id, album.title)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tracks Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Music className="h-5 w-5 mr-2" />
            Tracks ({tracks.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tracks.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No tracks found. Add your first track!</p>
          ) : (
            <div className="space-y-2">
              {tracks.map((track) => (
                <div
                  key={track.id}
                  className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/40 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                    {track.album?.cover_image_url ? (
                      <img
                        src={track.album.cover_image_url}
                        alt={`${track.album.title} cover`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Music className="h-6 w-6 text-primary" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">{track.title}</h3>
                    <p className="text-sm text-gray-600 truncate">{track.artist}</p>
                    {track.album && (
                      <p className="text-xs text-gray-500 truncate">{track.album.title}</p>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <div className="flex items-center">
                      <Play className="h-4 w-4 mr-1" />
                      {track.play_count}
                    </div>
                    <div className="flex items-center">
                      <Heart className="h-4 w-4 mr-1" />
                      {track.likeCount || 0}
                    </div>
                    <span>{Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}</span>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteTrack(track.id, track.title)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};