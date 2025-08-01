import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { CommunityHubWidget } from "@/components/unified/CommunityHubWidget";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { UniversalLayout } from "@/components/layout/UniversalLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useDashboardSettings } from "@/hooks/useDashboardSettings";
import { 
  Calendar,
  Megaphone,
  FolderOpen,
  TrendingUp,
  Users,
  Crown,
  FileText,
  DollarSign,
  MapPin,
  Shirt,
  BookOpen,
  Camera,
  MessageSquare,
  Heart,
  BarChart3,
  Shield,
  Mail,
  CheckCircle,
  Route,
  Music2,
  UserCheck,
  Home,
  Settings,
  Send,
  PenTool,
  Eye,
  Target,
  Clock,
  ClipboardList,
  Play,
  Bell,
  ArrowUpRight,
  Plus,
  Activity,
  PieChart,
  CalendarDays,
  Briefcase,
  Zap
} from "lucide-react";

// Import all the position-specific components
import { HandbookModule } from "@/components/handbook/HandbookModule";
import { EventCreator } from "@/components/executive-board/EventCreator";
import { BudgetTracker } from "@/components/executive-board/BudgetTracker";
import { TaskChecklist } from "@/components/executive-board/TaskChecklist";
import { CheckInOutTool } from "@/components/executive-board/CheckInOutTool";
import { NotificationsPanel } from "@/components/executive-board/NotificationsPanel";
import { ProgressLog } from "@/components/executive-board/ProgressLog";
import { CommunicationHub } from "@/components/executive-board/CommunicationHub";
import { MusicLibraryViewer } from "@/components/executive-board/MusicLibraryViewer";
import { PositionTab } from "@/components/executive-board/PositionTab";
import { CalendarViews } from "@/components/calendar/CalendarViews";
import { MeetingMinutes } from "@/components/executive-board/MeetingMinutes";
import { AttendanceDashboard } from "@/components/attendance/AttendanceDashboard";
import { BudgetManager } from "@/components/treasurer/BudgetManager";
import { DuesManager } from "@/components/treasurer/DuesManager";
import { GeneralBudgetManager } from "@/components/treasurer/GeneralBudgetManager";
import { StipendPayer } from "@/components/treasurer/StipendPayer";
import { ReceiptKeeper } from "@/components/treasurer/ReceiptKeeper";
import { RunningLedger } from "@/components/treasurer/RunningLedger";
import { StripeSalesSync } from "@/components/treasurer/StripeSalesSync";
import { PerformanceRequestsList } from "@/components/tour-manager/PerformanceRequestsList";
import { TourContracts } from "@/components/tour-manager/TourContracts";
import { RequestTracker } from "@/components/tour-manager/RequestTracker";
import TourPlanner from "@/pages/TourPlanner";
import { TourStipends } from "@/components/tour-manager/TourStipends";
import { TourOverview } from "@/components/tour-manager/TourOverview";
import { WardrobeMistressHub } from "@/components/tour-manager/WardrobeMistressHub";
import { LibraryManagement } from "@/components/music-library/LibraryManagement";
import { HistorianWorkpage } from "@/components/historian/HistorianWorkpage";
import { ChaplainWorkHub } from "@/components/chaplain/ChaplainWorkHub";
import { PRCoordinatorHub } from "@/components/pr-coordinator/PRCoordinatorHub";
import { AuditionLogs } from "@/components/executive-board/AuditionLogs";
import { CommunicationsHub } from "@/components/executive-board/CommunicationsHub";

export type ExecutivePosition = 
  | 'president'
  | 'secretary' 
  | 'treasurer'
  | 'tour_manager'
  | 'wardrobe_manager'
  | 'librarian'
  | 'historian'
  | 'pr_coordinator'
  | 'chaplain'
  | 'data_analyst'
  | 'assistant_chaplain'
  | 'student_conductor'
  | 'section_leader_s1'
  | 'section_leader_s2'
  | 'section_leader_a1'
  | 'section_leader_a2'
  | 'set_up_crew_manager';

