import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  PenLine, Clock, Save, Lock, Unlock, Eye, Music2, 
  Calendar, AlertCircle, CheckCircle, Plus, Play, 
  FileText, Users, Timer, Send
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format, parseISO, isToday, differenceInSeconds } from 'date-fns';

interface JournalSession {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  song_title: string | null;
  song_artist: string | null;
  song_url: string | null;
  session_date: string;
  start_time: string;
  close_time: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
}

interface StudentJournal {
  id: string;
  course_id: string;
  session_id: string | null;
  student_id: string;
  title: string | null;
  content: string;
  word_count: number;
  song_playing: string | null;
  session_date: string;
  started_at: string;
  submitted_at: string | null;
  is_locked: boolean;
  instructor_feedback: string | null;
  grade: number | null;
  graded_at: string | null;
}

interface ClassSessionJournalsProps {
  courseId: string;
  isAdmin?: boolean;
}

export const ClassSessionJournals: React.FC<ClassSessionJournalsProps> = ({ 
  courseId, 
  isAdmin = false 
}) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('write');
  const [sessions, setSessions] = useState<JournalSession[]>([]);
  const [myJournals, setMyJournals] = useState<StudentJournal[]>([]);
  const [allJournals, setAllJournals] = useState<StudentJournal[]>([]);
  const [activeSession, setActiveSession] = useState<JournalSession | null>(null);
  const [currentJournal, setCurrentJournal] = useState<StudentJournal | null>(null);
  const [journalContent, setJournalContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isLocked, setIsLocked] = useState(false);

  // Create session dialog state
  const [createSessionOpen, setCreateSessionOpen] = useState(false);
  const [newSession, setNewSession] = useState({
    title: '',
    description: '',
    song_title: '',
    song_artist: '',
    song_url: '',
    close_time: '13:10'
  });

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Fetch active sessions for this course
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('class_journal_sessions')
        .select('*')
        .eq('course_id', courseId)
        .order('created_at', { ascending: false });
      
      if (sessionsError) throw sessionsError;
      setSessions(sessionsData || []);
      
      // Find today's active session
      const todaySession = sessionsData?.find(s => 
        isToday(parseISO(s.session_date)) && s.is_active
      );
      setActiveSession(todaySession || null);
      
      // Fetch student's own journals
      const { data: myJournalsData, error: myJournalsError } = await supabase
        .from('class_session_journals')
        .select('*')
        .eq('course_id', courseId)
        .eq('student_id', user.id)
        .order('session_date', { ascending: false });
      
      if (myJournalsError) throw myJournalsError;
      setMyJournals(myJournalsData || []);
      
      // Check if there's a journal for today's session
      if (todaySession) {
        const todayJournal = myJournalsData?.find(j => 
          j.session_id === todaySession.id
        );
        if (todayJournal) {
          setCurrentJournal(todayJournal);
          setJournalContent(todayJournal.content);
          setIsLocked(todayJournal.is_locked);
        }
      }
      
      // If admin, fetch all journals
      if (isAdmin) {
        const { data: allJournalsData } = await supabase
          .from('class_session_journals')
          .select('*')
          .eq('course_id', courseId)
          .order('session_date', { ascending: false });
        
        setAllJournals(allJournalsData || []);
      }
    } catch (error) {
      console.error('Error fetching journal data:', error);
      toast.error('Failed to load journals');
    } finally {
      setLoading(false);
    }
  }, [user, courseId, isAdmin]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Timer effect for auto-lock
  useEffect(() => {
    if (!activeSession || isLocked) return;
    
    const checkTime = () => {
      const now = new Date();
      const [closeHour, closeMinute] = activeSession.close_time.split(':').map(Number);
      const closeDate = new Date();
      closeDate.setHours(closeHour, closeMinute, 0, 0);
      
      const diff = differenceInSeconds(closeDate, now);
      
      if (diff <= 0) {
        setIsLocked(true);
        setTimeRemaining(0);
        // Auto-submit if there's content
        if (journalContent.trim() && currentJournal) {
          handleSubmit(true);
        }
      } else {
        setTimeRemaining(diff);
      }
    };
    
    checkTime();
    const interval = setInterval(checkTime, 1000);
    return () => clearInterval(interval);
  }, [activeSession, isLocked, journalContent, currentJournal]);

  // Word count
  const wordCount = journalContent.trim().split(/\s+/).filter(Boolean).length;

  // Format time remaining
  const formatTimeRemaining = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Start or continue journal
  const handleStartJournal = async () => {
    if (!user || !activeSession) return;
    
    try {
      // Check if journal already exists
      if (currentJournal) {
        setActiveTab('write');
        return;
      }
      
      // Create new journal entry
      const { data, error } = await supabase
        .from('class_session_journals')
        .insert({
          course_id: courseId,
          session_id: activeSession.id,
          student_id: user.id,
          content: '',
          word_count: 0,
          song_playing: activeSession.song_title 
            ? `${activeSession.song_title} - ${activeSession.song_artist || 'Unknown'}`
            : null,
          session_date: activeSession.session_date,
          started_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) throw error;
      
      setCurrentJournal(data);
      setJournalContent('');
      setActiveTab('write');
      toast.success('Journal started!');
    } catch (error) {
      console.error('Error starting journal:', error);
      toast.error('Failed to start journal');
    }
  };

  // Save journal (auto-save or manual)
  const handleSave = async (showToast = true) => {
    if (!currentJournal || isLocked) return;
    
    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('class_session_journals')
        .update({
          content: journalContent,
          word_count: wordCount,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentJournal.id);
      
      if (error) throw error;
      
      if (showToast) toast.success('Journal saved');
    } catch (error) {
      console.error('Error saving journal:', error);
      if (showToast) toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  // Submit journal
  const handleSubmit = async (autoSubmit = false) => {
    if (!currentJournal) return;
    
    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('class_session_journals')
        .update({
          content: journalContent,
          word_count: wordCount,
          submitted_at: new Date().toISOString(),
          is_locked: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentJournal.id);
      
      if (error) throw error;
      
      setIsLocked(true);
      setCurrentJournal(prev => prev ? { ...prev, is_locked: true, submitted_at: new Date().toISOString() } : null);
      
      toast.success(autoSubmit ? 'Time expired - journal auto-submitted' : 'Journal submitted!');
      fetchData();
    } catch (error) {
      console.error('Error submitting journal:', error);
      toast.error('Failed to submit journal');
    } finally {
      setSaving(false);
    }
  };

  // Create new session (admin only)
  const handleCreateSession = async () => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('class_journal_sessions')
        .insert({
          course_id: courseId,
          title: newSession.title || `Class Journal - ${format(new Date(), 'MMM d, yyyy')}`,
          description: newSession.description || null,
          song_title: newSession.song_title || null,
          song_artist: newSession.song_artist || null,
          song_url: newSession.song_url || null,
          session_date: new Date().toISOString().split('T')[0],
          start_time: new Date().toTimeString().slice(0, 8),
          close_time: newSession.close_time + ':00',
          is_active: true,
          created_by: user.id
        });
      
      if (error) throw error;
      
      toast.success('Journal session created!');
      setCreateSessionOpen(false);
      setNewSession({
        title: '',
        description: '',
        song_title: '',
        song_artist: '',
        song_url: '',
        close_time: '13:10'
      });
      fetchData();
    } catch (error) {
      console.error('Error creating session:', error);
      toast.error('Failed to create session');
    }
  };

  // Auto-save every 30 seconds
  useEffect(() => {
    if (!currentJournal || isLocked || !journalContent) return;
    
    const autoSave = setTimeout(() => {
      handleSave(false);
    }, 30000);
    
    return () => clearTimeout(autoSave);
  }, [journalContent, currentJournal, isLocked]);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-1/3 mx-auto"></div>
            <div className="h-32 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Active Session Banner */}
      {activeSession && !isLocked && (
        <Card className="border-primary bg-primary/5">
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-primary text-primary-foreground rounded-full p-2">
                  <PenLine className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold">{activeSession.title}</h3>
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    {activeSession.song_title && (
                      <>
                        <Music2 className="h-3 w-3" />
                        {activeSession.song_title}
                        {activeSession.song_artist && ` - ${activeSession.song_artist}`}
                      </>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {timeRemaining !== null && timeRemaining > 0 && (
                  <Badge variant={timeRemaining < 300 ? 'destructive' : 'secondary'} className="text-sm">
                    <Timer className="h-3 w-3 mr-1" />
                    {formatTimeRemaining(timeRemaining)} remaining
                  </Badge>
                )}
                {!currentJournal ? (
                  <Button onClick={handleStartJournal}>
                    <Play className="h-4 w-4 mr-2" />
                    Start Journaling
                  </Button>
                ) : (
                  <Button variant="outline" onClick={() => setActiveTab('write')}>
                    <PenLine className="h-4 w-4 mr-2" />
                    Continue Writing
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Time Expired Banner */}
      {activeSession && isLocked && (
        <Card className="border-amber-500 bg-amber-50 dark:bg-amber-900/20">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <Lock className="h-5 w-5 text-amber-600" />
              <div>
                <h3 className="font-semibold text-amber-800 dark:text-amber-200">Journaling Closed</h3>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Today's journal session has ended at {activeSession.close_time.slice(0, 5)}.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="write" className="gap-2">
              <PenLine className="h-4 w-4" />
              Write
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <FileText className="h-4 w-4" />
              My Journals
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="all" className="gap-2">
                <Users className="h-4 w-4" />
                All Submissions
              </TabsTrigger>
            )}
          </TabsList>
          
          {isAdmin && (
            <Dialog open={createSessionOpen} onOpenChange={setCreateSessionOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  New Session
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Journal Session</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Session Title</Label>
                    <Input
                      value={newSession.title}
                      onChange={(e) => setNewSession(prev => ({ ...prev, title: e.target.value }))}
                      placeholder={`Class Journal - ${format(new Date(), 'MMM d, yyyy')}`}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description (optional)</Label>
                    <Textarea
                      value={newSession.description}
                      onChange={(e) => setNewSession(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="What students should focus on..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Song Title</Label>
                      <Input
                        value={newSession.song_title}
                        onChange={(e) => setNewSession(prev => ({ ...prev, song_title: e.target.value }))}
                        placeholder="Song being played"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Artist</Label>
                      <Input
                        value={newSession.song_artist}
                        onChange={(e) => setNewSession(prev => ({ ...prev, song_artist: e.target.value }))}
                        placeholder="Artist name"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Close Time</Label>
                    <Input
                      type="time"
                      value={newSession.close_time}
                      onChange={(e) => setNewSession(prev => ({ ...prev, close_time: e.target.value }))}
                    />
                    <p className="text-xs text-muted-foreground">
                      Journals will auto-submit at this time
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateSessionOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateSession}>
                    Create Session
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Write Tab */}
        <TabsContent value="write">
          {currentJournal && activeSession ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{activeSession.title}</CardTitle>
                    {activeSession.description && (
                      <CardDescription>{activeSession.description}</CardDescription>
                    )}
                  </div>
                  {isLocked ? (
                    <Badge variant="secondary">
                      <Lock className="h-3 w-3 mr-1" />
                      Submitted
                    </Badge>
                  ) : (
                    <Badge variant="outline">
                      <Unlock className="h-3 w-3 mr-1" />
                      In Progress
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={journalContent}
                  onChange={(e) => setJournalContent(e.target.value)}
                  placeholder="Write your thoughts as you listen to the music..."
                  className="min-h-[300px] resize-y"
                  disabled={isLocked}
                />
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    {wordCount} words
                    {wordCount < 50 && !isLocked && (
                      <span className="text-amber-600 ml-2">
                        (Minimum 50 words recommended)
                      </span>
                    )}
                  </div>
                  {!isLocked && (
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => handleSave()} disabled={saving}>
                        <Save className="h-4 w-4 mr-2" />
                        {saving ? 'Saving...' : 'Save Draft'}
                      </Button>
                      <Button onClick={() => handleSubmit()} disabled={saving || wordCount < 10}>
                        <Send className="h-4 w-4 mr-2" />
                        Submit
                      </Button>
                    </div>
                  )}
                </div>
                
                {/* Instructor Feedback */}
                {currentJournal.instructor_feedback && (
                  <Card className="bg-muted/50 mt-4">
                    <CardContent className="py-4">
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        Instructor Feedback
                        {currentJournal.grade && (
                          <Badge className="ml-2">{currentJournal.grade}/100</Badge>
                        )}
                      </h4>
                      <p className="text-sm">{currentJournal.instructor_feedback}</p>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          ) : activeSession ? (
            <Card>
              <CardContent className="py-12 text-center">
                <PenLine className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Ready to Journal</h3>
                <p className="text-muted-foreground mb-4">
                  Click "Start Journaling" above to begin writing your thoughts.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Active Session</h3>
                <p className="text-muted-foreground">
                  There's no active journal session right now. Check back during class.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">My Journals</CardTitle>
            </CardHeader>
            <CardContent>
              {myJournals.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  You haven't written any journals yet.
                </p>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-4">
                    {myJournals.map(journal => (
                      <Card key={journal.id} className="bg-muted/30">
                        <CardContent className="py-4">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h4 className="font-medium">
                                {format(parseISO(journal.session_date), 'EEEE, MMMM d, yyyy')}
                              </h4>
                              {journal.song_playing && (
                                <p className="text-sm text-muted-foreground flex items-center gap-1">
                                  <Music2 className="h-3 w-3" />
                                  {journal.song_playing}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {journal.is_locked ? (
                                <Badge variant="secondary">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Submitted
                                </Badge>
                              ) : (
                                <Badge variant="outline">Draft</Badge>
                              )}
                              {journal.grade && (
                                <Badge>{journal.grade}/100</Badge>
                              )}
                            </div>
                          </div>
                          <p className="text-sm line-clamp-3">{journal.content}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {journal.word_count} words
                          </p>
                          
                          {journal.instructor_feedback && (
                            <div className="mt-3 pt-3 border-t">
                              <p className="text-sm font-medium text-green-700 dark:text-green-400">
                                Feedback: {journal.instructor_feedback}
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* All Submissions Tab (Admin) */}
        {isAdmin && (
          <TabsContent value="all">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">All Student Submissions</CardTitle>
                <CardDescription>
                  {allJournals.length} total journal entries
                </CardDescription>
              </CardHeader>
              <CardContent>
                {allJournals.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No journals submitted yet.
                  </p>
                ) : (
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-4">
                      {allJournals.map(journal => (
                        <Card key={journal.id} className="bg-muted/30">
                          <CardContent className="py-4">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h4 className="font-medium">
                                  Student: {journal.student_id.slice(0, 8)}...
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                  {format(parseISO(journal.session_date), 'MMM d, yyyy')}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant={journal.is_locked ? 'secondary' : 'outline'}>
                                  {journal.is_locked ? 'Submitted' : 'Draft'}
                                </Badge>
                                <Badge variant="outline">{journal.word_count} words</Badge>
                              </div>
                            </div>
                            <p className="text-sm line-clamp-4 mb-3">{journal.content}</p>
                            
                            {/* Quick grade input */}
                            {journal.is_locked && (
                              <div className="flex items-center gap-2 pt-2 border-t">
                                <Input
                                  type="number"
                                  placeholder="Grade"
                                  className="w-20"
                                  min={0}
                                  max={100}
                                  defaultValue={journal.grade || ''}
                                />
                                <Input
                                  placeholder="Feedback..."
                                  className="flex-1"
                                  defaultValue={journal.instructor_feedback || ''}
                                />
                                <Button size="sm" variant="outline">
                                  Save
                                </Button>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default ClassSessionJournals;
