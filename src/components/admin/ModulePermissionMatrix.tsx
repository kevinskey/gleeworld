import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUnifiedModulesSimple } from '@/hooks/useUnifiedModules';
import { useModulePermissionManager } from '@/hooks/useModulePermissionManager';

interface Role {
  id: string;
  key: string;
  name: string;
}

interface ModulePermission {
  role_id: string;
  module_id: string;
  can_view: boolean;
  can_manage: boolean;
}

interface PermissionMatrix {
  [moduleKey: string]: {
    [roleKey: string]: {
      can_view: boolean;
      can_manage: boolean;
    };
  };
}

export function ModulePermissionMatrix() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [permissions, setPermissions] = useState<PermissionMatrix>({});
  const [loading, setLoading] = useState(true);
  
  const { modules } = useUnifiedModulesSimple();
  const { setRoleModulePermissions } = useModulePermissionManager();
  const { toast } = useToast();

  useEffect(() => {
    fetchRolesAndPermissions();
  }, []);

  const fetchRolesAndPermissions = async () => {
    try {
      setLoading(true);

      // Fetch roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('gw_roles')
        .select('*')
        .order('name');

      if (rolesError) throw rolesError;
      setRoles(rolesData || []);

      // Fetch existing permissions
      const { data: permsData, error: permsError } = await supabase
        .from('gw_role_module_permissions')
        .select(`
          can_view,
          can_manage,
          gw_roles!inner(key),
          gw_modules!inner(key)
        `);

      if (permsError) throw permsError;

      // Build permission matrix
      const matrix: PermissionMatrix = {};
      
      for (const perm of permsData || []) {
        const moduleKey = (perm as any).gw_modules.key;
        const roleKey = (perm as any).gw_roles.key;
        
        if (!matrix[moduleKey]) {
          matrix[moduleKey] = {};
        }
        
        matrix[moduleKey][roleKey] = {
          can_view: (perm as any).can_view,
          can_manage: (perm as any).can_manage
        };
      }

      setPermissions(matrix);
    } catch (error) {
      console.error('Error fetching roles and permissions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load roles and permissions',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionChange = async (
    moduleKey: string,
    roleKey: string,
    permissionType: 'can_view' | 'can_manage',
    value: boolean
  ) => {
    const currentPerms = permissions[moduleKey]?.[roleKey] || { can_view: false, can_manage: false };
    
    // If disabling manage, also disable view unless explicitly keeping it
    let newPerms = { ...currentPerms, [permissionType]: value };
    
    // If enabling manage, also enable view
    if (permissionType === 'can_manage' && value) {
      newPerms.can_view = true;
    }
    
    // If disabling view, also disable manage
    if (permissionType === 'can_view' && !value) {
      newPerms.can_manage = false;
    }

    const success = await setRoleModulePermissions(roleKey, moduleKey, newPerms);
    
    if (success) {
      // Update local state
      setPermissions(prev => ({
        ...prev,
        [moduleKey]: {
          ...prev[moduleKey],
          [roleKey]: newPerms
        }
      }));
    }
  };

  const filteredModules = selectedRole 
    ? modules.filter(module => 
        permissions[module.id]?.[selectedRole]?.can_view || 
        permissions[module.id]?.[selectedRole]?.can_manage
      )
    : modules;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Module Permission Matrix</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">Loading permissions...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Module Permission Matrix</CardTitle>
        <p className="text-sm text-muted-foreground">
          Manage which roles can view and manage different modules
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex gap-4 items-center">
          <Select value={selectedRole} onValueChange={setSelectedRole}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Filter by role (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Roles</SelectItem>
              {roles.map(role => (
                <SelectItem key={role.key} value={role.key}>
                  {role.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {selectedRole && (
            <Badge variant="outline">
              Showing modules for: {roles.find(r => r.key === selectedRole)?.name}
            </Badge>
          )}
        </div>

        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-3 font-medium">Module</th>
                <th className="text-left p-3 font-medium">Category</th>
                {roles.map(role => (
                  <th key={role.key} className="text-center p-3 font-medium min-w-24">
                    {role.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredModules.map(module => (
                <tr key={module.id} className="border-t">
                  <td className="p-3">
                    <div>
                      <div className="font-medium">{module.title}</div>
                      <div className="text-sm text-muted-foreground">{module.description}</div>
                    </div>
                  </td>
                  <td className="p-3">
                    <Badge variant="outline">{module.category}</Badge>
                  </td>
                  {roles.map(role => {
                    const rolePerms = permissions[module.id]?.[role.key] || { can_view: false, can_manage: false };
                    return (
                      <td key={role.key} className="p-3 text-center">
                        <div className="space-y-2">
                          <div className="flex items-center justify-center gap-1">
                            <Switch
                              checked={rolePerms.can_view}
                              onCheckedChange={(checked) => 
                                handlePermissionChange(module.id, role.key, 'can_view', checked)
                              }
                            />
                            <span className="text-xs">View</span>
                          </div>
                          <div className="flex items-center justify-center gap-1">
                            <Switch
                              checked={rolePerms.can_manage}
                              onCheckedChange={(checked) => 
                                handlePermissionChange(module.id, role.key, 'can_manage', checked)
                              }
                            />
                            <span className="text-xs">Manage</span>
                          </div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredModules.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            {selectedRole ? 'No modules assigned to this role' : 'No modules found'}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
