import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UserModuleAssignment {
  id: string;
  user_email: string;
  user_name: string;
  module_key: string;
  module_name: string;
  permission_type: 'view' | 'manage';
  granted_at: string;
}

interface Module {
  key: string;
  name: string;
  description?: string;
  category: string;
}

export function SimpleModuleManager() {
  const [assignments, setAssignments] = useState<UserModuleAssignment[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedModule, setSelectedModule] = useState('');
  const [permissionType, setPermissionType] = useState<'view' | 'manage'>('view');
  const { toast } = useToast();

  // Fetch data
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Get all active modules
      const { data: modulesData, error: modulesError } = await supabase
        .from('gw_modules')
        .select('key, name, description, category')
        .eq('is_active', true)
        .order('name');

      if (modulesError) throw modulesError;

      // Get current assignments with user info
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('gw_role_module_permissions')
        .select(`
          id,
          module_name,
          permission_type,
          granted_at,
          gw_profiles!inner(
            email,
            full_name
          )
        `)
        .eq('is_active', true)
        .order('granted_at', { ascending: false });

      if (assignmentsError) throw assignmentsError;

      setModules(modulesData || []);
      
      // Transform assignments data
      const transformedAssignments = (assignmentsData || []).map(assignment => ({
        id: assignment.id,
        user_email: assignment.gw_profiles.email,
        user_name: assignment.gw_profiles.full_name || assignment.gw_profiles.email,
        module_key: assignment.module_name,
        module_name: assignment.module_name,
        permission_type: assignment.permission_type,
        granted_at: assignment.granted_at
      }));
      
      setAssignments(transformedAssignments);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load module assignments",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const addModuleToUser = async () => {
    if (!selectedUser || !selectedModule) {
      toast({
        title: "Error",
        description: "Please select both a user and module",
        variant: "destructive"
      });
      return;
    }

    try {
      // First get user info
      const { data: userProfile, error: userError } = await supabase
        .from('gw_profiles')
        .select('user_id, role')
        .eq('email', selectedUser)
        .single();

      if (userError) throw userError;

      // Add to role_module_permissions
      const { error } = await supabase
        .from('gw_role_module_permissions')
        .insert({
          role: userProfile.role || 'member',
          module_name: selectedModule,
          permission_type: permissionType,
          granted_by: (await supabase.auth.getUser()).data.user?.id,
          is_active: true
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Module "${selectedModule}" added to user with ${permissionType} permission`
      });

      // Refresh data
      fetchData();
      
      // Reset form
      setSelectedUser('');
      setSelectedModule('');
      setPermissionType('view');
    } catch (error) {
      console.error('Error adding module:', error);
      toast({
        title: "Error",
        description: "Failed to add module to user",
        variant: "destructive"
      });
    }
  };

  const removeAssignment = async (assignmentId: string) => {
    try {
      const { error } = await supabase
        .from('gw_role_module_permissions')
        .update({ is_active: false })
        .eq('id', assignmentId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Module assignment removed"
      });

      fetchData();
    } catch (error) {
      console.error('Error removing assignment:', error);
      toast({
        title: "Error",
        description: "Failed to remove assignment",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add Module to User
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="user-email">User Email</Label>
              <Input
                id="user-email"
                placeholder="user@example.com"
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="module">Module</Label>
              <Select value={selectedModule} onValueChange={setSelectedModule}>
                <SelectTrigger>
                  <SelectValue placeholder="Select module" />
                </SelectTrigger>
                <SelectContent>
                  {modules.map(module => (
                    <SelectItem key={module.key} value={module.key}>
                      {module.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="permission">Permission</Label>
              <Select value={permissionType} onValueChange={(value: 'view' | 'manage') => setPermissionType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">View</SelectItem>
                  <SelectItem value="manage">Manage</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end">
              <Button onClick={addModuleToUser} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Module
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Module Assignments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {assignments.length === 0 ? (
              <p className="text-muted-foreground">No module assignments found</p>
            ) : (
              assignments.map(assignment => (
                <div key={assignment.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-medium">{assignment.user_name}</p>
                      <p className="text-sm text-muted-foreground">{assignment.user_email}</p>
                    </div>
                    <Badge variant="outline">{assignment.module_name}</Badge>
                    <Badge variant={assignment.permission_type === 'manage' ? 'default' : 'secondary'}>
                      {assignment.permission_type}
                    </Badge>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeAssignment(assignment.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}