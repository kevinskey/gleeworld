import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, Settings, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ModuleRegistry } from '@/utils/moduleRegistry';
import { useToast } from '@/hooks/use-toast';

interface Module {
  id: string;
  name: string;
  title: string;
  description: string;
  icon: any;
  iconColor: string;
}

export const RoleBasedModuleAssignment = () => {
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const { toast } = useToast();

  const roles = [
    { value: 'student', label: 'Student' },
    { value: 'member', label: 'Member' },
    { value: 'graduate', label: 'Graduate' },
    { value: 'executive', label: 'Executive Board' },
    { value: 'admin', label: 'Admin' },
    { value: 'super-admin', label: 'Super Admin' }
  ];

  useEffect(() => { fetchModules(); }, []);
  useEffect(() => { if (selectedRole) setSelectedModules([]); }, [selectedRole]);

  const fetchModules = async () => {
    try {
      setLoading(true);
      const registryModules = ModuleRegistry.getModules();
      setModules(registryModules.map(module => ({
        id: module.id,
        name: module.title,
        title: module.title,
        description: module.description || '',
        icon: module.icon || Settings,
        iconColor: module.iconColor || 'blue'
      })));
    } catch (error) {
      console.error('Error fetching modules:', error);
      toast({ title: 'Error', description: 'Failed to load modules', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleModule = (moduleId: string) => {
    setSelectedModules(prev =>
      prev.includes(moduleId) ? prev.filter(id => id !== moduleId) : [...prev, moduleId]
    );
  };

  const handleAssignModules = async () => {
    if (!selectedRole) {
      toast({ title: 'Error', description: 'Please select a role', variant: 'destructive' });
      return;
    }

    try {
      setAssigning(true);
      const { data: users, error: usersError } = await supabase
        .from('gw_profiles')
        .select('user_id')
        .eq('role', selectedRole);

      if (usersError) throw usersError;
      if (!users || users.length === 0) {
        toast({ title: 'No users found', description: `No users with role "${selectedRole}"`, variant: 'destructive' });
        return;
      }

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('Not authenticated');

      const userIds = users.map(u => u.user_id).filter(id => id);
      if (userIds.length === 0) {
        toast({ title: 'Error', description: 'No valid user IDs', variant: 'destructive' });
        return;
      }

      const { error: deleteError } = await supabase
        .from('gw_user_module_permissions')
        .delete()
        .in('user_id', userIds);
      if (deleteError) throw deleteError;

      if (selectedModules.length > 0) {
        const permissions = userIds.flatMap(userId =>
          selectedModules.map(moduleId => ({
            user_id: userId,
            module_id: moduleId,
            granted_by: user.id,
            is_active: true,
            notes: `Assigned via role: ${selectedRole}`
          }))
        );
        const { error: insertError } = await supabase
          .from('gw_user_module_permissions')
          .insert(permissions);
        if (insertError) throw insertError;
      }

      toast({
        title: 'Success',
        description: `Assigned ${selectedModules.length} modules to ${userIds.length} ${selectedRole}s`,
      });
    } catch (error) {
      console.error('Error assigning modules:', error);
      toast({ title: 'Error', description: 'Failed to assign modules', variant: 'destructive' });
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-base font-bold text-foreground flex items-center gap-2">
          <Users className="h-4 w-4" />
          Role-Based Assignment
        </h3>
        <p className="text-xs text-muted-foreground">Assign modules to all users with a specific role</p>
      </div>

      <Select value={selectedRole} onValueChange={setSelectedRole}>
        <SelectTrigger className="h-9 text-sm bg-card border-border">
          <SelectValue placeholder="Choose a role..." />
        </SelectTrigger>
        <SelectContent>
          {roles.map(role => (
            <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedRole && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Select modules</span>
            <Badge variant="secondary" className="text-[10px]">{selectedModules.length} selected</Badge>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ScrollArea className="h-[50vh] sm:h-[300px] rounded-md border p-2 sm:p-3">
              <div className="space-y-1">
                {modules.map(module => {
                  const IconComponent = module.icon;
                  return (
                    <div key={module.id} className="flex items-center gap-2.5 p-2 rounded-md hover:bg-accent/50">
                      <Checkbox
                        id={module.id}
                        checked={selectedModules.includes(module.id)}
                        onCheckedChange={() => handleToggleModule(module.id)}
                      />
                      <label htmlFor={module.id} className="flex items-center gap-2 flex-1 cursor-pointer min-w-0">
                        {IconComponent && <IconComponent className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{module.title}</p>
                          {module.description && (
                            <p className="text-[10px] text-muted-foreground truncate">{module.description}</p>
                          )}
                        </div>
                      </label>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}

          <div className="flex items-center justify-between gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedModules([])}
              disabled={assigning || selectedModules.length === 0}
              className="text-xs h-8"
            >
              Clear
            </Button>
            <Button
              size="sm"
              onClick={handleAssignModules}
              disabled={assigning || !selectedRole}
              className="text-xs h-8"
            >
              {assigning && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Assign to {roles.find(r => r.value === selectedRole)?.label}s
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
