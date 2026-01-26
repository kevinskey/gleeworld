import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Play, Pause, X, ChevronUp } from 'lucide-react';
import { useGlobalAudioPlayer } from '@/hooks/useGlobalAudioPlayer';

interface GlobalMiniPlayerProps {
  onExpand?: () => void;
}

export const GlobalMiniPlayer: React.FC<GlobalMiniPlayerProps> = ({ onExpand }) => {
  const { currentTrack, isPlaying, togglePlay, stop } = useGlobalAudioPlayer();
  const navigate = useNavigate();
  const location = useLocation();

  // Don't show if no track is playing or if we're on the audio page
  if (!currentTrack) {
    return null;
  }

  // Check if we're on an audio page (hide mini player there)
  const isOnAudioPage = location.pathname.includes('/audio');
  if (isOnAudioPage) {
    return null;
  }

  const handleExpand = () => {
    // Navigate to audio page for current course
    const pathParts = location.pathname.split('/');
    const academyIndex = pathParts.findIndex(p => p === 'academy');
    if (academyIndex >= 0 && pathParts[academyIndex + 1]) {
      navigate(`/academy/${pathParts[academyIndex + 1]}/audio`);
    } else if (onExpand) {
      onExpand();
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-slate-900 to-slate-800 border-t border-slate-700 shadow-2xl safe-area-pb">
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Play/Pause Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={togglePlay}
          className="h-10 w-10 rounded-full bg-primary/20 hover:bg-primary/30 text-primary"
        >
          {isPlaying ? (
            <Pause className="h-5 w-5" />
          ) : (
            <Play className="h-5 w-5 ml-0.5" />
          )}
        </Button>

        {/* Track Info - Tappable to expand */}
        <button
          onClick={handleExpand}
          className="flex-1 min-w-0 text-left"
        >
          <p className="text-sm font-medium text-white truncate">
            {currentTrack.title}
          </p>
          {currentTrack.artist && (
            <p className="text-xs text-slate-400 truncate">
              {currentTrack.artist}
            </p>
          )}
        </button>

        {/* Expand Arrow */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleExpand}
          className="h-8 w-8 text-slate-400 hover:text-white"
        >
          <ChevronUp className="h-4 w-4" />
        </Button>

        {/* Close Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={stop}
          className="h-8 w-8 text-slate-400 hover:text-white"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Progress indicator - thin line */}
      <div className="h-1 bg-slate-700">
        <div className="h-full bg-primary w-0 transition-all duration-300" />
      </div>
    </div>
  );
};

export default GlobalMiniPlayer;
