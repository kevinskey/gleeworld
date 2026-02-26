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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Search, UserCog, Shield, Crown, User, UserCheck, UserX, Mail, Calendar, MoreHorizontal, RefreshCw, UserPlus, Users, Settings, KeyRound, Trash2, GraduationCap, FolderOpen, Star, ArrowUpDown, ArrowUp, ArrowDown, Pencil } from "lucide-react";
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
    case 'super-admin': return 'bg-red-100 text-red-800 border-red-300';
    case 'admin': return 'bg-purple-100 text-purple-800 border-purple-300';
    case 'executive': return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'student': return 'bg-green-100 text-green-800 border-green-300';
    case 'alumna': return 'bg-amber-100 text-amber-800 border-amber-300';
    case 'vip': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'auditioner': return 'bg-orange-100 text-orange-800 border-orange-300';
    default: return 'bg-slate-100 text-slate-700 border-slate-300';
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
  <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-50 border border-slate-200">
    <Icon className="h-3 w-3 text-slate-500" />
    <span className="text-[11px] text-slate-600">{label}</span>
    <span className="text-xs font-bold text-slate-900">{value}</span>
  </div>
);

export const UnifiedUserManagement = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<'name' | 'role' | 'status' | 'joined'>('joined');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [editNameDialogOpen, setEditNameDialogOpen] = useState(false);
  const [editNameUserId, setEditNameUserId] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState('');
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

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const SortIcon = ({ field }: { field: typeof sortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDir === 'asc' ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const filteredUsers = useMemo(() => {
    const filtered = users.filter(user => {
      const matchesSearch = !searchTerm || 
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        user.email?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      return matchesSearch && matchesRole;
    });

    return [...filtered].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      switch (sortField) {
        case 'name':
          return dir * (a.full_name || '').localeCompare(b.full_name || '');
        case 'role':
          return dir * (a.role || '').localeCompare(b.role || '');
        case 'status':
          return dir * (Number(a.verified || 0) - Number(b.verified || 0));
        case 'joined':
          return dir * ((a.created_at || '').localeCompare(b.created_at || ''));
        default:
          return 0;
      }
    });
  }, [users, searchTerm, roleFilter, sortField, sortDir]);

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

  const openEditName = (user: UserProfile) => {
    setEditNameUserId(user.user_id || null);
    setEditNameValue(user.full_name || '');
    setEditNameDialogOpen(true);
  };

  const handleSaveName = async () => {
    if (!editNameUserId || !editNameValue.trim()) return;
    try {
      const { error } = await supabase
        .from('gw_profiles')
        .update({ full_name: editNameValue.trim() })
        .eq('user_id', editNameUserId);
      if (error) throw error;
      setUsers(users.map(u => u.user_id === editNameUserId ? { ...u, full_name: editNameValue.trim() } : u));
      toast({ title: "Name Updated", description: `User name changed to "${editNameValue.trim()}"` });
      setEditNameDialogOpen(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to update name", variant: "destructive" });
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
    <div className="space-y-2">
      {/* Header + stats in one compact block */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Shield className="h-4 w-4 text-primary shrink-0" />
          <h1 className="text-base font-bold text-slate-900 truncate">Users</h1>
          <span className="text-[11px] text-slate-500 whitespace-nowrap">{userStats.total} · {userStats.verified} verified</span>
        </div>
        <Button variant="outline" size="sm" onClick={fetchUsers} disabled={loading} className="gap-1 shrink-0 h-7 text-xs border-slate-300">
          <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stat pills */}
      <div className="flex gap-1 overflow-x-auto scrollbar-hide">
        <StatPill label="Total" value={userStats.total} icon={Users} />
        <StatPill label="Admins" value={userStats.admins} icon={Shield} />
        <StatPill label="Students" value={userStats.students} icon={User} />
        <StatPill label="Alumnae" value={userStats.alumnae} icon={GraduationCap} />
        <StatPill label="VIP" value={userStats.vips} icon={Star} />
        <StatPill label="Exec" value={userStats.executives} icon={Settings} />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="users" className="space-y-2">
        <TabsList className="h-8 bg-slate-100">
          <TabsTrigger value="users" className="text-xs px-3 h-6 data-[state=active]:bg-white data-[state=active]:text-slate-900 text-slate-600">Users</TabsTrigger>
          <TabsTrigger value="dossiers" className="text-xs px-3 h-6 data-[state=active]:bg-white data-[state=active]:text-slate-900 text-slate-600">Dossiers</TabsTrigger>
          <TabsTrigger value="enroll" className="text-xs px-3 h-6 data-[state=active]:bg-white data-[state=active]:text-slate-900 text-slate-600">Add User</TabsTrigger>
          <TabsTrigger value="modules" className="text-xs px-3 h-6 data-[state=active]:bg-white data-[state=active]:text-slate-900 text-slate-600">Modules</TabsTrigger>
        </TabsList>

        {/* ── USERS TAB ── */}
        <TabsContent value="users" className="space-y-1.5 mt-0">
          {/* Search + Filter - single compact row */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Search name or email..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-8 h-8 bg-white border-slate-300 text-slate-900 text-xs placeholder:text-slate-400"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[130px] h-8 bg-white border-slate-300 text-slate-900 text-xs shrink-0">
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
            {/* Mobile sort */}
            <div className="sm:hidden">
              <Select value={`${sortField}-${sortDir}`} onValueChange={(v) => {
                const [f, d] = v.split('-') as [typeof sortField, 'asc' | 'desc'];
                setSortField(f); setSortDir(d);
              }}>
                <SelectTrigger className="h-8 text-xs bg-white border-slate-300 text-slate-700 w-[100px]">
                  <ArrowUpDown className="h-3 w-3 mr-1" />
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name-asc">Name A→Z</SelectItem>
                  <SelectItem value="name-desc">Name Z→A</SelectItem>
                  <SelectItem value="joined-desc">Newest</SelectItem>
                  <SelectItem value="joined-asc">Oldest</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <p className="text-[11px]" style={{ color: '#64748b' }}>{filteredUsers.length} of {users.length}</p>

          {/* Mobile card list */}
          <div className="sm:hidden space-y-2">
            {filteredUsers.map(user => (
              <div key={user.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-white border border-slate-200">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-xs font-medium text-primary">
                  {user.full_name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate text-slate-900">{user.full_name || 'No name'}</p>
                  <p className="text-xs text-slate-500 truncate">{user.email}</p>
                </div>
                <div className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium shrink-0 ${getRoleBadgeColor(user.role)}`}>
                  {getRoleIcon(user.role)}
                  <span className="ml-1">{user.role || 'guest'}</span>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 max-h-[300px] overflow-y-auto">
                    <DropdownMenuLabel className="text-xs">Actions</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => openEditName(user)}>
                      <Pencil className="h-3.5 w-3.5 mr-2 text-primary" />Edit Name
                    </DropdownMenuItem>
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
                      <DropdownMenuItem key={r} onClick={() => handleQuickRoleChange(user.user_id!, r)} disabled={user.role === r} className={`text-xs ${user.role === r ? 'opacity-50' : ''}`}>
                        {getRoleIcon(r)}<span className="ml-1.5 capitalize">{r.replace('-', ' ')}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block rounded-md border border-slate-200 overflow-hidden bg-white">
            <Table className="table-fixed w-full">
              <TableHeader>
                <TableRow className="bg-slate-100 hover:bg-slate-100 border-slate-200">
                  <TableHead style={{ color: '#334155' }} className="text-[11px] font-semibold h-8 cursor-pointer select-none w-[40%] uppercase tracking-wide" onClick={() => toggleSort('name')}>
                    <span className="inline-flex items-center">User<SortIcon field="name" /></span>
                  </TableHead>
                  <TableHead style={{ color: '#334155' }} className="text-[11px] font-semibold h-8 cursor-pointer select-none w-[20%] uppercase tracking-wide" onClick={() => toggleSort('role')}>
                    <span className="inline-flex items-center">Role<SortIcon field="role" /></span>
                  </TableHead>
                  <TableHead style={{ color: '#334155' }} className="text-[11px] font-semibold h-8 cursor-pointer select-none w-[15%] uppercase tracking-wide" onClick={() => toggleSort('status')}>
                    <span className="inline-flex items-center">Status<SortIcon field="status" /></span>
                  </TableHead>
                  <TableHead style={{ color: '#334155' }} className="text-[11px] font-semibold h-8 cursor-pointer select-none w-[15%] uppercase tracking-wide" onClick={() => toggleSort('joined')}>
                    <span className="inline-flex items-center">Joined<SortIcon field="joined" /></span>
                  </TableHead>
                  <TableHead style={{ color: '#334155' }} className="text-[11px] font-semibold h-8 text-right w-[10%] uppercase tracking-wide">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map(user => (
                  <TableRow key={user.id} className="h-9 hover:bg-slate-50/80 border-slate-100">
                    <TableCell className="py-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-medium text-primary shrink-0">
                          {user.avatar_url ? (
                            <img src={user.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover" />
                          ) : (
                            user.full_name?.charAt(0)?.toUpperCase() || '?'
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate text-slate-900 leading-tight">{user.full_name || 'No name'}</p>
                          <p className="text-[11px] text-slate-500 truncate leading-tight">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-1.5">
                      <div className={`inline-flex items-center rounded-md border px-1.5 py-0 h-4 text-[10px] font-medium ${getRoleBadgeColor(user.role)}`}>
                        {getRoleIcon(user.role)}
                        <span className="ml-1">{user.role || 'guest'}</span>
                      </div>
                      {user.is_exec_board && (
                        <div className="inline-flex items-center ml-1 rounded-md border px-1.5 py-0 h-4 text-[10px] font-medium text-blue-700 border-blue-300 bg-blue-50">
                          {user.exec_board_role || 'Exec'}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="py-1.5">
                      {user.verified ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-green-700">
                          <UserCheck className="h-3 w-3" /> Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-amber-700">
                          <Calendar className="h-3 w-3" /> Pending
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="py-1.5">
                      <span className="text-[11px] text-slate-600">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
                      </span>
                    </TableCell>
                    <TableCell className="py-1.5 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 max-h-[400px] overflow-y-auto z-50">
                          <DropdownMenuLabel className="text-xs">Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => openEditName(user)}>
                            <Pencil className="h-3.5 w-3.5 mr-2 text-primary" />Edit Name
                          </DropdownMenuItem>
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
                            <DropdownMenuItem key={r} onClick={() => handleQuickRoleChange(user.user_id!, r)} disabled={user.role === r} className={`text-xs ${user.role === r ? 'opacity-50' : ''}`}>
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
              <CardTitle className="text-base flex items-center gap-2 text-slate-900">
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
        <TabsContent value="modules" className="mt-0 space-y-6">
          <PermissionErrorBoundary>
            <RoleBasedModuleAssignment />
            <div className="border-t border-border" />
            <UserModuleAssignment />
            <div className="border-t border-border" />
            <UsernamePermissionsManager />
          </PermissionErrorBoundary>
        </TabsContent>
      </Tabs>

      <ResetPasswordDialog user={selectedUser} open={showResetDialog} onOpenChange={setShowResetDialog} />
      <DeleteUserDialog user={selectedUser} open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} onUserDeleted={() => { setSelectedUser(null); fetchUsers(); }} />

      {/* Edit Name Dialog */}
      <Dialog open={editNameDialogOpen} onOpenChange={setEditNameDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Edit User Name</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="editName" className="text-sm">Full Name</Label>
              <Input
                id="editName"
                value={editNameValue}
                onChange={e => setEditNameValue(e.target.value)}
                placeholder="Enter full name"
                className="h-10"
                autoFocus
                onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditNameDialogOpen(false)} size="sm">Cancel</Button>
            <Button onClick={handleSaveName} disabled={!editNameValue.trim()} size="sm">Save Name</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
