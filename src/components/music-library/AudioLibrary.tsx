import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Music, 
  Play, 
  Pause, 
  Download, 
  Edit, 
  Trash2, 
  Heart,
  Clock,
  User,
  Disc,
  Lock
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useMusicPlayer } from "@/contexts/MusicPlayerContext";
import { useUserRole } from "@/hooks/useUserRole";
import { AudioEditDialog } from "./AudioEditDialog";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";

interface AudioTrack {
  id: string;
  title: string;
  artist: string | null;
  album_id: string | null;
  audio_url: string | null;
  duration: number | null;
  track_number: number | null;
  lyrics: string | null;
  genre: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
  play_count: number;
  music_albums?: {
    title: string;
    cover_image_url: string | null;
  };
}

interface AudioLibraryProps {
  searchQuery: string;
  selectedCategory: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
  viewMode: "grid" | "list";
}

export const AudioLibrary = ({
  searchQuery,
  selectedCategory,
  sortBy,
  sortOrder,
  viewMode,
}: AudioLibraryProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { canDownloadMP3 } = useUserRole();
  const { playTrack, currentTrack, isPlaying, togglePlayPause } = useMusicPlayer();
  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialog, setEditDialog] = useState<{ open: boolean; item: AudioTrack | null }>({
    open: false,
    item: null,
  });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; item: AudioTrack | null }>({
    open: false,
    item: null,
  });

  useEffect(() => {
    fetchTracks();
  }, []);

  const fetchTracks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('music_tracks')
        .select(`
          *,
          music_albums (
            title,
            cover_image_url
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTracks(data || []);
    } catch (error) {
      console.error('Error fetching tracks:', error);
      toast({
        title: "Error",
        description: "Failed to load audio library",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedTracks = useMemo(() => {
    let filtered = tracks.filter((track) => {
      const matchesSearch = searchQuery === "" || 
        track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        track.artist?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        track.music_albums?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        track.genre?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = selectedCategory === "all" || 
        track.genre?.toLowerCase() === selectedCategory.toLowerCase();

      return matchesSearch && matchesCategory;
    });

    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case "title":
          aValue = a.title;
          bValue = b.title;
          break;
        case "composer":
        case "artist":
          aValue = a.artist || "";
          bValue = b.artist || "";
          break;
        case "created_at":
          aValue = a.created_at;
          bValue = b.created_at;
          break;
        case "duration":
          aValue = a.duration || 0;
          bValue = b.duration || 0;
          break;
        default:
          aValue = a.title;
          bValue = b.title;
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [tracks, searchQuery, selectedCategory, sortBy, sortOrder]);

  const handlePlay = (track: AudioTrack) => {
    if (currentTrack?.id === track.id) {
      togglePlayPause();
    } else {
      playTrack(track);
    }
  };

  const handleEdit = (track: AudioTrack) => {
    setEditDialog({ open: true, item: track });
  };

  const handleDelete = (track: AudioTrack) => {
    setDeleteDialog({ open: true, item: track });
  };

  const confirmDelete = async () => {
    if (!deleteDialog.item) return;

    try {
      const { error } = await supabase
        .from('music_tracks')
        .delete()
        .eq('id', deleteDialog.item.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Track deleted successfully",
      });

      setDeleteDialog({ open: false, item: null });
      fetchTracks();
    } catch (error) {
      console.error('Error deleting track:', error);
      toast({
        title: "Error",
        description: "Failed to delete track",
        variant: "destructive",
      });
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-32 bg-gray-200 rounded mb-4"></div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (filteredAndSortedTracks.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Music className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No audio tracks found</h3>
          <p className="text-muted-foreground text-center">
            {searchQuery || selectedCategory !== "all" 
              ? "Try adjusting your search or filter criteria"
              : "Start by uploading your first audio track"
            }
          </p>
        </CardContent>
      </Card>
    );
  }

  const renderGridView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {filteredAndSortedTracks.map((track) => (
        <Card key={track.id} className="group hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-sm font-medium truncate" title={track.title}>
                  {track.title}
                </CardTitle>
                {track.artist && (
                  <p className="text-xs text-muted-foreground truncate" title={track.artist}>
                    by {track.artist}
                  </p>
                )}
                {track.music_albums?.title && (
                  <p className="text-xs text-muted-foreground truncate" title={track.music_albums.title}>
                    from {track.music_albums.title}
                  </p>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Album Art */}
            <div className="aspect-square bg-muted rounded-lg overflow-hidden relative">
              {track.music_albums?.cover_image_url ? (
                <img
                  src={track.music_albums.cover_image_url}
                  alt={`${track.title} cover`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Disc className="h-12 w-12 text-muted-foreground" />
                </div>
              )}
              
              {/* Play button overlay */}
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handlePlay(track)}
                  className="rounded-full"
                  disabled={!track.audio_url}
                >
                  {currentTrack?.id === track.id && isPlaying ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Details */}
            <div className="space-y-2">
              {track.genre && (
                <Badge variant="secondary">
                  {track.genre}
                </Badge>
              )}
              
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{formatDuration(track.duration)}</span>
                {track.play_count > 0 && (
                  <>
                    <span>•</span>
                    <span>{track.play_count} plays</span>
                  </>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button size="sm" variant="outline" onClick={() => handleEdit(track)}>
                <Edit className="h-3 w-3" />
              </Button>
              {track.audio_url && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => {
                    if (!canDownloadMP3()) {
                      toast({
                        title: "Access Denied",
                        description: "Only super-admins can download MP3 files.",
                        variant: "destructive",
                      });
                      return;
                    }
                    window.open(track.audio_url!, '_blank');
                  }}
                  disabled={!canDownloadMP3()}
                  className={!canDownloadMP3() ? "opacity-50" : ""}
                >
                  {canDownloadMP3() ? (
                    <Download className="h-3 w-3" />
                  ) : (
                    <Lock className="h-3 w-3" />
                  )}
                </Button>
              )}
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => handleDelete(track)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderListView = () => (
    <div className="space-y-2">
      {filteredAndSortedTracks.map((track) => (
        <Card key={track.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              {/* Album Art */}
              <div className="w-12 h-12 bg-muted rounded overflow-hidden flex-shrink-0">
                {track.music_albums?.cover_image_url ? (
                  <img
                    src={track.music_albums.cover_image_url}
                    alt={`${track.title} cover`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Music className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{track.title}</h3>
                    {track.artist && (
                      <p className="text-sm text-muted-foreground">by {track.artist}</p>
                    )}
                    
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                      {track.music_albums?.title && (
                        <span>from {track.music_albums.title}</span>
                      )}
                      <span>{formatDuration(track.duration)}</span>
                      {track.genre && (
                        <Badge variant="secondary" className="text-xs">
                          {track.genre}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handlePlay(track)}
                      disabled={!track.audio_url}
                    >
                      {currentTrack?.id === track.id && isPlaying ? (
                        <Pause className="h-3 w-3" />
                      ) : (
                        <Play className="h-3 w-3" />
                      )}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleEdit(track)}>
                      <Edit className="h-3 w-3" />
                    </Button>
                    {track.audio_url && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => {
                          if (!canDownloadMP3()) {
                            toast({
                              title: "Access Denied",
                              description: "Only super-admins can download MP3 files.",
                              variant: "destructive",
                            });
                            return;
                          }
                          window.open(track.audio_url!, '_blank');
                        }}
                        disabled={!canDownloadMP3()}
                        className={!canDownloadMP3() ? "opacity-50" : ""}
                      >
                        {canDownloadMP3() ? (
                          <Download className="h-3 w-3" />
                        ) : (
                          <Lock className="h-3 w-3" />
                        )}
                      </Button>
                    )}
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleDelete(track)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <>
      {viewMode === "grid" ? renderGridView() : renderListView()}

      {/* Dialogs */}
      <AudioEditDialog
        open={editDialog.open}
        onOpenChange={(open) => setEditDialog({ open, item: null })}
        item={editDialog.item}
        onSave={fetchTracks}
      />

      <DeleteConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, item: null })}
        title="Delete Audio Track"
        description={`Are you sure you want to delete "${deleteDialog.item?.title}"? This action cannot be undone.`}
        onConfirm={confirmDelete}
      />
    </>
  );
};