import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Brain
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

export const StudentDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { submissions, loading: submissionsLoading } = useStudentSubmissions();
  const { gradeSummary, participationGrade, loading: progressLoading } = useMus240Progress();
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailMessage, setEmailMessage] = useState('');

  // Get upcoming assignments (due within 7 days)
  const upcomingAssignments = submissions.filter(s => {
    if (s.is_published) return false;
    const dueDate = new Date(s.assignment_due_date + 'T12:00:00');
    const now = new Date();
    const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 7;
  });

  // Get overdue assignments
  const overdueAssignments = submissions.filter(s => {
    if (s.is_published) return false;
    const dueDate = new Date(s.assignment_due_date + 'T12:00:00');
    return dueDate < new Date();
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
      const { data, error } = await supabase.functions.invoke('gw-send-email', {
        body: {
          to: 'kpj64110@gmail.com',
          subject: `Message from ${user?.email} - MUS 240`,
          html: `
            <h2>New message from MUS 240 student</h2>
            <p><strong>From:</strong> ${user?.email}</p>
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
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">MUS 240 Dashboard</h1>
            <p className="text-muted-foreground">Survey of African American Music</p>
          </div>
          <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Mail className="h-4 w-4 mr-2" />
                Email Instructor
              </Button>
            </DialogTrigger>
            <DialogContent>
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

        {/* Urgent Alerts */}
        {overdueAssignments.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You have {overdueAssignments.length} overdue assignment(s). Please complete them as soon as possible.
            </AlertDescription>
          </Alert>
        )}

        {upcomingAssignments.length > 0 && (
          <Alert>
            <Bell className="h-4 w-4" />
            <AlertDescription>
              You have {upcomingAssignments.length} assignment(s) due within the next 7 days.
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
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="assignments">Assignments</TabsTrigger>
            <TabsTrigger value="ai-group">AI Group</TabsTrigger>
            <TabsTrigger value="grades">Grades</TabsTrigger>
            <TabsTrigger value="announcements">Announcements</TabsTrigger>
          </TabsList>

          <TabsContent value="assignments" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Upcoming & Overdue Assignments
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {overdueAssignments.map((assignment) => (
                  <div
                    key={assignment.assignment_id}
                    className="p-4 border border-red-200 bg-red-50 rounded-lg"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{assignment.assignment_title}</h3>
                          <Badge variant="destructive">Overdue</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Due: {new Date(assignment.assignment_due_date + 'T12:00:00').toLocaleDateString()}
                        </p>
                        <p className="text-sm mt-1">{assignment.assignment_points} points</p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => navigate(`/classes/mus240/assignments/${assignment.assignment_id}`)}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Start Now
                      </Button>
                    </div>
                  </div>
                ))}

                {upcomingAssignments.map((assignment) => (
                  <div
                    key={assignment.assignment_id}
                    className="p-4 border rounded-lg hover:shadow-md transition-shadow"
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
                        onClick={() => navigate(`/classes/mus240/assignments/${assignment.assignment_id}`)}
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

                {overdueAssignments.length === 0 && upcomingAssignments.length === 0 && (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                    <p className="text-muted-foreground">You're all caught up! No upcoming or overdue assignments.</p>
                  </div>
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
                          onClick={() => navigate(`/classes/mus240/assignments/${submission.assignment_id}`)}
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
