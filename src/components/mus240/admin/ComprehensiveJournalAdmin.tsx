import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, MessageSquare, User, Calendar, Search, Filter, RefreshCw, Eye, Edit3, Save, Bot, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AIGradeViewer } from './AIGradeViewer';

interface JournalEntry {
  id: string;
  assignment_id: string;
  student_id: string;
  content: string;
  word_count: number;
  is_published: boolean;
  created_at: string;
  submitted_at: string;
  student_name?: string;
  student_email?: string;
}

interface JournalComment {
  id: string;
  journal_id: string;
  commenter_id: string;
  content: string;
  created_at: string;
  commenter_name?: string;
  commenter_email?: string;
  journal_assignment_id?: string;
}

interface FileSubmission {
  id: string;
  assignment_id: string;
  student_id: string;
  file_name: string;
  file_url: string;
  file_size: number;
  grade: number | null;
  feedback: string | null;
  status: string;
  submitted_at: string;
  graded_at: string | null;
  student_name?: string;
  student_email?: string;
}

export const ComprehensiveJournalAdmin = () => {
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [comments, setComments] = useState<JournalComment[]>([]);
  const [fileSubmissions, setFileSubmissions] = useState<FileSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [assignmentFilter, setAssignmentFilter] = useState('all');
  const [selectedEntry, setSelectedEntry] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadAllData();
    
    // Set up real-time subscriptions
    const journalChannel = supabase
      .channel('admin-journal-entries')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mus240_journal_entries' }, handleJournalChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mus240_journal_comments' }, handleCommentChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assignment_submissions' }, handleSubmissionChange)
      .subscribe();

    return () => {
      supabase.removeChannel(journalChannel);
    };
  }, []);

  const handleJournalChange = (payload: any) => {
    console.log('Journal entry changed:', payload);
    loadJournalEntries();
  };

  const handleCommentChange = (payload: any) => {
    console.log('Comment changed:', payload);
    loadComments();
  };

  const handleSubmissionChange = (payload: any) => {
    console.log('File submission changed:', payload);
    loadFileSubmissions();
  };

  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([
      loadJournalEntries(),
      loadComments(),
      loadFileSubmissions()
    ]);
    setLoading(false);
  };

  const loadJournalEntries = async () => {
    try {
      console.log('Loading journal entries...');
      
      const { data, error } = await supabase
        .from('mus240_journal_entries')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('Journal entries query result:', { data, error });

      if (error) {
        console.error('Journal entries query error:', error);
        throw error;
      }

      // Get student profiles separately
      const studentIds = [...new Set(data?.map(entry => entry.student_id).filter(Boolean))];
      let studentProfiles = [];
      
      if (studentIds.length > 0) {
        const { data: profiles } = await supabase
          .from('gw_profiles')
          .select('user_id, full_name, email')
          .in('user_id', studentIds);
        studentProfiles = profiles || [];
      }

      const entries = (data || []).map(entry => {
        const profile = studentProfiles.find(p => p.user_id === entry.student_id);
        return {
          ...entry,
          student_name: profile?.full_name || 'Unknown Student',
          student_email: profile?.email || ''
        };
      });

      console.log('Processed journal entries:', entries.length);
      setJournalEntries(entries);
    } catch (error) {
      console.error('Error loading journal entries:', error);
      toast({
        title: "Error",
        description: `Failed to load journal entries: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  const loadComments = async () => {
    try {
      console.log('Loading journal comments...');
      
      const { data, error } = await supabase
        .from('mus240_journal_comments')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('Journal comments query result:', { data, error });

      if (error) {
        console.error('Journal comments query error:', error);
        throw error;
      }

      // Get commenter profiles and journal entries separately
      const commenterIds = [...new Set(data?.map(comment => comment.commenter_id).filter(Boolean))];
      const journalIds = [...new Set(data?.map(comment => comment.journal_id).filter(Boolean))];
      
      let commenterProfiles = [];
      let journalEntries = [];
      
      if (commenterIds.length > 0) {
        const { data: profiles } = await supabase
          .from('gw_profiles')
          .select('user_id, full_name, email')
          .in('user_id', commenterIds);
        commenterProfiles = profiles || [];
      }
      
      if (journalIds.length > 0) {
        const { data: journals } = await supabase
          .from('mus240_journal_entries')
          .select('id, assignment_id')
          .in('id', journalIds);
        journalEntries = journals || [];
      }

      const commentsWithDetails = (data || []).map(comment => {
        const profile = commenterProfiles.find(p => p.user_id === comment.commenter_id);
        const journal = journalEntries.find(j => j.id === comment.journal_id);
        return {
          ...comment,
          commenter_name: profile?.full_name || 'Anonymous',
          commenter_email: profile?.email || '',
          journal_assignment_id: journal?.assignment_id || ''
        };
      });

      console.log('Processed journal comments:', commentsWithDetails.length);
      setComments(commentsWithDetails);
    } catch (error) {
      console.error('Error loading comments:', error);
      toast({
        title: "Error",
        description: `Failed to load comments: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  const loadFileSubmissions = async () => {
    try {
      console.log('Loading file submissions...');
      
      const { data, error } = await supabase
        .from('assignment_submissions')
        .select('*')
        .ilike('assignment_id', '%lj%')
        .order('submitted_at', { ascending: false });

      console.log('File submissions query result:', { data, error });

      if (error) {
        console.error('File submissions query error:', error);
        throw error;
      }

      // Get student profiles separately
      const studentIds = [...new Set(data?.map(submission => submission.student_id).filter(Boolean))];
      let studentProfiles = [];
      
      if (studentIds.length > 0) {
        const { data: profiles } = await supabase
          .from('gw_profiles')
          .select('user_id, full_name, email')
          .in('user_id', studentIds);
        studentProfiles = profiles || [];
      }

      const submissions = (data || []).map(submission => {
        const profile = studentProfiles.find(p => p.user_id === submission.student_id);
        return {
          ...submission,
          student_name: profile?.full_name || 'Unknown Student',
          student_email: profile?.email || ''
        };
      });

      console.log('Processed file submissions:', submissions.length);
      setFileSubmissions(submissions);
    } catch (error) {
      console.error('Error loading file submissions:', error);
      toast({
        title: "Error",
        description: `Failed to load file submissions: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  const getAssignmentName = (assignmentId: string) => {
    const assignments: Record<string, string> = {
      'lj1': 'Listening Journal #1',
      'lj2': 'Listening Journal #2',
      'lj3': 'Listening Journal #3',
      'lj4': 'Listening Journal #4',
      'lj5': 'Listening Journal #5',
      'lj6': 'Listening Journal #6',
      'lj7': 'Listening Journal #7',
      'lj8': 'Listening Journal #8',
    };
    return assignments[assignmentId] || assignmentId.toUpperCase();
  };

  const getCommentsForEntry = (entryId: string) => {
    return comments.filter(comment => comment.journal_id === entryId);
  };

  const grade = async (entry: JournalEntry) => {
    try {
      const { data, error } = await supabase.functions.invoke('grade-journal', {
        body: {
          student_id: entry.student_id,
          assignment_id: entry.assignment_id,
          journal_text: entry.content,
          rubric: {
            criteria: [
              { name: "Musical Analysis", description: "Identifies genre, style traits, and musical features", max_points: 7 },
              { name: "Historical Context", description: "Connects musical features to historical and cultural significance", max_points: 5 },
              { name: "Terminology Usage", description: "Uses correct musical terminology appropriately", max_points: 3 },
              { name: "Writing Quality", description: "Clear, organized writing with proper grammar and 250-300 words", max_points: 2 }
            ]
          },
        }
      });

      if (error) {
        // Supabase wraps function errors here
        console.error("Edge error:", error);
        // Try to parse server-provided JSON body if present
        const m = error.message || "";
        try { console.error("Edge body:", JSON.parse(m)); } catch (_) { /* ignore */ }
        alert(`Edge error: ${m}`);
        return;
      }

      console.log("Grade OK:", data);
      toast({
        title: "AI Grading Complete",
        description: `Journal graded successfully! Overall score: ${data.overall_score}/100`,
      });
      loadAllData();
    } catch (e: any) {
      // Network/CORS etc.
      console.error("Invoke threw:", e);
      alert(`Invoke threw: ${e?.message ?? e}`);
    }
  };

  const debugRaw = async () => {
    const url = `https://oopmlreysjzuxzylyheb.supabase.co/functions/v1/grade-journal`;
    const anon = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vcG1scmV5c2p6dXh6eWx5aGViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkwNzg5NTUsImV4cCI6MjA2NDY1NDk1NX0.tDq4HaTAy9p80e4upXFHIA90gUxZSHTH5mnqfpxh7eg";
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${anon}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        student_id: "4e6c2ec0-1f83-449a-a984-8920f6056ab5",
        assignment_id: "lj2",
        journal_text: "test",
        rubric: { criteria: [] }
      })
    });
    const text = await res.text();
    console.log("Status:", res.status, "Body:", text);
    alert(`Status ${res.status}: ${text}`);
  };

  const handleAIGrading = async (entry: JournalEntry) => {
    toast({
      title: "AI Grading Started",
      description: `Grading journal entry by ${entry.student_name}...`,
    });
    await grade(entry);
  };

  const filteredJournalEntries = journalEntries.filter(entry => {
    const matchesSearch = entry.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.student_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.content.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesAssignment = assignmentFilter === 'all' || entry.assignment_id === assignmentFilter;
    
    return matchesSearch && matchesAssignment;
  });

  const filteredComments = comments.filter(comment => {
    const matchesSearch = comment.commenter_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      comment.content.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesAssignment = assignmentFilter === 'all' || comment.journal_assignment_id === assignmentFilter;
    
    return matchesSearch && matchesAssignment;
  });

  const filteredFileSubmissions = fileSubmissions.filter(submission => {
    const matchesSearch = submission.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      submission.file_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesAssignment = assignmentFilter === 'all' || submission.assignment_id === assignmentFilter;
    
    return matchesSearch && matchesAssignment;
  });

  const uniqueAssignments = [...new Set([
    ...journalEntries.map(e => e.assignment_id),
    ...fileSubmissions.map(s => s.assignment_id)
  ])].sort();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Loading journal data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-4xl font-bold text-white">Complete Journal Administration</h3>
          <p className="text-muted-foreground">View all journal entries, comments, and file submissions</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={loadAllData}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh All Data
          </Button>
          <Button
            variant="outline"
            onClick={debugRaw}
            className="flex items-center gap-2"
          >
            Debug Raw
          </Button>
        </div>
      </div>

      <div className="flex gap-4 items-center">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search students, content, or files..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={assignmentFilter} onValueChange={setAssignmentFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by assignment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Assignments</SelectItem>
              {uniqueAssignments.map(assignment => (
                <SelectItem key={assignment} value={assignment}>
                  {getAssignmentName(assignment)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="text-entries" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="text-entries" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Text Entries ({filteredJournalEntries.length})
          </TabsTrigger>
          <TabsTrigger value="comments" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Comments ({filteredComments.length})
          </TabsTrigger>
          <TabsTrigger value="file-submissions" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            File Submissions ({filteredFileSubmissions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="text-entries" className="space-y-4">
          {filteredJournalEntries.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No text entries found</h3>
                <p className="text-muted-foreground">No journal text entries match your criteria.</p>
              </CardContent>
            </Card>
          ) : (
            filteredJournalEntries.map((entry) => (
              <Card key={entry.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <User className="h-5 w-5" />
                      <div>
                        <h4 className="font-semibold">{entry.student_name}</h4>
                        <p className="text-sm text-muted-foreground">{entry.student_email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{getAssignmentName(entry.assignment_id)}</Badge>
                      <Badge variant={entry.is_published ? "default" : "secondary"}>
                        {entry.is_published ? "Published" : "Draft"}
                      </Badge>
                      <Badge variant="outline">{entry.word_count} words</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>Submitted: {new Date(entry.submitted_at).toLocaleString()}</span>
                      <span>•</span>
                      <span>{getCommentsForEntry(entry.id).length} comments</span>
                    </div>
                    
                    <div className="bg-muted p-4 rounded-md">
                      <p className="text-sm whitespace-pre-wrap">{entry.content}</p>
                    </div>

                     {getCommentsForEntry(entry.id).length > 0 && (
                      <div className="space-y-3 mt-4 pt-4 border-t">
                        <h5 className="font-medium text-sm flex items-center gap-2">
                          <MessageSquare className="h-4 w-4" />
                          Comments ({getCommentsForEntry(entry.id).length})
                        </h5>
                        <div className="space-y-3">
                          {getCommentsForEntry(entry.id).map(comment => (
                            <div key={comment.id} className="bg-card border border-border rounded-md p-3">
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                                <User className="h-3 w-3" />
                                <span className="font-medium">{comment.commenter_name}</span>
                                <span>•</span>
                                <Calendar className="h-3 w-3" />
                                <span>{new Date(comment.created_at).toLocaleDateString()}</span>
                                <span>{new Date(comment.created_at).toLocaleTimeString()}</span>
                              </div>
                              <p className="text-sm text-foreground leading-relaxed">{comment.content}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                     <div className="flex gap-2 pt-2 border-t">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleAIGrading(entry)}
                        className="flex items-center gap-2"
                      >
                        <Bot className="h-4 w-4" />
                        Grade with AI
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setSelectedEntry(selectedEntry === entry.id ? null : entry.id)}
                        className="flex items-center gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        {selectedEntry === entry.id ? 'Hide' : 'View'} Grade
                      </Button>
                    </div>

                    {/* AI Grade Display */}
                    {selectedEntry === entry.id && (
                      <div className="mt-4 pt-4 border-t">
                        <AIGradeViewer journalId={entry.id} />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="comments" className="space-y-4">
          {filteredComments.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No comments found</h3>
                <p className="text-muted-foreground">No comments match your criteria.</p>
              </CardContent>
            </Card>
          ) : (
            filteredComments.map((comment) => (
              <Card key={comment.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <MessageSquare className="h-5 w-5 mt-1" />
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{comment.commenter_name}</span>
                          <Badge variant="outline" className="text-xs">
                            {getAssignmentName(comment.journal_assignment_id)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{comment.commenter_email}</p>
                        <p className="text-sm mt-2">{comment.content}</p>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(comment.created_at).toLocaleString()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="file-submissions" className="space-y-4">
          {filteredFileSubmissions.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No file submissions found</h3>
                <p className="text-muted-foreground">No file submissions match your criteria.</p>
              </CardContent>
            </Card>
          ) : (
            filteredFileSubmissions.map((submission) => (
              <Card key={submission.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5" />
                      <div>
                        <h4 className="font-semibold">{submission.student_name}</h4>
                        <p className="text-sm text-muted-foreground">{submission.student_email}</p>
                        <p className="text-sm">{submission.file_name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{getAssignmentName(submission.assignment_id)}</Badge>
                      <Badge variant={submission.status === 'graded' ? 'default' : 'secondary'}>
                        {submission.status}
                      </Badge>
                      {submission.grade && (
                        <Badge variant="secondary">Grade: {submission.grade}</Badge>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(submission.file_url, '_blank')}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View File
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};