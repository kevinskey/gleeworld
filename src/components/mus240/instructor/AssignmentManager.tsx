import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Edit, Eye, Calendar, Users, Brain, BarChart3, BookOpen, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { mus240Assignments } from '@/data/mus240Assignments';

interface Assignment {
  id: string;
  title: string;
  description: string;
  prompt: string;
  points: number;
  due_date: string;
  is_active: boolean;
  assignment_type: string;
  assignment_code?: string;
  created_at: string;
}

interface JournalSubmission {
  id: string;
  assignment_id: string;
  student_id: string;
  content: string;
  word_count: number;
  is_published: boolean;
  submitted_at: string;
  grade: number | null;
  feedback: any;
  student_name?: string;
  student_email?: string;
}

export const AssignmentManager = () => {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, JournalSubmission[]>>({});
  const [grades, setGrades] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    prompt: '',
    points: 100,
    due_date: '',
    assignment_type: 'listening_journal'
  });

  useEffect(() => {
    fetchAssignments();
    fetchSubmissions();
    fetchGrades();
  }, []);

  const fetchAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from('mus240_assignments')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAssignments(data || []);
    } catch (error) {
      console.error('Error fetching assignments:', error);
      toast.error('Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubmissions = async () => {
    try {
      // Fetch all journal entries
      const { data: journalData, error: journalError } = await supabase
        .from('mus240_journal_entries')
        .select('*')
        .order('submitted_at', { ascending: false });

      if (journalError) throw journalError;

      // Get unique student IDs
      const studentIds = [...new Set(journalData?.map(j => j.student_id) || [])];

      // Fetch student profiles
      const { data: profiles, error: profileError } = await supabase
        .from('gw_profiles')
        .select('user_id, full_name, email')
        .in('user_id', studentIds);

      if (profileError) throw profileError;

      // Map profiles by user_id
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      // Create a mapping from assignment code (like "lj7") to database title
      const codeToTitleMap: Record<string, string> = {};
      mus240Assignments.forEach(week => {
        week.assignments.forEach(assignment => {
          codeToTitleMap[assignment.id] = assignment.title;
        });
      });

      // Group submissions by assignment code and add student info
      const groupedSubmissions: Record<string, JournalSubmission[]> = {};
      
      journalData?.forEach(entry => {
        const profile = profileMap.get(entry.student_id);
        
        const submission: JournalSubmission = {
          ...entry,
          student_name: profile?.full_name,
          student_email: profile?.email,
        };

        const code = entry.assignment_id; // e.g., "lj7"
        if (!groupedSubmissions[code]) {
          groupedSubmissions[code] = [];
        }
        groupedSubmissions[code].push(submission);
      });

      setSubmissions(groupedSubmissions);
    } catch (error) {
      console.error('Error fetching submissions:', error);
    }
  };

  const fetchGrades = async () => {
    try {
      const { data: gradeData, error } = await supabase
        .from('mus240_journal_grades')
        .select('*');

      if (error) throw error;

      // Group grades by journal_id for easy lookup
      const groupedGrades: Record<string, any[]> = {};
      gradeData?.forEach(grade => {
        if (!groupedGrades[grade.journal_id]) {
          groupedGrades[grade.journal_id] = [];
        }
        groupedGrades[grade.journal_id].push(grade);
      });

      setGrades(groupedGrades);
    } catch (error) {
      console.error('Error fetching grades:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingAssignment) {
        const { error } = await supabase
          .from('mus240_assignments')
          .update({
            title: formData.title,
            description: formData.description,
            prompt: formData.prompt,
            points: formData.points,
            due_date: formData.due_date || null,
            assignment_type: formData.assignment_type
          })
          .eq('id', editingAssignment.id);

        if (error) throw error;
        toast.success('Assignment updated successfully');
      } else {
        const { error } = await supabase
          .from('mus240_assignments')
          .insert({
            title: formData.title,
            description: formData.description,
            prompt: formData.prompt,
            points: formData.points,
            due_date: formData.due_date || null,
            assignment_type: formData.assignment_type
          });

        if (error) throw error;
        toast.success('Assignment created successfully');
      }

      setIsCreateModalOpen(false);
      setEditingAssignment(null);
      setFormData({
        title: '',
        description: '',
        prompt: '',
        points: 100,
        due_date: '',
        assignment_type: 'listening_journal'
      });
      await Promise.all([fetchAssignments(), fetchSubmissions(), fetchGrades()]);
    } catch (error) {
      console.error('Error saving assignment:', error);
      toast.error('Failed to save assignment');
    } finally {
      setLoading(false);
    }
  };

  const toggleAssignmentStatus = async (assignment: Assignment) => {
    try {
      const { error } = await supabase
        .from('mus240_assignments')
        .update({ is_active: !assignment.is_active })
        .eq('id', assignment.id);

      if (error) throw error;
      
      toast.success(
        assignment.is_active ? 'Assignment deactivated' : 'Assignment activated'
      );
      await fetchAssignments();
    } catch (error) {
      console.error('Error updating assignment status:', error);
      toast.error('Failed to update assignment status');
    }
  };

  const getSubmissionCount = (assignmentCode?: string) => {
    if (!assignmentCode) return 0;
    return submissions[assignmentCode]?.length || 0;
  };

  const getGradedCount = (assignmentCode?: string) => {
    if (!assignmentCode) return 0;
    return submissions[assignmentCode]?.filter(s => s.grade !== null).length || 0;
  };

  const getUngradedCount = (assignmentCode?: string) => {
    if (!assignmentCode) return 0;
    const subs = submissions[assignmentCode] || [];
    return subs.filter(s => {
      const gradeRecords = grades[s.id] || [];
      return gradeRecords.length === 0 || gradeRecords.every(g => g.overall_score === null);
    }).length;
  };

  const getNeedsFinalGradeCount = (assignmentCode?: string) => {
    if (!assignmentCode) return 0;
    const subs = submissions[assignmentCode] || [];
    return subs.filter(s => {
      const gradeRecords = grades[s.id] || [];
      // Has AI grade but no instructor final grade
      return gradeRecords.some(g => g.ai_overall_score !== null && g.overall_score === null);
    }).length;
  };

  const getLastEditTime = (assignmentCode?: string) => {
    if (!assignmentCode) return null;
    const subs = submissions[assignmentCode] || [];
    if (subs.length === 0) return null;
    
    const sortedByDate = [...subs].sort((a, b) => 
      new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
    );
    
    return sortedByDate[0]?.submitted_at;
  };

  const openEditModal = (assignment: Assignment) => {
    setEditingAssignment(assignment);
    setFormData({
      title: assignment.title,
      description: assignment.description || '',
      prompt: assignment.prompt,
      points: assignment.points,
      due_date: assignment.due_date ? assignment.due_date.split('T')[0] : '',
      assignment_type: assignment.assignment_type
    });
    setIsCreateModalOpen(true);
  };

  const getAIAssistance = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('mus240-instructor-assistant', {
        body: {
          task: 'assignment_ideas',
          prompt: 'Generate 3 creative listening journal assignment ideas for my Survey of African American Music course. Include specific music examples and learning objectives.'
        }
      });

      if (error) throw error;
      
      // For now, just show the response in a toast - could be enhanced with a modal
      toast.success('AI suggestions generated! Check the console for ideas.');
      console.log('AI Assignment Ideas:', data.response);
    } catch (error) {
      console.error('Error getting AI assistance:', error);
      toast.error('Failed to get AI assistance');
    }
  };

  if (loading && assignments.length === 0) {
    return <div>Loading assignments...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Assignment Manager</h2>
          <p className="text-gray-600">Create and manage listening journal assignments</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={getAIAssistance} variant="outline">
            <Brain className="h-4 w-4 mr-2" />
            AI Ideas
          </Button>
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Assignment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingAssignment ? 'Edit Assignment' : 'Create New Assignment'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="prompt">Assignment Prompt</Label>
                  <Textarea
                    id="prompt"
                    value={formData.prompt}
                    onChange={(e) => setFormData({...formData, prompt: e.target.value})}
                    rows={6}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="points">Points</Label>
                    <Input
                      id="points"
                      type="number"
                      value={formData.points}
                      onChange={(e) => setFormData({...formData, points: parseInt(e.target.value)})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="due_date">Due Date</Label>
                    <Input
                      id="due_date"
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {editingAssignment ? 'Update' : 'Create'} Assignment
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Assignments Grid */}
      <div className="grid gap-4">
        {assignments.map((assignment) => (
          <Card key={assignment.id} className={`${!assignment.is_active ? 'opacity-60' : ''}`}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {assignment.title}
                    {assignment.is_active ? (
                      <Badge variant="default">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </CardTitle>
                  {assignment.description && (
                    <p className="text-sm text-gray-600 mt-1">{assignment.description}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEditModal(assignment)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant={assignment.is_active ? "destructive" : "default"}
                    onClick={() => toggleAssignmentStatus(assignment)}
                  >
                    {assignment.is_active ? 'Deactivate' : 'Activate'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Prompt:</p>
                  <p className="text-sm bg-gray-50 p-2 rounded">
                    {assignment.prompt.length > 200 
                      ? `${assignment.prompt.substring(0, 200)}...` 
                      : assignment.prompt
                    }
                  </p>
                </div>
                {/* Stats Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-muted/30 rounded-lg">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-foreground">
                      {getSubmissionCount(assignment.assignment_code)}
                    </div>
                    <div className="text-xs text-muted-foreground">Submissions</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {getUngradedCount(assignment.assignment_code)}
                    </div>
                    <div className="text-xs text-muted-foreground">Ungraded</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {getNeedsFinalGradeCount(assignment.assignment_code)}
                    </div>
                    <div className="text-xs text-muted-foreground">Need Final Grade</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-semibold text-foreground">
                      {getLastEditTime(assignment.assignment_code) 
                        ? format(new Date(getLastEditTime(assignment.assignment_code)!), 'MMM d, h:mm a')
                        : 'No edits'
                      }
                    </div>
                    <div className="text-xs text-muted-foreground">Last Student Edit</div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <BarChart3 className="h-4 w-4" />
                      {assignment.points} points
                    </div>
                    {assignment.due_date && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Due {new Date(assignment.due_date).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                  {getSubmissionCount(assignment.assignment_code) > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/classes/mus240/instructor/journals?assignment=${assignment.assignment_code}`)}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      View Submissions
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {assignments.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No assignments yet</h3>
            <p className="text-gray-600 mb-4">Create your first listening journal assignment to get started.</p>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Assignment
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};