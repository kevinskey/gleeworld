import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { UniversalLayout } from "@/components/layout/UniversalLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Shield
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
  const [executiveData, setExecutiveData] = useState<ExecutiveMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");

  useEffect(() => {
    checkExecutiveMembership();
  }, [user]);

  const checkExecutiveMembership = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('gw_executive_board_members')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking executive membership:', error);
        return;
      }

      setExecutiveData(data);
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

  const PositionIcon = getPositionIcon(executiveData.position);

  return (
    <UniversalLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bebas tracking-wide text-foreground">
              Executive Board Hub
            </h1>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" className="flex items-center gap-1">
                <PositionIcon className="h-3 w-3" />
                {getPositionName(executiveData.position)}
              </Badge>
              <Badge variant="outline">
                {executiveData.academic_year}
              </Badge>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6 lg:grid-cols-10">
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
              Announcements
            </TabsTrigger>
            <TabsTrigger value="resources" className="text-xs">
              <FolderOpen className="h-4 w-4 mr-1" />
              Resources
            </TabsTrigger>
            <TabsTrigger value="development" className="text-xs">
              <TrendingUp className="h-4 w-4 mr-1" />
              Development
            </TabsTrigger>
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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Event Calendar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Calendar integration coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="announcements">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Megaphone className="h-5 w-5" />
                  Announcements & Agendas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Announcements system coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

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

          <TabsContent value="position">
            <PositionTab position={executiveData.position} />
          </TabsContent>
        </Tabs>
      </div>
    </UniversalLayout>
  );
};