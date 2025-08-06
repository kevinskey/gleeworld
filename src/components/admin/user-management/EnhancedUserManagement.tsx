import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@/hooks/useUsers";
import { UserActionBar } from "./UserActionBar";
import { UserCard } from "./UserCard";
import { ComprehensiveUserForm } from "./ComprehensiveUserForm";
import { MobileUserForm } from "./MobileUserForm";
import { UserDetailPanel } from "./UserDetailPanel";
import { BulkOperationsPanel } from "./BulkOperationsPanel";
import { BulkSelectControls } from "./BulkSelectControls";
import { Users, RefreshCw, UserPlus } from "lucide-react";

interface EnhancedUserManagementProps {
  users: User[];
  loading: boolean;
  error: string | null;
  onRefetch: () => void;
}

export const EnhancedUserManagement = ({ 
  users, 
  loading, 
  error, 
  onRefetch 
}: EnhancedUserManagementProps) => {
  console.log('EnhancedUserManagement rendering with:', { usersCount: users.length, loading, error });
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [activeTab, setActiveTab] = useState("list");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [showBulkPanel, setShowBulkPanel] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showBulkSelect, setShowBulkSelect] = useState(false);
  const [userPaymentData, setUserPaymentData] = useState<{
    readyToPay: Record<string, boolean>;
    stipendAmounts: Record<string, number>;
    paidStatus: Record<string, boolean>;
  }>({
    readyToPay: {},
    stipendAmounts: {},
    paidStatus: {}
  });
  const { toast } = useToast();

  // Filter and sort users
  const filteredAndSortedUsers = users
    .filter(user => user && user.id) // Filter out any null/undefined users first
    .filter(user => {
      const matchesSearch = !searchTerm || 
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesRole = roleFilter === "all" || 
        user.role === roleFilter ||
        (roleFilter === "executive-board" && user.is_exec_board);
        
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

  // Load payment data for users
  useEffect(() => {
    if (users.length > 0 && !loading) {
      loadUserPaymentData();
    }
  }, [users, loading]);

  const loadUserPaymentData = async () => {
    try {
      const readyToPayMap: Record<string, boolean> = {};
      const stipendMap: Record<string, number> = {};
      const paidMap: Record<string, boolean> = {};
      
      for (const user of users) {
        // Check for completed contracts
        const { data: contractData } = await supabase
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

        if (contractData && contractData.length > 0) {
          stipendMap[user.id] = Number(contractData[0].stipend_amount);
        }

        // Check for W9 forms
        const { data: w9Data } = await supabase
          .from('w9_forms')
          .select('id')
          .eq('user_id', user.id)
          .eq('status', 'submitted');

        // Check payment status
        const { data: paymentsData } = await supabase
          .from('user_payments')
          .select('id')
          .eq('user_id', user.id);

        const hasContracts = contractData && contractData.length > 0;
        const hasW9s = w9Data && w9Data.length > 0;
        const hasPayments = paymentsData && paymentsData.length > 0;
        
        readyToPayMap[user.id] = hasContracts && hasW9s;
        paidMap[user.id] = hasPayments;
      }
      
      setUserPaymentData({
        readyToPay: readyToPayMap,
        stipendAmounts: stipendMap,
        paidStatus: paidMap
      });
    } catch (error) {
      // Silent error handling - log only in development
    }
  };

  const handleUserClick = (user: User) => {
    navigate(`/dashboard/member-view/${user.id}`);
  };

  const handleUserEdit = (user: User) => {
    setSelectedUser(user);
    setShowDetailPanel(true);
  };

  const handleUserDelete = (user: User) => {
    setSelectedUser(user);
    setShowDetailPanel(true);
  };

  const handleUserView = (user: User) => {
    setSelectedUser(user);
    setShowDetailPanel(true);
  };

  const handleUserPayout = (user: User) => {
    const amount = userPaymentData.stipendAmounts[user.id];
    toast({
      title: "Payout Initiated", 
      description: `Processing ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)} payout for ${user.full_name || user.email}`,
    });
  };

  const handleCreateSuccess = () => {
    setShowCreateForm(false);
    onRefetch();
  };

  const handleUpdateSuccess = () => {
    setShowDetailPanel(false);
    setSelectedUser(null);
    onRefetch();
  };

  const handleDeleteSuccess = () => {
    setShowDetailPanel(false);
    setSelectedUser(null);
    onRefetch();
  };

  const handleBulkOperationComplete = () => {
    setShowBulkPanel(false);
    onRefetch();
  };

  const handleUserSelection = (userId: string, selected: boolean) => {
    if (selected) {
      setSelectedUsers(prev => [...prev, userId]);
    } else {
      setSelectedUsers(prev => prev.filter(id => id !== userId));
    }
  };

  const handleBulkSelectComplete = () => {
    setSelectedUsers([]);
    setShowBulkSelect(false);
    onRefetch();
  };

  if (loading) {
    return (
      <Card className="border-2 border-slate-300 shadow-sm">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
          <CardTitle className="flex items-center gap-2 text-slate-800">
            <Users className="h-5 w-5" />
            User Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-slate-600" />
            <span className="ml-2 text-slate-700 font-medium">Loading users...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-2 border-red-300 shadow-sm">
        <CardHeader className="bg-gradient-to-r from-red-50 to-rose-100 border-b border-red-200">
          <CardTitle className="flex items-center gap-2 text-red-800">
            <Users className="h-5 w-5" />
            User Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-700 mb-4 font-medium">{error}</p>
            <Button onClick={onRefetch} variant="secondary" className="border-2 border-red-300">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Action Bar */}
      <UserActionBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        roleFilter={roleFilter}
        onRoleFilterChange={setRoleFilter}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        sortOrder={sortOrder}
        onSortOrderChange={setSortOrder}
        onCreateUser={() => setShowCreateForm(!showCreateForm)}
        onBulkOperations={() => setShowBulkPanel(true)}
        onBulkSelect={() => setShowBulkSelect(!showBulkSelect)}
        onRefresh={onRefetch}
        userCount={users.length}
        filteredCount={filteredAndSortedUsers.length}
        loading={loading}
        showBulkSelect={showBulkSelect}
      />

      {/* Main Content */}
      <div className="space-y-6">
        {/* Show Create Form at Top When Active */}
        {showCreateForm && (
          <div className="w-full bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-lg p-6 shadow-lg">
            <div className="text-lg font-semibold text-blue-900 mb-4 flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Add New User
            </div>
            <div className="block md:hidden">
              <MobileUserForm
                mode="create"
                onSuccess={handleCreateSuccess}
                onCancel={() => setShowCreateForm(false)}
              />
            </div>
            <div className="hidden md:block">
              <ComprehensiveUserForm
                mode="create"
                onSuccess={handleCreateSuccess}
                onCancel={() => setShowCreateForm(false)}
              />
            </div>
          </div>
        )}

        {/* Bulk Select Controls */}
        {showBulkSelect && (
          <BulkSelectControls
            users={filteredAndSortedUsers}
            selectedUsers={selectedUsers}
            onSelectionChange={setSelectedUsers}
            onBulkActionComplete={handleBulkSelectComplete}
          />
        )}

        {/* Users List */}
        <div className="w-full space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="list">List View</TabsTrigger>
              <TabsTrigger value="grid">Grid View</TabsTrigger>
            </TabsList>

            <TabsContent value="list" className="space-y-3 mt-4">
              {filteredAndSortedUsers.length === 0 ? (
                <Card className="border-2 border-slate-300">
                  <CardContent className="text-center py-12">
                    <Users className="h-12 w-12 mx-auto mb-4 text-slate-400" />
                    <h3 className="text-lg font-semibold mb-2 text-slate-800">No users found</h3>
                    <p className="text-sm text-slate-600 mb-4 font-medium">
                      {searchTerm || roleFilter !== "all" 
                        ? "Try adjusting your search or filters" 
                        : "Get started by adding your first user"
                      }
                    </p>
                    {!searchTerm && roleFilter === "all" && (
                      <Button 
                        onClick={() => setShowCreateForm(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-medium border-2 border-blue-500"
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Add First User
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                filteredAndSortedUsers.map((user) => (
                  <UserCard
                    key={user.id}
                    user={user}
                    onEdit={handleUserEdit}
                    onDelete={handleUserDelete}
                    onView={handleUserView}
                    onClick={handleUserClick}
                    showPaymentStatus={true}
                    isPaid={userPaymentData.paidStatus[user.id]}
                    stipendAmount={userPaymentData.stipendAmounts[user.id]}
                    onPayout={handleUserPayout}
                    showSelection={showBulkSelect}
                    isSelected={selectedUsers.includes(user.id)}
                    onSelectionChange={handleUserSelection}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="grid" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-4">
              {filteredAndSortedUsers.length === 0 ? (
                <div className="col-span-full">
                  <Card className="border-2 border-slate-300">
                    <CardContent className="text-center py-12">
                      <Users className="h-12 w-12 mx-auto mb-4 text-slate-400" />
                      <h3 className="text-lg font-semibold mb-2 text-slate-800">No users found</h3>
                      <p className="text-sm text-slate-600 mb-4 font-medium">
                        {searchTerm || roleFilter !== "all" 
                          ? "Try adjusting your search or filters" 
                          : "Get started by adding your first user"
                        }
                      </p>
                      {!searchTerm && roleFilter === "all" && (
                        <Button 
                          onClick={() => setShowCreateForm(true)}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-medium border-2 border-blue-500"
                        >
                          <UserPlus className="h-4 w-4 mr-2" />
                          Add First User
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ) : (
                filteredAndSortedUsers
                  .filter(user => user && user.id) // Filter out any null/undefined users or users without IDs
                  .map((user) => (
                    <UserCard
                      key={user.id}
                      user={user}
                      onEdit={handleUserEdit}
                      onDelete={handleUserDelete}
                      onView={handleUserView}
                      onClick={handleUserClick}
                      showPaymentStatus={true}
                      isPaid={userPaymentData.paidStatus[user.id]}
                      stipendAmount={userPaymentData.stipendAmounts[user.id]}
                      onPayout={handleUserPayout}
                      showSelection={showBulkSelect}
                      isSelected={selectedUsers.includes(user.id)}
                      onSelectionChange={handleUserSelection}
                    />
                  ))
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Side Panels */}
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

      <BulkOperationsPanel
        isOpen={showBulkPanel}
        onClose={() => setShowBulkPanel(false)}
        onOperationComplete={handleBulkOperationComplete}
        totalUsers={users.length}
      />
    </div>
  );
};