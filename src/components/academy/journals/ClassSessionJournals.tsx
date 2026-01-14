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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { 
  PenLine, Clock, Save, Lock, Unlock, Eye, Music2, 
  Calendar, AlertCircle, CheckCircle, Plus, Play, 
  FileText, Users, Timer, Send, Settings, Trash2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format, parseISO, isToday, differenceInSeconds, getDay } from 'date-fns';

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

// Check if today is a class day (MWF = Monday, Wednesday, Friday)
const isClassDay = (): boolean => {
  const dayOfWeek = getDay(new Date());
  // 1 = Monday, 3 = Wednesday, 5 = Friday
  return dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5;
};

// Check if current time is within journal window
const isWithinJournalWindow = (startTime: string, closeTime: string): boolean => {
  const now = new Date();
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [closeHour, closeMinute] = closeTime.split(':').map(Number);
  
  const startDate = new Date();
  startDate.setHours(startHour, startMinute, 0, 0);
  
  const closeDate = new Date();
  closeDate.setHours(closeHour, closeMinute, 0, 0);
  
  return now >= startDate && now <= closeDate;
};

// Get time until window opens or closes
const getTimeStatus = (startTime: string, closeTime: string): { 
  status: 'before' | 'active' | 'closed'; 
  secondsRemaining: number;
} => {
  const now = new Date();
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [closeHour, closeMinute] = closeTime.split(':').map(Number);
  
  const startDate = new Date();
  startDate.setHours(startHour, startMinute, 0, 0);
  
  const closeDate = new Date();
  closeDate.setHours(closeHour, closeMinute, 0, 0);
  
  if (now < startDate) {
    return { status: 'before', secondsRemaining: differenceInSeconds(startDate, now) };
  } else if (now <= closeDate) {
    return { status: 'active', secondsRemaining: differenceInSeconds(closeDate, now) };
  } else {
    return { status: 'closed', secondsRemaining: 0 };
  }
};

