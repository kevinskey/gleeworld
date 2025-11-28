import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Edit, Eye, Calendar, Users, Brain, BarChart3, BookOpen, FileText, ArrowUpDown, ChevronDown, ChevronUp } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { mus240Assignments } from '@/data/mus240Assignments';
import { InlineJournalGrader } from './InlineJournalGrader';
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
  const [sortBy, setSortBy] = useState<'date' | 'due_date' | 'submissions' | 'ungraded' | 'needs_final' | 'journal_number'>('journal_number');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<string>('all');
  const [students, setStudents] = useState<Array<{
    user_id: string;
    full_name: string;
    email: string;
  }>>([]);
  const [isGradingAll, setIsGradingAll] = useState(false);
  const [expandedAssignment, setExpandedAssignment] = useState<string | null>(null);
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
  useEffect(() => {
    if (Object.keys(submissions).length > 0) {
      fetchStudents();
    }
  }, [submissions]);
  const fetchAssignments = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('mus240_assignments').select('*').order('created_at', {
        ascending: false
      });
      if (error) throw error;
      setAssignments(data || []);
    } catch (error) {
      console.error('Error fetching assignments:', error);
      toast.error('Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };
  const fetchStudents = async () => {
    try {
      // Get all unique student IDs from submissions
      const allStudentIds = new Set<string>();
      Object.values(submissions).forEach(submissionList => {
        submissionList.forEach(sub => allStudentIds.add(sub.student_id));
      });
      if (allStudentIds.size === 0) return;
      const {
        data: profiles,
        error
      } = await supabase.from('gw_profiles').select('user_id, full_name, email').in('user_id', Array.from(allStudentIds)).order('full_name');
      if (error) throw error;
      setStudents(profiles || []);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };
  const fetchSubmissions = async () => {
    try {
      // Fetch all journal entries
      const {
        data: journalData,
        error: journalError
      } = await supabase.from('mus240_journal_entries').select('*').order('submitted_at', {
        ascending: false
      });
      if (journalError) throw journalError;

      // Get unique student IDs
      const studentIds = [...new Set(journalData?.map(j => j.student_id) || [])];

      // Fetch student profiles
      const {
        data: profiles,
        error: profileError
      } = await supabase.from('gw_profiles').select('user_id, full_name, email').in('user_id', studentIds);
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
          student_email: profile?.email
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
      const {
        data: gradeData,
        error
      } = await supabase.from('mus240_journal_grades').select('*');
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
        const {
          error
        } = await supabase.from('mus240_assignments').update({
          title: formData.title,
          description: formData.description,
          prompt: formData.prompt,
          points: formData.points,
          due_date: formData.due_date || null,
          assignment_type: formData.assignment_type
        }).eq('id', editingAssignment.id);
        if (error) throw error;
        toast.success('Assignment updated successfully');
      } else {
        const {
          error
        } = await supabase.from('mus240_assignments').insert({
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
      const {
        error
      } = await supabase.from('mus240_assignments').update({
        is_active: !assignment.is_active
      }).eq('id', assignment.id);
      if (error) throw error;
      toast.success(assignment.is_active ? 'Assignment deactivated' : 'Assignment activated');
      await fetchAssignments();
    } catch (error) {
      console.error('Error updating assignment status:', error);
      toast.error('Failed to update assignment status');
    }
  };
  const getFilteredSubmissions = (assignmentCode?: string) => {
    if (!assignmentCode) return [];
    const subs = submissions[assignmentCode] || [];
    if (selectedStudent === 'all') return subs;
    return subs.filter(s => s.student_id === selectedStudent);
  };

  const getSubmissionCount = (assignmentCode?: string) => {
    return getFilteredSubmissions(assignmentCode).length;
  };
  
  const getGradedCount = (assignmentCode?: string) => {
    return getFilteredSubmissions(assignmentCode).filter(s => s.grade !== null).length;
  };
  
  const getUngradedCount = (assignmentCode?: string) => {
    const subs = getFilteredSubmissions(assignmentCode);
    return subs.filter(s => {
      const gradeRecords = grades[s.id] || [];
      return gradeRecords.length === 0 || gradeRecords.every(g => g.overall_score === null);
    }).length;
  };
  
  const getNeedsFinalGradeCount = (assignmentCode?: string) => {
    const subs = getFilteredSubmissions(assignmentCode);
    return subs.filter(s => {
      const gradeRecords = grades[s.id] || [];
      // Has AI grade but no instructor final grade
      return gradeRecords.some(g => g.ai_overall_score !== null && g.overall_score === null);
    }).length;
  };
  const getLastEditTime = (assignmentCode?: string) => {
    const subs = getFilteredSubmissions(assignmentCode);
    if (subs.length === 0) return null;
    const sortedByDate = [...subs].sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime());
    return sortedByDate[0]?.submitted_at;
  };

  const getStudentGrade = (assignmentCode?: string) => {
    if (selectedStudent === 'all' || !assignmentCode) return null;
    const subs = getFilteredSubmissions(assignmentCode);
    if (subs.length === 0) return null;
    
    const submission = subs[0];
    const gradeRecords = grades[submission.id] || [];
    if (gradeRecords.length === 0) return null;
    
    const grade = gradeRecords[0];
    return {
      score: grade.overall_score,
      points_possible: 20, // All journals are out of 20
      letter_grade: grade.letter_grade
    };
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
      const {
        data,
        error
      } = await supabase.functions.invoke('mus240-instructor-assistant', {
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

  const handleGradeAllWithAI = async (regradeAll = false) => {
    if (selectedStudent === 'all') {
      toast.error('Please select a specific student to grade their work');
      return;
    }

    setIsGradingAll(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      // Get submissions for the selected student
      const submissionsToGrade: Array<{journalId: string; assignmentId: string}> = [];
      
      for (const assignment of assignments) {
        if (!assignment.assignment_code) continue;
        const subs = getFilteredSubmissions(assignment.assignment_code);
        
        for (const sub of subs) {
          if (regradeAll) {
            // Regrade all submissions
            submissionsToGrade.push({
              journalId: sub.id,
              assignmentId: assignment.id
            });
          } else {
            // Only grade ungraded submissions
            const gradeRecords = grades[sub.id] || [];
            const needsGrading = gradeRecords.length === 0 || gradeRecords.every(g => g.overall_score === null);
            
            if (needsGrading) {
              submissionsToGrade.push({
                journalId: sub.id,
                assignmentId: assignment.id
              });
            }
          }
        }
      }

      if (submissionsToGrade.length === 0) {
        toast.info(regradeAll ? 'No submissions found for this student' : 'No ungraded submissions found for this student');
        setIsGradingAll(false);
        return;
      }

      toast.info(`${regradeAll ? 'Regrading' : 'Grading'} ${submissionsToGrade.length} submission${submissionsToGrade.length !== 1 ? 's' : ''}...`);

      // Grade each submission
      for (const { journalId, assignmentId } of submissionsToGrade) {
        try {
          const { data, error } = await supabase.functions.invoke('grade-journal', {
            body: {
              assignment_id: assignmentId,
              journal_id: journalId
            }
          });

          if (error) throw error;
          if (data?.success) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch (error) {
          console.error(`Error grading journal ${journalId}:`, error);
          errorCount++;
        }
      }

      // Refresh data
      await Promise.all([fetchSubmissions(), fetchGrades()]);

      if (successCount > 0) {
        toast.success(`Successfully graded ${successCount} submission${successCount !== 1 ? 's' : ''}${errorCount > 0 ? ` (${errorCount} failed)` : ''}`);
      } else {
        toast.error('Failed to grade submissions');
      }
    } catch (error) {
      console.error('Error in batch grading:', error);
      toast.error('Failed to grade all submissions');
    } finally {
      setIsGradingAll(false);
    }
  };
  
  const extractJournalNumber = (title: string): number => {
    const match = title.match(/(?:LISTENING JOURNAL|JOURNAL|LJ)\s*(\d+)/i);
    return match ? parseInt(match[1], 10) : 999; // Put unnumbered at end
  };
  const getSortedAssignments = () => {
    const sorted = [...assignments];
    switch (sortBy) {
      case 'journal_number':
        return sorted.sort((a, b) => extractJournalNumber(a.title) - extractJournalNumber(b.title));
      case 'due_date':
        return sorted.sort((a, b) => {
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        });
      case 'submissions':
        return sorted.sort((a, b) => getSubmissionCount(b.assignment_code) - getSubmissionCount(a.assignment_code));
      case 'ungraded':
        return sorted.sort((a, b) => getUngradedCount(b.assignment_code) - getUngradedCount(a.assignment_code));
      case 'needs_final':
        return sorted.sort((a, b) => getNeedsFinalGradeCount(b.assignment_code) - getNeedsFinalGradeCount(a.assignment_code));
      case 'date':
      default:
        return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
  };
  if (loading && assignments.length === 0) {
    return <div>Loading assignments...</div>;
  }
  return <div className="space-y-3 sm:space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <div className="w-full sm:w-auto">
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground">Assignment Manager</h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Create and manage listening journal assignments</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center w-full sm:w-auto">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <Select value={selectedStudent} onValueChange={setSelectedStudent}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="All Students" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Students</SelectItem>
                {students.map(student => <SelectItem key={student.user_id} value={student.user_id}>
                    {student.full_name}
                  </SelectItem>)}
              </SelectContent>
            </Select>
            {selectedStudent !== 'all' && (
              <>
                <Button 
                  onClick={() => handleGradeAllWithAI(false)}
                  disabled={isGradingAll}
                  variant="outline"
                  size="sm"
                  className="whitespace-nowrap"
                >
                  <Brain className="h-4 w-4 mr-2" />
                  {isGradingAll ? 'Grading...' : 'Grade All with AI'}
                </Button>
                <Button 
                  onClick={() => handleGradeAllWithAI(true)}
                  disabled={isGradingAll}
                  variant="default"
                  size="sm"
                  className="whitespace-nowrap"
                >
                  <Brain className="h-4 w-4 mr-2" />
                  {isGradingAll ? 'Regrading...' : 'Regrade All with AI'}
                </Button>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <ArrowUpDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-full sm:w-[160px] md:w-[180px]">
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="journal_number">Journal #</SelectItem>
                <SelectItem value="date">Created Date</SelectItem>
                <SelectItem value="due_date">Due Date</SelectItem>
                <SelectItem value="submissions">Submissions</SelectItem>
                <SelectItem value="ungraded">Ungraded</SelectItem>
                <SelectItem value="needs_final">Needs Final</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                <span className="whitespace-nowrap">New Assignment</span>
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
                  <Input id="title" value={formData.title} onChange={e => setFormData({
                  ...formData,
                  title: e.target.value
                })} required />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" value={formData.description} onChange={e => setFormData({
                  ...formData,
                  description: e.target.value
                })} rows={3} />
                </div>
                <div>
                  <Label htmlFor="prompt">Assignment Prompt</Label>
                  <Textarea id="prompt" value={formData.prompt} onChange={e => setFormData({
                  ...formData,
                  prompt: e.target.value
                })} rows={6} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="points">Points</Label>
                    <Input id="points" type="number" value={formData.points} onChange={e => setFormData({
                    ...formData,
                    points: parseInt(e.target.value)
                  })} required />
                  </div>
                  <div>
                    <Label htmlFor="due_date">Due Date</Label>
                    <Input id="due_date" type="date" value={formData.due_date} onChange={e => setFormData({
                    ...formData,
                    due_date: e.target.value
                  })} />
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
      <div className="grid gap-3 sm:gap-4">
        {getSortedAssignments().map(assignment => <Card key={assignment.id} className={`${!assignment.is_active ? 'opacity-60' : ''}`}>
            <CardHeader className="p-3 sm:p-4 md:p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                <div className="w-full sm:flex-1">
                  <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center gap-2 text-base sm:text-lg md:text-xl">
                    <span className="break-words">{assignment.title}</span>
                    {assignment.is_active ? <Badge variant="default" className="whitespace-nowrap">Active</Badge> : <Badge variant="secondary" className="whitespace-nowrap">Inactive</Badge>}
                  </CardTitle>
                  {assignment.description && <p className="text-xs sm:text-sm text-muted-foreground mt-1 break-words">{assignment.description}</p>}
                </div>
                <div className="flex gap-2 w-full sm:w-auto justify-end">
                  <Button size="sm" variant="outline" onClick={() => openEditModal(assignment)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant={assignment.is_active ? "destructive" : "default"} onClick={() => toggleAssignmentStatus(assignment)} className="whitespace-nowrap">
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
                    {assignment.prompt.length > 200 ? `${assignment.prompt.substring(0, 200)}...` : assignment.prompt}
                  </p>
                </div>
                {/* Stats Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-muted/30 rounded-lg">
                  {selectedStudent !== 'all' ? (
                    <>
                      {/* Student-specific grade view */}
                      <div className="col-span-2 md:col-span-1 text-center">
                        {(() => {
                          const grade = getStudentGrade(assignment.assignment_code);
                          if (grade?.score !== null && grade?.score !== undefined) {
                            return (
                              <>
                                <div className="text-2xl font-bold text-green-600">
                                  {grade.score.toFixed(1)}/{grade.points_possible}
                                </div>
                                <div className="text-xs text-muted-foreground">Grade</div>
                              </>
                            );
                          }
                          return (
                            <>
                              <div className="text-lg font-semibold text-gray-500">
                                Not graded
                              </div>
                              <div className="text-xs text-muted-foreground">Grade</div>
                            </>
                          );
                        })()}
                      </div>
                      <div className="col-span-2 md:col-span-1 text-center">
                        <div className="text-2xl font-bold text-foreground">
                          {getSubmissionCount(assignment.assignment_code)}
                        </div>
                        <div className="text-xs text-muted-foreground">Submissions</div>
                      </div>
                      <div className="col-span-2 md:col-span-2 text-center">
                        <div className="text-sm font-semibold text-foreground">
                          {getLastEditTime(assignment.assignment_code) ? format(new Date(getLastEditTime(assignment.assignment_code)!), 'MMM d, h:mm a') : 'No edits'}
                        </div>
                        <div className="text-xs text-muted-foreground">Last Student Edit</div>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Original all-students view */}
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
                          {getLastEditTime(assignment.assignment_code) ? format(new Date(getLastEditTime(assignment.assignment_code)!), 'MMM d, h:mm a') : 'No edits'}
                        </div>
                        <div className="text-xs text-muted-foreground">Last Student Edit</div>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <BarChart3 className="h-4 w-4" />
                      {assignment.points} points
                    </div>
                    {assignment.due_date && <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Due {new Date(assignment.due_date).toLocaleDateString()}
                      </div>}
                  </div>
                  {getSubmissionCount(assignment.assignment_code) > 0 && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        if (selectedStudent !== 'all') {
                          // Toggle expansion for inline viewing when student is selected
                          setExpandedAssignment(
                            expandedAssignment === assignment.id ? null : assignment.id
                          );
                        } else {
                          // Navigate to journals page when viewing all students
                          navigate(`/mus-240/instructor/journals?assignment=${assignment.assignment_code}`);
                        }
                      }}
                    >
                      {selectedStudent !== 'all' && expandedAssignment === assignment.id ? (
                        <>
                          <ChevronUp className="h-4 w-4 mr-2" />
                          Hide Submission
                        </>
                      ) : (
                        <>
                          <FileText className="h-4 w-4 mr-2" />
                          View Submission{selectedStudent === 'all' ? 's' : ''}
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>

            {/* Inline Journal Grader - shown when assignment is expanded and student is selected */}
            {expandedAssignment === assignment.id && selectedStudent !== 'all' && (
              <InlineJournalGrader
                assignmentId={assignment.id}
                assignmentCode={assignment.assignment_code || ''}
                studentId={selectedStudent}
                onClose={() => setExpandedAssignment(null)}
              />
            )}
          </Card>)}
      </div>

      {assignments.length === 0 && <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No assignments yet</h3>
            <p className="text-gray-600 mb-4">Create your first listening journal assignment to get started.</p>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Assignment
            </Button>
          </CardContent>
        </Card>}
    </div>;
};