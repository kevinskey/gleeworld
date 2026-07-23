import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { X, ExternalLink, AlertTriangle, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  extractYouTubePlaylistId,
  getYouTubePlaylistEmbedUrl,
  getYouTubeWatchUrl
} from '@/utils/youtubeUtils';
import { parseVideoSource, providerLabel } from '@/lib/videoSources';

// Default gain the modal starts YouTube at when the user has no prior
// preference. 50 keeps autoplayed embeds out of "peel-the-paint" territory
// without being inaudible; the user's chosen level then persists.
const DEFAULT_YOUTUBE_VOLUME = 50;
const VOLUME_STORAGE_KEY = 'gw-youtube-volume';
const MUTED_STORAGE_KEY = 'gw-youtube-muted';

// Nudge YouTube's embedded player via the IFrame API's postMessage
// protocol. Requires `enablejsapi=1` in the embed URL (we set it in
// getEmbedSrc). Wrapped for readability — the raw shape is stable and
// documented as the "cross-window messaging" fallback for callers that
// don't want to load YouTube's iframe_api.js script.
function ytCommand(iframe: HTMLIFrameElement | null, func: string, args: unknown[] = []) {
  if (!iframe?.contentWindow) return;
  try {
    iframe.contentWindow.postMessage(
      JSON.stringify({ event: 'command', func, args }),
      '*',
    );
  } catch { /* cross-origin postMessage never throws in browsers, but be safe */ }
}

interface YouTubeVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoId: string;
  title?: string;
  url?: string; // Original URL for playlist detection or non-YouTube playback
  playlistId?: string; // Direct playlist ID
}

