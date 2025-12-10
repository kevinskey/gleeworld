import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
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
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical,
  Play,
  Pause,
  Trash2,
  Music,
  Mic,
  Radio,
  Clock,
  Plus,
  RefreshCw,
  Volume2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlaylistTrack {
  id: string;
  track_id: string;
  title: string;
  artist_info: string | null;
  audio_url: string;
  category: string;
  duration_seconds: number | null;
  sort_order: number;
  is_active: boolean;
}

interface SortableTrackProps {
  track: PlaylistTrack;
  isPlaying: boolean;
  onPlay: () => void;
  onRemove: () => void;
}

const SortableTrack = ({ track, isPlaying, onPlay, onRemove }: SortableTrackProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: track.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-3 p-3 bg-card border border-border transition-all",
        isDragging && "opacity-50 shadow-lg z-50",
        isPlaying && "bg-primary/10 border-primary/30"
      )}
    >
      {/* Drag Handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted touch-none"
      >
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </button>

      {/* Track Number */}
      <div className="w-8 h-8 flex items-center justify-center bg-muted text-xs font-mono">
        {track.sort_order + 1}
      </div>

      {/* Track Info */}
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm truncate">{track.title}</h4>
        <p className="text-xs text-muted-foreground truncate">
          {track.artist_info || 'Unknown Artist'}
        </p>
      </div>

      {/* Duration */}
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Clock className="h-3 w-3" />
        {formatDuration(track.duration_seconds)}
      </div>

      {/* Actions */}
      <div className="flex gap-1">
        <Button
          size="sm"
          variant="ghost"
          onClick={onPlay}
          className={cn(
            "h-8 w-8 p-0",
            isPlaying && "bg-primary/20 text-primary"
          )}
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onRemove}
          className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

interface RadioPlaylistQueueProps {
  availableTracks: Array<{
    id: string;
    title: string;
    artist_info: string | null;
    audio_url: string;
    category: string;
    duration_seconds: number | null;
  }>;
  onRefreshTracks: () => void;
}

const CATEGORIES = [
  { id: 'performance', label: 'Performances', icon: Music, color: 'bg-blue-500' },
  { id: 'announcement', label: 'Announcements', icon: Mic, color: 'bg-green-500' },
  { id: 'interlude', label: 'Interludes', icon: Radio, color: 'bg-purple-500' },
  { id: 'alumni_story', label: 'Alumni Stories', icon: Volume2, color: 'bg-orange-500' },
];

