import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Settings, Users, Search, Plus, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useUserModulePermissions, UserWithPermissions } from '@/hooks/useUserModulePermissions';
import { UNIFIED_MODULES } from '@/config/unified-modules';

export const UserModuleAssignment = () => {
  const { 
    loading, 
    error, 
    grantModuleAccess, 
    revokeModuleAccess, 
    getAllUsersWithPermissions 
  } = useUserModulePermissions();
  
  const [users, setUsers] = useState<UserWithPermissions[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const usersWithPerms = await getAllUsersWithPermissions();
      setUsers(usersWithPerms);
    } catch (err) {
      console.error('Error loading users:', err);
      toast.error('Failed to load users');
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Filter users based on search term
  const filteredUsers = users.filter(user =>
    user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get available modules (only active ones)
  const availableModules = UNIFIED_MODULES.filter(module => module.isActive);

  const selectedUserData = users.find(u => u.user_id === selectedUser);

  const handleModuleToggle = async (moduleId: string, hasAccess: boolean) => {
    if (!selectedUser) return;
    
    try {
      let success;
      if (hasAccess) {
        success = await revokeModuleAccess(selectedUser, moduleId);
        if (success) {
          toast.success('Module access revoked');
        }
      } else {
        success = await grantModuleAccess(selectedUser, moduleId);
        if (success) {
          toast.success('Module access granted');
        }
      }
      
      if (success) {
        // Refresh the users list to show updated permissions
        await loadUsers();
      }
    } catch (err) {
      toast.error('Failed to update module access');
    }
  };

  const handleGrantAllModules = async () => {
    if (!selectedUser) return;
    
    try {
      const promises = availableModules.map(module => 
        grantModuleAccess(selectedUser, module.id)
      );
      
      await Promise.all(promises);
      await loadUsers();
      toast.success('All modules granted');
    } catch (err) {
      toast.error('Failed to grant all modules');
    }
  };

  const handleRevokeAllModules = async () => {
    if (!selectedUser || !selectedUserData) return;
    
    try {
      const promises = selectedUserData.modules.map(moduleId => 
        revokeModuleAccess(selectedUser, moduleId)
      );
      
      await Promise.all(promises);
      await loadUsers();
      toast.success('All modules revoked');
    } catch (err) {
      toast.error('Failed to revoke all modules');
    }
  };

  if (loadingUsers) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading users and permissions...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>User Module Assignment</CardTitle>
              <CardDescription>
                Assign specific modules to individual users
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* User Search and Selection */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
            </div>
            
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger>
                <SelectValue placeholder="Select a user to manage their module access..." />
              </SelectTrigger>
              <SelectContent>
                {filteredUsers.map((user) => (
                  <SelectItem key={user.user_id} value={user.user_id}>
                    <div className="flex items-center gap-2">
                      <span>{user.full_name}</span>
                      <Badge variant="outline" className="text-xs">
                        {user.role}
                      </Badge>
                      {user.is_exec_board && (
                        <Badge variant="secondary" className="text-xs">
                          Executive
                        </Badge>
                      )}
                      <span className="text-sm text-muted-foreground">
                        {user.modules.length} modules
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Selected User Info */}
          {selectedUserData && (
            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold">{selectedUserData.full_name}</h3>
                    <p className="text-sm text-muted-foreground">{selectedUserData.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline">{selectedUserData.role}</Badge>
                      {selectedUserData.is_exec_board && (
                        <Badge variant="secondary">Executive Board</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleGrantAllModules}
                      disabled={loading}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Grant All
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRevokeAllModules}
                      disabled={loading || selectedUserData.modules.length === 0}
                    >
                      <X className="h-3 w-3 mr-1" />
                      Revoke All
                    </Button>
                  </div>
                </div>
                
                <div className="text-sm">
                  <strong>Current Access:</strong> {selectedUserData.modules.length} of {availableModules.length} modules
                </div>
              </CardContent>
            </Card>
          )}

          {/* Module Assignment Grid */}
          {selectedUserData && (
            <div className="space-y-4">
              <h4 className="text-lg font-semibold">Available Modules</h4>
              <div className="grid gap-3">
                {availableModules.map((module) => {
                  const hasAccess = selectedUserData.modules.includes(module.id);
                  const IconComponent = module.icon;
                  
                  return (
                    <Card key={module.id} className="transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            <IconComponent className="h-5 w-5 text-muted-foreground" />
                            <div className="flex-1">
                              <h5 className="font-medium">{module.title}</h5>
                              <p className="text-sm text-muted-foreground line-clamp-1">
                                {module.description}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {module.category}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <Switch
                            checked={hasAccess}
                            onCheckedChange={() => handleModuleToggle(module.id, hasAccess)}
                            disabled={loading}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {!selectedUser && (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <Users className="w-16 h-16 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Select a User</h3>
                  <p>Choose a user from the dropdown above to manage their module access permissions.</p>
                </div>
              </CardContent>
            </Card>
          )}

          {error && (
            <Card className="border-destructive">
              <CardContent className="pt-6">
                <div className="text-center text-destructive">
                  <p className="font-medium">Error</p>
                  <p className="text-sm">{error}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
};