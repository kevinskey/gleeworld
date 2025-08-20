import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Users, User, Settings, ChevronRight } from 'lucide-react';
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
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const { toast } = useToast();

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

  const handleBulkAssign = async () => {
    if (!selectedModule) return;

    try {
      // Assign to selected users
      for (const userId of selectedUsers) {
        await createAssignment({
          module_name: selectedModule.name,
          assignment_type: 'individual',
          assigned_to_user_id: userId,
          permissions: ['view'],
          notes: 'Bulk assignment',
        });
      }

      // Assign to selected groups
      for (const group of selectedGroups) {
        await createAssignment({
          module_name: selectedModule.name,
          assignment_type: 'group',
          assigned_to_group: group,
          permissions: ['view', 'manage'],
          notes: 'Bulk group assignment',
        });
      }

      // Reset selections
      setSelectedUsers([]);
      setSelectedGroups([]);
      setSelectedModule(null);
      
      toast({
        title: "Success",
        description: "Assignments created successfully",
      });
    } catch (error) {
      toast({
        title: "Error", 
        description: "Failed to create assignments",
        variant: "destructive",
      });
    }
  };

  const getModuleIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'system':
        return <Settings className="h-5 w-5" />;
      case 'education':
        return <User className="h-5 w-5" />;
      default:
        return <Users className="h-5 w-5" />;
    }
  };

  const getCurrentAssignments = (moduleName: string) => {
    return assignments.filter(a => a.module_name === moduleName);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (selectedModule) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => setSelectedModule(null)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Modules
          </Button>
          <div>
            <h2 className="text-2xl font-bold">Assign Users to {selectedModule.name}</h2>
            <p className="text-muted-foreground">{selectedModule.description}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Groups */}
          <Card>
            <CardHeader>
              <CardTitle>Assign to Groups</CardTitle>
              <CardDescription>Select groups to assign this module to</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {groupOptions.map((group) => (
                <div key={group.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`group-${group.value}`}
                    checked={selectedGroups.includes(group.value)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedGroups([...selectedGroups, group.value]);
                      } else {
                        setSelectedGroups(selectedGroups.filter(g => g !== group.value));
                      }
                    }}
                  />
                  <label
                    htmlFor={`group-${group.value}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {group.label}
                  </label>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Individual Users */}
          <Card>
            <CardHeader>
              <CardTitle>Assign to Individual Users</CardTitle>
              <CardDescription>Select specific users to assign this module to</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-h-96 overflow-y-auto">
              {users.map((user) => (
                <div key={user.user_id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`user-${user.user_id}`}
                    checked={selectedUsers.includes(user.user_id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedUsers([...selectedUsers, user.user_id]);
                      } else {
                        setSelectedUsers(selectedUsers.filter(u => u !== user.user_id));
                      }
                    }}
                  />
                  <label
                    htmlFor={`user-${user.user_id}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                  >
                    <div>{user.full_name}</div>
                    <div className="text-xs text-muted-foreground">{user.email} • {user.role}</div>
                  </label>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Current Assignments for this module */}
        <Card>
          <CardHeader>
            <CardTitle>Current Assignments</CardTitle>
            <CardDescription>
              Who currently has access to {selectedModule.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(() => {
              const currentAssignments = getCurrentAssignments(selectedModule.name);
              if (currentAssignments.length === 0) {
                return (
                  <p className="text-muted-foreground text-center py-4">
                    No current assignments for this module
                  </p>
                );
              }
              return (
                <div className="space-y-2">
                  {currentAssignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        {assignment.assignment_type === 'individual' ? <User className="h-4 w-4" /> : <Users className="h-4 w-4" />}
                        <span className="text-sm">
                          {assignment.assignment_type === 'individual' 
                            ? assignment.assigned_user_name 
                            : assignment.assigned_to_group
                          }
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {assignment.assignment_type}
                        </Badge>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteAssignment(assignment.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              );
            })()}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        {(selectedUsers.length > 0 || selectedGroups.length > 0) && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {selectedUsers.length} users and {selectedGroups.length} groups selected
                </div>
                <Button onClick={handleBulkAssign}>
                  Assign Selected ({selectedUsers.length + selectedGroups.length})
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Module Assignment Manager</h2>
        <p className="text-muted-foreground">
          Select a module to assign it to multiple users and groups
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {modules.map((module) => {
          const currentAssignments = getCurrentAssignments(module.name);
          return (
            <Card 
              key={module.id} 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedModule(module)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getModuleIcon(module.category)}
                    <div>
                      <h3 className="font-medium">{module.name}</h3>
                      <p className="text-xs text-muted-foreground">{module.category}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground mt-2 mb-3">
                  {module.description}
                </p>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    {currentAssignments.length} assignment{currentAssignments.length !== 1 ? 's' : ''}
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {module.category}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};