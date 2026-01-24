import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  X, 
  Music,
  Youtube,
  Upload,
  StopCircle,
  Square,
  Loader2,
  MoreVertical
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAudioCompanion } from '@/contexts/AudioCompanionContext';
import { forceUnlockAudio } from '@/utils/mobileAudioUnlock';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AudioCompanionControlsProps {
  onClose?: () => void;
  className?: string;
}

export const AudioCompanionControls: React.FC<AudioCompanionControlsProps> = ({ onClose, className }) => {
  const {
    audioSource,
    isPlaying,
    isLoading,
    playerReady,
    currentTime,
    duration,
    volume,
    isMuted,
    audioFileName,
    loadYouTube,
    loadFile,
    togglePlayPause,
    seek,
    setVolume,
    toggleMute,
    stop,
    hidePlayer,
    closeYouTube,
  } = useAudioCompanion();

  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [showSourcePicker, setShowSourcePicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleYouTubeSubmit = () => {
    if (youtubeUrl) {
      forceUnlockAudio();
      loadYouTube(youtubeUrl);
      setShowSourcePicker(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      forceUnlockAudio();
      loadFile(file);
      setShowSourcePicker(false);
    }
  };

  // Handle play with iOS audio unlock
  const handlePlay = () => {
    forceUnlockAudio();
    togglePlayPause();
  };

  const handleClose = () => {
    // Stop playback and close YouTube when closing the controls
    stop();
    closeYouTube();
    if (onClose) onClose();
    else hidePlayer();
  };

  const stopAndClear = () => {
    stop();
    setYoutubeUrl('');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Mobile-optimized layout with essential controls visible, extras in menu
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

  return (
    <div className={cn(
      "flex items-center gap-1.5 sm:gap-2 bg-card/95 backdrop-blur border border-border px-2 py-1.5 sm:px-3 sm:py-2 shadow-lg rounded-lg z-50",
      className
    )}>
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Music icon / Source picker */}
      <Popover open={showSourcePicker} onOpenChange={setShowSourcePicker}>
        <PopoverTrigger asChild>
          <Button
            size="sm"
            variant="ghost"
            className="h-10 w-10 sm:h-9 sm:w-9 p-0 touch-manipulation"
            title="Select audio source"
            onTouchEnd={(e) => { e.preventDefault(); setShowSourcePicker(true); }}
          >
          {audioSource === 'youtube' ? (
              <Youtube className="h-5 w-5 sm:h-4 sm:w-4 text-red-500" />
            ) : audioSource === 'file' ? (
              <Music className="h-5 w-5 sm:h-4 sm:w-4 text-foreground" />
            ) : (
              <Music className="h-5 w-5 sm:h-4 sm:w-4 text-foreground" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-3" align="start">
          <div className="space-y-3">
            <div className="text-sm font-medium">Select Audio Source</div>
            <div className="flex gap-2">
              <Input
                placeholder="Paste YouTube URL..."
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleYouTubeSubmit()}
                className="flex-1 h-8 text-sm"
              />
              <Button
                size="sm"
                onClick={handleYouTubeSubmit}
                disabled={!youtubeUrl}
                className="h-8 px-2"
              >
                <Youtube className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">or</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="h-7 text-xs"
              >
                <Upload className="h-3 w-3 mr-1" />
                Upload Audio
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Play/Pause - Larger touch target for mobile */}
      <Button
        size="sm"
        variant="ghost"
        onClick={handlePlay}
        onTouchEnd={(e) => { e.preventDefault(); handlePlay(); }}
        onPointerDown={() => forceUnlockAudio()}
        disabled={!audioSource || (audioSource === 'youtube' && !playerReady)}
        className="h-12 w-12 sm:h-10 sm:w-10 p-0 touch-manipulation rounded-full bg-primary/10 hover:bg-primary/20"
        title={isLoading ? "Loading..." : isPlaying ? "Pause" : "Play"}
      >
        {isLoading ? (
          <Loader2 className="h-6 w-6 sm:h-5 sm:w-5 animate-spin text-foreground" />
        ) : isPlaying ? (
          <Pause className="h-6 w-6 sm:h-5 sm:w-5 text-foreground" />
        ) : (
          <Play className="h-6 w-6 sm:h-5 sm:w-5 text-foreground ml-0.5" />
        )}
      </Button>

      {/* Progress - Hidden on very small mobile, shown on larger */}
      {audioSource && (
        <div className="hidden xs:flex items-center gap-1.5 flex-1 min-w-0">
          <span className="text-xs text-muted-foreground w-10 text-right tabular-nums">
            {formatTime(currentTime)}
          </span>
          <Slider
            value={[currentTime]}
            max={duration || 100}
            step={1}
            onValueChange={(value) => seek(value[0])}
            className="w-20 sm:w-32 touch-manipulation"
          />
          <span className="text-xs text-muted-foreground w-10 tabular-nums hidden sm:inline">
            {formatTime(duration)}
          </span>
        </div>
      )}

      {/* Volume - Hidden on mobile, shown on desktop */}
      <div className="hidden sm:flex items-center gap-1">
        <Button
          size="sm"
          variant="ghost"
          onClick={toggleMute}
          onTouchEnd={(e) => { e.preventDefault(); toggleMute(); }}
          className="h-9 w-9 p-0 touch-manipulation"
          title={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted || volume === 0 ? (
            <VolumeX className="h-4 w-4 text-foreground" />
          ) : (
            <Volume2 className="h-4 w-4 text-foreground" />
          )}
        </Button>
        
        <Slider
          value={[isMuted ? 0 : volume]}
          max={1}
          step={0.01}
          onValueChange={(value) => setVolume(value[0])}
          className="w-16 touch-manipulation"
        />
      </div>

      {/* Mobile: More menu with Stop/Clear options */}
      <div className="sm:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="h-10 w-10 p-0 touch-manipulation"
            >
              <MoreVertical className="h-5 w-5 text-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={toggleMute} className="touch-manipulation">
              {isMuted ? <Volume2 className="h-4 w-4 mr-2" /> : <VolumeX className="h-4 w-4 mr-2" />}
              {isMuted ? 'Unmute' : 'Mute'}
            </DropdownMenuItem>
            {audioSource && (
              <>
                <DropdownMenuItem 
                  onClick={() => { if (isPlaying) { togglePlayPause(); seek(0); } }}
                  className="touch-manipulation"
                >
                  <Square className="h-4 w-4 mr-2" />
                  Stop
                </DropdownMenuItem>
                <DropdownMenuItem onClick={stopAndClear} className="touch-manipulation">
                  <StopCircle className="h-4 w-4 mr-2" />
                  Stop & Clear
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Desktop: Stop buttons */}
      <div className="hidden sm:flex items-center gap-1">
        {audioSource && (
          <>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                if (!isPlaying) return;
                togglePlayPause();
                seek(0);
              }}
              className="h-9 w-9 p-0 touch-manipulation"
              title="Stop"
            >
              <Square className="h-4 w-4 text-foreground fill-foreground" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={stopAndClear}
              className="h-9 w-9 p-0 touch-manipulation"
              title="Stop and clear"
            >
              <StopCircle className="h-4 w-4 text-foreground" />
            </Button>
          </>
        )}
      </div>

      {/* Source label - Desktop only */}
      {audioSource === 'youtube' && (
        <span className="text-xs text-red-500 font-medium hidden lg:inline">YouTube</span>
      )}
      {audioSource === 'file' && audioFileName && (
        <span className="text-xs text-muted-foreground truncate max-w-[80px] hidden lg:inline" title={audioFileName}>
          {audioFileName}
        </span>
      )}

      {/* Close */}
      <Button
        size="sm"
        variant="ghost"
        onClick={handleClose}
        onTouchEnd={(e) => { e.preventDefault(); handleClose(); }}
        className="h-10 w-10 sm:h-9 sm:w-9 p-0 touch-manipulation"
        title="Close audio companion"
      >
        <X className="h-5 w-5 sm:h-4 sm:w-4 text-foreground" />
      </Button>
    </div>
  );
};
