import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  FileText, 
  Settings, 
  Activity, 
  Shield,
  Calendar,
  BarChart,
  UserCog,
  Music,
  MessageSquare,
  Mail,
  Bell,
  Heart,
  Edit3,
  ChevronRight
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActivityLogs } from "@/hooks/useActivityLogs";

// Import existing admin components
import { UserManagement } from "@/components/admin/UserManagement";
import { ContractManagement } from "@/components/admin/ContractManagement";
import { ActivityLogs } from "@/components/admin/ActivityLogs";
import { AdminSummaryStats } from "@/components/admin/AdminSummaryStats";
import { CalendarControlsAdmin } from "@/components/admin/CalendarControlsAdmin";
import { SystemSettings } from "@/components/admin/SystemSettings";
import { PermissionManagement } from "@/components/admin/PermissionManagement";
import { AuditionsManagement } from "@/components/admin/AuditionsManagement";
// import { FinancialSystem } from "@/components/admin/FinancialSystem";

interface AdminDashboardProps {
  user: {
    id: string;
    email?: string;
    full_name?: string;
    role?: string;
    exec_board_role?: string;
    is_exec_board?: boolean;
    created_at?: string;
  };
}

export const AdminDashboard = ({ user }: AdminDashboardProps) => {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedCategory, setSelectedCategory] = useState("user-management");
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Fetch activity logs with the hook
  const { logs: activityLogs, loading: logsLoading } = useActivityLogs(true);

  // Fetch users data for the overview stats
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        console.log('AdminDashboard: Fetching users...');
        setLoading(true);
        
        // First check if we're authenticated
        const { data: { session } } = await supabase.auth.getSession();
        console.log('AdminDashboard: Current session:', session?.user?.id);
        
        const { data, error } = await supabase
          .from('gw_profiles')
          .select('*')
          .order('created_at', { ascending: false });
        
        console.log('AdminDashboard: Query result:', { data, error });
        
        if (error) {
          console.error('AdminDashboard: Error fetching users:', error);
          throw error;
        }
        
        console.log('AdminDashboard: Successfully fetched', data?.length || 0, 'users');
        setUsers(data || []);
      } catch (err) {
        console.error('AdminDashboard: Error in fetchUsers:', err);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchUsers();
    }
  }, [user]);

  return (
    <div className="min-h-screen bg-muted/30 p-3 sm:p-6 -m-3 sm:-m-6">
      <div className="space-y-4 sm:space-y-6">
        <div className="text-center mb-4 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Admin Dashboard
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground px-4">
            Manage the Spelman College Glee Club platform
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Mobile/Tablet optimized tabs */}
          <div className="overflow-x-auto">
            <TabsList className="grid w-full min-w-[800px] grid-cols-9 h-auto sm:h-10">
              <TabsTrigger value="overview" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 p-2 sm:p-4 text-xs sm:text-sm">
                <BarChart className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Overview</span>
                <span className="sm:hidden">Stats</span>
              </TabsTrigger>
              <TabsTrigger value="users" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 p-2 sm:p-4 text-xs sm:text-sm">
                <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>Users</span>
              </TabsTrigger>
              <TabsTrigger value="contracts" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 p-2 sm:p-4 text-xs sm:text-sm">
                <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Contracts</span>
                <span className="sm:hidden">Docs</span>
              </TabsTrigger>
              <TabsTrigger value="permissions" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 p-2 sm:p-4 text-xs sm:text-sm">
                <Shield className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Permissions</span>
                <span className="sm:hidden">Perms</span>
              </TabsTrigger>
              <TabsTrigger value="calendar" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 p-2 sm:p-4 text-xs sm:text-sm">
                <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Calendar</span>
                <span className="sm:hidden">Cal</span>
              </TabsTrigger>
              <TabsTrigger value="auditions" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 p-2 sm:p-4 text-xs sm:text-sm">
                <Music className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Auditions</span>
                <span className="sm:hidden">Audio</span>
              </TabsTrigger>
              <TabsTrigger value="activity" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 p-2 sm:p-4 text-xs sm:text-sm">
                <Activity className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Activity</span>
                <span className="sm:hidden">Logs</span>
              </TabsTrigger>
              <TabsTrigger value="financial" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 p-2 sm:p-4 text-xs sm:text-sm">
                <UserCog className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Financial</span>
                <span className="sm:hidden">Money</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 p-2 sm:p-4 text-xs sm:text-sm">
                <Settings className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Settings</span>
                <span className="sm:hidden">Config</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="mt-4 sm:mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 h-[calc(100vh-200px)]">
              {/* Left Column - Major Categories */}
              <div className="lg:col-span-1 bg-card rounded-lg border p-4 sm:p-6 overflow-y-auto">
                <h2 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6 text-foreground">
                  Admin Functions
                </h2>
                
                <div className="space-y-2 sm:space-y-3">
                  {/* User Management Category */}
                  <div 
                    className={`p-3 sm:p-4 rounded-lg cursor-pointer transition-all ${
                      selectedCategory === "user-management" 
                        ? "bg-primary/10 border-primary/20 border" 
                        : "bg-muted/50 hover:bg-muted"
                    }`}
                    onClick={() => setSelectedCategory("user-management")}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <Users className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                        <span className="font-medium text-sm sm:text-base">User Management</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1 sm:mt-2">
                      Manage users, auditions, profiles, and permissions
                    </p>
                  </div>

                  {/* Communications Category */}
                  <div 
                    className={`p-3 sm:p-4 rounded-lg cursor-pointer transition-all ${
                      selectedCategory === "communications" 
                        ? "bg-primary/10 border-primary/20 border" 
                        : "bg-muted/50 hover:bg-muted"
                    }`}
                    onClick={() => setSelectedCategory("communications")}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                        <span className="font-medium text-sm sm:text-base">Communications</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1 sm:mt-2">
                      Community hub, notifications, emails, and writing tools
                    </p>
                  </div>

                  {/* System Administration Category */}
                  <div 
                    className={`p-3 sm:p-4 rounded-lg cursor-pointer transition-all ${
                      selectedCategory === "system-admin" 
                        ? "bg-primary/10 border-primary/20 border" 
                        : "bg-muted/50 hover:bg-muted"
                    }`}
                    onClick={() => setSelectedCategory("system-admin")}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <Settings className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                        <span className="font-medium text-sm sm:text-base">System Administration</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1 sm:mt-2">
                      Calendar, contracts, activity logs, and system settings
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column - Subcategories */}
              <div className="lg:col-span-2 bg-card rounded-lg border p-4 sm:p-6 overflow-y-auto">
                <h2 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6 text-foreground">
                  {selectedCategory === "user-management" && "User Management Tools"}
                  {selectedCategory === "communications" && "Communications Hub"}
                  {selectedCategory === "system-admin" && "System Administration"}
                </h2>

                {/* User Management Subcategories */}
                {selectedCategory === "user-management" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div 
                      className="p-3 sm:p-4 border rounded-lg hover:shadow-md transition-all cursor-pointer"
                      onClick={() => setActiveTab("auditions")}
                    >
                      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                        <Music className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600" />
                        <h3 className="font-semibold text-sm sm:text-base">Auditions</h3>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Manage audition sessions, applications, and evaluations
                      </p>
                    </div>

                    <div 
                      className="p-3 sm:p-4 border rounded-lg hover:shadow-md transition-all cursor-pointer"
                      onClick={() => setActiveTab("users")}
                    >
                      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                        <Users className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                        <h3 className="font-semibold text-sm sm:text-base">Profile Management</h3>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        View and edit user profiles and account information
                      </p>
                    </div>

                    <div 
                      className="p-3 sm:p-4 border rounded-lg hover:shadow-md transition-all cursor-pointer"
                      onClick={() => setActiveTab("permissions")}
                    >
                      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                        <UserCog className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                        <h3 className="font-semibold text-sm sm:text-base">Exec Board Assignments</h3>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Manage executive board roles and responsibilities
                      </p>
                    </div>

                    <div 
                      className="p-3 sm:p-4 border rounded-lg hover:shadow-md transition-all cursor-pointer"
                      onClick={() => setActiveTab("permissions")}
                    >
                      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                        <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                        <h3 className="font-semibold text-sm sm:text-base">User Permissions</h3>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Control access levels and system permissions
                      </p>
                    </div>
                  </div>
                )}

                {/* Communications Subcategories */}
                {selectedCategory === "communications" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="p-3 sm:p-4 border rounded-lg hover:shadow-md transition-all cursor-pointer">
                      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                        <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600" />
                        <h3 className="font-semibold text-sm sm:text-base">Notifications</h3>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Send system-wide notifications to users
                      </p>
                    </div>

                    <div className="p-3 sm:p-4 border rounded-lg hover:shadow-md transition-all cursor-pointer">
                      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                        <Heart className="h-4 w-4 sm:h-5 sm:w-5 text-pink-600" />
                        <h3 className="font-semibold text-sm sm:text-base">Buckets of Love</h3>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Manage appreciation messages and recognition
                      </p>
                    </div>

                    <div className="p-3 sm:p-4 border rounded-lg hover:shadow-md transition-all cursor-pointer">
                      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                        <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                        <h3 className="font-semibold text-sm sm:text-base">Email Management</h3>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Send bulk emails and manage communication lists
                      </p>
                    </div>

                    <div className="p-3 sm:p-4 border rounded-lg hover:shadow-md transition-all cursor-pointer">
                      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                        <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                        <h3 className="font-semibold text-sm sm:text-base">Internal Communications</h3>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Staff messaging and internal announcements
                      </p>
                    </div>

                    <div className="p-3 sm:p-4 border rounded-lg hover:shadow-md transition-all cursor-pointer bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                        <Edit3 className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600" />
                        <h3 className="font-semibold text-sm sm:text-base">Glee Writing Widget</h3>
                        <Badge variant="secondary" className="text-xs">New</Badge>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Write letters, create templates, and newsletters via Google Docs
                      </p>
                    </div>
                  </div>
                )}

                {/* System Administration Subcategories */}
                {selectedCategory === "system-admin" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div 
                      className="p-3 sm:p-4 border rounded-lg hover:shadow-md transition-all cursor-pointer"
                      onClick={() => setActiveTab("calendar")}
                    >
                      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                        <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
                        <h3 className="font-semibold text-sm sm:text-base">Calendar Management</h3>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Manage events, rehearsals, and scheduling
                      </p>
                    </div>

                    <div 
                      className="p-3 sm:p-4 border rounded-lg hover:shadow-md transition-all cursor-pointer"
                      onClick={() => setActiveTab("contracts")}
                    >
                      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                        <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                        <h3 className="font-semibold text-sm sm:text-base">Contract Management</h3>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Create and manage contracts and legal documents
                      </p>
                    </div>

                    <div 
                      className="p-3 sm:p-4 border rounded-lg hover:shadow-md transition-all cursor-pointer"
                      onClick={() => setActiveTab("activity")}
                    >
                      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                        <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
                        <h3 className="font-semibold text-sm sm:text-base">Activity Logs</h3>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Monitor system activity and user actions
                      </p>
                    </div>

                    <div 
                      className="p-3 sm:p-4 border rounded-lg hover:shadow-md transition-all cursor-pointer"
                      onClick={() => setActiveTab("settings")}
                    >
                      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                        <Settings className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
                        <h3 className="font-semibold text-sm sm:text-base">System Settings</h3>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Configure system preferences and global settings
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="users" className="mt-4 sm:mt-6">
            <UserManagement />
          </TabsContent>

          <TabsContent value="contracts" className="mt-4 sm:mt-6">
            <ContractManagement />
          </TabsContent>

          <TabsContent value="permissions" className="mt-4 sm:mt-6">
            <PermissionManagement />
          </TabsContent>

          <TabsContent value="calendar" className="mt-4 sm:mt-6">
            <CalendarControlsAdmin />
          </TabsContent>

          <TabsContent value="auditions" className="mt-4 sm:mt-6">
            <AuditionsManagement />
          </TabsContent>

          <TabsContent value="activity" className="mt-4 sm:mt-6">
            <ActivityLogs />
          </TabsContent>

          <TabsContent value="financial" className="mt-4 sm:mt-6">
            <div className="bg-white rounded-lg p-4 sm:p-6">
              <h3 className="text-lg font-semibold mb-4">Financial System</h3>
              <p className="text-muted-foreground text-sm sm:text-base">Financial management tools will be available here.</p>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="mt-4 sm:mt-6">
            <SystemSettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};