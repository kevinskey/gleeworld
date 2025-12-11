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
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAudioCompanion } from '@/contexts/AudioCompanionContext';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

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
  } = useAudioCompanion();

  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [showSourcePicker, setShowSourcePicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleYouTubeSubmit = () => {
    if (youtubeUrl) {
      loadYouTube(youtubeUrl);
      setShowSourcePicker(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      loadFile(file);
      setShowSourcePicker(false);
    }
  };

  const handleClose = () => {
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

  return (
    <div className={cn("flex items-center gap-1.5 bg-card/95 backdrop-blur border border-border p-1 shadow-lg rounded-md", className)}>
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
            className="h-8 w-8 p-0"
            title="Select audio source"
          >
          {audioSource === 'youtube' ? (
              <Youtube className="h-4 w-4 text-red-500" />
            ) : audioSource === 'file' ? (
              <Music className="h-4 w-4 text-primary-foreground" />
            ) : (
              <Music className="h-4 w-4 text-primary-foreground" />
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

      {/* Play/Pause */}
      <Button
        size="sm"
        variant="ghost"
        onClick={togglePlayPause}
        disabled={!audioSource || (audioSource === 'youtube' && !playerReady)}
        className="h-8 w-8 p-0"
        title={isLoading ? "Loading..." : isPlaying ? "Pause" : "Play"}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-primary-foreground" />
        ) : isPlaying ? (
          <Pause className="h-4 w-4 text-primary-foreground" />
        ) : (
          <Play className="h-4 w-4 text-primary-foreground" />
        )}
      </Button>

      {/* Progress */}
      {audioSource && (
        <>
          <span className="text-xs text-muted-foreground w-10 text-right tabular-nums">
            {formatTime(currentTime)}
          </span>
          <Slider
            value={[currentTime]}
            max={duration || 100}
            step={1}
            onValueChange={(value) => seek(value[0])}
            className="w-24"
          />
          <span className="text-xs text-muted-foreground w-10 tabular-nums">
            {formatTime(duration)}
          </span>
        </>
      )}

      {/* Volume */}
      <Button
        size="sm"
        variant="ghost"
        onClick={toggleMute}
        className="h-8 w-8 p-0"
        title={isMuted ? "Unmute" : "Mute"}
      >
        {isMuted || volume === 0 ? (
          <VolumeX className="h-4 w-4 text-primary-foreground" />
        ) : (
          <Volume2 className="h-4 w-4 text-primary-foreground" />
        )}
      </Button>
      
      <Slider
        value={[isMuted ? 0 : volume]}
        max={1}
        step={0.01}
        onValueChange={(value) => setVolume(value[0])}
        className="w-16"
      />

      {/* Stop */}
      {audioSource && (
        <Button
          size="sm"
          variant="ghost"
          onClick={stopAndClear}
          className="h-8 w-8 p-0"
          title="Stop and clear"
        >
          <StopCircle className="h-4 w-4 text-primary-foreground" />
        </Button>
      )}

      {/* Source label */}
      {audioSource === 'youtube' && (
        <span className="text-xs text-red-500 font-medium hidden sm:inline">YouTube</span>
      )}
      {audioSource === 'file' && audioFileName && (
        <span className="text-xs text-muted-foreground truncate max-w-[80px] hidden sm:inline" title={audioFileName}>
          {audioFileName}
        </span>
      )}

      {/* Close */}
      <Button
        size="sm"
        variant="ghost"
        onClick={handleClose}
        className="h-8 w-8 p-0"
        title="Close audio companion"
      >
        <X className="h-4 w-4 text-primary-foreground" />
      </Button>
    </div>
  );
};
