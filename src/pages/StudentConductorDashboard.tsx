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
import { AuditionDialog } from "@/components/audition/AuditionDialog";
import { AuditionEntry } from "@/hooks/useAuditionManagement";
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
  PenTool,
  Plus,
  Trash2,
  Edit
} from "lucide-react";

export const StudentConductorDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [showAuditionDialog, setShowAuditionDialog] = useState(false);
  const [editingAudition, setEditingAudition] = useState<AuditionEntry | null>(null);

  // Real data hooks replacing mock data
  const { plans: sectionalPlans, loading: plansLoading, updatePlanStatus } = useSectionalPlans();
  const { assignments: srfAssignments, loading: srfLoading, createAssignment, sendReminder } = useSRFAssignments();
  const { auditions, loading: auditionsLoading, updateAuditionStatus, addNotes, rescheduleAudition, addAudition, deleteAudition, updateAudition } = useAuditionManagement();
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
      case 'Completed': return 'border-green-500 text-green-700';
      case 'Scheduled': return 'border-blue-500 text-blue-700';
      case 'Callback': return 'border-yellow-500 text-yellow-700';
      case 'Pending': return 'border-orange-500 text-orange-700';
      default: return 'border-gray-500 text-gray-700';
    }
  };

  const handleEditAudition = (audition: AuditionEntry) => {
    setEditingAudition(audition);
    setShowAuditionDialog(true);
  };

  const handleAddAudition = () => {
    setEditingAudition(null);
    setShowAuditionDialog(true);
  };

  const handleCreateSRFAssignment = () => {
    // Create a default assignment - in the future this could open a dialog
    const newAssignmentData = {
      title: 'New Assignment',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      difficulty: 'Intermediate' as const
    };
    createAssignment(newAssignmentData);
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
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground">Assistant Conductor Hub</h1>
              <p className="text-base md:text-lg lg:text-xl text-muted-foreground">Manage sections, auditions, and rehearsal coordination</p>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="auditions">Auditions</TabsTrigger>
            <TabsTrigger value="solos">Solos</TabsTrigger>
            <TabsTrigger value="srf">SRF</TabsTrigger>
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
                  <div className="text-3xl md:text-4xl font-bold">{pendingPlansCount}</div>
                  <p className="text-base md:text-lg text-muted-foreground">Plans awaiting review</p>
                  <Button size="sm" className="mt-3" onClick={() => navigate('/sectional-management')}>
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
                  <div className="text-3xl md:text-4xl font-bold">{averageCompletionRate}%</div>
                  <p className="text-base md:text-lg text-muted-foreground">Average completion rate</p>
                  <Button size="sm" className="mt-3" onClick={() => navigate('/srf-management')}>
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
                  <div className="text-3xl md:text-4xl font-bold">{upcomingAuditionsCount}</div>
                  <p className="text-base md:text-lg text-muted-foreground">Scheduled upcoming auditions</p>
                  <Button size="sm" className="mt-3" onClick={() => setActiveTab("auditions")}>
                    View Schedule
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>


          <TabsContent value="auditions" className="mt-6">
            <Card>
              <CardHeader className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  New Member Auditions
                </CardTitle>
                <Button onClick={handleAddAudition}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Audition
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {auditions.filter(audition => audition.type === 'New Member').map((audition) => (
                    <Card key={audition.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="text-lg md:text-xl font-semibold">{audition.name}</h4>
                            <p className="text-base md:text-lg text-muted-foreground">{audition.date} at {audition.timeSlot}</p>
                          </div>
                          <div className="flex gap-2">
                            <Badge variant="outline">{audition.type}</Badge>
                            <Badge className={`border ${getStatusColor(audition.status)}`}>
                              {audition.status}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-base md:text-lg mb-3">Notes: {audition.notes}</p>
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
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleEditAudition(audition)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => deleteAudition(audition.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {auditions.filter(audition => audition.type === 'New Member').length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No new member auditions scheduled
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="solos" className="mt-6">
            <Card>
              <CardHeader className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  Solo Auditions
                </CardTitle>
                <Button onClick={handleAddAudition}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Solo Audition
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {auditions.filter(audition => audition.type === 'Solo Audition').map((audition) => (
                    <Card key={audition.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="text-lg md:text-xl font-semibold">{audition.name}</h4>
                            <p className="text-base md:text-lg text-muted-foreground">{audition.date} at {audition.timeSlot}</p>
                          </div>
                          <div className="flex gap-2">
                            <Badge variant="outline">{audition.type}</Badge>
                            <Badge className={`border ${getStatusColor(audition.status)}`}>
                              {audition.status}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-base md:text-lg mb-3">Notes: {audition.notes}</p>
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
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleEditAudition(audition)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => deleteAudition(audition.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {auditions.filter(audition => audition.type === 'Solo Audition').length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No solo auditions scheduled
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="srf" className="mt-6">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Sight Reading Factory Management
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-3xl md:text-4xl font-bold">{srfAssignments.length}</div>
                        <p className="text-base md:text-lg text-muted-foreground">Active Assignments</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-3xl md:text-4xl font-bold">{averageCompletionRate}%</div>
                        <p className="text-base md:text-lg text-muted-foreground">Completion Rate</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-3xl md:text-4xl font-bold">
                          {srfAssignments.filter(a => new Date(a.dueDate) < new Date()).length}
                        </div>
                        <p className="text-base md:text-lg text-muted-foreground">Overdue</p>
                      </CardContent>
                    </Card>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xl md:text-2xl font-semibold">Current Assignments</h3>
                      <Button onClick={handleCreateSRFAssignment}>
                        <Plus className="h-4 w-4 mr-2" />
                        New Assignment
                      </Button>
                    </div>
                    
                    {srfAssignments.map((assignment) => (
                      <Card key={assignment.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h4 className="text-lg md:text-xl font-semibold">{assignment.title}</h4>
                              <p className="text-base md:text-lg text-muted-foreground">Due: {assignment.dueDate}</p>
                            </div>
                            <Badge variant={new Date(assignment.dueDate) < new Date() ? "destructive" : "default"}>
                              {assignment.completedCount}/{assignment.assignedCount} Complete
                            </Badge>
                          </div>
                          <Progress 
                            value={(assignment.completedCount / assignment.assignedCount) * 100} 
                            className="mb-3"
                          />
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline">
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => sendReminder(assignment.id)}
                            >
                              <Send className="h-4 w-4 mr-2" />
                              Send Reminder
                            </Button>
                            <Button size="sm" variant="outline">
                              <Settings className="h-4 w-4 mr-2" />
                              Modify
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    
                    {srfAssignments.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        No SRF assignments yet. Create your first assignment to get started.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
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
      
      <AuditionDialog
        open={showAuditionDialog}
        onOpenChange={(open) => {
          setShowAuditionDialog(open);
          if (!open) setEditingAudition(null);
        }}
        onAddAudition={addAudition}
        onUpdateAudition={updateAudition}
        editingAudition={editingAudition}
      />
    </UniversalLayout>
  );
};