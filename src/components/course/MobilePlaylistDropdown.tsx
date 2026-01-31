import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Play, Music, Loader2, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useCoursePlaylist, CoursePlaylist, PlaylistTrack } from '@/hooks/useCoursePlaylist';
import { useGlobalAudioPlayer, AudioTrack } from '@/hooks/useGlobalAudioPlayer';
import { cn } from '@/lib/utils';

interface MobilePlaylistDropdownProps {
  courseId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export const MobilePlaylistDropdown: React.FC<MobilePlaylistDropdownProps> = ({
  courseId,
  isOpen,
  onOpenChange,
}) => {
  const { playlists, loading, error } = useCoursePlaylist(courseId);
  const { setPlaylist, playTrack, currentTrack, isPlaying, togglePlay } = useGlobalAudioPlayer();
  const [expandedPlaylist, setExpandedPlaylist] = useState<string | null>(null);
  const [loadingPlaylistId, setLoadingPlaylistId] = useState<string | null>(null);
  const [playlistTracks, setPlaylistTracks] = useState<Record<string, PlaylistTrack[]>>({});

  // Fetch tracks for a playlist when expanded
  const handlePlaylistExpand = async (playlistId: string) => {
    if (expandedPlaylist === playlistId) {
      setExpandedPlaylist(null);
      return;
    }

    setExpandedPlaylist(playlistId);

    // If we already have the tracks, don't refetch
    if (playlistTracks[playlistId]) return;

    setLoadingPlaylistId(playlistId);

    try {
      const { supabase } = await import('@/integrations/supabase/client');
      
      const { data: playlistMedia, error: mediaError } = await supabase
        .from('gw_course_playlist_media')
        .select(`
          id,
          playlist_id,
          media_id,
          position,
          created_at,
          gw_media_library!inner (
            id,
            title,
            file_url,
            file_type,
            category
          )
        `)
        .eq('playlist_id', playlistId)
        .order('position', { ascending: true });

      if (mediaError) throw mediaError;

      const tracks: PlaylistTrack[] = (playlistMedia || []).map((item: any) => ({
        id: item.id,
        playlist_id: item.playlist_id,
        music_file_id: item.media_id,
        position: item.position,
        added_by: '',
        added_at: item.created_at,
        track_data: item.gw_media_library ? {
          id: item.gw_media_library.id,
          title: item.gw_media_library.title,
          artist: item.gw_media_library.category,
          audio_url: item.gw_media_library.file_url,
          duration: undefined,
        } : undefined,
      })).filter((t: PlaylistTrack) => t.track_data !== undefined);

      setPlaylistTracks(prev => ({ ...prev, [playlistId]: tracks }));
    } catch (err) {
      console.error('Error fetching playlist tracks:', err);
    } finally {
      setLoadingPlaylistId(null);
    }
  };

  // Play entire playlist starting from first track
  const handlePlayPlaylist = (playlist: CoursePlaylist, tracks: PlaylistTrack[]) => {
    if (tracks.length === 0) return;

    const audioTracks: AudioTrack[] = tracks
      .filter(t => t.track_data)
      .map(t => ({
        id: t.track_data!.id,
        title: t.track_data!.title,
        artist: t.track_data!.artist,
        audio_url: t.track_data!.audio_url,
        duration: t.track_data!.duration,
      }));

    setPlaylist(audioTracks);
    playTrack(audioTracks[0], 0);
    onOpenChange(false);
  };

  // Play a single track within a playlist context
  const handlePlayTrack = (track: PlaylistTrack, playlist: CoursePlaylist, allTracks: PlaylistTrack[]) => {
    if (!track.track_data) return;

    // Check if this track is currently playing
    if (currentTrack?.id === track.track_data.id) {
      togglePlay();
      return;
    }

    const audioTracks: AudioTrack[] = allTracks
      .filter(t => t.track_data)
      .map(t => ({
        id: t.track_data!.id,
        title: t.track_data!.title,
        artist: t.track_data!.artist,
        audio_url: t.track_data!.audio_url,
        duration: t.track_data!.duration,
      }));

    const trackIndex = audioTracks.findIndex(t => t.id === track.track_data!.id);
    
    setPlaylist(audioTracks);
    playTrack(audioTracks[trackIndex], trackIndex);
  };

  if (!isOpen) return null;

  return (
    <div className="bg-card border border-border rounded-lg shadow-lg overflow-hidden mt-2 z-50">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-muted/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Music className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm text-foreground">Playlists</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-7 px-2 text-xs text-muted-foreground"
          >
            Close
          </Button>
        </div>
      </div>

      {/* Playlists List */}
      <div className="max-h-[60vh] overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground">
            Failed to load playlists
          </div>
        ) : playlists.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground">
            No playlists available
          </div>
        ) : (
          <div className="divide-y divide-border">
            {playlists.map((playlist) => {
              const tracks = playlistTracks[playlist.id] || [];
              const isExpanded = expandedPlaylist === playlist.id;
              const isLoadingTracks = loadingPlaylistId === playlist.id;

              return (
                <Collapsible
                  key={playlist.id}
                  open={isExpanded}
                  onOpenChange={() => handlePlaylistExpand(playlist.id)}
                >
                  <div className="bg-background">
                    {/* Playlist Row */}
                    <div className="flex items-center gap-2 px-3 py-3">
                      {/* Play Playlist Button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 shrink-0 rounded-full bg-primary/10 hover:bg-primary/20 text-primary touch-manipulation"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (tracks.length > 0) {
                            handlePlayPlaylist(playlist, tracks);
                          } else {
                            // First expand to load tracks, then auto-play
                            handlePlaylistExpand(playlist.id).then(() => {
                              const loadedTracks = playlistTracks[playlist.id];
                              if (loadedTracks && loadedTracks.length > 0) {
                                handlePlayPlaylist(playlist, loadedTracks);
                              }
                            });
                          }
                        }}
                      >
                        <Play className="h-4 w-4 ml-0.5" />
                      </Button>

                      {/* Playlist Info - Tappable to expand */}
                      <CollapsibleTrigger className="flex-1 min-w-0 text-left py-1 touch-manipulation">
                        <p className="font-medium text-sm text-foreground truncate">
                          {playlist.title}
                        </p>
                        {playlist.description && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {playlist.description}
                          </p>
                        )}
                      </CollapsibleTrigger>

                      {/* Expand/Collapse Icon */}
                      <CollapsibleTrigger className="p-2 touch-manipulation">
                        {isLoadingTracks ? (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        ) : (
                          <ChevronDown
                            className={cn(
                              "h-4 w-4 text-muted-foreground transition-transform duration-200",
                              isExpanded && "rotate-180"
                            )}
                          />
                        )}
                      </CollapsibleTrigger>
                    </div>

                    {/* Tracks List */}
                    <CollapsibleContent>
                      <div className="bg-muted/30 border-t border-border">
                        {tracks.length === 0 && !isLoadingTracks ? (
                          <p className="px-4 py-3 text-xs text-muted-foreground">
                            No tracks in this playlist
                          </p>
                        ) : (
                          <div className="divide-y divide-border/50">
                            {tracks.map((track, index) => {
                              const isCurrentTrack = currentTrack?.id === track.track_data?.id;
                              const isTrackPlaying = isCurrentTrack && isPlaying;

                              return (
                                <button
                                  key={track.id}
                                  onClick={() => handlePlayTrack(track, playlist, tracks)}
                                  className={cn(
                                    "w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-muted/50 transition-colors touch-manipulation",
                                    isCurrentTrack && "bg-primary/10"
                                  )}
                                >
                                  {/* Track Number or Play Icon */}
                                  <span className="w-6 h-6 flex items-center justify-center shrink-0">
                                    {isCurrentTrack ? (
                                      isTrackPlaying ? (
                                        <Pause className="h-4 w-4 text-primary" />
                                      ) : (
                                        <Play className="h-4 w-4 text-primary ml-0.5" />
                                      )
                                    ) : (
                                      <span className="text-xs text-muted-foreground font-medium">
                                        {index + 1}
                                      </span>
                                    )}
                                  </span>

                                  {/* Track Info */}
                                  <div className="flex-1 min-w-0">
                                    <p className={cn(
                                      "text-sm truncate",
                                      isCurrentTrack ? "text-primary font-medium" : "text-foreground"
                                    )}>
                                      {track.track_data?.title || 'Unknown Track'}
                                    </p>
                                    {track.track_data?.artist && (
                                      <p className="text-xs text-muted-foreground truncate">
                                        {track.track_data.artist}
                                      </p>
                                    )}
                                  </div>

                                  {/* Play indicator */}
                                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MobilePlaylistDropdown;
