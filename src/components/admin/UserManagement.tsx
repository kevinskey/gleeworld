
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Users, RefreshCw, Shield, User as UserIcon, UserPlus, Edit, Trash2, Search, Filter, Download, MoreHorizontal, Upload, DollarSign } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "@/hooks/useUsers";
import { AddUserDialog } from "./AddUserDialog";
import { DeleteUserDialog } from "./DeleteUserDialog";
import { EditUserDialog } from "./EditUserDialog";
import { UserImportDialog } from "./UserImportDialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface UserManagementProps {
  users: User[];
  loading: boolean;
  error: string | null;
  onRefetch: () => void;
}

export const UserManagement = ({ users, loading, error, onRefetch }: UserManagementProps) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [deleteUserOpen, setDeleteUserOpen] = useState(false);
  const [editUserOpen, setEditUserOpen] = useState(false);
  const [importUsersOpen, setImportUsersOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userReadyToPayStatus, setUserReadyToPayStatus] = useState<Record<string, boolean>>({});
  const [userStipendAmounts, setUserStipendAmounts] = useState<Record<string, number>>({});
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

  // Fetch stipend amounts from current contracts
  const fetchUserStipendAmounts = async () => {
    try {
      const stipendMap: Record<string, number> = {};
      
      for (const user of users) {
        console.log('Fetching stipend amount for user:', user.email);
        
        // Get the most recent completed contract with stipend amount
        const { data: contractData, error: contractError } = await supabase
          .from('contracts_v2')
          .select(`
            stipend_amount,
            contract_signatures_v2!inner(status)
          `)
          .eq('created_by', user.id)
          .eq('contract_signatures_v2.status', 'completed')
          .not('stipend_amount', 'is', null)
          .order('created_at', { ascending: false })
          .limit(1);

        if (contractError) {
          console.error('Error fetching contract stipend for user:', user.email, contractError);
          continue;
        }

        if (contractData && contractData.length > 0 && contractData[0].stipend_amount) {
          stipendMap[user.id] = Number(contractData[0].stipend_amount);
          console.log('Stipend found for', user.email, ':', contractData[0].stipend_amount);
        }
      }
      
      console.log('Stipend amounts map:', stipendMap);
      setUserStipendAmounts(stipendMap);
    } catch (error) {
      console.error('Error fetching user stipend amounts:', error);
    }
  };

  // Check if user has completed contracts/W9s and is ready to pay
  const checkUserReadyToPayStatus = async () => {
    try {
      const statusMap: Record<string, boolean> = {};
      
      for (const user of users) {
        console.log('Checking ready to pay status for user:', user.email);
        
        // Check for completed contracts with PDFs
        const { data: contractData, error: contractError } = await supabase
          .from('contracts_v2')
          .select(`
            id,
            contract_signatures_v2!inner(status, pdf_storage_path)
          `)
          .eq('created_by', user.id)
          .eq('contract_signatures_v2.status', 'completed')
          .not('contract_signatures_v2.pdf_storage_path', 'is', null);

        if (contractError) {
          console.error('Error fetching contracts for user:', user.email, contractError);
          continue;
        }

        // Check for submitted W9 forms
        const { data: w9Data, error: w9Error } = await supabase
          .from('w9_forms')
          .select('id, storage_path')
          .eq('user_id', user.id)
          .eq('status', 'submitted')
          .not('storage_path', 'is', null);

        if (w9Error) {
          console.error('Error fetching W9s for user:', user.email, w9Error);
          continue;
        }

        const hasContracts = contractData && contractData.length > 0;
        const hasW9s = w9Data && w9Data.length > 0;
        
        console.log('User', user.email, 'has contracts:', hasContracts, 'has W9s:', hasW9s);
        
        // User is ready to pay if they have both completed contracts and submitted W9s
        statusMap[user.id] = hasContracts && hasW9s;
      }
      
      console.log('Ready to pay status map:', statusMap);
      setUserReadyToPayStatus(statusMap);
    } catch (error) {
      console.error('Error checking user ready to pay status:', error);
      toast({
        title: "Error",
        description: "Failed to check user payment readiness status",
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const handlePayoutUser = (user: User) => {
    const stipendAmount = userStipendAmounts[user.id];
    console.log('Payout clicked for user:', user, 'Amount:', stipendAmount);
    toast({
      title: "Payout Initiated",
      description: `Processing ${formatCurrency(stipendAmount)} payout for ${user.full_name || user.email}`,
    });
    
    // You can add actual payout processing logic here
    // For example, navigate to payment processing page or open payment dialog
  };

  // Check status when component mounts or users change
  useEffect(() => {
    if (users.length > 0 && !loading) {
      checkUserReadyToPayStatus();
      fetchUserStipendAmounts();
    }
  }, [users, loading]);

  const handleReadyToPay = (user: User) => {
    console.log('Ready to pay clicked for user:', user);
    toast({
      title: "Ready to Pay",
      description: `${user.full_name || user.email} is ready to receive payment with completed contracts and W9 forms.`,
    });
    
    // You can add actual payment processing logic here
    // For example, navigate to payment page or open payment dialog
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
            <Button onClick={onRefetch} variant="secondary">
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
              <Button onClick={onRefetch} variant="secondary" size="sm" className="w-full sm:w-auto">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary" size="sm" className="w-full sm:w-auto">
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
                variant="secondary"
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
                         <Avatar className="h-10 w-10 border-2 border-brand-200/50 shadow-sm flex-shrink-0">
                           <AvatarImage 
                             src="/placeholder.svg" 
                             alt={user.full_name || user.email || "User"} 
                             className="object-cover"
                           />
                           <AvatarFallback className="bg-gradient-to-br from-brand-100 to-brand-200 text-brand-700">
                             {user.full_name ? 
                               user.full_name.split(' ').map(n => n[0]).join('').toUpperCase() :
                               <UserIcon className="h-4 w-4" />
                             }
                           </AvatarFallback>
                         </Avatar>
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
                         {userStipendAmounts[user.id] && (
                           <Button
                             size="sm"
                             variant="default"
                             onClick={() => handlePayoutUser(user)}
                             className="bg-blue-600 hover:bg-blue-700 text-white flex-1 sm:flex-none"
                           >
                             <DollarSign className="h-4 w-4 sm:mr-0 mr-2" />
                             <span className="sm:hidden">Payout {formatCurrency(userStipendAmounts[user.id])}</span>
                             <span className="hidden sm:inline">{formatCurrency(userStipendAmounts[user.id])}</span>
                           </Button>
                         )}
                         {userReadyToPayStatus[user.id] && (
                           <Button
                             size="sm"
                             variant="default"
                             onClick={() => handleReadyToPay(user)}
                             className="bg-green-600 hover:bg-green-700 text-white flex-1 sm:flex-none"
                           >
                             <DollarSign className="h-4 w-4 sm:mr-0 mr-2" />
                             <span className="sm:hidden">Ready to Pay</span>
                           </Button>
                         )}
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleEditUser(user)}
                          className="flex-1 sm:flex-none"
                        >
                          <Edit className="h-4 w-4 sm:mr-0 mr-2" />
                          <span className="sm:hidden">Edit</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
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
