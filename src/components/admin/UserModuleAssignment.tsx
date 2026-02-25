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

  const fetchModules = async () => {
    try {
      setLoadingModules(true);
      const { data, error } = await supabase
        .from('gw_modules')
        .select('key, name, description, category, is_active')
        .eq('is_active', true)
        .order('name');

      if (error) return;
      setDbModules(data || []);
    } catch (error) {
      console.error('Error fetching modules:', error);
    } finally {
      setLoadingModules(false);
    }
  };

  const activeModules = useMemo(() => {
    if (dbModules.length === 0) return [];
    const configModules = getActiveModules();
    return dbModules.map(dbModule => {
      const configModule = configModules.find(cm => cm.id === dbModule.key || cm.name === dbModule.key);
      return {
        id: dbModule.key,
        name: dbModule.key,
        title: dbModule.name,
        description: dbModule.description || '',
        icon: configModule?.icon || Settings,
        iconColor: configModule?.iconColor || 'blue',
        category: dbModule.category,
        isActive: dbModule.is_active,
        component: configModule?.component || (() => null),
        dbFunctionName: dbModule.key
      };
    });
  }, [dbModules]);

  useEffect(() => {
    if (open) fetchModules();
  }, [open]);

  useEffect(() => {
    if (user) {
      const activeModuleIds = activeModules.map(m => m.id);
      setSelectedModules(user.modules.filter(moduleId => activeModuleIds.includes(moduleId)));
    }
  }, [user, activeModules]);

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const currentModules = new Set(user.modules);
      const newModules = new Set(selectedModules);
      for (const moduleId of newModules) {
        if (!currentModules.has(moduleId)) {
          await grantModuleAccess(user.id, moduleId, 'Assigned via admin panel');
        }
      }
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
    setSelectedModules(prev =>
      prev.includes(moduleId) ? prev.filter(id => id !== moduleId) : [...prev, moduleId]
    );
  };

  const assignExecutiveBoardModules = () => {
    if (!user) return;
    const activeModuleIds = activeModules.map(m => m.id);
    const execModulesToAssign = EXECUTIVE_MODULE_IDS.filter(moduleId =>
      activeModuleIds.includes(moduleId) && !selectedModules.includes(moduleId)
    );
    setSelectedModules(prev => [...prev, ...execModulesToAssign]);
  };

  const assignStandardMemberModules = () => {
    if (!user) return;
    const activeModuleIds = activeModules.map(m => m.id);
    const standardModulesToAssign = STANDARD_MEMBER_MODULE_IDS.filter(moduleId =>
      activeModuleIds.includes(moduleId) && !selectedModules.includes(moduleId)
    );
    setSelectedModules(prev => [...prev, ...standardModulesToAssign]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base">Assign Modules</DialogTitle>
          <DialogDescription className="text-xs">
            {user && `Assign modules to ${user.full_name || user.email}`}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 flex-1 min-h-0">
          {/* Quick buttons */}
          <div className="flex flex-wrap gap-1.5 p-2 bg-muted/50 rounded-lg">
            <Button variant="outline" size="sm" onClick={assignStandardMemberModules} className="text-xs h-7">
              + Member
            </Button>
            <Button variant="outline" size="sm" onClick={assignExecutiveBoardModules} className="text-xs h-7">
              + Executive
            </Button>
            <Button variant="outline" size="sm" onClick={() => setSelectedModules([])} className="text-xs h-7 text-destructive hover:text-destructive">
              Clear
            </Button>
          </div>

          <div className="min-h-0 flex-1">
            <Label className="text-xs text-muted-foreground">{activeModules.length} modules available · {selectedModules.length} selected</Label>
            <ScrollArea className="h-[40vh] sm:h-64 border rounded-md p-2 sm:p-3 bg-background mt-1">
              <div className="space-y-1">
                {loadingModules ? (
                  <div className="text-center py-4 text-muted-foreground text-sm">Loading...</div>
                ) : activeModules.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground text-sm">No modules available</div>
                ) : (
                  activeModules.map(module => (
                    <div key={module.id} className="flex items-center gap-2.5 p-2 hover:bg-muted rounded-md">
                      <Checkbox
                        id={`module-${module.id}`}
                        checked={selectedModules.includes(module.id)}
                        onCheckedChange={() => toggleModule(module.id)}
                      />
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <module.icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <div className="min-w-0 flex-1">
                          <Label htmlFor={`module-${module.id}`} className="text-sm font-medium cursor-pointer block truncate">
                            {module.title}
                          </Label>
                          <p className="text-[10px] text-muted-foreground truncate">{module.description}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0 hidden sm:inline-flex">
                        {module.category}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={loading}>
              {loading ? 'Saving...' : 'Save'}
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
      const { data: modulesData } = await supabase
        .from('gw_modules')
        .select('key, name, description, category, is_active')
        .eq('is_active', true)
        .order('name');

      setDbModulesForCards(modulesData || []);

      const usersWithPerms = await getAllUsersWithPermissions();
      setUsers(usersWithPerms.map(user => ({
        id: user.user_id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        modules: user.modules
      })));
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const filteredUsers = users.filter(user => {
    if (!searchTerm.trim()) return true;
    const s = searchTerm.toLowerCase().trim();
    return user.full_name?.toLowerCase().includes(s) || user.email?.toLowerCase().includes(s) || user.role?.toLowerCase().includes(s);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
        Loading users...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-base font-bold text-foreground">User Module Assignment</h3>
        <p className="text-xs text-muted-foreground">Assign specific modules to individual users</p>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
        <Input
          placeholder="Search users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9 h-9 text-sm bg-card border-border"
        />
      </div>

      {filteredUsers.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">
          <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
          {searchTerm ? 'No users match your search.' : 'No users available.'}
        </div>
      ) : (
        <div className="space-y-1.5">
          {filteredUsers.map(user => (
            <div key={user.id} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-card border border-border">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-xs font-medium text-primary">
                {user.full_name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate text-foreground">{user.full_name || user.email}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {user.email} · {user.modules.length} module{user.modules.length !== 1 ? 's' : ''}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs shrink-0"
                onClick={() => {
                  setSelectedUser(user);
                  setAssignDialogOpen(true);
                }}
              >
                <Settings className="w-3 h-3 sm:mr-1" />
                <span className="hidden sm:inline">Manage</span>
              </Button>
            </div>
          ))}
        </div>
      )}

      <AssignModulesDialog
        user={selectedUser}
        open={assignDialogOpen}
        onOpenChange={(open) => {
          setAssignDialogOpen(open);
          if (!open) setSelectedUser(null);
        }}
        onAssign={() => fetchUsers()}
      />
    </div>
  );
};
