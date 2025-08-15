import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Users, User, Settings } from 'lucide-react';
import { useModuleAssignments, type CreateAssignmentData } from '@/hooks/useModuleAssignments';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface User {
  user_id: string;
  full_name: string;
  email: string;
  role: string;
}

interface Module {
  id: string;
  name: string;
  description: string;
  category: string;
}

export const ModuleAssignmentManager: React.FC = () => {
  const { assignments, loading, createAssignment, deleteAssignment, refetch } = useModuleAssignments();
  const [users, setUsers] = useState<User[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState<CreateAssignmentData>({
    module_name: '',
    assignment_type: 'individual',
    permissions: ['view'],
  });

  const groupOptions = [
    { value: 'all', label: 'All Users' },
    { value: 'executive_board', label: 'Executive Board' },
    { value: 'admin', label: 'Administrators' },
    { value: 'soprano', label: 'Soprano Section' },
    { value: 'alto', label: 'Alto Section' },
    { value: 'tenor', label: 'Tenor Section' },
    { value: 'bass', label: 'Bass Section' },
    { value: 'member', label: 'Members' },
    { value: 'alumna', label: 'Alumnae' },
  ];

  const permissionOptions = [
    { value: 'view', label: 'View' },
    { value: 'manage', label: 'Manage' },
    { value: 'admin', label: 'Admin' },
  ];

  useEffect(() => {
    fetchUsers();
    fetchModules();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_profiles')
        .select('user_id, full_name, email, role')
        .order('full_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      });
    }
  };

  const fetchModules = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_modules')
        .select('id, name, description, category')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setModules(data || []);
    } catch (error) {
      console.error('Error fetching modules:', error);
      toast({
        title: "Error",
        description: "Failed to fetch modules",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createAssignment(formData);
      setFormData({
        module_name: '',
        assignment_type: 'individual',
        permissions: ['view'],
      });
      setShowCreateForm(false);
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const quickAssignToExecBoard = async (moduleName: string) => {
    try {
      await createAssignment({
        module_name: moduleName,
        assignment_type: 'group',
        assigned_to_group: 'executive_board',
        permissions: ['view', 'manage'],
        notes: 'Quick assignment to executive board',
      });
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const getAssignmentTypeIcon = (type: string) => {
    switch (type) {
      case 'individual':
        return <User className="h-4 w-4" />;
      case 'group':
        return <Users className="h-4 w-4" />;
      case 'role':
        return <Settings className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading assignments...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Module Assignment Manager</h2>
          <p className="text-muted-foreground">
            Assign modules to individuals, groups, or all executive board members
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(!showCreateForm)}>
          <Plus className="h-4 w-4 mr-2" />
          New Assignment
        </Button>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Quickly assign sight reading generator to common groups
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant="outline"
              onClick={() => quickAssignToExecBoard('sight-reading-generator')}
              className="justify-start"
            >
              <Users className="h-4 w-4 mr-2" />
              Assign to Executive Board
            </Button>
            <Button
              variant="outline"
              onClick={() => quickAssignToExecBoard('sight-reading-preview')}
              className="justify-start"
            >
              <Users className="h-4 w-4 mr-2" />
              Assign Preview to Exec Board
            </Button>
            <Button
              variant="outline"
              onClick={() => createAssignment({
                module_name: 'sight-reading-generator',
                assignment_type: 'group',
                assigned_to_group: 'all',
                permissions: ['view'],
              })}
              className="justify-start"
            >
              <Settings className="h-4 w-4 mr-2" />
              Assign to All Users
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Create Assignment Form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Assignment</CardTitle>
            <CardDescription>
              Assign a module to individuals or groups
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="module">Module</Label>
                  <Select
                    value={formData.module_name}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, module_name: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a module" />
                    </SelectTrigger>
                    <SelectContent>
                      {modules.map((module) => (
                        <SelectItem key={module.id} value={module.name}>
                          {module.name} - {module.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="assignmentType">Assignment Type</Label>
                  <Select
                    value={formData.assignment_type}
                    onValueChange={(value: 'individual' | 'group' | 'role') => 
                      setFormData(prev => ({ ...prev, assignment_type: value, assigned_to_user_id: undefined, assigned_to_group: undefined }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">Individual User</SelectItem>
                      <SelectItem value="group">Group/Role</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {formData.assignment_type === 'individual' && (
                <div>
                  <Label htmlFor="user">Assign to User</Label>
                  <Select
                    value={formData.assigned_to_user_id || ''}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, assigned_to_user_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a user" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.user_id} value={user.user_id}>
                          {user.full_name} ({user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {formData.assignment_type === 'group' && (
                <div>
                  <Label htmlFor="group">Assign to Group</Label>
                  <Select
                    value={formData.assigned_to_group || ''}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, assigned_to_group: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a group" />
                    </SelectTrigger>
                    <SelectContent>
                      {groupOptions.map((group) => (
                        <SelectItem key={group.value} value={group.value}>
                          {group.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label htmlFor="expiresAt">Expires At (Optional)</Label>
                <Input
                  type="datetime-local"
                  value={formData.expires_at || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, expires_at: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  value={formData.notes || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Add any notes about this assignment..."
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit">Create Assignment</Button>
                <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Current Assignments */}
      <Card>
        <CardHeader>
          <CardTitle>Current Assignments</CardTitle>
          <CardDescription>
            Manage existing module assignments
          </CardDescription>
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No assignments found. Create your first assignment above.
            </p>
          ) : (
            <div className="space-y-4">
              {assignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {getAssignmentTypeIcon(assignment.assignment_type)}
                      <span className="font-medium">{assignment.module_name}</span>
                      <Badge variant="secondary">{assignment.assignment_type}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Assigned to:{" "}
                      {assignment.assignment_type === 'individual' 
                        ? assignment.assigned_user_name 
                        : assignment.assigned_to_group
                      }
                    </p>
                    <div className="flex gap-1">
                      {assignment.permissions.map((permission) => (
                        <Badge key={permission} variant="outline" className="text-xs">
                          {permission}
                        </Badge>
                      ))}
                    </div>
                    {assignment.expires_at && (
                      <p className="text-xs text-muted-foreground">
                        Expires: {new Date(assignment.expires_at).toLocaleDateString()}
                      </p>
                    )}
                    {assignment.notes && (
                      <p className="text-xs text-muted-foreground">
                        Note: {assignment.notes}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteAssignment(assignment.id)}
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