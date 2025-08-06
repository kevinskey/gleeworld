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
    <div className="space-y-6 p-4 bg-gradient-to-br from-spelman-blue-light/5 to-primary/10 min-h-screen">
      {/* Main User Management Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Search & Filter Users</CardTitle>
                <CardDescription>
                  Find and manage user accounts by name, email, role, or status
                </CardDescription>
              </div>
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
            
            {/* Search and Filter Controls */}
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
                    <SelectItem value="guest">Guest</SelectItem>
                    <SelectItem value="fan">Fan</SelectItem>
                    <SelectItem value="auditioner">Auditioner</SelectItem>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="user">User</SelectItem>
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
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <LoadingSpinner size="lg" />
            </div>
          ) : error ? (
            <div className="text-red-500">Error: {error}</div>
          ) : (
            <div className="overflow-x-auto border-2 border-primary/20 rounded-lg">
              <table className="min-w-full divide-y divide-primary/10">
                <thead className="bg-gradient-to-r from-primary/5 to-secondary/5">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs leading-4 font-medium text-primary uppercase tracking-wider border-r border-primary/10">
                      <Button variant="ghost" onClick={() => setSortBy('full_name')} className="w-full justify-start hover:bg-primary/10">
                        Name
                      </Button>
                    </th>
                    <th className="px-6 py-3 text-left text-xs leading-4 font-medium text-primary uppercase tracking-wider border-r border-primary/10">
                      <Button variant="ghost" onClick={() => setSortBy('email')} className="w-full justify-start hover:bg-primary/10">
                        Email
                      </Button>
                    </th>
                    <th className="px-6 py-3 text-left text-xs leading-4 font-medium text-primary uppercase tracking-wider border-r border-primary/10">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs leading-4 font-medium text-primary uppercase tracking-wider border-r border-primary/10">
                      Status
                    </th>
                    <th className="px-6 py-3 bg-secondary/5"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-primary/10">
                  {filteredAndSortedUsers.map((user, index) => (
                    <tr 
                      key={user.id || `user-${index}`} 
                      className={`hover:bg-primary/5 transition-colors border-l-4 ${
                        index % 2 === 0 ? 'border-l-primary/20' : 'border-l-secondary/20'
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-no-wrap border-r border-primary/5">
                        <div className="text-sm leading-5 font-medium text-foreground">{user.full_name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-no-wrap border-r border-primary/5">
                        <div className="text-sm leading-5 text-muted-foreground">{user.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-no-wrap border-r border-primary/5">
                        <Badge 
                          variant={user.role === 'admin' || user.role === 'super-admin' ? 'default' : 'secondary'}
                          className={user.role === 'admin' || user.role === 'super-admin' ? 'bg-primary text-primary-foreground' : ''}
                        >
                          {user.role}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-no-wrap border-r border-primary/5">
                        {user.verified ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-no-wrap text-right text-sm leading-5 font-medium bg-secondary/5">
                        <Button variant="outline" size="sm" onClick={() => handleUserClick(user)} className="border-primary/20 hover:bg-primary hover:text-primary-foreground">
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
