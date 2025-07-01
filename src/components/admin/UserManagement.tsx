
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Users, RefreshCw, Shield, User as UserIcon, UserPlus, Edit, Trash2, Search, Filter, Download, MoreHorizontal, Upload } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { User } from "@/hooks/useUsers";
import { AddUserDialog } from "./AddUserDialog";
import { EditUserDialog } from "./EditUserDialog";
import { DeleteUserDialog } from "./DeleteUserDialog";
import { UserImportDialog } from "./UserImportDialog";
import { useToast } from "@/hooks/use-toast";

interface UserManagementProps {
  users: User[];
  loading: boolean;
  error: string | null;
  onRefetch: () => void;
}

export const UserManagement = ({ users, loading, error, onRefetch }: UserManagementProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [editUserOpen, setEditUserOpen] = useState(false);
  const [deleteUserOpen, setDeleteUserOpen] = useState(false);
  const [importUsersOpen, setImportUsersOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const { toast } = useToast();

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'super-admin': return 'destructive';
      case 'admin': return 'default';
      default: return 'secondary';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'super-admin':
      case 'admin':
        return <Shield className="h-4 w-4" />;
      default:
        return <UserIcon className="h-4 w-4" />;
    }
  };

  // Filter and sort users
  const filteredAndSortedUsers = users
    .filter(user => {
      const matchesSearch = !searchTerm || 
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      return matchesSearch && matchesRole;
    })
    .sort((a, b) => {
      let aValue, bValue;
      switch (sortBy) {
        case 'full_name':
          aValue = a.full_name || '';
          bValue = b.full_name || '';
          break;
        case 'email':
          aValue = a.email || '';
          bValue = b.email || '';
          break;
        case 'role':
          aValue = a.role;
          bValue = b.role;
          break;
        default:
          aValue = a.created_at;
          bValue = b.created_at;
      }
      
      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setEditUserOpen(true);
  };

  const handleDeleteUser = (user: User) => {
    setSelectedUser(user);
    setDeleteUserOpen(true);
  };

  const exportUsers = () => {
    const csvContent = [
      ['Name', 'Email', 'Role', 'Created Date'].join(','),
      ...filteredAndSortedUsers.map(user => [
        user.full_name || 'N/A',
        user.email || 'N/A',
        user.role,
        new Date(user.created_at).toLocaleDateString()
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: `Exported ${filteredAndSortedUsers.length} users to CSV`,
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading users...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={onRefetch} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                User Management
              </CardTitle>
              <CardDescription>
                Manage user accounts, roles, and permissions ({filteredAndSortedUsers.length} of {users.length} users)
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button onClick={onRefetch} variant="outline" size="sm" className="w-full sm:w-auto">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full sm:w-auto">
                    <MoreHorizontal className="h-4 w-4 mr-2" />
                    Actions
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => setAddUserOpen(true)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add User
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setImportUsersOpen(true)}>
                    <Upload className="h-4 w-4 mr-2" />
                    Import Users
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={exportUsers}>
                    <Download className="h-4 w-4 mr-2" />
                    Export Users
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Mobile-First Filters and Search */}
          <div className="space-y-4 mb-6">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            
            {/* Filter Controls */}
            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full sm:w-[140px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="user">Users</SelectItem>
                  <SelectItem value="admin">Admins</SelectItem>
                  <SelectItem value="super-admin">Super Admins</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full sm:w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at">Date Created</SelectItem>
                  <SelectItem value="full_name">Name</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="role">Role</SelectItem>
                </SelectContent>
              </Select>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="w-full sm:w-auto"
              >
                Sort {sortOrder === 'asc' ? '↑' : '↓'}
              </Button>
            </div>
          </div>

          {/* Mobile-Optimized Users List */}
          <div className="space-y-3">
            {filteredAndSortedUsers.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium mb-2">No users found</h3>
                <p className="text-sm mb-4">
                  {searchTerm || roleFilter !== "all" 
                    ? "Try adjusting your search or filters" 
                    : "Get started by adding your first user"
                  }
                </p>
                {!searchTerm && roleFilter === "all" && (
                  <Button 
                    className="mt-4" 
                    onClick={() => setAddUserOpen(true)}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add First User
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredAndSortedUsers.map((user) => (
                  <div key={user.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      {/* User Info */}
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className="flex-shrink-0">
                          {getRoleIcon(user.role)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm sm:text-base truncate">
                            {user.full_name || 'No name provided'}
                          </p>
                          <p className="text-xs sm:text-sm text-gray-600 truncate">
                            {user.email || 'No email'}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant={getRoleBadgeVariant(user.role)} className="text-xs">
                              {user.role}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {new Date(user.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex gap-2 flex-shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditUser(user)}
                          className="flex-1 sm:flex-none"
                        >
                          <Edit className="h-4 w-4 sm:mr-0 mr-2" />
                          <span className="sm:hidden">Edit</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteUser(user)}
                          className="text-red-600 hover:text-red-700 flex-1 sm:flex-none"
                        >
                          <Trash2 className="h-4 w-4 sm:mr-0 mr-2" />
                          <span className="sm:hidden">Delete</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <AddUserDialog
        open={addUserOpen}
        onOpenChange={setAddUserOpen}
        onUserAdded={onRefetch}
      />

      <EditUserDialog
        user={selectedUser}
        open={editUserOpen}
        onOpenChange={setEditUserOpen}
        onUserUpdated={onRefetch}
      />

      <DeleteUserDialog
        user={selectedUser}
        open={deleteUserOpen}
        onOpenChange={setDeleteUserOpen}
        onUserDeleted={onRefetch}
      />

      <UserImportDialog
        open={importUsersOpen}
        onOpenChange={setImportUsersOpen}
        onUsersImported={onRefetch}
      />
    </>
  );
};
