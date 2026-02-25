import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Search, UserCog, Shield, Crown, User, UserCheck, UserX, Mail, Calendar, MoreHorizontal, RefreshCw, UserPlus, Users, Settings, KeyRound, Trash2, GraduationCap, FolderOpen, Star } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

import { DeleteUserDialog } from './DeleteUserDialog';
import { ResetPasswordDialog } from './ResetPasswordDialog';

import { UserModuleAssignment } from './UserModuleAssignment';
import { RoleBasedModuleAssignment } from './RoleBasedModuleAssignment';
import { UsernamePermissionsManager } from './UsernamePermissionsManager';
import { PermissionErrorBoundary } from './PermissionErrorBoundary';
import { useAutoEnrollUser } from '@/hooks/useAutoEnrollUser';
import { usePermissionGroups } from '@/hooks/usePermissionGroups';
import MemberDossiersModule from '@/components/modules/member-dossiers/MemberDossiersModule';
import type { User as AdminUser } from '@/hooks/useUsers';

interface UserProfile {
  id: string;
  user_id?: string;
  email: string | null;
  full_name: string | null;
  role: string;
  exec_board_role?: string | null;
  is_exec_board?: boolean;
  is_admin?: boolean;
  is_super_admin?: boolean;
  verified?: boolean;
  avatar_url?: string | null;
  created_at: string;
  last_sign_in_at?: string;
}

const getRoleBadgeColor = (role?: string) => {
  switch (role) {
    case 'super-admin': return 'bg-red-500/20 text-red-400 border-red-500/30';
    case 'admin': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    case 'executive': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'student': return 'bg-green-500/20 text-green-400 border-green-500/30';
    case 'alumna': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    case 'vip': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    case 'auditioner': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    default: return 'bg-muted text-muted-foreground border-border';
  }
};

const getRoleIcon = (role?: string) => {
  switch (role) {
    case 'super-admin': return <Crown className="h-3 w-3" />;
    case 'admin': return <Shield className="h-3 w-3" />;
    case 'executive': return <UserCog className="h-3 w-3" />;
    case 'alumna': return <GraduationCap className="h-3 w-3" />;
    case 'vip': return <Star className="h-3 w-3" />;
    case 'auditioner': return <Calendar className="h-3 w-3" />;
    default: return <User className="h-3 w-3" />;
  }
};

// Compact stat pill
const StatPill = ({ label, value, icon: Icon }: { label: string; value: number; icon: React.ElementType }) => (
  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card/60 border border-border/50">
    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
    <span className="text-xs text-muted-foreground">{label}</span>
    <span className="text-sm font-bold text-foreground">{value}</span>
  </div>
);

