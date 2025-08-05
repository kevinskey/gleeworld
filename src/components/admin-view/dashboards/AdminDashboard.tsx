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

  // Category definitions
  const categories = [
    {
      id: "communications",
      title: "Communications",
      icon: MessageSquare,
      color: "blue",
      description: "Notifications, emails, community hub, and messaging tools",
      subcategories: [
        { id: "notifications", title: "Notifications", icon: Bell, color: "yellow" },
        { id: "email-management", title: "Email Management", icon: Mail, color: "blue" },
        { id: "buckets-of-love", title: "Buckets of Love", icon: Heart, color: "pink" },
        { id: "glee-writing", title: "Glee Writing Widget", icon: Edit3, color: "indigo", isNew: true },
        { id: "internal-communications", title: "Internal Communications", icon: MessageSquare, color: "green" },
        { id: "scheduling-module", title: "Scheduling Module", icon: Clock, color: "cyan" },
        { id: "calendar-management", title: "Calendar Management", icon: Calendar, color: "purple" }
      ]
    },
    {
      id: "wardrobe",
      title: "Wardrobe",
      icon: Users,
      color: "purple",
      description: "Costume management, fitting schedules, and inventory"
    },
    {
      id: "member-management",
      title: "Member Management",
      icon: UserCheck,
      color: "cyan",
      description: "User management, executive board, auditions, permissions, and statistics",
      subcategories: [
        { id: "user-management", title: "User Management", icon: Users, color: "blue" },
        { id: "executive-board", title: "Executive Board", icon: UserCog, color: "green" },
        { id: "auditions", title: "Auditions", icon: ScanLine, color: "purple" },
        { id: "permissions", title: "Permissions", icon: Shield, color: "red" },
        { id: "member-statistics", title: "Member Statistics", icon: BarChart, color: "orange" }
      ]
    },
    {
      id: "libraries",
      title: "Libraries",
      icon: BookOpen,
      color: "emerald",
      description: "PDF sheet music, MP3 audio files, and picture collections"
    },
    {
      id: "finances",
      title: "Finances",
      icon: DollarSign,
      color: "green",
      description: "Financial management, budgets, dues, and glee merch store",
      subcategories: [
        { id: "contracts", title: "Contracts Management", icon: FileCheck, color: "blue" },
        { id: "budgets", title: "Budgets & Planning", icon: Calculator, color: "green" },
        { id: "google-ledger", title: "Google Ledger", icon: Database, color: "orange" },
        { id: "dues-collection", title: "Dues Collection", icon: CreditCard, color: "purple" },
        { id: "student-payments", title: "Student Payments", icon: Wallet, color: "cyan" },
        { id: "receipts-records", title: "Receipts & Records", icon: Receipt, color: "indigo" },
        { id: "ai-financial", title: "AI Financial Planning", icon: Brain, color: "pink" },
        { id: "approval-system", title: "Approval System", icon: CheckCircle, color: "emerald" },
        { id: "monthly-statements", title: "Monthly Statements", icon: FileText, color: "gray" },
        { id: "check-requests", title: "Check Requests", icon: Printer, color: "red" },
        { id: "merch-store", title: "Glee Merch Store", icon: ShoppingCart, color: "yellow" }
      ]
    },
    {
      id: "system",
      title: "System",
      icon: Settings,
      color: "gray",
      description: "Platform settings, logs, and administrative tools"
    }
  ];

  const renderCategoryButton = (category: any, isMobile = false) => {
    const IconComponent = category.icon;
    const isSelected = selectedCategory === category.id;
    
    return (
      <div 
        key={category.id}
        className={`p-3 ${isMobile ? 'sm:p-4' : 'md:p-4'} rounded-lg cursor-pointer transition-all ${
          isSelected 
            ? "bg-primary/10 border-primary/20 border" 
            : "bg-muted/50 hover:bg-muted"
        }`}
        onClick={() => {
          setSelectedCategory(category.id);
          setSelectedSubcategory(null); // Reset subcategory when switching categories
        }}
      >
        <div className="flex items-center gap-2 sm:gap-3">
          <IconComponent className={`h-4 w-4 ${isMobile ? 'sm:h-5 sm:w-5' : 'md:h-5 md:w-5'} text-${category.color}-600`} />
          <span className={`font-medium ${isMobile ? 'text-sm sm:text-base' : 'text-base'}`}>{category.title}</span>
        </div>
        <p className={`text-muted-foreground mt-1 sm:mt-2 ${isMobile ? 'text-xs sm:text-sm' : 'text-sm'}`}>
          {category.description}
        </p>
      </div>
    );
  };

  const renderRightPanelContent = () => {
    // Handle subcategory content first
    if (selectedSubcategory) {
      return renderSubcategoryContent(selectedSubcategory);
    }

    // Get the selected category
    const currentCategory = categories.find(cat => cat.id === selectedCategory);
    
    // If category has subcategories, show them first
    if (currentCategory?.subcategories) {
      return (
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <currentCategory.icon className="h-5 w-5" />
              {currentCategory.title}
            </h2>
            <p className="text-muted-foreground mb-6">{currentCategory.description}</p>
          </div>
          
          <div className="grid gap-3 md:grid-cols-2">
            {currentCategory.subcategories.map((subcategory: any) => {
              const SubIcon = subcategory.icon;
              return (
                <div 
                  key={subcategory.id}
                  className="p-4 rounded-lg cursor-pointer transition-all hover:bg-muted/50 border border-border/50 hover:border-primary/20"
                  onClick={() => setSelectedSubcategory(subcategory.id)}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <SubIcon className={`h-5 w-5 text-${subcategory.color}-600`} />
                    <span className="font-medium">{subcategory.title}</span>
                    {subcategory.isNew && (
                      <Badge variant="secondary" className="text-xs">New</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Manage {subcategory.title.toLowerCase()}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    // Handle main category content when no subcategories
    switch (selectedCategory) {
      case "wardrobe":
        return renderWardrobeContent();
      case "libraries":
        return renderLibrariesContent();
      case "system":
        return renderSystemContent();
      default:
        return renderOverviewContent();
    }
  };

  const renderSubcategoryContent = (subcategory: string) => {
    switch (subcategory) {
      case "user-management":
        return <UserManagement />;
      case "permissions":
        return <PermissionManagement />;
      case "auditions":
        return <AuditionsManagement />;
      default:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="capitalize">{subcategory.replace('-', ' ')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                This {subcategory.replace('-', ' ')} module is coming soon.
              </p>
            </CardContent>
          </Card>
        );
    }
  };

  const renderCommunicationsContent = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Communications Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <h3 className="font-semibold">Active Features</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>• Email Management System</li>
              <li>• Push Notifications</li>
              <li>• Internal Messaging</li>
              <li>• Calendar Integration</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold">Quick Actions</h3>
            <div className="space-y-2">
              <button className="w-full text-left p-2 rounded bg-muted/50 hover:bg-muted">
                Send Announcement
              </button>
              <button className="w-full text-left p-2 rounded bg-muted/50 hover:bg-muted">
                Schedule Email
              </button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderWardrobeContent = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Wardrobe Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">Wardrobe management tools are coming soon.</p>
      </CardContent>
    </Card>
  );

  const renderMemberManagementContent = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCheck className="h-5 w-5" />
          Member Management Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <h3 className="font-semibold">Member Tools</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>• User Registration & Profiles</li>
              <li>• Executive Board Management</li>
              <li>• Audition Scheduling</li>
              <li>• Permission Controls</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold">Statistics</h3>
            <div className="space-y-1 text-sm">
              <div>Total Members: {users.length}</div>
              <div>Active Today: 12</div>
              <div>Pending Auditions: 5</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderLibrariesContent = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Libraries Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">Library management tools are coming soon.</p>
      </CardContent>
    </Card>
  );

  const renderFinancesContent = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Financial Management Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <h3 className="font-semibold">Financial Tools</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>• Contract Management</li>
              <li>• Budget Planning with AI</li>
              <li>• Dues Collection System</li>
              <li>• Payment Processing</li>
              <li>• Receipt Management</li>
              <li>• Merch Store Analytics</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold">Quick Actions</h3>
            <div className="space-y-2">
              <button className="w-full text-left p-2 rounded bg-muted/50 hover:bg-muted">
                Create Budget Request
              </button>
              <button className="w-full text-left p-2 rounded bg-muted/50 hover:bg-muted">
                Process Payment
              </button>
              <button className="w-full text-left p-2 rounded bg-muted/50 hover:bg-muted">
                Generate Report
              </button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderSystemContent = () => (
    <div className="space-y-6">
      <AdminSummaryStats users={users} activityLogs={activityLogs} loading={loading || logsLoading} />
      <SystemSettings />
      <ActivityLogs />
    </div>
  );

  const renderOverviewContent = () => (
    <AdminSummaryStats users={users} activityLogs={activityLogs} loading={loading || logsLoading} />
  );

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

        {/* Mobile Layout */}
        <div className="block md:hidden">
          <div className="space-y-4">
            <div className="bg-card rounded-lg border p-4 overflow-y-auto">
              <h2 className="text-lg font-semibold mb-4 text-foreground">
                Admin Categories
              </h2>
              <div className="space-y-2 sm:space-y-3">
                {categories.map(category => renderCategoryButton(category, true))}
              </div>
            </div>
            
            <div className="bg-card rounded-lg border p-4 overflow-y-auto">
              {renderRightPanelContent()}
            </div>
          </div>
        </div>

        {/* Tablet and Desktop Layout - Two Columns in One Card */}
        <div className="hidden md:block">
          <div className="bg-card rounded-lg border h-[calc(100vh-200px)]">
            <div className="flex h-full">
              {/* Left Column - Categories */}
              <div className="w-1/2 p-6 border-r border-border overflow-y-auto">
                <h2 className="text-xl font-semibold mb-6 text-foreground">
                  Admin Categories
                </h2>
                <div className="space-y-3">
                  {categories.map(category => renderCategoryButton(category, false))}
                </div>
              </div>

              {/* Right Column - Content */}
              <div className="w-1/2 p-6 overflow-y-auto">
                {renderRightPanelContent()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
