import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Search, 
  UserCog, 
  Shield, 
  Crown, 
  User,
  UserCheck,
  UserX,
  Mail,
  Calendar,
  MoreHorizontal,
  Plus,
  RefreshCw,
  UserPlus,
  Users,
  Settings,
  KeyRound,
  Trash2,
  BookOpen,
  Boxes,
  Star,
  GraduationCap
} from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { UserRoleEditor } from './UserRoleEditor';
import { BulkExecBoardActions } from './user-management/BulkExecBoardActions';
import { DeleteUserDialog } from './DeleteUserDialog';
import { ResetPasswordDialog } from './ResetPasswordDialog';
import { PasswordResetTool } from './PasswordResetTool';
import { UserPermissionManagement } from './UserPermissionManagement';
import { UserModuleAssignment } from './UserModuleAssignment';
import { RoleBasedModuleAssignment } from './RoleBasedModuleAssignment';
import { UsernamePermissionsManager } from './UsernamePermissionsManager';
import { PermissionErrorBoundary } from './PermissionErrorBoundary';
import { useAutoEnrollUser } from '@/hooks/useAutoEnrollUser';
import { useUsernamePermissionsAdmin } from '@/hooks/useUsernamePermissions';
import { usePermissionGroups } from '@/hooks/usePermissionGroups';
import type { User as AdminUser } from '@/hooks/useUsers';

interface UserProfile {
  id: string; // profile row id
  user_id?: string; // auth user id
  email: string | null;
  full_name: string | null;
  role: string;
  exec_board_role?: string | null;
  is_exec_board?: boolean;
  is_admin?: boolean;
  is_super_admin?: boolean;
  verified?: boolean;
  avatar_url?: string | null;
  created_at: string;
  last_sign_in_at?: string;
}