export const UnifiedUserManagement = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('');
  const { toast } = useToast();
  const { autoEnrollUser, enrolling } = useAutoEnrollUser();

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data: profiles, error } = await supabase
        .from('gw_profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setUsers(profiles || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({ title: "Error", description: "Failed to load users.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = !searchTerm || 
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        user.email?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, searchTerm, roleFilter]);

  const userStats = useMemo(() => ({
    total: users.length,
    admins: users.filter(u => u.role === 'admin' || u.role === 'super-admin').length,
    students: users.filter(u => u.role === 'student').length,
    executives: users.filter(u => u.role === 'executive' || u.is_exec_board).length,
    vips: users.filter(u => u.role === 'vip').length,
    alumnae: users.filter(u => u.role === 'alumna').length,
    verified: users.filter(u => u.verified).length,
  }), [users]);

  const handleQuickRoleChange = async (userId: string, newRole: string) => {
    try {
      const { data, error } = await supabase
        .from('gw_profiles')
        .update({ role: newRole })
        .eq('user_id', userId)
        .select();
      if (error) throw error;
      if (!data || data.length === 0) throw new Error('Update failed - insufficient permissions');
      setUsers(users.map(u => u.user_id === userId ? { ...u, role: newRole } : u));
      toast({ title: "Role Updated", description: `User role changed to ${newRole}` });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to update role", variant: "destructive" });
    }
  };

  const handleVerificationToggle = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('gw_profiles')
        .update({ verified: !currentStatus })
        .eq('user_id', userId);
      if (error) throw error;
      setUsers(users.map(u => u.user_id === userId ? { ...u, verified: !currentStatus } : u));
      toast({ title: "Status Updated", description: `User ${!currentStatus ? 'verified' : 'unverified'}` });
    } catch (error) {
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
    }
  };

  const handleAutoEnroll = async () => {
    if (!email || !role) return;
    try {
      const result = await autoEnrollUser(email, fullName || undefined, undefined, role);
      if (result.success && result.enrolled) {
        setEmail(''); setFullName(''); setRole('');
        await fetchUsers();
      }
    } catch (error) {
      console.error('Auto-enroll error:', error);
    }
  };

  const makeUserObj = (user: UserProfile): AdminUser => ({
    id: user.user_id!,
    email: user.email,
    full_name: user.full_name,
    role: user.role,
    created_at: user.created_at,
    exec_board_role: user.exec_board_role ?? null,
    is_exec_board: !!user.is_exec_board,
    avatar_url: user.avatar_url ?? null,
    verified: !!user.verified,
    is_admin: !!user.is_admin,
    is_super_admin: !!user.is_super_admin,
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" text="Loading users..." />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Compact header with inline stats */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">User Management</h1>
            <p className="text-sm text-muted-foreground">
              {userStats.total} users · {userStats.verified} verified
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchUsers} disabled={loading} className="gap-1.5">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Stat pills row */}
        <div className="flex flex-wrap gap-2">
          <StatPill label="Total" value={userStats.total} icon={Users} />
          <StatPill label="Admins" value={userStats.admins} icon={Shield} />
          <StatPill label="Students" value={userStats.students} icon={User} />
          <StatPill label="Alumnae" value={userStats.alumnae} icon={GraduationCap} />
          <StatPill label="VIP" value={userStats.vips} icon={Star} />
          <StatPill label="Exec" value={userStats.executives} icon={Settings} />
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="users" className="space-y-3">
        <TabsList className="h-9 bg-muted/50">
          <TabsTrigger value="users" className="text-xs px-3 h-7">Users</TabsTrigger>
          <TabsTrigger value="dossiers" className="text-xs px-3 h-7">Dossiers</TabsTrigger>
          <TabsTrigger value="enroll" className="text-xs px-3 h-7">Add User</TabsTrigger>
          <TabsTrigger value="modules" className="text-xs px-3 h-7">Modules</TabsTrigger>
        </TabsList>

        {/* ── USERS TAB ── */}
        <TabsContent value="users" className="space-y-3 mt-0">
          {/* Search + Filter bar */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search name or email..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9 h-9 bg-card border-border text-sm"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-[160px] h-9 bg-card border-border text-sm">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="guest">Guest</SelectItem>
                <SelectItem value="fan">Fan</SelectItem>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="student">Student</SelectItem>
                <SelectItem value="alumna">Alumna</SelectItem>
                <SelectItem value="vip">VIP</SelectItem>
                <SelectItem value="executive">Executive</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="super-admin">Super Admin</SelectItem>
                <SelectItem value="auditioner">Auditioner</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <p className="text-xs text-muted-foreground">
            Showing {filteredUsers.length} of {users.length}
          </p>

          {/* Mobile card list */}
          <div className="sm:hidden space-y-2">
            {filteredUsers.map(user => (
              <div key={user.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-card border border-border">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-xs font-medium text-primary">
                  {user.full_name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate text-foreground">{user.full_name || 'No name'}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
                <Badge variant="outline" className={`text-[10px] shrink-0 ${getRoleBadgeColor(user.role)}`}>
                  {getRoleIcon(user.role)}
                  <span className="ml-1">{user.role || 'guest'}</span>
                </Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 max-h-[300px] overflow-y-auto">
                    <DropdownMenuLabel className="text-xs">Actions</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => { setSelectedUser(makeUserObj(user)); setShowResetDialog(true); }}>
                      <KeyRound className="h-3.5 w-3.5 mr-2 text-blue-400" />Reset Password
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleVerificationToggle(user.user_id!, user.verified || false)}>
                      {user.verified ? <><UserX className="h-3.5 w-3.5 mr-2 text-yellow-400" />Unverify</> : <><UserCheck className="h-3.5 w-3.5 mr-2 text-green-400" />Verify</>}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setSelectedUser(makeUserObj(user)); setDeleteDialogOpen(true); }} className="text-destructive">
                      <Trash2 className="h-3.5 w-3.5 mr-2" />Delete
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-xs">Change Role</DropdownMenuLabel>
                    {['guest','fan','student','member','alumna','vip','executive','admin','super-admin'].map(r => (
                      <DropdownMenuItem key={r} onClick={() => handleQuickRoleChange(user.user_id!, r)} disabled={user.role === r} className="text-xs">
                        {getRoleIcon(r)}<span className="ml-1.5 capitalize">{r.replace('-', ' ')}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="text-xs font-semibold text-muted-foreground h-9">User</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground h-9">Role</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground h-9">Status</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground h-9">Joined</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground h-9 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map(user => (
                  <TableRow key={user.id} className="h-11 hover:bg-muted/20">
                    <TableCell className="py-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary shrink-0">
                          {user.avatar_url ? (
                            <img src={user.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                          ) : (
                            user.full_name?.charAt(0)?.toUpperCase() || '?'
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate text-foreground leading-tight">{user.full_name || 'No name'}</p>
                          <p className="text-xs text-muted-foreground truncate leading-tight">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-2">
                      <Badge variant="outline" className={`text-[11px] py-0 h-5 ${getRoleBadgeColor(user.role)}`}>
                        {getRoleIcon(user.role)}
                        <span className="ml-1">{user.role || 'guest'}</span>
                      </Badge>
                      {user.is_exec_board && (
                        <Badge variant="outline" className="ml-1 text-[10px] py-0 h-5 text-blue-400 border-blue-400/30">
                          {user.exec_board_role || 'Exec'}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="py-2">
                      {user.verified ? (
                        <span className="inline-flex items-center gap-1 text-xs text-green-400">
                          <UserCheck className="h-3 w-3" /> Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-yellow-400">
                          <Calendar className="h-3 w-3" /> Pending
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="py-2">
                      <span className="text-xs text-muted-foreground">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
                      </span>
                    </TableCell>
                    <TableCell className="py-2 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 max-h-[400px] overflow-y-auto z-50">
                          <DropdownMenuLabel className="text-xs">Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => { setSelectedUser(makeUserObj(user)); setShowResetDialog(true); }}>
                            <KeyRound className="h-3.5 w-3.5 mr-2 text-blue-400" />Reset Password
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleVerificationToggle(user.user_id!, user.verified || false)}>
                            {user.verified ? <><UserX className="h-3.5 w-3.5 mr-2 text-yellow-400" />Unverify</> : <><UserCheck className="h-3.5 w-3.5 mr-2 text-green-400" />Verify</>}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setSelectedUser(makeUserObj(user)); setDeleteDialogOpen(true); }} className="text-destructive">
                            <Trash2 className="h-3.5 w-3.5 mr-2" />Delete
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel className="text-xs">Change Role</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {['vip','guest','fan','student','member','alumna','executive','admin','super-admin','auditioner'].map(r => (
                            <DropdownMenuItem key={r} onClick={() => handleQuickRoleChange(user.user_id!, r)} disabled={user.role === r} className="text-xs">
                              {getRoleIcon(r)}<span className="ml-1.5 capitalize">{r.replace('-', ' ')}</span>
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ── DOSSIERS TAB ── */}
        <TabsContent value="dossiers" className="mt-0">
          <MemberDossiersModule />
        </TabsContent>

        {/* ── ADD USER TAB ── */}
        <TabsContent value="enroll" className="mt-0">
          <Card className="bg-card border-border max-w-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-foreground">
                <UserPlus className="h-4 w-4" />
                Auto-Enroll User
              </CardTitle>
              <CardDescription className="text-xs">
                Create an account and send an invitation email
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs">Email *</Label>
                <Input id="email" type="email" placeholder="user@spelman.edu" value={email} onChange={e => setEmail(e.target.value)} className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fullName" className="text-xs">Full Name</Label>
                <Input id="fullName" placeholder="Alexandra Williams" value={fullName} onChange={e => setFullName(e.target.value)} className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="role" className="text-xs">Role *</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="auditioner">Auditioner</SelectItem>
                    <SelectItem value="alumna">Alumna</SelectItem>
                    <SelectItem value="fan">Fan</SelectItem>
                    <SelectItem value="executive">Executive</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAutoEnroll} disabled={!email.trim() || !role || enrolling} className="w-full h-9 text-sm mt-2">
                {enrolling ? 'Enrolling...' : <><UserPlus className="h-3.5 w-3.5 mr-1.5" />Enroll User</>}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── MODULES TAB ── */}
        <TabsContent value="modules" className="mt-0 space-y-3">
          <PermissionErrorBoundary>
            <RoleBasedModuleAssignment />
            <UserModuleAssignment />
            <UsernamePermissionsManager />
          </PermissionErrorBoundary>
        </TabsContent>
      </Tabs>

      <ResetPasswordDialog user={selectedUser} open={showResetDialog} onOpenChange={setShowResetDialog} />
      <DeleteUserDialog user={selectedUser} open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} onUserDeleted={() => { setSelectedUser(null); fetchUsers(); }} />
    </div>
  );
};
