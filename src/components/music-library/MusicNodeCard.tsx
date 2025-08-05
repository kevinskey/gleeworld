import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Play, Pause, Music, Clock } from 'lucide-react';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';

interface AudioTrack {
  id: string;
  title: string;
  artist: string | null;
  audio_url: string | null;
  duration: number | null;
  genre: string | null;
  play_count: number;
  music_albums?: {
    title: string;
    cover_image_url: string | null;
  };
}

interface MusicNodeCardProps {
  id: string;
  data: {
    track: AudioTrack;
  };
}

export const MusicNodeCard = memo(({ id, data }: MusicNodeCardProps) => {
  const { playTrack, currentTrack, isPlaying, togglePlayPause } = useMusicPlayer();
  const { track } = data;

  const isCurrentTrack = currentTrack?.id === track.id;
  const isCurrentlyPlaying = isCurrentTrack && isPlaying;

  const handlePlay = () => {
    if (isCurrentTrack) {
      togglePlayPause();
    } else {
      playTrack(track);
    }
  };

  const formatDuration = (duration: number | null) => {
    if (!duration) return 'Unknown';
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <Handle 
        type="target" 
        position={Position.Left} 
        className="w-3 h-3 bg-blue-500 border-2 border-white" 
      />
      
      <Card className={`w-64 transition-all duration-300 ${
        isCurrentlyPlaying 
          ? 'ring-2 ring-blue-500 shadow-lg scale-105' 
          : 'hover:shadow-md hover:scale-102'
      }`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Album Art */}
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-md overflow-hidden flex items-center justify-center">
                {track.music_albums?.cover_image_url ? (
                  <img
                    src={track.music_albums.cover_image_url}
                    alt={`${track.title} cover`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Music className="w-6 h-6 text-blue-500" />
                )}
              </div>
            </div>

            {/* Track Info */}
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm truncate">{track.title}</h3>
              <p className="text-xs text-muted-foreground truncate">
                {track.artist || 'Unknown Artist'}
              </p>
              
              <div className="flex items-center gap-2 mt-2">
                {track.genre && (
                  <Badge variant="secondary" className="text-xs">
                    {track.genre}
                  </Badge>
                )}
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {formatDuration(track.duration)}
                </div>
              </div>
            </div>

            {/* Play Button */}
            <Button
              size="sm"
              variant={isCurrentlyPlaying ? "default" : "outline"}
              onClick={handlePlay}
              className="flex-shrink-0"
            >
              {isCurrentlyPlaying ? (
                <Pause className="w-3 h-3" />
              ) : (
                <Play className="w-3 h-3" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Handle 
        type="source" 
        position={Position.Right} 
        className="w-3 h-3 bg-blue-500 border-2 border-white" 
      />
    </>
  );
});

MusicNodeCard.displayName = 'MusicNodeCard';