import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedModulesSimple } from '@/hooks/useUnifiedModules';
import { USER_ROLES } from '@/constants/permissions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface PermissionMap {
  [moduleName: string]: {
    view: boolean;
    manage: boolean;
  };
}

export const RoleModuleMatrix: React.FC = () => {
  const { modules } = useUnifiedModulesSimple();
  const [role, setRole] = useState<string>('member');
  const [loading, setLoading] = useState<boolean>(false);
  const [permMap, setPermMap] = useState<PermissionMap>({});

  const moduleList = useMemo(
    () => modules.map(m => ({ name: m.name, title: m.title })).sort((a, b) => a.title.localeCompare(b.title)),
    [modules]
  );

  const loadRolePermissions = async (targetRole: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('gw_role_module_permissions')
        .select('module_name, permission_type')
        .eq('role', targetRole)
        .eq('is_active', true);

      if (error) throw error;

      const next: PermissionMap = {};
      moduleList.forEach(m => (next[m.name] = { view: false, manage: false }));
      (data || []).forEach(row => {
        if (!next[row.module_name]) next[row.module_name] = { view: false, manage: false };
        if (row.permission_type === 'view') next[row.module_name].view = true;
        if (row.permission_type === 'manage') next[row.module_name].manage = true;
      });
      // Ensure Manage implies View in UI map
      Object.keys(next).forEach(k => {
        if (next[k].manage) next[k].view = true;
      });
      setPermMap(next);
    } catch (e: any) {
      console.error('Failed to load role permissions', e);
      toast.error('Failed to load role permissions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRolePermissions(role);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  const enablePermission = async (moduleName: string, permission: 'view' | 'manage') => {
    const payload = {
      role,
      module_name: moduleName,
      permission_type: permission,
      is_active: true,
    } as const;

    const { error } = await supabase
      .from('gw_role_module_permissions')
      .upsert(payload, { onConflict: 'role,module_name,permission_type' });

    if (error) throw error;
  };

  const disablePermission = async (moduleName: string, permission: 'view' | 'manage') => {
    const { error } = await supabase
      .from('gw_role_module_permissions')
      .delete()
      .eq('role', role)
      .eq('module_name', moduleName)
      .eq('permission_type', permission);

    if (error) throw error;
  };

  const toggle = async (moduleName: string, key: 'view' | 'manage', nextVal: boolean) => {
    try {
      setLoading(true);
      // Manage implies View
      if (key === 'manage' && nextVal) {
        // ensure view
        if (!permMap[moduleName]?.view) await enablePermission(moduleName, 'view');
        await enablePermission(moduleName, 'manage');
      } else if (key === 'view' && !nextVal) {
        // turning view off disables manage too
        if (permMap[moduleName]?.manage) await disablePermission(moduleName, 'manage');
        await disablePermission(moduleName, 'view');
      } else {
        // simple flip
        if (nextVal) await enablePermission(moduleName, key);
        else await disablePermission(moduleName, key);
      }
      await loadRolePermissions(role);
      toast.success('Permissions updated');
    } catch (e: any) {
      console.error('Failed to update permission', e);
      toast.error('Failed to update permission');
    } finally {
      setLoading(false);
    }
  };

  const roleOptions = useMemo(() => {
    return Object.values(USER_ROLES) as string[];
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Role → Module Permissions</CardTitle>
        <CardDescription>Toggle View/Manage per module. Manage implies View.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 mb-4">
          <div className="min-w-56">
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger aria-label="Select role">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" onClick={() => loadRolePermissions(role)} disabled={loading}>Refresh</Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="py-1.5 px-1">Module</th>
                <th className="py-1.5 px-1">View</th>
                <th className="py-1.5 px-1">Manage</th>
              </tr>
            </thead>
            <tbody>
              {moduleList.map((m) => {
                const state = permMap[m.name] || { view: false, manage: false };
                return (
                  <tr key={m.name} className="border-b last:border-b-0 hover:bg-muted/40">
                    <td className="py-1.5 px-1">{m.title}</td>
                    <td className="py-1.5 px-1">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={!!state.view}
                          onCheckedChange={(val) => toggle(m.name, 'view', val)}
                          disabled={loading}
                          aria-label={`Toggle view for ${m.title}`}
                        />
                        <span className="text-xs text-muted-foreground">View</span>
                      </div>
                    </td>
                    <td className="py-1.5 px-1">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={!!state.manage}
                          onCheckedChange={(val) => toggle(m.name, 'manage', val)}
                          disabled={loading}
                          aria-label={`Toggle manage for ${m.title}`}
                        />
                        <span className="text-xs text-muted-foreground">Manage</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};