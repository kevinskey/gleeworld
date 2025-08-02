import { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, ChevronDown, Music } from 'lucide-react';
import { useMusic } from '@/hooks/useMusic';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
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
  isExpanded?: boolean;
  onToggleExpanded?: (expanded: boolean) => void;
}

export const HeaderMusicPlayer = ({ className = "", isExpanded = false, onToggleExpanded }: HeaderMusicPlayerProps) => {
  const { tracks, albums, loading, error } = useMusic();
  const isMobile = useIsMobile();
  console.log('HeaderMusicPlayer Debug:', { tracks: tracks?.length, albums: albums?.length, loading, error });
  const [currentTrack, setCurrentTrack] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [hoveredAlbum, setHoveredAlbum] = useState<any>(null);
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
    setDropdownOpen(false); // Close dropdown after selection
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

  // Mobile view: Show only play button or expanded mini player
  if (isMobile) {
    if (!isExpanded) {
      // Show only play button on mobile
      return (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (!currentTrack && tracks.length > 0) {
              setCurrentTrack(tracks[0]);
            }
            onToggleExpanded?.(true);
          }}
          className={`h-8 w-8 p-0 rounded-full bg-white/40 backdrop-blur-md border border-spelman-blue-light/30 hover:bg-white/50 shadow-md ${className}`}
        >
          <Play className="w-4 h-4 text-gray-800" />
        </Button>
      );
    }

    // Expanded mobile mini player
    return (
      <div className="fixed left-0 right-0 bg-white/95 backdrop-blur-md border-b border-spelman-blue-light/30 shadow-lg z-[90] h-20 flex items-center px-4 gap-3">
        {currentTrack && (
          <audio
            ref={audioRef}
            src={currentTrack.audio_url}
            preload="metadata"
          />
        )}
        
        {/* Track Info */}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-gray-800 truncate">
            {currentTrack?.title || 'Select Track'}
          </div>
          <div className="text-xs text-gray-600 truncate">
            {currentTrack?.artist || 'No track selected'}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePrevious}
            disabled={!currentTrack}
            className="h-8 w-8 p-0 rounded-full"
          >
            <SkipBack className="w-4 h-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handlePlayPause}
            disabled={!currentTrack}
            className="h-10 w-10 p-0 rounded-full bg-spelman-blue-light/20"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleNext}
            disabled={!currentTrack}
            className="h-8 w-8 p-0 rounded-full"
          >
            <SkipForward className="w-4 h-4" />
          </Button>
        </div>

        {/* Track Selection */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full">
              <Music className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 max-h-60 overflow-y-auto">
            {tracks.map((track) => (
              <DropdownMenuItem
                key={track.id}
                onClick={() => handleTrackSelect(track)}
                className="flex flex-col items-start"
              >
                <span className="font-medium">{track.title}</span>
                <span className="text-xs text-muted-foreground">{track.artist}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Close Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onToggleExpanded?.(false)}
          className="h-8 w-8 p-0 rounded-full"
        >
          <ChevronDown className="w-4 h-4" />
        </Button>

        {/* Progress Bar */}
        {currentTrack && duration > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200">
            <div 
              className="h-full bg-spelman-blue-light transition-all duration-300"
              style={{ width: `${(currentTime / duration) * 100}%` }}
            />
          </div>
        )}
      </div>
    );
  }

  // Desktop view: Original compact player
  return (
    <div className={`relative flex items-center gap-1 bg-white/40 backdrop-blur-md border border-spelman-blue-light/30 hover:bg-white/50 hover:border-spelman-blue-light/50 transition-all duration-300 hover:scale-105 shadow-md rounded-full px-3 py-0.5 w-full max-w-[200px] sm:max-w-[280px] md:max-w-[320px] overflow-hidden group ${className}`}>
      {/* Animated Background - Only on Hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-spelman-blue-light/10 via-white/5 to-spelman-blue-light/10 opacity-0 group-hover:opacity-100 group-hover:animate-pulse transition-opacity duration-300"></div>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 group-hover:animate-[slide-in-right_3s_ease-in-out_infinite] transition-opacity duration-300"></div>
      
      {/* Content overlay */}
      <div className="relative z-10 flex items-center gap-1 w-full">
      {currentTrack && (
        <audio
          ref={audioRef}
          src={currentTrack.audio_url}
          preload="metadata"
        />
      )}
      
      {/* Compact Track Info - Hover to open dropdown */}
      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <div 
            className="flex-1 min-w-0 max-w-[140px] sm:max-w-[180px] md:max-w-[220px] cursor-pointer hover:bg-white/20 rounded px-1 py-0.5 transition-colors"
            onMouseEnter={() => setDropdownOpen(true)}
            onMouseLeave={() => setDropdownOpen(false)}
          >
            <div className="overflow-hidden">
              <div className="text-sm font-bold text-gray-800 uppercase tracking-wide truncate font-['Bebas_Neue']">
                MUSIC PLAYER
              </div>
            </div>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align="start" 
          className="w-56 max-h-80 overflow-y-auto bg-white/95 backdrop-blur-md border border-spelman-blue-light/30 shadow-xl"
          onMouseEnter={() => setDropdownOpen(true)}
          onMouseLeave={() => {
            setDropdownOpen(false);
            setHoveredAlbum(null);
          }}
        >
          {/* Show albums with custom hover flyouts */}
          <div className="px-2 py-1.5 text-[10px] font-semibold text-gray-600 bg-gray-50/50 border-b">
            Choose Album
          </div>
          {albums.map((album) => (
            <div key={album.id} className="relative">
              <div
                className="text-[10px] flex items-center gap-2 p-2 hover:bg-white/50 cursor-pointer transition-colors"
                onMouseEnter={() => setHoveredAlbum(album)}
              >
                {/* Album Art */}
                <div className="w-6 h-6 rounded bg-muted flex items-center justify-center flex-shrink-0">
                  {album.cover_image_url ? (
                    <img 
                      src={album.cover_image_url} 
                      alt="Album art"
                      className="w-full h-full rounded object-cover"
                    />
                  ) : (
                    <Music className="w-3 h-3 text-muted-foreground" />
                  )}
                </div>
                {/* Album Title */}
                <div className="flex flex-col flex-1">
                  <span className="font-medium">{album.title}</span>
                  <span className="text-[8px] text-muted-foreground">
                    {album.tracks?.length || 0} tracks
                  </span>
                </div>
                <ChevronDown className="w-3 h-3 rotate-[-90deg]" />
              </div>
              
              {/* Custom Flyout for Album Tracks */}
              {hoveredAlbum?.id === album.id && (
                <div 
                  className="absolute left-full top-0 ml-1 w-56 max-h-60 overflow-y-auto bg-white/95 backdrop-blur-md border border-spelman-blue-light/30 shadow-xl z-[200] rounded-lg"
                  onMouseEnter={() => setHoveredAlbum(album)}
                  onMouseLeave={() => setHoveredAlbum(null)}
                >
                  <div className="px-2 py-1.5 text-[8px] font-semibold text-gray-600 bg-gray-50/50 border-b">
                    {album.title} Tracks
                  </div>
                  {album.tracks?.map((track) => (
                    <div
                      key={track.id}
                      onClick={() => handleTrackSelect(track)}
                      className="text-[10px] p-2 hover:bg-white/50 cursor-pointer transition-colors border-b border-gray-100/50 last:border-b-0"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{track.title}</span>
                        <span className="text-[8px] text-muted-foreground">{track.artist}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          
          {/* All Tracks option */}
          {albums.length > 0 && (
            <>
              <div className="border-t my-1"></div>
              <div className="relative">
                <div
                  className="text-[10px] flex items-center gap-2 p-2 hover:bg-white/50 cursor-pointer transition-colors"
                  onMouseEnter={() => setHoveredAlbum({ id: 'all', title: 'All Tracks', tracks: tracks })}
                >
                  <div className="w-6 h-6 rounded bg-muted flex items-center justify-center flex-shrink-0">
                    <Music className="w-3 h-3 text-muted-foreground" />
                  </div>
                  <div className="flex flex-col flex-1">
                    <span className="font-medium">All Tracks</span>
                    <span className="text-[8px] text-muted-foreground">
                      {tracks.length} tracks
                    </span>
                  </div>
                  <ChevronDown className="w-3 h-3 rotate-[-90deg]" />
                </div>
                
                {/* Custom Flyout for All Tracks */}
                {hoveredAlbum?.id === 'all' && (
                  <div 
                    className="absolute left-full top-0 ml-1 w-56 max-h-60 overflow-y-auto bg-white/95 backdrop-blur-md border border-spelman-blue-light/30 shadow-xl z-[200] rounded-lg"
                    onMouseEnter={() => setHoveredAlbum({ id: 'all', title: 'All Tracks', tracks: tracks })}
                    onMouseLeave={() => setHoveredAlbum(null)}
                  >
                    <div className="px-2 py-1.5 text-[8px] font-semibold text-gray-600 bg-gray-50/50 border-b">
                      All Tracks
                    </div>
                    {tracks.map((track) => (
                      <div
                        key={track.id}
                        onClick={() => handleTrackSelect(track)}
                        className="text-[10px] p-2 hover:bg-white/50 cursor-pointer transition-colors border-b border-gray-100/50 last:border-b-0"
                      >
                        <div className="flex flex-col">
                          <span className="font-medium">{track.title}</span>
                          <span className="text-[8px] text-muted-foreground">{track.artist}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
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
    </div>
  );
};