import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  Edit,
  MoreHorizontal,
  ChevronLeft,
  Maximize2
} from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { UserRoleEditor } from './UserRoleEditor';
import { BulkExecBoardActions } from './user-management/BulkExecBoardActions';

interface UserProfile {
  id: string;
  email?: string;
  full_name?: string;
  role?: string;
  exec_board_role?: string;
  is_exec_board?: boolean;
  verified?: boolean;
  created_at?: string;
  last_sign_in_at?: string;
}

export const UserManagement = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [fullscreenEdit, setFullscreenEdit] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      console.log('UserManagement: Starting fetchUsers...');
      setLoading(true);
      
      // Check authentication first
      const { data: { session } } = await supabase.auth.getSession();
      console.log('UserManagement: Current session user:', session?.user?.id);
      
      // First, get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('gw_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('UserManagement: Query result:', { profiles, profilesError });

      if (profilesError) {
        console.error('UserManagement: Database error:', profilesError);
        throw profilesError;
      }

      console.log('UserManagement: Successfully fetched', profiles?.length || 0, 'profiles');
      setUsers(profiles || []);
    } catch (error) {
      console.error('UserManagement: Error fetching users:', error);
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
      case 'auditioner': return <Calendar className="h-4 w-4" />;
      default: return <User className="h-4 w-4" />;
    }
  };

  const handleUserUpdate = async (updatedUser: UserProfile) => {
    setUsers(users.map(user => 
      user.id === updatedUser.id ? updatedUser : user
    ));
    setEditDialogOpen(false);
    setFullscreenEdit(false);
    setSelectedUser(null);
    await fetchUsers(); // Refresh to get latest data
  };

  const handleFullscreenEdit = (user: UserProfile) => {
    setSelectedUser(user);
    setFullscreenEdit(true);
  };

  const handleQuickRoleChange = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('gw_profiles')
        .update({ role: newRole })
        .eq('user_id', userId);

      if (error) throw error;

      // Update local state
      setUsers(users.map(user => 
        user.id === userId ? { ...user, role: newRole } : user
      ));

      toast({
        title: "Role Updated",
        description: `User role changed to ${newRole}`,
      });
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        title: "Error",
        description: "Failed to update user role",
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

      // Update local state
      setUsers(users.map(user => 
        user.id === userId ? { ...user, verified: newStatus } : user
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" text="Loading users..." />
      </div>
    );
  }

  // If in fullscreen edit mode, show only the editor
  if (fullscreenEdit && selectedUser) {
    return (
      <div className="space-y-6">
        {/* Fullscreen Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFullscreenEdit(false)}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back to User List
                </Button>
                <div>
                  <CardTitle className="text-lg">
                    Editing: {selectedUser.full_name || 'No name set'}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {selectedUser.email}
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Fullscreen Editor */}
        <UserRoleEditor 
          user={selectedUser}
          onUpdate={handleUserUpdate}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Bulk Executive Board Actions */}
      <BulkExecBoardActions onActionComplete={fetchUsers} />

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            User Directory
          </CardTitle>
          <CardDescription>
            Manage all registered users, their roles, and permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
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
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="alumna">Alumna</SelectItem>
                <SelectItem value="executive">Executive</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="super-admin">Super Admin</SelectItem>
                <SelectItem value="auditioner">Auditioner</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
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
                    <div className="flex items-center gap-2 justify-end">
                      {/* Quick Actions Dropdown */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          
                          {/* Role Changes */}
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleQuickRoleChange(user.id, 'member');
                            }}
                            disabled={user.role === 'member'}
                          >
                            <User className="h-4 w-4 mr-2" />
                            Make Member
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleQuickRoleChange(user.id, 'admin');
                            }}
                            disabled={user.role === 'admin'}
                          >
                            <Shield className="h-4 w-4 mr-2" />
                            Make Admin
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleQuickRoleChange(user.id, 'alumna');
                            }}
                            disabled={user.role === 'alumna'}
                          >
                            <UserCheck className="h-4 w-4 mr-2" />
                            Make Alumna
                          </DropdownMenuItem>
                          
                          <DropdownMenuSeparator />
                          
                          {/* Status Toggle */}
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleVerificationToggle(user.id, user.verified || false);
                            }}
                          >
                            {user.verified ? (
                              <>
                                <UserX className="h-4 w-4 mr-2" />
                                Mark Unverified
                              </>
                            ) : (
                              <>
                                <UserCheck className="h-4 w-4 mr-2" />
                                Mark Verified
                              </>
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      {/* Fullscreen Edit Button */}
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleFullscreenEdit(user)}
                        className="hidden md:inline-flex"
                      >
                        <Maximize2 className="h-4 w-4" />
                      </Button>

                      {/* Full Edit Dialog */}
                      <Dialog open={editDialogOpen && selectedUser?.id === user.id} onOpenChange={setEditDialogOpen}>
                        <DialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setSelectedUser(user)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Edit User Permissions</DialogTitle>
                            <DialogDescription>
                              Modify user role, executive board status, and permissions
                            </DialogDescription>
                          </DialogHeader>
                          {selectedUser && (
                            <UserRoleEditor 
                              user={selectedUser}
                              onUpdate={handleUserUpdate}
                            />
                          )}
                        </DialogContent>
                      </Dialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {filteredUsers.length === 0 && (
            <div className="p-8 text-center">
              <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchTerm || roleFilter !== 'all' 
                  ? 'No users match your search criteria'
                  : 'No users found'
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};