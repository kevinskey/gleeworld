import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  FileText, Users, ListChecks, MessageSquare, CheckCircle2, 
  Plus, X, Save, Clock, User
} from 'lucide-react';
import { useMeetingNotes } from '@/hooks/useMeetingNotes';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface MeetingNotesPanelProps {
  roomName: string;
  className?: string;
}

export const MeetingNotesPanel: React.FC<MeetingNotesPanelProps> = ({
  roomName,
  className
}) => {
  const { 
    notes, 
    loading, 
    saving, 
    updateField, 
    addAttendee, 
    removeAttendee 
  } = useMeetingNotes(roomName);
  
  const [newAttendee, setNewAttendee] = useState('');

  const handleAddAttendee = () => {
    if (newAttendee.trim()) {
      addAttendee(newAttendee.trim());
      setNewAttendee('');
    }
  };

  if (loading) {
    return (
      <Card className={cn("h-full flex flex-col", className)}>
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="flex-1 space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("h-full flex flex-col bg-card", className)}>
      <CardHeader className="pb-2 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-primary" />
            Meeting Notes
          </CardTitle>
          <div className="flex items-center gap-2">
            {saving && (
              <Badge variant="outline" className="text-xs gap-1">
                <Clock className="h-3 w-3 animate-pulse" />
                Saving...
              </Badge>
            )}
            <Badge variant="secondary" className="text-xs">
              Real-time sync
            </Badge>
          </div>
        </div>
      </CardHeader>

      <ScrollArea className="flex-1">
        <CardContent className="space-y-6 pb-6">
          {/* Meeting Title */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Meeting Title</label>
            <Input
              value={notes?.title || ''}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder="Enter meeting title..."
              className="font-medium"
            />
          </div>

          <Separator />

          {/* Attendees */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <label className="text-sm font-medium text-foreground">Attendees</label>
            </div>
            <div className="flex flex-wrap gap-2">
              {notes?.attendees?.map((attendee, index) => (
                <Badge 
                  key={index} 
                  variant="secondary" 
                  className="gap-1 pr-1"
                >
                  <User className="h-3 w-3" />
                  {attendee}
                  <button 
                    onClick={() => removeAttendee(index)}
                    className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newAttendee}
                onChange={(e) => setNewAttendee(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddAttendee()}
                placeholder="Add attendee..."
                className="text-sm"
              />
              <Button size="sm" onClick={handleAddAttendee} disabled={!newAttendee.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Separator />

          {/* Agenda */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-primary" />
              <label className="text-sm font-medium text-foreground">Agenda</label>
            </div>
            <Textarea
              value={notes?.agenda || ''}
              onChange={(e) => updateField('agenda', e.target.value)}
              placeholder="• Topic 1&#10;• Topic 2&#10;• Topic 3"
              className="min-h-[100px] text-sm resize-none"
            />
          </div>

          <Separator />

          {/* Discussion */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              <label className="text-sm font-medium text-foreground">Discussion Notes</label>
            </div>
            <Textarea
              value={notes?.discussion || ''}
              onChange={(e) => updateField('discussion', e.target.value)}
              placeholder="Key points discussed during the meeting..."
              className="min-h-[120px] text-sm resize-none"
            />
          </div>

          <Separator />

          {/* Decisions */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <label className="text-sm font-medium text-foreground">Decisions Made</label>
            </div>
            <Textarea
              value={notes?.decisions || ''}
              onChange={(e) => updateField('decisions', e.target.value)}
              placeholder="• Decision 1&#10;• Decision 2"
              className="min-h-[80px] text-sm resize-none"
            />
          </div>

          <Separator />

          {/* Action Items */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-orange-500" />
              <label className="text-sm font-medium text-foreground">Action Items</label>
            </div>
            <Textarea
              value={notes?.action_items || ''}
              onChange={(e) => updateField('action_items', e.target.value)}
              placeholder="• [ ] Task - Assigned to - Due date&#10;• [ ] Task - Assigned to - Due date"
              className="min-h-[100px] text-sm resize-none"
            />
          </div>

          <Separator />

          {/* Additional Notes */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <label className="text-sm font-medium text-foreground">Additional Notes</label>
            </div>
            <Textarea
              value={notes?.additional_notes || ''}
              onChange={(e) => updateField('additional_notes', e.target.value)}
              placeholder="Any other notes, follow-ups, or reminders..."
              className="min-h-[80px] text-sm resize-none"
            />
          </div>
        </CardContent>
      </ScrollArea>
    </Card>
  );
};

export default MeetingNotesPanel;
