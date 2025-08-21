
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
  module_key: string;
  module_name: string;
  can_view: boolean;
  can_manage: boolean;
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
  const [pendingChanges, setPendingChanges] = useState<Record<string, { can_view: boolean; can_manage: boolean }>>({});

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
      
      // Transform the data to match our interface
      const transformedData = (data || []).map(item => ({
        id: item.id,
        role: item.role,
        module_key: item.module_key || item.module_name,
        module_name: item.module_name,
        can_view: item.can_view || false,
        can_manage: item.can_manage || false
      }));
      
      setPermissions(transformedData);
    } catch (error: any) {
      console.error('Error fetching role permissions:', error);
      toast.error('Failed to fetch role permissions');
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionChange = (role: string, moduleKey: string, permission: 'can_view' | 'can_manage', value: boolean) => {
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
        const existingPermission = permissions.find(p => p.role === role && p.module_key === moduleKey);
        
        if (existingPermission) {
          // Update existing permission
          const { error } = await supabase
            .from('gw_role_module_permissions')
            .update({
              can_view: changes.can_view ?? existingPermission.can_view,
              can_manage: changes.can_manage ?? existingPermission.can_manage
            })
            .eq('id', existingPermission.id);

          if (error) throw error;
        } else {
          // Create new permission
          const module = UNIFIED_MODULES.find(m => m.id === moduleKey);
          const { error } = await supabase
            .from('gw_role_module_permissions')
            .insert({
              role,
              module_key: moduleKey,
              module_name: module?.title || moduleKey,
              can_view: changes.can_view ?? false,
              can_manage: changes.can_manage ?? false
            });

          if (error) throw error;
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
    const existing = permissions.find(p => p.role === role && p.module_key === moduleKey);
    
    return {
      can_view: pending?.can_view ?? existing?.can_view ?? false,
      can_manage: pending?.can_manage ?? existing?.can_manage ?? false
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
                          checked={permissions.can_view}
                          onCheckedChange={(checked) => handlePermissionChange(role, module.id, 'can_view', checked)}
                        />
                        <span className="text-sm">View</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={permissions.can_manage}
                          onCheckedChange={(checked) => handlePermissionChange(role, module.id, 'can_manage', checked)}
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