interface ExecutiveMember {
  id: string;
  user_id: string;
  position: ExecutivePosition;
  academic_year: string;
  is_active: boolean;
}

export const ExecutiveBoardDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { getSettingByName } = useDashboardSettings();
  const isMobile = useIsMobile();
  const [executiveData, setExecutiveData] = useState<ExecutiveMember | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<ExecutivePosition>('president');
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    checkExecutiveMembership();
  }, [user]);

  const checkExecutiveMembership = async () => {
    if (!user) return;

    try {
      console.log('Checking executive membership for user:', user.id);
      
      // First check if user is super admin, admin, or exec board member
      const { data: profileData, error: profileError } = await supabase
        .from('gw_profiles')
        .select('is_super_admin, is_admin, is_exec_board, exec_board_role')
        .eq('user_id', user.id)
        .single();

      console.log('Profile data:', profileData);

      if (profileData?.is_super_admin || profileData?.is_admin) {
        console.log('User has admin access');
        setIsAdmin(true);
        setExecutiveData({
          id: 'admin-access',
          user_id: user.id,
          position: 'president',
          academic_year: new Date().getFullYear().toString(),
          is_active: true
        });
        setSelectedPosition('president');
        return;
      }

      // Check if user is exec board member from gw_profiles
      if (profileData?.is_exec_board && profileData?.exec_board_role) {
        console.log('User has exec board access via gw_profiles');
        setExecutiveData({
          id: 'profile-access',
          user_id: user.id,
          position: profileData.exec_board_role as any,
          academic_year: new Date().getFullYear().toString(),
          is_active: true
        });
        setSelectedPosition(profileData.exec_board_role as any);
        return;
      }

      // Check if user is an active executive board member
      const { data, error } = await supabase
        .from('gw_executive_board_members')
        .select('*, primary_tab')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      console.log('Executive board data:', data);

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking executive membership:', error);
        return;
      }

      setExecutiveData(data);
      if (data) {
        setSelectedPosition(data.position);
        
        // Set the primary tab as the default active tab
        if (data.primary_tab) {
          console.log('Setting primary tab from database:', data.primary_tab);
          setActiveTab(data.primary_tab);
        }
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Map positions to their primary tabs
  const getPositionPrimaryTab = (position: ExecutivePosition): string => {
    const primaryTabMapping: Record<ExecutivePosition, string> = {
      president: 'overview',
      secretary: 'attendance',
      treasurer: 'finances',
      tour_manager: 'tour-overview',
      pr_coordinator: 'pr-hub',
      librarian: 'music-library',
      historian: 'historian-hub',
      data_analyst: 'overview',
      chaplain: 'chaplain-hub',
      assistant_chaplain: 'chaplain-hub',
      student_conductor: 'conductor-overview',
      wardrobe_manager: 'wardrobe',
      section_leader_s1: 'overview',
      section_leader_s2: 'overview',
      section_leader_a1: 'overview',
      section_leader_a2: 'overview',
      set_up_crew_manager: 'overview'
    };
    return primaryTabMapping[position] || 'overview';
  };

  // Handle position change and automatically switch to primary tab
  const handlePositionChange = (value: ExecutivePosition) => {
    setSelectedPosition(value);
    const primaryTab = getPositionPrimaryTab(value);
    setActiveTab(primaryTab);
    console.log(`Position changed to ${value}, switching to primary tab: ${primaryTab}`);
  };

  const getPositionIcon = (position: ExecutivePosition) => {
    const icons = {
      president: Crown,
      secretary: FileText,
      treasurer: DollarSign,
      tour_manager: MapPin,
      wardrobe_manager: Shirt,
      librarian: BookOpen,
      historian: Camera,
      pr_coordinator: MessageSquare,
      chaplain: Heart,
      data_analyst: BarChart3,
      assistant_chaplain: Heart,
      student_conductor: Music2,
      section_leader_s1: UserCheck,
      section_leader_s2: UserCheck,
      section_leader_a1: UserCheck,
      section_leader_a2: UserCheck,
      set_up_crew_manager: Shield
    };
    return icons[position] || Shield;
  };

  const getPositionName = (position: ExecutivePosition) => {
    const names = {
      president: "President",
      secretary: "Secretary", 
      treasurer: "Treasurer",
      tour_manager: "Tour Manager",
      wardrobe_manager: "Wardrobe Manager",
      librarian: "Librarian",
      historian: "Historian",
      pr_coordinator: "PR Coordinator",
      chaplain: "Chaplain",
      data_analyst: "Data Analyst",
      assistant_chaplain: "Assistant Chaplain",
      student_conductor: "Student Conductor",
      section_leader_s1: "Section Leader (S1)",
      section_leader_s2: "Section Leader (S2)",
      section_leader_a1: "Section Leader (A1)",
      section_leader_a2: "Section Leader (A2)",
      set_up_crew_manager: "Set-up Crew Manager"
    };
    return names[position] || position;
  };

  // Mock data for overview cards
  const getPositionOverview = (position: ExecutivePosition) => {
    const overviewData = {
      president: {
        upcomingTasks: 5,
        meetingsScheduled: 3,
        pendingDecisions: 2,
        boardMembers: 12
      },
      secretary: {
        meetingsScheduled: 4,
        minutesToReview: 2,
        attendanceRate: 87,
        documentsToFile: 6
      },
      treasurer: {
        budgetRemaining: 15400,
        pendingExpenses: 3,
        duesToCollect: 12,
        recentTransactions: 8
      },
      tour_manager: {
        upcomingEvents: 4,
        contractsPending: 2,
        stipendsToProcess: 15,
        venueConfirmed: 3
      },
      pr_coordinator: {
        socialMediaPosts: 12,
        pressReleases: 2,
        eventPromotion: 4,
        mediaRequests: 1
      },
      librarian: {
        newMusicAdded: 8,
        catalogUpdates: 3,
        practiceRooms: 4,
        equipmentIssues: 1
      },
      historian: {
        photosToProcess: 45,
        eventsDocumented: 6,
        archiveUpdates: 3,
        videoProjects: 2
      },
      chaplain: {
        prayerRequests: 8,
        spiritualEvents: 3,
        counselingSessions: 5,
        devotionalPosts: 4
      }
    };

    return overviewData[position] || {
      tasks: 0,
      events: 0,
      updates: 0,
      notifications: 0
    };
  };

  if (loading) {
    return (
      <UniversalLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </UniversalLayout>
    );
  }

  if (!executiveData) {
    return (
      <UniversalLayout>
        <PageHeader 
          title="Executive Board Hub"
          description="Access verification required"
        />
        <div className="max-w-2xl mx-auto space-y-6">
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-3">
                <p className="font-medium">Executive Board access required</p>
                <p>To access the Executive Board Hub, you need one of the following:</p>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  <li>Super Admin or Admin privileges</li>
                  <li>Executive Board member status with assigned role</li>
                  <li>Active membership in the Executive Board</li>
                </ul>
                <p className="text-sm text-muted-foreground">
                  If you believe you should have access, please contact your administrator.
                </p>
              </div>
            </AlertDescription>
          </Alert>
          
          <div className="flex gap-3">
            <Button 
              onClick={() => navigate('/dashboard')}
              variant="outline"
              className="flex-1"
            >
              <Home className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
            <Button 
              onClick={() => navigate('/profile')}
              variant="default"
              className="flex-1"
            >
              <Settings className="mr-2 h-4 w-4" />
              View Profile
            </Button>
          </div>
        </div>
      </UniversalLayout>
    );
  }

  const PositionIcon = getPositionIcon(selectedPosition);
  const overviewData = getPositionOverview(selectedPosition);

  return (
    <UniversalLayout>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <PositionIcon className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold tracking-tight">Executive Board Hub</h1>
            </div>
            <p className="text-muted-foreground">
              Welcome back, {user?.user_metadata?.full_name || 'Executive Member'}! 
              Managing your role as {getPositionName(selectedPosition)}.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Position Switcher - Admin Only */}
            {isAdmin && (
              <Select value={selectedPosition} onValueChange={handlePositionChange}>
                <SelectTrigger className="w-[220px]">
                  <div className="flex items-center gap-2">
                    <PositionIcon className="h-4 w-4" />
                    <span>{getPositionName(selectedPosition)}</span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries({
                    president: 'President',
                    secretary: 'Secretary',
                    treasurer: 'Treasurer',
                    tour_manager: 'Tour Manager',
                    pr_coordinator: 'PR Coordinator',
                    librarian: 'Librarian',
                    historian: 'Historian',
                    chaplain: 'Chaplain',
                    wardrobe_manager: 'Wardrobe Manager',
                    student_conductor: 'Student Conductor'
                  }).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      <div className="flex items-center gap-2">
                        {React.createElement(getPositionIcon(value as ExecutivePosition), { className: "h-4 w-4" })}
                        {label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            {/* View Toggle */}
            <div className="flex items-center gap-2 p-1 bg-muted rounded-lg">
              <Button
                variant="default"
                size="sm"
                className="h-8"
              >
                <Crown className="h-4 w-4 mr-2" />
                Exec View
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard')}
                className="h-8"
              >
                <Users className="h-4 w-4 mr-2" />
                Member View
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
            <TabsTrigger value="overview" className="text-xs lg:text-sm">
              <Activity className="h-3 w-3 lg:h-4 lg:w-4 mr-1 lg:mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="tasks" className="text-xs lg:text-sm">
              <CheckCircle className="h-3 w-3 lg:h-4 lg:w-4 mr-1 lg:mr-2" />
              Tasks
            </TabsTrigger>
            <TabsTrigger value="calendar" className="text-xs lg:text-sm">
              <CalendarDays className="h-3 w-3 lg:h-4 lg:w-4 mr-1 lg:mr-2" />
              Calendar
            </TabsTrigger>
            <TabsTrigger value="communications" className="text-xs lg:text-sm">
              <MessageSquare className="h-3 w-3 lg:h-4 lg:w-4 mr-1 lg:mr-2" />
              Comms
            </TabsTrigger>
            <TabsTrigger value="finances" className="text-xs lg:text-sm">
              <DollarSign className="h-3 w-3 lg:h-4 lg:w-4 mr-1 lg:mr-2" />
              Budget
            </TabsTrigger>
            <TabsTrigger value="attendance" className="text-xs lg:text-sm">
              <Users className="h-3 w-3 lg:h-4 lg:w-4 mr-1 lg:mr-2" />
              Attendance
            </TabsTrigger>
            <TabsTrigger value="music-library" className="text-xs lg:text-sm">
              <Music2 className="h-3 w-3 lg:h-4 lg:w-4 mr-1 lg:mr-2" />
              Music
            </TabsTrigger>
            <TabsTrigger value="position-specific" className="text-xs lg:text-sm">
              <Briefcase className="h-3 w-3 lg:h-4 lg:w-4 mr-1 lg:mr-2" />
              My Role
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Overview Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {selectedPosition === 'president' && (
                <>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Upcoming Tasks</CardTitle>
                      <ClipboardList className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{overviewData.upcomingTasks}</div>
                      <p className="text-xs text-muted-foreground">Tasks requiring attention</p>
                      <Progress value={65} className="mt-2" />
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Board Members</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{overviewData.boardMembers}</div>
                      <p className="text-xs text-muted-foreground">Active executive members</p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Meetings Scheduled</CardTitle>
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{overviewData.meetingsScheduled}</div>
                      <p className="text-xs text-muted-foreground">This week</p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Pending Decisions</CardTitle>
                      <Zap className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{overviewData.pendingDecisions}</div>
                      <p className="text-xs text-muted-foreground">Requiring approval</p>
                    </CardContent>
                  </Card>
                </>
              )}

              {selectedPosition === 'treasurer' && (
                <>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Budget Remaining</CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">${overviewData.budgetRemaining?.toLocaleString()}</div>
                      <p className="text-xs text-muted-foreground">Available funds</p>
                      <Progress value={78} className="mt-2" />
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Dues to Collect</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{overviewData.duesToCollect}</div>
                      <p className="text-xs text-muted-foreground">Outstanding payments</p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Pending Expenses</CardTitle>
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{overviewData.pendingExpenses}</div>
                      <p className="text-xs text-muted-foreground">Awaiting approval</p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Recent Transactions</CardTitle>
                      <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{overviewData.recentTransactions}</div>
                      <p className="text-xs text-muted-foreground">This week</p>
                    </CardContent>
                  </Card>
                </>
              )}

              {/* Add similar sections for other positions... */}
              
              {/* Default generic cards for other positions */}
              {!['president', 'treasurer'].includes(selectedPosition) && (
                <>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Active Tasks</CardTitle>
                      <Target className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">8</div>
                      <p className="text-xs text-muted-foreground">Tasks in progress</p>
                      <Progress value={60} className="mt-2" />
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Upcoming Events</CardTitle>
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">4</div>
                      <p className="text-xs text-muted-foreground">This month</p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Notifications</CardTitle>
                      <Bell className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">3</div>
                      <p className="text-xs text-muted-foreground">Unread messages</p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Team Progress</CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">92%</div>
                      <p className="text-xs text-muted-foreground">Goals completed</p>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>

            {/* Quick Actions & Community Hub */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Quick Actions */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Button variant="outline" className="h-auto flex-col gap-2 p-4">
                      <Plus className="h-5 w-5" />
                      <span className="text-xs">Create Event</span>
                    </Button>
                    <Button variant="outline" className="h-auto flex-col gap-2 p-4">
                      <Send className="h-5 w-5" />
                      <span className="text-xs">Send Message</span>
                    </Button>
                    <Button variant="outline" className="h-auto flex-col gap-2 p-4">
                      <PieChart className="h-5 w-5" />
                      <span className="text-xs">View Reports</span>
                    </Button>
                    <Button variant="outline" className="h-auto flex-col gap-2 p-4">
                      <Settings className="h-5 w-5" />
                      <span className="text-xs">Settings</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Community Hub Widget */}
              <CommunityHubWidget />
            </div>
          </TabsContent>

          {/* Tasks Tab */}
          <TabsContent value="tasks">
            <TaskChecklist />
          </TabsContent>

          {/* Calendar Tab */}
          <TabsContent value="calendar">
            <CalendarViews />
          </TabsContent>

          {/* Communications Tab */}
          <TabsContent value="communications">
            <CommunicationHub />
          </TabsContent>

          {/* Finances Tab */}
          <TabsContent value="finances">
            {selectedPosition === 'treasurer' ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <BudgetManager />
                  <DuesManager />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <ReceiptKeeper />
                  <RunningLedger />
                </div>
              </div>
            ) : (
              <BudgetTracker />
            )}
          </TabsContent>

          {/* Attendance Tab */}
          <TabsContent value="attendance">
            <AttendanceDashboard />
          </TabsContent>

          {/* Wardrobe Tab */}
          <TabsContent value="wardrobe">
            <WardrobeMistressHub />
          </TabsContent>

          {/* Music Library Tab */}
          <TabsContent value="music-library">
            {selectedPosition === 'librarian' ? (
              <LibraryManagement />
            ) : (
              <MusicLibraryViewer />
            )}
          </TabsContent>

          {/* Position-Specific Tab */}
          <TabsContent value="position-specific">
            <PositionTab position={selectedPosition} />
          </TabsContent>
        </Tabs>
      </div>
    </UniversalLayout>
  );
};