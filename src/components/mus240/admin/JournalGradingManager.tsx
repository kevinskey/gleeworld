import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { FileText, Download, Eye, Edit3, Save, Search, Filter, ExternalLink, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface JournalSubmission {
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
  graded_by: string | null;
  gw_profiles?: {
    full_name: string;
    email: string;
  } | null;
}

export const JournalGradingManager = () => {
  const [submissions, setSubmissions] = useState<JournalSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [assignmentFilter, setAssignmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editingSubmission, setEditingSubmission] = useState<string | null>(null);
  const [grades, setGrades] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadSubmissions();
    // Auto-refresh every 30 seconds when on this tab
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        syncSubmissions();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const syncSubmissions = async () => {
    setSyncing(true);
    await loadSubmissions();
    setSyncing(false);
  };

  const loadSubmissions = async () => {
    try {
      const { data, error } = await supabase
        .from('assignment_submissions')
        .select(`
          *,
          gw_profiles!student_id(
            full_name,
            email
          )
        `)
        .ilike('assignment_id', '%lj%')
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      
      const submissionsData = (data as any) || [];
      setSubmissions(submissionsData);
      
      // Initialize grades and feedback state
      const initialGrades: Record<string, string> = {};
      const initialFeedback: Record<string, string> = {};
      
      submissionsData.forEach((submission: JournalSubmission) => {
        initialGrades[submission.id] = submission.grade?.toString() || '';
        initialFeedback[submission.id] = submission.feedback || '';
      });
      
      setGrades(initialGrades);
      setFeedback(initialFeedback);
      setLastSyncTime(new Date());
    } catch (error) {
      console.error('Error loading submissions:', error);
      toast({
        title: "Error",
        description: "Failed to load journal submissions",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  const saveGrade = async (submissionId: string) => {
    try {
      const gradeValue = grades[submissionId] ? parseFloat(grades[submissionId]) : null;
      const feedbackValue = feedback[submissionId] || null;
      
      const { error } = await supabase
        .from('assignment_submissions')
        .update({
          grade: gradeValue,
          feedback: feedbackValue,
          graded_at: new Date().toISOString(),
          graded_by: (await supabase.auth.getUser()).data.user?.id,
          status: gradeValue !== null ? 'graded' : 'submitted'
        })
        .eq('id', submissionId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Grade saved successfully"
      });

      setEditingSubmission(null);
      loadSubmissions();
    } catch (error) {
      console.error('Error saving grade:', error);
      toast({
        title: "Error",
        description: "Failed to save grade",
        variant: "destructive"
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'graded': return 'secondary';
      case 'submitted': return 'default';
      case 'late': return 'destructive';
      default: return 'outline';
    }
  };

  const filteredSubmissions = submissions.filter(submission => {
    const matchesSearch = submission.gw_profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      submission.gw_profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      submission.file_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesAssignment = assignmentFilter === 'all' || submission.assignment_id === assignmentFilter;
    const matchesStatus = statusFilter === 'all' || submission.status === statusFilter;
    
    return matchesSearch && matchesAssignment && matchesStatus;
  });

  const uniqueAssignments = [...new Set(submissions.map(s => s.assignment_id))].sort();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <FileText className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Loading journal submissions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold">Journal Assignment Grading</h3>
          <p className="text-muted-foreground">Grade and provide feedback on student journal submissions</p>
        </div>
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={syncSubmissions}
            disabled={loading || syncing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${(loading || syncing) ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Submissions'}
          </Button>
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {filteredSubmissions.filter(s => s.status === 'graded').length} of {filteredSubmissions.length} graded
            </div>
            {lastSyncTime && (
              <div className="text-xs text-muted-foreground">
                Last synced: {lastSyncTime.toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-4 items-center">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search students or files..."
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
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="graded">Graded</SelectItem>
            <SelectItem value="late">Late</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4">
        {filteredSubmissions.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No submissions found</h3>
              <p className="text-muted-foreground">
                {searchTerm ? 'No submissions match your search criteria.' : 'No journal submissions available.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredSubmissions.map((submission) => (
            <Card key={submission.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold">
                        {submission.gw_profiles?.full_name || 'Unknown Student'}
                      </h4>
                      <Badge variant="outline">
                        {getAssignmentName(submission.assignment_id)}
                      </Badge>
                      <Badge variant={getStatusBadgeVariant(submission.status)}>
                        {submission.status}
                      </Badge>
                      {submission.grade !== null && (
                        <Badge variant="secondary">
                          Grade: {submission.grade}/100
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">
                      {submission.gw_profiles?.email}
                    </p>
                    <p className="text-sm text-muted-foreground mb-2">
                      Submitted: {new Date(submission.submitted_at).toLocaleString()}
                    </p>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        {submission.file_name}
                      </span>
                      <span className="text-muted-foreground">
                        {formatFileSize(submission.file_size)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(submission.file_url, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingSubmission(
                        editingSubmission === submission.id ? null : submission.id
                      )}
                    >
                      <Edit3 className="h-4 w-4 mr-1" />
                      {editingSubmission === submission.id ? 'Cancel' : 'Grade'}
                    </Button>
                  </div>
                </div>
                
                {editingSubmission === submission.id && (
                  <div className="mt-4 pt-4 border-t space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Grade (0-100)</label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          placeholder="Enter grade"
                          value={grades[submission.id]}
                          onChange={(e) => setGrades(prev => ({
                            ...prev,
                            [submission.id]: e.target.value
                          }))}
                        />
                      </div>
                      <div className="flex items-end">
                        <Button
                          onClick={() => saveGrade(submission.id)}
                          className="w-full"
                        >
                          <Save className="h-4 w-4 mr-2" />
                          Save Grade
                        </Button>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Feedback</label>
                      <Textarea
                        placeholder="Provide feedback to the student..."
                        value={feedback[submission.id]}
                        onChange={(e) => setFeedback(prev => ({
                          ...prev,
                          [submission.id]: e.target.value
                        }))}
                        className="min-h-[100px]"
                      />
                    </div>
                    {submission.feedback && (
                      <div className="bg-muted p-3 rounded-md">
                        <label className="text-sm font-medium">Previous Feedback:</label>
                        <p className="text-sm mt-1">{submission.feedback}</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};