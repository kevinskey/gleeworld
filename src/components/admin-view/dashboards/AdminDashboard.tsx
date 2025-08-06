import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
  ShoppingCart,
  UserPlus,
  Shirt
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActivityLogs } from "@/hooks/useActivityLogs";

// Import existing admin components
import { EnhancedUserManagement } from "@/components/admin/user-management/EnhancedUserManagement";
import { useUsers } from "@/hooks/useUsers";
import { ContractManagement } from "@/components/admin/ContractManagement";
import { ActivityLogs } from "@/components/admin/ActivityLogs";
import { AdminSummaryStats } from "@/components/admin/AdminSummaryStats";
import { CalendarControlsAdmin } from "@/components/admin/CalendarControlsAdmin";
import { SystemSettings } from "@/components/admin/SystemSettings";
import { PermissionManagement } from "@/components/admin/PermissionManagement";
import { AuditionsManagement } from "@/components/admin/AuditionsManagement";
import { WardrobeManagementHub } from "@/components/wardrobe/WardrobeManagementHub";
import { StudentIntakeProcessor } from "@/components/admin/StudentIntakeProcessor";

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
  const [searchParams] = useSearchParams();
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || "communications");
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(searchParams.get('subcategory') || null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  
  // Use the useUsers hook for EnhancedUserManagement
  const { users, loading: usersLoading, error: usersError, refetch: refetchUsers } = useUsers();
  
  // Fetch activity logs with the hook
  const { logs: activityLogs, loading: logsLoading } = useActivityLogs(true);

  // Set loading state based on users loading
  useEffect(() => {
    setLoading(usersLoading);
  }, [usersLoading]);

  // Update URL when category/subcategory changes
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedCategory !== "communications") {
      params.set('category', selectedCategory);
    }
    if (selectedSubcategory) {
      params.set('subcategory', selectedSubcategory);
    }
    const newSearch = params.toString();
    const currentSearch = window.location.search.substring(1);
    if (newSearch !== currentSearch) {
      navigate(`/admin${newSearch ? `?${newSearch}` : ''}`, { replace: true });
    }
  }, [selectedCategory, selectedSubcategory, navigate]);

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
      icon: Shirt,
      color: "purple",
      description: "Costume management, fitting schedules, and inventory",
      subcategories: [
        { id: "wardrobe-management", title: "Wardrobe Management", icon: Shirt, color: "purple" },
        { id: "student-intake", title: "Student Intake", icon: UserPlus, color: "orange" }
      ]
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
        { id: "check-requests", title: "Reimbursements", icon: Printer, color: "red" },
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
          <span className={`font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}>{category.title}</span>
        </div>
        <p className={`text-muted-foreground mt-1 sm:mt-2 ${isMobile ? 'text-xs' : 'text-xs'}`}>
          {category.description}
        </p>
      </div>
    );
  };

  const renderRightPanelContent = () => {
    // Handle subcategory content first
    if (selectedSubcategory) {
      return (
        <div className="space-y-4">
          {/* Breadcrumb-style header showing navigation */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
            <span 
              className="cursor-pointer hover:text-foreground"
              onClick={() => setSelectedSubcategory(null)}
            >
              {categories.find(cat => cat.id === selectedCategory)?.title}
            </span>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground font-medium text-xs">
              {categories.find(cat => cat.id === selectedCategory)?.subcategories?.find(sub => sub.id === selectedSubcategory)?.title}
            </span>
          </div>
          {renderSubcategoryContent(selectedSubcategory)}
        </div>
      );
    }

    // Get the selected category
    const currentCategory = categories.find(cat => cat.id === selectedCategory);
    
    // If category has subcategories, show them first
    if (currentCategory?.subcategories) {
      return (
        <div className="space-y-4">
          {/* Header showing selected category */}
          <div className="border-l-4 border-primary pl-4">
             <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <currentCategory.icon className={`h-5 w-5 text-${currentCategory.color}-600`} />
              {currentCategory.title}
            </h2>
            <p className="text-xs text-muted-foreground">{currentCategory.description}</p>
          </div>
          
          <div className="grid gap-3 md:grid-cols-2">
            {currentCategory.subcategories.map((subcategory: any) => {
              const SubIcon = subcategory.icon;
              return (
                <div 
                  key={subcategory.id}
                  className="p-4 rounded-lg cursor-pointer transition-all hover:bg-muted/50 border border-border/50 hover:border-primary/20 hover:shadow-sm"
                  onClick={() => setSelectedSubcategory(subcategory.id)}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <SubIcon className={`h-5 w-5 text-${subcategory.color}-600`} />
                    <span className="font-medium text-sm">{subcategory.title}</span>
                    {subcategory.isNew && (
                      <Badge variant="secondary" className="text-xs">New</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
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
    const CategoryIcon = currentCategory?.icon || Settings;
    return (
      <div className="space-y-4">
        {/* Header showing selected category */}
        <div className="border-l-4 border-primary pl-4">
          <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
            <CategoryIcon className={`h-5 w-5 text-${currentCategory?.color}-600`} />
            {currentCategory?.title}
          </h2>
          <p className="text-xs text-muted-foreground">{currentCategory?.description}</p>
        </div>
        
        {(() => {
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
        })()}
      </div>
    );
  };

  const renderSubcategoryContent = (subcategory: string) => {
    switch (subcategory) {
      case "user-management":
        return <EnhancedUserManagement users={users} loading={usersLoading} error={usersError} onRefetch={refetchUsers} />;
      case "permissions":
        return <PermissionManagement />;
      case "auditions":
        return <AuditionsManagement />;
      case "wardrobe-management":
        return <WardrobeManagementHub />;
      case "student-intake":
        return <StudentIntakeProcessor />;
      case "dues-collection":
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Dues Collection
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Manage member dues collection, payment plans, and financial tracking.
              </p>
              <button 
                onClick={() => navigate('/dues-management')}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Open Dues Management System
              </button>
            </CardContent>
          </Card>
        );
      default:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="capitalize">{subcategory.replace('-', ' ')}</CardTitle>
            </CardHeader>
            <CardContent>
               <p className="text-xs text-muted-foreground">
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
            <h3 className="font-semibold text-sm">Active Features</h3>
             <ul className="space-y-1 text-xs text-muted-foreground">
              <li>• Email Management System</li>
              <li>• Push Notifications</li>
              <li>• Internal Messaging</li>
              <li>• Calendar Integration</li>
            </ul>
          </div>
          <div className="space-y-2">
             <h3 className="font-semibold text-sm">Quick Actions</h3>
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

  const renderIntakeContent = () => {
    return <StudentIntakeProcessor />;
  };

  const renderWardrobeContent = () => {
    return <WardrobeManagementHub />;
  };

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
            <h3 className="font-semibold text-sm">Member Tools</h3>
             <ul className="space-y-1 text-xs text-muted-foreground">
              <li>• User Registration & Profiles</li>
              <li>• Executive Board Management</li>
              <li>• Audition Scheduling</li>
              <li>• Permission Controls</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Statistics</h3>
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
        <p className="text-xs text-muted-foreground">Library management tools are coming soon.</p>
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
            <h3 className="font-semibold text-sm">Financial Tools</h3>
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li>• Contract Management</li>
              <li>• Budget Planning with AI</li>
              <li>• Dues Collection System</li>
              <li>• Payment Processing</li>
              <li>• Receipt Management</li>
              <li>• Merch Store Analytics</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Quick Actions</h3>
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
          <p className="text-xs text-muted-foreground px-4">
            Manage the Spelman College Glee Club platform
          </p>
        </div>

        {/* Mobile Layout */}
        <div className="block md:hidden">
          <div className="space-y-4">
            <div className="bg-card rounded-lg border p-4 overflow-y-auto">
              <h2 className="text-base font-semibold mb-4 text-foreground">
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
              {/* Left Column - Categories (40%) */}
              <div className="w-2/5 p-6 border-r border-border overflow-y-auto">
                <h2 className="text-lg font-semibold mb-6 text-foreground">
                  Admin Categories
                </h2>
                <div className="space-y-3">
                  {categories.map(category => renderCategoryButton(category, false))}
                </div>
              </div>

              {/* Right Column - Content (60%) */}
              <div className="w-3/5 p-6 overflow-y-auto">
                {renderRightPanelContent()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
