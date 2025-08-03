import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, Calendar, Music } from 'lucide-react';

interface TimeSlot24 {
  id: string;
  time: string;
  hour: number;
  minute: number;
  track: any | null;
  isCurrentHour: boolean;
}

interface Timeline24HourProps {
  timeSlots: Array<{
    id: string;
    time: string;
    track: any | null;
    isCurrentlyPlaying: boolean;
  }>;
}

export const Timeline24Hour = ({ timeSlots }: Timeline24HourProps) => {
  const [slots24Hour, setSlots24Hour] = useState<TimeSlot24[]>([]);

  useEffect(() => {
    const now = new Date();
    const currentHour = now.getHours();
    const slots: TimeSlot24[] = [];
    
    // Generate 24 hours of slots (every 30 minutes = 48 slots)
    for (let i = 0; i < 48; i++) {
      const hour = Math.floor(i / 2);
      const minute = (i % 2) * 30;
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      
      slots.push({
        id: `slot-24h-${i}`,
        time: timeString,
        hour,
        minute,
        track: null,
        isCurrentHour: hour === currentHour
      });
    }
    
    setSlots24Hour(slots);
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          24 Hour View
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            24 Hour Radio Schedule
            <Badge variant="secondary">Full Day View</Badge>
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[60vh]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {slots24Hour.map((slot) => (
              <div
                key={slot.id}
                className={`p-4 rounded-lg border transition-all min-h-[80px] ${
                  slot.isCurrentHour
                    ? 'border-green-500 bg-green-50 shadow-lg ring-2 ring-green-200'
                    : slot.track
                      ? 'border-primary bg-primary/5'
                      : 'border-muted-foreground/20 bg-muted/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-center">
                      <div className={`text-sm font-mono ${slot.isCurrentHour ? 'text-green-700 font-bold' : 'text-muted-foreground'}`}>
                        {slot.time}
                      </div>
                      {slot.isCurrentHour && (
                        <Badge variant="secondary" className="text-xs mt-1 bg-green-100 text-green-700">
                          CURRENT
                        </Badge>
                      )}
                    </div>
                    
                    {slot.track ? (
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Music className="h-4 w-4 text-primary" />
                          <div>
                            <p className="font-medium text-sm">{slot.track.title}</p>
                            <p className="text-xs text-muted-foreground">{slot.track.artist}</p>
                            <p className="text-xs text-muted-foreground">{formatDuration(slot.track.duration)}</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 text-center">
                        <p className="text-muted-foreground text-sm">No track scheduled</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};