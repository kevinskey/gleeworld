import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { 
  FileText, Calendar, Users, Clock, ChevronRight,
  ListChecks, MessageSquare, CheckCircle2, User
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface MeetingNote {
  id: string;
  room_name: string;
  title: string | null;
  attendees: string[];
  agenda: string | null;
  discussion: string | null;
  decisions: string | null;
  action_items: string | null;
  additional_notes: string | null;
  created_at: string;
  updated_at: string;
}

interface MeetingNotesHistoryProps {
  className?: string;
}

export const MeetingNotesHistory: React.FC<MeetingNotesHistoryProps> = ({ className }) => {
  const [notes, setNotes] = useState<MeetingNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNote, setSelectedNote] = useState<MeetingNote | null>(null);

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    try {
      const { data, error } = await supabase
        .from('meeting_notes')
        .select('*')
        .eq('is_active', false)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setNotes(data || []);
    } catch (error) {
      console.error('Error fetching meeting notes history:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className={cn("", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Past Meeting Notes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 border rounded-lg">
              <Skeleton className="h-5 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (notes.length === 0) {
    return (
      <Card className={cn("", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Past Meeting Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No past meeting notes yet</p>
            <p className="text-sm mt-1">Meeting notes will appear here after meetings end</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Past Meeting Notes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px]">
          <div className="space-y-2">
            {notes.map((note) => (
              <Dialog key={note.id}>
                <DialogTrigger asChild>
                  <button
                    className="w-full p-4 border rounded-lg hover:bg-muted/50 transition-colors text-left group"
                    onClick={() => setSelectedNote(note)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="font-medium">{note.title || 'Untitled Meeting'}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(note.created_at), 'MMM d, yyyy')}
                          </span>
                          {note.attendees?.length > 0 && (
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {note.attendees.length} attendees
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </div>
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      {note.title || 'Meeting Notes'}
                    </DialogTitle>
                  </DialogHeader>
                  <ScrollArea className="flex-1 pr-4">
                    <div className="space-y-6 py-4">
                      {/* Date & Time */}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(note.created_at), 'EEEE, MMMM d, yyyy')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {format(new Date(note.created_at), 'h:mm a')}
                        </span>
                      </div>

                      {/* Attendees */}
                      {note.attendees?.length > 0 && (
                        <>
                          <div>
                            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                              <Users className="h-4 w-4 text-primary" />
                              Attendees
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {note.attendees.map((attendee, i) => (
                                <Badge key={i} variant="secondary" className="gap-1">
                                  <User className="h-3 w-3" />
                                  {attendee}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <Separator />
                        </>
                      )}

                      {/* Agenda */}
                      {note.agenda && (
                        <>
                          <div>
                            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                              <ListChecks className="h-4 w-4 text-primary" />
                              Agenda
                            </h4>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{note.agenda}</p>
                          </div>
                          <Separator />
                        </>
                      )}

                      {/* Discussion */}
                      {note.discussion && (
                        <>
                          <div>
                            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                              <MessageSquare className="h-4 w-4 text-primary" />
                              Discussion Notes
                            </h4>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{note.discussion}</p>
                          </div>
                          <Separator />
                        </>
                      )}

                      {/* Decisions */}
                      {note.decisions && (
                        <>
                          <div>
                            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                              Decisions Made
                            </h4>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{note.decisions}</p>
                          </div>
                          <Separator />
                        </>
                      )}

                      {/* Action Items */}
                      {note.action_items && (
                        <>
                          <div>
                            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                              <ListChecks className="h-4 w-4 text-orange-500" />
                              Action Items
                            </h4>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{note.action_items}</p>
                          </div>
                          <Separator />
                        </>
                      )}

                      {/* Additional Notes */}
                      {note.additional_notes && (
                        <div>
                          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            Additional Notes
                          </h4>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{note.additional_notes}</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </DialogContent>
              </Dialog>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default MeetingNotesHistory;
