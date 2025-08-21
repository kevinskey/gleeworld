
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Permission {
  id: string;
  user_email: string;
  module_name: string;
  granted_at: string;
  expires_at: string | null;
  notes: string | null;
}

export const UsernamePermissionsManager = () => {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newModule, setNewModule] = useState('');
  const { toast } = useToast();

  const fetchPermissions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('username_permissions')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPermissions(data || []);
    } catch (err: any) {
      toast({
        title: "Error",
        description: "Failed to fetch permissions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const grantPermission = async () => {
    if (!newEmail || !newModule) return;

    try {
      const { error } = await supabase
        .from('username_permissions')
        .upsert({
          user_email: newEmail,
          module_name: newModule,
          is_active: true
        });

      if (error) throw error;

      toast({
        title: "Permission Granted",
        description: `${newModule} access granted to ${newEmail}`,
      });

      setNewEmail('');
      setNewModule('');
      fetchPermissions();
    } catch (err: any) {
      toast({
        title: "Error",
        description: "Failed to grant permission",
        variant: "destructive",
      });
    }
  };

  const revokePermission = async (id: string) => {
    try {
      const { error } = await supabase
        .from('username_permissions')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Permission Revoked",
        description: "Permission has been revoked",
      });

      fetchPermissions();
    } catch (err: any) {
      toast({
        title: "Error",
        description: "Failed to revoke permission",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Grant New Permission</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              placeholder="User email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
            />
            <Input
              placeholder="Module name"
              value={newModule}
              onChange={(e) => setNewModule(e.target.value)}
            />
          </div>
          <Button onClick={grantPermission} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Grant Permission
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading permissions...</p>
          ) : (
            <div className="space-y-2">
              {permissions.map((permission) => (
                <div key={permission.id} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <Badge variant="outline">{permission.user_email}</Badge>
                    <span className="ml-2">{permission.module_name}</span>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => revokePermission(permission.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
