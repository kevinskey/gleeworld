import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Clock, 
  Calendar, 
  Play, 
  Pause,
  Trash2,
  Volume2,
  Save,
  Loader2
} from 'lucide-react';

interface AudioTrack {
  id: string;
  title: string;
  artist_info: string | null;
  audio_url: string;
  category: string;
  duration_seconds: number | null;
  play_count: number;
  is_public: boolean;
  created_at: string;
}

interface ScheduledTrack extends AudioTrack {
  scheduledTime: string;
  scheduledDate: string;
}

interface RadioTimelineProps {
  onTrackScheduled?: (track: ScheduledTrack) => void;
}

export const RadioTimeline = ({ onTrackScheduled }: RadioTimelineProps) => {
  const [scheduledTracks, setScheduledTracks] = useState<ScheduledTrack[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  // Load scheduled tracks for the selected date
  const loadScheduledTracks = async (date: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('radio_schedule')
        .select('*')
        .eq('scheduled_date', date)
        .order('scheduled_time');

      if (error) throw error;

      // Transform database records to ScheduledTrack format
      const tracks: ScheduledTrack[] = data?.map(record => ({
        id: record.track_id,
        title: record.title,
        artist_info: record.artist_info,
        audio_url: record.audio_url,
        category: record.category || 'performance',
        duration_seconds: record.duration_seconds,
        play_count: 0,
        is_public: true,
        created_at: record.created_at,
        scheduledTime: record.scheduled_time,
        scheduledDate: record.scheduled_date
      })) || [];

      setScheduledTracks(tracks);
    } catch (error) {
      console.error('Error loading scheduled tracks:', error);
      toast({
        title: "Error Loading Schedule",
        description: "Failed to load scheduled tracks for this date",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Save a scheduled track to database
  const saveScheduledTrack = async (scheduledTrack: ScheduledTrack) => {
    setIsSaving(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('radio_schedule')
        .upsert({
          track_id: scheduledTrack.id,
          scheduled_date: scheduledTrack.scheduledDate,
          scheduled_time: scheduledTrack.scheduledTime,
          title: scheduledTrack.title,
          artist_info: scheduledTrack.artist_info,
          audio_url: scheduledTrack.audio_url,
          duration_seconds: scheduledTrack.duration_seconds,
          category: scheduledTrack.category,
          created_by: user.user.id
        }, {
          onConflict: 'scheduled_date,scheduled_time'
        });

      if (error) throw error;

      toast({
        title: "Schedule Updated",
        description: `"${scheduledTrack.title}" scheduled for ${scheduledTrack.scheduledTime}`,
      });
    } catch (error) {
      console.error('Error saving scheduled track:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save track to schedule",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Remove a scheduled track from database
  const removeScheduledTrackFromDB = async (timeSlot: string) => {
    try {
      const { error } = await supabase
        .from('radio_schedule')
        .delete()
        .eq('scheduled_date', selectedDate)
        .eq('scheduled_time', timeSlot);

      if (error) throw error;

      toast({
        title: "Track Removed",
        description: `Track removed from ${timeSlot}`,
      });
    } catch (error) {
      console.error('Error removing scheduled track:', error);
      toast({
        title: "Remove Failed",
        description: "Failed to remove track from schedule",
        variant: "destructive"
      });
    }
  };

  // Set up real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('radio-schedule-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'radio_schedule'
        },
        (payload) => {
          console.log('Real-time schedule update:', payload);
          // Reload the current date's schedule when changes occur
          loadScheduledTracks(selectedDate);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedDate]);

  // Load tracks when date changes
  useEffect(() => {
    loadScheduledTracks(selectedDate);
  }, [selectedDate]);

  // Generate time slots for 24 hours (every 30 minutes)
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(timeString);
      }
    }
    return slots;
  };

  const handlePlayToggle = (track: ScheduledTrack) => {
    if (currentlyPlaying === track.id) {
      // Stop current track
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setCurrentlyPlaying(null);
    } else {
      // Play new track
      if (audioRef.current) {
        audioRef.current.pause();
      }
      
      const audio = new Audio(track.audio_url);
      audioRef.current = audio;
      
      audio.play().then(() => {
        setCurrentlyPlaying(track.id);
      }).catch((error) => {
        console.error('Error playing audio:', error);
        toast({
          title: "Playback Error",
          description: "Failed to play the audio track",
          variant: "destructive"
        });
      });
      
      // Handle audio end
      audio.onended = () => {
        setCurrentlyPlaying(null);
      };
      
      // Handle audio error
      audio.onerror = () => {
        setCurrentlyPlaying(null);
        toast({
          title: "Audio Error",
          description: "Failed to load the audio file",
          variant: "destructive"
        });
      };
    }
  };

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const timeSlots = generateTimeSlots();

  const handleDrop = async (e: React.DragEvent, timeSlot: string) => {
    e.preventDefault();
    const trackData = e.dataTransfer.getData('application/json');
    const dragType = e.dataTransfer.getData('text/plain');
    
    if (trackData) {
      try {
        if (dragType === 'scheduled-track') {
          // Handle moving existing scheduled track
          const scheduledTrack: ScheduledTrack = JSON.parse(trackData);
          const oldTimeSlot = scheduledTrack.scheduledTime;
          
          // Don't do anything if dropped on the same slot
          if (oldTimeSlot === timeSlot) return;
          
          // Update the track with new time slot
          const updatedTrack = {
            ...scheduledTrack,
            scheduledTime: timeSlot
          };
          
          // Check if target slot is occupied
          const existingTrack = scheduledTracks.find(
            t => t.scheduledTime === timeSlot && t.scheduledDate === selectedDate
          );
          
          if (existingTrack) {
            // Swap tracks if target slot is occupied
            const swappedTrack = {
              ...existingTrack,
              scheduledTime: oldTimeSlot
            };
            
            setScheduledTracks(prev => prev.map(t => {
              if (t.scheduledTime === oldTimeSlot && t.scheduledDate === selectedDate) {
                return updatedTrack;
              }
              if (t.scheduledTime === timeSlot && t.scheduledDate === selectedDate) {
                return swappedTrack;
              }
              return t;
            }));
            
            // Save both tracks to database
            await saveScheduledTrack(updatedTrack);
            await saveScheduledTrack(swappedTrack);
            
            toast({
              title: "Tracks Swapped",
              description: `"${updatedTrack.title}" moved to ${timeSlot}, "${swappedTrack.title}" moved to ${oldTimeSlot}`,
            });
          } else {
            // Move to empty slot
            setScheduledTracks(prev => prev.map(t => 
              t.scheduledTime === oldTimeSlot && t.scheduledDate === selectedDate 
                ? updatedTrack 
                : t
            ));
            
            // Remove from old slot and save to new slot
            await removeScheduledTrackFromDB(oldTimeSlot);
            await saveScheduledTrack(updatedTrack);
            
            toast({
              title: "Track Moved",
              description: `"${updatedTrack.title}" moved to ${timeSlot}`,
            });
          }
        } else {
          // Handle new track from library
          const track: AudioTrack = JSON.parse(trackData);
          const scheduledTrack: ScheduledTrack = {
            ...track,
            scheduledTime: timeSlot,
            scheduledDate: selectedDate
          };

          // Check if slot is already occupied
          const existingTrack = scheduledTracks.find(
            t => t.scheduledTime === timeSlot && t.scheduledDate === selectedDate
          );

          if (existingTrack) {
            // Replace existing track
            setScheduledTracks(prev => prev.map(t => 
              t.scheduledTime === timeSlot && t.scheduledDate === selectedDate 
                ? scheduledTrack 
                : t
            ));
          } else {
            // Add new track
            setScheduledTracks(prev => [...prev, scheduledTrack]);
          }

          // Save to database
          await saveScheduledTrack(scheduledTrack);
          onTrackScheduled?.(scheduledTrack);
        }
      } catch (error) {
        console.error('Error handling drop:', error);
        toast({
          title: "Drop Failed",
          description: "Failed to schedule track",
          variant: "destructive"
        });
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleScheduledTrackDragStart = (e: React.DragEvent, track: ScheduledTrack) => {
    e.dataTransfer.setData('application/json', JSON.stringify(track));
    e.dataTransfer.setData('text/plain', 'scheduled-track');
    e.dataTransfer.effectAllowed = 'move';
  };

  const removeScheduledTrack = async (timeSlot: string) => {
    // Remove from local state
    setScheduledTracks(prev => 
      prev.filter(track => !(track.scheduledTime === timeSlot && track.scheduledDate === selectedDate))
    );
    
    // Remove from database
    await removeScheduledTrackFromDB(timeSlot);
  };

  const getScheduledTrack = (timeSlot: string) => {
    return scheduledTracks.find(
      track => track.scheduledTime === timeSlot && track.scheduledDate === selectedDate
    );
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'Unknown';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'performance': return 'bg-blue-100 text-blue-800';
      case 'announcement': return 'bg-green-100 text-green-800';
      case 'interlude': return 'bg-purple-100 text-purple-800';
      case 'alumni_story': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4">
      {/* Date Selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Broadcast Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">Date:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 border border-border rounded-md bg-background"
              disabled={isLoading}
            />
            <Badge variant="outline" className="flex items-center gap-1">
              <Volume2 className="h-3 w-3" />
              {scheduledTracks.filter(t => t.scheduledDate === selectedDate).length} tracks scheduled
            </Badge>
            {isSaving && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Saving...
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Timeline - {selectedDate}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Drag MP3 tracks from the library above to schedule them on the timeline. Changes are saved automatically.
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-[200px]">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading schedule...</span>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
            <div className="space-y-2">
              {timeSlots.map((timeSlot) => {
                const scheduledTrack = getScheduledTrack(timeSlot);
                
                return (
                  <div
                    key={timeSlot}
                    className={`flex items-center gap-4 p-3 border-2 border-dashed rounded-lg transition-all duration-200 ${
                      scheduledTrack 
                        ? 'bg-primary/5 border-primary/30' 
                        : 'border-border/50 hover:bg-muted/30 hover:border-primary/20'
                    }`}
                    onDrop={(e) => handleDrop(e, timeSlot)}
                    onDragOver={handleDragOver}
                  >
                    {/* Time Label */}
                    <div className="w-16 flex-shrink-0">
                      <Badge variant="outline" className="font-mono">
                        {timeSlot}
                      </Badge>
                    </div>

                    {/* Track Slot */}
                    <div className="flex-1">
                      {scheduledTrack ? (
                        <div 
                          className="flex items-center justify-between bg-card/50 p-3 rounded-md border cursor-move hover:bg-card/70 transition-colors"
                          draggable
                          onDragStart={(e) => handleScheduledTrackDragStart(e, scheduledTrack)}
                        >
                          <div className="flex-1 pointer-events-none">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium text-sm">{scheduledTrack.title}</h4>
                              <Badge className={getCategoryColor(scheduledTrack.category)}>
                                {scheduledTrack.category}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Artist: {scheduledTrack.artist_info || 'Unknown'} • 
                              Duration: {formatDuration(scheduledTrack.duration_seconds)}
                            </p>
                          </div>
                          <div className="flex gap-2 pointer-events-auto">
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => handlePlayToggle(scheduledTrack)}
                              className={currentlyPlaying === scheduledTrack.id ? "bg-primary/10 text-primary" : ""}
                            >
                              {currentlyPlaying === scheduledTrack.id ? (
                                <Pause className="h-3 w-3" />
                              ) : (
                                <Play className="h-3 w-3" />
                              )}
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => removeScheduledTrack(timeSlot)}
                              className="hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-8 text-center text-muted-foreground text-sm border-2 border-dashed border-border/30 rounded-md transition-colors hover:border-primary/40">
                          Drop MP3 track here to schedule for {timeSlot}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};