import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUsernamePermissionsAdmin } from "@/hooks/useUsernamePermissions";
import { 
  Shield, 
  Search, 
  Users, 
  Settings,
  Star,
  Youtube,
  Bell,
  Mail,
  Route,
  Camera,
  BookIcon,
  Heart,
  Crown,
  Wrench,
  BarChart3,
  Megaphone,
  Music,
  DollarSign,
  Calendar,
  User,
  Plane,
  CreditCard,
  Mic,
  ShoppingBag,
  Download,
  Volume2,
  CheckCircle,
  Plus,
  MessageSquare,
  Award,
  MapPin,
  ShieldCheck
} from 'lucide-react';

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  exec_board_role?: string;
  is_admin: boolean;
  is_super_admin: boolean;
  is_exec_board: boolean;
}

interface DashboardFunction {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: any;
  route: string;
  permission_level: 'member' | 'executive' | 'admin' | 'super_admin';
}

const functionCategories = {
  'Executive Board Services': {
    icon: Crown,
    color: 'text-amber-600',
    functions: [
      { id: 'president_services', name: 'President Services', description: 'Leadership guidance & strategic planning', route: '/executive-services/president', permission_level: 'executive' },
      { id: 'chaplain_services', name: 'Chaplain Services', description: 'Spiritual care & wellness support', route: '/executive-services/chaplain', permission_level: 'executive' },
      { id: 'student_conductor_services', name: 'Student Conductor Services', description: 'Musical leadership & rehearsal management', route: '/executive-services/student-conductor', permission_level: 'executive' },
      { id: 'treasurer_services', name: 'Treasurer Services', description: 'Financial management & reporting', route: '/executive-services/treasurer', permission_level: 'executive' },
      { id: 'tour_manager_services', name: 'Tour Manager Services', description: 'Travel coordination & logistics', route: '/executive-services/tour-manager', permission_level: 'executive' },
      { id: 'pr_coordinator_services', name: 'PR Coordinator Services', description: 'Social media & event promotion', route: '/executive-services/pr-coordinator', permission_level: 'executive' },
      { id: 'librarian_services', name: 'Librarian Services', description: 'Music library & resource management', route: '/executive-services/librarian', permission_level: 'executive' },
      { id: 'setup_crew_manager_services', name: 'Setup Crew Manager Services', description: 'Event logistics & equipment management', route: '/executive-services/setup-crew-manager', permission_level: 'executive' }
    ]
  },
  'Member Management & Administration': {
    icon: Users,
    color: 'text-blue-600',
    functions: [
      { id: 'user_management', name: 'User Management', description: 'Manage member roles & permissions', route: '/user-management', permission_level: 'admin' },
      { id: 'executive_board', name: 'Executive Board Management', description: 'Manage executive positions', route: '/executive-board', permission_level: 'admin' },
      { id: 'member_directory', name: 'Member Directory', description: 'View all members', route: '/member-directory', permission_level: 'member' },
      { id: 'activity_logs', name: 'Activity Logs', description: 'Track member activities', route: '/activity-logs', permission_level: 'admin' },
      { id: 'bulk_assignment', name: 'Bulk Assignment', description: 'Assign roles in bulk', route: '/bulk-assignment', permission_level: 'super_admin' }
    ]
  },
  'Financial Systems': {
    icon: CreditCard,
    color: 'text-emerald-600',
    functions: [
      { id: 'budget_management', name: 'Budget Management', description: 'Plan and track budgets', route: '/budgets', permission_level: 'executive' },
      { id: 'accounting', name: 'Accounting', description: 'Financial records & contracts', route: '/accounting', permission_level: 'admin' },
      { id: 'payment_tracking', name: 'Payment Tracking', description: 'Track payments & dues', route: '/dues-management', permission_level: 'executive' },
      { id: 'w9_forms', name: 'W9 Forms', description: 'Tax form management', route: '/w9-form', permission_level: 'member' },
      { id: 'treasurer_tools', name: 'Treasurer Tools', description: 'Financial management', route: '/treasurer', permission_level: 'executive' }
    ]
  },
  'Performance & Music Management': {
    icon: Mic,
    color: 'text-purple-600',
    functions: [
      { id: 'music_library', name: 'Music Library', description: 'Sheet music & songs', route: '/music-library', permission_level: 'member' },
      { id: 'music_studio', name: 'Music Studio', description: 'Recording & practice space', route: '/music-studio', permission_level: 'member' },
      { id: 'performance_scoring', name: 'Performance Scoring', description: 'Score auditions & performances', route: '/mobile-scoring', permission_level: 'executive' },
      { id: 'download_center', name: 'Download Center', description: 'Get your music files', route: '/downloads', permission_level: 'member' },
      { id: 'audio_archive', name: 'Audio Archive', description: 'Historical recordings', route: '/audio-archive', permission_level: 'member' }
    ]
  },
  'Event Planning & Calendar': {
    icon: Calendar,
    color: 'text-green-600',
    functions: [
      { id: 'calendar', name: 'Calendar', description: 'View all events', route: '/calendar', permission_level: 'member' },
      { id: 'event_planner', name: 'Event Planner', description: 'Plan and budget events', route: '/event-planner', permission_level: 'executive' },
      { id: 'attendance', name: 'Attendance', description: 'Track participation', route: '/attendance', permission_level: 'executive' },
      { id: 'performance_planning', name: 'Performance Planning', description: 'Plan concerts & shows', route: '/performance', permission_level: 'executive' },
      { id: 'event_documentation', name: 'Event Documentation', description: 'Track event details', route: '/event-documentation', permission_level: 'executive' }
    ]
  },
  'Tour Management': {
    icon: Plane,
    color: 'text-indigo-600',
    functions: [
      { id: 'tour_planner', name: 'Tour Planner', description: 'Plan and manage tours', route: '/tour-planner', permission_level: 'executive' },
      { id: 'tour_manager', name: 'Tour Manager', description: 'Manage tour logistics', route: '/tour-manager', permission_level: 'executive' },
      { id: 'contract_management', name: 'Contract Management', description: 'Handle tour contracts', route: '/contract-signing', permission_level: 'executive' },
      { id: 'wardrobe_management', name: 'Wardrobe Management', description: 'Manage tour wardrobe', route: '/wardrobe-management', permission_level: 'executive' },
      { id: 'appointments', name: 'Appointments', description: 'Schedule appointments', route: '/appointments', permission_level: 'member' }
    ]
  },
  'Communication & Outreach': {
    icon: Megaphone,
    color: 'text-orange-600',
    functions: [
      { id: 'mass_communications', name: 'Mass Communications', description: 'Send group messages', route: '/notifications/send', permission_level: 'executive' },
      { id: 'pr_media_hub', name: 'PR & Media Hub', description: 'Manage publicity', route: '/dashboard/pr-hub', permission_level: 'executive' },
      { id: 'newsletter_management', name: 'Newsletter Management', description: 'Create newsletters', route: '/newsletter', permission_level: 'executive' },
      { id: 'announcements', name: 'Announcements', description: 'Read updates', route: '/announcements', permission_level: 'member' },
      { id: 'sms_center', name: 'SMS Center', description: 'Text messaging', route: '/sms-center', permission_level: 'admin' }
    ]
  },
  'Administrative Functions': {
    icon: Settings,
    color: 'text-gray-600',
    functions: [
      { id: 'dashboard_settings', name: 'Dashboard Settings', description: 'Configure dashboard', route: '/dashboard-settings', permission_level: 'admin' },
      { id: 'hero_management', name: 'Hero Management', description: 'Manage hero content', route: '/hero-management', permission_level: 'admin' },
      { id: 'youtube_management', name: 'YouTube Management', description: 'Manage video content', route: '/youtube-management', permission_level: 'admin' },
      { id: 'spotlight_management', name: 'Spotlight Management', description: 'Feature highlights', route: '/spotlight-management', permission_level: 'admin' },
      { id: 'permissions_management', name: 'Permissions Management', description: 'Manage user permissions', route: '/permissions-panel', permission_level: 'admin' }
    ]
  }
};

