import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import {
  Clock,
  Music,
  Plus,
  GripVertical,
  Upload,
  X
} from 'lucide-react';

interface ScheduledTrack {
  id: string;
  title: string;
  artist?: string;
  startTime: Date;
  duration: number; // in seconds
  category?: string;
  audioUrl?: string;
}

interface RadioScheduleTimelineProps {
  onRefresh?: () => void;
  currentSongElapsed?: number | null;
  currentSongDuration?: number | null;
  currentSongTitle?: string | null;
}

export const RadioScheduleTimeline = ({ 
  onRefresh, 
  currentSongElapsed = 0, 
  currentSongDuration = 0,
  currentSongTitle = ''
}: RadioScheduleTimelineProps) => {
  const [scheduledTracks, setScheduledTracks] = useState<ScheduledTrack[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const { toast } = useToast();

  // Load saved tracks on mount
  useEffect(() => {
    const saved = localStorage.getItem('gw_radio_timeline_schedule');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setScheduledTracks(parsed.map((item: any) => ({
          ...item,
          startTime: new Date(item.startTime)
        })));
      } catch (e) {
        console.error('Error loading schedule:', e);
      }
    }
  }, []);

  // Save tracks whenever they change
  const saveScheduledTracks = (tracks: ScheduledTrack[]) => {
    localStorage.setItem('gw_radio_timeline_schedule', JSON.stringify(tracks));
  };

  // Get the next available time (end of current song or end of last queued track)
  const getNextAvailableTime = (): Date => {
    const now = new Date();
    const elapsed = currentSongElapsed || 0;
    const duration = currentSongDuration || 0;
    const remainingSeconds = Math.max(0, duration - elapsed);
    
    // Start with end of current song
    let nextTime = new Date(now.getTime() + (remainingSeconds * 1000));
    
    // If we have queued tracks, find the end of the last one
    if (scheduledTracks.length > 0) {
      const sortedTracks = [...scheduledTracks].sort((a, b) => 
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );
      const lastTrack = sortedTracks[sortedTracks.length - 1];
      const lastTrackEnd = new Date(new Date(lastTrack.startTime).getTime() + (lastTrack.duration * 1000));
      
      if (lastTrackEnd > nextTime) {
        nextTime = lastTrackEnd;
      }
    }
    
    return nextTime;
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getAudioDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const audio = new Audio();
      audio.addEventListener('loadedmetadata', () => {
        resolve(audio.duration || 180);
      });
      audio.addEventListener('error', () => {
        resolve(180); // Default 3 minutes
      });
      audio.src = URL.createObjectURL(file);
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = () => {
    setIsDraggingOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);

    const files = Array.from(e.dataTransfer.files).filter(f => 
      f.type.startsWith('audio/')
    );

    if (files.length > 0) {
      // Process audio files - add them sequentially with no gaps
      let nextStartTime = getNextAvailableTime();
      const newTracks: ScheduledTrack[] = [];
      
      for (const file of files) {
        const duration = await getAudioDuration(file);
        
        // Upload to storage
        try {
          const fileName = `radio-schedule/${Date.now()}-${file.name}`;
          const { error: uploadError } = await supabase.storage
            .from('audio-files')
            .upload(fileName, file);

          if (uploadError) throw uploadError;

          const { data: urlData } = supabase.storage
            .from('audio-files')
            .getPublicUrl(fileName);

          const newTrack: ScheduledTrack = {
            id: crypto.randomUUID(),
            title: file.name.replace(/\.[^/.]+$/, ''),
            startTime: new Date(nextStartTime),
            duration,
            audioUrl: urlData.publicUrl,
            category: 'scheduled'
          };
          
          newTracks.push(newTrack);
          
          // Next track starts exactly when this one ends - no gap
          nextStartTime = new Date(nextStartTime.getTime() + (duration * 1000));
        } catch (error) {
          console.error('Error uploading track:', error);
          toast({ title: "Error", description: `Failed to upload ${file.name}`, variant: "destructive" });
        }
      }

      if (newTracks.length > 0) {
        const updatedTracks = [...scheduledTracks, ...newTracks];
        setScheduledTracks(updatedTracks);
        saveScheduledTracks(updatedTracks);
        toast({ 
          title: "Queued", 
          description: `${newTracks.length} track${newTracks.length > 1 ? 's' : ''} added to queue` 
        });
        onRefresh?.();
      }
      return;
    }

    // Handle JSON track data
    try {
      const trackData = e.dataTransfer.getData('application/json');
      if (trackData) {
        const track = JSON.parse(trackData);
        const startTime = getNextAvailableTime();
        
        const newTrack: ScheduledTrack = {
          id: crypto.randomUUID(),
          title: track.title || 'Unknown Track',
          artist: track.artist,
          startTime,
          duration: track.duration || 180,
          audioUrl: track.audioUrl,
          category: track.category || 'scheduled'
        };
        
        const updatedTracks = [...scheduledTracks, newTrack];
        setScheduledTracks(updatedTracks);
        saveScheduledTracks(updatedTracks);
        toast({ title: "Queued", description: `${track.title} added to queue` });
        onRefresh?.();
      }
    } catch (err) {
      console.error('Failed to parse track data:', err);
    }
  };

  const removeTrack = (id: string) => {
    const trackIndex = scheduledTracks.findIndex(t => t.id === id);
    if (trackIndex === -1) return;

    // Remove the track and recalculate all following track times
    const newTracks = [...scheduledTracks];
    newTracks.splice(trackIndex, 1);
    
    // Recalculate start times to close the gap
    const recalculated = recalculateStartTimes(newTracks);
    setScheduledTracks(recalculated);
    saveScheduledTracks(recalculated);
    toast({ title: "Removed", description: "Track removed from queue" });
  };

  const recalculateStartTimes = (tracks: ScheduledTrack[]): ScheduledTrack[] => {
    if (tracks.length === 0) return [];
    
    const now = new Date();
    const elapsed = currentSongElapsed || 0;
    const duration = currentSongDuration || 0;
    const remainingSeconds = Math.max(0, duration - elapsed);
    let nextTime = new Date(now.getTime() + (remainingSeconds * 1000));
    
    return tracks.map((track, index) => {
      const newTrack = { ...track, startTime: new Date(nextTime) };
      nextTime = new Date(nextTime.getTime() + (track.duration * 1000));
      return newTrack;
    });
  };

  // Calculate total queue duration
  const totalQueueDuration = scheduledTracks.reduce((acc, t) => acc + t.duration, 0);
  const remainingCurrentSong = Math.max(0, (currentSongDuration || 0) - (currentSongElapsed || 0));

  return (
    <Card className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-slate-700">
      <CardHeader className="py-3 px-4 border-b border-slate-700 bg-slate-900/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20">
              <Clock className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-white">Up Next Queue</CardTitle>
              <p className="text-xs text-slate-400">Tracks play back-to-back with no gaps</p>
            </div>
          </div>
          {scheduledTracks.length > 0 && (
            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
              {scheduledTracks.length} tracks • {formatDuration(totalQueueDuration)}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-3">
        {/* Current Song Info */}
        {currentSongTitle && (
          <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg border border-primary/20">
            <Music className="h-4 w-4 text-primary" />
            <span className="font-medium text-white text-sm">Now Playing:</span>
            <span className="truncate flex-1 text-slate-300 text-sm">{currentSongTitle}</span>
            <span className="text-xs text-slate-400">
              ends {formatTime(new Date(Date.now() + remainingCurrentSong * 1000))}
            </span>
          </div>
        )}

        {/* Queued Tracks */}
        <div className="space-y-1">
          {scheduledTracks.map((track, index) => {
            const trackEnd = new Date(new Date(track.startTime).getTime() + (track.duration * 1000));
            return (
              <div 
                key={track.id}
                className="flex items-center gap-2 p-2 bg-slate-800/50 rounded-lg group hover:bg-slate-800 transition-colors"
              >
                <GripVertical className="h-4 w-4 text-slate-500" />
                <span className="text-xs text-slate-400 w-20 flex-shrink-0">
                  {formatTime(new Date(track.startTime))}
                </span>
                <Music className="h-4 w-4 text-slate-500" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-white truncate block">{track.title}</span>
                  {track.artist && (
                    <span className="text-xs text-slate-500 truncate block">{track.artist}</span>
                  )}
                </div>
                <span className="text-xs text-slate-500">
                  {formatDuration(track.duration)}
                </span>
                <span className="text-xs text-slate-600">
                  → {formatTime(trackEnd)}
                </span>
                <button
                  onClick={() => removeTrack(track.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-destructive/20 rounded transition-all"
                >
                  <X className="h-3 w-3 text-destructive" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "border-2 border-dashed rounded-lg p-6 text-center transition-all",
            isDraggingOver 
              ? "border-emerald-500 bg-emerald-500/10" 
              : "border-slate-600 hover:border-slate-500 bg-slate-800/30"
          )}
        >
          <div className="flex flex-col items-center gap-2">
            <div className={cn(
              "p-3 rounded-full transition-colors",
              isDraggingOver ? "bg-emerald-500/20" : "bg-slate-700"
            )}>
              {isDraggingOver ? (
                <Plus className="h-6 w-6 text-emerald-400" />
              ) : (
                <Upload className="h-6 w-6 text-slate-400" />
              )}
            </div>
            <div>
              <p className={cn(
                "text-sm font-medium",
                isDraggingOver ? "text-emerald-400" : "text-slate-300"
              )}>
                {isDraggingOver ? "Drop to add to queue" : "Drop audio files here"}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {scheduledTracks.length === 0 
                  ? `Starts immediately after current song`
                  : `Next track starts at ${formatTime(getNextAvailableTime())}`
                }
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RadioScheduleTimeline;
