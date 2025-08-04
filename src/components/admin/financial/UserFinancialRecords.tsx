
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Filter, Download, Eye, User, DollarSign, Activity, Calendar, RefreshCw } from "lucide-react";
import { useAdminUserRecords } from "@/hooks/useAdminUserRecords";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UserRecord {
  user_id: string;
  user_name: string;
  user_email: string;
  totalRecords: number;
  currentBalance: number;
  hasRecords: boolean;
  lastActivity: string | null;
}

interface FinanceRecord {
  id: string;
  amount: number;
  balance: number;
  category: string;
  date: string;
  description: string;
  type: string;
  notes?: string;
  reference?: string;
  created_at: string;
}

export const UserFinancialRecords = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [userFinanceRecords, setUserFinanceRecords] = useState<FinanceRecord[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [syncing, setSyncing] = useState(false);
  
  const { userRecords, loading, error, refetch } = useAdminUserRecords();
  const { toast } = useToast();

  const filteredRecords = userRecords?.filter(record => {
    const matchesSearch = !searchTerm || 
      record.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.user_email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === "all" || record.hasRecords === (typeFilter === "has_records");
    
    return matchesSearch && matchesType;
  }) || [];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const handlePreviewUser = async (record: UserRecord) => {
    setSelectedUser(record);
    setLoadingPreview(true);
    setPreviewOpen(true);

    try {
      const { data: financeData, error } = await supabase
        .from('finance_records')
        .select('*')
        .eq('user_id', record.user_id)
        .order('date', { ascending: false });

      if (error) {
        throw error;
      }

      setUserFinanceRecords(financeData || []);
    } catch (error) {
      console.error('Error loading user finance records:', error);
      toast({
        title: "Error",
        description: "Failed to load user finance records",
        variant: "destructive",
      });
    } finally {
      setLoadingPreview(false);
    }
  };

  const syncAllUserRecords = async () => {
    setSyncing(true);
    try {
      // Get all users first
      const { data: users } = await supabase
        .from('gw_profiles')
        .select('user_id, full_name, email');

      if (!users) {
        throw new Error('No users found');
      }

      let totalSynced = 0;

      // Process each user's contracts and sync their financial records
      for (const user of users) {
        try {
          // Get user's contracts with stipend amounts
          const { data: userContracts } = await supabase
            .from('contracts_v2')
            .select('*')
            .eq('created_by', user.user_id)
            .not('stipend_amount', 'is', null)
            .gt('stipend_amount', 0);

          if (userContracts && userContracts.length > 0) {
            for (const contract of userContracts) {
              // Check if finance record already exists for this contract
              const { data: existingRecord } = await supabase
                .from('finance_records')
                .select('id')
                .eq('user_id', user.user_id)
                .eq('reference', `Contract ID: ${contract.id}`)
                .single();

              if (!existingRecord) {
                const recordDate = new Date(contract.created_at).toISOString().split('T')[0];
                
                const { error: insertError } = await supabase
                  .from('finance_records')
                  .insert({
                    user_id: user.user_id,
                    date: recordDate,
                    type: 'stipend',
                    category: 'Performance',
                    description: `Stipend from ${contract.title}`,
                    amount: Number(contract.stipend_amount),
                    balance: 0, // Will be recalculated
                    reference: `Contract ID: ${contract.id}`,
                    notes: 'Auto-synced from contract system'
                  });

                if (!insertError) {
                  totalSynced++;
                }
              }
            }
          }
        } catch (error) {
          console.error(`Error syncing records for user ${user.email}:`, error);
        }
      }

      // Recalculate balances for all users
      for (const user of users) {
        const { data: userRecords } = await supabase
          .from('finance_records')
          .select('*')
          .eq('user_id', user.user_id)
          .order('date', { ascending: true })
          .order('created_at', { ascending: true });

        if (userRecords && userRecords.length > 0) {
          let runningBalance = 0;
          for (const record of userRecords) {
            const amount = Number(record.amount);
            if (record.type === 'stipend' || record.type === 'credit') {
              runningBalance += amount;
            } else if (record.type === 'receipt' || record.type === 'payment' || record.type === 'debit') {
              runningBalance += amount; // Payment amounts are already negative, so we add them
            }
            
            await supabase
              .from('finance_records')
              .update({ balance: runningBalance })
              .eq('id', record.id);
          }
        }
      }

      toast({
        title: "Sync Complete",
        description: `Synced ${totalSynced} new financial records from contracts`,
      });

      // Refresh the data
      refetch();
    } catch (error) {
      console.error('Error syncing user records:', error);
      toast({
        title: "Sync Failed",
        description: "Failed to sync financial records from contracts",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  const exportUserRecords = () => {
    const csvContent = [
      ['Name', 'Email', 'Current Balance', 'Total Records', 'Status', 'Last Activity'].join(','),
      ...filteredRecords.map(record => [
        record.user_name || 'N/A',
        record.user_email || 'N/A',
        record.currentBalance.toString(),
        record.totalRecords.toString(),
        record.hasRecords ? 'Active' : 'No Records',
        record.lastActivity ? new Date(record.lastActivity).toLocaleDateString() : 'N/A'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `user-financial-records-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: `Exported ${filteredRecords.length} user records to CSV`,
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Loading user financial records...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <p className="text-red-600">{error}</p>
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
                <User className="h-5 w-5" />
                User Financial Records
              </CardTitle>
              <CardDescription>
                Overview of all user financial activities and balances ({filteredRecords.length} users)
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button 
                variant="default" 
                onClick={syncAllUserRecords} 
                disabled={syncing}
                className="w-full sm:w-auto"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing...' : 'Sync Records'}
              </Button>
              <Button variant="outline" onClick={exportUserRecords} className="w-full sm:w-auto">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Mobile-First Filters */}
          <div className="space-y-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full sm:w-[180px] bg-brand-600 border-brand-700 text-white hover:bg-brand-700">
                  <Filter className="h-4 w-4 mr-2 text-white" />
                  <SelectValue className="text-white" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="has_records">Has Records</SelectItem>
                  <SelectItem value="no_records">No Records</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Mobile-Optimized Records List */}
          <div className="space-y-3">
            {filteredRecords.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <User className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium mb-2">No records found</h3>
                <p className="text-sm">
                  {searchTerm ? "Try adjusting your search terms" : "No financial records available"}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredRecords.map((record) => (
                  <Card key={record.user_id} className="hover:shadow-md transition-all duration-200 animate-fade-in">
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        {/* User Info */}
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full flex-shrink-0">
                            <User className="h-5 w-5 text-blue-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm sm:text-base truncate">
                              {record.user_name || 'No name'}
                            </p>
                            <p className="text-xs sm:text-sm text-gray-600 truncate">
                              {record.user_email}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant={record.hasRecords ? "default" : "secondary"} className="text-xs">
                                {record.hasRecords ? "Active" : "No Records"}
                              </Badge>
                              {record.lastActivity && (
                                <span className="text-xs text-gray-500 hidden sm:inline">
                                  Last: {new Date(record.lastActivity).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Financial Stats - Mobile Layout */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                          <div className="flex flex-row sm:flex-col gap-4 sm:gap-0 text-left sm:text-right">
                            <div>
                              <p className="font-medium text-sm sm:text-base">{formatCurrency(record.currentBalance)}</p>
                              <p className="text-xs text-gray-500">Balance</p>
                            </div>
                            <div>
                              <p className="font-medium text-sm sm:text-base">{record.totalRecords}</p>
                              <p className="text-xs text-gray-500">Records</p>
                            </div>
                          </div>
                          
                          {/* Action Button */}
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handlePreviewUser(record)}
                            className="w-full sm:w-auto hover-scale"
                          >
                            <Eye className="h-4 w-4 sm:mr-0 mr-2" />
                            <span className="sm:hidden">View Details</span>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Financial Records: {selectedUser?.user_name || selectedUser?.user_email}
            </DialogTitle>
            <DialogDescription>
              Detailed financial activity for this user
            </DialogDescription>
          </DialogHeader>
          
          {loadingPreview ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2">Loading records...</span>
            </div>
          ) : (
            <div className="space-y-6 max-h-[60vh] overflow-y-auto">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <div>
                        <p className="text-sm text-gray-600">Current Balance</p>
                        <p className="text-lg font-bold">{formatCurrency(selectedUser?.currentBalance || 0)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-blue-600" />
                      <div>
                        <p className="text-sm text-gray-600">Total Records</p>
                        <p className="text-lg font-bold">{selectedUser?.totalRecords || 0}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-purple-600" />
                      <div>
                        <p className="text-sm text-gray-600">Last Activity</p>
                        <p className="text-lg font-bold">
                          {selectedUser?.lastActivity 
                            ? new Date(selectedUser.lastActivity).toLocaleDateString() 
                            : 'None'
                          }
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Records List */}
              <div className="space-y-3">
                <h4 className="font-medium">Transaction History</h4>
                {userFinanceRecords.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Activity className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p>No financial records found</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {userFinanceRecords.map((record) => (
                      <div key={record.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex-1">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                            <p className="font-medium">{record.description}</p>
                            <Badge variant="outline" className="text-xs w-fit">
                              {record.category}
                            </Badge>
                          </div>
                          <div className="flex flex-col sm:flex-row gap-2 mt-1 text-sm text-gray-600">
                            <span>{new Date(record.date).toLocaleDateString()}</span>
                            <span className="hidden sm:inline">•</span>
                            <span className="capitalize">{record.type}</span>
                            {record.reference && (
                              <>
                                <span className="hidden sm:inline">•</span>
                                <span>Ref: {record.reference}</span>
                              </>
                            )}
                          </div>
                          {record.notes && (
                            <p className="text-sm text-gray-500 mt-1">{record.notes}</p>
                          )}
                        </div>
                        <div className="flex flex-row sm:flex-col gap-4 sm:gap-1 text-right mt-2 sm:mt-0">
                          <div>
                            <p className={`font-medium ${record.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {record.amount >= 0 ? '+' : ''}{formatCurrency(record.amount)}
                            </p>
                            <p className="text-xs text-gray-500">Amount</p>
                          </div>
                          <div>
                            <p className="font-medium">{formatCurrency(record.balance)}</p>
                            <p className="text-xs text-gray-500">Balance</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
