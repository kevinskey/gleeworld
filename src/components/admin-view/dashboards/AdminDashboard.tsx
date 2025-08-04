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
  UserCog
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActivityLogs } from "@/hooks/useActivityLogs";

// Import existing admin components
import { UserManagement } from "@/components/admin/UserManagement";
import { ContractManagement } from "@/components/admin/ContractManagement";
import { ActivityLogs } from "@/components/admin/ActivityLogs";
import { AdminSummaryStats } from "@/components/admin/AdminSummaryStats";
import { CalendarControlsAdmin } from "@/components/admin/CalendarControlsAdmin";

// Import the new permissions component
import { ExecutivePermissionsManagement } from "@/components/admin/ExecutivePermissionsManagement";

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
    <div className="min-h-screen bg-muted/30 p-6 -m-6">
      <div className="space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground">
            Manage the Spelman College Glee Club platform
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="contracts" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Contracts
            </TabsTrigger>
            <TabsTrigger value="permissions" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Permissions
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Calendar
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Activity
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <div className="space-y-6">
              <AdminSummaryStats users={users} loading={loading || logsLoading} activityLogs={activityLogs} />
              
              {/* Admin Functions Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div 
                  className="p-6 border rounded-lg hover:shadow-md transition-all cursor-pointer"
                  onClick={() => setActiveTab("users")}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                    <h3 className="font-semibold">User Management</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Manage user roles, permissions, and access levels
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold">{users.length}</span>
                    <span className="text-xs text-muted-foreground">Total Users</span>
                  </div>
                </div>

                <div 
                  className="p-6 border rounded-lg hover:shadow-md transition-all cursor-pointer"
                  onClick={() => setActiveTab("contracts")}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <FileText className="h-5 w-5 text-green-600" />
                    </div>
                    <h3 className="font-semibold">Contract Management</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Create, edit, and manage all contracts and templates
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold">Active</span>
                    <span className="text-xs text-muted-foreground">System</span>
                  </div>
                </div>

                <div 
                  className="p-6 border rounded-lg hover:shadow-md transition-all cursor-pointer"
                  onClick={() => setActiveTab("permissions")}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Shield className="h-5 w-5 text-purple-600" />
                    </div>
                    <h3 className="font-semibold">Executive Permissions</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Assign and manage executive board permissions
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold">Board</span>
                    <span className="text-xs text-muted-foreground">Management</span>
                  </div>
                </div>

                <div 
                  className="p-6 border rounded-lg hover:shadow-md transition-all cursor-pointer"
                  onClick={() => setActiveTab("calendar")}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <Calendar className="h-5 w-5 text-orange-600" />
                    </div>
                    <h3 className="font-semibold">Calendar Controls</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Manage calendar settings and user access
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold">Live</span>
                    <span className="text-xs text-muted-foreground">Calendar</span>
                  </div>
                </div>

                <div 
                  className="p-6 border rounded-lg hover:shadow-md transition-all cursor-pointer"
                  onClick={() => setActiveTab("activity")}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <Activity className="h-5 w-5 text-red-600" />
                    </div>
                    <h3 className="font-semibold">Activity Monitoring</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    View system logs and user activity
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold">{activityLogs.length}</span>
                    <span className="text-xs text-muted-foreground">Recent Logs</span>
                  </div>
                </div>

                <div 
                  className="p-6 border rounded-lg hover:shadow-md transition-all cursor-pointer"
                  onClick={() => setActiveTab("settings")}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <Settings className="h-5 w-5 text-gray-600" />
                    </div>
                    <h3 className="font-semibold">System Settings</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Configure system-wide settings and preferences
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold">Config</span>
                    <span className="text-xs text-muted-foreground">Settings</span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="users" className="mt-6">
            <UserManagement />
          </TabsContent>

          <TabsContent value="contracts" className="mt-6">
            <ContractManagement />
          </TabsContent>

          <TabsContent value="permissions" className="mt-6">
            <ExecutivePermissionsManagement />
          </TabsContent>

          <TabsContent value="calendar" className="mt-6">
            <CalendarControlsAdmin />
          </TabsContent>

          <TabsContent value="activity" className="mt-6">
            <ActivityLogs />
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            <div className="bg-white rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">System Settings</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">User Management</h4>
                    <p className="text-sm text-muted-foreground mb-3">Configure user registration and access controls</p>
                    <Badge variant="outline">Active</Badge>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Contract System</h4>
                    <p className="text-sm text-muted-foreground mb-3">Manage contract templates and workflows</p>
                    <Badge variant="outline">Operational</Badge>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Calendar Integration</h4>
                    <p className="text-sm text-muted-foreground mb-3">Connect external calendar services</p>
                    <Badge variant="secondary">Configured</Badge>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Activity Monitoring</h4>
                    <p className="text-sm text-muted-foreground mb-3">Track system usage and performance</p>
                    <Badge variant="outline">Live</Badge>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};