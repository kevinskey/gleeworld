import React, { useState, useMemo, useRef, useCallback } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { UserDetailPanel } from "./UserDetailPanel";
import { BulkSelectControls } from "./BulkSelectControls";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QuickAddUserForm } from "@/components/upload/QuickAddUserForm";
import { useRoleTransitions } from "@/hooks/useRoleTransitions";
import { useAvatarConversion } from "@/hooks/useAvatarConversion";

import { User } from "@/hooks/useUsers";
import { useToast } from "@/hooks/use-toast";
import { 
  Search, 
  Users, 
  Filter, 
  RefreshCw, 
  Eye,
  Settings,
  Shield,
  Crown,
  Star,
  CheckCircle,
  XCircle,
  Clock,
  UserPlus,
  AlertCircle,
  ChevronRight,
  Music,
  Loader2,
  Camera,
  ImageIcon
} from "lucide-react";

interface EnhancedUserManagementProps {
  users: User[];
  loading: boolean;
  error: any;
  onRefetch: () => void;
}

interface UserFilter {
  role?: string;
  status?: 'verified' | 'unverified' | 'all';
  query?: string;
}

export const EnhancedUserManagement = ({ users, loading, error, onRefetch }: EnhancedUserManagementProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string | undefined>(undefined);
  const [selectedStatus, setSelectedStatus] = useState<UserFilter['status']>('all');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [sortBy, setSortBy] = useState<'full_name' | 'email'>('full_name');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [changingRoles, setChangingRoles] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const { transitionUserRole } = useRoleTransitions();
  const { converting, convertAuditionerAvatars } = useAvatarConversion();

  const handleUpdateSuccess = () => {
    toast({
      title: "Success",
      description: "User updated successfully",
    });
  };

  const handleDeleteSuccess = () => {
    toast({
      title: "Success",
      description: "User deleted successfully",
    });
    // Immediately refresh the list and close the panel
    setShowDetailPanel(false);
    setSelectedUser(null);
    onRefetch();
  };

  const handleUserClick = (user: User) => {
    setSelectedUser(user);
    setShowDetailPanel(true);
  };

  const handleRoleChange = async (userId: string, newRole: string, currentRole: string) => {
    if (newRole === currentRole) return;
    
    setChangingRoles(prev => new Set(prev).add(userId));
    
    try {
      const success = await transitionUserRole(
        userId, 
        newRole, 
        'admin_role_change', 
        `Role changed from ${currentRole} to ${newRole} via user management interface`
      );
      
      if (success) {
        onRefetch(); // Refresh the user list
        toast({
          title: "Role Updated",
          description: `User role changed from ${currentRole} to ${newRole}`,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update user role",
        variant: "destructive",
      });
    } finally {
      setChangingRoles(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  const handleConvertAvatars = async () => {
    const result = await convertAuditionerAvatars();
    if (result && result.successful > 0) {
      // Refresh the user list to show updated avatars
      onRefetch();
    }
  };

  const filteredUsers = useMemo(() => {
    let filtered = [...users];

    if (searchQuery) {
      const lowerCaseQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(user =>
        (user.full_name && user.full_name.toLowerCase().includes(lowerCaseQuery)) ||
        (user.email && user.email.toLowerCase().includes(lowerCaseQuery))
      );
    }

    if (selectedRole) {
      filtered = filtered.filter(user => user.role === selectedRole);
    }

    if (selectedStatus && selectedStatus !== 'all') {
      filtered = filtered.filter(user => {
        const isVerified = user.verified === true;
        return selectedStatus === 'verified' ? isVerified : !isVerified;
      });
    }

    return filtered;
  }, [users, searchQuery, selectedRole, selectedStatus]);

  const sortedUsers = useMemo(() => {
    const sorted = [...filteredUsers];

    sorted.sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      } else {
        return 0;
      }
    });

    return sorted;
  }, [filteredUsers, sortBy, sortOrder]);

  const filteredAndSortedUsers = useMemo(() => sortedUsers, [sortedUsers]);

  const noUsersState = !loading && users.length === 0;

  return (
    <div className="space-y-6 p-4 bg-gradient-to-br from-background to-secondary/5 min-h-screen">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-primary to-primary-foreground rounded-xl p-6 text-primary-foreground shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <Users className="h-8 w-8" />
          <h1 className="text-3xl font-bebas tracking-wide">User Management</h1>
        </div>
        <p className="text-primary-foreground/80 text-lg">
          Search, filter, and manage user accounts across all roles and permissions
        </p>
        <div className="mt-4 flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span>{filteredAndSortedUsers.filter(u => u.verified).length} Verified</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
            <span>{filteredAndSortedUsers.filter(u => !u.verified).length} Pending</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
            <span>{filteredAndSortedUsers.length} Total Shown</span>
          </div>
        </div>
      </div>

      {/* Main User Management Card */}
      <Card className="shadow-xl border-0 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/75">
        <CardHeader className="bg-gradient-to-r from-card to-muted/20 border-b">
          <div className="flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Search className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl text-primary">Search & Filter Users</CardTitle>
                  <CardDescription className="text-base mt-1">
                    Find and manage user accounts by name, email, role, or status
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  onClick={handleConvertAvatars}
                  disabled={converting}
                  variant="secondary"
                  className="gap-2 bg-secondary hover:bg-secondary/80"
                >
                  {converting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                  Convert Auditioner Avatars
                </Button>
                <Button onClick={() => setAddDialogOpen(true)} className="gap-2 bg-primary hover:bg-primary/90">
                  <UserPlus className="h-4 w-4" />
                  Add User
                </Button>
                <Button 
                  variant="outline" 
                  onClick={onRefetch}
                  disabled={loading}
                  className="gap-2 border-primary/20 hover:bg-primary/5"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>
            
            {/* Enhanced Search and Filter Controls */}
            <div className="bg-muted/30 p-4 rounded-lg border border-primary/10">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Search Input */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <Input
                    type="search"
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-background border-primary/20 focus:border-primary focus:ring-primary/20"
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                      onClick={() => setSearchQuery('')}
                    >
                      <XCircle className="h-3 w-3" />
                    </Button>
                  )}
                </div>

                {/* Role Filter */}
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <Select value={selectedRole || 'all'} onValueChange={(value) => setSelectedRole(value === 'all' ? undefined : value)}>
                    <SelectTrigger className="bg-background border-primary/20 focus:border-primary focus:ring-primary/20">
                      <SelectValue placeholder="Filter by Role" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-primary/20 shadow-lg">
                      <SelectItem value="all" className="hover:bg-primary/5">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          All Roles
                        </div>
                      </SelectItem>
                      <SelectItem value="guest">
                        <div className="flex items-center gap-2">
                          <Eye className="h-4 w-4" />
                          Guest
                        </div>
                      </SelectItem>
                      <SelectItem value="fan">
                        <div className="flex items-center gap-2">
                          <Star className="h-4 w-4" />
                          Fan
                        </div>
                      </SelectItem>
                      <SelectItem value="auditioner">
                        <div className="flex items-center gap-2">
                          <Music className="h-4 w-4" />
                          Auditioner
                        </div>
                      </SelectItem>
                      <SelectItem value="member">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4" />
                          Member
                        </div>
                      </SelectItem>
                      <SelectItem value="alumna">
                        <div className="flex items-center gap-2">
                          <Crown className="h-4 w-4" />
                          Alumna
                        </div>
                      </SelectItem>
                      <SelectItem value="executive">
                        <div className="flex items-center gap-2">
                          <Settings className="h-4 w-4" />
                          Executive
                        </div>
                      </SelectItem>
                      <SelectItem value="admin">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          Admin
                        </div>
                      </SelectItem>
                      <SelectItem value="super-admin">
                        <div className="flex items-center gap-2">
                          <Crown className="h-4 w-4" />
                          Super Admin
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Status Filter */}
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                  <Select value={selectedStatus || 'all'} onValueChange={(value) => setSelectedStatus(value === 'all' ? 'all' : value as UserFilter['status'])}>
                    <SelectTrigger className="bg-background border-primary/20 focus:border-primary focus:ring-primary/20">
                      <SelectValue placeholder="Filter by Status" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-primary/20 shadow-lg">
                      <SelectItem value="all">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          All Statuses
                        </div>
                      </SelectItem>
                      <SelectItem value="verified">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          Verified
                        </div>
                      </SelectItem>
                      <SelectItem value="unverified">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-yellow-500" />
                          Unverified
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Results Summary */}
              <div className="mt-3 pt-3 border-t border-primary/10 flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  Showing {filteredAndSortedUsers.length} of {users.length} users
                </span>
                {(searchQuery || selectedRole || (selectedStatus && selectedStatus !== 'all')) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedRole(undefined);
                      setSelectedStatus('all');
                    }}
                    className="text-primary hover:text-primary/80"
                  >
                    Clear filters
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <LoadingSpinner size="lg" />
            </div>
          ) : error ? (
            <div className="p-6 text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-3" />
              <p className="text-destructive font-medium">Error loading users</p>
              <p className="text-muted-foreground mt-1">{error}</p>
            </div>
          ) : filteredAndSortedUsers.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">No users found</h3>
              <p className="text-muted-foreground">
                {searchQuery || selectedRole || (selectedStatus && selectedStatus !== 'all')
                  ? "Try adjusting your search filters"
                  : "Get started by adding your first user"
                }
              </p>
            </div>
          ) : (
            <div className="overflow-hidden border-t border-primary/10">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-primary/10">
                  <thead className="bg-gradient-to-r from-muted/50 to-muted/30">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-primary uppercase tracking-wider border-r border-primary/10">
                        <Button 
                          variant="ghost" 
                          onClick={() => setSortBy('full_name')} 
                          className="w-full justify-start hover:bg-primary/10 text-primary font-semibold p-0"
                        >
                          <Users className="h-4 w-4 mr-2" />
                          Name
                          <ChevronRight className={`h-3 w-3 ml-2 transition-transform ${sortBy === 'full_name' ? (sortOrder === 'asc' ? 'rotate-90' : '-rotate-90') : ''}`} />
                        </Button>
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-primary uppercase tracking-wider border-r border-primary/10">
                        <Button 
                          variant="ghost" 
                          onClick={() => setSortBy('email')} 
                          className="w-full justify-start hover:bg-primary/10 text-primary font-semibold p-0"
                        >
                          Email
                          <ChevronRight className={`h-3 w-3 ml-2 transition-transform ${sortBy === 'email' ? (sortOrder === 'asc' ? 'rotate-90' : '-rotate-90') : ''}`} />
                        </Button>
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-primary uppercase tracking-wider border-r border-primary/10">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          Role
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-primary uppercase tracking-wider border-r border-primary/10">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4" />
                          Status
                        </div>
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-semibold text-primary uppercase tracking-wider bg-muted/20">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-background divide-y divide-primary/5">
                    {filteredAndSortedUsers.map((user, index) => (
                      <tr 
                        key={user.id || `user-${index}`} 
                        className={`hover:bg-primary/5 transition-all duration-200 group border-l-4 ${
                          user.verified 
                            ? 'border-l-green-400 hover:border-l-green-500' 
                            : 'border-l-yellow-400 hover:border-l-yellow-500'
                        }`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap border-r border-primary/5">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              {user.avatar_url ? (
                                <img 
                                  src={user.avatar_url} 
                                  alt={`${user.full_name || user.email} avatar`}
                                  className="w-10 h-10 rounded-full object-cover border-2 border-primary/20"
                                  onError={(e) => {
                                    // Fallback to initials if image fails to load
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    const fallback = target.nextElementSibling as HTMLElement;
                                    if (fallback) fallback.style.display = 'flex';
                                  }}
                                />
                              ) : null}
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium border-2 border-primary/20 ${
                                user.avatar_url ? 'hidden' : 'flex'
                              } ${
                                user.verified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                              }`}>
                                {user.full_name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || '?'}
                              </div>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-foreground">
                                {user.full_name || 'No name'}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                ID: {user.id?.slice(0, 8)}...
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap border-r border-primary/5">
                          <div className="text-sm text-foreground font-mono">{user.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap border-r border-primary/5">
                          <div className="flex items-center gap-2">
                            <Select 
                              value={user.role || 'guest'} 
                              onValueChange={(newRole) => handleRoleChange(user.id, newRole, user.role || 'guest')}
                              disabled={changingRoles.has(user.id)}
                            >
                              <SelectTrigger className="w-36 h-8 bg-background border-primary/20 hover:border-primary/40 focus:border-primary focus:ring-primary/20">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-popover border-primary/20 shadow-lg z-50">
                                <SelectItem value="guest">Guest</SelectItem>
                                <SelectItem value="fan">Fan</SelectItem>
                                <SelectItem value="auditioner">Auditioner</SelectItem>
                                <SelectItem value="member">Member</SelectItem>
                                <SelectItem value="alumna">Alumna</SelectItem>
                                <SelectItem value="executive">Executive</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="super-admin">Super Admin</SelectItem>
                              </SelectContent>
                            </Select>
                            {changingRoles.has(user.id) && (
                              <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap border-r border-primary/5">
                          <div className="flex items-center gap-2">
                            {user.verified ? (
                              <>
                                <CheckCircle className="h-5 w-5 text-green-500" />
                                <span className="text-sm text-green-700 font-medium">Verified</span>
                              </>
                            ) : (
                              <>
                                <Clock className="h-5 w-5 text-yellow-500" />
                                <span className="text-sm text-yellow-700 font-medium">Pending</span>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center bg-muted/10">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleUserClick(user)} 
                            className="border-primary/20 hover:bg-primary hover:text-primary-foreground transition-all duration-200 group-hover:border-primary/40"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Detail Panel */}
      {showDetailPanel && selectedUser && (
        <UserDetailPanel
          user={selectedUser}
          isOpen={showDetailPanel}
          onClose={() => {
            setShowDetailPanel(false);
            setSelectedUser(null);
          }}
          onUserUpdated={() => {
            // Force immediate refetch for UI update
            onRefetch();
            handleUpdateSuccess();
          }}
          onUserDeleted={handleDeleteSuccess}
        />
      )}
      
      {/* Add User Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-lg bg-card border-primary/20 shadow-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <UserPlus className="h-5 w-5" />
              Add New User
            </DialogTitle>
          </DialogHeader>
          <QuickAddUserForm
            onUserAdded={() => {
              onRefetch();
              setAddDialogOpen(false);
            }}
            onCancel={() => setAddDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};
