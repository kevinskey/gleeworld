import { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, ChevronDown, Music } from 'lucide-react';
import { useMusic } from '@/hooks/useMusic';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger
} from '@/components/ui/dropdown-menu';

interface HeaderMusicPlayerProps {
  className?: string;
}

export const HeaderMusicPlayer = ({ className = "" }: HeaderMusicPlayerProps) => {
  const { tracks, albums, loading, error } = useMusic();
  console.log('HeaderMusicPlayer Debug:', { tracks: tracks?.length, albums: albums?.length, loading, error });
  const [currentTrack, setCurrentTrack] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const handlePlayPause = async () => {
    if (!currentTrack || !audioRef.current) return;
    
    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        await audioRef.current.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Audio playback error:', error);
      setIsPlaying(false);
      // You could add a toast notification here to inform the user
    }
  };

  const handleTrackSelect = (track: any) => {
    setCurrentTrack(track);
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleNext = () => {
    if (!currentTrack) return;
    const currentIndex = tracks.findIndex(t => t.id === currentTrack.id);
    const nextTrack = tracks[currentIndex + 1] || tracks[0];
    setCurrentTrack(nextTrack);
  };

  const handlePrevious = () => {
    if (!currentTrack) return;
    const currentIndex = tracks.findIndex(t => t.id === currentTrack.id);
    const prevTrack = tracks[currentIndex - 1] || tracks[tracks.length - 1];
    setCurrentTrack(prevTrack);
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [currentTrack]);

  if (loading || tracks.length === 0) {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 bg-card/80 backdrop-blur-sm rounded-lg border px-3 py-1.5 ${className}`}>
      {currentTrack && (
        <audio
          ref={audioRef}
          src={currentTrack.audio_url}
          preload="metadata"
        />
      )}
      
      {/* Album Art */}
      <div className="w-8 h-8 rounded bg-muted flex items-center justify-center flex-shrink-0">
        {currentTrack?.album?.cover_image_url ? (
          <img 
            src={currentTrack.album.cover_image_url} 
            alt="Album art"
            className="w-full h-full rounded object-cover"
          />
        ) : (
          <Music className="w-4 h-4 text-muted-foreground" />
        )}
      </div>

      {/* Track Info */}
      <div className="flex-1 min-w-0 max-w-[200px]">
        {currentTrack ? (
          <div className="overflow-hidden">
            <div className="text-sm font-medium text-foreground truncate animate-pulse">
              {currentTrack.title}
            </div>
            <div className="text-xs text-muted-foreground truncate">
              {currentTrack.artist}
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">Select a track</div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={handlePrevious}
          disabled={!currentTrack}
          className="h-7 w-7 p-0"
        >
          <SkipBack className="w-3 h-3" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={handlePlayPause}
          disabled={!currentTrack}
          className="h-7 w-7 p-0"
        >
          {isPlaying ? (
            <Pause className="w-3 h-3" />
          ) : (
            <Play className="w-3 h-3" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleNext}
          disabled={!currentTrack}
          className="h-7 w-7 p-0"
        >
          <SkipForward className="w-3 h-3" />
        </Button>
      </div>

      {/* Track Selector */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
            <ChevronDown className="w-3 h-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 max-h-96 overflow-y-auto">
          {albums.length > 0 ? (
            albums.map((album) => (
              <DropdownMenuSub key={album.id}>
                <DropdownMenuSubTrigger className="text-sm">
                  {album.title}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-64 max-h-64 overflow-y-auto">
                  {album.tracks?.map((track) => (
                    <DropdownMenuItem
                      key={track.id}
                      onClick={() => handleTrackSelect(track)}
                      className="text-sm"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{track.title}</span>
                        <span className="text-xs text-muted-foreground">{track.artist}</span>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            ))
          ) : (
            tracks.map((track) => (
              <DropdownMenuItem
                key={track.id}
                onClick={() => handleTrackSelect(track)}
                className="text-sm"
              >
                <div className="flex flex-col">
                  <span className="font-medium">{track.title}</span>
                  <span className="text-xs text-muted-foreground">{track.artist}</span>
                </div>
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Progress indicator */}
      {currentTrack && duration > 0 && (
        <div className="w-16 h-1 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${(currentTime / duration) * 100}%` }}
          />
        </div>
      )}
    </div>
  );
};