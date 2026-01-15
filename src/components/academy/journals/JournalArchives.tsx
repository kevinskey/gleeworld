import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Archive, Calendar, FileText, Eye, Clock, 
  ChevronDown, ChevronUp, Loader2, Music2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, parseISO } from 'date-fns';

interface ArchivedSession {
  id: string;
  title: string;
  description: string | null;
  song_title: string | null;
  song_artist: string | null;
  session_date: string;
  start_time: string;
  close_time: string;
  created_at: string;
}

interface ArchivedJournal {
  id: string;
  title: string | null;
  content: string;
  word_count: number;
  session_date: string;
  submitted_at: string | null;
  grade: number | null;
  instructor_feedback: string | null;
}

interface JournalArchivesProps {
  courseId: string;
  isAdmin?: boolean;
}

export const JournalArchives: React.FC<JournalArchivesProps> = ({ courseId, isAdmin = false }) => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ArchivedSession[]>([]);
  const [myJournals, setMyJournals] = useState<ArchivedJournal[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [expandedJournal, setExpandedJournal] = useState<string | null>(null);

  useEffect(() => {
    fetchArchivedData();
  }, [courseId, user]);

  const fetchArchivedData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Fetch archived sessions (is_archived = true or old sessions)
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('class_journal_sessions')
        .select('*')
        .eq('course_id', courseId)
        .eq('is_archived', true)
        .order('session_date', { ascending: false });

      if (sessionsError) throw sessionsError;
      setSessions(sessionsData || []);

      // Fetch student's archived journals
      const { data: journalsData, error: journalsError } = await supabase
        .from('class_session_journals')
        .select('*')
        .eq('course_id', courseId)
        .eq('student_id', user.id)
        .eq('is_archived', true)
        .order('session_date', { ascending: false });

      if (journalsError) throw journalsError;
      setMyJournals(journalsData || []);
    } catch (error) {
      console.error('Error fetching archived data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'MMMM d, yyyy');
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Archive className="h-5 w-5 text-primary" />
          Journal Archives
        </CardTitle>
        <CardDescription>
          Past journal sessions and your submitted entries
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="sessions" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="sessions" className="gap-2">
              <Calendar className="h-4 w-4" />
              Past Sessions ({sessions.length})
            </TabsTrigger>
            <TabsTrigger value="my-journals" className="gap-2">
              <FileText className="h-4 w-4" />
              My Entries ({myJournals.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sessions" className="space-y-3">
            {sessions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Archive className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No archived sessions yet</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-3 pr-4">
                  {sessions.map((session) => (
                    <Card key={session.id} className="border">
                      <CardHeader 
                        className="py-3 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => setExpandedSession(
                          expandedSession === session.id ? null : session.id
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium text-sm">{session.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatDate(session.session_date)}
                              </p>
                            </div>
                          </div>
                          {expandedSession === session.id ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </CardHeader>
                      
                      {expandedSession === session.id && (
                        <CardContent className="pt-0 pb-3 border-t">
                          <div className="space-y-2 text-sm">
                            {session.description && (
                              <p className="text-muted-foreground">{session.description}</p>
                            )}
                            {session.song_title && (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Music2 className="h-3 w-3" />
                                <span>{session.song_title}</span>
                                {session.song_artist && (
                                  <span className="text-xs">by {session.song_artist}</span>
                                )}
                              </div>
                            )}
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>
                                {session.start_time} - {session.close_time}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          <TabsContent value="my-journals" className="space-y-3">
            {myJournals.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No archived journal entries yet</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-3 pr-4">
                  {myJournals.map((journal) => (
                    <Card key={journal.id} className="border">
                      <CardHeader 
                        className="py-3 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => setExpandedJournal(
                          expandedJournal === journal.id ? null : journal.id
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium text-sm">
                                {journal.title || 'Journal Entry'}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>{formatDate(journal.session_date)}</span>
                                <span>•</span>
                                <span>{journal.word_count} words</span>
                                {journal.grade !== null && (
                                  <>
                                    <span>•</span>
                                    <Badge variant="secondary" className="text-xs">
                                      {journal.grade}/100
                                    </Badge>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          {expandedJournal === journal.id ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </CardHeader>
                      
                      {expandedJournal === journal.id && (
                        <CardContent className="pt-0 pb-3 border-t space-y-3">
                          <div className="prose prose-sm max-w-none">
                            <p className="text-sm whitespace-pre-wrap">{journal.content}</p>
                          </div>
                          
                          {journal.instructor_feedback && (
                            <div className="bg-muted/50 rounded-lg p-3">
                              <p className="text-xs font-medium text-muted-foreground mb-1">
                                Instructor Feedback
                              </p>
                              <p className="text-sm">{journal.instructor_feedback}</p>
                            </div>
                          )}
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
