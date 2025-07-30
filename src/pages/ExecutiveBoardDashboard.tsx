import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { SpiritualReflectionsCard } from "@/components/member-view/SpiritualReflectionsCard";
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
  X,
  Music,
  Settings,
  Send,
  PenTool,
  Eye,
  Target,
  Clock,
  ClipboardList,
  Play
} from "lucide-react";
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
  | 'section_leader_a2';

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
      data_analyst: BarChart3,
      assistant_chaplain: Heart,
      student_conductor: Music2,
      section_leader_s1: UserCheck,
      section_leader_s2: UserCheck,
      section_leader_a1: UserCheck,
      section_leader_a2: UserCheck
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
      section_leader_a2: "Section Leader (A2)"
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
  
  // Use the uploaded historic campus image as background
  const backgroundImage = "/lovable-uploads/7f76a692-7ffc-414c-af69-fc6585338524.png";

  return (
    <div className="min-h-screen relative">
      {/* Background Image */}
      {backgroundImage && (
        <div 
          className="fixed inset-0 bg-cover bg-center z-0 after:absolute after:inset-0 after:bg-white after:opacity-20"
          style={{ backgroundImage: `url(${backgroundImage})` }}
        />
      )}
      
      {/* Content overlay */}
      <div className="relative z-10">
        <UniversalLayout className="bg-transparent">
          <div className="space-y-6 p-4 md:px-8 lg:px-12 xl:px-16 max-w-full overflow-hidden">
        {/* Mobile-First Navigation Layout */}
        {isMobile ? (
          <div className="space-y-4">
            {/* View Mode Toggle - Full Width on Mobile */}
            <div className="w-full mobile-stable">
              <div className="flex items-center gap-2 p-2 bg-white/90 rounded-lg border shadow-sm">
                <Button
                  variant="default"
                  size="sm"
                  className="flex-1 flex items-center justify-center gap-2 text-xs sm:text-sm px-2 sm:px-4 h-10 bg-primary text-primary-foreground mobile-control"
                >
                  <Crown className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="truncate">Exec Board View</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/dashboard')}
                  className="flex-1 flex items-center justify-center gap-2 text-xs sm:text-sm px-2 sm:px-4 h-10 text-primary hover:bg-primary/10 mobile-control"
                >
                  <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="truncate">Member View</span>
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* Desktop Navigation Layout */
          <div className="flex items-center justify-end">
            {/* View Mode Toggle - Desktop */}
            <div className="flex items-center gap-2 p-1 bg-white/10 rounded-lg border border-white/20">
              <Button
                variant="default"
                size="sm"
                className="flex items-center gap-2 text-sm px-3 h-9 bg-white text-black hover:bg-white/90"
              >
                <Crown className="h-4 w-4" />
                Exec Board View
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-2 text-sm px-3 h-9 text-white hover:bg-white/20"
              >
                <Users className="h-4 w-4" />
                Member View
              </Button>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-bebas font-bold tracking-wide">
              <span className="block sm:hidden text-5xl text-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]">Exec Board Hub</span>
              <span className="hidden sm:block text-4xl md:text-6xl lg:text-7xl xl:text-8xl text-foreground md:text-white md:drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]">Executive Board Hub</span>
            </h1>
            
            {/* Welcome message with user's name */}
            {user?.user_metadata?.full_name && (
              <div className="bg-black/30 backdrop-blur-sm rounded-lg px-4 py-2 mt-2 border border-white/20">
                <p className="text-lg md:text-xl text-white font-medium">
                  Welcome back, {user.user_metadata.full_name}! 👋
                </p>
              </div>
            )}
            
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-2">
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
                    <SelectItem value="assistant_chaplain">
                      <div className="flex items-center gap-2">
                        <Heart className="h-4 w-4" />
                        Assistant Chaplain
                      </div>
                    </SelectItem>
                    <SelectItem value="section_leader_s1">
                      <div className="flex items-center gap-2">
                        <UserCheck className="h-4 w-4" />
                        Section Leader
                      </div>
                    </SelectItem>
                    <SelectItem value="student_conductor">
                      <div className="flex items-center gap-2">
                        <Music2 className="h-4 w-4" />
                        Student Conductor
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <PositionIcon className="h-3 w-3" />
                    {getPositionName(selectedPosition)}
                  </Badge>
                  <Badge variant="outline" className="block sm:hidden">
                    2025/26
                  </Badge>
                </div>
              )}
              <Badge variant="outline" className="hidden sm:block">
                2025/26
              </Badge>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mobile-stable">
          <TabsList className="w-full overflow-x-auto scrollbar-hide mobile-tabs"
            style={{ 
              display: 'flex',
              flexWrap: 'nowrap',
              gap: '0.125rem',
              padding: '0.25rem',
              minHeight: '2.5rem'
            }}
          >
            <TabsTrigger value="dashboard" className="text-xs px-2 py-1 whitespace-nowrap flex-shrink-0 min-w-fit">
              <Users className="h-3 w-3 mr-1" />
              <span className="hidden xs:inline sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="calendar" className="text-xs px-2 py-1 whitespace-nowrap flex-shrink-0 min-w-fit">
              <Calendar className="h-3 w-3 mr-1" />
              <span>Calendar</span>
            </TabsTrigger>
            <TabsTrigger value="announcements" className="text-xs px-2 py-1 whitespace-nowrap flex-shrink-0 min-w-fit">
              <Megaphone className="h-3 w-3 mr-1" />
              <span>Minutes</span>
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
            {selectedPosition === 'wardrobe_manager' && (
              <TabsTrigger value="wardrobe" className="text-xs">
                <Shirt className="h-4 w-4 mr-1" />
                Wardrobe Hub
              </TabsTrigger>
            )}
            {selectedPosition === 'librarian' && (
              <TabsTrigger value="music-library" className="text-xs">
                <BookOpen className="h-4 w-4 mr-1" />
                Music Library
              </TabsTrigger>
            )}
            {selectedPosition === 'historian' && (
              <TabsTrigger value="historian-hub" className="text-xs">
                <Camera className="h-4 w-4 mr-1" />
                Historian Hub
              </TabsTrigger>
            )}
            {selectedPosition === 'pr_coordinator' && (
              <TabsTrigger value="pr-hub" className="text-xs">
                <MessageSquare className="h-4 w-4 mr-1" />
                PR Hub
              </TabsTrigger>
            )}
            {(selectedPosition === 'chaplain' || selectedPosition === 'assistant_chaplain') && (
              <TabsTrigger value="chaplain-hub" className="text-xs">
                <Heart className="h-4 w-4 mr-1" />
                Chaplain Hub
              </TabsTrigger>
            )}
            {selectedPosition === 'student_conductor' && (
              <>
                <TabsTrigger value="conductor-overview" className="text-xs">
                  <Music className="h-4 w-4 mr-1" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="sections-srf" className="text-xs">
                  <UserCheck className="h-4 w-4 mr-1" />
                  Sections & SRF
                </TabsTrigger>
                <TabsTrigger value="auditions-reviews" className="text-xs">
                  <Users className="h-4 w-4 mr-1" />
                  Auditions & Reviews
                </TabsTrigger>
                <TabsTrigger value="communication-journal" className="text-xs">
                  <MessageSquare className="h-4 w-4 mr-1" />
                  Communication
                </TabsTrigger>
              </>
            )}
            <TabsTrigger value="audition-logs" className="text-xs">
              <Music className="h-4 w-4 mr-1" />
              Audition Logs
            </TabsTrigger>
            <TabsTrigger value="handbook" className="text-xs">
              <BookOpen className="h-4 w-4 mr-1" />
              Handbook
            </TabsTrigger>
            <TabsTrigger value="position" className="text-xs">
              <PositionIcon className="h-4 w-4 mr-1" />
              My Role
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            {/* Member Dashboard Layout - Same as regular dashboard */}
            
            {/* 1. Spiritual Gleeflections */}
            <div className="grid grid-cols-1 gap-6">
              <SpiritualReflectionsCard />
            </div>

            {/* 2. Notifications and Check In/Out - 50%/50% layout on desktop/iPad */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <NotificationsPanel />
              <CheckInOutTool />
            </div>

            {/* 4. Upcoming Events - Horizontal Scroll */}
            <div className="space-y-4">
              <h3 className="text-2xl font-semibold text-white drop-shadow-md">Upcoming Events</h3>
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent snap-x snap-mandatory scroll-smooth">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Card key={i} className="flex-shrink-0 w-72 snap-start">
                    <CardContent className="p-4">
                      <h4 className="text-lg font-semibold mb-2">Spring Concert {i}</h4>
                      <p className="text-base text-muted-foreground mb-2">March {15 + i}, 2024</p>
                      <p className="text-base">Sisters Chapel</p>
                      <Badge variant="secondary" className="mt-2">Performance</Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* 5. Music Library - Horizontal Scroll */}
            <div className="space-y-4">
              <h3 className="text-2xl font-semibold text-white drop-shadow-md">Our Music</h3>
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent snap-x snap-mandatory scroll-smooth">
                <MusicLibraryViewer />
              </div>
            </div>

            {/* 6. Glee Store - Horizontal Scroll */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-white drop-shadow-md">Glee Store</h3>
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent snap-x snap-mandatory scroll-smooth">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Card key={i} className="flex-shrink-0 w-64 snap-start">
                    <div className="aspect-square bg-muted overflow-hidden">
                      <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
                        <span className="text-lg font-semibold">Product {i}</span>
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <h4 className="font-semibold mb-1">Glee Club T-Shirt</h4>
                      <p className="text-sm text-muted-foreground mb-2">$25.00</p>
                      <Button size="sm" className="w-full">Add to Cart</Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* 7. YouTube Videos - Horizontal Scroll */}
            <div className="space-y-4">
              <h3 className="text-2xl font-semibold text-white drop-shadow-md">YouTube</h3>
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent snap-x snap-mandatory scroll-smooth">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Card key={i} className="flex-shrink-0 w-80 snap-start">
                    <div className="aspect-video bg-muted overflow-hidden">
                      <div className="w-full h-full bg-gradient-to-br from-red-500/20 to-red-600/40 flex items-center justify-center">
                        <span className="text-xl font-semibold">Video {i}</span>
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <h4 className="text-lg font-semibold mb-1">Concert Performance</h4>
                      <p className="text-base text-muted-foreground">2 days ago • 1.2K views</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* 8. Tasks and Calendar */}
            <div className="grid grid-cols-1 gap-6">
              <TaskChecklist />
            </div>

            {/* 9. Full Calendar */}
            <div className="grid grid-cols-1 gap-6">
              <CalendarViews />
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

          {selectedPosition === 'wardrobe_manager' && (
            <TabsContent value="wardrobe">
              <WardrobeMistressHub />
            </TabsContent>
          )}

          {selectedPosition === 'librarian' && (
            <TabsContent value="music-library">
              <LibraryManagement />
            </TabsContent>
          )}

          {selectedPosition === 'historian' && (
            <TabsContent value="historian-hub">
              <HistorianWorkpage />
            </TabsContent>
          )}

          {selectedPosition === 'pr_coordinator' && (
            <TabsContent value="pr-hub">
              <PRCoordinatorHub />
            </TabsContent>
          )}

          {(selectedPosition === 'chaplain' || selectedPosition === 'assistant_chaplain') && (
            <TabsContent value="chaplain-hub">
              <ChaplainWorkHub />
            </TabsContent>
          )}

          {selectedPosition === 'student_conductor' && (
            <>
              <TabsContent value="conductor-overview" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <UserCheck className="h-5 w-5" />
                        Section Leadership
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">3</div>
                      <p className="text-base text-muted-foreground">Plans awaiting review</p>
                      <Button size="sm" className="mt-3" onClick={() => setActiveTab("sections-srf")}>
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
                      <div className="text-2xl font-bold">68%</div>
                      <p className="text-sm text-muted-foreground">Average completion rate</p>
                      <Button size="sm" className="mt-3" onClick={() => setActiveTab("sections-srf")}>
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
                      <div className="text-2xl font-bold">3</div>
                      <p className="text-sm text-muted-foreground">Scheduled for Feb 5</p>
                      <Button size="sm" className="mt-3" onClick={() => setActiveTab("auditions-reviews")}>
                        View Schedule
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="sections-srf">
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <UserCheck className="h-5 w-5" />
                        Section Leader Oversight
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {[
                          { id: 1, sectionLeader: "Sarah Johnson", section: "Soprano 1", week: "Week 3", status: "Pending Review", uploadDate: "2024-01-26", focus: "Breath control, high notes" },
                          { id: 2, sectionLeader: "Maria Garcia", section: "Alto 2", week: "Week 3", status: "Approved", uploadDate: "2024-01-25", focus: "Rhythm in measures 32-48" },
                          { id: 3, sectionLeader: "Ashley Brown", section: "Soprano 2", week: "Week 3", status: "Needs Revision", uploadDate: "2024-01-24", focus: "Vowel placement" }
                        ].map((plan) => (
                          <Card key={plan.id} className="hover:shadow-md transition-shadow">
                            <CardContent className="pt-4">
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <h4 className="font-semibold">{plan.sectionLeader} - {plan.section}</h4>
                                  <p className="text-sm text-muted-foreground">{plan.week} • Uploaded {plan.uploadDate}</p>
                                </div>
                                <Badge variant="outline">{plan.status}</Badge>
                              </div>
                              <p className="text-sm mb-3">Focus: {plan.focus}</p>
                              <div className="flex gap-2">
                                <Button size="sm">
                                  <Eye className="h-4 w-4 mr-2" />
                                  Review Plan
                                </Button>
                                <Button size="sm" variant="outline">
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Approve
                                </Button>
                                <Button size="sm" variant="outline">
                                  <MessageSquare className="h-4 w-4 mr-2" />
                                  Add Comment
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BookOpen className="h-5 w-5" />
                        Sight Reading Manager (SRF Integration)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex gap-3 mb-4">
                          <Button>
                            <Play className="h-4 w-4 mr-2" />
                            Create Assignment
                          </Button>
                          <Button variant="outline">
                            <ClipboardList className="h-4 w-4 mr-2" />
                            Placement Test
                          </Button>
                          <Button variant="outline">
                            <Settings className="h-4 w-4 mr-2" />
                            Template Builder
                          </Button>
                        </div>
                        {[
                          { id: 1, title: "Bach Chorale #47", assigned: "15 students", completed: "12 students", dueDate: "2024-01-30", difficulty: "Intermediate" },
                          { id: 2, title: "Sight-reading Test #3", assigned: "15 students", completed: "8 students", dueDate: "2024-02-02", difficulty: "Advanced" },
                          { id: 3, title: "Major Scale Practice", assigned: "15 students", completed: "15 students", dueDate: "2024-01-28", difficulty: "Beginner" }
                        ].map((assignment) => (
                          <Card key={assignment.id} className="hover:shadow-md transition-shadow">
                            <CardContent className="pt-4">
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <h4 className="font-semibold">{assignment.title}</h4>
                                  <p className="text-sm text-muted-foreground">Due: {assignment.dueDate}</p>
                                </div>
                                <Badge variant="outline">{assignment.difficulty}</Badge>
                              </div>
                              <div className="grid grid-cols-2 gap-4 mb-3">
                                <div>
                                  <p className="text-sm text-muted-foreground">Assigned</p>
                                  <p className="font-medium">{assignment.assigned}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">Completed</p>
                                  <p className="font-medium">{assignment.completed}</p>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button size="sm">
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Results
                                </Button>
                                <Button size="sm" variant="outline">
                                  <Send className="h-4 w-4 mr-2" />
                                  Send Reminder
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="auditions-reviews">
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Auditions & Solos Hub
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {[
                          { id: 1, name: "Jennifer Wilson", timeSlot: "3:00 PM", date: "2024-02-05", type: "New Member", status: "Scheduled", notes: "Strong sight-reading background" },
                          { id: 2, name: "Taylor Davis", timeSlot: "3:15 PM", date: "2024-02-05", type: "Solo Audition", status: "Callback", notes: "Excellent tone quality" },
                          { id: 3, name: "Morgan Lee", timeSlot: "3:30 PM", date: "2024-02-05", type: "New Member", status: "Pending", notes: "Needs vocal technique work" }
                        ].map((audition) => (
                          <Card key={audition.id} className="hover:shadow-md transition-shadow">
                            <CardContent className="pt-4">
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <h4 className="font-semibold">{audition.name}</h4>
                                  <p className="text-sm text-muted-foreground">{audition.date} at {audition.timeSlot}</p>
                                </div>
                                <div className="flex gap-2">
                                  <Badge variant="outline">{audition.type}</Badge>
                                  <Badge variant="outline">{audition.status}</Badge>
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

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Submission Review Panel
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {[
                          { id: 1, from: "Section Leaders", title: "Weekly Progress Reports", date: "2024-01-26", status: "New", type: "Report" },
                          { id: 2, from: "Sarah Johnson", title: "Sectional Recording - S1", date: "2024-01-25", status: "Reviewed", type: "Audio" },
                          { id: 3, from: "Music Committee", title: "Spring Concert Repertoire Suggestions", date: "2024-01-24", status: "Forwarded", type: "Document" }
                        ].map((submission) => (
                          <Card key={submission.id} className="hover:shadow-md transition-shadow">
                            <CardContent className="pt-4">
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <h4 className="font-semibold">{submission.title}</h4>
                                  <p className="text-sm text-muted-foreground">From: {submission.from} • {submission.date}</p>
                                </div>
                                <div className="flex gap-2">
                                  <Badge variant="outline">{submission.type}</Badge>
                                  <Badge variant="outline">{submission.status}</Badge>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button size="sm">
                                  <Eye className="h-4 w-4 mr-2" />
                                  Review
                                </Button>
                                <Button size="sm" variant="outline">
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Complete
                                </Button>
                                <Button size="sm" variant="outline">
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
                </div>
              </TabsContent>

              <TabsContent value="communication-journal">
                <div className="space-y-6">
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
                </div>
              </TabsContent>
            </>
          )}

          <TabsContent value="audition-logs">
            <AuditionLogs />
          </TabsContent>

          <TabsContent value="handbook">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  SCGC Handbook 2024
                </CardTitle>
              </CardHeader>
              <CardContent>
                <HandbookModule />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="position">
            <PositionTab position={selectedPosition} />
          </TabsContent>
        </Tabs>
          </div>
        </UniversalLayout>
      </div>
    </div>
  );
};