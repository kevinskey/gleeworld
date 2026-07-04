import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { extractYouTubeVideoId } from '@/utils/youtubeUtils';

interface AudioCompanionState {
  isActive: boolean;
  audioSource: 'youtube' | 'file' | 'apple_music' | null;
  youtubeVideoId: string | null;
  isPlaying: boolean;
  isLoading: boolean;
  playerReady: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  audioFileName: string | null;
  playbackRate: number;
  appleMusicNeedsAuth: boolean;
  appleMusicAuthError: string | null;
  appleMusicArtworkUrl: string | null;
}

interface AudioCompanionContextValue extends AudioCompanionState {
  showPlayer: () => void;
  hidePlayer: () => void;
  loadYouTube: (url: string) => void;
  loadFile: (file: File) => void;
  loadUrl: (url: string, fileName?: string) => void;
  loadAppleMusic: (input: { id: string; kind?: 'song' | 'album'; storefront?: string; title?: string; artworkUrl?: string | null }) => Promise<void>;
  authorizeAppleMusic: () => Promise<boolean>;
  togglePlayPause: () => void;
  seek: (time: number) => void;
  setVolume: (vol: number) => void;
  toggleMute: () => void;
  stop: () => void;
  stopPlayback: () => void;
  closeYouTube: () => void;
  setPlaybackRate: (rate: number) => void;
}

