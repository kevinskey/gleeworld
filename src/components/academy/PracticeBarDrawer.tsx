import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import {
  Play, Pause, Music, CheckCircle2, FileText, Clock, ListMusic
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CoursePlaylist, PlaylistTrack } from '@/hooks/useCoursePlaylist';

interface PracticeBarDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  courseCode: string;
  tracks: PlaylistTrack[];
  currentTrackIndex: number | null;
  isPlaying: boolean;
  playlists: CoursePlaylist[];
  selectedPlaylist: CoursePlaylist | null;
  onSelectPlaylist: (playlist: CoursePlaylist) => void;
  onPlayTrack: (index: number) => void;
  onTogglePlay: () => void;
}

export const PracticeBarDrawer: React.FC<PracticeBarDrawerProps> = ({
  open,
  onOpenChange,
  courseId,
  courseCode,
  tracks,
  currentTrackIndex,
  isPlaying,
  playlists,
  selectedPlaylist,
  onSelectPlaylist,
  onPlayTrack,
  onTogglePlay,
}) => {
  // Clean display title
  const cleanDisplayTitle = (title: string) => {
    return title
      .replace(/^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}_/, '')
      .replace(/_[a-f0-9]{8}$/, '')
      .replace(/_/g, ' ')
      .replace(/\.[^/.]+$/, '');
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="text-left pb-2">
          <div className="flex items-center justify-between">
            <div>
              <DrawerTitle className="flex items-center gap-2">
                <ListMusic className="h-5 w-5 text-primary" />
                Course Practice Engine
              </DrawerTitle>
              <DrawerDescription>
                {courseCode} • {tracks.length} tracks available
              </DrawerDescription>
            </div>
            <Badge variant="outline" className="text-xs">
              {selectedPlaylist?.title || 'All Tracks'}
            </Badge>
          </div>
        </DrawerHeader>

        <div className="px-4 pb-4 space-y-4">
          {/* Playlist Selector */}
          {playlists.length > 1 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Playlists
              </p>
              <div className="flex flex-wrap gap-2">
                {playlists.map((playlist) => (
                  <Button
                    key={playlist.id}
                    variant={selectedPlaylist?.id === playlist.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => onSelectPlaylist(playlist)}
                    className="text-xs"
                  >
                    {playlist.title}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Track List */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Queue
            </p>
            <ScrollArea className="h-[280px] pr-3">
              <div className="space-y-1">
                {tracks.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Music className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No tracks in this playlist</p>
                  </div>
                ) : (
                  tracks.map((track, idx) => (
                    <button
                      key={track.id || idx}
                      onClick={() => onPlayTrack(idx)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
                        idx === currentTrackIndex
                          ? "bg-primary/10 border border-primary/30"
                          : "hover:bg-muted/50"
                      )}
                    >
                      {/* Track Number / Play State */}
                      <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center shrink-0">
                        {idx === currentTrackIndex && isPlaying ? (
                          <Pause className="h-4 w-4 text-primary" />
                        ) : idx === currentTrackIndex ? (
                          <Play className="h-4 w-4 text-primary" />
                        ) : (
                          <span className="text-xs text-muted-foreground font-medium">
                            {idx + 1}
                          </span>
                        )}
                      </div>

                      {/* Track Info */}
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-sm font-medium truncate",
                          idx === currentTrackIndex && "text-primary"
                        )}>
                          {cleanDisplayTitle(track.track_data?.title || `Track ${idx + 1}`)}
                        </p>
                        {track.track_data?.artist && (
                          <p className="text-xs text-muted-foreground truncate">
                            {track.track_data.artist}
                          </p>
                        )}
                      </div>

                      {/* Duration placeholder */}
                      {track.track_data?.duration && (
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {Math.floor(track.track_data.duration / 60)}:
                          {String(Math.floor(track.track_data.duration % 60)).padStart(2, '0')}
                        </span>
                      )}
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          <Separator />

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" className="text-xs gap-2">
              <FileText className="h-3.5 w-3.5" />
              Open Sheet Music
            </Button>
            <Button variant="outline" size="sm" className="text-xs gap-2">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Mark as Practiced
            </Button>
          </div>

          {/* Listening History Placeholder */}
          <div className="pt-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>Listening history coming soon</span>
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};
