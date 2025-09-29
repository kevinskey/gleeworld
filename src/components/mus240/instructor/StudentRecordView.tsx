import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { User, BookOpen, FileText, BarChart3, MessageSquare, Calendar, Phone, Mail, GraduationCap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface StudentRecord {
  user_id: string;
  full_name: string;
  email: string;
  phone?: string;
  enrollment_status: string;
  enrolled_at: string;
  final_grade?: string;
}

interface StudentRecordViewProps {
  selectedStudent: StudentRecord | null;
  onClose: () => void;
}

export const StudentRecordView: React.FC<StudentRecordViewProps> = ({ selectedStudent, onClose }) => {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [journals, setJournals] = useState<any[]>([]);
  const [midterm, setMidterm] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedStudent) {
      loadStudentData();
    }
  }, [selectedStudent]);

  const loadStudentData = async () => {
    if (!selectedStudent) return;
    
    setLoading(true);
    try {
      // Load assignments
      const { data: assignmentData } = await supabase
        .from('assignment_submissions')
        .select('*')
        .eq('student_id', selectedStudent.user_id)
        .order('submission_date', { ascending: false });

      // Load journals
      const { data: journalData } = await supabase
        .from('mus240_journal_grades')
        .select('*')
        .eq('student_id', selectedStudent.user_id)
        .order('created_at', { ascending: false });

      // Load midterm
      const { data: midtermData } = await supabase
        .from('mus240_midterm_submissions')
        .select('*')
        .eq('user_id', selectedStudent.user_id)
        .single();

      setAssignments(assignmentData || []);
      setJournals(journalData || []);
      setMidterm(midtermData);
    } catch (error) {
      console.error('Error loading student data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!selectedStudent) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-full text-center p-8">
          <div>
            <User className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No Student Selected</h3>
            <p className="text-gray-500">Select a student from the list to view their detailed record.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const calculateOverallGrade = () => {
    const assignmentPoints = assignments.reduce((sum, a) => sum + (a.grade || 0), 0);
    const journalPoints = journals.reduce((sum, j) => sum + (j.points_earned || 0), 0);
    const midtermPoints = midterm?.grade || 0;
    
    const totalPoints = assignmentPoints + journalPoints + midtermPoints;
    const totalPossible = 725; // Total possible points for the course
    
    return totalPossible > 0 ? Math.round((totalPoints / totalPossible) * 100) : 0;
  };

  const getGradeBadgeVariant = (grade: number) => {
    if (grade >= 90) return 'default';
    if (grade >= 80) return 'secondary';
    if (grade >= 70) return 'outline';
    return 'destructive';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
            <User className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">{selectedStudent.full_name}</h2>
            <p className="text-gray-600">{selectedStudent.email}</p>
          </div>
        </div>
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>

      {/* Student Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <GraduationCap className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Enrollment Status</span>
            </div>
            <Badge variant={selectedStudent.enrollment_status === 'enrolled' ? 'default' : 'secondary'}>
              {selectedStudent.enrollment_status}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Enrolled</span>
            </div>
            <p className="text-sm">{new Date(selectedStudent.enrolled_at).toLocaleDateString()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium">Overall Grade</span>
            </div>
            <Badge variant={getGradeBadgeVariant(calculateOverallGrade())}>
              {calculateOverallGrade()}%
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium">Final Grade</span>
            </div>
            <Badge variant="outline">
              {selectedStudent.final_grade || 'Not Set'}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tabs */}
      <Tabs defaultValue="assignments" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="assignments">
            <BookOpen className="h-4 w-4 mr-2" />
            Assignments ({assignments.length})
          </TabsTrigger>
          <TabsTrigger value="journals">
            <FileText className="h-4 w-4 mr-2" />
            Journals ({journals.length})
          </TabsTrigger>
          <TabsTrigger value="midterm">
            <GraduationCap className="h-4 w-4 mr-2" />
            Midterm
          </TabsTrigger>
          <TabsTrigger value="contact">
            <MessageSquare className="h-4 w-4 mr-2" />
            Contact
          </TabsTrigger>
        </TabsList>

        <TabsContent value="assignments" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Assignment History</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                {loading ? (
                  <div className="text-center py-8">Loading assignments...</div>
                ) : assignments.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No assignments submitted</div>
                ) : (
                  <div className="space-y-3">
                    {assignments.map((assignment) => (
                      <div key={assignment.id} className="flex justify-between items-center p-3 border rounded">
                        <div>
                          <p className="font-medium">{assignment.assignment_id}</p>
                          <p className="text-sm text-gray-600">
                            Submitted: {new Date(assignment.submission_date).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant={assignment.grade ? 'default' : 'outline'}>
                            {assignment.grade ? `${assignment.grade} pts` : 'Ungraded'}
                          </Badge>
                          <p className="text-xs text-gray-500 mt-1">{assignment.status}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="journals" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Journal Entries</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                {loading ? (
                  <div className="text-center py-8">Loading journals...</div>
                ) : journals.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No journal entries</div>
                ) : (
                  <div className="space-y-3">
                    {journals.map((journal) => (
                      <div key={journal.id} className="p-3 border rounded">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium">Journal Entry</h4>
                          <Badge variant="outline">
                            {journal.points_earned || 0} / {journal.points_possible || 0} pts
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          {new Date(journal.created_at).toLocaleDateString()}
                        </p>
                        {journal.feedback && (
                          <div className="bg-gray-50 p-2 rounded text-sm">
                            <strong>Feedback:</strong> {journal.feedback}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="midterm" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Midterm Exam</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading midterm data...</div>
              ) : !midterm ? (
                <div className="text-center py-8 text-gray-500">
                  <GraduationCap className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p>No midterm submission found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">Submitted: {new Date(midterm.submitted_at).toLocaleDateString()}</p>
                      <p className="text-sm text-gray-600">
                        Time taken: {midterm.total_time_minutes || 0} minutes
                      </p>
                    </div>
                    <Badge variant={midterm.grade ? 'default' : 'outline'}>
                      {midterm.grade ? `${midterm.grade} pts` : 'Ungraded'}
                    </Badge>
                  </div>
                  
                  {midterm.feedback && (
                    <div className="bg-blue-50 p-4 rounded">
                      <h4 className="font-medium mb-2">Instructor Feedback</h4>
                      <p className="text-sm">{midterm.feedback}</p>
                    </div>
                  )}
                  
                  {midterm.comprehensive_feedback && (
                    <div className="bg-green-50 p-4 rounded">
                      <h4 className="font-medium mb-2">AI-Generated Feedback</h4>
                      <p className="text-sm">{midterm.comprehensive_feedback}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contact" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="font-medium">Email</p>
                  <p className="text-sm text-gray-600">{selectedStudent.email}</p>
                </div>
                <Button size="sm" variant="outline">
                  Send Email
                </Button>
              </div>
              
              {selectedStudent.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="font-medium">Phone</p>
                    <p className="text-sm text-gray-600">{selectedStudent.phone}</p>
                  </div>
                </div>
              )}
              
              <div className="pt-4 border-t">
                <Button className="w-full">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Send Message to Student
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};