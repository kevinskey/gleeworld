import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Users, Plus, X } from 'lucide-react';
import { usePermissionGroups, useUserGroupAssignments, type PermissionGroup } from '@/hooks/usePermissionGroups';
import { supabase } from '@/integrations/supabase/client';

interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
}

interface UserWithGroups extends User {
  user_permission_groups: Array<{
    id: string;
    group_id: string;
    is_active: boolean;
    expires_at: string | null;
    permission_groups: {
      id: string;
      name: string;
      color: string;
    };
  }>;
}

const AssignGroupDialog = ({
  user,
  open,
  onOpenChange,
  onAssign
}: {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssign: () => void;
}) => {
  const { groups } = usePermissionGroups();
  const { assignUserToGroup } = useUserGroupAssignments();
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [expiresAt, setExpiresAt] = useState('');

  const handleAssign = async () => {
    if (!user || selectedGroups.length === 0) return;

    const promises = selectedGroups.map(groupId =>
      assignUserToGroup(user.id, groupId, expiresAt || undefined)
    );

    const results = await Promise.all(promises);
    
    if (results.every(Boolean)) {
      onAssign();
      onOpenChange(false);
      setSelectedGroups([]);
      setExpiresAt('');
    }
  };

  const toggleGroup = (groupId: string) => {
    setSelectedGroups(prev =>
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Permission Groups</DialogTitle>
          <DialogDescription>
            {user && `Assign permission groups to ${user.full_name || user.email}`}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Permission Groups</Label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {groups.map(group => (
                <div key={group.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={group.id}
                    checked={selectedGroups.includes(group.id)}
                    onCheckedChange={() => toggleGroup(group.id)}
                  />
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: group.color }}
                    />
                    <Label htmlFor={group.id} className="text-sm font-normal">
                      {group.name}
                    </Label>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <Label htmlFor="expires">Expires At (Optional)</Label>
            <Input
              id="expires"
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAssign}
              disabled={selectedGroups.length === 0}
            >
              Assign Groups
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const UserGroupAssignment = () => {
  const [users, setUsers] = useState<UserWithGroups[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const { removeUserFromGroup } = useUserGroupAssignments();

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // First get all users
      const { data: usersData, error: usersError } = await supabase
        .from('gw_profiles')
        .select('user_id, email, full_name, role');

      if (usersError) throw usersError;

      // Then get their group assignments
      const userIds = usersData?.map(u => u.user_id) || [];
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('user_permission_groups')
        .select(`
          id,
          user_id,
          group_id,
          is_active,
          expires_at,
          permission_groups (
            id,
            name,
            color
          )
        `)
        .in('user_id', userIds)
        .eq('is_active', true);

      if (assignmentsError) throw assignmentsError;

      // Combine the data
      const usersWithGroups = usersData?.map(user => ({
        id: user.user_id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        user_permission_groups: assignmentsData?.filter(a => a.user_id === user.user_id) || []
      })) || [];

      setUsers(usersWithGroups as UserWithGroups[]);
    } catch (err: any) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFromGroup = async (userId: string, groupId: string) => {
    const success = await removeUserFromGroup(userId, groupId);
    if (success) {
      await fetchUsers();
    }
  };

  const handleAssignGroups = () => {
    fetchUsers();
  };

  const filteredUsers = users.filter(user =>
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    fetchUsers();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading users...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">User Group Assignments</h2>
          <p className="text-muted-foreground">
            Manage which permission groups users belong to
          </p>
        </div>
        <Button onClick={() => setAssignDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Assign Groups
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="space-y-4">
        {filteredUsers.map(user => (
          <Card key={user.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">
                    {user.full_name || user.email}
                  </CardTitle>
                  <CardDescription>
                    {user.email} • Role: {user.role}
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedUser(user);
                    setAssignDialogOpen(true);
                  }}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Assign
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {user.user_permission_groups.length === 0 ? (
                  <span className="text-sm text-muted-foreground">No groups assigned</span>
                ) : (
                  user.user_permission_groups.map(assignment => (
                    <Badge
                      key={assignment.id}
                      variant="secondary"
                      className="flex items-center gap-2"
                      style={{
                        backgroundColor: `${assignment.permission_groups.color}20`,
                        borderColor: assignment.permission_groups.color,
                        color: assignment.permission_groups.color
                      }}
                    >
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: assignment.permission_groups.color }}
                      />
                      {assignment.permission_groups.name}
                      {assignment.expires_at && (
                        <span className="text-xs opacity-70">
                          (expires {new Date(assignment.expires_at).toLocaleDateString()})
                        </span>
                      )}
                      <button
                        onClick={() => handleRemoveFromGroup(user.id, assignment.group_id)}
                        className="ml-1 hover:bg-red-500 hover:text-white rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AssignGroupDialog
        user={selectedUser}
        open={assignDialogOpen}
        onOpenChange={(open) => {
          setAssignDialogOpen(open);
          if (!open) setSelectedUser(null);
        }}
        onAssign={handleAssignGroups}
      />
    </div>
  );
};