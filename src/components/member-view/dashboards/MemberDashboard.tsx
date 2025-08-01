import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CommunityHubWidget } from "@/components/unified/CommunityHubWidget";
import { ExecutiveBoardDirectory } from "@/components/shared/ExecutiveBoardDirectory";
import { usePublicGleeWorldEvents } from "@/hooks/usePublicGleeWorldEvents";
import { useNavigate } from "react-router-dom";
import { 
  Calendar, 
  CheckCircle, 
  Bell, 
  ArrowRight,
  GraduationCap,
  AlertCircle,
  FileText
} from "lucide-react";

interface MemberDashboardProps {
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

export const MemberDashboard = ({ user }: MemberDashboardProps) => {
  const navigate = useNavigate();
  const { events: upcomingEvents, loading: eventsLoading } = usePublicGleeWorldEvents();
  
  // Real data - to be connected to actual data sources
  const memberData = {
    attendance: {
      total: 0,
      present: 0,
      percentage: 0
    },
    contracts: [
      { id: 1, title: "Spring Concert Agreement", status: "pending", dueDate: "2024-02-15" },
      { id: 2, title: "Tour Participation Form", status: "completed", dueDate: "2024-01-30" }
    ],
    announcements: [
      { id: 1, title: "Spring Tour Rehearsal Schedule", content: "Updated rehearsal times for tour preparation", date: "Feb 8", priority: "high" },
      { id: 2, title: "Music Library Update", content: "New sheet music available for checkout", date: "Feb 5", priority: "normal" }
    ]
  };

  const getTotalNotifications = () => {
    return memberData.contracts.filter(c => c.status === 'pending').length +
           memberData.announcements.length;
  };

  return (
    <div className="min-h-screen bg-muted/30 p-6 -m-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* SCGC Handbook Card */}
        <Card 
          className="cursor-pointer hover:shadow-md transition-all duration-200 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10" 
          onClick={() => navigate('/handbook')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-semibold text-primary">SCGC Handbook</CardTitle>
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              <ArrowRight className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">2024</div>
            <p className="text-sm text-muted-foreground">Official guide & exam</p>
          </CardContent>
        </Card>

        {/* Attendance Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-semibold">Attendance</CardTitle>
            <CheckCircle className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{memberData.attendance.percentage}%</div>
            <p className="text-sm text-muted-foreground">
              {memberData.attendance.present} of {memberData.attendance.total} rehearsals
            </p>
            <Progress value={memberData.attendance.percentage} className="mt-2" />
          </CardContent>
        </Card>

        {/* Upcoming Events Card */}
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/calendar')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-semibold">Upcoming Events</CardTitle>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            {eventsLoading ? (
              <div className="animate-pulse">
                <div className="h-6 bg-muted rounded mb-2"></div>
                <div className="h-4 bg-muted rounded"></div>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">{upcomingEvents.length}</div>
                <p className="text-sm text-muted-foreground">Public events</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Consolidated Notifications & Tasks Card */}
        <Card className="relative overflow-hidden border-orange-200 dark:border-orange-800">
          <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-orange-100 to-orange-50 dark:from-orange-900/20 dark:to-orange-800/10 rounded-bl-full"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div>
              <CardTitle className="text-base font-bold text-orange-700 dark:text-orange-300">Action Items</CardTitle>
              <p className="text-sm text-muted-foreground">Tasks & notifications</p>
            </div>
            <div className="relative">
              <Bell className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              {getTotalNotifications() > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full text-xs flex items-center justify-center text-white font-medium">
                  {getTotalNotifications()}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-700 dark:text-orange-300 mb-2">
              {getTotalNotifications()}
            </div>
            <p className="text-sm text-muted-foreground mb-3">Items need attention</p>
            
            {getTotalNotifications() > 0 ? (
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {/* Pending Contracts */}
                {memberData.contracts.filter(c => c.status === 'pending').map(contract => (
                  <div key={contract.id} className="flex items-center gap-2 p-2 bg-orange-50 dark:bg-orange-900/20 rounded text-xs">
                    <FileText className="h-3 w-3 text-orange-600" />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium truncate">{contract.title}</span>
                      <span className="text-muted-foreground ml-1">• Due {contract.dueDate}</span>
                    </div>
                  </div>
                ))}
                
                {/* Recent Announcements */}
                {memberData.announcements.slice(0, 2).map(announcement => (
                  <div key={announcement.id} className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs">
                    <AlertCircle className="h-3 w-3 text-blue-600" />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium truncate">{announcement.title}</span>
                      <span className="text-muted-foreground ml-1">• {announcement.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-2 text-muted-foreground">
                <CheckCircle className="h-6 w-6 mx-auto mb-1 opacity-50" />
                <p className="text-xs">All caught up!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Secondary Row - Executive Board Directory Only */}
      <div className="grid grid-cols-1 gap-6 mt-6">
        {/* Executive Board Directory */}
        <ExecutiveBoardDirectory variant="compact" />
      </div>

      {/* Bottom Row - Community Hub */}
      <div className="mt-6">
        <CommunityHubWidget />
      </div>
    </div>
  );
};
