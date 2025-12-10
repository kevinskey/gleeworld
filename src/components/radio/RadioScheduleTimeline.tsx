import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import {
  Clock,
  Music,
  Plus,
  Trash2,
  GripVertical,
  ChevronLeft,
  ChevronRight,
  Play,
  Calendar,
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
}

export const RadioScheduleTimeline = ({ onRefresh }: RadioScheduleTimelineProps) => {
  const [scheduledTracks, setScheduledTracks] = useState<ScheduledTrack[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [dragOverHour, setDragOverHour] = useState<number | null>(null);
  const [viewOffset, setViewOffset] = useState(0); // hours offset from current time
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Fetch scheduled tracks
  useEffect(() => {
    fetchScheduledTracks();
  }, []);

  // Auto-scroll to current time on mount
  useEffect(() => {
    if (scrollRef.current) {
      const currentHour = currentTime.getHours();
      const scrollPosition = (currentHour - 2) * 120; // 120px per hour, offset by 2 hours
      scrollRef.current.scrollLeft = Math.max(0, scrollPosition);
    }
  }, []);

  const fetchScheduledTracks = async () => {
    try {
      // Load from localStorage for now (can be migrated to proper DB table later)
      const saved = localStorage.getItem('gw_radio_timeline_schedule');
      if (saved) {
        const parsed = JSON.parse(saved);
        setScheduledTracks(parsed.map((item: any) => ({
          ...item,
          startTime: new Date(item.startTime)
        })));
      }
    } catch (error) {
      console.error('Error fetching schedule:', error);
    }
  };

  const saveScheduledTracks = (tracks: ScheduledTrack[]) => {
    localStorage.setItem('gw_radio_timeline_schedule', JSON.stringify(tracks));
  };

  const handleDragOver = (e: React.DragEvent, hour: number) => {
    e.preventDefault();
    setIsDraggingOver(true);
    setDragOverHour(hour);
  };

  const handleDragLeave = () => {
    setIsDraggingOver(false);
    setDragOverHour(null);
  };

  const handleDrop = async (e: React.DragEvent, hour: number) => {
    e.preventDefault();
    setIsDraggingOver(false);
    setDragOverHour(null);

    // Handle file drops
    const files = Array.from(e.dataTransfer.files);
    const audioFile = files.find(f => f.type.startsWith('audio/'));

    if (audioFile) {
      // Schedule the dropped audio file
      const scheduledTime = new Date();
      scheduledTime.setHours(hour, 0, 0, 0);
      if (hour < currentTime.getHours()) {
        scheduledTime.setDate(scheduledTime.getDate() + 1);
      }

      try {
        // Upload file to storage
        const fileName = `radio-schedule/${Date.now()}-${audioFile.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('audio-files')
          .upload(fileName, audioFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('audio-files')
          .getPublicUrl(fileName);

        // Create schedule entry locally
        const newTrack: ScheduledTrack = {
          id: crypto.randomUUID(),
          title: audioFile.name.replace(/\.[^/.]+$/, ''),
          startTime: scheduledTime,
          duration: 180,
          audioUrl: urlData.publicUrl,
          category: 'scheduled'
        };

        const updatedTracks = [...scheduledTracks, newTrack];
        setScheduledTracks(updatedTracks);
        saveScheduledTracks(updatedTracks);

        toast({ title: "Scheduled", description: `${audioFile.name} scheduled for ${formatHour(hour)}` });
        onRefresh?.();
      } catch (error) {
        console.error('Error scheduling track:', error);
        toast({ title: "Error", description: "Failed to schedule track", variant: "destructive" });
      }
    }

    // Handle JSON data (internal drag)
    try {
      const trackData = e.dataTransfer.getData('application/json');
      if (trackData) {
        const track = JSON.parse(trackData);
        const scheduledTime = new Date();
        scheduledTime.setHours(hour, 0, 0, 0);
        if (hour < currentTime.getHours()) {
          scheduledTime.setDate(scheduledTime.getDate() + 1);
        }

        const newTrack: ScheduledTrack = {
          id: crypto.randomUUID(),
          title: track.title,
          artist: track.artist,
          startTime: scheduledTime,
          duration: track.duration || 180,
          audioUrl: track.audioUrl,
          category: track.category || 'scheduled'
        };

        const updatedTracks = [...scheduledTracks, newTrack];
        setScheduledTracks(updatedTracks);
        saveScheduledTracks(updatedTracks);

        toast({ title: "Scheduled", description: `${track.title} scheduled for ${formatHour(hour)}` });
        onRefresh?.();
      }
    } catch (error) {
      // Not JSON data, ignore
    }
  };

  const handleRemoveTrack = (trackId: string) => {
    const updatedTracks = scheduledTracks.filter(t => t.id !== trackId);
    setScheduledTracks(updatedTracks);
    saveScheduledTracks(updatedTracks);
    toast({ title: "Removed", description: "Track removed from schedule" });
  };

  const formatHour = (hour: number) => {
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:00 ${ampm}`;
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTracksForHour = (hour: number) => {
    return scheduledTracks.filter(track => {
      const trackHour = track.startTime.getHours();
      return trackHour === hour;
    });
  };

  const currentHour = currentTime.getHours();
  const currentMinute = currentTime.getMinutes();

  // Generate 24 hours centered around current time
  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <Card className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-slate-700">
      <CardHeader className="py-3 px-4 border-b border-slate-700 bg-slate-900/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20">
              <Calendar className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-white">Schedule Timeline</CardTitle>
              <p className="text-xs text-slate-400">Drag & drop audio files to schedule</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
              <Clock className="h-3 w-3 mr-1" />
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4">
        {/* Timeline */}
        <div className="relative">
          {/* Drop zone indicator */}
          {isDraggingOver && (
            <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary rounded-lg z-10 flex items-center justify-center pointer-events-none">
              <div className="bg-slate-900/90 px-4 py-2 rounded-lg">
                <p className="text-primary font-medium flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Drop to schedule at {dragOverHour !== null ? formatHour(dragOverHour) : 'selected time'}
                </p>
              </div>
            </div>
          )}

          {/* Timeline scroll container */}
          <div 
            ref={scrollRef}
            className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800"
          >
            <div className="min-w-[2880px] relative"> {/* 24 hours * 120px */}
              {/* Hour markers */}
              <div className="flex border-b border-slate-700">
                {hours.map(hour => (
                  <div 
                    key={hour} 
                    className={cn(
                      "w-[120px] flex-shrink-0 py-2 px-2 text-center border-r border-slate-700/50",
                      hour === currentHour && "bg-primary/10"
                    )}
                  >
                    <span className={cn(
                      "text-xs font-medium",
                      hour === currentHour ? "text-primary" : "text-slate-400"
                    )}>
                      {formatHour(hour)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Timeline track area */}
              <div className="flex relative min-h-[120px]">
                {/* Current time indicator */}
                <div 
                  className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20"
                  style={{ left: `${(currentHour * 120) + (currentMinute * 2)}px` }}
                >
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-red-500 rounded-full" />
                </div>

                {hours.map(hour => {
                  const tracksAtHour = getTracksForHour(hour);
                  const isPast = hour < currentHour;
                  
                  return (
                    <div
                      key={hour}
                      className={cn(
                        "w-[120px] flex-shrink-0 border-r border-slate-700/30 p-1 min-h-[120px]",
                        "transition-colors duration-200",
                        isPast && "bg-slate-900/50 opacity-60",
                        dragOverHour === hour && "bg-primary/20",
                        hour === currentHour && "bg-emerald-500/5"
                      )}
                      onDragOver={(e) => handleDragOver(e, hour)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, hour)}
                    >
                      {tracksAtHour.length > 0 ? (
                        <div className="space-y-1">
                          {tracksAtHour.map(track => (
                            <div
                              key={track.id}
                              className={cn(
                                "group relative bg-slate-800 rounded p-2 border border-slate-700",
                                "hover:border-primary/50 transition-colors cursor-pointer"
                              )}
                              draggable
                              onDragStart={(e) => {
                                e.dataTransfer.setData('application/json', JSON.stringify(track));
                              }}
                            >
                              <div className="flex items-start gap-1">
                                <GripVertical className="h-3 w-3 text-slate-500 flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium text-white truncate">{track.title}</p>
                                  {track.artist && (
                                    <p className="text-[10px] text-slate-400 truncate">{track.artist}</p>
                                  )}
                                  <p className="text-[10px] text-slate-500">{formatDuration(track.duration)}</p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveTrack(track.id);
                                  }}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="h-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                          <div className="text-slate-600 text-xs text-center">
                            <Plus className="h-4 w-4 mx-auto mb-1" />
                            Drop here
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Scroll buttons */}
          <div className="absolute left-2 top-1/2 -translate-y-1/2 z-10">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0 bg-slate-800 border-slate-600 hover:bg-slate-700"
              onClick={() => {
                if (scrollRef.current) {
                  scrollRef.current.scrollLeft -= 240;
                }
              }}
            >
              <ChevronLeft className="h-4 w-4 text-white" />
            </Button>
          </div>
          <div className="absolute right-2 top-1/2 -translate-y-1/2 z-10">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0 bg-slate-800 border-slate-600 hover:bg-slate-700"
              onClick={() => {
                if (scrollRef.current) {
                  scrollRef.current.scrollLeft += 240;
                }
              }}
            >
              <ChevronRight className="h-4 w-4 text-white" />
            </Button>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-3 flex items-center justify-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 bg-red-500 rounded-full" />
            Current Time
          </span>
          <span className="flex items-center gap-1">
            <Upload className="h-3 w-3" />
            Drag audio files to schedule
          </span>
        </div>
      </CardContent>
    </Card>
  );
};