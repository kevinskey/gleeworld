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
  MoreHorizontal
} from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { UserRoleEditor } from './UserRoleEditor';

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
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
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
      default: return <User className="h-4 w-4" />;
    }
  };

  const handleUserUpdate = async (updatedUser: UserProfile) => {
    setUsers(users.map(user => 
      user.id === updatedUser.id ? updatedUser : user
    ));
    setEditDialogOpen(false);
    setSelectedUser(null);
    await fetchUsers(); // Refresh to get latest data
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
                <SelectItem value="super-admin">Super Admin</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="executive">Executive</SelectItem>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="alumna">Alumna</SelectItem>
                <SelectItem value="fan">Fan</SelectItem>
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