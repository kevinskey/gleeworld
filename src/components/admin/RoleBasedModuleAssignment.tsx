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
    { value: 'member', label: 'Member' },
    { value: 'alumna', label: 'Alumna' },
    { value: 'executive', label: 'Executive Board' },
    { value: 'admin', label: 'Admin' },
    { value: 'super-admin', label: 'Super Admin' }
  ];

  useEffect(() => {
    fetchModules();
  }, []);

  useEffect(() => {
    if (selectedRole) {
      fetchRoleModules();
    }
  }, [selectedRole]);

  const fetchModules = async () => {
    try {
      setLoading(true);
      
      // Get all modules from ModuleRegistry
      const registryModules = ModuleRegistry.getModules();
      
      const moduleList = registryModules.map(module => ({
        id: module.id,
        name: module.title,
        title: module.title,
        description: module.description || '',
        icon: module.icon || Settings,
        iconColor: module.iconColor || 'blue'
      }));

      setModules(moduleList);
    } catch (error) {
      console.error('Error fetching modules:', error);
      toast({
        title: 'Error',
        description: 'Failed to load modules',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRoleModules = async () => {
    try {
      setLoading(true);
      // Start fresh with no modules selected when role changes
      setSelectedModules([]);
    } catch (error) {
      console.error('Error fetching role modules:', error);
      toast({
        title: 'Error',
        description: 'Failed to load role modules',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleModule = (moduleId: string) => {
    setSelectedModules(prev =>
      prev.includes(moduleId)
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  const handleAssignModules = async () => {
    if (!selectedRole) {
      toast({
        title: 'Error',
        description: 'Please select a role',
        variant: 'destructive'
      });
      return;
    }

    try {
      setAssigning(true);

      // Get all users with the selected role
      const { data: users, error: usersError } = await supabase
        .from('gw_profiles')
        .select('user_id')
        .eq('role', selectedRole);

      if (usersError) throw usersError;

      if (!users || users.length === 0) {
        toast({
          title: 'No users found',
          description: `No users with role "${selectedRole}" found`,
          variant: 'destructive'
        });
        return;
      }

      // Get current user for granted_by
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('Not authenticated');

      const userIds = users.map(u => u.user_id).filter(id => id); // Filter out any null IDs

      if (userIds.length === 0) {
        toast({
          title: 'Error',
          description: 'No valid user IDs found',
          variant: 'destructive'
        });
        return;
      }

      // Remove all existing permissions for these users
      const { error: deleteError } = await supabase
        .from('gw_user_module_permissions')
        .delete()
        .in('user_id', userIds);

      if (deleteError) throw deleteError;

      // Add new permissions for selected modules
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
        description: `Assigned ${selectedModules.length} modules to ${userIds.length} users with role "${selectedRole}"`,
      });
    } catch (error) {
      console.error('Error assigning modules:', error);
      toast({
        title: 'Error',
        description: 'Failed to assign modules',
        variant: 'destructive'
      });
    } finally {
      setAssigning(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Role-Based Module Assignment
        </CardTitle>
        <CardDescription>
          Assign modules to all users with a specific role
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Role Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Select Role</label>
          <Select value={selectedRole} onValueChange={setSelectedRole}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a role..." />
            </SelectTrigger>
            <SelectContent>
              {roles.map(role => (
                <SelectItem key={role.value} value={role.value}>
                  {role.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Module Selection */}
        {selectedRole && (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Select Modules</label>
                <Badge variant="secondary">
                  {selectedModules.length} selected
                </Badge>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <ScrollArea className="h-[400px] rounded-md border p-4">
                  <div className="space-y-2">
                    {modules.map(module => {
                      const IconComponent = module.icon;
                      const isSelected = selectedModules.includes(module.id);

                      return (
                        <div
                          key={module.id}
                          className="flex items-center space-x-3 p-2 rounded-md hover:bg-accent/50 transition-colors"
                        >
                          <Checkbox
                            id={module.id}
                            checked={isSelected}
                            onCheckedChange={() => handleToggleModule(module.id)}
                          />
                          <label
                            htmlFor={module.id}
                            className="flex items-center gap-3 flex-1 cursor-pointer"
                          >
                            {IconComponent && (
                              <div className={`p-1.5 rounded bg-${module.iconColor}-100 dark:bg-${module.iconColor}-900/20`}>
                                <IconComponent className={`h-4 w-4 text-${module.iconColor}-600 dark:text-${module.iconColor}-400`} />
                              </div>
                            )}
                            <div className="flex-1">
                              <p className="text-sm font-medium">{module.title}</p>
                              {module.description && (
                                <p className="text-xs text-muted-foreground line-clamp-1">
                                  {module.description}
                                </p>
                              )}
                            </div>
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setSelectedModules([])}
                disabled={assigning || selectedModules.length === 0}
              >
                Clear All
              </Button>
              <Button
                onClick={handleAssignModules}
                disabled={assigning || !selectedRole}
              >
                {assigning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Assign to All {roles.find(r => r.value === selectedRole)?.label}s
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