// Rates supported by both HTMLAudioElement (pitch-preserving on modern
// browsers) and the YouTube IFrame API.
export const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5] as const;

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
  const [playbackRate, setPlaybackRateState] = useState(1);
  const [appleMusicNeedsAuth, setAppleMusicNeedsAuth] = useState(false);
  const [appleMusicAuthError, setAppleMusicAuthError] = useState<string | null>(null);
  const [appleMusicArtworkUrl, setAppleMusicArtworkUrl] = useState<string | null>(null);
  const appleMusicInstanceRef = useRef<any>(null);
  const appleMusicProgressRef = useRef<number | null>(null);
  // The last track/album the user asked for. loadAppleMusic bails out BEFORE
  // setQueue when the user isn't signed in, so after a successful sign-in we
  // must re-dispatch this — otherwise play() runs against an empty queue and
  // silently does nothing (the "Apple Music never plays" field bug).
  const pendingAppleInputRef = useRef<{
    id: string; kind?: 'song' | 'album'; storefront?: string; title?: string; artworkUrl?: string | null;
  } | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const progressIntervalRef = useRef<number | null>(null);

  // Handle YouTube iframe postMessage events
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Accept both regular and nocookie YouTube origins.
      if (
        event.origin !== 'https://www.youtube.com' &&
        event.origin !== 'https://www.youtube-nocookie.com'
      ) return;
      
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
          }
          // state === 3 (Buffering) intentionally NOT mapped to isLoading —
          // YouTube emits buffering events frequently during normal playback
          // and flipping the play-button icon to a spinner every time made
          // the toolbar flicker. Initial load still shows the spinner via
          // loadYouTube() -> onReady.
        }
        
        if (data.event === 'infoDelivery' && data.info) {
          if (typeof data.info.currentTime === 'number') {
            setCurrentTime(data.info.currentTime);
          }
          if (typeof data.info.duration === 'number') {
            setDuration(data.info.duration);
          }
          // The embed does NOT send discrete onStateChange events unless the
          // full IFrame API JS registers them — with our raw postMessage
          // handshake, play/pause/ended arrive only as infoDelivery.playerState.
          // Without this mapping isPlaying never flips: audio plays but the
          // button stays on ▶ and pause becomes impossible.
          if (typeof data.info.playerState === 'number') {
            const ps = data.info.playerState;
            if (ps === 1) { // Playing
              setIsPlaying(true);
              setIsLoading(false);
            } else if (ps === 2) { // Paused
              setIsPlaying(false);
            } else if (ps === 0) { // Ended
              setIsPlaying(false);
              setCurrentTime(0);
            } else if (ps === -1 || ps === 5) { // Unstarted / cued
              setIsPlaying(false);
            }
            // ps === 3 (buffering) intentionally ignored — see onStateChange
            // note above.
          }
        }
      } catch (e) {
        // Ignore non-JSON messages
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Send command to YouTube iframe. Also re-sends the "listening" handshake
  // every time — the YouTube IFrame JS API ignores commands until that
  // handshake has been received, and iframe.onload doesn't always fire
  // reliably (especially first-render in WKWebView). Cheap to repeat; YouTube
  // de-dupes on its side.
  const sendYouTubeCommand = useCallback((command: string, args?: any) => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    try {
      win.postMessage(JSON.stringify({ event: 'listening' }), 'https://www.youtube.com');
      // Explicitly register for state events. infoDelivery.playerState is the
      // primary signal we consume, but registering costs nothing and restores
      // the discrete onStateChange path where the embed honors it.
      win.postMessage(
        JSON.stringify({ event: 'command', func: 'addEventListener', args: ['onStateChange'] }),
        'https://www.youtube.com',
      );
      win.postMessage(
        JSON.stringify({ event: 'command', func: command, args: args || [] }),
        'https://www.youtube.com',
      );
    } catch { /* iframe might be cross-origin during init — silent retry next click */ }
  }, []);

  // No progress polling. The only consumers of currentTime are the time
  // label + time slider inside the pill, both gated on `hidden xs:flex`.
  // `xs` is not a defined Tailwind breakpoint in this project, so those
  // controls are always hidden — polling YouTube every second just to update
  // invisible state was re-rendering the entire pill on a 1 Hz cadence and
  // producing the visible sub-pixel shimmer the user kept calling "shaking."
  // YouTube still emits onStateChange (Play/Pause/Ended) on its own, which
  // is the only thing the rest of the UI actually reacts to.

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
      // Watchdog: clear the loading spinner after 2s even if iframe.onload
      // never fires (cross-origin timing, ad blocker, React handler attached
      // after load). The play button becomes interactive — actual playback
      // success/failure surfaces via subsequent state events.
      window.setTimeout(() => {
        setIsLoading(false);
        setPlayerReady(true);
      }, 2000);
    }
  }, []);

  const loadFile = useCallback((file: File) => {
    if (file.type.startsWith('audio/')) {
      const url = URL.createObjectURL(file);
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.load();
        // No auto-play. User taps Play to start.
      }
      setAudioSource('file');
      setAudioFileName(file.name);
      setYoutubeVideoId(null);
      setIsPlaying(false);
      setPlayerReady(true);
      setIsLoading(false);
      setIsActive(true);
    }
  }, []);

  // Load audio from a URL (for Supabase stored files)
  const loadUrl = useCallback((url: string, fileName?: string) => {
    if (audioRef.current) {
      audioRef.current.src = url;
      audioRef.current.load();
      // No auto-play. User taps Play to start.
    }
    setAudioSource('file');
    setAudioFileName(fileName || 'Audio');
    setYoutubeVideoId(null);
    setIsPlaying(false);
    setPlayerReady(true);
    setIsLoading(false);
    setIsActive(true);
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
    } else if (audioSource === 'apple_music') {
      const kit = appleMusicInstanceRef.current;
      if (!kit) return;
      (async () => {
        // Subscription / sign-in is enforced on first play. If the user
        // isn't authorized yet, fire the flow once; subsequent plays go
        // straight through.
        if (!kit.musicUserToken) {
          const { authorizeAppleMusic: authFn } = await import('@/lib/musicKit');
          const result = await authFn();
          if (!result.ok) {
            setAppleMusicNeedsAuth(true);
            setAppleMusicAuthError(result.message ?? 'Sign-in failed.');
            return;
          }
          setAppleMusicNeedsAuth(false);
          setAppleMusicAuthError(null);
          // We only land in this branch when the track was picked while
          // signed out — which means loadAppleMusic bailed before setQueue.
          // Queue the pending pick now or play() below is a silent no-op.
          const pending = pendingAppleInputRef.current;
          if (pending) {
            try {
              if (pending.kind === 'album') await kit.setQueue({ album: pending.id });
              else await kit.setQueue({ song: pending.id });
              setPlayerReady(true);
            } catch (err) {
              console.error('[AudioContext] apple music re-queue after auth failed', err);
              return;
            }
          }
        }
        try {
          if (isPlaying) await kit.pause();
          else await kit.play();
        } catch (err) {
          console.error('[AudioContext] apple music play/pause failed', err);
        }
      })();
    }
  }, [audioSource, isPlaying, sendYouTubeCommand]);

  const seek = useCallback((time: number) => {
    if (audioSource === 'youtube') {
      sendYouTubeCommand('seekTo', [time, true]);
      setCurrentTime(time);
    } else if (audioSource === 'file' && audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    } else if (audioSource === 'apple_music' && appleMusicInstanceRef.current) {
      appleMusicInstanceRef.current.seekToTime?.(time);
      setCurrentTime(time);
    }
  }, [audioSource, sendYouTubeCommand]);

  // Stop = pause + rewind, without unloading the audio. YouTube's
  // pauseVideo + seekTo(0) race can result in playback resuming — pause is
  // applied, but the seek then triggers a state transition that auto-resumes
  // from start. Re-send pauseVideo after the seek to defeat that.
  const stopPlayback = useCallback(() => {
    if (audioSource === 'youtube') {
      sendYouTubeCommand('pauseVideo');
      sendYouTubeCommand('seekTo', [0, true]);
      window.setTimeout(() => sendYouTubeCommand('pauseVideo'), 100);
    } else if (audioSource === 'file' && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    } else if (audioSource === 'apple_music' && appleMusicInstanceRef.current) {
      const kit = appleMusicInstanceRef.current;
      (async () => {
        try { await kit.pause(); await kit.seekToTime?.(0); } catch {}
      })();
    }
    setIsPlaying(false);
    setCurrentTime(0);
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
    } else if (audioSource === 'apple_music' && appleMusicInstanceRef.current) {
      appleMusicInstanceRef.current.volume = vol;
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
    } else if (audioSource === 'apple_music' && appleMusicInstanceRef.current) {
      const kit = appleMusicInstanceRef.current;
      (async () => { try { await kit.stop(); } catch {} })();
      if (appleMusicProgressRef.current) {
        window.clearInterval(appleMusicProgressRef.current);
        appleMusicProgressRef.current = null;
      }
    }
    pendingAppleInputRef.current = null;
    setAudioSource(null);
    setYoutubeVideoId(null);
    setAudioFileName(null);
    setAppleMusicArtworkUrl(null);
    setAppleMusicNeedsAuth(false);
    setIsPlaying(false);
    setIsLoading(false);
    setPlayerReady(false);
    setCurrentTime(0);
    setDuration(0);
  }, [audioSource, sendYouTubeCommand]);

  // Apple Music integration. The MusicKit instance is lazily fetched from
  // src/lib/musicKit on first load. Playback uses setQueue + play; we also
  // attach a 500ms progress poller for the seek slider since MusicKit
  // doesn't emit timeupdate events for arbitrary listeners.
  const attachAppleMusicListeners = useCallback((kit: any) => {
    const onPlaybackState = () => {
      const s = kit.player?.playbackState ?? kit.playbackState;
      // MusicKit states: none=0, loading=1, playing=2, paused=3, stopped=4, ended=5
      setIsPlaying(s === 2);
    };
    const onTime = () => {
      const t = kit.player?.currentPlaybackTime ?? kit.currentPlaybackTime ?? 0;
      const d = kit.player?.currentPlaybackDuration ?? kit.currentPlaybackDuration ?? 0;
      if (typeof t === 'number') setCurrentTime(t);
      if (typeof d === 'number') setDuration(d);
    };
    // v3 API uses kit.addEventListener.
    try {
      kit.addEventListener?.('playbackStateDidChange', onPlaybackState);
      kit.addEventListener?.('playbackTimeDidChange', onTime);
    } catch { /* older API noop */ }
    if (appleMusicProgressRef.current) window.clearInterval(appleMusicProgressRef.current);
    appleMusicProgressRef.current = window.setInterval(onTime, 500);
  }, []);

  const loadAppleMusic = useCallback(async (input: { id: string; kind?: 'song' | 'album'; storefront?: string; title?: string; artworkUrl?: string | null }) => {
    pendingAppleInputRef.current = input;
    setIsLoading(true);
    setAppleMusicAuthError(null);

    // Set the UI source immediately so the user sees the artwork + title
    // (and the "Sign in to Apple Music" button if auth ends up being
    // required). Without this, every auth/queue failure leaves audioSource
    // null and nothing visible changes.
    setAudioSource('apple_music');
    setAudioFileName(input.title ?? 'Apple Music');
    setAppleMusicArtworkUrl(input.artworkUrl ?? null);
    setYoutubeVideoId(null);
    setIsPlaying(false);
    setIsActive(true);

    try {
      const { getMusicKit } = await import('@/lib/musicKit');
      const kit = await getMusicKit();
      appleMusicInstanceRef.current = kit;
      attachAppleMusicListeners(kit);

      // If the user isn't signed in, DON'T fire authorize() automatically
      // here — by now we're many async ticks past the user's click and
      // Safari/WKWebView blocks the popup. Surface the explicit "Sign in
      // to Apple Music" button instead; that button calls authorize()
      // synchronously inside its own click handler so the popup works.
      if (!kit.musicUserToken) {
        setAppleMusicNeedsAuth(true);
        setAppleMusicAuthError('Sign in to Apple Music to play this track.');
        setPlayerReady(false);
        return;
      }
      setAppleMusicNeedsAuth(false);

      // Queue a single song or an entire album based on the user's pick.
      if (input.kind === 'album') {
        await kit.setQueue({ album: input.id });
      } else {
        await kit.setQueue({ song: input.id });
      }
      setPlayerReady(true);

      try {
        await kit.play();
        setIsPlaying(true);
      } catch (err) {
        console.warn('[AudioContext] apple music auto-play blocked', err);
      }
    } catch (err: any) {
      console.error('[AudioContext] loadAppleMusic failed', err);
      // Surface the real error to the user. The silent failure mode
      // (only console output) made debugging "Apple Music doesn't work"
      // impossible from the field — users couldn't tell whether the
      // script never loaded, the token endpoint was down, or they
      // simply needed to sign in.
      const msg = err?.message ?? 'Failed to load Apple Music track.';
      toast.error('Apple Music failed', { description: msg });
      setAppleMusicNeedsAuth(true);
      setAppleMusicAuthError(msg);
      setPlayerReady(false);
    } finally {
      setIsLoading(false);
    }
  }, [attachAppleMusicListeners]);

  // Called from the explicit "Sign in to Apple Music" button — this MUST
  // run synchronously inside the button's click so MusicKit's popup
  // doesn't get blocked. Returns true on success.
  const authorizeAppleMusic = useCallback(async () => {
    setAppleMusicAuthError(null);
    try {
      const { authorizeAppleMusic: authFn } = await import('@/lib/musicKit');
      const result = await authFn();
      if (result.ok) {
        setAppleMusicNeedsAuth(false);
        toast.success('Signed in to Apple Music');
        // The track the user originally picked was never queued (loadAppleMusic
        // early-returns before setQueue when unauthenticated). Re-dispatch it
        // now so sign-in flows straight into playback instead of leaving an
        // empty queue behind a live-looking transport.
        const pending = pendingAppleInputRef.current;
        if (pending) void loadAppleMusic(pending);
        return true;
      }
      const msg = result.message ?? 'Sign-in failed.';
      setAppleMusicNeedsAuth(true);
      setAppleMusicAuthError(msg);
      toast.error('Apple Music sign-in failed', { description: msg });
      return false;
    } catch (err: any) {
      const msg = err?.message ?? 'Sign-in failed.';
      setAppleMusicNeedsAuth(true);
      setAppleMusicAuthError(msg);
      toast.error('Apple Music sign-in failed', { description: msg });
      return false;
    }
  }, [loadAppleMusic]);

  // Half-speed practice / 1.5× preview. HTMLAudioElement preserves pitch by
  // default in Chrome/Safari/Firefox; YouTube does its own pitch correction.
  const setPlaybackRate = useCallback((rate: number) => {
    setPlaybackRateState(rate);
    if (audioRef.current) {
      try { (audioRef.current as any).preservesPitch = true; } catch {}
      audioRef.current.playbackRate = rate;
    }
    if (audioSource === 'youtube') {
      sendYouTubeCommand('setPlaybackRate', [rate]);
    }
    if (audioSource === 'apple_music' && appleMusicInstanceRef.current) {
      try { appleMusicInstanceRef.current.playbackRate = rate; } catch {}
    }
  }, [audioSource, sendYouTubeCommand]);

  // Re-apply the current rate when a new source loads so the user's choice
  // persists across track changes (e.g. switching from one MP3 to another).
  useEffect(() => {
    if (audioSource === 'youtube' && playerReady) {
      sendYouTubeCommand('setPlaybackRate', [playbackRate]);
    }
    if (audioSource === 'file' && audioRef.current) {
      try { (audioRef.current as any).preservesPitch = true; } catch {}
      audioRef.current.playbackRate = playbackRate;
    }
  }, [audioSource, playerReady, playbackRate, sendYouTubeCommand]);

  const closeYouTube = useCallback(() => {
    setYoutubeVideoId(null);
    setAudioSource(null);
    setIsPlaying(false);
    setIsLoading(false);
    setPlayerReady(false);
    setCurrentTime(0);
    setDuration(0);
  }, []);

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
        playbackRate,
        appleMusicNeedsAuth,
        appleMusicAuthError,
        appleMusicArtworkUrl,
        showPlayer,
        hidePlayer,
        loadYouTube,
        loadFile,
        loadUrl,
        loadAppleMusic,
        authorizeAppleMusic,
        togglePlayPause,
        seek,
        setVolume,
        toggleMute,
        stop,
        stopPlayback,
        closeYouTube,
        setPlaybackRate,
      }}
    >
      {children}
      
      {/* Hidden YouTube player — kept mounted at NORMAL size (200x113) so the
          iframe JS API actually initializes and emits onReady / infoDelivery
          events (a 1x1 iframe never fires onReady, leaving the play button
          stuck on the loading spinner). Positioned far offscreen so it has
          no visible footprint. Score playback is audio-only by design. */}
      {youtubeVideoId && (
        <div
          data-floating-youtube-player
          style={{
            position: 'fixed',
            left: '-10000px',
            top: '0',
            width: '200px',
            height: '113px',
            pointerEvents: 'none',
            overflow: 'hidden',
          }}
          aria-hidden="true"
        >
          <iframe
            ref={iframeRef}
            src={`https://www.youtube.com/embed/${youtubeVideoId}?enablejsapi=1&autoplay=0&controls=0&modestbranding=1&rel=0&origin=${window.location.origin}`}
            allow="autoplay; encrypted-media"
            onLoad={handleIframeLoad}
            style={{ width: '100%', height: '100%', border: 'none' }}
            title="YouTube Audio Player"
          />
        </div>
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
