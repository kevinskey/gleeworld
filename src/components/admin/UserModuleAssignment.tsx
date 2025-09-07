import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Users, Plus, X, Settings } from 'lucide-react';
import { useUserModulePermissions } from '@/hooks/useUserModulePermissions';
import { getActiveModules } from '@/config/unified-modules';
import { EXECUTIVE_MODULE_IDS, STANDARD_MEMBER_MODULE_IDS } from '@/config/executive-modules';
import { supabase } from '@/integrations/supabase/client';

interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  modules: string[];
}

interface DbModule {
  key: string;
  name: string;
  description: string;
  category: string;
  is_active: boolean;
}

const AssignModulesDialog = ({
  user,
  open,
  onOpenChange,
  onAssign
}: {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssign: () => void;
}) => {
  const { grantModuleAccess, revokeModuleAccess } = useUserModulePermissions();
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [dbModules, setDbModules] = useState<DbModule[]>([]);
  const [loadingModules, setLoadingModules] = useState(true);

  // Fetch modules from database instead of hardcoded config
  const fetchModules = async () => {
    try {
      setLoadingModules(true);
      console.log('🔍 fetchModules: Starting to fetch modules from database...');
      
      const { data, error } = await supabase
        .from('gw_modules')
        .select('key, name, description, category, is_active')
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('🔍 fetchModules: Error fetching modules:', error);
        return;
      }

      console.log('🔍 fetchModules: Successfully fetched modules from database:', data?.length || 0, data);
      setDbModules(data || []);
    } catch (error) {
      console.error('🔍 fetchModules: Exception in fetchModules:', error);
    } finally {
      setLoadingModules(false);
    }
  };

  // Convert database modules to UI format for compatibility
  const activeModules = useMemo(() => {
    console.log('🔍 activeModules useMemo: dbModules.length =', dbModules.length);
    
    if (dbModules.length === 0) {
      console.log('🔍 activeModules useMemo: No dbModules, returning empty array');
      return [];
    }
    
    const configModules = getActiveModules();
    console.log('🔍 activeModules useMemo: configModules.length =', configModules.length);
    
    // Create modules from database with fallback to config
    const combinedModules = dbModules.map(dbModule => {
      // Find matching config module for icon and other UI properties
      const configModule = configModules.find(cm => cm.id === dbModule.key || cm.name === dbModule.key);
      
      const combined = {
        id: dbModule.key,
        name: dbModule.key,
        title: dbModule.name,
        description: dbModule.description || '',
        icon: configModule?.icon || Settings, // Default icon
        iconColor: configModule?.iconColor || 'blue',
        category: dbModule.category,
        isActive: dbModule.is_active,
        component: configModule?.component || (() => null),
        dbFunctionName: dbModule.key
      };
      
      console.log('🔍 activeModules useMemo: Combined module:', dbModule.key, combined.title);
      return combined;
    });
    
    console.log('🔍 activeModules useMemo: Combined modules (DB + Config):', combinedModules.length);
    return combinedModules;
  }, [dbModules]);

  useEffect(() => {
    if (open) {
      fetchModules();
    }
  }, [open]);

  useEffect(() => {
    if (user) {
      // Only show modules that are currently active
      const activeModuleIds = activeModules.map(m => m.id);
      const validModules = user.modules.filter(moduleId => activeModuleIds.includes(moduleId));
      console.log('🔍 Setting selectedModules for user:', user.full_name, 'modules:', validModules);
      setSelectedModules(validModules);
    }
  }, [user, activeModules]);

  const handleSave = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const currentModules = new Set(user.modules);
      const newModules = new Set(selectedModules);

      // Add new modules
      for (const moduleId of newModules) {
        if (!currentModules.has(moduleId)) {
          await grantModuleAccess(user.id, moduleId, 'Assigned via admin panel');
        }
      }

      // Remove modules
      for (const moduleId of currentModules) {
        if (!newModules.has(moduleId)) {
          await revokeModuleAccess(user.id, moduleId);
        }
      }

      onAssign();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating modules:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleModule = (moduleId: string) => {
    console.log('🔍 toggleModule called with:', moduleId);
    console.log('🔍 Current selectedModules before toggle:', selectedModules);
    
    setSelectedModules(prev => {
      const newSelection = prev.includes(moduleId)
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId];
      
      console.log('🔍 New selectedModules after toggle:', newSelection);
      return newSelection;
    });
  };

  const assignExecutiveBoardModules = () => {
    if (!user) return;
    
    const activeModuleIds = activeModules.map(m => m.id);
    const execModulesToAssign = EXECUTIVE_MODULE_IDS.filter(moduleId => 
      activeModuleIds.includes(moduleId) && !selectedModules.includes(moduleId)
    );
    
    setSelectedModules(prev => [...prev, ...execModulesToAssign]);
    console.log('🔍 Assigned exec board modules:', execModulesToAssign);
  };

  const assignStandardMemberModules = () => {
    if (!user) return;
    
    const activeModuleIds = activeModules.map(m => m.id);
    const standardModulesToAssign = STANDARD_MEMBER_MODULE_IDS.filter(moduleId => 
      activeModuleIds.includes(moduleId) && !selectedModules.includes(moduleId)
    );
    
    setSelectedModules(prev => [...prev, ...standardModulesToAssign]);
    console.log('🔍 Assigned standard member modules:', standardModulesToAssign);
  };

  const clearAllModules = () => {
    setSelectedModules([]);
    console.log('🔍 Cleared all modules');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Assign Modules</DialogTitle>
          <DialogDescription>
            {user && `Assign specific modules to ${user.full_name || user.email}`}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* Quick Assignment Buttons */}
          <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-lg">
            <Button
              variant="outline"
              size="sm"
              onClick={assignStandardMemberModules}
              className="text-xs"
            >
              + Standard Member Modules
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={assignExecutiveBoardModules}
              className="text-xs"
            >
              + Executive Board Modules
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={clearAllModules}
              className="text-xs text-destructive hover:text-destructive"
            >
              Clear All
            </Button>
          </div>
          
          <div>
            <Label>Available Modules ({activeModules.length} total)</Label>
            <ScrollArea className="h-64 border rounded-md p-4 bg-background">
              <div className="grid grid-cols-1 gap-2">
                {loadingModules ? (
                  <div className="text-center py-4 text-muted-foreground">
                    Loading modules...
                  </div>
                ) : activeModules.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    No modules available
                  </div>
                ) : (
                  activeModules.map((module, index) => {
                    console.log(`🔍 Rendering module ${index}:`, module.id, module.title);
                    return (
                      <div key={module.id} className="flex items-center space-x-3 p-2 hover:bg-muted rounded-md border-b">
                        <Checkbox
                          id={`module-${module.id}`}
                          checked={selectedModules.includes(module.id)}
                          onCheckedChange={(checked) => {
                            console.log(`🔍 Checkbox changed for ${module.id}:`, checked);
                            toggleModule(module.id);
                          }}
                        />
                        <div className="flex items-center gap-2 flex-1">
                          <module.icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <Label htmlFor={`module-${module.id}`} className="text-sm font-medium cursor-pointer block">
                              {module.title}
                            </Label>
                            <p className="text-xs text-muted-foreground truncate">{module.description}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs flex-shrink-0">
                          {module.category}
                        </Badge>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>
          <div className="flex justify-between items-center text-sm text-muted-foreground">
            <span>{selectedModules.length} of {activeModules.length} active modules selected</span>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => {
              console.log('🔍 Cancel button clicked');
              onOpenChange(false);
            }}>
              Cancel
            </Button>
            <Button onClick={() => {
              console.log('🔍 Save button clicked, selectedModules:', selectedModules);
              handleSave();
            }} disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const UserModuleAssignment = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [dbModulesForCards, setDbModulesForCards] = useState<DbModule[]>([]);
  const { getAllUsersWithPermissions } = useUserModulePermissions();

  const fetchUsers = async () => {
    try {
      setLoading(true);
      console.log('🔍 Starting to fetch users...');
      
      // Also fetch modules for the card display
      const { data: modulesData } = await supabase
        .from('gw_modules')
        .select('key, name, description, category, is_active')
        .eq('is_active', true)
        .order('name');
      
      console.log('🔍 Fetched modules for cards:', modulesData?.length || 0);
      setDbModulesForCards(modulesData || []);
      
      const usersWithPerms = await getAllUsersWithPermissions();
      console.log('🔍 Raw users from getAllUsersWithPermissions:', usersWithPerms.length, usersWithPerms.slice(0, 3));
      
      const transformedUsers = usersWithPerms.map(user => ({
        id: user.user_id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        modules: user.modules
      }));
      
      console.log('🔍 Transformed users:', transformedUsers.length, transformedUsers.slice(0, 3));
      
      // Specifically look for Ariana
      const ariana = transformedUsers.find(u => u.email === 'arianaswindell@spelman.edu');
      console.log('🔍 Found Ariana in transformed users:', ariana);
      
      // Also log all users with "ariana" in name or email
      const arianaMatches = transformedUsers.filter(u => 
        u.full_name?.toLowerCase().includes('ariana') || 
        u.email?.toLowerCase().includes('ariana')
      );
      console.log('🔍 All Ariana matches:', arianaMatches);
      
      setUsers(transformedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignModules = () => {
    fetchUsers();
  };

  console.log('🔍 UserModuleAssignment render - users:', users.length, 'searchTerm:', searchTerm);
  
  const filteredUsers = users.filter(user => {
    if (!searchTerm.trim()) return true; // Show all users when search is empty
    
    const searchLower = searchTerm.toLowerCase().trim();
    const nameMatch = user.full_name?.toLowerCase().includes(searchLower) || false;
    const emailMatch = user.email?.toLowerCase().includes(searchLower) || false;
    const roleMatch = user.role?.toLowerCase().includes(searchLower) || false;
    
    const shouldInclude = nameMatch || emailMatch || roleMatch;
    
    // Always log the first user named Onnesty when searching
    if (user.full_name?.toLowerCase().includes('onnesty') && searchTerm) {
      console.log('🔍 Found Onnesty during search:', {
        searchTerm: searchLower,
        userName: user.full_name,
        userEmail: user.email,
        nameMatch,
        emailMatch,
        roleMatch,
        shouldMatch: shouldInclude,
        finalResult: shouldInclude ? 'INCLUDED' : 'EXCLUDED'
      });
    }
    
    return shouldInclude;
  });

  console.log('🔍 Filter results:', {
    totalUsers: users.length,
    filteredCount: filteredUsers.length,
    searchTerm,
    onnestyInFiltered: filteredUsers.find(u => u.full_name?.toLowerCase().includes('onnesty'))?.full_name || 'NOT FOUND'
  });

  console.log('🔍 First 5 filtered users:', filteredUsers.slice(0, 5).map(u => ({ name: u.full_name, email: u.email })));

  useEffect(() => {
    fetchUsers();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading users...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">User Module Assignment</h2>
          <p className="text-muted-foreground">
            Assign specific modules to individual users
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="space-y-4">
        {filteredUsers.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Users Found</h3>
              <p className="text-muted-foreground">
                {searchTerm ? 'No users match your search criteria.' : 'No users available for module assignment.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredUsers.map(user => (
            <Card key={user.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {user.full_name || user.email}
                    </CardTitle>
                    <CardDescription>
                      {user.email} • Role: {user.role}
                    </CardDescription>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedUser(user);
                      setAssignDialogOpen(true);
                    }}
                  >
                    <Settings className="w-3 h-3 mr-1" />
                    Manage Modules
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                  <div className="space-y-2">
                    <div className="text-sm font-medium">
                      Active Modules ({user.modules.filter(moduleId => 
                        dbModulesForCards.some(m => m.key === moduleId)
                      ).length} of {user.modules.length} total assigned)
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {user.modules.length === 0 ? (
                        <span className="text-sm text-muted-foreground">No modules assigned</span>
                      ) : (
                        user.modules.map(moduleId => {
                          const dbModule = dbModulesForCards.find(m => m.key === moduleId);
                          const configModule = getActiveModules().find(m => m.id === moduleId);
                          
                          if (dbModule) {
                            return (
                              <Badge
                                key={moduleId}
                                variant="secondary"
                                className="flex items-center gap-1"
                              >
                                {configModule?.icon ? (
                                  <configModule.icon className="w-3 h-3" />
                                ) : (
                                  <Settings className="w-3 h-3" />
                                )}
                                {dbModule.name}
                              </Badge>
                            );
                          } else {
                            return (
                              <Badge key={moduleId} variant="outline" className="opacity-50">
                                {moduleId} (inactive)
                              </Badge>
                            );
                          }
                        })
                      )}
                    </div>
                     {user.modules.length > dbModulesForCards.filter(m => user.modules.includes(m.key)).length && (
                        <div className="text-xs text-muted-foreground">
                          Some assigned modules are no longer active and will be cleaned up when you save changes.
                        </div>
                      )}
                    </div>
               </CardContent>
            </Card>
          ))
        )}
      </div>

      <AssignModulesDialog
        user={selectedUser}
        open={assignDialogOpen}
        onOpenChange={(open) => {
          setAssignDialogOpen(open);
          if (!open) setSelectedUser(null);
        }}
        onAssign={handleAssignModules}
      />
    </div>
  );
};