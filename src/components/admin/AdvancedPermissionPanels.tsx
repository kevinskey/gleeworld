import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { 
  Shield, 
  Users, 
  Settings, 
  Search, 
  Filter, 
  UserPlus, 
  Key, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  Edit,
  Trash2,
  Download,
  Upload,
  RefreshCw,
  Archive,
  BarChart3,
  Activity
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { usePermissionGroups } from '@/hooks/usePermissionGroups';
import { COMPREHENSIVE_FUNCTIONS_LIST, FUNCTION_CATEGORIES } from '@/constants/granularPermissions';

interface UserPermissionSummary {
  user_id: string;
  full_name: string;
  email: string;
  role: string;
  is_exec_board: boolean;
  exec_board_role?: string;
  groups: Array<{
    id: string;
    name: string;
    color: string;
    expires_at?: string;
  }>;
  individual_permissions: Array<{
    permission_id: string;
    permission_name: string;
    level: string;
    scope: string;
    expires_at?: string;
  }>;
}

interface PermissionAuditLog {
  id: string;
  action_type: string;
  target_user_id: string;
  target_user_name: string;
  permission_id?: string;
  permission_name?: string;
  old_value?: string;
  new_value?: string;
  performed_by: string;
  performed_by_name: string;
  timestamp: string;
  notes?: string;
}

// User Permission Overview Panel
const UserPermissionOverview = () => {
  const [users, setUsers] = useState<UserPermissionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const { toast } = useToast();

  const fetchUserPermissions = async () => {
    try {
      setLoading(true);
      const { data: profiles, error } = await supabase
        .from('gw_profiles')
        .select(`
          user_id,
          full_name,
          email,
          role,
          is_exec_board,
          exec_board_role
        `)
        .order('full_name');

      if (error) throw error;

      // Fetch permission groups for each user
      const usersWithPermissions = await Promise.all(
        (profiles || []).map(async (profile) => {
          // Get user's permission groups
          const { data: groupAssignments } = await supabase
            .from('user_permission_groups')
            .select(`
              expires_at,
              permission_groups (
                id,
                name,
                color
              )
            `)
            .eq('user_id', profile.user_id)
            .eq('is_active', true);

          // Get individual permissions
          const { data: individualPerms } = await supabase
            .from('username_permissions')
            .select('*')
            .eq('user_email', profile.email)
            .eq('is_active', true);

          return {
            ...profile,
            groups: (groupAssignments || []).map(ga => ({
              id: ga.permission_groups?.id || '',
              name: ga.permission_groups?.name || '',
              color: ga.permission_groups?.color || '#6366f1',
              expires_at: ga.expires_at
            })),
            individual_permissions: (individualPerms || []).map(ip => ({
              permission_id: ip.module_name,
              permission_name: ip.module_name,
              level: 'access',
              scope: 'system',
              expires_at: ip.expires_at
            }))
          };
        })
      );

      setUsers(usersWithPermissions);
    } catch (err) {
      console.error('Error fetching user permissions:', err);
      toast({
        title: "Error",
        description: "Failed to fetch user permissions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserPermissions();
  }, []);

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const statsCards = [
    {
      title: 'Total Users',
      value: users.length,
      icon: Users,
      color: 'text-blue-600'
    },
    {
      title: 'With Groups',
      value: users.filter(u => u.groups.length > 0).length,
      icon: Shield,
      color: 'text-green-600'
    },
    {
      title: 'Executive Board',
      value: users.filter(u => u.is_exec_board).length,
      icon: Key,
      color: 'text-purple-600'
    },
    {
      title: 'Expiring Soon',
      value: users.filter(u => 
        u.groups.some(g => g.expires_at && new Date(g.expires_at) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))
      ).length,
      icon: AlertTriangle,
      color: 'text-orange-600'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>User Permission Management</CardTitle>
          <CardDescription>Manage and monitor user permissions across the platform</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="alumna">Alumna</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="super-admin">Super Admin</SelectItem>
                <SelectItem value="executive">Executive</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={fetchUserPermissions} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-96">
            <div className="space-y-2 p-4">
              {loading ? (
                <div className="text-center py-8">Loading users...</div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No users found</div>
              ) : (
                filteredUsers.map((user) => (
                  <div key={user.user_id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{user.full_name}</h4>
                        <Badge variant="outline">{user.role}</Badge>
                        {user.is_exec_board && (
                          <Badge variant="secondary">{user.exec_board_role || 'Executive'}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {user.groups.map((group) => (
                          <Badge
                            key={group.id}
                            variant="outline"
                            style={{ 
                              borderColor: group.color,
                              color: group.color,
                              backgroundColor: `${group.color}10`
                            }}
                          >
                            {group.name}
                            {group.expires_at && (
                              <Clock className="w-3 h-3 ml-1" />
                            )}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        <Eye className="w-3 h-3 mr-1" />
                        View
                      </Button>
                      <Button size="sm" variant="outline">
                        <Edit className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

// Bulk Permission Operations Panel
const BulkPermissionOperations = () => {
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [operation, setOperation] = useState<'assign' | 'remove' | 'transfer'>('assign');
  const [targetGroup, setTargetGroup] = useState('');
  const { groups } = usePermissionGroups();
  const { toast } = useToast();

  const handleBulkOperation = async () => {
    if (selectedUsers.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one user",
        variant: "destructive",
      });
      return;
    }

    try {
      if (operation === 'assign' && targetGroup) {
        const operations = selectedUsers.map(userId => ({
          user_id: userId,
          group_id: targetGroup,
          is_active: true
        }));

        const { error } = await supabase
          .from('user_permission_groups')
          .upsert(operations, { onConflict: 'user_id,group_id' });

        if (error) throw error;

        toast({
          title: "Success",
          description: `Assigned ${selectedUsers.length} users to group`,
        });
      }
      // Add other operations (remove, transfer) as needed
    } catch (err) {
      console.error('Error in bulk operation:', err);
      toast({
        title: "Error",
        description: "Failed to perform bulk operation",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bulk Permission Operations</CardTitle>
        <CardDescription>Perform operations on multiple users at once</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Operation Type</Label>
            <Select value={operation} onValueChange={(value: any) => setOperation(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="assign">Assign to Group</SelectItem>
                <SelectItem value="remove">Remove from Group</SelectItem>
                <SelectItem value="transfer">Transfer Groups</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Target Group</Label>
            <Select value={targetGroup} onValueChange={setTargetGroup}>
              <SelectTrigger>
                <SelectValue placeholder="Select group" />
              </SelectTrigger>
              <SelectContent>
                {groups.map(group => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button onClick={handleBulkOperation} className="w-full">
              Execute Operation
            </Button>
          </div>
        </div>

        <div className="text-sm text-muted-foreground">
          Selected Users: {selectedUsers.length}
        </div>
      </CardContent>
    </Card>
  );
};

// Permission Audit Trail Panel
const PermissionAuditTrail = () => {
  const [auditLogs, setAuditLogs] = useState<PermissionAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('7');

  useEffect(() => {
    fetchAuditLogs();
  }, [dateRange]);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      // This would typically fetch from a dedicated audit table
      // For now, we'll simulate with placeholder data
      setAuditLogs([
        {
          id: '1',
          action_type: 'group_assigned',
          target_user_id: 'user1',
          target_user_name: 'Onnesty Williams',
          permission_id: 'tour_manager_group',
          permission_name: 'Tour Manager',
          performed_by: 'admin1',
          performed_by_name: 'Admin User',
          timestamp: new Date().toISOString(),
          notes: 'Assigned tour manager permissions'
        }
      ]);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Permission Audit Trail</CardTitle>
        <CardDescription>Track all permission changes and administrative actions</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Last 24 hours</SelectItem>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>

        <ScrollArea className="h-64">
          <div className="space-y-2">
            {loading ? (
              <div className="text-center py-8">Loading audit logs...</div>
            ) : auditLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No audit logs found</div>
            ) : (
              auditLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 p-3 border rounded-lg">
                  <Activity className="w-4 h-4 mt-1 text-muted-foreground" />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{log.performed_by_name}</span>
                      <span className="text-sm text-muted-foreground">
                        {log.action_type.replace('_', ' ')}
                      </span>
                      <span className="font-medium">{log.target_user_name}</span>
                      {log.permission_name && (
                        <>
                          <span className="text-sm text-muted-foreground">to</span>
                          <Badge variant="outline">{log.permission_name}</Badge>
                        </>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(log.timestamp).toLocaleString()}
                    </div>
                    {log.notes && (
                      <div className="text-sm text-muted-foreground">{log.notes}</div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

// Main Advanced Permission Panels Component
export const AdvancedPermissionPanels = () => {
  return (
    <Tabs defaultValue="overview" className="space-y-6">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="overview">User Overview</TabsTrigger>
        <TabsTrigger value="bulk">Bulk Operations</TabsTrigger>
        <TabsTrigger value="audit">Audit Trail</TabsTrigger>
        <TabsTrigger value="analytics">Analytics</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-6">
        <UserPermissionOverview />
      </TabsContent>

      <TabsContent value="bulk" className="space-y-6">
        <BulkPermissionOperations />
      </TabsContent>

      <TabsContent value="audit" className="space-y-6">
        <PermissionAuditTrail />
      </TabsContent>

      <TabsContent value="analytics" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Permission Analytics</CardTitle>
            <CardDescription>Coming soon - detailed analytics and reporting</CardDescription>
          </CardHeader>
          <CardContent className="text-center py-12 text-muted-foreground">
            <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Advanced permission analytics and reporting features will be available here.</p>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};