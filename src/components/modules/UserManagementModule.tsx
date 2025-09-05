import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, Users, Settings, Shield, Search, KeyRound, Trash2, BookOpen } from 'lucide-react';
import { useAutoEnrollUser } from '@/hooks/useAutoEnrollUser';
import { useUsers } from '@/hooks/useUsers';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResetPasswordDialog } from '@/components/admin/ResetPasswordDialog';
import { DeleteUserDialog } from '@/components/admin/DeleteUserDialog';
import { PasswordResetTool } from '@/components/admin/PasswordResetTool';
import { useUsernamePermissionsAdmin } from '@/hooks/useUsernamePermissions';

export const UserManagementModule = () => {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { autoEnrollUser, enrolling } = useAutoEnrollUser();
  const { users, loading: usersLoading } = useUsers();
  const { grantPermission } = useUsernamePermissionsAdmin();

  const handleAutoEnroll = async () => {
    if (!email || !role) return;
    
    await autoEnrollUser(email, fullName || undefined, undefined, role);
    
    // Reset form
    setEmail('');
    setFullName('');
    setRole('');
  };

  const handleUserDeleted = () => {
    setSelectedUser(null);
    // Refetch users if needed
  };

  const filteredUsers = users?.filter(user =>
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
      case 'super-admin':
        return 'destructive';
      case 'executive':
        return 'default';
      case 'member':
        return 'secondary';
      default:
        return 'outline';
    }
    };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">Manage users, roles, and access permissions</p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">All Users</TabsTrigger>
          <TabsTrigger value="enroll">Enroll User</TabsTrigger>
          <TabsTrigger value="passwords">Reset Passwords</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{users?.length || 0}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Admins</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {users?.filter(u => u.role === 'admin' || u.role === 'super-admin').length || 0}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Members</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {users?.filter(u => u.role === 'member').length || 0}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Executive Board</CardTitle>
                <Settings className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {users?.filter(u => u.role === 'executive').length || 0}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>All Users</CardTitle>
              <CardDescription>
                Search and manage all registered users
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users by name, email, or role..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
              </div>
              
              {usersLoading ? (
                <div className="text-center py-4">Loading users...</div>
              ) : (
                <div className="space-y-2">
                  {filteredUsers.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <div className="font-medium">{user.full_name || 'No Name'}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={getRoleBadgeVariant(user.role || '')}>
                          {user.role || 'No Role'}
                        </Badge>
                        {user.is_admin && (
                          <Badge variant="destructive">Admin</Badge>
                        )}
                        {user.is_super_admin && (
                          <Badge variant="destructive">Super Admin</Badge>
                        )}
                         <Button
                           size="sm"
                           variant="outline"
                           onClick={async () => {
                             await grantPermission(user.email, 'librarian');
                           }}
                         >
                           <BookOpen className="w-4 h-4 mr-1" />
                           Grant Librarian
                         </Button>
                         <Button
                           size="sm"
                           variant="outline"
                           onClick={async () => {
                             await grantPermission(user.email, 'fanpage');
                           }}
                         >
                           <Users className="w-4 h-4 mr-1" />
                           Grant Fanpage
                         </Button>
                         <Button
                           size="sm"
                           variant="outline"
                           onClick={() => {
                             setSelectedUser(user);
                             setShowResetDialog(true);
                           }}
                         >
                           <KeyRound className="w-4 h-4 mr-1" />
                           Reset Password
                         </Button>
                         <Button
                           size="sm"
                           variant="destructive"
                           onClick={() => {
                             setSelectedUser(user);
                             setShowDeleteDialog(true);
                           }}
                         >
                           <Trash2 className="w-4 h-4 mr-1" />
                           Delete
                         </Button>
                      </div>
                    </div>
                  ))}
                  
                  {filteredUsers.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No users found matching your search.
                    </div>
                  )}
                </div>
              )}
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
                Quickly enroll a user with a specific role
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="user@spelman.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                <Label htmlFor="role">Role</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="crew-manager">Crew Manager</SelectItem>
                    <SelectItem value="librarian">Librarian</SelectItem>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="auditioner">Auditioner</SelectItem>
                    <SelectItem value="alumna">Alumna</SelectItem>
                    <SelectItem value="fan">Fan</SelectItem>
                    <SelectItem value="executive">Executive</SelectItem>
                    <SelectItem value="director">Director</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={handleAutoEnroll}
                disabled={!email || !role || enrolling}
                className="w-full"
              >
                {enrolling ? 'Enrolling...' : 'Auto-Enroll User'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="passwords" className="space-y-6">
          <PasswordResetTool />
        </TabsContent>

        <TabsContent value="permissions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Permissions Management
              </CardTitle>
              <CardDescription>
                Manage user permissions and access controls
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Advanced permissions management coming soon.</p>
                <p className="text-sm">Use the role-based system for now.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ResetPasswordDialog 
        user={selectedUser}
        open={showResetDialog}
        onOpenChange={setShowResetDialog}
      />

      <DeleteUserDialog 
        user={selectedUser}
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onUserDeleted={handleUserDeleted}
      />
    </div>
  );
};