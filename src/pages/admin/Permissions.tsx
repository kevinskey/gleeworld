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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

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
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [effective, setEffective] = useState<CombinedPermRow[]>([]);
  const [fetching, setFetching] = useState<boolean>(false);

  const loadUsers = async () => {
    const { data, error } = await supabase.rpc('get_all_user_profiles');
    if (!error && data) setUsers(data as PreviewUser[]);
  };

  useEffect(() => { loadUsers(); }, []);

  const doPreview = async () => {
    if (!selectedUserId) return;
    setFetching(true);
    const { data, error } = await supabase.rpc('get_user_modules_combined', { user_id_param: selectedUserId });
    if (!error && data) setEffective(data as CombinedPermRow[]);
    setFetching(false);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <main className="container mx-auto px-4 py-6">
      <PageHeader 
        title="Permissions"
        description="Simplified role-based controls with user preview and advanced tools."
      />

      <Tabs defaultValue="roles" className="mt-4">
        <TabsList>
          <TabsTrigger value="roles">Roles Matrix</TabsTrigger>
          <TabsTrigger value="preview">Preview as User</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        <TabsContent value="roles" className="space-y-4">
          <RoleModuleMatrix />
        </TabsContent>

        <TabsContent value="preview" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap items-center gap-4">
                <div className="min-w-64">
                  <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                    <SelectTrigger aria-label="Select user">
                      <SelectValue placeholder="Select a user" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map(u => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.full_name || u.email} ({u.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={doPreview} disabled={!selectedUserId || fetching}>Preview</Button>
              </div>

              {effective.length > 0 && (
                <div className="overflow-x-auto mt-6">
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced">
          <PermissionManagement />
        </TabsContent>
      </Tabs>
    </main>
  );
};

export default PermissionsPage;