export const ClassSessionJournals: React.FC<ClassSessionJournalsProps> = ({ 
  courseId, 
  isAdmin = false 
}) => {
  const { user } = useAuth();
  const [isInstructor, setIsInstructor] = useState(false);
  const [activeTab, setActiveTab] = useState('write');
  const [sessions, setSessions] = useState<JournalSession[]>([]);
  const [myJournals, setMyJournals] = useState<StudentJournal[]>([]);
  const [allJournals, setAllJournals] = useState<StudentJournal[]>([]);
  const [activeSession, setActiveSession] = useState<JournalSession | null>(null);
  const [currentJournal, setCurrentJournal] = useState<StudentJournal | null>(null);
  const [journalContent, setJournalContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [timeStatus, setTimeStatus] = useState<{ status: 'before' | 'active' | 'closed'; secondsRemaining: number } | null>(null);

  // Create session dialog state
  const [createSessionOpen, setCreateSessionOpen] = useState(false);
  const [newSession, setNewSession] = useState({
    title: '',
    description: '',
    song_title: '',
    song_artist: '',
    song_url: '',
    start_time: '13:05',
    close_time: '13:10'
  });

  // Check if user is an instructor (super_admin) or TA for this course
  useEffect(() => {
    const checkInstructorStatus = async () => {
      if (!user) {
        setIsInstructor(false);
        return;
      }
      
      // Check if super_admin
      const { data: profile } = await supabase
        .from('gw_profiles')
        .select('is_super_admin')
        .eq('user_id', user.id)
        .single();
      
      const isSuperAdmin = profile?.is_super_admin || false;
      
      // Check if TA for this course
      const normalizedCourseId = courseId.replace(' ', '');
      const { data: taRecord } = await supabase
        .from('course_teaching_assistants')
        .select('id')
        .eq('user_id', user.id)
        .eq('course_code', normalizedCourseId)
        .eq('is_active', true)
        .maybeSingle();
      
      const isTA = !!taRecord;
      const hasInstructorAccess = isSuperAdmin || isTA;
      
      setIsInstructor(hasInstructorAccess);
      
      // Set initial tab based on instructor status
      if (hasInstructorAccess) {
        setActiveTab('manage');
      }
    };
    
    checkInstructorStatus();
  }, [user, courseId]);

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Fetch all sessions for this course
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('class_journal_sessions')
        .select('*')
        .eq('course_id', courseId)
        .order('created_at', { ascending: false });
      
      if (sessionsError) throw sessionsError;
      setSessions(sessionsData || []);
      
      // Find today's active session (only on class days)
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
        }
      }
      
      // If instructor, fetch all journals
      if (isInstructor) {
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
  }, [user, courseId, isInstructor]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Timer effect for time window checking
  useEffect(() => {
    if (!activeSession) return;
    
    const checkTime = () => {
      const status = getTimeStatus(activeSession.start_time, activeSession.close_time);
      setTimeStatus(status);
      
      // Auto-submit when time closes
      if (status.status === 'closed' && journalContent.trim() && currentJournal && !currentJournal.is_locked) {
        handleSubmit(true);
      }
    };
    
    checkTime();
    const interval = setInterval(checkTime, 1000);
    return () => clearInterval(interval);
  }, [activeSession, journalContent, currentJournal]);

  // Word count
  const wordCount = journalContent.trim().split(/\s+/).filter(Boolean).length;

  // Format time remaining
  const formatTimeRemaining = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Check if editing is allowed
  const isEditingAllowed = timeStatus?.status === 'active' && activeSession && isClassDay();

  // Start or continue journal
  const handleStartJournal = async () => {
    if (!user || !activeSession || !isEditingAllowed) return;
    
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
    if (!currentJournal || !isEditingAllowed) return;
    
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
          start_time: newSession.start_time + ':00',
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
        start_time: '13:05',
        close_time: '13:10'
      });
      fetchData();
    } catch (error) {
      console.error('Error creating session:', error);
      toast.error('Failed to create session');
    }
  };

  // Toggle session active status
  const handleToggleSession = async (sessionId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('class_journal_sessions')
        .update({ is_active: isActive })
        .eq('id', sessionId);
      
      if (error) throw error;
      toast.success(isActive ? 'Session activated' : 'Session deactivated');
      fetchData();
    } catch (error) {
      console.error('Error toggling session:', error);
      toast.error('Failed to update session');
    }
  };

  // Delete session
  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('Delete this session? This will also delete all student journals for this session.')) return;
    
    try {
      const { error } = await supabase
        .from('class_journal_sessions')
        .delete()
        .eq('id', sessionId);
      
      if (error) throw error;
      toast.success('Session deleted');
      fetchData();
    } catch (error) {
      console.error('Error deleting session:', error);
      toast.error('Failed to delete session');
    }
  };

  // Auto-save every 30 seconds when editing is allowed
  useEffect(() => {
    if (!currentJournal || !isEditingAllowed || !journalContent) return;
    
    const autoSave = setTimeout(() => {
      handleSave(false);
    }, 30000);
    
    return () => clearTimeout(autoSave);
  }, [journalContent, currentJournal, isEditingAllowed]);

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

  // Student view - show active session or waiting message
  const renderStudentView = () => {
    if (!activeSession) {
      return (
        <Card>
          <CardContent className="py-12 text-center">
            <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Active Session</h3>
            <p className="text-muted-foreground">
              There's no journal session for today. Check back during class on Monday, Wednesday, or Friday.
            </p>
          </CardContent>
        </Card>
      );
    }

    if (!isClassDay()) {
      return (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Not a Class Day</h3>
            <p className="text-muted-foreground">
              Journaling is available Monday, Wednesday, and Friday during class.
            </p>
          </CardContent>
        </Card>
      );
    }

    if (timeStatus?.status === 'before') {
      return (
        <Card className="border-blue-500 bg-blue-50 dark:bg-blue-900/20">
          <CardContent className="py-8 text-center">
            <Clock className="h-12 w-12 mx-auto text-blue-600 mb-4" />
            <h3 className="text-lg font-medium mb-2 text-blue-800 dark:text-blue-200">
              Journaling Opens Soon
            </h3>
            <p className="text-blue-700 dark:text-blue-300 mb-4">
              Today's session: <strong>{activeSession.title}</strong>
            </p>
            <Badge variant="secondary" className="text-lg px-4 py-2">
              <Timer className="h-4 w-4 mr-2" />
              Opens in {formatTimeRemaining(timeStatus.secondsRemaining)}
            </Badge>
            {activeSession.song_title && (
              <p className="mt-4 text-sm text-blue-600 dark:text-blue-400 flex items-center justify-center gap-2">
                <Music2 className="h-4 w-4" />
                {activeSession.song_title} {activeSession.song_artist && `- ${activeSession.song_artist}`}
              </p>
            )}
          </CardContent>
        </Card>
      );
    }

    if (timeStatus?.status === 'closed') {
      return (
        <Card className="border-amber-500 bg-amber-50 dark:bg-amber-900/20">
          <CardContent className="py-8">
            <div className="flex items-center gap-3 mb-4">
              <Lock className="h-6 w-6 text-amber-600" />
              <div>
                <h3 className="font-semibold text-amber-800 dark:text-amber-200">Journaling Closed</h3>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Today's session ended at {activeSession.close_time.slice(0, 5)}.
                </p>
              </div>
            </div>
            {currentJournal && (
              <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded-lg">
                <p className="text-sm font-medium mb-2">Your submission:</p>
                <p className="text-sm text-muted-foreground line-clamp-3">{currentJournal.content}</p>
                <p className="text-xs text-muted-foreground mt-2">{currentJournal.word_count} words</p>
              </div>
            )}
          </CardContent>
        </Card>
      );
    }

    // Active writing window
    return (
      <Card className="border-primary">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary text-primary-foreground rounded-full p-2 animate-pulse">
                <PenLine className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg">{activeSession.title}</CardTitle>
                {activeSession.song_title && (
                  <CardDescription className="flex items-center gap-1">
                    <Music2 className="h-3 w-3" />
                    {activeSession.song_title} {activeSession.song_artist && `- ${activeSession.song_artist}`}
                  </CardDescription>
                )}
              </div>
            </div>
            <Badge variant={timeStatus!.secondsRemaining < 120 ? 'destructive' : 'secondary'} className="text-sm">
              <Timer className="h-3 w-3 mr-1" />
              {formatTimeRemaining(timeStatus!.secondsRemaining)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {activeSession.description && (
            <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
              {activeSession.description}
            </p>
          )}
          
          {!currentJournal ? (
            <div className="text-center py-8">
              <Button size="lg" onClick={handleStartJournal}>
                <Play className="h-5 w-5 mr-2" />
                Start Journaling
              </Button>
            </div>
          ) : (
            <>
              <Textarea
                value={journalContent}
                onChange={(e) => setJournalContent(e.target.value)}
                placeholder="Write your thoughts as you listen to the music..."
                className="min-h-[250px] resize-y text-base"
                autoFocus
              />
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {wordCount} words
                  {wordCount < 50 && (
                    <span className="text-amber-600 ml-2">(Minimum 50 words recommended)</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => handleSave()} disabled={saving}>
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'Saving...' : 'Save'}
                  </Button>
                  <Button onClick={() => handleSubmit()} disabled={saving || wordCount < 10}>
                    <Send className="h-4 w-4 mr-2" />
                    Submit
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="write" className="gap-2">
            <PenLine className="h-4 w-4" />
            Write
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <FileText className="h-4 w-4" />
            My Journals
          </TabsTrigger>
          {isInstructor && (
            <>
              <TabsTrigger value="manage" className="gap-2">
                <Settings className="h-4 w-4" />
                Manage Sessions
              </TabsTrigger>
              <TabsTrigger value="all" className="gap-2">
                <Users className="h-4 w-4" />
                All Submissions
              </TabsTrigger>
            </>
          )}
        </TabsList>

        {/* Write Tab */}
        <TabsContent value="write">
          {renderStudentView()}
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

        {/* Manage Sessions Tab (Instructor only) */}
        {isInstructor && (
          <TabsContent value="manage">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Journal Sessions</CardTitle>
                    <CardDescription>Create and manage journal sessions for class</CardDescription>
                  </div>
                  <Dialog open={createSessionOpen} onOpenChange={setCreateSessionOpen}>
                    <DialogTrigger asChild>
                      <Button>
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
                          <Label>Prompt/Description (optional)</Label>
                          <Textarea
                            value={newSession.description}
                            onChange={(e) => setNewSession(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="What students should focus on while listening..."
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
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Start Time</Label>
                            <Input
                              type="time"
                              value={newSession.start_time}
                              onChange={(e) => setNewSession(prev => ({ ...prev, start_time: e.target.value }))}
                            />
                            <p className="text-xs text-muted-foreground">When journaling opens</p>
                          </div>
                          <div className="space-y-2">
                            <Label>Close Time</Label>
                            <Input
                              type="time"
                              value={newSession.close_time}
                              onChange={(e) => setNewSession(prev => ({ ...prev, close_time: e.target.value }))}
                            />
                            <p className="text-xs text-muted-foreground">Auto-submit time</p>
                          </div>
                        </div>
                        <div className="bg-muted/50 p-3 rounded-md">
                          <p className="text-sm text-muted-foreground">
                            📅 Sessions are active on <strong>MWF</strong> (Monday, Wednesday, Friday)<br />
                            ⏰ Default window: <strong>1:05 PM - 1:10 PM</strong>
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
                </div>
              </CardHeader>
              <CardContent>
                {sessions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No sessions created yet. Create your first session to start journaling.
                  </p>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      {sessions.map(session => (
                        <Card key={session.id} className={session.is_active ? 'border-primary' : ''}>
                          <CardContent className="py-4">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-medium">{session.title}</h4>
                                  {isToday(parseISO(session.session_date)) && session.is_active && (
                                    <Badge variant="default" className="text-xs">Today</Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {format(parseISO(session.session_date), 'EEEE, MMM d')} • 
                                  {session.start_time.slice(0, 5)} - {session.close_time.slice(0, 5)}
                                </p>
                                {session.song_title && (
                                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                    <Music2 className="h-3 w-3" />
                                    {session.song_title}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                  <Switch
                                    checked={session.is_active}
                                    onCheckedChange={(checked) => handleToggleSession(session.id, checked)}
                                  />
                                  <span className="text-sm text-muted-foreground">
                                    {session.is_active ? 'Active' : 'Inactive'}
                                  </span>
                                </div>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => handleDeleteSession(session.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </div>
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

        {/* All Submissions Tab (Instructor only) */}
        {isInstructor && (
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
