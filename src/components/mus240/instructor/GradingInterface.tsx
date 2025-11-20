import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BookOpen, FileText, GraduationCap, BarChart3, Eye, Edit, Save, Check, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { JournalGradingCard } from './JournalGradingCard';

interface Assignment {
  id: string;
  assignment_id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  submission_date: string;
  grade?: number;
  feedback?: string;
  file_url?: string;
  status: string;
}

interface Journal {
  id: string;
  student_id: string;
  student_name: string;
  assignment_title: string;
  assignment_id: string; // from mus240_journal_entries
  content: string;
  points_earned?: number;
  letter_grade?: string;
  points_possible: number;
  feedback?: string;
  created_at: string;
  graded_at?: string;
}

interface MidtermSubmission {
  id: string;
  user_id: string;
  student_name: string;
  submitted_at: string;
  grade?: number;
  feedback?: string;
  is_submitted: boolean;
}

export const GradingInterface: React.FC = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [journals, setJournals] = useState<Journal[]>([]);
  const [midterms, setMidterms] = useState<MidtermSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('assignments');
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [gradeInput, setGradeInput] = useState('');
  const [feedbackInput, setFeedbackInput] = useState('');

  useEffect(() => {
    loadGradingData();
  }, []);

  const loadGradingData = async () => {
    try {
      setLoading(true);
      console.log('🔍 Loading grading data...');

      // Load assignments with basic data
      const { data: assignmentData, error: assignmentError } = await supabase
        .from('assignment_submissions')
        .select('*')
        .order('submission_date', { ascending: false });

      if (assignmentError) {
        console.error('❌ Assignment data error:', assignmentError);
      } else {
        console.log('📋 Assignment data loaded:', assignmentData?.length || 0, 'records');
      }

      // Load student profiles separately
      const { data: profilesData, error: profilesError } = await supabase
        .from('gw_profiles')
        .select('user_id, full_name, email');

      if (profilesError) {
        console.error('❌ Profiles data error:', profilesError);
      } else {
        console.log('👥 Profiles data loaded:', profilesData?.length || 0, 'records');
      }

      // Load journals - get actual journal entries
      const { data: journalData, error: journalError } = await supabase
        .from('mus240_journal_entries')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (journalError) {
        console.error('❌ Journal data error:', journalError);
      } else {
        console.log('📝 Journal data loaded:', journalData?.length || 0, 'records');
      }

      // Load grades separately and link them
      const { data: gradesData, error: gradesError } = await supabase
        .from('mus240_journal_grades')
        .select('journal_id, overall_score, letter_grade, ai_feedback, instructor_feedback, graded_at, graded_by');

      if (gradesError) {
        console.error('❌ Grades data error:', gradesError);
      } else {
        console.log('🎯 Grades data loaded:', gradesData?.length || 0, 'records');
      }

      // Load midterm submissions - all of them
      const { data: midtermData, error: midtermError } = await supabase
        .from('mus240_midterm_submissions')
        .select('*')
        .eq('is_submitted', true)
        .order('submitted_at', { ascending: false });

      if (midtermError) {
        console.error('❌ Midterm data error:', midtermError);
      } else {
        console.log('🎓 Midterm data loaded:', midtermData?.length || 0, 'records');
      }

      // Create profile lookup
      const profileLookup = (profilesData || []).reduce((acc, profile) => {
        acc[profile.user_id] = profile;
        return acc;
      }, {} as Record<string, any>);

      // Format the data with student names
      const formattedAssignments = (assignmentData || []).map(a => ({
        ...a,
        student_name: profileLookup[a.student_id]?.full_name || 'Unknown',
        student_email: profileLookup[a.student_id]?.email || ''
      }));

      // Create grades lookup
      const gradesLookup = (gradesData || []).reduce((acc, grade) => {
        acc[grade.journal_id] = grade;
        return acc;
      }, {} as Record<string, any>);

      const formattedJournals = (journalData || []).map(j => {
        const grade = gradesLookup[j.id];
        // Create a more descriptive assignment title from assignment_id
        let assignmentTitle = 'Unknown Assignment';
        if (j.assignment_id) {
          // Map assignment IDs to meaningful titles
          const assignmentMap: Record<string, string> = {
            'lj1': 'Listening Journal 1',
            'lj2': 'Listening Journal 2', 
            'lj3': 'Listening Journal 3',
            'lj4': 'Listening Journal 4',
            'lj5': 'Listening Journal 5',
            'lj6': 'Listening Journal 6',
            'lj7': 'Listening Journal 7',
            'lj8': 'Listening Journal 8',
            'lj9': 'Listening Journal 9',
            'lj10': 'Listening Journal 10',
            'lj11': 'Listening Journal 11',
            'lj12': 'Listening Journal 12'
          };
          assignmentTitle = assignmentMap[j.assignment_id] || `Listening Journal ${j.assignment_id.toUpperCase()}`;
        }
        
        return {
          ...j,
          student_name: profileLookup[j.student_id]?.full_name || 'Unknown',
          points_possible: 20, // All listening journals are 20 points
          assignment_title: assignmentTitle,
          points_earned: grade?.overall_score,
          letter_grade: grade?.letter_grade,
          feedback: grade?.feedback,
          graded_at: grade?.graded_at
        };
      });

      const formattedMidterms = (midtermData || []).map(m => ({
        ...m,
        student_name: profileLookup[m.user_id]?.full_name || 'Unknown'
      }));

      console.log('📊 Final formatted data:');
      console.log('  - Assignments:', formattedAssignments.length);
      console.log('  - Journals:', formattedJournals.length);
      console.log('  - Midterms:', formattedMidterms.length);

      setAssignments(formattedAssignments);
      setJournals(formattedJournals);
      setMidterms(formattedMidterms);

      console.log('✅ All data loaded and state updated successfully');

    } catch (error) {
      console.error('Error loading grading data:', error);
      toast({
        title: "Error",
        description: "Failed to load grading data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit = (itemId: string, currentGrade?: number, currentFeedback?: string) => {
    setEditingItem(itemId);
    setGradeInput(currentGrade?.toString() || '');
    setFeedbackInput(currentFeedback || '');
  };

  const handleSaveGrade = async (type: 'assignment' | 'journal' | 'midterm', itemId: string) => {
    const grade = parseFloat(gradeInput);
    if (isNaN(grade)) {
      toast({
        title: "Invalid Grade",
        description: "Please enter a valid grade",
        variant: "destructive"
      });
      return;
    }

    // Add validation to prevent scores higher than maximum points
    let maxPoints = 100; // Default for assignments and midterms
    if (type === 'journal') {
      const journal = journals.find(j => j.id === itemId);
      maxPoints = journal?.points_possible || 10;
    }
    
    if (grade < 0 || grade > maxPoints) {
      toast({
        title: "Invalid Grade",
        description: `Grade must be between 0 and ${maxPoints}`,
        variant: "destructive"
      });
      return;
    }

    try {
      let updateData: any = {};

      if (type === 'assignment') {
        updateData = {
          grade,
          feedback: feedbackInput,
          graded_by: user?.id,
          graded_at: new Date().toISOString(),
          status: 'graded'
        };
        
        const { error } = await supabase
          .from('assignment_submissions')
          .update(updateData)
          .eq('id', itemId);
        
        if (error) throw error;
      } else if (type === 'journal') {
        const journal = journals.find(j => j.id === itemId);
        if (!journal) {
          throw new Error('Journal not found');
        }

        const upsertData = {
          student_id: journal.student_id,
          assignment_id: journal.assignment_id,
          journal_id: journal.id,
          overall_score: grade,
          feedback: feedbackInput,
          graded_by: user?.id,
          graded_at: new Date().toISOString(),
        };

        const { error } = await supabase
          .from('mus240_journal_grades')
          .upsert(upsertData, { onConflict: 'student_id,assignment_id' });

        if (error) throw error;
      } else if (type === 'midterm') {
        updateData = {
          grade,
          feedback: feedbackInput,
          graded_by: user?.id,
          graded_at: new Date().toISOString()
        };
        
        const { error } = await supabase
          .from('mus240_midterm_submissions')
          .update(updateData)
          .eq('id', itemId);
        
        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "Grade saved successfully!"
      });
      setEditingItem(null);
      setGradeInput('');
      setFeedbackInput('');
      loadGradingData(); // Reload data

    } catch (error) {
      console.error('Error saving grade:', error);
      toast({
        title: "Error",
        description: "Failed to save grade",
        variant: "destructive"
      });
    }
  };

  // Dedicated function for journal grading used by JournalGradingCard
  const handleSaveJournalGrade = async (journalId: string, points: number, feedback: string) => {
    try {
      const journal = journals.find(j => j.id === journalId);
      if (!journal) {
        throw new Error('Journal not found');
      }

      const { error } = await supabase
        .from('mus240_journal_grades')
        .upsert({
          student_id: journal.student_id,
          assignment_id: journal.assignment_id,
          journal_id: journal.id,
          overall_score: points,
          feedback,
          graded_by: user?.id,
          graded_at: new Date().toISOString(),
        }, { onConflict: 'student_id,assignment_id' });
      
      if (error) throw error;

    } catch (error) {
      console.error('Error saving journal grade:', error);
      throw error; // Let the component handle the error display
    }
  };

  const getStatusBadge = (status: string, grade?: number) => {
    if (grade !== null && grade !== undefined) {
      return <Badge variant="default"><Check className="h-3 w-3 mr-1" />Graded</Badge>;
    }
    return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
  };

  const calculateStats = () => {
    const ungradedAssignments = assignments.filter(a => a.grade === null || a.grade === undefined).length;
    const ungradedJournals = journals.filter(j => j.points_earned === null || j.points_earned === undefined).length;
    const ungradedMidterms = midterms.filter(m => m.grade === null || m.grade === undefined).length;
    
    return {
      totalUngraded: ungradedAssignments + ungradedJournals + ungradedMidterms,
      ungradedAssignments,
      ungradedJournals,
      ungradedMidterms
    };
  };

  const stats = calculateStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <BarChart3 className="h-8 w-8 animate-pulse mx-auto mb-2" />
          <p>Loading grading data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Grading Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium">Total Pending</span>
            </div>
            <p className="text-2xl font-bold text-orange-600">{stats.totalUngraded}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Assignments</span>
            </div>
            <p className="text-2xl font-bold">{stats.ungradedAssignments}</p>
            <p className="text-xs text-gray-500">pending</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Journals</span>
            </div>
            <p className="text-2xl font-bold">{stats.ungradedJournals}</p>
            <p className="text-xs text-gray-500">pending</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <GraduationCap className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium">Midterms</span>
            </div>
            <p className="text-2xl font-bold">{stats.ungradedMidterms}</p>
            <p className="text-xs text-gray-500">pending</p>
          </CardContent>
        </Card>
      </div>

      {/* Grading Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="assignments">
            <BookOpen className="h-4 w-4 mr-2" />
            Assignments ({assignments.length})
          </TabsTrigger>
          <TabsTrigger value="journals">
            <FileText className="h-4 w-4 mr-2" />
            Journals ({journals.length})
          </TabsTrigger>
          <TabsTrigger value="midterms">
            <GraduationCap className="h-4 w-4 mr-2" />
            Midterms ({midterms.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="assignments" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Assignment Submissions</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {assignments.map((assignment) => (
                    <div key={assignment.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium">{assignment.student_name}</h4>
                          <p className="text-sm text-gray-600">{assignment.assignment_id}</p>
                          <p className="text-xs text-gray-500">
                            Submitted: {new Date(assignment.submission_date).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(assignment.status, assignment.grade)}
                          {assignment.file_url && (
                            <Button size="sm" variant="outline">
                              <Eye className="h-3 w-3 mr-1" />
                              View
                            </Button>
                          )}
                        </div>
                      </div>

                      {editingItem === assignment.id ? (
                        <div className="space-y-3 pt-3 border-t">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-sm font-medium">Grade</label>
                              <Input
                                type="number"
                                placeholder="Enter grade..."
                                value={gradeInput}
                                onChange={(e) => setGradeInput(e.target.value)}
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-sm font-medium">Feedback</label>
                            <Textarea
                              placeholder="Enter feedback..."
                              value={feedbackInput}
                              onChange={(e) => setFeedbackInput(e.target.value)}
                              rows={3}
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              onClick={() => handleSaveGrade('assignment', assignment.id)}
                            >
                              <Save className="h-3 w-3 mr-1" />
                              Save
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => setEditingItem(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-between items-center pt-3 border-t">
                          <div>
                             {assignment.grade !== null && assignment.grade !== undefined ? (
                               <span className="text-sm font-medium text-green-600">
                                 Grade: {assignment.grade}
                               </span>
                             ) : (
                               <span className="text-sm text-gray-500">Not graded</span>
                             )}
                            {assignment.feedback && (
                              <p className="text-xs text-gray-600 mt-1">{assignment.feedback}</p>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStartEdit(assignment.id, assignment.grade, assignment.feedback)}
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            {assignment.grade !== null && assignment.grade !== undefined ? 'Edit' : 'Grade'}
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="journals" className="mt-4">
          <div className="space-y-1">
            {journals.length === 0 ? (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Journal Entries</h3>
                    <p className="text-gray-500">No journal entries have been submitted yet.</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                {journals.map((journal) => (
                  <JournalGradingCard
                    key={journal.id}
                    journal={journal}
                    onSaveGrade={handleSaveJournalGrade}
                    onGradeUpdate={loadGradingData}
                  />
                ))}
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="midterms" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Midterm Submissions</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {midterms.map((midterm) => (
                    <div key={midterm.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium">{midterm.student_name}</h4>
                          <p className="text-xs text-gray-500">
                            Submitted: {new Date(midterm.submitted_at).toLocaleDateString()}
                          </p>
                        </div>
                        {getStatusBadge('', midterm.grade)}
                      </div>

                      {editingItem === midterm.id ? (
                        <div className="space-y-3 pt-3 border-t">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-sm font-medium">Grade</label>
                              <Input
                                type="number"
                                placeholder="Enter grade..."
                                value={gradeInput}
                                onChange={(e) => setGradeInput(e.target.value)}
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-sm font-medium">Feedback</label>
                            <Textarea
                              placeholder="Enter feedback..."
                              value={feedbackInput}
                              onChange={(e) => setFeedbackInput(e.target.value)}
                              rows={3}
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              onClick={() => handleSaveGrade('midterm', midterm.id)}
                            >
                              <Save className="h-3 w-3 mr-1" />
                              Save
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => setEditingItem(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-between items-center pt-3 border-t">
                          <div>
                             {midterm.grade !== null && midterm.grade !== undefined ? (
                               <span className="text-sm font-medium text-green-600">
                                 Grade: {midterm.grade}
                               </span>
                             ) : (
                               <span className="text-sm text-gray-500">Not graded</span>
                             )}
                            {midterm.feedback && (
                              <p className="text-xs text-gray-600 mt-1">{midterm.feedback}</p>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStartEdit(midterm.id, midterm.grade, midterm.feedback)}
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            {midterm.grade !== null && midterm.grade !== undefined ? 'Edit' : 'Grade'}
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};