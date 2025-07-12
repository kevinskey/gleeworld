import React from 'react';
import { Album, Track } from '@/hooks/useMusic';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  Pause, 
  Music, 
  Clock,
  Calendar,
  User,
  Maximize2,
  Minimize2
} from 'lucide-react';

interface AlbumModalProps {
  album: Album | null;
  isOpen: boolean;
  onClose: () => void;
}

export const AlbumModal = ({ album, isOpen, onClose }: AlbumModalProps) => {
  const { 
    playAlbum, 
    playTrack, 
    currentTrack, 
    isPlaying, 
    currentAlbum,
    togglePlayPause 
  } = useMusicPlayer();

  if (!album) return null;

  const tracks = album.tracks || [];
  const isCurrentAlbum = currentAlbum?.id === album.id;
  const albumDuration = tracks.reduce((total, track) => total + (track.duration || 0), 0);

  const handlePlayAlbum = () => {
    if (isCurrentAlbum && isPlaying) {
      togglePlayPause();
    } else {
      playAlbum(album);
    }
  };

  const handlePlayTrack = (track: Track, index: number) => {
    if (currentTrack?.id === track.id && isPlaying) {
      togglePlayPause();
    } else {
      playTrack(track, tracks, album);
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatSimpleTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
        <div className="flex flex-col h-full">
          {/* Header */}
          <DialogHeader className="p-6 pb-4 border-b">
            <div className="flex items-start gap-6">
              {/* Album Cover */}
              <div className="w-32 h-32 bg-gradient-to-br from-primary/20 to-primary/40 rounded-lg overflow-hidden flex-shrink-0">
                {album.cover_image_url ? (
                  <img
                    src={album.cover_image_url}
                    alt={`${album.title} cover`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Music className="h-16 w-16 text-primary" />
                  </div>
                )}
              </div>

              {/* Album Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary">Album</Badge>
                  {album.release_date && (
                    <Badge variant="outline" className="gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(album.release_date).getFullYear()}
                    </Badge>
                  )}
                </div>
                
                <DialogTitle className="text-2xl font-bold mb-2 text-left">
                  {album.title}
                </DialogTitle>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                  <div className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    {album.artist}
                  </div>
                  <div className="flex items-center gap-1">
                    <Music className="h-4 w-4" />
                    {tracks.length} track{tracks.length !== 1 ? 's' : ''}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {formatDuration(albumDuration)}
                  </div>
                </div>

                {album.description && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {album.description}
                  </p>
                )}

                {/* Play Button */}
                <Button 
                  onClick={handlePlayAlbum}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  size="lg"
                >
                  {isCurrentAlbum && isPlaying ? (
                    <>
                      <Pause className="h-5 w-5 mr-2" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="h-5 w-5 mr-2" />
                      Play Album
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogHeader>

          {/* Track List */}
          <ScrollArea className="flex-1">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Tracks</h3>
              
              {tracks.length === 0 ? (
                <Card className="p-8">
                  <CardContent className="text-center">
                    <Music className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No tracks available in this album</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {tracks.map((track, index) => {
                    const isCurrentTrack = currentTrack?.id === track.id;
                    const isTrackPlaying = isCurrentTrack && isPlaying;
                    
                    return (
                      <Card 
                        key={track.id}
                        className={`transition-all duration-200 hover:shadow-md cursor-pointer ${
                          isCurrentTrack ? 'bg-primary/10 border-primary/30' : 'hover:bg-muted/50'
                        }`}
                        onClick={() => handlePlayTrack(track, index)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            {/* Track Number / Play Button */}
                            <div className="w-8 h-8 flex items-center justify-center">
                              {isTrackPlaying ? (
                                <Pause className="h-4 w-4 text-primary" />
                              ) : isCurrentTrack ? (
                                <Play className="h-4 w-4 text-primary" />
                              ) : (
                                <span className="text-sm text-muted-foreground">
                                  {index + 1}
                                </span>
                              )}
                            </div>

                            {/* Track Info */}
                            <div className="flex-1 min-w-0">
                              <h4 className={`font-medium truncate ${
                                isCurrentTrack ? 'text-primary' : ''
                              }`}>
                                {track.title}
                              </h4>
                              <p className="text-sm text-muted-foreground truncate">
                                {track.artist}
                              </p>
                            </div>

                            {/* Track Duration */}
                            <div className="text-sm text-muted-foreground">
                              {formatSimpleTime(track.duration || 0)}
                            </div>

                            {/* Play Count */}
                            {track.play_count > 0 && (
                              <div className="text-xs text-muted-foreground">
                                {track.play_count} plays
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};