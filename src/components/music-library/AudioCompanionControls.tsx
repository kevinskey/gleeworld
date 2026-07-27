import React, { useEffect, useRef, useState } from 'react';
import { searchAppleMusic, type AppleMusicSongHit, type AppleMusicAlbumHit } from '@/lib/musicKit';
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
  Square,
  Loader2,
  MoreVertical
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAudioCompanion, PLAYBACK_RATES } from '@/contexts/AudioCompanionContext';
import { useSheetMusicTracks, type AudioTrack } from '@/hooks/useSheetMusicTracks';
import { Check, ChevronDown } from 'lucide-react';
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
  /** When provided, the pill shows a track-switcher icon listing every
   *  audio track bound to this score so a performer can swap between
   *  Rehearsal / Accompaniment / Reference without leaving the viewer. */
  musicId?: string;
}

export const AudioCompanionControls: React.FC<AudioCompanionControlsProps> = ({ onClose, className, musicId }) => {
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
    loadUrl,
    togglePlayPause,
    seek,
    setVolume,
    toggleMute,
    stop,
    stopPlayback,
    hidePlayer,
    closeYouTube,
    playbackRate,
    setPlaybackRate,
    appleMusicNeedsAuth,
    appleMusicAuthError,
    authorizeAppleMusic,
    appleMusicArtworkUrl,
    loadAppleMusic,
  } = useAudioCompanion();

  // Tracks bound to this score. Only render the switcher when there are
  // 2+ so single-binding scores keep the simple icon.
  const { tracks } = useSheetMusicTracks(musicId);

  // Dispatch a track. Keeps the audio companion context as the only place
  // that actually mutates playback state.
  const playTrack = async (t: AudioTrack) => {
    forceUnlockAudio();
    if (t.kind === 'apple_music' && t.apple_music_id) {
      await loadAppleMusic({
        id: t.apple_music_id,
        storefront: t.apple_music_storefront ?? 'us',
        title: t.apple_music_title ?? t.label ?? 'Apple Music',
        artworkUrl: t.apple_music_artwork_url ?? null,
      });
    } else if (t.audio_url) {
      const url = t.audio_url;
      if (url.includes('youtube.com') || url.includes('youtu.be')) loadYouTube(url);
      else loadUrl(url, t.audio_title || t.label || 'Audio');
    }
  };

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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Mobile-optimized layout with essential controls visible, extras in menu
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

  return (
    <div className={cn(
      // Auto-sized to content. The earlier 560px lock was added to defeat
      // the per-second polling re-render shimmer; that poll is gone, so the
      // pill width is naturally stable and the lock was just crowding the
      // page-nav + palette buttons off the right side of the toolbar.
      "flex items-center gap-1.5 sm:gap-2 bg-card border border-border px-2 py-1.5 sm:px-3 sm:py-2 shadow-lg rounded-lg z-50",
      className
    )}>
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      <Popover open={showSourcePicker} onOpenChange={setShowSourcePicker}>
        <PopoverTrigger asChild>
          <Button
            size="sm"
            variant="ghost"
            className="h-5 w-5 p-0 touch-manipulation"
            title="Select audio source"
            onTouchEnd={(e) => { e.preventDefault(); setShowSourcePicker(true); }}
          >
          {audioSource === 'youtube' ? (
              <Youtube className="h-3 w-3 text-red-500" />
            ) : audioSource === 'apple_music' ? (
              appleMusicArtworkUrl
                ? <img src={appleMusicArtworkUrl} alt="" className="h-4 w-4 rounded" />
                : <Music className="h-3 w-3 text-pink-500" />
            ) : audioSource === 'file' ? (
              <Music className="h-3 w-3 text-foreground" />
            ) : (
              <Music className="h-3 w-3 text-foreground" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[92vw] max-w-md p-3" align="start">
          <AudioSourcePickerBody
            youtubeUrl={youtubeUrl}
            setYoutubeUrl={setYoutubeUrl}
            onYouTubeSubmit={handleYouTubeSubmit}
            onUploadClick={() => fileInputRef.current?.click()}
            onPickAppleMusicSong={async (hit) => {
              // Close the popover BEFORE awaiting loadAppleMusic. When the
              // user isn't signed in, loadAppleMusic surfaces the "Sign in
              // to Apple Music" button on the pill — but the pill is under
              // the still-open popover, so the button was invisible. Closing
              // first fixes the entire "search finds the song but nothing
              // plays" mobile confusion.
              setShowSourcePicker(false);
              await loadAppleMusic({
                id: hit.id,
                kind: 'song',
                storefront: hit.storefront,
                title: `${hit.title} · ${hit.artist}`,
                artworkUrl: hit.artworkUrl,
              });
            }}
            onPickAppleMusicAlbum={async (hit) => {
              setShowSourcePicker(false);
              await loadAppleMusic({
                id: hit.id,
                kind: 'album',
                storefront: hit.storefront,
                title: `${hit.title} · ${hit.artist} (album)`,
                artworkUrl: hit.artworkUrl,
              });
            }}
            onPickYouTubeVideo={(videoId) => {
              forceUnlockAudio();
              loadYouTube(`https://www.youtube.com/watch?v=${videoId}`);
              setShowSourcePicker(false);
            }}
          />
        </PopoverContent>
      </Popover>

      {/* Track switcher — only when the score has 2+ bound tracks. */}
      {musicId && tracks.length > 1 && (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="h-5 px-1 text-[10px] touch-manipulation"
              title="Switch track"
            >
              <ChevronDown className="h-3 w-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-1" align="start">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 py-1">
              Audio tracks
            </div>
            {tracks.map((t) => {
              const isCurrent =
                (t.kind === 'apple_music' && audioSource === 'apple_music' && audioFileName === (t.apple_music_title ?? t.label)) ||
                (t.kind !== 'apple_music' && audioFileName === t.label);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => playTrack(t)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-left hover:bg-accent/40 rounded text-xs"
                >
                  {t.kind === 'apple_music' ? (
                    <Music className="h-3 w-3 text-pink-500" />
                  ) : t.kind === 'youtube' ? (
                    <Youtube className="h-3 w-3 text-red-500" />
                  ) : (
                    <Music className="h-3 w-3 text-muted-foreground" />
                  )}
                  <span className="flex-1 truncate">{t.label}</span>
                  {t.is_default && <span className="text-[9px] uppercase text-muted-foreground">default</span>}
                  {isCurrent && <Check className="h-3 w-3 text-primary" />}
                </button>
              );
            })}
          </PopoverContent>
        </Popover>
      )}

      <Button
        size="sm"
        variant="ghost"
        onClick={handlePlay}
        onTouchEnd={(e) => { e.preventDefault(); handlePlay(); }}
        onPointerDown={() => forceUnlockAudio()}
        disabled={!audioSource}
        className="h-6 w-6 p-0 touch-manipulation rounded-full bg-primary/10 hover:bg-primary/20"
        title={isPlaying ? "Pause" : "Play"}
      >
        {/* No spinner — a rotating Loader2 here read as "the toolbar is
            shaking" when the iframe-loaded signal didn't arrive promptly.
            If YouTube isn't ready yet, the play tap is a no-op and the
            user can tap again once the embed initializes. */}
        {isPlaying ? (
          <Pause className="h-3 w-3 text-foreground" />
        ) : (
          <Play className="h-3 w-3 text-foreground ml-0.5" />
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
                  onClick={() => stopPlayback()}
                  className="touch-manipulation"
                >
                  <Square className="h-4 w-4 mr-2" />
                  Stop
                </DropdownMenuItem>
                {PLAYBACK_RATES.map((r) => (
                  <DropdownMenuItem
                    key={r}
                    onClick={() => setPlaybackRate(r)}
                    className={cn('touch-manipulation tabular-nums', r === playbackRate && 'font-semibold text-primary')}
                  >
                    {r}× speed
                  </DropdownMenuItem>
                ))}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Desktop: Stop + Speed */}
      <div className="hidden sm:flex items-center gap-1">
        {audioSource && (
          <>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => stopPlayback()}
              className="h-9 w-9 p-0 touch-manipulation"
              title="Stop"
            >
              <Square className="h-4 w-4 text-foreground fill-foreground" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-9 px-2 text-xs tabular-nums"
                  title="Playback speed"
                >
                  {playbackRate === 1 ? '1×' : `${playbackRate}×`}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {PLAYBACK_RATES.map((r) => (
                  <DropdownMenuItem
                    key={r}
                    onClick={() => setPlaybackRate(r)}
                    className={cn('tabular-nums', r === playbackRate && 'font-semibold text-primary')}
                  >
                    {r}× {r < 1 ? '(slow)' : r > 1 ? '(fast)' : '(normal)'}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>

      {/* Apple Music subscription / sign-in prompt. The button calls
          authorize() SYNCHRONOUSLY from the click so MusicKit's popup
          opens inside the user gesture and isn't blocked. The tooltip
          surfaces the specific failure reason (no subscription, popup
          blocked, cancelled, etc.). */}
      {audioSource === 'apple_music' && appleMusicNeedsAuth && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => { void authorizeAppleMusic(); }}
          className="h-7 px-2 text-xs"
          title={appleMusicAuthError ?? 'Sign in with your Apple ID to stream this track'}
        >
          {appleMusicAuthError && appleMusicAuthError.toLowerCase().includes('subscription')
            ? 'Apple Music subscription required'
            : 'Sign in to Apple Music'}
        </Button>
      )}

      {/* Source label - Desktop only */}
      {audioSource === 'youtube' && (
        <span className="text-xs text-red-500 font-medium hidden lg:inline">YouTube</span>
      )}
      {audioSource === 'apple_music' && audioFileName && (
        <span className="text-xs text-pink-600 truncate max-w-[120px] hidden lg:inline" title={audioFileName}>
          {audioFileName}
        </span>
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

// Source picker body — Apple Music search (songs + albums toggle),
// YouTube search + URL paste, and File upload all stacked in one popover.
interface YouTubeHit {
  video_id: string;
  title: string;
  channel: string;
  thumbnail_url?: string;
  url?: string;
}

function AudioSourcePickerBody({
  youtubeUrl,
  setYoutubeUrl,
  onYouTubeSubmit,
  onUploadClick,
  onPickAppleMusicSong,
  onPickAppleMusicAlbum,
  onPickYouTubeVideo,
}: {
  youtubeUrl: string;
  setYoutubeUrl: (v: string) => void;
  onYouTubeSubmit: () => void;
  onUploadClick: () => void;
  onPickAppleMusicSong: (hit: AppleMusicSongHit) => Promise<void> | void;
  onPickAppleMusicAlbum: (hit: AppleMusicAlbumHit) => Promise<void> | void;
  onPickYouTubeVideo: (videoId: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [songs, setSongs] = useState<AppleMusicSongHit[]>([]);
  const [albums, setAlbums] = useState<AppleMusicAlbumHit[]>([]);
  const [tab, setTab] = useState<'songs' | 'albums'>('songs');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // YouTube search: mirrors the Apple Music pattern — same 300ms debounce,
  // same result-card interaction. Backed by the `youtube-search` edge fn
  // that holds the API key server-side.
  const [ytQuery, setYtQuery] = useState('');
  const [ytHits, setYtHits] = useState<YouTubeHit[]>([]);
  const [ytSearching, setYtSearching] = useState(false);
  const [ytError, setYtError] = useState<string | null>(null);
  const [showYtPaste, setShowYtPaste] = useState(false);

  useEffect(() => {
    if (!query.trim()) { setSongs([]); setAlbums([]); setSearchError(null); return; }
    const handle = window.setTimeout(async () => {
      setSearching(true);
      setSearchError(null);
      try {
        const { songs: s, albums: a } = await searchAppleMusic(query, 'us');
        setSongs(s);
        setAlbums(a);
      } catch (err: any) {
        setSearchError(err?.message ?? 'Search failed');
        setSongs([]);
        setAlbums([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => window.clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    const term = ytQuery.trim();
    if (!term) { setYtHits([]); setYtError(null); return; }
    let cancelled = false;
    setYtSearching(true);
    setYtError(null);
    const handle = window.setTimeout(async () => {
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        const { data, error } = await supabase.functions.invoke('youtube-search', {
          body: { q: term, maxResults: 8 },
        });
        if (error) throw error;
        const body = data as { hits?: YouTubeHit[]; error?: string };
        if (body?.error) throw new Error(body.error);
        if (!cancelled) setYtHits(body?.hits ?? []);
      } catch (e: any) {
        if (!cancelled) setYtError(e?.message ?? 'YouTube search failed.');
      } finally {
        if (!cancelled) setYtSearching(false);
      }
    }, 300);
    return () => { cancelled = true; window.clearTimeout(handle); };
  }, [ytQuery]);

  const clearResults = () => { setQuery(''); setSongs([]); setAlbums([]); };
  const clearYtResults = () => { setYtQuery(''); setYtHits([]); setYtError(null); };

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium">Select Audio Source</div>

      {/* Apple Music search */}
      <div className="space-y-1.5">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Music className="h-3 w-3 text-pink-500" /> Apple Music
        </div>
        <Input
          placeholder="Search Apple Music…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-8 text-sm"
        />

        {/* Songs / Albums tabs — only render when we have a query so they
            don't take up empty space in the popover. */}
        {query.trim().length > 0 && (
          <div className="inline-flex rounded-md border border-border p-0.5 text-[11px] bg-muted/30">
            <button
              type="button"
              onClick={() => setTab('songs')}
              className={cn(
                'px-2 py-0.5 rounded-sm transition-colors',
                tab === 'songs' ? 'bg-background font-semibold text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Songs{songs.length > 0 ? ` (${songs.length})` : ''}
            </button>
            <button
              type="button"
              onClick={() => setTab('albums')}
              className={cn(
                'px-2 py-0.5 rounded-sm transition-colors',
                tab === 'albums' ? 'bg-background font-semibold text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Albums{albums.length > 0 ? ` (${albums.length})` : ''}
            </button>
          </div>
        )}

        {searching && (
          <div className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" /> Searching…
          </div>
        )}
        {searchError && (
          <div className="text-[11px] text-rose-500">{searchError}</div>
        )}

        {tab === 'songs' && songs.length > 0 && (
          <div className="max-h-48 overflow-y-auto rounded border border-border divide-y divide-border">
            {songs.map((hit) => (
              <button
                key={hit.id}
                type="button"
                onClick={() => { void onPickAppleMusicSong(hit); clearResults(); }}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-left hover:bg-accent/40"
              >
                {hit.artworkUrl
                  ? <img src={hit.artworkUrl} alt="" className="w-8 h-8 rounded shrink-0" />
                  : <Music className="w-6 h-6 text-pink-500 shrink-0" />}
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium truncate">{hit.title}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{hit.artist}</div>
                </div>
              </button>
            ))}
          </div>
        )}
        {tab === 'albums' && albums.length > 0 && (
          <div className="max-h-48 overflow-y-auto rounded border border-border divide-y divide-border">
            {albums.map((hit) => (
              <button
                key={hit.id}
                type="button"
                onClick={() => { void onPickAppleMusicAlbum(hit); clearResults(); }}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-left hover:bg-accent/40"
              >
                {hit.artworkUrl
                  ? <img src={hit.artworkUrl} alt="" className="w-8 h-8 rounded shrink-0" />
                  : <Music className="w-6 h-6 text-pink-500 shrink-0" />}
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium truncate">{hit.title}</div>
                  <div className="text-[10px] text-muted-foreground truncate">
                    {hit.artist}{hit.trackCount ? ` · ${hit.trackCount} tracks` : ''}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
        {!searching && query.trim().length > 0 && tab === 'songs' && songs.length === 0 && !searchError && (
          <div className="text-[11px] text-muted-foreground italic">No songs match.</div>
        )}
        {!searching && query.trim().length > 0 && tab === 'albums' && albums.length === 0 && !searchError && (
          <div className="text-[11px] text-muted-foreground italic">No albums match.</div>
        )}
      </div>

      {/* YouTube — search first, paste-URL as a fallback toggle. Same
          debounce + result-list pattern as Apple Music so both surfaces
          feel like one control. */}
      <div className="space-y-1.5 border-t border-border pt-3">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Youtube className="h-3 w-3 text-rose-500" /> YouTube
        </div>
        <Input
          placeholder="Search YouTube…"
          value={ytQuery}
          onChange={(e) => setYtQuery(e.target.value)}
          className="h-8 text-sm"
        />

        {ytSearching && (
          <div className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" /> Searching…
          </div>
        )}
        {ytError && (
          <div className="text-[11px] text-rose-500">{ytError}</div>
        )}

        {ytHits.length > 0 && (
          <div className="max-h-48 overflow-y-auto rounded border border-border divide-y divide-border">
            {ytHits.map((hit) => (
              <button
                key={hit.video_id}
                type="button"
                onClick={() => { onPickYouTubeVideo(hit.video_id); clearYtResults(); }}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-left hover:bg-accent/40"
              >
                {hit.thumbnail_url
                  ? <img src={hit.thumbnail_url} alt="" className="w-10 h-8 rounded shrink-0 object-cover" />
                  : <Youtube className="w-6 h-6 text-rose-500 shrink-0" />}
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium truncate">{hit.title}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{hit.channel}</div>
                </div>
              </button>
            ))}
          </div>
        )}
        {!ytSearching && ytQuery.trim().length > 0 && ytHits.length === 0 && !ytError && (
          <div className="text-[11px] text-muted-foreground italic">No videos match.</div>
        )}

        {/* URL paste — collapsed by default. Kept as an option for users
            who already have a specific video URL in hand. */}
        {!showYtPaste && (
          <button
            type="button"
            onClick={() => setShowYtPaste(true)}
            className="text-[11px] text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            Or paste a YouTube URL
          </button>
        )}
        {showYtPaste && (
          <div className="flex gap-2">
            <Input
              placeholder="Paste YouTube URL…"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onYouTubeSubmit()}
              className="flex-1 h-8 text-sm"
            />
            <Button size="sm" onClick={onYouTubeSubmit} disabled={!youtubeUrl} className="h-8 px-2">
              <Youtube className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* File upload */}
      <div className="flex items-center gap-2 border-t border-border pt-3">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">File</span>
        <Button size="sm" variant="outline" onClick={onUploadClick} className="h-7 text-xs">
          <Upload className="h-3 w-3 mr-1" /> Upload Audio
        </Button>
      </div>
    </div>
  );
}