export const RadioPlaylistQueue = ({ availableTracks, onRefreshTracks }: RadioPlaylistQueueProps) => {
  const [playlists, setPlaylists] = useState<Record<string, PlaylistTrack[]>>({});
  const [activeCategory, setActiveCategory] = useState('performance');
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fetch playlist from database
  const fetchPlaylist = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('gw_radio_playlist_queue')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;

      // Group by category
      const grouped: Record<string, PlaylistTrack[]> = {};
      CATEGORIES.forEach(cat => {
        grouped[cat.id] = [];
      });

      (data || []).forEach(track => {
        if (!grouped[track.category]) {
          grouped[track.category] = [];
        }
        grouped[track.category].push(track as PlaylistTrack);
      });

      setPlaylists(grouped);
    } catch (error) {
      console.error('Error fetching playlist:', error);
      toast({
        title: 'Error',
        description: 'Failed to load playlist',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlaylist();
  }, []);

  // Handle drag end - reorder tracks
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const categoryTracks = playlists[activeCategory] || [];
    const oldIndex = categoryTracks.findIndex(t => t.id === active.id);
    const newIndex = categoryTracks.findIndex(t => t.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    // Reorder locally first for instant feedback
    const reordered = arrayMove(categoryTracks, oldIndex, newIndex);
    
    // Update sort_order for each track
    const updated = reordered.map((track, index) => ({
      ...track,
      sort_order: index,
    }));

    setPlaylists(prev => ({
      ...prev,
      [activeCategory]: updated,
    }));

    // Save to database
    try {
      const updates = updated.map(track => ({
        id: track.id,
        sort_order: track.sort_order,
      }));

      for (const update of updates) {
        await supabase
          .from('gw_radio_playlist_queue')
          .update({ sort_order: update.sort_order })
          .eq('id', update.id);
      }

      toast({
        title: 'Reordered',
        description: 'Playlist order saved',
      });
    } catch (error) {
      console.error('Error saving order:', error);
      toast({
        title: 'Error',
        description: 'Failed to save order',
        variant: 'destructive',
      });
      fetchPlaylist(); // Refresh on error
    }
  };

  // Add track to playlist
  const addToPlaylist = async (track: typeof availableTracks[0], category: string) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      const categoryTracks = playlists[category] || [];
      const nextOrder = categoryTracks.length;

      const { error } = await supabase
        .from('gw_radio_playlist_queue')
        .insert({
          track_id: track.id,
          title: track.title,
          artist_info: track.artist_info,
          audio_url: track.audio_url,
          category: category,
          duration_seconds: track.duration_seconds,
          sort_order: nextOrder,
          added_by: user.user?.id,
        });

      if (error) throw error;

      toast({
        title: 'Added',
        description: `"${track.title}" added to ${category}`,
      });

      fetchPlaylist();
    } catch (error) {
      console.error('Error adding track:', error);
      toast({
        title: 'Error',
        description: 'Failed to add track',
        variant: 'destructive',
      });
    }
  };

  // Remove track from playlist
  const removeFromPlaylist = async (trackId: string) => {
    try {
      const { error } = await supabase
        .from('gw_radio_playlist_queue')
        .delete()
        .eq('id', trackId);

      if (error) throw error;

      toast({
        title: 'Removed',
        description: 'Track removed from playlist',
      });

      fetchPlaylist();
    } catch (error) {
      console.error('Error removing track:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove track',
        variant: 'destructive',
      });
    }
  };

  // Play/pause track
  const handlePlayTrack = async (track: PlaylistTrack) => {
    if (audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
    }

    if (currentlyPlaying === track.id) {
      setCurrentlyPlaying(null);
      setAudioElement(null);
      return;
    }

    const audio = new Audio(track.audio_url);
    
    audio.addEventListener('ended', () => {
      // Play next track in queue
      const categoryTracks = playlists[track.category] || [];
      const currentIndex = categoryTracks.findIndex(t => t.id === track.id);
      
      if (currentIndex < categoryTracks.length - 1) {
        // Play next track
        handlePlayTrack(categoryTracks[currentIndex + 1]);
      } else if (categoryTracks.length > 0) {
        // Loop back to first track
        handlePlayTrack(categoryTracks[0]);
        toast({
          title: 'Looping',
          description: `${track.category} playlist restarting`,
        });
      }
    });

    audio.addEventListener('error', () => {
      toast({
        title: 'Error',
        description: 'Failed to play track',
        variant: 'destructive',
      });
      setCurrentlyPlaying(null);
      setAudioElement(null);
    });

    try {
      await audio.play();
      setCurrentlyPlaying(track.id);
      setAudioElement(audio);
    } catch (error) {
      console.error('Playback error:', error);
    }
  };

  // Handle drop from library
  const handleDrop = (e: React.DragEvent, category: string) => {
    e.preventDefault();
    const trackData = e.dataTransfer.getData('application/json');
    
    if (trackData) {
      try {
        const track = JSON.parse(trackData);
        addToPlaylist(track, category);
      } catch (error) {
        console.error('Error parsing dropped track:', error);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const currentCategoryTracks = playlists[activeCategory] || [];
  const currentCategory = CATEGORIES.find(c => c.id === activeCategory);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Radio className="h-5 w-5" />
            Playlist Queue
          </CardTitle>
          <Button size="sm" variant="outline" onClick={fetchPlaylist}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Drag tracks from the library to add. Drag handles to reorder. Loops when done.
        </p>
      </CardHeader>
      <CardContent>
        <Tabs value={activeCategory} onValueChange={setActiveCategory}>
          <TabsList className="grid grid-cols-4 mb-4">
            {CATEGORIES.map(cat => {
              const Icon = cat.icon;
              const count = (playlists[cat.id] || []).length;
              return (
                <TabsTrigger
                  key={cat.id}
                  value={cat.id}
                  className="flex items-center gap-1 text-xs"
                >
                  <Icon className="h-3 w-3" />
                  <span className="hidden sm:inline">{cat.label}</span>
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                    {count}
                  </Badge>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {CATEGORIES.map(cat => (
            <TabsContent key={cat.id} value={cat.id}>
              <div
                className="min-h-[300px] border-2 border-dashed border-border p-2 transition-colors hover:border-primary/50"
                onDrop={(e) => handleDrop(e, cat.id)}
                onDragOver={handleDragOver}
              >
                {loading ? (
                  <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                    Loading playlist...
                  </div>
                ) : currentCategoryTracks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground gap-2">
                    <Plus className="h-8 w-8" />
                    <p>Drop tracks here to add to {cat.label}</p>
                    <p className="text-xs">Drag from the Audio Track Library</p>
                  </div>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={currentCategoryTracks.map(t => t.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <ScrollArea className="h-[400px]">
                        <div className="space-y-1">
                          {currentCategoryTracks.map(track => (
                            <SortableTrack
                              key={track.id}
                              track={track}
                              isPlaying={currentlyPlaying === track.id}
                              onPlay={() => handlePlayTrack(track)}
                              onRemove={() => removeFromPlaylist(track.id)}
                            />
                          ))}
                        </div>
                      </ScrollArea>
                    </SortableContext>
                  </DndContext>
                )}
              </div>
              
              {/* Queue summary */}
              <div className="flex items-center justify-between mt-3 p-2 bg-muted/50 text-xs">
                <span>
                  {currentCategoryTracks.length} tracks in queue
                </span>
                <span className="text-muted-foreground">
                  Total: {formatTotalDuration(currentCategoryTracks)}
                </span>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
};

function formatTotalDuration(tracks: PlaylistTrack[]) {
  const totalSeconds = tracks.reduce((acc, t) => acc + (t.duration_seconds || 0), 0);
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
}
