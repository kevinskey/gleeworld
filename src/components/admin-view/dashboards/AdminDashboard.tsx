import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  const [selectedCategory, setSelectedCategory] = useState("communications");
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 h-[calc(100vh-200px)]">
          {/* Left Column - Major Categories */}
          <div className="lg:col-span-1 bg-card rounded-lg border p-4 sm:p-6 overflow-y-auto">
            <h2 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6 text-foreground">
              Admin Categories
            </h2>
                
            <div className="space-y-2 sm:space-y-3">
              {/* Communications Category */}
              <div 
                className={`p-3 sm:p-4 rounded-lg cursor-pointer transition-all ${
                  selectedCategory === "communications" 
                    ? "bg-primary/10 border-primary/20 border" 
                    : "bg-muted/50 hover:bg-muted"
                }`}
                onClick={() => {
                  setSelectedCategory("communications");
                  setSelectedSubcategory(null);
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                    <span className="font-medium text-sm sm:text-base">Communications</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1 sm:mt-2">
                  Notifications, emails, community hub, and messaging tools
                </p>
              </div>

              {/* Wardrobe Category */}
              <div 
                className={`p-3 sm:p-4 rounded-lg cursor-pointer transition-all ${
                  selectedCategory === "wardrobe" 
                    ? "bg-primary/10 border-primary/20 border" 
                    : "bg-muted/50 hover:bg-muted"
                }`}
                onClick={() => {
                  setSelectedCategory("wardrobe");
                  setSelectedSubcategory(null);
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <Users className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                    <span className="font-medium text-sm sm:text-base">Wardrobe</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1 sm:mt-2">
                  Costume management, fitting schedules, and inventory
                </p>
              </div>

              {/* Executive Board Category */}
              <div 
                className={`p-3 sm:p-4 rounded-lg cursor-pointer transition-all ${
                  selectedCategory === "executive-board" 
                    ? "bg-primary/10 border-primary/20 border" 
                    : "bg-muted/50 hover:bg-muted"
                }`}
                onClick={() => {
                  setSelectedCategory("executive-board");
                  setSelectedSubcategory(null);
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <UserCog className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                    <span className="font-medium text-sm sm:text-base">Executive Board</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1 sm:mt-2">
                  Board management, roles, permissions, and system administration
                </p>
              </div>

              {/* Musical Leadership Category */}
              <div 
                className={`p-3 sm:p-4 rounded-lg cursor-pointer transition-all ${
                  selectedCategory === "musical-leadership" 
                    ? "bg-primary/10 border-primary/20 border" 
                    : "bg-muted/50 hover:bg-muted"
                }`}
                onClick={() => {
                  setSelectedCategory("musical-leadership");
                  setSelectedSubcategory(null);
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <Music className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600" />
                    <span className="font-medium text-sm sm:text-base">Musical Leadership</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1 sm:mt-2">
                  Auditions, music library, rehearsals, and performance management
                </p>
              </div>
            </div>
          </div>

          {/* Right Column - Functions List */}
          <div className="lg:col-span-2 bg-card rounded-lg border p-4 sm:p-6 overflow-y-auto">
            <h2 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6 text-foreground">
              {selectedCategory === "communications" && "Communications Hub"}
              {selectedCategory === "wardrobe" && "Wardrobe Management"}
              {selectedCategory === "executive-board" && "Executive Board Tools"}
              {selectedCategory === "musical-leadership" && "Musical Leadership"}
              {!selectedCategory && "Select a category to view functions"}
            </h2>

            {/* Show functions based on selected category */}
            {!selectedSubcategory && (
              <>
                {/* Communications Functions */}
                {selectedCategory === "communications" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div 
                      className="p-3 sm:p-4 border rounded-lg hover:shadow-md transition-all cursor-pointer"
                      onClick={() => setSelectedSubcategory("notifications")}
                    >
                      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                        <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600" />
                        <h3 className="font-semibold text-sm sm:text-base">Notifications</h3>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Send system-wide notifications to users
                      </p>
                    </div>

                    <div 
                      className="p-3 sm:p-4 border rounded-lg hover:shadow-md transition-all cursor-pointer"
                      onClick={() => setSelectedSubcategory("email-management")}
                    >
                      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                        <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                        <h3 className="font-semibold text-sm sm:text-base">Email Management</h3>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Send bulk emails and manage communication lists
                      </p>
                    </div>

                    <div 
                      className="p-3 sm:p-4 border rounded-lg hover:shadow-md transition-all cursor-pointer"
                      onClick={() => setSelectedSubcategory("buckets-of-love")}
                    >
                      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                        <Heart className="h-4 w-4 sm:h-5 sm:w-5 text-pink-600" />
                        <h3 className="font-semibold text-sm sm:text-base">Buckets of Love</h3>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Manage appreciation messages and recognition
                      </p>
                    </div>

                    <div 
                      className="p-3 sm:p-4 border rounded-lg hover:shadow-md transition-all cursor-pointer bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200"
                      onClick={() => setSelectedSubcategory("glee-writing")}
                    >
                      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                        <Edit3 className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600" />
                        <h3 className="font-semibold text-sm sm:text-base">Glee Writing Widget</h3>
                        <Badge variant="secondary" className="text-xs">New</Badge>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Write letters, create templates, and newsletters via Google Docs
                      </p>
                    </div>

                    <div 
                      className="p-3 sm:p-4 border rounded-lg hover:shadow-md transition-all cursor-pointer"
                      onClick={() => setSelectedSubcategory("internal-communications")}
                    >
                      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                        <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                        <h3 className="font-semibold text-sm sm:text-base">Internal Communications</h3>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Staff messaging and internal announcements
                      </p>
                    </div>
                  </div>
                )}

                {/* Wardrobe Functions */}
                {selectedCategory === "wardrobe" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div 
                      className="p-3 sm:p-4 border rounded-lg hover:shadow-md transition-all cursor-pointer"
                      onClick={() => setSelectedSubcategory("costume-inventory")}
                    >
                      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                        <Users className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                        <h3 className="font-semibold text-sm sm:text-base">Costume Inventory</h3>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Track costumes, sizes, and availability
                      </p>
                    </div>

                    <div 
                      className="p-3 sm:p-4 border rounded-lg hover:shadow-md transition-all cursor-pointer"
                      onClick={() => setSelectedSubcategory("fitting-schedules")}
                    >
                      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                        <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600" />
                        <h3 className="font-semibold text-sm sm:text-base">Fitting Schedules</h3>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Schedule and manage costume fittings
                      </p>
                    </div>

                    <div 
                      className="p-3 sm:p-4 border rounded-lg hover:shadow-md transition-all cursor-pointer"
                      onClick={() => setSelectedSubcategory("costume-assignments")}
                    >
                      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                        <Users className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                        <h3 className="font-semibold text-sm sm:text-base">Costume Assignments</h3>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Assign costumes to members for performances
                      </p>
                    </div>

                    <div 
                      className="p-3 sm:p-4 border rounded-lg hover:shadow-md transition-all cursor-pointer"
                      onClick={() => setSelectedSubcategory("maintenance-repairs")}
                    >
                      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                        <Settings className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
                        <h3 className="font-semibold text-sm sm:text-base">Maintenance & Repairs</h3>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Track costume condition and repairs needed
                      </p>
                    </div>
                  </div>
                )}

                {/* Executive Board Functions */}
                {selectedCategory === "executive-board" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div 
                      className="p-3 sm:p-4 border rounded-lg hover:shadow-md transition-all cursor-pointer"
                      onClick={() => setSelectedSubcategory("exec-board")}
                    >
                      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                        <UserCog className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                        <h3 className="font-semibold text-sm sm:text-base">Board Assignments</h3>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Manage executive board roles and responsibilities
                      </p>
                    </div>

                    <div 
                      className="p-3 sm:p-4 border rounded-lg hover:shadow-md transition-all cursor-pointer"
                      onClick={() => setSelectedSubcategory("profile-management")}
                    >
                      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                        <Users className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                        <h3 className="font-semibold text-sm sm:text-base">User Management</h3>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        View and edit user profiles and account information
                      </p>
                    </div>

                    <div 
                      className="p-3 sm:p-4 border rounded-lg hover:shadow-md transition-all cursor-pointer"
                      onClick={() => setSelectedSubcategory("permissions")}
                    >
                      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                        <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                        <h3 className="font-semibold text-sm sm:text-base">Permissions</h3>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Control access levels and system permissions
                      </p>
                    </div>

                    <div 
                      className="p-3 sm:p-4 border rounded-lg hover:shadow-md transition-all cursor-pointer"
                      onClick={() => setSelectedSubcategory("contracts")}
                    >
                      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                        <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                        <h3 className="font-semibold text-sm sm:text-base">Contract Management</h3>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Handle member contracts and agreements
                      </p>
                    </div>

                    <div 
                      className="p-3 sm:p-4 border rounded-lg hover:shadow-md transition-all cursor-pointer"
                      onClick={() => setSelectedSubcategory("activity")}
                    >
                      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                        <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                        <h3 className="font-semibold text-sm sm:text-base">Activity Logs</h3>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Monitor system activity and user actions
                      </p>
                    </div>

                    <div 
                      className="p-3 sm:p-4 border rounded-lg hover:shadow-md transition-all cursor-pointer"
                      onClick={() => setSelectedSubcategory("settings")}
                    >
                      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                        <Settings className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
                        <h3 className="font-semibold text-sm sm:text-base">System Settings</h3>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Configure system-wide settings and preferences
                      </p>
                    </div>

                    <div 
                      className="p-3 sm:p-4 border rounded-lg hover:shadow-md transition-all cursor-pointer"
                      onClick={() => setSelectedSubcategory("calendar")}
                    >
                      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                        <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                        <h3 className="font-semibold text-sm sm:text-base">Calendar Management</h3>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Manage events, rehearsals, and performances
                      </p>
                    </div>
                  </div>
                )}

                {/* Musical Leadership Functions */}
                {selectedCategory === "musical-leadership" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div 
                      className="p-3 sm:p-4 border rounded-lg hover:shadow-md transition-all cursor-pointer"
                      onClick={() => setSelectedSubcategory("auditions")}
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
                      onClick={() => setSelectedSubcategory("music-library")}
                    >
                      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                        <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                        <h3 className="font-semibold text-sm sm:text-base">Music Library</h3>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Organize sheet music, recordings, and arrangements
                      </p>
                    </div>

                    <div 
                      className="p-3 sm:p-4 border rounded-lg hover:shadow-md transition-all cursor-pointer"
                      onClick={() => setSelectedSubcategory("rehearsal-management")}
                    >
                      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                        <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                        <h3 className="font-semibold text-sm sm:text-base">Rehearsal Management</h3>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Schedule rehearsals and track attendance
                      </p>
                    </div>

                    <div 
                      className="p-3 sm:p-4 border rounded-lg hover:shadow-md transition-all cursor-pointer"
                      onClick={() => setSelectedSubcategory("performance-planning")}
                    >
                      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                        <Music className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
                        <h3 className="font-semibold text-sm sm:text-base">Performance Planning</h3>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Plan concerts, tours, and special events
                      </p>
                    </div>

                    <div 
                      className="p-3 sm:p-4 border rounded-lg hover:shadow-md transition-all cursor-pointer"
                      onClick={() => setSelectedSubcategory("voice-parts")}
                    >
                      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                        <Users className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600" />
                        <h3 className="font-semibold text-sm sm:text-base">Voice Parts</h3>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Assign voice parts and manage section leaders
                      </p>
                    </div>

                    <div 
                      className="p-3 sm:p-4 border rounded-lg hover:shadow-md transition-all cursor-pointer"
                      onClick={() => setSelectedSubcategory("repertoire")}
                    >
                      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                        <BarChart className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                        <h3 className="font-semibold text-sm sm:text-base">Repertoire Planning</h3>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Plan concert programs and song selections
                      </p>
                    </div>
                  </div>
                )}

                {/* Default state - no category selected */}
                {!selectedCategory && (
                  <div className="flex items-center justify-center h-64 text-center">
                    <div>
                      <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium text-foreground mb-2">
                        Select a Category
                      </h3>
                      <p className="text-muted-foreground">
                        Choose a category from the left panel to view available functions
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Actual content components */}
            {selectedSubcategory && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <button 
                    onClick={() => setSelectedSubcategory(null)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    ← Back to {
                      selectedCategory === "communications" ? "Communications" : 
                      selectedCategory === "wardrobe" ? "Wardrobe" :
                      selectedCategory === "executive-board" ? "Executive Board" :
                      selectedCategory === "musical-leadership" ? "Musical Leadership" : "Dashboard"
                    }
                  </button>
                </div>

                {/* User Management Components */}
                {selectedSubcategory === "auditions" && <AuditionsManagement />}
                {selectedSubcategory === "profile-management" && <UserManagement />}
                {selectedSubcategory === "exec-board" && <PermissionManagement />}
                {selectedSubcategory === "permissions" && <PermissionManagement />}

                {/* Communications Components */}
                {selectedSubcategory === "notifications" && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Notifications Management</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">Coming soon - System notification management interface</p>
                    </CardContent>
                  </Card>
                )}
                {selectedSubcategory === "buckets-of-love" && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Buckets of Love</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">Coming soon - Appreciation message management</p>
                    </CardContent>
                  </Card>
                )}
                {selectedSubcategory === "email-management" && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Email Management</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">Coming soon - Bulk email and communication tools</p>
                    </CardContent>
                  </Card>
                )}
                {selectedSubcategory === "internal-communications" && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Internal Communications</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">Coming soon - Staff messaging and internal announcements</p>
                    </CardContent>
                  </Card>
                )}
                {selectedSubcategory === "glee-writing" && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Edit3 className="h-5 w-5 text-indigo-600" />
                        Glee Writing Widget
                        <Badge variant="secondary">New</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <p className="text-muted-foreground">
                          Create and manage letters, templates, and newsletters through Google Docs integration.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-base">Letter Writing</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <p className="text-sm text-muted-foreground">Create official Glee Club correspondence</p>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-base">Template Manager</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <p className="text-sm text-muted-foreground">Manage reusable document templates</p>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-base">Newsletter Creation</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <p className="text-sm text-muted-foreground">Design and distribute newsletters</p>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-base">Google Docs Sync</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <p className="text-sm text-muted-foreground">Seamless integration with Google Workspace</p>
                            </CardContent>
                          </Card>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* System Administration Components */}
                {selectedSubcategory === "calendar" && <CalendarControlsAdmin />}
                {selectedSubcategory === "contracts" && <ContractManagement />}
                {selectedSubcategory === "activity" && <ActivityLogs />}
                {selectedSubcategory === "settings" && <SystemSettings />}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};