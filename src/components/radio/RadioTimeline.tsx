import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Clock, 
  Calendar, 
  Play, 
  Trash2,
  Volume2
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

  const timeSlots = generateTimeSlots();

  const handleDrop = (e: React.DragEvent, timeSlot: string) => {
    e.preventDefault();
    const trackData = e.dataTransfer.getData('application/json');
    
    if (trackData) {
      try {
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

        onTrackScheduled?.(scheduledTrack);
      } catch (error) {
        console.error('Error parsing dropped track data:', error);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const removeScheduledTrack = (timeSlot: string) => {
    setScheduledTracks(prev => 
      prev.filter(track => !(track.scheduledTime === timeSlot && track.scheduledDate === selectedDate))
    );
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
            />
            <Badge variant="outline" className="flex items-center gap-1">
              <Volume2 className="h-3 w-3" />
              {scheduledTracks.filter(t => t.scheduledDate === selectedDate).length} tracks scheduled
            </Badge>
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
            Drag MP3 tracks from the library above to schedule them on the timeline
          </p>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <div className="space-y-2">
              {timeSlots.map((timeSlot) => {
                const scheduledTrack = getScheduledTrack(timeSlot);
                
                return (
                  <div
                    key={timeSlot}
                    className={`flex items-center gap-4 p-3 border border-dashed border-border/50 rounded-lg transition-colors ${
                      scheduledTrack 
                        ? 'bg-primary/5 border-primary/30' 
                        : 'hover:bg-muted/30 hover:border-primary/20'
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
                        <div className="flex items-center justify-between bg-card/50 p-3 rounded-md border">
                          <div className="flex-1">
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
                          <div className="flex gap-2">
                            <Button size="sm" variant="ghost">
                              <Play className="h-3 w-3" />
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
                        <div className="p-8 text-center text-muted-foreground text-sm border-2 border-dashed border-border/30 rounded-md">
                          Drop MP3 track here to schedule for {timeSlot}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};