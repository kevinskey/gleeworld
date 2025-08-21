
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Loader2, Save, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { UNIFIED_MODULES } from '@/config/unified-modules';
import { toast } from 'sonner';

interface UserModuleMatrixProps {
  userId: string;
}

interface ModuleGrant {
  user_id: string;
  module_id: string;
  can_view: boolean;
  can_manage: boolean;
  is_active: boolean;
  source: string;
  notes: string;
  granted_at: string;
  expires_at: string;
}

export const UserModuleMatrix: React.FC<UserModuleMatrixProps> = ({ userId }) => {
  const [grants, setGrants] = useState<ModuleGrant[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<Record<string, { can_view: boolean; can_manage: boolean }>>({});

  useEffect(() => {
    fetchUserGrants();
  }, [userId]);

  const fetchUserGrants = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('username_module_permissions')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      
      setGrants(data || []);
    } catch (error: any) {
      console.error('Error fetching user grants:', error);
      toast.error('Failed to fetch user permissions');
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionChange = (moduleKey: string, permission: 'can_view' | 'can_manage', value: boolean) => {
    setPendingChanges(prev => ({
      ...prev,
      [moduleKey]: {
        ...prev[moduleKey],
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

      for (const [moduleKey, changes] of Object.entries(pendingChanges)) {
        const existingGrant = grants.find(g => g.module_id === moduleKey);
        
        if (existingGrant) {
          // Update existing grant
          const { error } = await supabase
            .from('username_module_permissions')
            .update({
              can_view: changes.can_view ?? existingGrant.can_view,
              can_manage: changes.can_manage ?? existingGrant.can_manage
            })
            .eq('user_id', userId)
            .eq('module_id', moduleKey);

          if (error) throw error;
        } else {
          // Create new grant
          const { error } = await supabase
            .from('username_module_permissions')
            .insert({
              user_id: userId,
              module_id: moduleKey,
              can_view: changes.can_view ?? false,
              can_manage: changes.can_manage ?? false,
              is_active: true,
              source: 'admin',
              notes: 'Manually granted by admin'
            });

          if (error) throw error;
        }
      }

      setPendingChanges({});
      await fetchUserGrants();
      toast.success('Permissions updated successfully');
    } catch (error: any) {
      console.error('Error saving changes:', error);
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const getEffectivePermissions = (moduleKey: string) => {
    const pending = pendingChanges[moduleKey];
    const existing = grants.find(g => g.module_id === moduleKey);
    
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
          <span>Loading permissions...</span>
        </CardContent>
      </Card>
    );
  }

  const sortedModules = UNIFIED_MODULES.filter(m => m.isActive !== false).sort((a, b) => {
    const aTitle = typeof a.title === 'string' ? a.title : '';
    const bTitle = typeof b.title === 'string' ? b.title : '';
    return aTitle.localeCompare(bTitle);
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Module Permissions</CardTitle>
        <CardDescription>
          Manage individual module permissions for this user
        </CardDescription>
        <div className="flex items-center space-x-2">
          <Button onClick={fetchUserGrants} variant="outline" size="sm">
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
      <CardContent className="space-y-4">
        {sortedModules.map(module => {
          const permissions = getEffectivePermissions(module.id);
          const hasChanges = pendingChanges[module.id];
          const moduleTitle = typeof module.title === 'string' ? module.title : module.id;

          return (
            <div 
              key={module.id} 
              className={`flex items-center justify-between p-3 border rounded-lg ${hasChanges ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'}`}
            >
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <h4 className="font-medium">{moduleTitle}</h4>
                  <Badge variant="secondary">{module.category}</Badge>
                  {hasChanges && <Badge variant="outline">Modified</Badge>}
                </div>
                {module.description && (
                  <p className="text-sm text-muted-foreground mt-1">{module.description}</p>
                )}
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={permissions.can_view}
                    onCheckedChange={(checked) => handlePermissionChange(module.id, 'can_view', checked)}
                  />
                  <span className="text-sm">View</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={permissions.can_manage}
                    onCheckedChange={(checked) => handlePermissionChange(module.id, 'can_manage', checked)}
                  />
                  <span className="text-sm">Manage</span>
                </div>
              </div>
            </div>
          );
        })}

        {sortedModules.length === 0 && (
          <div className="text-center py-6 text-muted-foreground">
            No modules available
          </div>
        )}
      </CardContent>
    </Card>
  );
};
