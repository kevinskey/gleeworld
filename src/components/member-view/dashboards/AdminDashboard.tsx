import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CommunicationCenterModule } from "@/components/admin/CommunicationCenterModule";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { SpiritualReflectionsCard } from "../SpiritualReflectionsCard";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuditionManagement } from "@/hooks/useAuditionManagement";
import { useSRFAssignments } from "@/hooks/useSRFAssignments";
import { AuditionDialog } from "@/components/audition/AuditionDialog";
import { AuditionEntry } from "@/hooks/useAuditionManagement";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Calendar, 
  CheckCircle, 
  DollarSign, 
  Bell, 
  Music, 
  BookOpen,
  Clock,
  Award,
  Users,
  TrendingUp,
  Settings,
  Star,
  Shield,
  Database,
  BarChart3,
  FileText,
  AlertCircle,
  GraduationCap,
  Plus,
  Trash2,
  Edit,
  MessageSquare,
  Eye,
  Send
} from "lucide-react";

interface AdminDashboardProps {
  user: {
    id: string;
    email: string;
    full_name: string;
    role: string;
    exec_board_role?: string;
    is_exec_board?: boolean;
    created_at: string;
  };
}

export const AdminDashboard = ({ user }: AdminDashboardProps) => {
  const navigate = useNavigate();
  const [showAuditionDialog, setShowAuditionDialog] = useState(false);
  const [editingAudition, setEditingAudition] = useState<AuditionEntry | null>(null);
  
  // Import the same hooks used in StudentConductorDashboard
  const { auditions, loading: auditionsLoading, updateAuditionStatus, addNotes, rescheduleAudition, addAudition, deleteAudition, updateAudition } = useAuditionManagement();
  const { assignments: srfAssignments, loading: srfLoading, createAssignment, sendReminder } = useSRFAssignments();

  // Calculate metrics from real data
  const upcomingAuditionsCount = auditions.filter(audition => 
    audition.status === 'Scheduled' && new Date(audition.date) >= new Date()
  ).length;
  const averageCompletionRate = srfAssignments.length > 0 
    ? Math.round(srfAssignments.reduce((sum, assignment) => sum + (assignment.completedCount / assignment.assignedCount * 100), 0) / srfAssignments.length)
    : 0;

  const handleEditAudition = (audition: AuditionEntry) => {
    setEditingAudition(audition);
    setShowAuditionDialog(true);
  };

  const handleAddAudition = () => {
    setEditingAudition(null);
    setShowAuditionDialog(true);
  };

  const handleCreateSRFAssignment = () => {
    const newAssignmentData = {
      title: 'New Assignment',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      difficulty: 'Intermediate' as const
    };
    createAssignment(newAssignmentData);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'border-green-500 text-green-700';
      case 'Scheduled': return 'border-blue-500 text-blue-700';
      case 'Callback': return 'border-yellow-500 text-yellow-700';
      case 'Pending': return 'border-orange-500 text-orange-700';
      default: return 'border-gray-500 text-gray-700';
    }
  };

  // Mock data for admin dashboard
  const adminData = {
    systemStats: {
      totalUsers: 124,
      activeUsers: 89,
      pendingTasks: 15,
      systemHealth: 98
    },
    userMetrics: {
      newRegistrations: 12,
      totalMembers: 89,
      alumnaeMembersCount: 35,
      attendanceRate: 87
    },
    upcomingEvents: [
      {
        id: '1',
        title: 'Admin Review Meeting',
        date: '2024-01-19',
        time: '3:00 PM',
        location: 'Admin Office'
      },
      {
        id: '2',
        title: 'System Maintenance',
        date: '2024-01-21',
        time: '12:00 AM',
        location: 'Remote'
      }
    ],
    pendingApprovals: [
      {
        id: '1',
        type: 'Event Request',
        title: 'Spring Concert Venue Booking',
        requester: 'Event Planning Team',
        priority: 'high'
      },
      {
        id: '2',
        type: 'Budget Request',
        title: 'Equipment Purchase',
        requester: 'Music Director',
        priority: 'medium'
      }
    ],
    recentActivity: [
      {
        id: '1',
        action: 'User Role Updated',
        target: 'Sarah Johnson',
        timestamp: '2024-01-18 14:30'
      },
      {
        id: '2',
        action: 'System Backup Completed',
        target: 'Database',
        timestamp: '2024-01-18 02:00'
      }
    ],
    financialOverview: {
      totalBudget: 25000,
      allocated: 18500,
      spent: 12300,
      remaining: 12700
    }
  };

  return (
    <div className="space-y-6">
      {/* Admin Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* System Health Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{adminData.systemStats.systemHealth}%</div>
            <p className="text-xs text-muted-foreground">All systems operational</p>
            <Progress value={adminData.systemStats.systemHealth} className="mt-2" />
          </CardContent>
        </Card>

        {/* User Management Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">User Management</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{adminData.systemStats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              Total users ({adminData.systemStats.activeUsers} active)
            </p>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-xs">
                <span>Active</span>
                <span>{adminData.systemStats.activeUsers}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>New (This Month)</span>
                <span>{adminData.userMetrics.newRegistrations}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Auditions Overview */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Auditions Overview</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl md:text-4xl font-bold">{upcomingAuditionsCount}</div>
            <p className="text-base md:text-lg text-muted-foreground">Upcoming auditions</p>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-xs">
                <span>Total Auditions</span>
                <span>{auditions.length}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>Solo Auditions</span>
                <span>{auditions.filter(a => a.type === 'Solo Audition').length}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SRF Overview */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SRF Management</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl md:text-4xl font-bold">{averageCompletionRate}%</div>
            <p className="text-base md:text-lg text-muted-foreground">Average completion rate</p>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-xs">
                <span>Active Assignments</span>
                <span>{srfAssignments.length}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>Overdue</span>
                <span>{srfAssignments.filter(a => new Date(a.dueDate) < new Date()).length}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Financial Overview Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Financial Overview</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${adminData.financialOverview.remaining.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Remaining budget</p>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-xs">
                <span>Total Budget</span>
                <span>${adminData.financialOverview.totalBudget.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>Spent</span>
                <span>${adminData.financialOverview.spent.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start" 
                onClick={() => navigate('/dashboard/executive-board')}
              >
                <Shield className="mr-2 h-4 w-4" />
                Executive Board Dashboard
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start" 
                onClick={() => navigate('/dashboard/student-conductor')}
              >
                <Music className="mr-2 h-4 w-4" />
                Student Conductor Hub
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start" 
                onClick={() => navigate('/admin/alumnae')}
              >
                <GraduationCap className="mr-2 h-4 w-4" />
                Alumnae Portal Admin
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabbed Management Modules */}
      <Tabs defaultValue="auditions" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="auditions">Auditions</TabsTrigger>
          <TabsTrigger value="solos">Solos</TabsTrigger>
          <TabsTrigger value="srf">SRF Management</TabsTrigger>
        </TabsList>

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
        </TabsContent>
      </Tabs>

      {/* Communication Center Module */}
      <CommunicationCenterModule />

      {/* Spiritual Reflections Card */}
      <SpiritualReflectionsCard />
      
      {/* Audition Dialog */}
      <AuditionDialog
        open={showAuditionDialog}
        onOpenChange={setShowAuditionDialog}
        editingAudition={editingAudition}
        onAddAudition={async (auditionData) => {
          await addAudition(auditionData);
          setShowAuditionDialog(false);
          setEditingAudition(null);
        }}
        onUpdateAudition={async (auditionId, updateData) => {
          await updateAudition(auditionId, updateData);
          setShowAuditionDialog(false);
          setEditingAudition(null);
        }}
      />
    </div>
  );
};