export const PermissionsPanel = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [userPermissions, setUserPermissions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  
  const { toast } = useToast();
  const { grantPermission, revokePermission } = useUsernamePermissionsAdmin();

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data, error } = await supabase
          .from('gw_profiles')
          .select('id, user_id, email, full_name, role, exec_board_role, is_admin, is_super_admin, is_exec_board')
          .order('full_name', { ascending: true });

        if (error) throw error;
        setUsers(data || []);
      } catch (err: any) {
        console.error('Error fetching users:', err);
        toast({
          title: "Error",
          description: "Failed to fetch users",
          variant: "destructive",
        });
      }
    };

    fetchUsers();
  }, [toast]);

  // Fetch user permissions when user is selected
  useEffect(() => {
    const fetchUserPermissions = async () => {
      if (!selectedUser) {
        setUserPermissions(new Set());
        return;
      }

      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('username_permissions')
          .select('module_name')
          .eq('user_email', selectedUser.email)
          .eq('is_active', true);

        if (error) throw error;
        
        const permissions = new Set(data?.map(p => p.module_name) || []);
        setUserPermissions(permissions);
      } catch (err: any) {
        console.error('Error fetching user permissions:', err);
        toast({
          title: "Error",
          description: "Failed to fetch user permissions",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUserPermissions();
  }, [selectedUser, toast]);

  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.full_name && user.full_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handlePermissionToggle = async (functionId: string, isChecked: boolean) => {
    if (!selectedUser) return;

    try {
      if (isChecked) {
        await grantPermission(selectedUser.email, functionId);
        setUserPermissions(prev => new Set([...prev, functionId]));
      } else {
        await revokePermission(selectedUser.email, functionId);
        setUserPermissions(prev => {
          const newSet = new Set(prev);
          newSet.delete(functionId);
          return newSet;
        });
      }
    } catch (error) {
      console.error('Error toggling permission:', error);
    }
  };

  const getFunctionIcon = (category: string) => {
    return functionCategories[category as keyof typeof functionCategories]?.icon || Settings;
  };

  const getUserRoleBadgeColor = (user: UserProfile) => {
    if (user.is_super_admin) return 'bg-red-100 text-red-800';
    if (user.is_admin) return 'bg-purple-100 text-purple-800';
    if (user.is_exec_board) return 'bg-amber-100 text-amber-800';
    return 'bg-blue-100 text-blue-800';
  };

  return (
    <div className="h-full">
      <div className="mb-6">
        <h2 className="text-3xl font-bold tracking-tight">Permissions Control Panel</h2>
        <p className="text-muted-foreground">
          Manage dashboard module access for individual users. Select a user and toggle their access to specific functions.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
        {/* User List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Users
            </CardTitle>
            <CardDescription>
              Select a user to manage their permissions
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <ScrollArea className="h-[500px]">
              <div className="p-2">
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className={`p-3 rounded-lg cursor-pointer mb-2 transition-colors ${
                      selectedUser?.id === user.id 
                        ? 'bg-primary/10 border border-primary/20' 
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => {
                      console.log('PermissionsPanel: User clicked:', user.email, user.full_name);
                      setSelectedUser(user);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {user.full_name || user.email}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {user.email}
                        </p>
                        {user.exec_board_role && (
                          <p className="text-xs text-amber-600 font-medium">
                            {user.exec_board_role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </p>
                        )}
                      </div>
                      <Badge className={getUserRoleBadgeColor(user)}>
                        {user.is_super_admin ? 'Super Admin' : 
                         user.is_admin ? 'Admin' : 
                         user.is_exec_board ? 'Executive' : 
                         user.role}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Functions Panel */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Dashboard Functions
              {selectedUser && (
                <Badge variant="outline" className="ml-2">
                  {selectedUser.full_name || selectedUser.email}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {selectedUser 
                ? `Toggle function access for ${selectedUser.full_name || selectedUser.email}`
                : 'Select a user to manage their function access'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedUser ? (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <div className="text-center">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select a user from the list to manage their permissions</p>
                </div>
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <ScrollArea className="h-[500px]">
                <div className="space-y-6">
                  {Object.entries(functionCategories).map(([categoryName, category]) => {
                    const CategoryIcon = category.icon;
                    
                    return (
                      <div key={categoryName} className="border rounded-lg p-4">
                        <div className="flex items-center gap-3 mb-4">
                          <CategoryIcon className={`h-5 w-5 ${category.color}`} />
                          <h3 className="font-semibold">{categoryName}</h3>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {category.functions.map((func) => {
                            const isChecked = userPermissions.has(func.id);
                            const FunctionIcon = getFunctionIcon(categoryName);
                            
                            return (
                              <div 
                                key={func.id}
                                className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50"
                              >
                                <Checkbox
                                  id={func.id}
                                  checked={isChecked}
                                  onCheckedChange={(checked) => 
                                    handlePermissionToggle(func.id, checked === true)
                                  }
                                  className="mt-1"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <FunctionIcon className="h-4 w-4" />
                                    <Label 
                                      htmlFor={func.id}
                                      className="font-medium cursor-pointer"
                                    >
                                      {func.name}
                                    </Label>
                                  </div>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {func.description}
                                  </p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge 
                                      variant="outline" 
                                      className="text-xs"
                                    >
                                      {func.permission_level.replace('_', ' ')}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                      {func.route}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};