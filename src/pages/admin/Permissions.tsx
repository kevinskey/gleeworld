import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RoleModuleMatrix } from '@/components/admin/RoleModuleMatrix';
import { PermissionManagement } from '@/components/admin/PermissionManagement';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { UserModuleMatrix } from '@/components/admin/UserModuleMatrix';
import { USER_ROLES } from '@/constants/permissions';
import { EXECUTIVE_POSITIONS } from '@/hooks/useExecutivePermissions';
import { toast } from 'sonner';
import { SelectedUserProfileCard } from '@/components/admin/SelectedUserProfileCard';

interface PreviewUser {
  id: string;
  email: string;
  full_name: string | null;
}

interface CombinedPermRow {
  module_name: string;
  permissions: string[];
  can_access: boolean;
  can_manage: boolean;
  sources: string[];
}

const PermissionsPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin, loading } = useUserRole();

  useEffect(() => {
    document.title = 'Permissions | GleeWorld Admin';
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', 'Assign and preview role and user permissions for GleeWorld modules.');
  }, []);

  useEffect(() => {
    if (!loading && !isAdmin()) {
      navigate('/dashboard');
    }
  }, [loading, isAdmin, navigate]);

  const [users, setUsers] = useState<PreviewUser[]>([]);
  const [userSearch, setUserSearch] = useState<string>('');
  const filteredUsers = useMemo(
    () =>
      users.filter((u) => {
        const q = userSearch.toLowerCase().trim();
        if (!q) return true;
        return (
          (u.full_name || '').toLowerCase().includes(q) ||
          (u.email || '').toLowerCase().includes(q)
        );
      }),
    [users, userSearch]
  );
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [effective, setEffective] = useState<CombinedPermRow[]>([]);
  const [fetching, setFetching] = useState<boolean>(false);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [selectedExec, setSelectedExec] = useState<string>('');
  const loadUsers = async () => {
    const { data, error } = await supabase.rpc('get_all_user_profiles');
    if (!error && data) setUsers(data as PreviewUser[]);
  };

  useEffect(() => { loadUsers(); }, []);

  useEffect(() => {
    // Load initial role/exec for chosen user
    const loadUserMeta = async () => {
      if (!selectedUserId) return;
      const { data } = await supabase
        .from('gw_profiles')
        .select('role, exec_board_role, is_exec_board')
        .eq('user_id', selectedUserId)
        .maybeSingle();
      if (data) {
        setSelectedRole(data.role || 'member');
        setSelectedExec(data.exec_board_role || '');
      }
    };
    loadUserMeta();
  }, [selectedUserId]);

  const doPreview = async () => {
    if (!selectedUserId) return;
    setFetching(true);
    const { data, error } = await supabase.rpc('get_user_modules_combined', { user_id_param: selectedUserId });
    if (!error && data) setEffective(data as CombinedPermRow[]);
    setFetching(false);
  };

  const updateRole = async () => {
    if (!selectedUserId || !selectedRole) return;
    const { error } = await supabase
      .from('gw_profiles')
      .update({ role: selectedRole })
      .eq('user_id', selectedUserId);
    if (error) {
      toast.error('Failed to update role');
    } else {
      toast.success('Role updated');
      await doPreview();
    }
  };

  const assignExecutive = async () => {
    if (!selectedUserId || !selectedExec) return;
    const currentYear = new Date().getFullYear().toString();

    // Deactivate existing for year
    await supabase
      .from('gw_executive_board_members')
      .update({ is_active: false })
      .eq('user_id', selectedUserId)
      .eq('academic_year', currentYear);

    // Upsert position for this year
    const { data: existing } = await supabase
      .from('gw_executive_board_members')
      .select('*')
      .eq('user_id', selectedUserId)
      .eq('position', selectedExec as any)
      .eq('academic_year', currentYear)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('gw_executive_board_members')
        .update({ is_active: true })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('gw_executive_board_members')
        .insert({ user_id: selectedUserId, position: selectedExec as any, academic_year: currentYear, is_active: true });
    }

    // Update profile flags
    await supabase
      .from('gw_profiles')
      .update({ is_exec_board: true, exec_board_role: selectedExec })
      .eq('user_id', selectedUserId);

    toast.success('Executive position assigned');
    await doPreview();
  };

  if (loading) return <LoadingSpinner />;

  const roleOptions = Object.values(USER_ROLES) as string[];

  return (
    <main className="container mx-auto px-4 py-6">
      <PageHeader 
        title="Permissions"
        description="Simplified role-based controls with user preview and advanced tools."
        backgroundVariant="gradient"
        showBackButton
        backTo="/admin"
      />

      <Tabs defaultValue="preview" className="mt-4">
        <TabsList className="bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <TabsTrigger value="preview">Preview as User</TabsTrigger>
          <TabsTrigger value="roles">Roles Matrix</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        <TabsContent value="preview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="min-w-64">
                      <Input
                        placeholder="Search users (name or email)"
                        aria-label="Search users"
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                      />
                    </div>
                    <div className="min-w-64">
                      <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                        <SelectTrigger aria-label="Select user">
                          <SelectValue placeholder="Select a user" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover z-50">
                          {filteredUsers.length > 0 ? (
                            filteredUsers.map(u => (
                              <SelectItem key={u.id} value={u.id}>
                                {u.full_name || u.email} ({u.email})
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="__no_results__" disabled>
                              No users found
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <Button onClick={doPreview} disabled={!selectedUserId || fetching}>Preview</Button>

                    <div className="min-w-56">
                      <Select value={selectedRole} onValueChange={setSelectedRole}>
                        <SelectTrigger aria-label="Select role">
                          <SelectValue placeholder="Role" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover z-50">
                          {roleOptions.map((r) => (
                            <SelectItem key={r} value={r}>{r === 'super-admin' ? 'Director' : r}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button variant="outline" onClick={updateRole} disabled={!selectedUserId}>Update Role</Button>

                    <div className="min-w-56">
                      <Select value={selectedExec} onValueChange={setSelectedExec}>
                        <SelectTrigger aria-label="Select executive position">
                          <SelectValue placeholder="Executive position" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover z-50">
                          {EXECUTIVE_POSITIONS.map((p) => (
                            <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button variant="outline" onClick={assignExecutive} disabled={!selectedUserId || !selectedExec}>Assign Exec</Button>
                  </div>

                  {selectedUserId && (
                    <div className="mt-6 space-y-6">
                      <UserModuleMatrix userId={selectedUserId} />

                      {effective.length > 0 && (
                        <div className="overflow-x-auto mt-2">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-left">
                                <th className="py-2 px-2">Module</th>
                                <th className="py-2 px-2">Access</th>
                                <th className="py-2 px-2">Manage</th>
                                <th className="py-2 px-2">Sources</th>
                                <th className="py-2 px-2">Raw</th>
                              </tr>
                            </thead>
                            <tbody>
                              {effective.map(row => (
                                <tr key={row.module_name} className="border-b last:border-b-0">
                                  <td className="py-2 px-2">{row.module_name}</td>
                                  <td className="py-2 px-2">{row.can_access ? 'Yes' : 'No'}</td>
                                  <td className="py-2 px-2">{row.can_manage ? 'Yes' : 'No'}</td>
                                  <td className="py-2 px-2">
                                    <div className="flex gap-2 flex-wrap">
                                      {row.sources.map(s => (
                                        <Badge key={s} variant="secondary">{s}</Badge>
                                      ))}
                                    </div>
                                  </td>
                                  <td className="py-2 px-2">{row.permissions.join(', ')}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {selectedUserId && (
              <div className="relative z-50 pointer-events-auto">
                <SelectedUserProfileCard userId={selectedUserId} />
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="roles" className="space-y-4">
          <RoleModuleMatrix />
        </TabsContent>

        <TabsContent value="advanced">
          <PermissionManagement />
        </TabsContent>
      </Tabs>
    </main>
  );
};

export default PermissionsPage;