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
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const progressIntervalRef = useRef<number | null>(null);

  // Handle YouTube iframe postMessage events
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== 'https://www.youtube.com') return;
      
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        
        if (data.event === 'onReady') {
          console.log('[AudioContext] YouTube iframe ready');
          setPlayerReady(true);
          setIsLoading(false);
        }
        
        if (data.event === 'onStateChange') {
          const state = data.info;
          if (state === 1) { // Playing
            setIsPlaying(true);
            setIsLoading(false);
          } else if (state === 2) { // Paused
            setIsPlaying(false);
          } else if (state === 0) { // Ended
            setIsPlaying(false);
            setCurrentTime(0);
          } else if (state === 3) { // Buffering
            setIsLoading(true);
          }
        }
        
        if (data.event === 'infoDelivery' && data.info) {
          if (typeof data.info.currentTime === 'number') {
            setCurrentTime(data.info.currentTime);
          }
          if (typeof data.info.duration === 'number') {
            setDuration(data.info.duration);
          }
        }
      } catch (e) {
        // Ignore non-JSON messages
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Send command to YouTube iframe
  const sendYouTubeCommand = useCallback((command: string, args?: any) => {
    if (iframeRef.current?.contentWindow) {
      const message = JSON.stringify({
        event: 'command',
        func: command,
        args: args || []
      });
      iframeRef.current.contentWindow.postMessage(message, 'https://www.youtube.com');
    }
  }, []);

  // Progress tracking interval
  useEffect(() => {
    if (audioSource === 'youtube' && isPlaying) {
      // Request current time periodically
      progressIntervalRef.current = window.setInterval(() => {
        sendYouTubeCommand('getCurrentTime');
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
  }, [audioSource, isPlaying, sendYouTubeCommand]);

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
      setIsLoading(true);
      setPlayerReady(false);
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
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
    console.log('[AudioContext] togglePlayPause', { audioSource, isPlaying });
    if (audioSource === 'youtube') {
      if (isPlaying) {
        sendYouTubeCommand('pauseVideo');
      } else {
        sendYouTubeCommand('playVideo');
      }
    } else if (audioSource === 'file' && audioRef.current) {
      if (isPlaying) audioRef.current.pause();
      else audioRef.current.play();
    }
  }, [audioSource, isPlaying, sendYouTubeCommand]);

  const seek = useCallback((time: number) => {
    if (audioSource === 'youtube') {
      sendYouTubeCommand('seekTo', [time, true]);
      setCurrentTime(time);
    } else if (audioSource === 'file' && audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, [audioSource, sendYouTubeCommand]);

  const setVolume = useCallback((vol: number) => {
    setVolumeState(vol);
    setIsMuted(vol === 0);
    if (audioSource === 'youtube') {
      sendYouTubeCommand('setVolume', [vol * 100]);
      if (vol === 0) sendYouTubeCommand('mute');
      else sendYouTubeCommand('unMute');
    } else if (audioSource === 'file' && audioRef.current) {
      audioRef.current.volume = vol;
    }
  }, [audioSource, sendYouTubeCommand]);

  const toggleMute = useCallback(() => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    if (audioSource === 'youtube') {
      if (newMuted) sendYouTubeCommand('mute');
      else sendYouTubeCommand('unMute');
    } else if (audioSource === 'file' && audioRef.current) {
      audioRef.current.muted = newMuted;
    }
  }, [audioSource, isMuted, sendYouTubeCommand]);

  const stop = useCallback(() => {
    if (audioSource === 'youtube') {
      sendYouTubeCommand('stopVideo');
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
  }, [audioSource, sendYouTubeCommand]);

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

  // Handle iframe load
  const handleIframeLoad = useCallback(() => {
    console.log('[AudioContext] YouTube iframe loaded');
    // Enable JS API by sending a listening command
    if (iframeRef.current?.contentWindow) {
      const message = JSON.stringify({ event: 'listening' });
      iframeRef.current.contentWindow.postMessage(message, 'https://www.youtube.com');
    }
    setPlayerReady(true);
    setIsLoading(false);
  }, []);

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
      
      {/* Global YouTube iframe player - hidden */}
      {youtubeVideoId && (
        <iframe
          ref={iframeRef}
          src={`https://www.youtube.com/embed/${youtubeVideoId}?enablejsapi=1&autoplay=1&origin=${window.location.origin}`}
          onLoad={handleIframeLoad}
          allow="autoplay; encrypted-media"
          className="fixed overflow-hidden pointer-events-none"
          style={{ 
            width: '200px',
            height: '150px',
            bottom: '-200px',
            right: '0px',
            zIndex: -9999,
            border: 'none',
          }}
        />
      )}
      
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
