import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
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
  Route
} from "lucide-react";
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
import { TourPlanner as TourPlannerOld } from "@/components/tour-manager/TourPlanner";
import TourPlanner from "@/pages/TourPlanner";
import { TourStipends } from "@/components/tour-manager/TourStipends";
import { TourOverview } from "@/components/tour-manager/TourOverview";

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
  | 'data_analyst';

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
  const [executiveData, setExecutiveData] = useState<ExecutiveMember | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<ExecutivePosition>('president');
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");

  useEffect(() => {
    checkExecutiveMembership();
  }, [user]);

  const checkExecutiveMembership = async () => {
    if (!user) return;

    try {
      console.log('Checking executive membership for user:', user.id);
      
      // First check if user is super admin
      const { data: profileData, error: profileError } = await supabase
        .from('gw_profiles')
        .select('is_super_admin, is_admin')
        .eq('user_id', user.id)
        .single();

      console.log('Profile data:', profileData);
      console.log('Profile error:', profileError);

      if (profileData?.is_super_admin || profileData?.is_admin) {
        console.log('User has admin access');
        // Super admin/admin gets access with a special "admin" position
        setIsAdmin(true);
        setExecutiveData({
          id: 'admin-access',
          user_id: user.id,
          position: 'president', // Default to president view for admins
          academic_year: new Date().getFullYear().toString(),
          is_active: true
        });
        setSelectedPosition('president');
        return;
      }

      // Check if user is an active executive board member
      const { data, error } = await supabase
        .from('gw_executive_board_members')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      console.log('Executive board data:', data);
      console.log('Executive board error:', error);

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking executive membership:', error);
        return;
      }

      setExecutiveData(data);
      if (data) {
        setSelectedPosition(data.position);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
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
      data_analyst: BarChart3
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
      data_analyst: "Data Analyst"
    };
    return names[position] || position;
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
          description="Access denied"
        />
        <Alert className="max-w-2xl mx-auto">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            You are not currently a member of the Executive Board. If you believe this is an error, 
            please contact your administrator.
          </AlertDescription>
        </Alert>
      </UniversalLayout>
    );
  }

  const PositionIcon = getPositionIcon(selectedPosition);

  return (
    <UniversalLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bebas tracking-wide text-foreground">
              Executive Board Hub
            </h1>
            <div className="flex items-center gap-2 mt-2">
              {isAdmin ? (
                <Select value={selectedPosition} onValueChange={(value: ExecutivePosition) => setSelectedPosition(value)}>
                  <SelectTrigger className="w-[200px]">
                    <div className="flex items-center gap-2">
                      <PositionIcon className="h-4 w-4" />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="president">
                      <div className="flex items-center gap-2">
                        <Crown className="h-4 w-4" />
                        President
                      </div>
                    </SelectItem>
                    <SelectItem value="secretary">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Secretary
                      </div>
                    </SelectItem>
                    <SelectItem value="treasurer">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Treasurer
                      </div>
                    </SelectItem>
                    <SelectItem value="tour_manager">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Tour Manager
                      </div>
                    </SelectItem>
                    <SelectItem value="wardrobe_manager">
                      <div className="flex items-center gap-2">
                        <Shirt className="h-4 w-4" />
                        Wardrobe Manager
                      </div>
                    </SelectItem>
                    <SelectItem value="librarian">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4" />
                        Librarian
                      </div>
                    </SelectItem>
                    <SelectItem value="historian">
                      <div className="flex items-center gap-2">
                        <Camera className="h-4 w-4" />
                        Historian
                      </div>
                    </SelectItem>
                    <SelectItem value="pr_coordinator">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        PR Coordinator
                      </div>
                    </SelectItem>
                    <SelectItem value="chaplain">
                      <div className="flex items-center gap-2">
                        <Heart className="h-4 w-4" />
                        Chaplain
                      </div>
                    </SelectItem>
                    <SelectItem value="data_analyst">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" />
                        Data Analyst
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <PositionIcon className="h-3 w-3" />
                  {getPositionName(selectedPosition)}
                </Badge>
              )}
              <Badge variant="outline">
                {executiveData.academic_year}
              </Badge>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6 lg:grid-cols-12"
            style={{ gridTemplateColumns: selectedPosition === 'tour_manager' ? 'repeat(12, 1fr)' : 'repeat(10, 1fr)' }}
          >
            <TabsTrigger value="dashboard" className="text-xs">
              <Users className="h-4 w-4 mr-1" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="calendar" className="text-xs">
              <Calendar className="h-4 w-4 mr-1" />
              Calendar
            </TabsTrigger>
            <TabsTrigger value="announcements" className="text-xs">
              <Megaphone className="h-4 w-4 mr-1" />
              Minutes
            </TabsTrigger>
            {selectedPosition === 'secretary' && (
              <TabsTrigger value="attendance" className="text-xs">
                <Users className="h-4 w-4 mr-1" />
                Attendance
              </TabsTrigger>
            )}
            {selectedPosition === 'treasurer' && (
              <>
                <TabsTrigger value="ledger" className="text-xs">
                  <BookOpen className="h-4 w-4 mr-1" />
                  Ledger
                </TabsTrigger>
                <TabsTrigger value="budget-manager" className="text-xs">
                  <DollarSign className="h-4 w-4 mr-1" />
                  Budget
                </TabsTrigger>
                <TabsTrigger value="finances" className="text-xs">
                  <FileText className="h-4 w-4 mr-1" />
                  Finances
                </TabsTrigger>
              </>
            )}
            <TabsTrigger value="resources" className="text-xs">
              <FolderOpen className="h-4 w-4 mr-1" />
              Resources
            </TabsTrigger>
            <TabsTrigger value="development" className="text-xs">
              <TrendingUp className="h-4 w-4 mr-1" />
              Development
            </TabsTrigger>
            {selectedPosition === 'tour_manager' && (
              <>
                <TabsTrigger value="tour-overview" className="text-xs">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="tour-requests" className="text-xs">
                  <Mail className="h-4 w-4 mr-1" />
                  Requests
                </TabsTrigger>
                <TabsTrigger value="tour-tracker" className="text-xs">
                  <Calendar className="h-4 w-4 mr-1" />
                  Tracker
                </TabsTrigger>
                <TabsTrigger value="tour-planner-old" className="text-xs">
                  <MapPin className="h-4 w-4 mr-1" />
                  Old Planner
                </TabsTrigger>
                <TabsTrigger value="tour-planner-new" className="text-xs">
                  <Route className="h-4 w-4 mr-1" />
                  Tour Planner
                </TabsTrigger>
                <TabsTrigger value="tour-contracts" className="text-xs">
                  <FileText className="h-4 w-4 mr-1" />
                  Contracts
                </TabsTrigger>
                <TabsTrigger value="tour-stipends" className="text-xs">
                  <DollarSign className="h-4 w-4 mr-1" />
                  Stipends
                </TabsTrigger>
              </>
            )}
            <TabsTrigger value="position" className="text-xs">
              <PositionIcon className="h-4 w-4 mr-1" />
              My Role
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <EventCreator />
              <BudgetTracker />
              <CommunicationHub />
              <NotificationsPanel />
              <TaskChecklist />
              <CheckInOutTool />
              <MusicLibraryViewer />
              <ProgressLog />
            </div>
          </TabsContent>

          <TabsContent value="calendar">
            <CalendarViews />
          </TabsContent>

          <TabsContent value="announcements">
            <MeetingMinutes />
          </TabsContent>

          {selectedPosition === 'secretary' && (
            <TabsContent value="attendance">
              <AttendanceDashboard />
            </TabsContent>
          )}

          {selectedPosition === 'treasurer' && (
            <>
              <TabsContent value="ledger">
                <div className="space-y-6">
                  <StripeSalesSync />
                  <RunningLedger />
                </div>
              </TabsContent>
              
              <TabsContent value="budget-manager">
                <div className="space-y-6">
                  <BudgetManager />
                </div>
              </TabsContent>
              
              <TabsContent value="finances">
                <div className="space-y-8">
                  <DuesManager />
                  <GeneralBudgetManager />
                  <StipendPayer />
                  <ReceiptKeeper />
                </div>
              </TabsContent>
            </>
          )}

          <TabsContent value="resources">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FolderOpen className="h-5 w-5" />
                  Resource Library
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Resource library coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="development">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Leadership Development
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Leadership development tools coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          {selectedPosition === 'tour_manager' && (
            <>
              <TabsContent value="tour-overview">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5" />
                      Tour Management Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <TourOverview />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="tour-requests">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="h-5 w-5" />
                      Performance Email Requests
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <PerformanceRequestsList />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="tour-tracker">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Request to Completion Tracker
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <RequestTracker />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="tour-planner-old">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      Tour Planner (Legacy)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <TourPlannerOld />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="tour-planner-new">
                <TourPlanner />
              </TabsContent>

              <TabsContent value="tour-contracts">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Tour Contracts
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <TourContracts />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="tour-stipends">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Tour Stipends
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <TourStipends />
                  </CardContent>
                </Card>
              </TabsContent>
            </>
          )}

          <TabsContent value="position">
            <PositionTab position={selectedPosition} />
          </TabsContent>
        </Tabs>
      </div>
    </UniversalLayout>
  );
};