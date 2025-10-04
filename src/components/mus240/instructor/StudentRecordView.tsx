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
      <Card className="h-[680px]">
        <CardContent className="flex items-center justify-center h-full text-center p-8">
          <div>
            <User className="h-20 w-20 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Student Selected</h3>
            <p className="text-gray-500">Select a student from the list on the left to view their comprehensive grade record.</p>
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
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
            <User className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <CardTitle className="text-xl">{selectedStudent.full_name}</CardTitle>
            <p className="text-sm text-gray-600">{selectedStudent.email}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Student Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

          <Card className="p-3 bg-blue-50 border-blue-200">
            <div className="flex items-center gap-2 mb-1">
              <GraduationCap className="h-3 w-3 text-blue-600" />
              <span className="text-xs font-medium">Status</span>
            </div>
            <Badge variant={selectedStudent.enrollment_status === 'enrolled' ? 'default' : 'secondary'} className="text-xs">
              {selectedStudent.enrollment_status}
            </Badge>
          </Card>

          <Card className="p-3 bg-green-50 border-green-200">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="h-3 w-3 text-green-600" />
              <span className="text-xs font-medium">Enrolled</span>
            </div>
            <p className="text-xs font-semibold">{new Date(selectedStudent.enrolled_at).toLocaleDateString()}</p>
          </Card>

          <Card className="p-3 bg-purple-50 border-purple-200">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="h-3 w-3 text-purple-600" />
              <span className="text-xs font-medium">Current</span>
            </div>
            <Badge variant={getGradeBadgeVariant(calculateOverallGrade())} className="text-xs">
              {calculateOverallGrade()}%
            </Badge>
          </Card>

          <Card className="p-3 bg-orange-50 border-orange-200">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="h-3 w-3 text-orange-600" />
              <span className="text-xs font-medium">Final</span>
            </div>
            <Badge variant="outline" className="text-xs">
              {selectedStudent.final_grade || 'Not Set'}
            </Badge>
          </Card>
        </div>

        {/* Detailed Tabs */}
        <Tabs defaultValue="assignments" className="w-full">
          <TabsList className="grid w-full grid-cols-4 h-auto">
            <TabsTrigger value="assignments" className="text-xs py-2">
              <BookOpen className="h-3 w-3 mr-1" />
              <span className="hidden sm:inline">Assignments</span> ({assignments.length})
            </TabsTrigger>
            <TabsTrigger value="journals" className="text-xs py-2">
              <FileText className="h-3 w-3 mr-1" />
              <span className="hidden sm:inline">Journals</span> ({journals.length})
            </TabsTrigger>
            <TabsTrigger value="midterm" className="text-xs py-2">
              <GraduationCap className="h-3 w-3 mr-1" />
              <span className="hidden sm:inline">Midterm</span>
            </TabsTrigger>
            <TabsTrigger value="contact" className="text-xs py-2">
              <MessageSquare className="h-3 w-3 mr-1" />
              <span className="hidden sm:inline">Contact</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="assignments" className="mt-2">
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Assignment History</h3>
              <ScrollArea className="h-72 border rounded-lg p-2 bg-gray-50">
                  {loading ? (
                    <div className="text-center py-8 text-sm">Loading...</div>
                  ) : assignments.length === 0 ? (
                    <div className="text-center py-8 text-sm text-gray-500">No assignments submitted</div>
                  ) : (
                    <div className="space-y-2">
                      {assignments.map((assignment) => (
                        <div key={assignment.id} className="flex justify-between items-center p-2 bg-white border rounded text-sm">
                          <div>
                            <p className="font-medium text-xs">{assignment.assignment_id}</p>
                            <p className="text-xs text-gray-600">
                              {new Date(assignment.submission_date).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge variant={assignment.grade ? 'default' : 'outline'} className="text-xs">
                              {assignment.grade ? `${assignment.grade}` : 'Pending'}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </TabsContent>

          <TabsContent value="journals" className="mt-2">
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Journal Entries</h3>
              <ScrollArea className="h-72 border rounded-lg p-2 bg-gray-50">
                  {loading ? (
                    <div className="text-center py-8 text-sm">Loading...</div>
                  ) : journals.length === 0 ? (
                    <div className="text-center py-8 text-sm text-gray-500">No journal entries</div>
                  ) : (
                    <div className="space-y-2">
                      {journals.map((journal) => (
                        <div key={journal.id} className="p-2 bg-white border rounded text-sm">
                          <div className="flex justify-between items-start mb-1">
                            <p className="font-medium text-xs">Journal Entry</p>
                            <Badge variant="outline" className="text-xs">
                              {journal.overall_score || 0} pts
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-600 mb-1">
                            {new Date(journal.created_at).toLocaleDateString()}
                          </p>
                          {journal.feedback && (
                            <div className="bg-gray-50 p-1.5 rounded text-xs mt-1">
                              <strong>Feedback:</strong> {journal.feedback.substring(0, 100)}...
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </TabsContent>

          <TabsContent value="midterm" className="mt-2">
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Midterm Exam</h3>
              <div className="border rounded-lg p-3 bg-gray-50 min-h-[288px]">
                {loading ? (
                  <div className="text-center py-8 text-sm">Loading...</div>
                ) : !midterm ? (
                  <div className="text-center py-8 text-sm text-gray-500">
                    <GraduationCap className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>No midterm submission</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <div>
                        <p className="font-medium text-xs">{new Date(midterm.submitted_at).toLocaleDateString()}</p>
                        <p className="text-xs text-gray-600">
                          Time: {midterm.total_time_minutes || 0} min
                        </p>
                      </div>
                      <Badge variant={midterm.grade ? 'default' : 'outline'} className="text-xs">
                        {midterm.grade ? `${midterm.grade} pts` : 'Pending'}
                      </Badge>
                    </div>
                    
                    {midterm.feedback && (
                      <div className="bg-blue-50 p-2 rounded text-xs">
                        <strong>Feedback:</strong> {midterm.feedback.substring(0, 150)}...
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="contact" className="mt-2">
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Contact Information</h3>
              <div className="border rounded-lg p-3 bg-gray-50 space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <div className="flex-1">
                    <p className="font-medium text-xs">Email</p>
                    <p className="text-xs text-gray-600">{selectedStudent.email}</p>
                  </div>
                  <Button size="sm" variant="outline" className="text-xs h-7">
                    Email
                  </Button>
                </div>
                
                {selectedStudent.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="font-medium text-xs">Phone</p>
                      <p className="text-xs text-gray-600">{selectedStudent.phone}</p>
                    </div>
                  </div>
                )}
                
                <div className="pt-2 border-t">
                  <Button className="w-full h-8 text-xs">
                    <MessageSquare className="h-3 w-3 mr-2" />
                    Send Message
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};