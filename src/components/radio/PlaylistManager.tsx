import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { SortableTrackItem } from './SortableTrackItem';
import { 
  List, 
  Shuffle, 
  RotateCcw, 
  Save,
  AlertTriangle,
  Music
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface RadioTrack {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration: number;
  audio_url: string;
  category: 'performance' | 'announcement' | 'interlude' | 'alumni_story';
}

interface PlaylistManagerProps {
  playlist: RadioTrack[];
  currentTrack: RadioTrack | null;
  isPlaying: boolean;
  onPlaylistUpdate: (newPlaylist: RadioTrack[]) => void;
  onPlayTrack: (track: RadioTrack) => void;
  onRemoveTrack: (trackId: string) => void;
  canEdit: boolean; // Admin permission check
}

export const PlaylistManager = ({
  playlist,
  currentTrack,
  isPlaying,
  onPlaylistUpdate,
  onPlayTrack,
  onRemoveTrack,
  canEdit
}: PlaylistManagerProps) => {
  const [localPlaylist, setLocalPlaylist] = useState<RadioTrack[]>(playlist);
  const [hasChanges, setHasChanges] = useState(false);
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = localPlaylist.findIndex((item) => item.id === active.id);
      const newIndex = localPlaylist.findIndex((item) => item.id === over?.id);

      // Prevent moving the currently playing track
      if (localPlaylist[oldIndex]?.id === currentTrack?.id) {
        toast({
          title: "Cannot Move",
          description: "Cannot move the currently playing track",
          variant: "destructive",
        });
        return;
      }

      // Prevent moving tracks above the currently playing track
      const currentTrackIndex = localPlaylist.findIndex((item) => item.id === currentTrack?.id);
      if (currentTrackIndex !== -1 && newIndex <= currentTrackIndex) {
        toast({
          title: "Cannot Move",
          description: "Cannot move tracks above the currently playing track",
          variant: "destructive",
        });
        return;
      }

      const newPlaylist = arrayMove(localPlaylist, oldIndex, newIndex);
      setLocalPlaylist(newPlaylist);
      setHasChanges(true);
    }
  };

  const handleSaveChanges = () => {
    onPlaylistUpdate(localPlaylist);
    setHasChanges(false);
    toast({
      title: "Playlist Updated",
      description: "Your playlist changes have been saved",
    });
  };

  const handleResetChanges = () => {
    setLocalPlaylist(playlist);
    setHasChanges(false);
    toast({
      title: "Changes Reset",
      description: "Playlist has been reset to the last saved state",
    });
  };

  const handleShuffleQueue = () => {
    const currentTrackIndex = localPlaylist.findIndex((item) => item.id === currentTrack?.id);
    
    if (currentTrackIndex === -1) {
      // No current track, shuffle everything
      const shuffled = [...localPlaylist].sort(() => Math.random() - 0.5);
      setLocalPlaylist(shuffled);
    } else {
      // Keep current track in place, shuffle the rest
      const beforeCurrent = localPlaylist.slice(0, currentTrackIndex + 1);
      const afterCurrent = localPlaylist.slice(currentTrackIndex + 1);
      const shuffledAfter = afterCurrent.sort(() => Math.random() - 0.5);
      
      setLocalPlaylist([...beforeCurrent, ...shuffledAfter]);
    }
    
    setHasChanges(true);
    toast({
      title: "Queue Shuffled",
      description: "Upcoming tracks have been shuffled",
    });
  };

  const canSortTrack = (track: RadioTrack): boolean => {
    return canEdit && track.id !== currentTrack?.id;
  };

  const getTotalDuration = () => {
    const total = localPlaylist.reduce((sum, track) => sum + track.duration, 0);
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  if (!canEdit) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <List className="h-5 w-5" />
            Current Playlist
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Music className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              Admin access required to manage playlist
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <List className="h-5 w-5" />
            Playlist Manager
            <Badge variant="outline">{localPlaylist.length} tracks</Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            {hasChanges && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Unsaved Changes
              </Badge>
            )}
            <Badge variant="secondary">{getTotalDuration()}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Control Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleShuffleQueue}
            disabled={localPlaylist.length <= 1}
          >
            <Shuffle className="h-4 w-4 mr-2" />
            Shuffle Queue
          </Button>
          
          {hasChanges && (
            <>
              <Button
                variant="default"
                size="sm"
                onClick={handleSaveChanges}
                className="bg-green-600 hover:bg-green-700"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetChanges}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </>
          )}
        </div>

        {/* Sortable Playlist */}
        <ScrollArea className="h-96">
          {localPlaylist.length > 0 ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={localPlaylist.map(track => track.id)}
                strategy={verticalListSortingStrategy}
              >
                {localPlaylist.map((track) => (
                  <SortableTrackItem
                    key={track.id}
                    track={track}
                    isCurrentTrack={track.id === currentTrack?.id}
                    isPlaying={isPlaying}
                    canSort={canSortTrack(track)}
                    onPlay={onPlayTrack}
                    onRemove={onRemoveTrack}
                  />
                ))}
              </SortableContext>
            </DndContext>
          ) : (
            <div className="text-center py-12">
              <Music className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No tracks in playlist</p>
              <p className="text-sm text-muted-foreground/70">
                Add tracks from the Media Library to get started
              </p>
            </div>
          )}
        </ScrollArea>

        {/* Current Track Protection Notice */}
        {currentTrack && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex items-center gap-2 text-amber-800">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">
                Currently playing track cannot be moved or removed
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
