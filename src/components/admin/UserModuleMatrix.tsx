import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedModulesSimple } from '@/hooks/useUnifiedModules';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

interface Props {
  userId: string;
}

interface ModuleRecord {
  id: string;
  name: string;
}

interface PermissionMap {
  [moduleId: string]: {
    view: boolean;
    manage: boolean;
  };
}

export const UserModuleMatrix: React.FC<Props> = ({ userId }) => {
  const { modules: configModules } = useUnifiedModulesSimple();
  const [mods, setMods] = useState<ModuleRecord[]>([]);
  const [permMap, setPermMap] = useState<PermissionMap>({});
  const [loading, setLoading] = useState(false);
  const [isDirector, setIsDirector] = useState(false);

  const titleFor = useMemo(() => {
    const map = new Map(configModules.map(m => [m.name, m.title] as const));
    return (name: string) => map.get(name) || name;
  }, [configModules]);

  const load = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      // Check if selected user is a Director (alias of super-admin)
      const { data: profileData } = await supabase
        .from('gw_profiles')
        .select('is_super_admin, role')
        .eq('user_id', userId)
        .maybeSingle();

      const director = !!profileData?.is_super_admin || profileData?.role === 'director' || profileData?.role === 'super-admin';

      // If Director, list ALL configured modules with full access
      if (director) {
        setIsDirector(true);
        const allConfigMods: ModuleRecord[] = (configModules || []).map((m: any) => ({ id: m.name, name: m.name }));
        setMods(allConfigMods);
        const fullPerms: PermissionMap = {};
        allConfigMods.forEach((m) => (fullPerms[m.id] = { view: true, manage: true }));
        setPermMap(fullPerms);
        return;
      } else {
        setIsDirector(false);
      }

      // Fetch active modules from DB (non-Director path)
      const { data: mData, error: mErr } = await supabase
        .from('gw_modules')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      if (mErr) throw mErr;

      setMods((mData || []) as ModuleRecord[]);

      // Fetch active permissions for user
      const { data: pData, error: pErr } = await supabase
        .from('gw_module_permissions')
        .select('module_id, permission_type, is_active')
        .eq('user_id', userId)
        .eq('is_active', true);
      if (pErr) throw pErr;

      const next: PermissionMap = {};
      (mData || []).forEach((m) => (next[m.id] = { view: false, manage: false }));
      (pData || []).forEach((p: any) => {
        if (!next[p.module_id]) next[p.module_id] = { view: false, manage: false };
        if (p.permission_type === 'view') next[p.module_id].view = true;
        if (p.permission_type === 'manage') next[p.module_id].manage = true;
      });
      // Manage implies View
      Object.keys(next).forEach((k) => {
        if (next[k].manage) next[k].view = true;
      });
      setPermMap(next);
    } catch (e) {
      console.error('Failed to load user permissions', e);
      toast.error('Failed to load user permissions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [userId]);

  const upsert = async (moduleId: string, permission: 'view' | 'manage', active: boolean) => {
    try {
      setLoading(true);
      if (active) {
        const { error } = await supabase
          .from('gw_module_permissions')
          .upsert(
            { user_id: userId, module_id: moduleId, permission_type: permission, is_active: true },
            { onConflict: 'user_id,module_id,permission_type' }
          );
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('gw_module_permissions')
          .update({ is_active: false })
          .eq('user_id', userId)
          .eq('module_id', moduleId)
          .eq('permission_type', permission);
        if (error) throw error;
      }
    } finally {
      await load();
      setLoading(false);
    }
  };

  const toggle = async (moduleId: string, key: 'view' | 'manage', nextVal: boolean) => {
    // Manage implies View; turning off view also turns off manage
    if (key === 'manage' && nextVal) {
      if (!permMap[moduleId]?.view) await upsert(moduleId, 'view', true);
      await upsert(moduleId, 'manage', true);
      toast.success('Granted manage (and view)');
      return;
    }
    if (key === 'view' && !nextVal) {
      if (permMap[moduleId]?.manage) await upsert(moduleId, 'manage', false);
      await upsert(moduleId, 'view', false);
      toast.success('Revoked view (and manage)');
      return;
    }
    await upsert(moduleId, key, nextVal);
    toast.success(nextVal ? 'Granted' : 'Revoked');
  };

  const rows = useMemo(() => {
    return [...mods].sort((a, b) => titleFor(a.name).localeCompare(titleFor(b.name)));
  }, [mods, titleFor]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>User → Module Permissions</CardTitle>
        <CardDescription>Toggle View/Manage for this user. Manage implies View.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="py-1 px-1">Module</th>
                <th className="py-1 px-0.5">View</th>
                <th className="py-1 px-0.5">Manage</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => {
                const state = permMap[m.id] || { view: false, manage: false };
                return (
                  <tr key={m.id} className="border-b last:border-b-0 hover:bg-muted/40">
                    <td className="py-1 px-1">{titleFor(m.name)}</td>
                    <td className="py-1 px-0.5">
                      <div className="flex items-center gap-1">
                        <Switch
                          checked={!!state.view}
                          onCheckedChange={(val) => toggle(m.id, 'view', val)}
                          disabled={loading || isDirector}
                          aria-label={`Toggle view for ${titleFor(m.name)}`}
                        />
                      </div>
                    </td>
                    <td className="py-1 px-0.5">
                      <div className="flex items-center gap-1">
                        <Switch
                          checked={!!state.manage}
                          onCheckedChange={(val) => toggle(m.id, 'manage', val)}
                          disabled={loading || isDirector}
                          aria-label={`Toggle manage for ${titleFor(m.name)}`}
                        />
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