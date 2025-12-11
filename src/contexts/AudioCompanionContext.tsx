import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { extractYouTubeVideoId } from '@/utils/youtubeUtils';

interface AudioCompanionState {
  isActive: boolean;
  audioSource: 'youtube' | 'file' | null;
  youtubeVideoId: string | null;
  isPlaying: boolean;
  isLoading: boolean;
  playerReady: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  audioFileName: string | null;
}

interface AudioCompanionContextValue extends AudioCompanionState {
  showPlayer: () => void;
  hidePlayer: () => void;
  loadYouTube: (url: string) => void;
  loadFile: (file: File) => void;
  togglePlayPause: () => void;
  seek: (time: number) => void;
  setVolume: (vol: number) => void;
  toggleMute: () => void;
  stop: () => void;
}

const AudioCompanionContext = createContext<AudioCompanionContextValue | null>(null);

export const useAudioCompanion = () => {
  const ctx = useContext(AudioCompanionContext);
  if (!ctx) throw new Error('useAudioCompanion must be used within AudioCompanionProvider');
  return ctx;
};

export const AudioCompanionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isActive, setIsActive] = useState(false);
  const [audioSource, setAudioSource] = useState<'youtube' | 'file' | null>(null);
  const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(() => {
    const saved = localStorage.getItem('audioCompanionVolume');
    return saved ? parseFloat(saved) : 0.7;
  });
  const [isMuted, setIsMuted] = useState(false);
  const [audioFileName, setAudioFileName] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const youtubePlayerRef = useRef<any>(null);
  const youtubeContainerRef = useRef<HTMLDivElement | null>(null);
  const progressIntervalRef = useRef<number | null>(null);

  // Load YouTube IFrame API once
  useEffect(() => {
    // Check if API already fully ready
    if (typeof window.YT !== 'undefined' && typeof window.YT.Player === 'function') {
      console.log('[AudioContext] YouTube API already fully loaded');
      return;
    }
    
    const existingScript = document.querySelector('script[src*="youtube.com/iframe_api"]');
    if (!existingScript) {
      console.log('[AudioContext] Loading YouTube IFrame API');
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.async = true;
      document.head.appendChild(tag);
    } else {
      console.log('[AudioContext] YouTube script already exists, API ready:', typeof window.YT?.Player);
    }
    
    // Setup the callback for when API is ready (if not already fired)
    if (!window.onYouTubeIframeAPIReady || typeof window.YT?.Player !== 'function') {
      const originalCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        console.log('[AudioContext] onYouTubeIframeAPIReady fired!');
        originalCallback?.();
      };
    }
  }, []);

  // Initialize YouTube player when videoId changes
  useEffect(() => {
    if (audioSource !== 'youtube' || !youtubeVideoId) return;

    console.log('[AudioContext] Initializing for video:', youtubeVideoId);
    
    let mounted = true;
    let pollInterval: number | null = null;
    
    setIsLoading(true);
    setPlayerReady(false);

    const initPlayer = () => {
      if (!mounted) {
        console.log('[AudioContext] Not mounted, skipping init');
        return;
      }
      if (!youtubeContainerRef.current) {
        console.error('[AudioContext] Container ref not available');
        return;
      }

      console.log('[AudioContext] Creating YouTube player');

      if (youtubePlayerRef.current) {
        try { youtubePlayerRef.current.destroy(); } catch (e) {}
        youtubePlayerRef.current = null;
      }

      const container = youtubeContainerRef.current;
      container.innerHTML = '';
      const playerDiv = document.createElement('div');
      playerDiv.id = 'yt-audio-global-' + Date.now();
      container.appendChild(playerDiv);

      youtubePlayerRef.current = new window.YT.Player(playerDiv, {
        height: '150',
        width: '200',
        videoId: youtubeVideoId,
        playerVars: {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: (event: any) => {
            console.log('[AudioContext] Player ready');
            if (!mounted) return;
            setIsLoading(false);
            setPlayerReady(true);
            event.target.setVolume(volume * 100);
            if (isMuted) event.target.mute();
            setDuration(event.target.getDuration() || 0);
            try { event.target.playVideo(); } catch (e) {
              console.log('[AudioContext] Autoplay blocked:', e);
            }
          },
          onStateChange: (event: any) => {
            console.log('[AudioContext] State change:', event.data);
            if (!mounted) return;
            if (event.data === window.YT?.PlayerState?.PLAYING) {
              setIsPlaying(true);
              setIsLoading(false);
              setDuration(event.target.getDuration() || 0);
            } else if (event.data === window.YT?.PlayerState?.PAUSED) {
              setIsPlaying(false);
            } else if (event.data === window.YT?.PlayerState?.ENDED) {
              setIsPlaying(false);
              setCurrentTime(0);
            } else if (event.data === window.YT?.PlayerState?.BUFFERING) {
              setIsLoading(true);
            }
          },
          onError: (event: any) => {
            console.error('[AudioContext] Player error:', event.data);
            if (!mounted) return;
            setIsLoading(false);
          }
        },
      });
    };

    const tryInit = () => {
      const ytExists = typeof window.YT !== 'undefined';
      const playerExists = ytExists && typeof window.YT.Player === 'function';
      console.log('[AudioContext] tryInit - YT exists:', ytExists, 'Player exists:', playerExists);
      
      if (playerExists) {
        console.log('[AudioContext] YT API ready, initializing');
        if (pollInterval) clearInterval(pollInterval);
        setTimeout(initPlayer, 100);
        return true;
      }
      return false;
    };

    if (!tryInit()) {
      console.log('[AudioContext] Starting poll for YT API');
      let attempts = 0;
      pollInterval = window.setInterval(() => {
        attempts++;
        if (tryInit() || attempts > 100) {
          if (pollInterval) clearInterval(pollInterval);
          if (attempts > 100) {
            console.error('[AudioContext] YT API timeout after 100 attempts, trying anyway...');
            // Try to init anyway - maybe Player exists now
            setTimeout(() => {
              if (typeof window.YT?.Player === 'function') {
                initPlayer();
              } else {
                setIsLoading(false);
              }
            }, 500);
          }
        }
      }, 100);
    }

    return () => {
      mounted = false;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [audioSource, youtubeVideoId]);

  // Progress tracking for YouTube
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
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [audioSource, isPlaying]);

  // Save volume
  useEffect(() => {
    localStorage.setItem('audioCompanionVolume', volume.toString());
  }, [volume]);

  const showPlayer = useCallback(() => setIsActive(true), []);
  const hidePlayer = useCallback(() => setIsActive(false), []);

  const loadYouTube = useCallback((url: string) => {
    console.log('[AudioContext] loadYouTube called with:', url);
    const videoId = extractYouTubeVideoId(url);
    console.log('[AudioContext] Extracted videoId:', videoId);
    if (videoId) {
      setYoutubeVideoId(videoId);
      setAudioSource('youtube');
      setAudioFileName(null);
      setIsActive(true);
    }
  }, []);

  const loadFile = useCallback((file: File) => {
    if (file.type.startsWith('audio/')) {
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
      setPlayerReady(true);
      setIsLoading(false);
      setIsActive(true);
    }
  }, []);

  const togglePlayPause = useCallback(() => {
    console.log('[AudioContext] togglePlayPause', { audioSource, isPlaying, hasPlayer: !!youtubePlayerRef.current });
    if (audioSource === 'youtube' && youtubePlayerRef.current) {
      try {
        if (isPlaying) {
          console.log('[AudioContext] Pausing YouTube');
          youtubePlayerRef.current.pauseVideo();
        } else {
          console.log('[AudioContext] Playing YouTube');
          youtubePlayerRef.current.playVideo();
        }
      } catch (e) {
        console.error('[AudioContext] togglePlayPause error:', e);
      }
    } else if (audioSource === 'file' && audioRef.current) {
      if (isPlaying) audioRef.current.pause();
      else audioRef.current.play();
    }
  }, [audioSource, isPlaying]);

  const seek = useCallback((time: number) => {
    if (audioSource === 'youtube' && youtubePlayerRef.current) {
      youtubePlayerRef.current.seekTo(time, true);
      setCurrentTime(time);
    } else if (audioSource === 'file' && audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, [audioSource]);

  const setVolume = useCallback((vol: number) => {
    setVolumeState(vol);
    setIsMuted(vol === 0);
    if (audioSource === 'youtube' && youtubePlayerRef.current) {
      youtubePlayerRef.current.setVolume(vol * 100);
      if (vol === 0) youtubePlayerRef.current.mute();
      else youtubePlayerRef.current.unMute();
    } else if (audioSource === 'file' && audioRef.current) {
      audioRef.current.volume = vol;
    }
  }, [audioSource]);

  const toggleMute = useCallback(() => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    if (audioSource === 'youtube' && youtubePlayerRef.current) {
      if (newMuted) youtubePlayerRef.current.mute();
      else youtubePlayerRef.current.unMute();
    } else if (audioSource === 'file' && audioRef.current) {
      audioRef.current.muted = newMuted;
    }
  }, [audioSource, isMuted]);

  const stop = useCallback(() => {
    if (audioSource === 'youtube' && youtubePlayerRef.current) {
      youtubePlayerRef.current.stopVideo();
    } else if (audioSource === 'file' && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setAudioSource(null);
    setYoutubeVideoId(null);
    setAudioFileName(null);
    setIsPlaying(false);
    setIsLoading(false);
    setPlayerReady(false);
    setCurrentTime(0);
    setDuration(0);
  }, [audioSource]);

  const handleAudioTimeUpdate = () => {
    if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
  };
  const handleAudioLoadedMetadata = () => {
    if (audioRef.current) setDuration(audioRef.current.duration);
  };
  const handleAudioEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };
  const handleAudioPlay = () => setIsPlaying(true);
  const handleAudioPause = () => setIsPlaying(false);

  return (
    <AudioCompanionContext.Provider
      value={{
        isActive,
        audioSource,
        youtubeVideoId,
        isPlaying,
        isLoading,
        playerReady,
        currentTime,
        duration,
        volume,
        isMuted,
        audioFileName,
        showPlayer,
        hidePlayer,
        loadYouTube,
        loadFile,
        togglePlayPause,
        seek,
        setVolume,
        toggleMute,
        stop,
      }}
    >
      {children}
      
      {/* Global hidden YouTube player */}
      <div 
        ref={youtubeContainerRef}
        className="fixed overflow-hidden pointer-events-none"
        style={{ 
          width: '200px',
          height: '150px',
          bottom: '-200px',
          right: '0px',
          zIndex: -9999,
        }}
      />
      
      {/* Global hidden audio element */}
      <audio
        ref={audioRef}
        onTimeUpdate={handleAudioTimeUpdate}
        onLoadedMetadata={handleAudioLoadedMetadata}
        onEnded={handleAudioEnded}
        onPlay={handleAudioPlay}
        onPause={handleAudioPause}
        className="hidden"
      />
    </AudioCompanionContext.Provider>
  );
};
