
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Loader2, Save, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { UNIFIED_MODULES } from '@/config/unified-modules';
import { toast } from 'sonner';

interface RolePermission {
  id: string;
  role: string;
  module_name: string;
  permission_type: string;
  is_active: boolean;
}

const AVAILABLE_ROLES = [
  'student',
  'member', 
  'alumna',
  'executive',
  'admin',
  'super-admin'
];

export const RoleModuleMatrix: React.FC = () => {
  const [permissions, setPermissions] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<Record<string, { view: boolean; manage: boolean }>>({});

  useEffect(() => {
    fetchRolePermissions();
  }, []);

  const fetchRolePermissions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('gw_role_module_permissions')
        .select('*');

      if (error) throw error;
      
      setPermissions(data || []);
    } catch (error: any) {
      console.error('Error fetching role permissions:', error);
      toast.error('Failed to fetch role permissions');
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionChange = (role: string, moduleKey: string, permission: 'view' | 'manage', value: boolean) => {
    const key = `${role}-${moduleKey}`;
    setPendingChanges(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [permission]: value
      }
    }));
  };

  const saveChanges = async () => {
    if (Object.keys(pendingChanges).length === 0) {
      toast.info('No changes to save');
      return;
    }

    try {
      setSaving(true);

      for (const [key, changes] of Object.entries(pendingChanges)) {
        const [role, moduleKey] = key.split('-');
        
        // Handle view permission
        if (changes.view !== undefined) {
          const existingView = permissions.find(p => 
            p.role === role && 
            p.module_name === moduleKey && 
            p.permission_type === 'view'
          );
          
          if (existingView) {
            await supabase
              .from('gw_role_module_permissions')
              .update({ is_active: changes.view })
              .eq('id', existingView.id);
          } else if (changes.view) {
            await supabase
              .from('gw_role_module_permissions')
              .insert({
                role,
                module_name: moduleKey,
                permission_type: 'view',
                is_active: true
              });
          }
        }
        
        // Handle manage permission
        if (changes.manage !== undefined) {
          const existingManage = permissions.find(p => 
            p.role === role && 
            p.module_name === moduleKey && 
            p.permission_type === 'manage'
          );
          
          if (existingManage) {
            await supabase
              .from('gw_role_module_permissions')
              .update({ is_active: changes.manage })
              .eq('id', existingManage.id);
          } else if (changes.manage) {
            await supabase
              .from('gw_role_module_permissions')
              .insert({
                role,
                module_name: moduleKey,
                permission_type: 'manage',
                is_active: true
              });
          }
        }
      }

      setPendingChanges({});
      await fetchRolePermissions();
      toast.success('Role permissions updated successfully');
    } catch (error: any) {
      console.error('Error saving changes:', error);
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const getEffectivePermissions = (role: string, moduleKey: string) => {
    const key = `${role}-${moduleKey}`;
    const pending = pendingChanges[key];
    
    const existingView = permissions.find(p => 
      p.role === role && 
      p.module_name === moduleKey && 
      p.permission_type === 'view'
    );
    const existingManage = permissions.find(p => 
      p.role === role && 
      p.module_name === moduleKey && 
      p.permission_type === 'manage'
    );
    
    return {
      view: pending?.view ?? existingView?.is_active ?? false,
      manage: pending?.manage ?? existingManage?.is_active ?? false
    };
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Loading role permissions...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Role-Based Module Permissions</CardTitle>
        <CardDescription>
          Configure default permissions for each role across all modules
        </CardDescription>
        <div className="flex items-center space-x-2">
          <Button onClick={fetchRolePermissions} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          <Button 
            onClick={saveChanges} 
            disabled={saving || Object.keys(pendingChanges).length === 0}
            size="sm"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
            Save Changes
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {AVAILABLE_ROLES.map(role => (
          <div key={role}>
            <h3 className="text-lg font-semibold mb-3 capitalize">{role}</h3>
            <div className="space-y-2">
              {UNIFIED_MODULES.filter(m => m.isActive !== false).map(module => {
                const permissions = getEffectivePermissions(role, module.id);
                const hasChanges = pendingChanges[`${role}-${module.id}`];

                return (
                  <div 
                    key={`${role}-${module.id}`}
                    className={`flex items-center justify-between p-3 border rounded-lg ${hasChanges ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'}`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium">{module.title}</h4>
                        <Badge variant="secondary">{module.category}</Badge>
                        {hasChanges && <Badge variant="outline">Modified</Badge>}
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={permissions.view}
                          onCheckedChange={(checked) => handlePermissionChange(role, module.id, 'view', checked)}
                        />
                        <span className="text-sm">View</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={permissions.manage}
                          onCheckedChange={(checked) => handlePermissionChange(role, module.id, 'manage', checked)}
                        />
                        <span className="text-sm">Manage</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
