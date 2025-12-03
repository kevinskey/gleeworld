import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  BookOpen,
  FileText,
  GraduationCap,
  Clock,
  CheckCircle,
  AlertCircle,
  Edit,
  Eye,
  Mail,
  Bell,
  TrendingUp,
  Calendar,
  Trophy,
  MessageSquare,
  Brain,
  ArrowUpDown,
  Home,
  FileCheck,
  Play,
  RotateCcw
} from 'lucide-react';
import { AIGroupRoleSubmission } from '@/components/mus240/student/AIGroupRoleSubmission';
import { useStudentSubmissions } from '@/hooks/useStudentSubmissions';
import { useMus240Progress } from '@/hooks/useMus240Progress';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export const StudentDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { submissions, loading: submissionsLoading } = useStudentSubmissions();
  const { gradeSummary, participationGrade, loading: progressLoading } = useMus240Progress();
  
  // Check if user is admin
  const [isAdmin, setIsAdmin] = useState(false);
  
  useEffect(() => {
    const checkAdmin = async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from('gw_profiles')
        .select('is_admin, is_super_admin')
        .eq('user_id', user.id)
        .single();
      setIsAdmin(data?.is_admin || data?.is_super_admin || false);
    };
    checkAdmin();
  }, [user]);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailMessage, setEmailMessage] = useState('');
  const [sortBy, setSortBy] = useState<'dueDate' | 'title'>('dueDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Fetch published tests for practice
  const { data: practiceTests = [], isLoading: testsLoading } = useQuery({
    queryKey: ['practice-tests', 'mus240'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('glee_academy_tests')
        .select('*')
        .eq('course_id', 'mus240')
        .eq('is_published', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Filter out real exams (midterms, finals) - only show practice tests
      const filtered = (data || []).filter(test => {
        const title = test.title.toLowerCase();
        return !title.includes('midterm') && !title.includes('final');
      });
      
      return filtered;
    },
  });

  // Fetch ALL published tests (including exams)
  const { data: allTests = [], isLoading: allTestsLoading } = useQuery({
    queryKey: ['all-tests', 'mus240'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('glee_academy_tests')
        .select('*')
        .eq('course_id', 'mus240')
        .eq('is_published', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch student's test submissions
  const { data: testSubmissions = [] } = useQuery({
    queryKey: ['test-submissions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('test_submissions')
        .select('*')
        .eq('student_id', user.id);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Get all incomplete assignments
  const incompleteAssignments = submissions.filter(s => !s.is_published);

  // Sort incomplete assignments
  const sortedIncompleteAssignments = [...incompleteAssignments].sort((a, b) => {
    let comparison = 0;
    if (sortBy === 'dueDate') {
      comparison = new Date(a.assignment_due_date).getTime() - new Date(b.assignment_due_date).getTime();
    } else if (sortBy === 'title') {
      comparison = a.assignment_title.localeCompare(b.assignment_title);
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  // Get upcoming assignments (due within 7 days)
  const upcomingAssignments = incompleteAssignments.filter(s => {
    const dueDate = new Date(s.assignment_due_date + 'T12:00:00');
    const now = new Date();
    const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 7;
  });


  // Show popup for assignments due soon
  useEffect(() => {
    const dueSoonAssignments = submissions.filter(s => {
      if (s.is_published) return false;
      const dueDate = new Date(s.assignment_due_date + 'T12:00:00');
      const now = new Date();
      const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 3;
    });

    if (dueSoonAssignments.length > 0) {
      const lastShown = localStorage.getItem('mus240-due-soon-shown');
      const today = new Date().toDateString();
      
      if (lastShown !== today) {
        toast({
          title: "Assignments Due Soon!",
          description: `You have ${dueSoonAssignments.length} assignment(s) due within 3 days.`,
          variant: "default",
        });
        localStorage.setItem('mus240-due-soon-shown', today);
      }
    }
  }, [submissions, toast]);

  const handleEmailInstructor = async () => {
    if (!emailMessage.trim()) {
      toast({
        title: "Message Required",
        description: "Please enter a message before sending.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Get student's name from profile
      const { data: profile } = await supabase
        .from('gw_profiles')
        .select('full_name, first_name, last_name')
        .eq('user_id', user?.id)
        .single();

      const studentName = profile?.full_name || 
                         `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 
                         user?.email || 'Student';

      const { data, error } = await supabase.functions.invoke('gw-send-email', {
        body: {
          to: 'kpj64110@gmail.com',
          subject: `${studentName} from MUS240`,
          html: `
            <h2>Email from MUS 240 student</h2>
            <p><strong>From:</strong> ${studentName} (${user?.email})</p>
            <p><strong>Message:</strong></p>
            <p>${emailMessage.replace(/\n/g, '<br>')}</p>
          `,
          replyTo: user?.email,
        },
      });

      if (error) throw error;

      toast({
        title: "Message Sent",
        description: "Your message has been sent to Dr. Johnson",
      });
      setEmailDialogOpen(false);
      setEmailMessage('');
    } catch (error: any) {
      console.error('Error sending email:', error);
      toast({
        title: "Failed to Send",
        description: error.message || "Failed to send email. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getLetterGradeColor = (grade: string) => {
    if (grade.startsWith('A')) return 'text-green-600';
    if (grade.startsWith('B')) return 'text-blue-600';
    if (grade.startsWith('C')) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (submissionsLoading || progressLoading) {
    return (
      <UniversalLayout>
        <div className="container mx-auto py-8">
          <div className="text-center">Loading your dashboard...</div>
        </div>
      </UniversalLayout>
    );
  }

  return (
    <UniversalLayout>
      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">MUS 240 Dashboard</h1>
            <p className="text-muted-foreground text-sm sm:text-base">Survey of African American Music</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="flex-1 sm:flex-none" onClick={() => navigate('/mus-240')}>
              <Home className="h-4 w-4 mr-2" />
              <span className="hidden xs:inline">Back to </span>MUS 240
            </Button>
            <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
                  <Mail className="h-4 w-4 mr-2" />
                  <span className="hidden xs:inline">Email </span>Instructor
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[95vw] sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Email Dr. Kevin Phillip Johnson</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Textarea
                    placeholder="Type your message here..."
                    value={emailMessage}
                    onChange={(e) => setEmailMessage(e.target.value)}
                    rows={6}
                  />
                  <Button onClick={handleEmailInstructor} className="w-full">
                    Send Message
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>


        {upcomingAssignments.length > 0 && (
          <Alert>
            <Bell className="h-4 w-4" />
            <AlertDescription>
              You have {incompleteAssignments.length} incomplete assignment(s). {upcomingAssignments.length} due within the next 7 days.
            </AlertDescription>
          </Alert>
        )}

        {/* Grade Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Overall Grade
              </CardTitle>
            </CardHeader>
            <CardContent>
              {gradeSummary && gradeSummary.overall_percentage !== null ? (
                <div>
                  <div className={`text-4xl font-bold ${getLetterGradeColor(gradeSummary.letter_grade)}`}>
                    {gradeSummary.letter_grade}
                  </div>
                  <div className="text-2xl text-muted-foreground mt-1">
                    {gradeSummary.overall_percentage.toFixed(1)}%
                  </div>
                  <Progress value={gradeSummary.overall_percentage} className="mt-2" />
                </div>
              ) : (
                <p className="text-muted-foreground">No grades yet</p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Assignments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">
                {submissions.filter(s => s.is_published).length}/{submissions.length}
              </div>
              <p className="text-sm text-muted-foreground mt-1">Completed</p>
              <Progress 
                value={(submissions.filter(s => s.is_published).length / submissions.length) * 100} 
                className="mt-2" 
              />
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Participation
              </CardTitle>
            </CardHeader>
            <CardContent>
              {participationGrade ? (
                <div>
                  <div className="text-4xl font-bold">
                    {participationGrade.points_earned}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    points earned
                  </p>
                  <Progress 
                    value={participationGrade.points_earned} 
                    className="mt-2" 
                  />
                </div>
              ) : (
                <p className="text-muted-foreground">No participation grade yet</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="assignments" className="space-y-4">
          <TabsList className="flex flex-wrap h-auto gap-1 p-1 sm:grid sm:grid-cols-6">
            <TabsTrigger value="assignments" className="flex-1 min-w-[80px] text-xs sm:text-sm">Assignments</TabsTrigger>
            <TabsTrigger value="tests" className="flex-1 min-w-[60px] text-xs sm:text-sm">Tests</TabsTrigger>
            <TabsTrigger value="practice-tests" className="flex-1 min-w-[60px] text-xs sm:text-sm">Practice</TabsTrigger>
            <TabsTrigger value="ai-group" className="flex-1 min-w-[70px] text-xs sm:text-sm">AI Group</TabsTrigger>
            <TabsTrigger value="grades" className="flex-1 min-w-[60px] text-xs sm:text-sm">Grades</TabsTrigger>
            <TabsTrigger value="announcements" className="flex-1 min-w-[50px] text-xs sm:text-sm">News</TabsTrigger>
          </TabsList>

          {/* Tests Tab - All tests including exams */}
          <TabsContent value="tests" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileCheck className="h-5 w-5" />
                  Tests & Exams
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {allTestsLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading tests...</div>
                ) : allTests.length === 0 ? (
                  <div className="text-center py-8">
                    <FileCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No tests available yet.</p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {allTests.map((test) => {
                      const submission = testSubmissions.find(s => s.test_id === test.id);
                      const hasSubmitted = submission && submission.status === 'submitted';
                      const inProgress = submission && submission.status === 'in_progress';
                      
                      return (
                        <div
                          key={test.id}
                          className="p-4 border rounded-lg hover:shadow-md transition-all"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <h3 className="font-semibold flex items-center gap-2">
                                <FileCheck className="h-4 w-4 text-primary" />
                                {test.title}
                              </h3>
                              {test.description && (
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                  {test.description}
                                </p>
                              )}
                              <div className="flex flex-wrap gap-2 mt-2 text-xs text-muted-foreground">
                                <span>{test.total_points} points</span>
                                {test.duration_minutes && (
                                  <>
                                    <span>•</span>
                                    <span>{test.duration_minutes} min</span>
                                  </>
                                )}
                                {test.allow_retakes && (
                                  <>
                                    <span>•</span>
                                    <span>Retakes allowed</span>
                                  </>
                                )}
                              </div>
                            </div>
                            {hasSubmitted && (
                              <Badge variant={submission.percentage >= test.passing_score ? 'default' : 'destructive'}>
                                <CheckCircle className="h-3 w-3 mr-1" />
                                {submission.percentage?.toFixed(0)}%
                              </Badge>
                            )}
                            {inProgress && (
                              <Badge variant="secondary">
                                <Clock className="h-3 w-3 mr-1" />
                                In Progress
                              </Badge>
                            )}
                            {!submission && (
                              <Badge variant="outline">Not Started</Badge>
                            )}
                          </div>
                          
                          {hasSubmitted && (
                            <div className="mt-3 p-2 bg-muted/50 rounded text-sm">
                              <div className="flex justify-between">
                                <span>Score:</span>
                                <span className="font-semibold">{submission.total_score}/{test.total_points}</span>
                              </div>
                            </div>
                          )}
                          
                          <div className="mt-3">
                            {!submission && (
                              <Button 
                                className="w-full" 
                                onClick={() => navigate(`/test/${test.id}`)}
                              >
                                <Play className="h-4 w-4 mr-2" />
                                Take Test
                              </Button>
                            )}
                            {inProgress && (
                              <Button 
                                className="w-full" 
                                onClick={() => navigate(`/test/${test.id}`)}
                              >
                                <Play className="h-4 w-4 mr-2" />
                                Continue Test
                              </Button>
                            )}
                            {hasSubmitted && test.allow_retakes && (
                              <Button 
                                variant="outline" 
                                className="w-full" 
                                onClick={() => navigate(`/test/${test.id}`)}
                              >
                                <RotateCcw className="h-4 w-4 mr-2" />
                                Retake Test
                              </Button>
                            )}
                            {hasSubmitted && !test.allow_retakes && (
                              <Button variant="outline" className="w-full" disabled>
                                Completed
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assignments" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Incomplete Assignments
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                      <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dueDate">Due Date</SelectItem>
                        <SelectItem value="title">Title</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    >
                      <ArrowUpDown className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {sortedIncompleteAssignments.map((assignment) => (
                  <div
                    key={assignment.assignment_id}
                    className="p-4 border rounded-lg hover:shadow-md transition-all shadow-[0_0_8px_rgba(234,179,8,0.3)] border-yellow-200/50 bg-gradient-to-r from-yellow-50/40 to-amber-50/40"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{assignment.assignment_title}</h3>
                          <Badge variant="secondary">
                            <Clock className="h-3 w-3 mr-1" />
                            Due Soon
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Due: {new Date(assignment.assignment_due_date + 'T12:00:00').toLocaleDateString()}
                        </p>
                        <p className="text-sm mt-1">{assignment.assignment_points} points</p>
                      </div>
                      <Button
                        size="sm"
                        variant={assignment.content ? "outline" : "default"}
                        onClick={() => navigate(`/mus-240/assignments/${assignment.assignment_id}`)}
                      >
                        {assignment.content ? (
                          <>
                            <Eye className="h-3 w-3 mr-1" />
                            Continue
                          </>
                        ) : (
                          <>
                            <Edit className="h-3 w-3 mr-1" />
                            Start
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ))}

                {incompleteAssignments.length === 0 && (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                    <p className="text-muted-foreground">You're all caught up! No incomplete assignments.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="practice-tests" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Practice Tests
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {testsLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading tests...</div>
                ) : practiceTests.length === 0 ? (
                  <div className="text-center py-8">
                    <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No practice tests available yet.</p>
                  </div>
                ) : (
                  practiceTests.map((test) => {
                    const submission = testSubmissions.find(s => s.test_id === test.id);
                    const hasCompleted = submission?.submitted_at;
                    
                    return (
                      <div
                        key={test.id}
                        className="p-4 border rounded-lg hover:shadow-md transition-all"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{test.title}</h3>
                              {hasCompleted && (
                                <Badge variant="secondary" className="bg-green-100 text-green-700">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Completed
                                </Badge>
                              )}
                            </div>
                            {test.description && (
                              <p className="text-sm text-muted-foreground mt-1">{test.description}</p>
                            )}
                            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>{test.duration_minutes} minutes</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Trophy className="h-3 w-3" />
                                <span>{test.total_points} points</span>
                              </div>
                              {submission?.percentage !== null && submission?.percentage !== undefined && (
                                <div className="flex items-center gap-1 font-semibold text-blue-600">
                                  Score: {submission.percentage}%
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {hasCompleted && test.show_correct_answers && submission && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => navigate(`/test/${test.id}/results/${submission.id}`)}
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                View Results
                              </Button>
                            )}
                            <Button
                              size="sm"
                              onClick={() => navigate(`/test/${test.id}/take`)}
                              disabled={hasCompleted && !test.allow_retakes}
                            >
                              {hasCompleted ? (
                                test.allow_retakes ? (
                                  <>
                                    <Edit className="h-3 w-3 mr-1" />
                                    Retake
                                  </>
                                ) : (
                                  'No Retakes'
                                )
                              ) : (
                                <>
                                  <Edit className="h-3 w-3 mr-1" />
                                  Start Test
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ai-group" className="space-y-4">
            <AIGroupRoleSubmission />
          </TabsContent>

          <TabsContent value="grades" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Your Grades
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {submissions
                  .filter(s => s.grade)
                  .sort((a, b) => new Date(b.grade!.graded_at).getTime() - new Date(a.grade!.graded_at).getTime())
                  .map((submission) => (
                    <div
                      key={submission.assignment_id}
                      className="p-4 border rounded-lg"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold">{submission.assignment_title}</h3>
                          <div className="flex items-center gap-4 mt-2 text-sm">
                            <div className="flex items-center gap-1">
                              <Trophy className={`h-4 w-4 ${getLetterGradeColor(submission.grade!.letter_grade)}`} />
                              <span className={`font-bold ${getLetterGradeColor(submission.grade!.letter_grade)}`}>
                                {submission.grade!.letter_grade}
                              </span>
                              <span className="text-muted-foreground">
                                ({submission.grade!.overall_score}%)
                              </span>
                            </div>
                            <div className="text-muted-foreground">
                              Graded: {new Date(submission.grade!.graded_at).toLocaleDateString()}
                            </div>
                          </div>
                          {submission.grade!.feedback && (
                            <p className="text-sm text-muted-foreground mt-2 p-3 bg-muted/50 rounded">
                              {submission.grade!.feedback}
                            </p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/mus-240/assignments/${submission.assignment_id}`)}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                      </div>
                    </div>
                  ))}

                {submissions.filter(s => s.grade).length === 0 && (
                  <div className="text-center py-8">
                    <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No graded assignments yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="announcements">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Course Announcements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No announcements at this time</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </UniversalLayout>
  );
};
