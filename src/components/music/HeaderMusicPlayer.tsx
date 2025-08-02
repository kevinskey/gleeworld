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
  const [selectedAlbum, setSelectedAlbum] = useState<any>(null);
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
    setSelectedAlbum(track.album);
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleAlbumSelect = (album: any) => {
    setSelectedAlbum(album);
    // Optionally auto-select first track from album
    if (album.tracks && album.tracks.length > 0) {
      setCurrentTrack(album.tracks[0]);
      setIsPlaying(false);
      setCurrentTime(0);
    }
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
    <div className={`flex items-center gap-1 bg-white/20 backdrop-blur-md border border-spelman-blue-light/30 hover:bg-white/30 hover:border-spelman-blue-light/50 transition-all duration-300 hover:scale-105 shadow-md rounded-full px-2 py-1 ${className}`}>
      {currentTrack && (
        <audio
          ref={audioRef}
          src={currentTrack.audio_url}
          preload="metadata"
        />
      )}
      
      {/* Compact Track Info - Clickable to open dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div className="flex-1 min-w-0 max-w-[120px] cursor-pointer hover:bg-white/20 rounded px-1 py-0.5 transition-colors">
            {currentTrack ? (
              <div className="overflow-hidden">
                <div className="text-xs font-medium text-gray-700 truncate">
                  {currentTrack.title}
                </div>
              </div>
            ) : (
              <div className="text-xs text-gray-600">Select track...</div>
            )}
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56 max-h-80 overflow-y-auto bg-white/95 backdrop-blur-md border border-spelman-blue-light/30 shadow-xl">
          {!selectedAlbum ? (
            // Show album selection first
            <>
              <div className="px-2 py-1.5 text-xs font-semibold text-gray-600 bg-gray-50/50 border-b">
                Choose Album
              </div>
              {albums.map((album) => (
                <DropdownMenuItem
                  key={album.id}
                  onClick={() => handleAlbumSelect(album)}
                  className="text-xs flex items-center justify-between"
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{album.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {album.tracks?.length || 0} tracks
                    </span>
                  </div>
                  <ChevronDown className="w-3 h-3 rotate-[-90deg]" />
                </DropdownMenuItem>
              ))}
              {albums.length > 0 && (
                <>
                  <div className="border-t my-1"></div>
                  <DropdownMenuItem
                    onClick={() => setSelectedAlbum({ id: 'all', title: 'All Tracks', tracks: tracks })}
                    className="text-xs flex items-center justify-between"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">All Tracks</span>
                      <span className="text-xs text-muted-foreground">
                        {tracks.length} tracks
                      </span>
                    </div>
                    <ChevronDown className="w-3 h-3 rotate-[-90deg]" />
                  </DropdownMenuItem>
                </>
              )}
            </>
          ) : (
            // Show track selection from selected album
            <>
              <div className="px-2 py-1.5 text-xs font-semibold text-gray-600 bg-gray-50/50 border-b flex items-center justify-between">
                <span>{selectedAlbum.title}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedAlbum(null)}
                  className="h-4 w-4 p-0 hover:bg-white/30"
                >
                  <ChevronDown className="w-2.5 h-2.5 rotate-90" />
                </Button>
              </div>
              {selectedAlbum.tracks?.map((track) => (
                <DropdownMenuItem
                  key={track.id}
                  onClick={() => handleTrackSelect(track)}
                  className="text-xs"
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{track.title}</span>
                    <span className="text-xs text-muted-foreground">{track.artist}</span>
                  </div>
                </DropdownMenuItem>
              ))}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Compact Controls */}
      <div className="flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="sm"
          onClick={handlePrevious}
          disabled={!currentTrack}
          className="h-5 w-5 p-0 hover:bg-white/30 rounded-full"
        >
          <SkipBack className="w-2.5 h-2.5" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={handlePlayPause}
          disabled={!currentTrack}
          className="h-6 w-6 p-0 hover:bg-white/30 rounded-full"
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
          className="h-5 w-5 p-0 hover:bg-white/30 rounded-full"
        >
          <SkipForward className="w-2.5 h-2.5" />
        </Button>
      </div>


      {/* Compact Progress indicator */}
      {currentTrack && duration > 0 && (
        <div className="w-8 h-0.5 bg-white/30 rounded-full overflow-hidden ml-1">
          <div 
            className="h-full bg-spelman-blue-light transition-all duration-300"
            style={{ width: `${(currentTime / duration) * 100}%` }}
          />
        </div>
      )}
    </div>
  );
};