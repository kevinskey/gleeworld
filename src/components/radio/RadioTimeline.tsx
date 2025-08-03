import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Clock, 
  Play, 
  Pause, 
  Music, 
  Calendar,
  RotateCcw,
  Save
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  duration: number;
  audio_url: string;
  category?: string;
}

interface TimeSlot {
  id: string;
  startTime: Date;
  endTime: Date;
  track?: MusicTrack;
  duration: number; // in minutes
}

interface RadioTimelineProps {
  playlist: MusicTrack[];
  onScheduleUpdate?: (schedule: TimeSlot[]) => void;
  currentTrack?: string;
  isPlaying?: boolean;
}

export const RadioTimeline = ({ 
  playlist, 
  onScheduleUpdate, 
  currentTrack, 
  isPlaying 
}: RadioTimelineProps) => {
  const [schedule, setSchedule] = useState<TimeSlot[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [draggedTrack, setDraggedTrack] = useState<MusicTrack | null>(null);
  const [startTime, setStartTime] = useState(new Date());
  const { toast } = useToast();
  const timelineRef = useRef<HTMLDivElement>(null);

  // Generate time slots for next 4 hours in 5-minute intervals
  useEffect(() => {
    generateTimeSlots();
  }, [startTime]);

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const generateTimeSlots = () => {
    const slots: TimeSlot[] = [];
    const totalSlots = 48; // 4 hours * 12 slots per hour (5-minute intervals)
    
    for (let i = 0; i < totalSlots; i++) {
      const slotStart = new Date(startTime.getTime() + (i * 5 * 60 * 1000));
      const slotEnd = new Date(slotStart.getTime() + (5 * 60 * 1000));
      
      slots.push({
        id: `slot-${i}`,
        startTime: slotStart,
        endTime: slotEnd,
        duration: 5
      });
    }
    
    setSchedule(slots);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDragStart = (track: MusicTrack) => {
    setDraggedTrack(track);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, slotId: string) => {
    e.preventDefault();
    
    if (!draggedTrack) return;

    const updatedSchedule = schedule.map(slot => {
      if (slot.id === slotId) {
        return { ...slot, track: draggedTrack };
      }
      return slot;
    });

    setSchedule(updatedSchedule);
    setDraggedTrack(null);
    
    if (onScheduleUpdate) {
      onScheduleUpdate(updatedSchedule);
    }

    toast({
      title: "Track Scheduled",
      description: `"${draggedTrack.title}" scheduled for ${formatTime(updatedSchedule.find(s => s.id === slotId)?.startTime || new Date())}`,
    });
  };

  const removeTrackFromSlot = (slotId: string) => {
    const updatedSchedule = schedule.map(slot => {
      if (slot.id === slotId) {
        return { ...slot, track: undefined };
      }
      return slot;
    });

    setSchedule(updatedSchedule);
    
    if (onScheduleUpdate) {
      onScheduleUpdate(updatedSchedule);
    }
  };

  const isCurrentTimeSlot = (slot: TimeSlot) => {
    return currentTime >= slot.startTime && currentTime < slot.endTime;
  };

  const isPastTimeSlot = (slot: TimeSlot) => {
    return currentTime > slot.endTime;
  };

  const resetTimeline = () => {
    setStartTime(new Date());
    generateTimeSlots();
    toast({
      title: "Timeline Reset",
      description: "Timeline has been reset to current time",
    });
  };

  const autoSchedulePlaylist = () => {
    if (playlist.length === 0) {
      toast({
        title: "No Tracks",
        description: "Add tracks to the playlist first",
        variant: "destructive",
      });
      return;
    }

    const updatedSchedule = [...schedule];
    let trackIndex = 0;
    
    // Find the first available slot (current time or later)
    const availableSlots = updatedSchedule.filter(slot => 
      !isPastTimeSlot(slot) && !slot.track
    );

    availableSlots.forEach((slot, index) => {
      if (trackIndex < playlist.length) {
        slot.track = playlist[trackIndex];
        trackIndex++;
      }
    });

    setSchedule(updatedSchedule);
    
    if (onScheduleUpdate) {
      onScheduleUpdate(updatedSchedule);
    }

    toast({
      title: "Auto-Scheduled",
      description: `${Math.min(playlist.length, availableSlots.length)} tracks scheduled`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-brand-600" />
            Radio Timeline - 5 Minute Intervals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button 
              onClick={resetTimeline}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset to Now
            </Button>
            <Button 
              onClick={autoSchedulePlaylist}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Calendar className="h-4 w-4" />
              Auto-Schedule Playlist
            </Button>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              Current Time: {formatTime(currentTime)}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Playlist Tracks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Music className="h-5 w-5 text-brand-600" />
              Available Tracks ({playlist.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              {playlist.length > 0 ? (
                <div className="space-y-2">
                  {playlist.map((track) => (
                    <div
                      key={track.id}
                      draggable
                      onDragStart={() => handleDragStart(track)}
                      className="p-3 border border-border rounded-lg cursor-move hover:bg-accent hover:border-brand-300 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Music className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{track.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {formatDuration(track.duration)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Music className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No tracks in playlist</p>
                  <p className="text-xs text-muted-foreground">Add tracks to start scheduling</p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-brand-600" />
              Schedule Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96" ref={timelineRef}>
              <div className="space-y-1">
                {schedule.map((slot) => (
                  <div
                    key={slot.id}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, slot.id)}
                    className={`
                      p-3 border rounded-lg transition-all
                      ${isCurrentTimeSlot(slot) 
                        ? 'border-brand-500 bg-brand-50 shadow-md' 
                        : isPastTimeSlot(slot)
                        ? 'border-muted bg-muted/50 opacity-60'
                        : 'border-border hover:border-brand-300 hover:bg-accent/50'
                      }
                      ${!slot.track ? 'border-dashed' : ''}
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="text-sm font-medium min-w-0">
                          {formatTime(slot.startTime)}
                          <span className="text-xs text-muted-foreground ml-1">
                            - {formatTime(slot.endTime)}
                          </span>
                        </div>
                        
                        {slot.track ? (
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Play className="h-3 w-3 text-brand-600" />
                              <div className="min-w-0">
                                <p className="font-medium text-sm truncate">{slot.track.title}</p>
                                <p className="text-xs text-muted-foreground truncate">{slot.track.artist}</p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex-1 text-center text-muted-foreground text-sm py-2 border-2 border-dashed border-muted rounded">
                            Drop track here
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {isCurrentTimeSlot(slot) && (
                          <Badge variant="default" className="bg-brand-500 text-xs">
                            Now Playing
                          </Badge>
                        )}
                        {slot.track && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeTrackFromSlot(slot.id)}
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                          >
                            ×
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Timeline Legend */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-dashed border-muted rounded"></div>
              <span className="text-muted-foreground">Empty Slot</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border border-brand-500 bg-brand-50 rounded"></div>
              <span className="text-muted-foreground">Current Time</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border border-muted bg-muted/50 rounded"></div>
              <span className="text-muted-foreground">Past Time</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border border-border rounded"></div>
              <span className="text-muted-foreground">Scheduled</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};