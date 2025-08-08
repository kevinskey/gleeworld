import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, Users, Shield, CheckCircle2, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ModuleRecord {
  id: string;
  name: string;
  is_active?: boolean;
}

interface UserRecord {
  id: string; // user_id from gw_profiles
  email: string | null;
  full_name: string | null;
  role: string | null;
}

interface PermissionRecord {
  user_id: string;
  module_id: string;
  permission_type: string;
  is_active: boolean;
}

const PERMISSION_TYPE = 'view';

const ModuleAccess: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [modules, setModules] = useState<ModuleRecord[]>([]);
  const [permissions, setPermissions] = useState<PermissionRecord[]>([]);
  const [search, setSearch] = useState('');
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        // Load users via secure RPC
        const { data: userData, error: userErr } = await supabase.rpc('get_all_user_profiles');
        if (userErr) throw userErr;

        // Load active modules
        const { data: moduleData, error: modErr } = await supabase
          .from('gw_modules')
          .select('id, name, is_active')
          .eq('is_active', true)
          .order('name');
        if (modErr) throw modErr;

        // Load permissions in bulk (active only)
        const { data: permData, error: permErr } = await supabase
          .from('gw_module_permissions')
          .select('user_id, module_id, permission_type, is_active')
          .eq('permission_type', PERMISSION_TYPE);
        if (permErr) throw permErr;

        setUsers(userData as UserRecord[]);
        setModules((moduleData || []) as ModuleRecord[]);
        setPermissions((permData || []) as PermissionRecord[]);
      } catch (e) {
        console.error('Failed to load module access data:', e);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(u =>
      (u.full_name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.role || '').toLowerCase().includes(q)
    );
  }, [users, search]);

  const hasAccess = (userId: string, moduleId: string) =>
    permissions.some(p => p.user_id === userId && p.module_id === moduleId && p.permission_type === PERMISSION_TYPE && p.is_active);

  const setAccess = async (userId: string, moduleId: string, next: boolean) => {
    const key = `${userId}:${moduleId}`;
    setSavingKey(key);
    try {
      if (next) {
        // Upsert grant
        const { error } = await supabase
          .from('gw_module_permissions')
          .upsert({ user_id: userId, module_id: moduleId, permission_type: PERMISSION_TYPE, is_active: true }, { onConflict: 'user_id,module_id,permission_type' });
        if (error) throw error;
        setPermissions(prev => {
          const idx = prev.findIndex(p => p.user_id === userId && p.module_id === moduleId && p.permission_type === PERMISSION_TYPE);
          if (idx >= 0) {
            const copy = [...prev];
            copy[idx] = { ...copy[idx], is_active: true };
            return copy;
          }
          return [...prev, { user_id: userId, module_id: moduleId, permission_type: PERMISSION_TYPE, is_active: true }];
        });
      } else {
        // Revoke by setting inactive
        const { error } = await supabase
          .from('gw_module_permissions')
          .update({ is_active: false })
          .eq('user_id', userId)
          .eq('module_id', moduleId)
          .eq('permission_type', PERMISSION_TYPE);
        if (error) throw error;
        setPermissions(prev => prev.map(p => (
          p.user_id === userId && p.module_id === moduleId && p.permission_type === PERMISSION_TYPE
            ? { ...p, is_active: false }
            : p
        )));
      }
    } catch (e) {
      console.error('Failed to update permission:', e);
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30">
      <div className="container mx-auto px-6 py-6">
        <Card className="mb-4 bg-background/50 border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" /> Module Access
              </CardTitle>
              <p className="text-sm text-muted-foreground">Toggle module visibility per user. Green = has access, Red = no access.</p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="relative max-w-sm w-full">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users by name, email, or role"
                  className="pl-8"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              {loading && (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading...
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-background/50 border-border">
          <CardHeader>
            <CardTitle className="text-base">Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredUsers.map((user) => (
                <div key={user.id} className="p-4 rounded-lg border border-border/60 bg-background/40">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <div className="font-medium text-foreground">{user.full_name || user.email}</div>
                      <div className="text-xs text-muted-foreground">{user.email} {user.role ? `• ${user.role}` : ''}</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {modules.map((m) => {
                        const active = hasAccess(user.id, m.id);
                        const isSaving = savingKey === `${user.id}:${m.id}`;
                        return (
                          <Button
                            key={m.id}
                            variant={active ? 'default' : 'outline'}
                            size="sm"
                            className={`flex items-center gap-1 ${active ? '' : ''}`}
                            onClick={() => setAccess(user.id, m.id, !active)}
                            disabled={isSaving}
                            aria-label={`${active ? 'Revoke' : 'Grant'} ${m.name} for ${user.full_name || user.email}`}
                          >
                            {isSaving ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : active ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                            ) : (
                              <XCircle className="h-3.5 w-3.5 text-destructive" />
                            )}
                            <span className="text-xs">{m.name}</span>
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
              {!loading && filteredUsers.length === 0 && (
                <div className="text-sm text-muted-foreground">No users match your search.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ModuleAccess;
