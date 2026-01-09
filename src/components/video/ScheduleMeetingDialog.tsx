import React, { useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Clock, Video } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface ScheduleMeetingDialogProps {
  onMeetingScheduled?: () => void;
}

export const ScheduleMeetingDialog: React.FC<ScheduleMeetingDialogProps> = ({ 
  onMeetingScheduled 
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState<Date>();
  const [time, setTime] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('60');

  const generateRoomName = (meetingTitle: string) => {
    const sanitized = meetingTitle
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
    return `${sanitized}-${Date.now().toString(36)}`;
  };

  const handleSchedule = async () => {
    if (!user || !date || !time || !title.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Combine date and time
      const [hours, minutes] = time.split(':').map(Number);
      const scheduledAt = new Date(date);
      scheduledAt.setHours(hours, minutes, 0, 0);

      // Check if scheduled time is in the future
      if (scheduledAt <= new Date()) {
        toast({
          title: 'Invalid Time',
          description: 'Please select a future date and time',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      const roomName = generateRoomName(title);

      const { error } = await supabase
        .from('scheduled_meetings')
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          room_name: roomName,
          scheduled_at: scheduledAt.toISOString(),
          duration_minutes: parseInt(duration),
          created_by: user.id,
        });

      if (error) throw error;

      toast({
        title: 'Meeting Scheduled',
        description: `${title} scheduled for ${format(scheduledAt, 'PPP')} at ${time}`,
      });

      // Reset form
      setTitle('');
      setDescription('');
      setDate(undefined);
      setTime('');
      setDuration('60');
      setOpen(false);
      onMeetingScheduled?.();
    } catch (error: any) {
      console.error('Error scheduling meeting:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to schedule meeting',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Card className="cursor-pointer hover:border-primary transition-colors">
          <CardContent className="pt-6 text-center">
            <div className="w-12 h-12 rounded-full bg-accent/50 flex items-center justify-center mx-auto mb-4">
              <CalendarIcon className="h-6 w-6 text-foreground" />
            </div>
            <h3 className="font-semibold mb-1">Schedule Meeting</h3>
            <p className="text-sm text-muted-foreground">Plan a meeting for later</p>
          </CardContent>
        </Card>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Schedule a Meeting</DialogTitle>
          <DialogDescription>
            Create a scheduled video meeting. Participants can join at the scheduled time.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="meeting-title">Meeting Title *</Label>
            <Input
              id="meeting-title"
              placeholder="e.g., Weekly Rehearsal Check-in"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="meeting-description">Description</Label>
            <Textarea
              id="meeting-description"
              placeholder="Meeting agenda or notes..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !date && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                    initialFocus
                    className={cn('p-3 pointer-events-auto')}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="meeting-time">Time *</Label>
              <Input
                id="meeting-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Duration</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="45">45 minutes</SelectItem>
                <SelectItem value="60">1 hour</SelectItem>
                <SelectItem value="90">1.5 hours</SelectItem>
                <SelectItem value="120">2 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleSchedule}
            disabled={loading || !title.trim() || !date || !time}
            className="w-full"
          >
            <Video className="h-4 w-4 mr-2" />
            {loading ? 'Scheduling...' : 'Schedule Meeting'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
