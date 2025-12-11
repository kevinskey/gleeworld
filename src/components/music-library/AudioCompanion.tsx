import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  X, 
  Minimize2, 
  Maximize2,
  Music,
  Youtube,
  Upload
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { extractYouTubeVideoId } from '@/utils/youtubeUtils';

interface AudioCompanionProps {
  onClose: () => void;
  className?: string;
}

type AudioSource = 'youtube' | 'file' | null;

export const AudioCompanion: React.FC<AudioCompanionProps> = ({ onClose, className }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [audioSource, setAudioSource] = useState<AudioSource>(null);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem('audioCompanionVolume');
    return saved ? parseFloat(saved) : 0.7;
  });
  const [isMuted, setIsMuted] = useState(false);
  const [audioFileName, setAudioFileName] = useState<string | null>(null);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const youtubePlayerRef = useRef<any>(null);
  const youtubeContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressIntervalRef = useRef<number | null>(null);

  // Load YouTube IFrame API
  useEffect(() => {
    if (audioSource === 'youtube' && youtubeVideoId && !window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }
  }, [audioSource, youtubeVideoId]);

  // Initialize YouTube player
  useEffect(() => {
    if (audioSource !== 'youtube' || !youtubeVideoId) return;

    const initPlayer = () => {
      if (!youtubeContainerRef.current || !window.YT?.Player) return;

      // Destroy existing player
      if (youtubePlayerRef.current) {
        youtubePlayerRef.current.destroy();
      }

      youtubePlayerRef.current = new window.YT.Player(youtubeContainerRef.current, {
        height: '1',
        width: '1',
        videoId: youtubeVideoId,
        playerVars: {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
        },
        events: {
          onReady: (event: any) => {
            event.target.setVolume(volume * 100);
            if (isMuted) event.target.mute();
            setDuration(event.target.getDuration());
            setIsPlaying(true);
          },
          onStateChange: (event: any) => {
            if (event.data === window.YT?.PlayerState?.PLAYING) {
              setIsPlaying(true);
              setDuration(event.target.getDuration());
            } else if (event.data === window.YT?.PlayerState?.PAUSED) {
              setIsPlaying(false);
            } else if (event.data === window.YT?.PlayerState?.ENDED) {
              setIsPlaying(false);
              setCurrentTime(0);
            }
          },
        },
      });
    };

    if (window.YT?.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    return () => {
      if (youtubePlayerRef.current) {
        youtubePlayerRef.current.destroy();
        youtubePlayerRef.current = null;
      }
    };
  }, [audioSource, youtubeVideoId]);

  // Update progress for YouTube
  useEffect(() => {
    if (audioSource === 'youtube' && isPlaying && youtubePlayerRef.current) {
      progressIntervalRef.current = window.setInterval(() => {
        if (youtubePlayerRef.current?.getCurrentTime) {
          setCurrentTime(youtubePlayerRef.current.getCurrentTime());
        }
      }, 500);
    } else {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [audioSource, isPlaying]);

  // Save volume to localStorage
  useEffect(() => {
    localStorage.setItem('audioCompanionVolume', volume.toString());
  }, [volume]);

  const handleYouTubeSubmit = useCallback(() => {
    const videoId = extractYouTubeVideoId(youtubeUrl);
    if (videoId) {
      setYoutubeVideoId(videoId);
      setAudioSource('youtube');
      setAudioFileName(null);
    }
  }, [youtubeUrl]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('audio/')) {
      const url = URL.createObjectURL(file);
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.load();
        audioRef.current.play();
      }
      setAudioSource('file');
      setAudioFileName(file.name);
      setYoutubeVideoId(null);
      setIsPlaying(true);
    }
  }, []);

  const togglePlayPause = useCallback(() => {
    if (audioSource === 'youtube' && youtubePlayerRef.current) {
      if (isPlaying) {
        youtubePlayerRef.current.pauseVideo();
      } else {
        youtubePlayerRef.current.playVideo();
      }
    } else if (audioSource === 'file' && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
    }
  }, [audioSource, isPlaying]);

  const handleSeek = useCallback((value: number[]) => {
    const newTime = value[0];
    if (audioSource === 'youtube' && youtubePlayerRef.current) {
      youtubePlayerRef.current.seekTo(newTime, true);
      setCurrentTime(newTime);
    } else if (audioSource === 'file' && audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  }, [audioSource]);

  const handleVolumeChange = useCallback((value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
    
    if (audioSource === 'youtube' && youtubePlayerRef.current) {
      youtubePlayerRef.current.setVolume(newVolume * 100);
      if (newVolume === 0) {
        youtubePlayerRef.current.mute();
      } else {
        youtubePlayerRef.current.unMute();
      }
    } else if (audioSource === 'file' && audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  }, [audioSource]);

  const toggleMute = useCallback(() => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    
    if (audioSource === 'youtube' && youtubePlayerRef.current) {
      if (newMuted) {
        youtubePlayerRef.current.mute();
      } else {
        youtubePlayerRef.current.unMute();
      }
    } else if (audioSource === 'file' && audioRef.current) {
      audioRef.current.muted = newMuted;
    }
  }, [audioSource, isMuted]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAudioTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleAudioLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleAudioPlay = () => setIsPlaying(true);
  const handleAudioPause = () => setIsPlaying(false);

  const currentTitle = audioSource === 'youtube' 
    ? 'YouTube Audio' 
    : audioFileName || 'No audio selected';

  return (
    <div className={cn(
      "fixed bottom-16 left-1/2 -translate-x-1/2 z-40 bg-card/95 backdrop-blur border border-border shadow-lg transition-all duration-200",
      isExpanded ? "w-[90%] max-w-md p-3" : "w-auto px-3 py-2",
      className
    )}>
      {/* Hidden elements */}
      <div ref={youtubeContainerRef} className="hidden" />
      <audio
        ref={audioRef}
        onTimeUpdate={handleAudioTimeUpdate}
        onLoadedMetadata={handleAudioLoadedMetadata}
        onEnded={handleAudioEnded}
        onPlay={handleAudioPlay}
        onPause={handleAudioPause}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Collapsed view */}
      {!isExpanded && (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={togglePlayPause}
            disabled={!audioSource}
            className="h-7 w-7 p-0"
          >
            {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </Button>
          <div className="flex items-center gap-1.5 text-xs">
            <Music className="h-3 w-3 text-muted-foreground" />
            <span className="max-w-[120px] truncate">{currentTitle}</span>
            {audioSource && <span className="text-muted-foreground">{formatTime(currentTime)}</span>}
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsExpanded(true)}
            className="h-7 w-7 p-0 ml-auto"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onClose}
            className="h-7 w-7 p-0"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Expanded view */}
      {isExpanded && (
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Music className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Listen Along</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsExpanded(false)}
                className="h-7 w-7 p-0"
              >
                <Minimize2 className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={onClose}
                className="h-7 w-7 p-0"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Source selection */}
          {!audioSource && (
            <div className="space-y-2">
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
                  className="h-8"
                >
                  <Youtube className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>or</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-7 text-xs"
                >
                  <Upload className="h-3 w-3 mr-1" />
                  Upload Audio File
                </Button>
              </div>
            </div>
          )}

          {/* Now playing */}
          {audioSource && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {audioSource === 'youtube' ? (
                  <Youtube className="h-4 w-4 text-red-500" />
                ) : (
                  <Music className="h-4 w-4 text-primary" />
                )}
                <span className="text-sm truncate flex-1">{currentTitle}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setAudioSource(null);
                    setYoutubeVideoId(null);
                    setYoutubeUrl('');
                    setAudioFileName(null);
                    setIsPlaying(false);
                    setCurrentTime(0);
                    setDuration(0);
                  }}
                  className="h-6 text-xs px-2"
                >
                  Change
                </Button>
              </div>

              {/* Progress */}
              <div className="space-y-1">
                <Slider
                  value={[currentTime]}
                  min={0}
                  max={duration || 100}
                  step={1}
                  onValueChange={handleSeek}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={togglePlayPause}
                  className="h-8 w-8 p-0"
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={toggleMute}
                  className="h-8 w-8 p-0"
                >
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </Button>
                
                <Slider
                  value={[isMuted ? 0 : volume]}
                  min={0}
                  max={1}
                  step={0.01}
                  onValueChange={handleVolumeChange}
                  className="w-20"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AudioCompanion;
