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
    const handleEnded = () => {
      setIsPlaying(false);
      // Auto-collapse on mobile when music ends
      if (isMobile && onToggleExpanded) {
        onToggleExpanded(false);
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
  }, [currentTrack, isMobile, onToggleExpanded]);

  // Auto-hide on mobile when user clicks outside or interacts with app
  useEffect(() => {
    if (!isMobile || !isExpanded) return;

    const handleClickOutside = () => {
      onToggleExpanded?.(false);
    };

    const handleScroll = () => {
      onToggleExpanded?.(false);
    };

    // Add slight delay to avoid immediate hiding when opening
    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
      document.addEventListener('scroll', handleScroll, true);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('scroll', handleScroll, true);
    };
  }, [isMobile, isExpanded, onToggleExpanded]);

  if (loading || tracks.length === 0) {
    return null;
  }

  // Mobile view: Show only play button or expanded mini player
  if (isMobile) {
    if (!isExpanded) {
      // Show only play button on mobile - styled as vintage Victrola
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
          className={`h-8 w-8 p-0 rounded-full bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 hover:from-blue-500 hover:via-blue-600 hover:to-blue-700 shadow-lg border-2 border-blue-500 mr-2 ${className}`}
          style={{
            boxShadow: 'inset 0 2px 4px rgba(59, 130, 246, 0.3), 0 4px 8px rgba(0, 0, 0, 0.3)'
          }}
        >
          <Play className="w-4 h-4 text-blue-100 drop-shadow-sm" />
        </Button>
      );
    }

    // Expanded mobile mini player - vintage Victrola style replacing header
    return (
      <div 
        className="fixed left-0 right-0 top-16 bg-gradient-to-r from-amber-900 via-amber-800 to-amber-900 backdrop-blur-lg border-b-4 border-amber-600 shadow-2xl z-[105] min-h-[60px] flex items-center px-4 gap-3"
        style={{
          backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(245, 158, 11, 0.2) 0%, transparent 50%), linear-gradient(90deg, rgba(180, 83, 9, 0.1) 0%, rgba(245, 158, 11, 0.1) 50%, rgba(180, 83, 9, 0.1) 100%)',
          boxShadow: 'inset 0 2px 4px rgba(245, 158, 11, 0.2), 0 4px 12px rgba(0, 0, 0, 0.4)'
        }}
        onClick={(e) => e.stopPropagation()} // Prevent auto-hide when clicking player itself
      >
        {currentTrack && (
          <audio
            ref={audioRef}
            src={currentTrack.audio_url}
            preload="metadata"
          />
        )}
        
        {/* Vintage Logo with ornate border */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="p-1 rounded-full bg-gradient-to-br from-amber-600 to-amber-800 border-2 border-amber-500">
            <img 
              src="/lovable-uploads/80d39e41-12f3-4266-8d7a-b1d3621bbf58.png" 
              alt="Spelman College Glee Club" 
              className="w-8 h-8 object-contain drop-shadow-md rounded-full"
              style={{ filter: 'sepia(20%) brightness(1.1)' }}
            />
          </div>
        </div>
        
        {/* Track Info with vintage typography */}
        <div className="flex-1 min-w-0 mx-2">
          <div className="text-sm font-bold text-amber-100 truncate drop-shadow-sm" style={{ fontFamily: 'serif' }}>
            {currentTrack?.title || 'Select Track'}
          </div>
          <div className="text-xs text-amber-200 truncate" style={{ fontFamily: 'serif' }}>
            {currentTrack?.artist || 'No track selected'}
          </div>
          
          {/* Vintage Progress Bar */}
          {currentTrack && duration > 0 && (
            <div className="w-full h-2 bg-amber-950 rounded-full mt-1 border border-amber-700">
              <div 
                className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-300 shadow-inner"
                style={{ width: `${(currentTime / duration) * 100}%` }}
              />
            </div>
          )}
        </div>

        {/* Vintage Controls */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePrevious}
            disabled={!currentTrack}
            className="h-8 w-8 p-0 rounded-full bg-amber-800 hover:bg-amber-700 border border-amber-600 shadow-md"
          >
            <SkipBack className="w-3 h-3 text-amber-100" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handlePlayPause}
            disabled={!currentTrack}
            className="h-10 w-10 p-0 rounded-full bg-gradient-to-br from-amber-600 to-amber-800 hover:from-amber-500 hover:to-amber-700 border-2 border-amber-500 shadow-lg"
            style={{
              boxShadow: 'inset 0 2px 4px rgba(245, 158, 11, 0.3), 0 4px 8px rgba(0, 0, 0, 0.3)'
            }}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 text-amber-100 drop-shadow-sm" />
            ) : (
              <Play className="w-4 h-4 text-amber-100 drop-shadow-sm" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleNext}
            disabled={!currentTrack}
            className="h-8 w-8 p-0 rounded-full bg-amber-800 hover:bg-amber-700 border border-amber-600 shadow-md"
          >
            <SkipForward className="w-3 h-3 text-amber-100" />
          </Button>
        </div>

        {/* Vintage Track Selection */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full bg-amber-800 hover:bg-amber-700 border border-amber-600 shadow-md">
              <Music className="w-3 h-3 text-amber-100" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 max-h-60 overflow-y-auto bg-amber-50 border-2 border-amber-600">
            {tracks.map((track) => (
              <DropdownMenuItem
                key={track.id}
                onClick={() => handleTrackSelect(track)}
                className="flex flex-col items-start hover:bg-amber-100"
              >
                <span className="font-medium text-xs text-amber-900" style={{ fontFamily: 'serif' }}>{track.title}</span>
                <span className="text-xs text-amber-700" style={{ fontFamily: 'serif' }}>{track.artist}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Vintage Close/Minimize Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onToggleExpanded?.(false)}
          className="h-8 w-8 p-0 rounded-full bg-amber-800 hover:bg-amber-700 border border-amber-600 shadow-md"
        >
          <ChevronDown className="w-3 h-3 text-amber-100" />
        </Button>
      </div>
    );
  }

  // Desktop view: Vintage Victrola compact player moved to the right
  return (
    <div className={`relative flex items-center gap-1 bg-gradient-to-br from-amber-800 via-amber-700 to-amber-900 hover:from-amber-700 hover:via-amber-600 hover:to-amber-800 backdrop-blur-md border-2 border-amber-600 hover:border-amber-500 transition-all duration-300 hover:scale-105 shadow-lg rounded-lg px-3 py-1 w-full max-w-[200px] sm:max-w-[280px] md:max-w-[320px] overflow-hidden group ml-4 ${className}`}
      style={{
        backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(245, 158, 11, 0.2) 0%, transparent 50%)',
        boxShadow: 'inset 0 2px 4px rgba(245, 158, 11, 0.2), 0 4px 8px rgba(0, 0, 0, 0.3)'
      }}
    >
      {/* Vintage Animated Background - Only on Hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-amber-600/10 via-amber-500/5 to-amber-600/10 opacity-0 group-hover:opacity-100 group-hover:animate-pulse transition-opacity duration-300"></div>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-400/10 to-transparent opacity-0 group-hover:opacity-100 group-hover:animate-[slide-in-right_3s_ease-in-out_infinite] transition-opacity duration-300"></div>
      
      {/* Content overlay */}
      <div className="relative z-10 flex items-center gap-1 w-full">
      {currentTrack && (
        <audio
          ref={audioRef}
          src={currentTrack.audio_url}
          preload="metadata"
        />
      )}
      
      {/* Vintage Compact Track Info - Hover to open dropdown */}
      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <div 
            className="flex-1 min-w-0 max-w-[140px] sm:max-w-[180px] md:max-w-[220px] cursor-pointer hover:bg-amber-600/20 rounded px-1 py-0.5 transition-colors"
            onMouseEnter={() => setDropdownOpen(true)}
            onMouseLeave={() => setDropdownOpen(false)}
          >
            <div className="overflow-hidden">
              <div className="text-sm font-bold text-amber-100 uppercase tracking-wide truncate drop-shadow-sm" style={{ fontFamily: 'serif' }}>
                ♪ MUSIC PLAYER ♪
              </div>
            </div>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align="start" 
          className="w-56 max-h-80 overflow-y-auto bg-amber-50/95 backdrop-blur-md border-2 border-amber-600 shadow-xl"
          onMouseEnter={() => setDropdownOpen(true)}
          onMouseLeave={() => {
            setDropdownOpen(false);
            setHoveredAlbum(null);
          }}
        >
          {/* Show albums with custom hover flyouts */}
          <div className="px-2 py-1.5 text-[10px] font-semibold text-amber-900 bg-amber-100/50 border-b" style={{ fontFamily: 'serif' }}>
            🎼 Choose Album 🎼
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
                  <span className="font-medium text-amber-900" style={{ fontFamily: 'serif' }}>{album.title}</span>
                  <span className="text-[8px] text-amber-700">{album.tracks?.length || 0} tracks</span>
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

      {/* Vintage Compact Controls */}
      <div className="flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="sm"
          onClick={handlePrevious}
          disabled={!currentTrack}
          className="h-6 w-6 p-0 hover:bg-amber-600/30 rounded-full border border-amber-600"
        >
          <SkipBack className="w-2.5 h-2.5 text-amber-100" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={handlePlayPause}
          disabled={!currentTrack}
          className="h-7 w-7 p-0 hover:bg-amber-600/30 rounded-full border-2 border-amber-500 bg-amber-700"
        >
          {isPlaying ? (
            <Pause className="w-3 h-3 text-amber-100" />
          ) : (
            <Play className="w-3 h-3 text-amber-100" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleNext}
          disabled={!currentTrack}
          className="h-6 w-6 p-0 hover:bg-amber-600/30 rounded-full border border-amber-600"
        >
          <SkipForward className="w-2.5 h-2.5 text-amber-100" />
        </Button>
      </div>


      {/* Vintage Compact Progress indicator */}
      {currentTrack && duration > 0 && (
        <div className="w-8 h-1 bg-amber-950 rounded-full overflow-hidden ml-1 border border-amber-700">
          <div 
            className="h-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-300"
            style={{ width: `${(currentTime / duration) * 100}%` }}
          />
        </div>
      )}
      </div>
    </div>
  );
};