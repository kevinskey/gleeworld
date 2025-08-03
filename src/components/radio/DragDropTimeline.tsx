import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, Play, Pause, Music, Disc } from 'lucide-react';
import { useMusic } from '@/hooks/useMusic';

interface TimeSlot {
  id: string;
  time: string;
  track: any | null;
  isCurrentlyPlaying: boolean;
}

interface DragDropTimelineProps {
  onTrackPlay: (track: any) => void;
  currentTrack: any | null;
  isPlaying: boolean;
  onGetNextTrack: React.MutableRefObject<(() => any | null) | null>;
  onUpdateCurrentSlot: (slotId: string) => void;
}

export const DragDropTimeline = ({ onTrackPlay, currentTrack, isPlaying, onGetNextTrack, onUpdateCurrentSlot }: DragDropTimelineProps) => {
  const { tracks, loading } = useMusic();
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [draggedTrack, setDraggedTrack] = useState<any | null>(null);
  const [currentSlotIndex, setCurrentSlotIndex] = useState(0);

  // Generate time slots for the next 3 hours in 5-minute intervals
  useEffect(() => {
    const now = new Date();
    const slots: TimeSlot[] = [];
    
    for (let i = 0; i < 36; i++) { // 36 slots = 3 hours
      const slotTime = new Date(now.getTime() + i * 5 * 60 * 1000);
      const timeString = slotTime.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
      
      slots.push({
        id: `slot-${i}`,
        time: timeString,
        track: null,
        isCurrentlyPlaying: i === 0 // First slot is currently playing
      });
    }
    
    setTimeSlots(slots);
    setCurrentSlotIndex(0);
  }, []);

  const handleDragStart = (e: React.DragEvent, track: any) => {
    setDraggedTrack(track);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, slotId: string) => {
    e.preventDefault();
    
    if (draggedTrack) {
      setTimeSlots(prev => prev.map(slot => 
        slot.id === slotId 
          ? { ...slot, track: draggedTrack }
          : slot
      ));
      setDraggedTrack(null);
    }
  };

  const handleSlotClick = (slot: TimeSlot) => {
    if (slot.track) {
      onTrackPlay(slot.track);
      // Update which slot is currently playing
      const slotIndex = timeSlots.findIndex(s => s.id === slot.id);
      updateCurrentPlayingSlot(slotIndex);
    }
  };

  const updateCurrentPlayingSlot = (index: number) => {
    setCurrentSlotIndex(index);
    setTimeSlots(prev => prev.map((s, i) => ({
      ...s,
      isCurrentlyPlaying: i === index
    })));
    onUpdateCurrentSlot(timeSlots[index]?.id || '');
  };

  // Function to get the next track in the loop
  const getNextTrackInLoop = () => {
    const tracksWithIndexes = timeSlots
      .map((slot, index) => ({ slot, index }))
      .filter(({ slot }) => slot.track !== null);
    
    if (tracksWithIndexes.length === 0) return null;
    
    // Find next track after current slot
    const nextTrackData = tracksWithIndexes.find(({ index }) => index > currentSlotIndex);
    
    // If no next track found, loop back to the first track
    const trackToPlay = nextTrackData || tracksWithIndexes[0];
    
    return {
      track: trackToPlay.slot.track,
      slotIndex: trackToPlay.index
    };
  };

  // Expose the next track function to parent
  React.useEffect(() => {
    if (onGetNextTrack) {
      onGetNextTrack.current = () => {
        const nextData = getNextTrackInLoop();
        if (nextData) {
          updateCurrentPlayingSlot(nextData.slotIndex);
          return nextData.track;
        }
        return null;
      };
    }
  }, [timeSlots, currentSlotIndex, onGetNextTrack]);

  const removeTrackFromSlot = (slotId: string) => {
    setTimeSlots(prev => prev.map(slot => 
      slot.id === slotId 
        ? { ...slot, track: null }
        : slot
    ));
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* MP3 Library - Draggable List */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            Music Library
            <Badge variant="outline">{tracks.length} tracks</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            {loading ? (
              <div className="text-center py-8">Loading tracks...</div>
            ) : (
              <div className="space-y-2">
                {tracks.map((track) => (
                  <div
                    key={track.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, track)}
                    className="p-3 bg-muted/50 rounded-lg cursor-grab active:cursor-grabbing hover:bg-muted transition-colors border border-transparent hover:border-primary/20"
                  >
                    <div className="flex items-center gap-3">
                      <Disc className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{track.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
                        <p className="text-xs text-muted-foreground">{formatDuration(track.duration)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Timeline - Drop Zone */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Radio Timeline
            <Badge variant="secondary">Live Schedule</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <div className="space-y-2">
              {timeSlots.map((slot, index) => (
                <div
                  key={slot.id}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, slot.id)}
                  onClick={() => handleSlotClick(slot)}
                  className={`p-4 rounded-lg border-2 border-dashed transition-all cursor-pointer min-h-[80px] ${
                    slot.isCurrentlyPlaying 
                      ? 'border-green-500 bg-green-50 shadow-lg ring-2 ring-green-200' 
                      : slot.track 
                        ? 'border-primary bg-primary/5 hover:bg-primary/10' 
                        : 'border-muted-foreground/20 hover:border-primary/50 hover:bg-muted/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-center">
                        <div className={`text-sm font-mono ${slot.isCurrentlyPlaying ? 'text-green-700 font-bold' : 'text-muted-foreground'}`}>
                          {slot.time}
                        </div>
                        {slot.isCurrentlyPlaying && (
                          <Badge variant="secondary" className="text-xs mt-1 bg-green-100 text-green-700">
                            NOW PLAYING
                          </Badge>
                        )}
                      </div>
                      
                      {slot.track ? (
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            {slot.isCurrentlyPlaying && isPlaying ? (
                              <Play className="h-4 w-4 text-green-600" />
                            ) : (
                              <Music className="h-4 w-4 text-primary" />
                            )}
                            <div>
                              <p className="font-medium text-sm">{slot.track.title}</p>
                              <p className="text-xs text-muted-foreground">{slot.track.artist}</p>
                              <p className="text-xs text-muted-foreground">{formatDuration(slot.track.duration)}</p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 text-center">
                          <p className="text-muted-foreground text-sm">Drop a track here</p>
                        </div>
                      )}
                    </div>
                    
                    {slot.track && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeTrackFromSlot(slot.id);
                        }}
                        className="text-xs"
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};