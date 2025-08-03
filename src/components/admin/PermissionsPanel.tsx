import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUsernamePermissionsAdmin } from "@/hooks/useUsernamePermissions";
import { COMPREHENSIVE_FUNCTIONS_LIST, PermissionFunction } from "@/constants/granularPermissions";
import { 
  Shield, 
  Search, 
  Users, 
  Settings,
  CheckCircle2,
  X,
  Filter,
  Download,
  Upload
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

export const PermissionsPanel = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [userPermissions, setUserPermissions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  
  const { toast } = useToast();
  const { grantPermission, revokePermission } = useUsernamePermissionsAdmin();

  // Get unique categories from COMPREHENSIVE_FUNCTIONS_LIST
  const categories = Array.from(new Set(COMPREHENSIVE_FUNCTIONS_LIST.map(func => func.category)));

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

  const filteredFunctions = COMPREHENSIVE_FUNCTIONS_LIST.filter(func => {
    const matchesCategory = categoryFilter === 'all' || func.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && func.isActive) ||
      (statusFilter === 'inactive' && !func.isActive);
    
    return matchesCategory && matchesStatus;
  });

  const handlePermissionToggle = async (functionId: string, isChecked: boolean) => {
    if (!selectedUser) return;

    try {
      if (isChecked) {
        await grantPermission(selectedUser.email, functionId);
        setUserPermissions(prev => new Set([...prev, functionId]));
        toast({
          title: "Permission Granted",
          description: `Access granted to ${functionId.replace(/_/g, ' ')}`,
        });
      } else {
        await revokePermission(selectedUser.email, functionId);
        setUserPermissions(prev => {
          const newSet = new Set(prev);
          newSet.delete(functionId);
          return newSet;
        });
        toast({
          title: "Permission Revoked",
          description: `Access revoked for ${functionId.replace(/_/g, ' ')}`,
        });
      }
    } catch (error) {
      console.error('Error toggling permission:', error);
      toast({
        title: "Error",
        description: "Failed to update permission",
        variant: "destructive",
      });
    }
  };

  const getUserRoleBadgeColor = (user: UserProfile) => {
    if (user.is_super_admin) return 'bg-red-100 text-red-800';
    if (user.is_admin) return 'bg-purple-100 text-purple-800';
    if (user.is_exec_board) return 'bg-amber-100 text-amber-800';
    return 'bg-blue-100 text-blue-800';
  };

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <Badge variant="default" className="bg-green-100 text-green-800">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        Active
      </Badge>
    ) : (
      <Badge variant="secondary" className="bg-gray-100 text-gray-800">
        <X className="h-3 w-3 mr-1" />
        Inactive
      </Badge>
    );
  };

  const grantAllCommunityHubPermissions = async () => {
    if (!selectedUser) return;

    const communityHubFunctions = COMPREHENSIVE_FUNCTIONS_LIST.filter(func => 
      func.category === 'Community Hub'
    );

    try {
      for (const func of communityHubFunctions) {
        if (!userPermissions.has(func.id)) {
          await grantPermission(selectedUser.email, func.id);
        }
      }
      
      // Refresh permissions
      const { data, error } = await supabase
        .from('username_permissions')
        .select('module_name')
        .eq('user_email', selectedUser.email)
        .eq('is_active', true);

      if (!error) {
        const permissions = new Set(data?.map(p => p.module_name) || []);
        setUserPermissions(permissions);
      }

      toast({
        title: "Community Hub Access Granted",
        description: `All Community Hub functions granted to ${selectedUser.full_name || selectedUser.email}`,
      });
    } catch (error) {
      console.error('Error granting community hub permissions:', error);
      toast({
        title: "Error",
        description: "Failed to grant community hub permissions",
        variant: "destructive",
      });
    }
  };

  const exportPermissions = () => {
    if (!selectedUser) return;

    const userPerms = COMPREHENSIVE_FUNCTIONS_LIST.filter(func => userPermissions.has(func.id));
    const exportData = {
      user: {
        email: selectedUser.email,
        name: selectedUser.full_name,
        role: selectedUser.role,
        isAdmin: selectedUser.is_admin,
        isExecBoard: selectedUser.is_exec_board
      },
      permissions: userPerms.map(func => ({
        id: func.id,
        name: func.name,
        category: func.category,
        location: func.location,
        isActive: func.isActive
      })),
      exportDate: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `permissions-${selectedUser.email}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Group functions by category for display
  const functionsByCategory = filteredFunctions.reduce((acc, func) => {
    if (!acc[func.category]) {
      acc[func.category] = [];
    }
    acc[func.category].push(func);
    return acc;
  }, {} as Record<string, PermissionFunction[]>);

  return (
    <div className="h-full">
      <div className="mb-6">
        <h2 className="text-3xl font-bold tracking-tight">Permissions Control Panel</h2>
        <p className="text-muted-foreground">
          Complete function-level permission management for all system features. {COMPREHENSIVE_FUNCTIONS_LIST.length} total functions available.
        </p>
      </div>

      <Tabs defaultValue="individual" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="individual">Individual User Management</TabsTrigger>
          <TabsTrigger value="overview">System Overview</TabsTrigger>
        </TabsList>

        <TabsContent value="individual" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-250px)]">
            {/* User List */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Users ({users.length})
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
                <ScrollArea className="h-[600px]">
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
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      System Functions
                      {selectedUser && (
                        <Badge variant="outline" className="ml-2">
                          {selectedUser.full_name || selectedUser.email}
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription>
                      {selectedUser 
                        ? `Manage permissions for ${selectedUser.full_name || selectedUser.email} (${Array.from(userPermissions).length} permissions granted)`
                        : 'Select a user to manage their permissions'
                      }
                    </CardDescription>
                  </div>
                  {selectedUser && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={grantAllCommunityHubPermissions}
                      >
                        Grant Community Hub Access
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={exportPermissions}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </Button>
                    </div>
                  )}
                </div>
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
                  <>
                    {/* Filters */}
                    <div className="flex gap-4 mb-4 p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4" />
                        <span className="text-sm font-medium">Filters:</span>
                      </div>
                      <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="px-2 py-1 border rounded text-sm"
                      >
                        <option value="all">All Categories</option>
                        {categories.map(category => (
                          <option key={category} value={category}>{category}</option>
                        ))}
                      </select>
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-2 py-1 border rounded text-sm"
                      >
                        <option value="all">All Status</option>
                        <option value="active">Active Only</option>
                        <option value="inactive">Inactive Only</option>
                      </select>
                    </div>

                    <ScrollArea className="h-[500px]">
                      <div className="space-y-6">
                        {Object.entries(functionsByCategory).map(([categoryName, functions]) => (
                          <div key={categoryName} className="border rounded-lg p-4">
                            <div className="flex items-center gap-3 mb-4">
                              <Settings className="h-5 w-5 text-primary" />
                              <h3 className="font-semibold">{categoryName}</h3>
                              <Badge variant="secondary">{functions.length} functions</Badge>
                            </div>
                            
                            <div className="space-y-3">
                              {functions.map((func) => {
                                const isChecked = userPermissions.has(func.id);
                                
                                return (
                                  <div
                                    key={func.id}
                                    className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                                      isChecked ? 'bg-green-50 border-green-200' : 'bg-white hover:bg-gray-50'
                                    }`}
                                  >
                                    <div className="flex items-center space-x-3">
                                      <Checkbox
                                        id={func.id}
                                        checked={isChecked}
                                        onCheckedChange={(checked) => 
                                          handlePermissionToggle(func.id, checked as boolean)
                                        }
                                      />
                                      <div className="flex-1">
                                        <label
                                          htmlFor={func.id}
                                          className="text-sm font-medium cursor-pointer"
                                        >
                                          {func.name}
                                        </label>
                                        <p className="text-xs text-muted-foreground">
                                          {func.description}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1">
                                          <Badge variant="outline" className="text-xs">
                                            {func.location}
                                          </Badge>
                                          {getStatusBadge(func.isActive)}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{COMPREHENSIVE_FUNCTIONS_LIST.length}</div>
                <p className="text-xs text-muted-foreground">Total Functions</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  {COMPREHENSIVE_FUNCTIONS_LIST.filter(f => f.isActive).length}
                </div>
                <p className="text-xs text-muted-foreground">Active Functions</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{categories.length}</div>
                <p className="text-xs text-muted-foreground">Categories</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{users.length}</div>
                <p className="text-xs text-muted-foreground">Total Users</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>System Functions Overview</CardTitle>
              <CardDescription>
                Complete catalog of all coded functions in the GleeWorld system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {categories.map(category => {
                  const categoryFunctions = COMPREHENSIVE_FUNCTIONS_LIST.filter(f => f.category === category);
                  const activeFunctions = categoryFunctions.filter(f => f.isActive);
                  
                  return (
                    <div key={category} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold">{category}</h3>
                        <div className="flex gap-2">
                          <Badge variant="default">{activeFunctions.length} Active</Badge>
                          <Badge variant="secondary">{categoryFunctions.length - activeFunctions.length} Inactive</Badge>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
                        {categoryFunctions.map(func => (
                          <div key={func.id} className="flex items-center gap-2">
                            <div className={`h-2 w-2 rounded-full ${func.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                            <span className={func.isActive ? 'text-foreground' : 'text-muted-foreground'}>
                              {func.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};