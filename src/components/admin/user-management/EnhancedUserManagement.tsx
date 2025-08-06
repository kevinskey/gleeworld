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
import { BulkExecBoardActions } from "./BulkExecBoardActions";
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
  Music
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
  const { toast } = useToast();

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
  };

  const handleUserClick = (user: User) => {
    setSelectedUser(user);
    setShowDetailPanel(true);
  };

  const filteredUsers = useMemo(() => {
    let filtered = [...users];

    if (searchQuery) {
      const lowerCaseQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(user =>
        user.full_name.toLowerCase().includes(lowerCaseQuery) ||
        user.email.toLowerCase().includes(lowerCaseQuery)
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">User Management</h2>
          <p className="text-muted-foreground">
            Manage user accounts, roles, and permissions across the platform
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={onRefetch}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Bulk Executive Board Actions */}
      <BulkExecBoardActions onActionComplete={onRefetch} />

      {/* Bulk Selection Controls */}
      <BulkSelectControls
        users={filteredAndSortedUsers}
        selectedUsers={selectedUsers}
        onSelectionChange={setSelectedUsers}
        onBulkActionComplete={onRefetch}
      />

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
          <CardDescription>
            Find users by name, email, role, or status
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Input
                type="search"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>

            <div className="flex items-center space-x-4">
              <Select value={selectedRole || 'all'} onValueChange={(value) => setSelectedRole(value === 'all' ? undefined : value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Filter by Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="fan">Fan</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="alumna">Alumna</SelectItem>
                  <SelectItem value="executive">Executive</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="super-admin">Super Admin</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedStatus || 'all'} onValueChange={(value) => setSelectedStatus(value === 'all' ? 'all' : value as UserFilter['status'])}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Filter by Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="unverified">Unverified</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User List */}
      <Card>
        <CardHeader>
          <CardTitle>User List</CardTitle>
          <CardDescription>
            View and manage user accounts
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <LoadingSpinner size="lg" />
            </div>
          ) : error ? (
            <div className="text-red-500">Error: {error}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs leading-4 font-medium text-gray-500 uppercase tracking-wider">
                      <Button variant="ghost" onClick={() => setSortBy('full_name')} className="w-full justify-start">
                        Name
                      </Button>
                    </th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs leading-4 font-medium text-gray-500 uppercase tracking-wider">
                      <Button variant="ghost" onClick={() => setSortBy('email')} className="w-full justify-start">
                        Email
                      </Button>
                    </th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs leading-4 font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs leading-4 font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 bg-gray-50"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAndSortedUsers.map(user => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-no-wrap">
                        <div className="text-sm leading-5 font-medium text-gray-900">{user.full_name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-no-wrap">
                        <div className="text-sm leading-5 text-gray-500">{user.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-no-wrap">
                        <Badge variant="secondary">{user.role}</Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-no-wrap">
                        {user.verified ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-no-wrap text-right text-sm leading-5 font-medium">
                        <Button variant="outline" size="sm" onClick={() => handleUserClick(user)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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

      {noUsersState && (
        <div className="text-center py-8">
          <AlertCircle className="h-10 w-10 mx-auto text-gray-400 mb-2" />
          <p className="text-lg text-gray-500">No users found.</p>
        </div>
      )}
    </div>
  );
};