export const YouTubeVideoModal = ({ isOpen, onClose, videoId, title, url, playlistId: directPlaylistId }: YouTubeVideoModalProps) => {
  const [hasError, setHasError] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [playerReady, setPlayerReady] = useState(false);
  // Hydrate volume/muted synchronously from localStorage so the slider's
  // first paint matches what the user last set — avoids a jarring "50 →
  // their-value" jump when it applies mid-play. Falls back to DEFAULT on
  // parse failure / SSR / private mode.
  const [volume, setVolume] = useState<number>(() => {
    if (typeof window === 'undefined') return DEFAULT_YOUTUBE_VOLUME;
    try {
      const raw = window.localStorage.getItem(VOLUME_STORAGE_KEY);
      const n = raw === null ? DEFAULT_YOUTUBE_VOLUME : Number(raw);
      return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : DEFAULT_YOUTUBE_VOLUME;
    } catch { return DEFAULT_YOUTUBE_VOLUME; }
  });
  const [muted, setMuted] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try { return window.localStorage.getItem(MUTED_STORAGE_KEY) === '1'; } catch { return false; }
  });

  // Whenever volume / mute state changes AND the player is up, push it to
  // YouTube. Also runs once when playerReady flips true, so opening a
  // second video reapplies the user's last setting automatically.
  useEffect(() => {
    if (!playerReady) return;
    ytCommand(iframeRef.current, 'setVolume', [volume]);
    ytCommand(iframeRef.current, muted ? 'mute' : 'unMute');
  }, [playerReady, volume, muted]);

  // Reset the ready-flag every time the modal closes, so the next open
  // (which mounts a fresh iframe) waits for its own onLoad + tick before
  // firing commands into a stale content window.
  useEffect(() => {
    if (!isOpen) setPlayerReady(false);
  }, [isOpen]);

  const persistVolume = useCallback((v: number) => {
    setVolume(v);
    try { window.localStorage.setItem(VOLUME_STORAGE_KEY, String(v)); } catch { /* private mode */ }
  }, []);
  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      try { window.localStorage.setItem(MUTED_STORAGE_KEY, next ? '1' : '0'); } catch { /* private mode */ }
      return next;
    });
  }, []);

  // Multi-provider routing: if `url` is a non-YouTube provider we know
  // how to embed, play it here instead of pretending it's YouTube. Falls
  // through to the original YouTube branch when `url` is a YT link or
  // absent (older callers only pass videoId).
  const parsed = url ? parseVideoSource(url) : null;
  const isNonYouTube = parsed && parsed.provider !== 'youtube';

  // Check if this is a playlist - use direct playlistId or extract from URL
  const playlistId = directPlaylistId || (url ? extractYouTubePlaylistId(url) : null);
  const isPlaylist = !!playlistId;

  // Determine embed URL. `enablejsapi=1` lets us postMessage setVolume once
  // the player is ready (see the iframe onLoad below) — without it, YouTube
  // ignores the volume command and every video blasts at 100%.
  const getEmbedSrc = () => {
    if (isNonYouTube && parsed?.embedUrl) return parsed.embedUrl;
    if (isPlaylist && playlistId && !videoId) {
      return getYouTubePlaylistEmbedUrl(playlistId, true);
    }
    if (videoId && playlistId) {
      return `https://www.youtube.com/embed/${videoId}?list=${playlistId}&autoplay=1&rel=0&modestbranding=1&playsinline=1&enablejsapi=1`;
    }
    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1&enablejsapi=1`;
    }
    return null;
  };

  const embedSrc = getEmbedSrc();
  const watchUrl = isNonYouTube
    ? parsed!.canonicalUrl
    : videoId
      ? getYouTubeWatchUrl(videoId) + (playlistId ? `&list=${playlistId}` : '')
      : url || `https://www.youtube.com/playlist?list=${playlistId}`;
  const openLabel = isNonYouTube ? `Open on ${providerLabel(parsed!.provider)}` : 'Open on YouTube';

  // For direct file URLs we render a real <video> element instead of an
  // iframe — no third-party host to embed, and the browser handles seek
  // / play controls natively.
  const isDirect = parsed?.provider === 'direct' && !!parsed.embedUrl;

  if (!videoId && !playlistId && !parsed) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { onClose(); setHasError(false); } }}>
      <DialogContent 
        className="max-w-6xl w-[95vw] sm:w-[90vw] md:w-[85vw] lg:w-[80vw] p-0 bg-black border-none shadow-2xl rounded-xl overflow-hidden"
        onPointerDownOutside={onClose}
        onEscapeKeyDown={onClose}
      >
        <VisuallyHidden>
          <DialogTitle>{title || 'Video Player'}</DialogTitle>
        </VisuallyHidden>
        <div className="flex flex-col">
          {/* Header strip lifted OUT of the video area — the previous
              absolute-positioned X sat exactly where YouTube's hover controls
              (settings gear, fullscreen) render, so they visibly overlapped
              and the wrong button caught taps. Putting title + close in a
              dedicated bar above the iframe eliminates the collision. */}
          <div className="bg-black text-white flex items-center gap-2 sm:gap-3 px-3 py-2 sm:px-4 sm:py-2.5 border-b border-white/10">
            <h3 className="text-sm sm:text-base font-medium truncate flex-1 min-w-0">
              {title || 'Video'}
            </h3>
            {/* Volume control — we own this, YouTube's embed volume is
                inconsistent across browsers/devices and hard to reach with
                one hand on mobile. Mute is a real mute (not gain=0) so
                unmuting restores the level rather than starting at 0. */}
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/10 h-9 w-9"
                onClick={toggleMute}
                aria-label={muted ? 'Unmute' : 'Mute'}
                title={muted ? 'Unmute' : 'Mute'}
              >
                {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </Button>
              <Slider
                value={[muted ? 0 : volume]}
                min={0}
                max={100}
                step={1}
                onValueChange={([next]) => {
                  const clamped = Math.max(0, Math.min(100, next ?? 0));
                  persistVolume(clamped);
                  // Dragging the slider off zero implicitly unmutes — matches
                  // every media player convention. Reverse is NOT symmetric:
                  // dragging to 0 leaves mute state alone, so the user can
                  // still hard-mute vs. just-low.
                  if (muted && clamped > 0) toggleMute();
                }}
                className="w-24 sm:w-32"
                aria-label="Volume"
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10 h-9 w-9 shrink-0"
              onClick={onClose}
              aria-label="Close video"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Error state with fallback link out */}
          {hasError ? (
            <div className="aspect-video w-full flex flex-col items-center justify-center bg-gray-900 p-6 text-center">
              <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
              <h3 className="text-white text-lg font-medium mb-2">Video Cannot Be Embedded</h3>
              <p className="text-gray-400 mb-4 max-w-md">
                This video has embedding restrictions. Click below to watch it directly.
              </p>
              <Button
                onClick={() => window.open(watchUrl, '_blank')}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                {openLabel}
              </Button>
            </div>
          ) : (
            /* Responsive video container */
            <div className="aspect-video w-full">
              {isDirect ? (
                <video
                  src={parsed!.embedUrl!}
                  title={title || 'Video'}
                  controls
                  playsInline
                  autoPlay
                  className="w-full h-full bg-black"
                  onError={() => setHasError(true)}
                />
              ) : embedSrc ? (
                <iframe
                  ref={iframeRef}
                  src={embedSrc}
                  title={title || 'Video'}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="w-full h-full"
                  style={{ border: 'none' }}
                  onLoad={() => {
                    // The player needs a beat after iframe onLoad before it
                    // registers its postMessage listener; flipping playerReady
                    // triggers the useEffect that pushes the user's saved
                    // volume/mute state through.
                    setTimeout(() => setPlayerReady(true), 300);
                  }}
                  onError={() => setHasError(true)}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900 p-6 text-center">
                  <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
                  <h3 className="text-white text-lg font-medium mb-2">Unable to Embed</h3>
                  <Button
                    onClick={() => window.open(watchUrl, '_blank')}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    {openLabel}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Bottom action row for the external-link fallback. Moved out of
              absolute-positioning too — floating over YouTube's bottom
              control bar (play, seek, volume, CC) obscures the very
              controls we now want the user to reach freely. */}
          <div className="bg-black flex items-center justify-end px-3 py-2 border-t border-white/10">
            <Button
              variant="ghost"
              size="sm"
              className="text-white/80 hover:text-white hover:bg-white/10"
              onClick={() => window.open(watchUrl, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-1.5" />
              {openLabel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default YouTubeVideoModal;
