import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { UniversalLayout } from "@/components/layout/UniversalLayout";
import { useNavigate } from "react-router-dom";
import { useSectionalPlans } from "@/hooks/useSectionalPlans";
import { useSRFAssignments } from "@/hooks/useSRFAssignments";
import { useAuditionManagement } from "@/hooks/useAuditionManagement";
import { useSubmissionReview } from "@/hooks/useSubmissionReview";
import { 
  Music, 
  Calendar, 
  Users, 
  Clock, 
  Star,
  Home,
  X,
  Play,
  Pause,
  SkipForward,
  Volume2,
  FileText,
  Target,
  BookOpen,
  Award,
  TrendingUp,
  Eye,
  CheckCircle,
  MessageSquare,
  UserCheck,
  ClipboardList,
  Settings,
  Send,
  PenTool
} from "lucide-react";

export const StudentConductorDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");

  // Real data hooks replacing mock data
  const { plans: sectionalPlans, loading: plansLoading, updatePlanStatus } = useSectionalPlans();
  const { assignments: srfAssignments, loading: srfLoading, createAssignment, sendReminder } = useSRFAssignments();
  const { auditions, loading: auditionsLoading, updateAuditionStatus, addNotes, rescheduleAudition } = useAuditionManagement();
  const { submissions, loading: submissionsLoading, updateSubmissionStatus, forwardToDirector } = useSubmissionReview();

  // Calculate metrics from real data
  const pendingPlansCount = sectionalPlans.filter(plan => plan.status === 'Pending Review').length;
  const averageCompletionRate = srfAssignments.length > 0 
    ? Math.round(srfAssignments.reduce((sum, assignment) => sum + (assignment.completedCount / assignment.assignedCount * 100), 0) / srfAssignments.length)
    : 0;
  const upcomingAuditionsCount = auditions.filter(audition => 
    audition.status === 'Scheduled' && new Date(audition.date) >= new Date()
  ).length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved': case 'Completed': case 'Scheduled': return 'bg-green-100 text-green-800 border-green-200';
      case 'Pending Review': case 'Pending': case 'New': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Needs Revision': case 'Callback': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Reviewed': case 'Forwarded': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <UniversalLayout>
      <div className="container mx-auto px-4 py-6">
        {/* Navigation Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Button 
              variant="outline" 
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2"
            >
              <Home className="h-4 w-4" />
              Back to Dashboard
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
              Exit Assistant Conductor Hub
            </Button>
          </div>
          
          <div className="flex items-center gap-3">
            <Music className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold text-foreground">Assistant Conductor Hub</h1>
              <p className="text-muted-foreground">Manage sections, auditions, and rehearsal coordination</p>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="sections">Sections</TabsTrigger>
            <TabsTrigger value="srf">SRF</TabsTrigger>
            <TabsTrigger value="auditions">Auditions</TabsTrigger>
            <TabsTrigger value="submissions">Submissions</TabsTrigger>
            <TabsTrigger value="setup">Setup</TabsTrigger>
            <TabsTrigger value="communication">Messages</TabsTrigger>
            <TabsTrigger value="journal">Journal</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserCheck className="h-5 w-5" />
                    Section Leadership
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{pendingPlansCount}</div>
                  <p className="text-sm text-muted-foreground">Plans awaiting review</p>
                  <Button size="sm" className="mt-3" onClick={() => setActiveTab("sections")}>
                    Review Plans
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Sight Reading
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{averageCompletionRate}%</div>
                  <p className="text-sm text-muted-foreground">Average completion rate</p>
                  <Button size="sm" className="mt-3" onClick={() => setActiveTab("srf")}>
                    Manage SRF
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Upcoming Auditions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{upcomingAuditionsCount}</div>
                  <p className="text-sm text-muted-foreground">Scheduled upcoming auditions</p>
                  <Button size="sm" className="mt-3" onClick={() => setActiveTab("auditions")}>
                    View Schedule
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="sections" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5" />
                  Section Leader Oversight
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <UserCheck className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">Sectional Management</h3>
                  <p className="text-muted-foreground mb-4">
                    Review section leader plans, approve activities, and manage sectional coordination.
                  </p>
                  <Button onClick={() => navigate('/sectional-management')}>
                    Go to Sectional Management
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="srf" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Sight Reading Manager (SRF Integration)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">SRF Management</h3>
                  <p className="text-muted-foreground mb-4">
                    Create assignments, track student progress, and manage SightReadingFactory integration.
                  </p>
                  <Button onClick={() => navigate('/srf-management')}>
                    Go to SRF Management
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="auditions" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Auditions & Solos Hub
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {auditions.map((audition) => (
                    <Card key={audition.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-semibold">{audition.name}</h4>
                            <p className="text-sm text-muted-foreground">{audition.date} at {audition.timeSlot}</p>
                          </div>
                          <div className="flex gap-2">
                            <Badge variant="outline">{audition.type}</Badge>
                            <Badge className={`border ${getStatusColor(audition.status)}`}>
                              {audition.status}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-sm mb-3">Notes: {audition.notes}</p>
                        <div className="flex gap-2">
                          <Button size="sm">
                            <FileText className="h-4 w-4 mr-2" />
                            Score Sheet
                          </Button>
                          <Button size="sm" variant="outline">
                            <Clock className="h-4 w-4 mr-2" />
                            Reschedule
                          </Button>
                          <Button size="sm" variant="outline">
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Add Notes
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="submissions" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Submission Review Panel
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {submissions.map((submission) => (
                    <Card key={submission.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-semibold">{submission.title}</h4>
                            <p className="text-sm text-muted-foreground">From: {submission.from} • {submission.date}</p>
                          </div>
                          <div className="flex gap-2">
                            <Badge variant="outline">{submission.type}</Badge>
                            <Badge className={`border ${getStatusColor(submission.status)}`}>
                              {submission.status}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm">
                            <Eye className="h-4 w-4 mr-2" />
                            Review
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => updateSubmissionStatus(submission.id, 'Completed')}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Complete
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => forwardToDirector(submission.id)}
                          >
                            <Send className="h-4 w-4 mr-2" />
                            Forward to Director
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="setup" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Environment Setup Tools
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Rehearsal Setup Checklist</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2">
                        <input type="checkbox" className="rounded" />
                        <span className="text-sm">Piano tuned and positioned</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" className="rounded" />
                        <span className="text-sm">Music stands arranged</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" className="rounded" />
                        <span className="text-sm">Sound system tested</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" className="rounded" />
                        <span className="text-sm">Scores distributed</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Warm-up Plans</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <Button className="w-full justify-start" variant="outline">
                          <FileText className="h-4 w-4 mr-2" />
                          Upload Warm-up Plan
                        </Button>
                        <Button className="w-full justify-start" variant="outline">
                          <Calendar className="h-4 w-4 mr-2" />
                          Link to Calendar Event
                        </Button>
                        <Button className="w-full justify-start" variant="outline">
                          <Play className="h-4 w-4 mr-2" />
                          View Template Library
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="communication" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5" />
                  Communication Panel
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold">Quick Messages</h3>
                    <Button className="w-full justify-start">
                      <Users className="h-4 w-4 mr-2" />
                      Message All Sections
                    </Button>
                    <Button className="w-full justify-start" variant="outline">
                      <UserCheck className="h-4 w-4 mr-2" />
                      Message Section Leaders
                    </Button>
                    <Button className="w-full justify-start" variant="outline">
                      <BookOpen className="h-4 w-4 mr-2" />
                      SRF Reminder
                    </Button>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="font-semibold">Message Templates</h3>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">• SRF Assignment Reminder</p>
                      <p className="text-sm text-muted-foreground">• Solo Audition Updates</p>
                      <p className="text-sm text-muted-foreground">• Sectional Schedule Changes</p>
                      <p className="text-sm text-muted-foreground">• Rehearsal Preparation</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="journal" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PenTool className="h-5 w-5" />
                  Assistant Conductor Journal
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-semibold mb-3">Private Activity Log</h3>
                      <textarea 
                        className="w-full h-32 p-3 border rounded-md resize-none" 
                        placeholder="Record daily activities, observations, and notes..."
                      />
                      <Button size="sm" className="mt-2">Save Entry</Button>
                    </div>
                    
                    <div>
                      <h3 className="font-semibold mb-3">Notes to Director</h3>
                      <textarea 
                        className="w-full h-32 p-3 border rounded-md resize-none" 
                        placeholder="Internal communication with Doc Johnson..."
                      />
                      <Button size="sm" className="mt-2">
                        <Send className="h-4 w-4 mr-2" />
                        Send to Director
                      </Button>
                    </div>
                  </div>
                  
                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-3">Recent Entries</h3>
                    <div className="space-y-2">
                      <div className="p-3 bg-muted rounded-md">
                        <p className="text-sm"><strong>Jan 26:</strong> Reviewed S1 sectional plan. Recommended focus on breath support.</p>
                      </div>
                      <div className="p-3 bg-muted rounded-md">
                        <p className="text-sm"><strong>Jan 25:</strong> SRF completion rates improving. Consider advanced assignments for top performers.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </UniversalLayout>
  );
};