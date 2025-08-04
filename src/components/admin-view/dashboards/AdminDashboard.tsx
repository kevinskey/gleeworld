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
  ChevronRight,
  BookOpen,
  Image,
  FileAudio,
  Database,
  StickyNote,
  CheckCircle,
  ArrowUpDown,
  ScanLine,
  UserCheck,
  ClipboardList,
  TrendingUp,
  Clock,
  Edit,
  DollarSign,
  Receipt,
  CreditCard,
  Wallet,
  Calculator,
  PieChart,
  Brain,
  FileCheck,
  Printer,
  ShoppingCart
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
  const [expandedCategories, setExpandedCategories] = useState<string[]>(["communications"]);
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

        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 h-[calc(100vh-200px)]">
          {/* Left Column - Major Categories (50% on desktop) */}
          <div className="w-full lg:w-1/2 bg-card rounded-lg border p-4 sm:p-6 overflow-y-auto">
            <h2 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6 text-foreground">
              Admin Categories
            </h2>
                
            <div className="space-y-2 sm:space-y-3">
              {/* Communications Category with Expandable Subcategories */}
              <div>
                <div 
                  className={`p-3 sm:p-4 rounded-lg cursor-pointer transition-all ${
                    selectedCategory === "communications" 
                      ? "bg-primary/10 border-primary/20 border" 
                      : "bg-muted/50 hover:bg-muted"
                  }`}
                  onClick={() => {
                    setSelectedCategory("communications");
                    setExpandedCategories(prev => 
                      prev.includes("communications") 
                        ? prev.filter(cat => cat !== "communications")
                        : [...prev, "communications"]
                    );
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                      <span className="font-medium text-sm sm:text-base">Communications</span>
                    </div>
                    <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${
                      expandedCategories.includes("communications") ? "rotate-90" : ""
                    }`} />
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1 sm:mt-2">
                    Notifications, emails, community hub, and messaging tools
                  </p>
                </div>

                {/* Communications Subcategories */}
                {expandedCategories.includes("communications") && (
                  <div className="ml-6 mt-2 space-y-2">
                    <div 
                      className="p-2 sm:p-3 rounded-lg cursor-pointer transition-all hover:bg-muted/50 border border-border/30"
                      onClick={() => setSelectedSubcategory("notifications")}
                    >
                      <div className="flex items-center gap-2">
                        <Bell className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-600" />
                        <span className="text-xs sm:text-sm font-medium">Notifications</span>
                      </div>
                    </div>
                    
                    <div 
                      className="p-2 sm:p-3 rounded-lg cursor-pointer transition-all hover:bg-muted/50 border border-border/30"
                      onClick={() => setSelectedSubcategory("email-management")}
                    >
                      <div className="flex items-center gap-2">
                        <Mail className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
                        <span className="text-xs sm:text-sm font-medium">Email Management</span>
                      </div>
                    </div>
                    
                    <div 
                      className="p-2 sm:p-3 rounded-lg cursor-pointer transition-all hover:bg-muted/50 border border-border/30"
                      onClick={() => setSelectedSubcategory("buckets-of-love")}
                    >
                      <div className="flex items-center gap-2">
                        <Heart className="h-3 w-3 sm:h-4 sm:w-4 text-pink-600" />
                        <span className="text-xs sm:text-sm font-medium">Buckets of Love</span>
                      </div>
                    </div>
                    
                    <div 
                      className="p-2 sm:p-3 rounded-lg cursor-pointer transition-all hover:bg-muted/50 border border-border/30 bg-gradient-to-r from-blue-50 to-indigo-50"
                      onClick={() => setSelectedSubcategory("glee-writing")}
                    >
                      <div className="flex items-center gap-2">
                        <Edit3 className="h-3 w-3 sm:h-4 sm:w-4 text-indigo-600" />
                        <span className="text-xs sm:text-sm font-medium">Glee Writing Widget</span>
                        <Badge variant="secondary" className="text-xs ml-1">New</Badge>
                      </div>
                    </div>
                    
                    <div 
                      className="p-2 sm:p-3 rounded-lg cursor-pointer transition-all hover:bg-muted/50 border border-border/30"
                      onClick={() => setSelectedSubcategory("internal-communications")}
                    >
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
                        <span className="text-xs sm:text-sm font-medium">Internal Communications</span>
                      </div>
                    </div>
                    
                    <div 
                      className="p-2 sm:p-3 rounded-lg cursor-pointer transition-all hover:bg-muted/50 border border-border/30"
                      onClick={() => setSelectedSubcategory("scheduling-module")}
                    >
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-cyan-600" />
                        <span className="text-xs sm:text-sm font-medium">Scheduling Module</span>
                      </div>
                    </div>
                    
                    <div 
                      className="p-2 sm:p-3 rounded-lg cursor-pointer transition-all hover:bg-muted/50 border border-border/30"
                      onClick={() => setSelectedSubcategory("calendar-management")}
                    >
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-purple-600" />
                        <span className="text-xs sm:text-sm font-medium">Calendar Management</span>
                      </div>
                    </div>
                  </div>
                )}
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

              {/* Member Management Category with Expandable Subcategories */}
              <div>
                <div 
                  className={`p-3 sm:p-4 rounded-lg cursor-pointer transition-all ${
                    selectedCategory === "member-management" 
                      ? "bg-primary/10 border-primary/20 border" 
                      : "bg-muted/50 hover:bg-muted"
                  }`}
                  onClick={() => {
                    setSelectedCategory("member-management");
                    setExpandedCategories(prev => 
                      prev.includes("member-management") 
                        ? prev.filter(cat => cat !== "member-management")
                        : [...prev, "member-management"]
                    );
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <UserCheck className="h-4 w-4 sm:h-5 sm:w-5 text-cyan-600" />
                      <span className="font-medium text-sm sm:text-base">Member Management</span>
                    </div>
                    <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${
                      expandedCategories.includes("member-management") ? "rotate-90" : ""
                    }`} />
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1 sm:mt-2">
                    User management, executive board, auditions, permissions, and statistics
                  </p>
                </div>

                {/* Member Management Subcategories */}
                {expandedCategories.includes("member-management") && (
                  <div className="ml-6 mt-2 space-y-2">
                    <div 
                      className="p-2 sm:p-3 rounded-lg cursor-pointer transition-all hover:bg-muted/50 border border-border/30"
                      onClick={() => setSelectedSubcategory("user-management")}
                    >
                      <div className="flex items-center gap-2">
                        <Users className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
                        <span className="text-xs sm:text-sm font-medium">User Management</span>
                      </div>
                    </div>
                    
                    <div 
                      className="p-2 sm:p-3 rounded-lg cursor-pointer transition-all hover:bg-muted/50 border border-border/30"
                      onClick={() => setSelectedSubcategory("executive-board")}
                    >
                      <div className="flex items-center gap-2">
                        <UserCog className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
                        <span className="text-xs sm:text-sm font-medium">Executive Board</span>
                      </div>
                    </div>
                    
                    <div 
                      className="p-2 sm:p-3 rounded-lg cursor-pointer transition-all hover:bg-muted/50 border border-border/30"
                      onClick={() => setSelectedSubcategory("auditions")}
                    >
                      <div className="flex items-center gap-2">
                        <ScanLine className="h-3 w-3 sm:h-4 sm:w-4 text-purple-600" />
                        <span className="text-xs sm:text-sm font-medium">Auditions</span>
                      </div>
                    </div>
                    
                    <div 
                      className="p-2 sm:p-3 rounded-lg cursor-pointer transition-all hover:bg-muted/50 border border-border/30"
                      onClick={() => setSelectedSubcategory("permissions")}
                    >
                      <div className="flex items-center gap-2">
                        <Shield className="h-3 w-3 sm:h-4 sm:w-4 text-red-600" />
                        <span className="text-xs sm:text-sm font-medium">Permissions</span>
                      </div>
                    </div>
                    
                    <div 
                      className="p-2 sm:p-3 rounded-lg cursor-pointer transition-all hover:bg-muted/50 border border-border/30"
                      onClick={() => setSelectedSubcategory("member-statistics")}
                    >
                      <div className="flex items-center gap-2">
                        <BarChart className="h-3 w-3 sm:h-4 sm:w-4 text-orange-600" />
                        <span className="text-xs sm:text-sm font-medium">Member Statistics</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Libraries Category */}
              <div 
                className={`p-3 sm:p-4 rounded-lg cursor-pointer transition-all ${
                  selectedCategory === "libraries" 
                    ? "bg-primary/10 border-primary/20 border" 
                    : "bg-muted/50 hover:bg-muted"
                }`}
                onClick={() => {
                  setSelectedCategory("libraries");
                  setSelectedSubcategory(null);
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600" />
                    <span className="font-medium text-sm sm:text-base">Libraries</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1 sm:mt-2">
                  PDF sheet music, MP3 audio files, and picture collections
                </p>
              </div>

              {/* Finances Category */}
              <div 
                className={`p-3 sm:p-4 rounded-lg cursor-pointer transition-all ${
                  selectedCategory === "finances" 
                    ? "bg-primary/10 border-primary/20 border" 
                    : "bg-muted/50 hover:bg-muted"
                }`}
                onClick={() => {
                  setSelectedCategory("finances");
                  setSelectedSubcategory(null);
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                    <span className="font-medium text-sm sm:text-base">Finances</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1 sm:mt-2">
                  Contracts, budgets, payments, dues collection, and financial planning
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
                  Auditions, rehearsals, and performance management
                </p>
              </div>
            </div>
          </div>

          {/* Right Column - Functions List (50% on desktop) */}
          <div className="w-full lg:w-1/2 bg-card rounded-lg border p-4 sm:p-6 overflow-y-auto">
            <h2 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6 text-foreground">
              {selectedCategory === "communications" && "Communications Hub"}
              {selectedCategory === "wardrobe" && "Wardrobe Management"}
              {selectedCategory === "member-management" && "Member Management"}
              {selectedCategory === "libraries" && "Libraries Management"}
              {selectedCategory === "finances" && "Finances Management"}
              {selectedCategory === "musical-leadership" && "Musical Leadership"}
              {!selectedCategory && "Select a category to view functions"}
            </h2>

            {/* Show current selection content or default message */}
            {selectedSubcategory ? (
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
                      selectedCategory === "member-management" ? "Member Management" :
                      selectedCategory === "libraries" ? "Libraries" :
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
            ) : (
              <>
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

                {/* Member Management - Show subcategory content or main overview */}
                {selectedCategory === "member-management" && (
                  <div className="space-y-4 sm:space-y-6">
                    {/* User Management Subcategory */}
                    {selectedSubcategory === "user-management" && (
                      <div className="space-y-4">
                        <div className="border-l-4 border-blue-500 pl-4">
                          <h3 className="text-lg font-semibold text-blue-700 mb-2">User Management</h3>
                          <p className="text-sm text-muted-foreground">
                            Manage user accounts, profiles, and member information
                          </p>
                        </div>
                        <UserManagement />
                      </div>
                    )}

                    {/* Executive Board Subcategory */}
                    {selectedSubcategory === "executive-board" && (
                      <div className="space-y-4">
                        <div className="border-l-4 border-green-500 pl-4">
                          <h3 className="text-lg font-semibold text-green-700 mb-2">Executive Board Tools</h3>
                          <p className="text-sm text-muted-foreground">
                            Board management, roles, permissions, and system administration
                          </p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                          <Card className="group hover:shadow-md transition-all cursor-pointer border-l-4 border-l-green-500">
                            <CardHeader className="pb-2 sm:pb-3">
                              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                                <ArrowUpDown className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                                Primary Tab Management
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <p className="text-xs sm:text-sm text-muted-foreground">
                                Configure default tab assignments for each executive board position
                              </p>
                            </CardContent>
                          </Card>
                          
                          <Card className="group hover:shadow-md transition-all cursor-pointer border-l-4 border-l-blue-500">
                            <CardHeader className="pb-2 sm:pb-3">
                              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                                <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                                Permissions Grid
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <p className="text-xs sm:text-sm text-muted-foreground">
                                Manage executive board member permissions and access controls
                              </p>
                            </CardContent>
                          </Card>
                          
                          <Card className="group hover:shadow-md transition-all cursor-pointer border-l-4 border-l-purple-500">
                            <CardHeader className="pb-2 sm:pb-3">
                              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                                <ClipboardList className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                                Role Assignment
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <p className="text-xs sm:text-sm text-muted-foreground">
                                Assign and manage executive board roles and responsibilities
                              </p>
                            </CardContent>
                          </Card>
                          
                          <Card className="group hover:shadow-md transition-all cursor-pointer border-l-4 border-l-orange-500">
                            <CardHeader className="pb-2 sm:pb-3">
                              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
                                Board Analytics
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <p className="text-xs sm:text-sm text-muted-foreground">
                                View executive board activity and performance metrics
                              </p>
                            </CardContent>
                          </Card>
                        </div>
                      </div>
                    )}

                    {/* Auditions Subcategory */}
                    {selectedSubcategory === "auditions" && (
                      <div className="space-y-4">
                        <div className="border-l-4 border-purple-500 pl-4">
                          <h3 className="text-lg font-semibold text-purple-700 mb-2">Auditions Management</h3>
                          <p className="text-sm text-muted-foreground">
                            Manage audition processes, applications, and evaluations
                          </p>
                        </div>
                        <AuditionsManagement />
                      </div>
                    )}

                    {/* Permissions Subcategory */}
                    {selectedSubcategory === "permissions" && (
                      <div className="space-y-4">
                        <div className="border-l-4 border-red-500 pl-4">
                          <h3 className="text-lg font-semibold text-red-700 mb-2">Permissions Management</h3>
                          <p className="text-sm text-muted-foreground">
                            Configure user permissions and access control settings
                          </p>
                        </div>
                        <PermissionManagement />
                      </div>
                    )}

                    {/* Member Statistics Subcategory */}
                    {selectedSubcategory === "member-statistics" && (
                      <div className="space-y-4">
                        <div className="border-l-4 border-orange-500 pl-4">
                          <h3 className="text-lg font-semibold text-orange-700 mb-2">Member Statistics</h3>
                          <p className="text-sm text-muted-foreground">
                            View member analytics, statistics, and performance data
                          </p>
                        </div>
                        <AdminSummaryStats users={users} loading={loading} activityLogs={activityLogs} />
                      </div>
                    )}

                    {/* Default Member Management Overview */}
                    {!selectedSubcategory && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <Card className="group hover:shadow-md transition-all cursor-pointer border-l-4 border-l-blue-500"
                              onClick={() => setSelectedSubcategory("user-management")}>
                          <CardHeader className="pb-2 sm:pb-3">
                            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                              <Users className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                              User Management
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-xs sm:text-sm text-muted-foreground">
                              Manage user accounts, profiles, and member information
                            </p>
                          </CardContent>
                        </Card>

                        <Card className="group hover:shadow-md transition-all cursor-pointer border-l-4 border-l-green-500"
                              onClick={() => setSelectedSubcategory("executive-board")}>
                          <CardHeader className="pb-2 sm:pb-3">
                            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                              <UserCog className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                              Executive Board
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-xs sm:text-sm text-muted-foreground">
                              Board management, roles, permissions, and system administration
                            </p>
                          </CardContent>
                        </Card>

                        <Card className="group hover:shadow-md transition-all cursor-pointer border-l-4 border-l-purple-500"
                              onClick={() => setSelectedSubcategory("auditions")}>
                          <CardHeader className="pb-2 sm:pb-3">
                            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                              <ScanLine className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                              Auditions
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-xs sm:text-sm text-muted-foreground">
                              Manage audition processes, applications, and evaluations
                            </p>
                          </CardContent>
                        </Card>
                        
                        <Card className="group hover:shadow-md transition-all cursor-pointer border-l-4 border-l-red-500"
                              onClick={() => setSelectedSubcategory("permissions")}>
                          <CardHeader className="pb-2 sm:pb-3">
                            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                              <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
                              Permissions
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-xs sm:text-sm text-muted-foreground">
                              Configure user permissions and access control settings
                            </p>
                          </CardContent>
                        </Card>
                        
                        <Card className="group hover:shadow-md transition-all cursor-pointer border-l-4 border-l-orange-500"
                              onClick={() => setSelectedSubcategory("member-statistics")}>
                          <CardHeader className="pb-2 sm:pb-3">
                            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                              <BarChart className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
                              Member Statistics
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-xs sm:text-sm text-muted-foreground">
                              View member analytics, statistics, and performance data
                            </p>
                          </CardContent>
                        </Card>
                      </div>
                    )}
                  </div>
                )}

                {/* Libraries Functions */}
                {selectedCategory === "libraries" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div 
                      className="p-3 sm:p-4 border rounded-lg hover:shadow-md transition-all cursor-pointer bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200"
                      onClick={() => setSelectedSubcategory("music-catalogue")}
                    >
                      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                        <Database className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                        <h3 className="font-semibold text-sm sm:text-base">Music Catalogue</h3>
                        <Badge variant="secondary" className="text-xs">Google Sheets</Badge>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Manage music titles and metadata via Google Sheets integration
                      </p>
                    </div>

                    <div 
                      className="p-3 sm:p-4 border rounded-lg hover:shadow-md transition-all cursor-pointer"
                      onClick={() => setSelectedSubcategory("pdf-library")}
                    >
                      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                        <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600" />
                        <h3 className="font-semibold text-sm sm:text-base">PDF Library</h3>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Sheet music library with PDF scores and arrangements
                      </p>
                    </div>

                    <div 
                      className="p-3 sm:p-4 border rounded-lg hover:shadow-md transition-all cursor-pointer"
                      onClick={() => setSelectedSubcategory("annotation-feature")}
                    >
                      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                        <StickyNote className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
                        <h3 className="font-semibold text-sm sm:text-base">Annotation Feature</h3>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Add notes and markings to sheet music PDFs
                      </p>
                    </div>

                    <div 
                      className="p-3 sm:p-4 border rounded-lg hover:shadow-md transition-all cursor-pointer bg-gradient-to-br from-green-50 to-emerald-50 border-green-200"
                      onClick={() => setSelectedSubcategory("music-library-module")}
                    >
                      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                        <Music className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                        <h3 className="font-semibold text-sm sm:text-base">Music Library Module</h3>
                        <Badge variant="secondary" className="text-xs">Advanced</Badge>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        PDF scanning, inventory management, and check-in/check-out system
                      </p>
                    </div>

                    <div 
                      className="p-3 sm:p-4 border rounded-lg hover:shadow-md transition-all cursor-pointer"
                      onClick={() => setSelectedSubcategory("checkin-checkout")}
                    >
                      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                        <ArrowUpDown className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600" />
                        <h3 className="font-semibold text-sm sm:text-base">Check-in/Check-out</h3>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Track music borrowing and returns for members
                      </p>
                    </div>

                    <div 
                      className="p-3 sm:p-4 border rounded-lg hover:shadow-md transition-all cursor-pointer"
                      onClick={() => setSelectedSubcategory("mp3-library")}
                    >
                      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                        <FileAudio className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                        <h3 className="font-semibold text-sm sm:text-base">MP3 Library</h3>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Audio recordings and performance tracks
                      </p>
                    </div>

                    <div 
                      className="p-3 sm:p-4 border rounded-lg hover:shadow-md transition-all cursor-pointer"
                      onClick={() => setSelectedSubcategory("picture-library")}
                    >
                      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                        <Image className="h-4 w-4 sm:h-5 sm:w-5 text-pink-600" />
                        <h3 className="font-semibold text-sm sm:text-base">Picture Library</h3>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Photo collections from PR coordinator and events
                      </p>
                    </div>

                    <div 
                      className="p-3 sm:p-4 border rounded-lg hover:shadow-md transition-all cursor-pointer"
                      onClick={() => setSelectedSubcategory("docs-collections")}
                    >
                      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                        <Edit3 className="h-4 w-4 sm:h-5 sm:w-5 text-teal-600" />
                        <h3 className="font-semibold text-sm sm:text-base">Docs Collections</h3>
                        <Badge variant="secondary" className="text-xs">Google Docs</Badge>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Document collections generated from Google Docs integration
                      </p>
                    </div>
                  </div>
                )}

                {/* Finances Functions */}
                {selectedCategory === "finances" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div 
                      className="p-3 sm:p-4 border rounded-lg hover:shadow-md transition-all cursor-pointer bg-gradient-to-br from-green-50 to-emerald-50 border-green-200"
                      onClick={() => setSelectedSubcategory("contracts-management")}
                    >
                      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                        <FileCheck className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                        <h3 className="font-semibold text-sm sm:text-base">Contracts Management</h3>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Create, manage, and track performance contracts
                      </p>
                    </div>

                    <div 
                      className="p-3 sm:p-4 border rounded-lg hover:shadow-md transition-all cursor-pointer"
                      onClick={() => setSelectedSubcategory("budgets-planning")}
                    >
                      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                        <Calculator className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                        <h3 className="font-semibold text-sm sm:text-base">Budgets & Planning</h3>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Budget creation, tracking, and financial planning with AI
                      </p>
                    </div>

                    <div 
                      className="p-3 sm:p-4 border rounded-lg hover:shadow-md transition-all cursor-pointer bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200"
                      onClick={() => setSelectedSubcategory("google-ledger")}
                    >
                      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                        <Database className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600" />
                        <h3 className="font-semibold text-sm sm:text-base">Google Ledger</h3>
                        <Badge variant="secondary" className="text-xs">Google Sheets</Badge>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Maintain financial records using Google Sheets integration
                      </p>
                    </div>

                    <div 
                      className="p-3 sm:p-4 border rounded-lg hover:shadow-md transition-all cursor-pointer"
                      onClick={() => setSelectedSubcategory("dues-collection")}
                    >
                      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                        <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                        <h3 className="font-semibold text-sm sm:text-base">Dues Collection</h3>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Manage member dues collection and payment tracking
                      </p>
                    </div>

                    <div 
                      className="p-3 sm:p-4 border rounded-lg hover:shadow-md transition-all cursor-pointer"
                      onClick={() => setSelectedSubcategory("student-payments")}
                    >
                      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                        <Wallet className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
                        <h3 className="font-semibold text-sm sm:text-base">Student Payments</h3>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Process payments to students with approval system
                      </p>
                    </div>

                    <div 
                      className="p-3 sm:p-4 border rounded-lg hover:shadow-md transition-all cursor-pointer"
                      onClick={() => setSelectedSubcategory("receipts-records")}
                    >
                      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                        <Receipt className="h-4 w-4 sm:h-5 sm:w-5 text-teal-600" />
                        <h3 className="font-semibold text-sm sm:text-base">Receipts & Records</h3>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Generate receipts, maintain records, and print documents
                      </p>
                    </div>

                    <div 
                      className="p-3 sm:p-4 border rounded-lg hover:shadow-md transition-all cursor-pointer bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200"
                      onClick={() => setSelectedSubcategory("ai-financial-planning")}
                    >
                      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                        <Brain className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                        <h3 className="font-semibold text-sm sm:text-base">AI Financial Planning</h3>
                        <Badge variant="secondary" className="text-xs">AI Helper</Badge>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        AI-powered financial planning and budget optimization
                      </p>
                    </div>

                    <div 
                      className="p-3 sm:p-4 border rounded-lg hover:shadow-md transition-all cursor-pointer"
                      onClick={() => setSelectedSubcategory("approval-system")}
                    >
                      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                        <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                        <h3 className="font-semibold text-sm sm:text-base">Approval System</h3>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        User → Rayne Stewart → Final approval workflow
                      </p>
                    </div>

                    <div 
                      className="p-3 sm:p-4 border rounded-lg hover:shadow-md transition-all cursor-pointer"
                      onClick={() => setSelectedSubcategory("monthly-statements")}
                    >
                      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                        <PieChart className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                        <h3 className="font-semibold text-sm sm:text-base">Monthly Statements</h3>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Organized monthly financial records for treasurer
                      </p>
                    </div>

                    <div 
                      className="p-3 sm:p-4 border rounded-lg hover:shadow-md transition-all cursor-pointer"
                      onClick={() => setSelectedSubcategory("check-requests")}
                    >
                      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                        <Printer className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
                        <h3 className="font-semibold text-sm sm:text-base">Check Requests</h3>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Request and track check issuance for payments
                      </p>
                    </div>

                    <div 
                      className="p-3 sm:p-4 border rounded-lg hover:shadow-md transition-all cursor-pointer bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200"
                      onClick={() => setSelectedSubcategory("merch-store-finances")}
                    >
                      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                        <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
                        <h3 className="font-semibold text-sm sm:text-base">Glee Merch Store Finances</h3>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Track merchandise sales, expenses, and store profitability
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
          </div>
        </div>
      </div>
    </div>
  );
};