// Permission Groups Overview Component
const PermissionOverview = () => {
  const { groups, loading } = usePermissionGroups();

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const stats = {
    totalGroups: groups.length,
    defaultGroups: groups.filter(g => g.is_default).length,
    customGroups: groups.filter(g => !g.is_default).length,
    activeGroups: groups.filter(g => g.is_active).length,
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Groups</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalGroups}</div>
            <p className="text-xs text-muted-foreground">
              Permission groups configured
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Default Groups</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.defaultGroups}</div>
            <p className="text-xs text-muted-foreground">
              System-provided groups
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Custom Groups</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.customGroups}</div>
            <p className="text-xs text-muted-foreground">
              User-created groups
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Groups</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeGroups}</div>
            <p className="text-xs text-muted-foreground">
              Currently available
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Permission Groups Overview</CardTitle>
          <CardDescription>
            Quick overview of all configured permission groups
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {groups.map(group => (
              <Badge
                key={group.id}
                variant={group.is_default ? "default" : "secondary"}
                className="flex items-center gap-2"
                style={{
                  backgroundColor: `${group.color}20`,
                  borderColor: group.color,
                  color: group.color
                }}
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: group.color }}
                />
                {group.name}
                {group.is_default && (
                  <span className="text-xs opacity-70">(Default)</span>
                )}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export const UnifiedUserManagement = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('');
  const { toast } = useToast();
  const { autoEnrollUser, enrolling } = useAutoEnrollUser();
  const { grantPermission } = useUsernamePermissionsAdmin();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      const { data: profiles, error: profilesError } = await supabase
        .from('gw_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      setUsers(profiles || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to load users. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchTerm || 
      (user.full_name && user.full_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
      case 'super-admin': return 'bg-red-500/20 text-red-600';
      case 'admin': return 'bg-purple-500/20 text-purple-600';
      case 'executive': return 'bg-blue-500/20 text-blue-600';
      case 'member': return 'bg-green-500/20 text-green-600';
      case 'alumna': return 'bg-gold-500/20 text-gold-600';
      case 'fan': return 'bg-gray-500/20 text-gray-600';
      case 'student': return 'bg-blue-500/20 text-blue-600';
      case 'auditioner': return 'bg-yellow-500/20 text-yellow-600';
      default: return 'bg-gray-500/20 text-gray-600';
    }
  };

  const getRoleIcon = (role?: string) => {
    switch (role) {
      case 'super-admin': return <Crown className="h-4 w-4" />;
      case 'admin': return <Shield className="h-4 w-4" />;
      case 'executive': return <UserCog className="h-4 w-4" />;
      case 'member': return <User className="h-4 w-4" />;
      case 'alumna': return <UserCheck className="h-4 w-4" />;
      case 'fan': return <UserX className="h-4 w-4" />;
      case 'student': return <User className="h-4 w-4" />;
      case 'auditioner': return <Calendar className="h-4 w-4" />;
      default: return <User className="h-4 w-4" />;
    }
  };

  const handleAutoEnroll = async () => {
    if (!email || !role) return;
    
    try {
      const result = await autoEnrollUser(email, fullName || undefined, undefined, role);
      
      if (result.success && result.enrolled) {
        setEmail('');
        setFullName('');
        setRole('');
        await fetchUsers();
      }
    } catch (error) {
      console.error('Auto-enroll error:', error);
    }
  };

  const handleQuickRoleChange = async (userId: string, newRole: string) => {
    try {
      const { data, error, count } = await supabase
        .from('gw_profiles')
        .update({ role: newRole })
        .eq('user_id', userId)
        .select();

      if (error) throw error;

      // Check if the update actually affected any rows
      if (!data || data.length === 0) {
        throw new Error('Update failed - you may not have permission to change this user\'s role');
      }

      setUsers(users.map(user => 
        user.user_id === userId ? { ...user, role: newRole } : user
      ));

      toast({
        title: "Role Updated",
        description: `User role changed to ${newRole}`,
      });
    } catch (error: any) {
      console.error('Error updating role:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update user role",
        variant: "destructive",
      });
    }
  };

  const handleVerificationToggle = async (userId: string, currentStatus: boolean) => {
    try {
      const newStatus = !currentStatus;
      const { error } = await supabase
        .from('gw_profiles')
        .update({ verified: newStatus })
        .eq('user_id', userId);

      if (error) throw error;

      setUsers(users.map(user => 
        user.user_id === userId ? { ...user, verified: newStatus } : user
      ));

      toast({
        title: "Status Updated",
        description: `User ${newStatus ? 'verified' : 'unverified'}`,
      });
    } catch (error) {
      console.error('Error updating verification:', error);
      toast({
        title: "Error",
        description: "Failed to update verification status",
        variant: "destructive",
      });
    }
  };

  const userStats = {
    total: users.length,
    admins: users.filter(u => u.role === 'admin' || u.role === 'super-admin').length,
    members: users.filter(u => u.role === 'member').length,
    executives: users.filter(u => u.role === 'executive' || u.is_exec_board).length,
    vips: users.filter(u => u.role === 'vip').length,
    alumnae: users.filter(u => u.role === 'alumna').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" text="Loading users..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">User & Permission Management</h1>
        <p className="text-muted-foreground">
          Unified management for users, roles, and permissions across the Glee Club platform
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1">
          <TabsTrigger value="overview" className="text-xs sm:text-sm px-2 sm:px-3">Overview</TabsTrigger>
          <TabsTrigger value="users" className="text-xs sm:text-sm px-2 sm:px-3">Users</TabsTrigger>
          <TabsTrigger value="enroll" className="text-xs sm:text-sm px-2 sm:px-3">Add User</TabsTrigger>
          <TabsTrigger value="permissions" className="text-xs sm:text-sm px-2 sm:px-3 pb-2">Permissions</TabsTrigger>
          <TabsTrigger value="modules" className="text-xs sm:text-sm px-2 sm:px-3">Modules</TabsTrigger>
          <TabsTrigger value="username" className="text-xs sm:text-sm px-2 sm:px-3">Username</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{userStats.total}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Admins</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{userStats.admins}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Members</CardTitle>
                <User className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{userStats.members}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">VIP Members</CardTitle>
                <Star className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{userStats.vips}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Alumnae</CardTitle>
                <GraduationCap className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{userStats.alumnae}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Executive Board</CardTitle>
                <Settings className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{userStats.executives}</div>
              </CardContent>
            </Card>
          </div>

          <PermissionOverview />
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <BulkExecBoardActions onActionComplete={fetchUsers} />

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    User Directory
                  </CardTitle>
                  <CardDescription>
                    Manage all registered users, their roles, and permissions
                  </CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={fetchUsers}
                  disabled={loading}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="guest">Guest</SelectItem>
                    <SelectItem value="fan">Fan</SelectItem>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="alumna">Alumna</SelectItem>
                    <SelectItem value="vip">VIP</SelectItem>
                    <SelectItem value="executive">Executive</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="super-admin">Super Admin</SelectItem>
                    <SelectItem value="auditioner">Auditioner</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Executive Board</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <div className="font-medium">
                              {user.full_name || 'No name set'}
                            </div>
                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getRoleBadgeColor(user.role)}>
                          <div className="flex items-center gap-1">
                            {getRoleIcon(user.role)}
                            {user.role || 'No role'}
                          </div>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.is_exec_board ? (
                          <Badge variant="outline" className="text-blue-600 border-blue-200">
                            {user.exec_board_role || 'Executive'}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.verified ? "default" : "secondary"}>
                          {user.verified ? 'Verified' : 'Unverified'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {user.created_at 
                            ? new Date(user.created_at).toLocaleDateString()
                            : 'Unknown'
                          }
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent 
                            align="end" 
                            className="w-56 max-h-[400px] overflow-y-auto z-50 bg-popover"
                            sideOffset={5}
                          >
                            <DropdownMenuLabel>Account Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            
                            <DropdownMenuItem 
                              onClick={() => {
                                setSelectedUser({
                                  id: user.user_id,
                                  email: user.email,
                                  full_name: user.full_name,
                                  role: user.role,
                                  created_at: user.created_at,
                                  exec_board_role: user.exec_board_role ?? null,
                                  is_exec_board: !!user.is_exec_board,
                                  avatar_url: user.avatar_url ?? null,
                                  verified: !!user.verified,
                                  is_admin: !!user.is_admin,
                                  is_super_admin: !!user.is_super_admin,
                                });
                                setShowResetDialog(true);
                              }}
                            >
                              <KeyRound className="h-4 w-4 mr-2 text-blue-500" />
                              Reset Password
                            </DropdownMenuItem>
                            
                            <DropdownMenuItem 
                              onClick={() => handleVerificationToggle(user.user_id!, user.verified || false)}
                            >
                              {user.verified ? (
                                <>
                                  <UserX className="h-4 w-4 mr-2 text-yellow-500" />
                                  Mark Unverified
                                </>
                              ) : (
                                <>
                                  <UserCheck className="h-4 w-4 mr-2 text-green-500" />
                                  Mark Verified
                                </>
                              )}
                            </DropdownMenuItem>
                            
                            <DropdownMenuItem 
                              onClick={() => {
                                setSelectedUser({
                                  id: user.user_id!,
                                  email: user.email,
                                  full_name: user.full_name,
                                  role: user.role,
                                  created_at: user.created_at,
                                  exec_board_role: user.exec_board_role ?? null,
                                  is_exec_board: !!user.is_exec_board,
                                  avatar_url: user.avatar_url ?? null,
                                  verified: !!user.verified,
                                  is_admin: !!user.is_admin,
                                  is_super_admin: !!user.is_super_admin,
                                });
                                setDeleteDialogOpen(true);
                              }}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete User
                            </DropdownMenuItem>
                            
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel>Change Role</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            
                            <DropdownMenuItem 
                              onClick={() => handleQuickRoleChange(user.user_id!, 'vip')}
                              disabled={user.role === 'vip'}
                            >
                              <Star className="h-4 w-4 mr-2 text-yellow-500" />
                              Make VIP
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleQuickRoleChange(user.user_id!, 'guest')}
                              disabled={user.role === 'guest'}
                            >
                              <User className="h-4 w-4 mr-2" />
                              Make Guest
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleQuickRoleChange(user.user_id!, 'fan')}
                              disabled={user.role === 'fan'}
                            >
                              <UserX className="h-4 w-4 mr-2" />
                              Make Fan
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleQuickRoleChange(user.user_id!, 'student')}
                              disabled={user.role === 'student'}
                            >
                              <User className="h-4 w-4 mr-2" />
                              Make Student
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleQuickRoleChange(user.user_id!, 'member')}
                              disabled={user.role === 'member'}
                            >
                              <User className="h-4 w-4 mr-2" />
                              Make Member
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleQuickRoleChange(user.user_id!, 'alumna')}
                              disabled={user.role === 'alumna'}
                            >
                              <UserCheck className="h-4 w-4 mr-2" />
                              Make Alumna
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleQuickRoleChange(user.user_id!, 'executive')}
                              disabled={user.role === 'executive'}
                            >
                              <UserCog className="h-4 w-4 mr-2" />
                              Make Executive
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleQuickRoleChange(user.user_id!, 'admin')}
                              disabled={user.role === 'admin'}
                            >
                              <Shield className="h-4 w-4 mr-2" />
                              Make Admin
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleQuickRoleChange(user.user_id!, 'super-admin')}
                              disabled={user.role === 'super-admin'}
                            >
                              <Crown className="h-4 w-4 mr-2" />
                              Make Super Admin
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleQuickRoleChange(user.user_id!, 'auditioner')}
                              disabled={user.role === 'auditioner'}
                            >
                              <Calendar className="h-4 w-4 mr-2" />
                              Make Auditioner
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="enroll" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Auto-Enroll User
              </CardTitle>
              <CardDescription>
                Quickly enroll a user with a specific role and send invitation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-start gap-3">
                  <UserPlus className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-800">How Auto-Enrollment Works</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      This will create a new user account and send them an invitation email to set up their password.
                      The user will be assigned the selected role immediately.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="user@spelman.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name (Optional)</Label>
                <Input
                  id="fullName"
                  placeholder="Alexandra Williams"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role *</Label>
                <Select value={role} onValueChange={setRole} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="auditioner">Auditioner</SelectItem>
                    <SelectItem value="alumna">Alumna</SelectItem>
                    <SelectItem value="fan">Fan</SelectItem>
                    <SelectItem value="executive">Executive</SelectItem>
                    <SelectItem value="librarian">Librarian</SelectItem>
                    <SelectItem value="crew-manager">Crew Manager</SelectItem>
                    <SelectItem value="director">Director</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-4">
                <Button 
                  onClick={handleAutoEnroll}
                  disabled={!email.trim() || !role || enrolling}
                  className="w-full"
                  size="lg"
                >
                  {enrolling ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Enrolling User...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Auto-Enroll User
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions" className="space-y-4">
          <UserPermissionManagement />
        </TabsContent>
        
        <TabsContent value="modules" className="space-y-4">
          <PermissionErrorBoundary>
            <RoleBasedModuleAssignment />
            <UserModuleAssignment />
          </PermissionErrorBoundary>
        </TabsContent>
        
        <TabsContent value="username" className="space-y-4">
          <PermissionErrorBoundary>
            <UsernamePermissionsManager />
          </PermissionErrorBoundary>
        </TabsContent>
      </Tabs>

      <ResetPasswordDialog 
        user={selectedUser}
        open={showResetDialog}
        onOpenChange={setShowResetDialog}
      />

      <DeleteUserDialog 
        user={selectedUser}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onUserDeleted={() => {
          setSelectedUser(null);
          fetchUsers();
        }}
      />
    </div>
  );
};