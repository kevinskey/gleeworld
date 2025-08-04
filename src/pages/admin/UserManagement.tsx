import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Users, UserPlus, Shield, Settings, Search, Filter, Mail, Calendar, Crown, UserCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  role: string;
  is_admin: boolean;
  is_super_admin: boolean;
  is_exec_board: boolean;
  exec_board_role: string | null;
  verified: boolean;
  created_at: string;
}

const EXECUTIVE_POSITIONS = [
  'president',
  'secretary', 
  'treasurer',
  'tour_manager',
  'wardrobe_manager',
  'librarian',
  'historian',
  'pr_coordinator',
  'chaplain',
  'data_analyst',
  'assistant_chaplain',
  'student_conductor',
  'section_leader_s1',
  'section_leader_s2', 
  'section_leader_a1',
  'section_leader_a2',
  'set_up_crew_manager',
  'pr_manager'
] as const;

const UserManagement = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [execBoardDialogOpen, setExecBoardDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const assignExecutivePosition = async (userId: string, position: typeof EXECUTIVE_POSITIONS[number]) => {
    try {
      const currentYear = new Date().getFullYear().toString();

      // First, check if position is already taken for this year
      const { data: existingMember } = await supabase
        .from('gw_executive_board_members')
        .select('*')
        .eq('position', position)
        .eq('academic_year', currentYear)
        .eq('is_active', true)
        .maybeSingle();

      if (existingMember) {
        toast({
          title: "Position Taken",
          description: `The ${position.replace(/_/g, ' ')} position is already occupied for ${currentYear}`,
          variant: "destructive",
        });
        return;
      }

      // Remove user from any existing executive board positions for this year
      await supabase
        .from('gw_executive_board_members')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('academic_year', currentYear);

      // Check if user already has this exact position for this year (inactive)
      const { data: existingRecord } = await supabase
        .from('gw_executive_board_members')
        .select('*')
        .eq('user_id', userId)
        .eq('position', position)
        .eq('academic_year', currentYear)
        .maybeSingle();

      if (existingRecord) {
        // Reactivate existing record
        const { error: updateError } = await supabase
          .from('gw_executive_board_members')
          .update({ is_active: true })
          .eq('id', existingRecord.id);

        if (updateError) throw updateError;
      } else {
        // Create new record
        const { error: insertError } = await supabase
          .from('gw_executive_board_members')
          .insert({
            user_id: userId,
            position: position,
            academic_year: currentYear,
            is_active: true
          });

        if (insertError) throw insertError;
      }

      // Update profile
      const { error: profileError } = await supabase
        .from('gw_profiles')
        .update({ 
          is_exec_board: true,
          exec_board_role: position
        })
        .eq('user_id', userId);

      if (profileError) throw profileError;

      toast({
        title: "Success",
        description: `Executive position assigned successfully`,
      });
      
      fetchUsers();
      setExecBoardDialogOpen(false);
    } catch (error) {
      console.error('Error assigning executive position:', error);
      toast({
        title: "Error",
        description: "Failed to assign executive position",
        variant: "destructive",
      });
    }
  };

  const removeFromExecutiveBoard = async (userId: string) => {
    try {
      // Deactivate from executive board
      const { error: boardError } = await supabase
        .from('gw_executive_board_members')
        .update({ is_active: false })
        .eq('user_id', userId);

      if (boardError) throw boardError;

      // Update profile
      const { error: profileError } = await supabase
        .from('gw_profiles')
        .update({ 
          is_exec_board: false,
          exec_board_role: null
        })
        .eq('user_id', userId);

      if (profileError) throw profileError;

      toast({
        title: "Success",
        description: "Removed from executive board successfully",
      });
      
      fetchUsers();
    } catch (error) {
      console.error('Error removing from executive board:', error);
      toast({
        title: "Error",
        description: "Failed to remove from executive board",
        variant: "destructive",
      });
    }
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      console.log('Updating user role:', { userId, newRole });
      
      const { data, error } = await supabase
        .from('gw_profiles')
        .update({ role: newRole })
        .eq('user_id', userId)
        .select();

      console.log('Update result:', { data, error });

      if (error) throw error;

      toast({
        title: "Success",
        description: "User role updated successfully",
      });
      
      fetchUsers();
    } catch (error) {
      console.error('Error updating user role:', error);
      toast({
        title: "Error",
        description: `Failed to update user role: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const toggleAdminStatus = async (userId: string, isAdmin: boolean) => {
    try {
      const { error } = await supabase
        .from('gw_profiles')
        .update({ is_admin: !isAdmin })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Admin status ${!isAdmin ? 'granted' : 'revoked'} successfully`,
      });
      
      fetchUsers();
    } catch (error) {
      console.error('Error updating admin status:', error);
      toast({
        title: "Error",
        description: "Failed to update admin status",
        variant: "destructive",
      });
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getRoleBadge = (user: UserProfile) => {
    if (user.is_super_admin) return <Badge className="bg-red-500/20 text-red-600">Super Admin</Badge>;
    if (user.is_admin) return <Badge className="bg-orange-500/20 text-orange-600">Admin</Badge>;
    if (user.is_exec_board && user.exec_board_role) {
      return <Badge className="bg-purple-500/20 text-purple-600">
        <Crown className="h-3 w-3 mr-1" />
        {user.exec_board_role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
      </Badge>;
    }
    
    const roleColors: Record<string, string> = {
      'member': 'bg-blue-500/20 text-blue-600',
      'alumna': 'bg-green-500/20 text-green-600',
      'fan': 'bg-gray-500/20 text-gray-600',
    };
    
    return <Badge className={roleColors[user.role] || 'bg-gray-500/20 text-gray-600'}>
      {user.role?.charAt(0).toUpperCase() + user.role?.slice(1)}
    </Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">Loading users...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">Manage member accounts, roles, and permissions</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
              <DialogDescription>
                Create a new user account with basic information.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="user@example.com" />
              </div>
              <div>
                <Label htmlFor="fullName">Full Name</Label>
                <Input id="fullName" placeholder="John Doe" />
              </div>
              <div>
                <Label htmlFor="role">Role</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="alumna">Alumna</SelectItem>
                    <SelectItem value="fan">Fan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full">Create User</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Total Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
            <p className="text-sm text-muted-foreground">Registered accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Admins
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter(u => u.is_admin || u.is_super_admin).length}
            </div>
            <p className="text-sm text-muted-foreground">Admin accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Active Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter(u => u.role === 'member').length}
            </div>
            <p className="text-sm text-muted-foreground">Current members</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5" />
              Executive Board
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter(u => u.is_exec_board).length}
            </div>
            <p className="text-sm text-muted-foreground">Board members</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Directory</CardTitle>
          <CardDescription>Search and manage all users</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-48">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="member">Members</SelectItem>
                <SelectItem value="alumna">Alumni</SelectItem>
                <SelectItem value="fan">Fans</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            {filteredUsers.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="font-semibold text-primary">
                      {user.full_name?.charAt(0)?.toUpperCase() || user.email.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="font-semibold">{user.full_name || 'No name'}</div>
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <Mail className="h-3 w-3" />
                      {user.email}
                    </div>
                  </div>
                  {getRoleBadge(user)}
                  {user.verified && (
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      Verified
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <Select
                    value={user.role}
                    onValueChange={(value) => updateUserRole(user.user_id, value)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="alumna">Alumna</SelectItem>
                      <SelectItem value="fan">Fan</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Button
                    variant={user.is_admin ? "destructive" : "default"}
                    size="sm"
                    onClick={() => toggleAdminStatus(user.user_id, user.is_admin)}
                  >
                    <Shield className="h-4 w-4 mr-1" />
                    {user.is_admin ? 'Remove Admin' : 'Make Admin'}
                  </Button>

                  {user.is_exec_board ? (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => removeFromExecutiveBoard(user.user_id)}
                    >
                      <Crown className="h-4 w-4 mr-1" />
                      Remove Board
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setSelectedUser(user);
                        setExecBoardDialogOpen(true);
                      }}
                    >
                      <Crown className="h-4 w-4 mr-1" />
                      Assign Board
                    </Button>
                  )}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedUser(user);
                      setEditDialogOpen(true);
                    }}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Executive Board Assignment Dialog */}
      <Dialog open={execBoardDialogOpen} onOpenChange={setExecBoardDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Executive Board Position</DialogTitle>
            <DialogDescription>
              Assign {selectedUser?.full_name || selectedUser?.email} to an executive board position.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Executive Position</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {EXECUTIVE_POSITIONS.map((position) => (
                  <Button
                    key={position}
                    variant="outline"
                    className="justify-start"
                    onClick={() => selectedUser && assignExecutivePosition(selectedUser.user_id, position)}
                  >
                    <Crown className="h-4 w-4 mr-2" />
                    {position.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Button>
                ))}
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              Note: Assigning a new position will remove any existing executive board position.
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;
