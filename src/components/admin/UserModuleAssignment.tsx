import React, { useState, useEffect } from 'react';
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

interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  modules: string[];
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

  const activeModules = getActiveModules();
  console.log('🔍 AssignModulesDialog: activeModules =', activeModules.length, activeModules.map(m => ({ id: m.id, title: m.title })));

  useEffect(() => {
    if (user) {
      // Only show modules that are currently active
      const activeModuleIds = activeModules.map(m => m.id);
      const validModules = user.modules.filter(moduleId => activeModuleIds.includes(moduleId));
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
    setSelectedModules(prev =>
      prev.includes(moduleId)
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    );
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
          <div>
            <Label>Available Modules</Label>
            <ScrollArea className="h-64 border rounded-md p-4">
              <div className="grid grid-cols-1 gap-2">
                {activeModules.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    No modules available
                  </div>
                ) : (
                  activeModules.map(module => (
                    <div key={module.id} className="flex items-center space-x-3 p-2 hover:bg-muted rounded-md">
                      <Checkbox
                        id={module.id}
                        checked={selectedModules.includes(module.id)}
                        onCheckedChange={() => toggleModule(module.id)}
                      />
                      <div className="flex items-center gap-2 flex-1">
                        <module.icon className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <Label htmlFor={module.id} className="text-sm font-medium cursor-pointer">
                            {module.title}
                          </Label>
                          <p className="text-xs text-muted-foreground">{module.description}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {module.category}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
          <div className="flex justify-between items-center text-sm text-muted-foreground">
            <span>{selectedModules.length} of {activeModules.length} active modules selected</span>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading}>
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
  const { getAllUsersWithPermissions } = useUserModulePermissions();

  const fetchUsers = async () => {
    try {
      setLoading(true);
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

  const handleAssignModules = () => {
    fetchUsers();
  };

  const filteredUsers = users.filter(user =>
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
                      getActiveModules().some(m => m.id === moduleId)
                    ).length} of {user.modules.length} total assigned)
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {user.modules.length === 0 ? (
                      <span className="text-sm text-muted-foreground">No modules assigned</span>
                    ) : (
                      user.modules.map(moduleId => {
                        const module = getActiveModules().find(m => m.id === moduleId);
                        return module ? (
                          <Badge
                            key={moduleId}
                            variant="secondary"
                            className="flex items-center gap-1"
                          >
                            <module.icon className="w-3 h-3" />
                            {module.title}
                          </Badge>
                        ) : (
                          <Badge key={moduleId} variant="outline" className="opacity-50">
                            {moduleId} (inactive)
                          </Badge>
                        );
                      })
                    )}
                  </div>
                   {user.modules.length > getActiveModules().filter(m => user.modules.includes(m.id)).length && (
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