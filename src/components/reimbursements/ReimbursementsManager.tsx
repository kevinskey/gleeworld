import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ReimbursementDialog } from "./ReimbursementDialog";
import { ReimbursementApprovalDialog } from "./ReimbursementApprovalDialog";
import { ReimbursementPaymentDialog } from "./ReimbursementPaymentDialog";
import { 
  Plus, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  XCircle, 
  CreditCard,
  FileText,
  Eye,
  Calendar,
  User,
  Trash2
} from "lucide-react";

interface ReimbursementRequest {
  id: string;
  requester_name: string;
  requester_email: string;
  amount: number;
  description: string;
  purchase_date: string;
  vendor_name: string;
  business_purpose: string;
  category: string;
  status: string;
  receipt_url?: string;
  receipt_filename?: string;
  treasurer_notes?: string;
  super_admin_notes?: string;
  payment_method?: string;
  check_number?: string;
  payment_date?: string;
  created_at: string;
  updated_at: string;
}

export const ReimbursementsManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<ReimbursementRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ReimbursementRequest | null>(null);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [userRole, setUserRole] = useState<{isTreasurer: boolean, isAdmin: boolean, isSuperAdmin: boolean}>({
    isTreasurer: false,
    isAdmin: false,
    isSuperAdmin: false
  });

  useEffect(() => {
    if (user) {
      fetchUserRole();
      fetchRequests();
    }
  }, [user]);

  const fetchUserRole = async () => {
    if (!user) return;
    
    try {
      // Check if user is treasurer
      const { data: treasurerData } = await supabase
        .from('gw_executive_board_members')
        .select('position')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      // Check if user is admin/super admin
      const { data: profileData } = await supabase
        .from('gw_profiles')
        .select('is_admin, is_super_admin')
        .eq('user_id', user.id)
        .single();

      setUserRole({
        isTreasurer: treasurerData?.position === 'treasurer',
        isAdmin: profileData?.is_admin || false,
        isSuperAdmin: profileData?.is_super_admin || false
      });
    } catch (error) {
      console.error('Error fetching user role:', error);
    }
  };

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_reimbursement_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching reimbursement requests:', error);
      toast({
        title: "Error",
        description: "Failed to load reimbursement requests",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_treasurer':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">Pending Treasurer</Badge>;
      case 'treasurer_approved':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">Treasurer Approved</Badge>;
      case 'pending_super_admin':
        return <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-300">Pending Super Admin</Badge>;
      case 'super_admin_approved':
        return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">Super Admin Approved</Badge>;
      case 'ready_for_payment':
        return <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-300">Ready for Payment</Badge>;
      case 'paid':
        return <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-300">Paid</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const canApprove = (request: ReimbursementRequest) => {
    if (request.status === 'pending_treasurer' && userRole.isTreasurer) return true;
    if (request.status === 'pending_super_admin' && userRole.isSuperAdmin) return true;
    return false;
  };

  const canProcessPayment = (request: ReimbursementRequest) => {
    return request.status === 'ready_for_payment' && userRole.isTreasurer;
  };

  const handleApprove = (request: ReimbursementRequest) => {
    setSelectedRequest(request);
    setApprovalDialogOpen(true);
  };

  const handlePayment = (request: ReimbursementRequest) => {
    setSelectedRequest(request);
    setPaymentDialogOpen(true);
  };

  const handleDelete = async (request: ReimbursementRequest) => {
    try {
      const { error } = await supabase
        .from('gw_reimbursement_requests')
        .delete()
        .eq('id', request.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Reimbursement request deleted successfully"
      });

      fetchRequests();
    } catch (error) {
      console.error('Error deleting reimbursement request:', error);
      toast({
        title: "Error",
        description: "Failed to delete reimbursement request",
        variant: "destructive"
      });
    }
  };

  const filterRequests = (status: string) => {
    switch (status) {
      case 'pending':
        return requests.filter(r => r.status.includes('pending'));
      case 'approved':
        return requests.filter(r => r.status.includes('approved') || r.status === 'ready_for_payment');
      case 'paid':
        return requests.filter(r => r.status === 'paid');
      case 'rejected':
        return requests.filter(r => r.status === 'rejected');
      default:
        return requests;
    }
  };

  const getRequestCounts = () => {
    return {
      pending: requests.filter(r => r.status.includes('pending')).length,
      approved: requests.filter(r => r.status.includes('approved') || r.status === 'ready_for_payment').length,
      paid: requests.filter(r => r.status === 'paid').length,
      total: requests.length
    };
  };

  const counts = getRequestCounts();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reimbursement Management</h1>
          <p className="text-muted-foreground">Manage reimbursement requests and approvals</p>
        </div>
        <Button 
          onClick={() => setIsDialogOpen(true)}
          className="bg-gradient-to-r from-brand-primary to-brand-secondary hover:from-brand-primary/90 hover:to-brand-secondary/90"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Request
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{counts.pending}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold">{counts.approved}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Paid</p>
                <p className="text-2xl font-bold">{counts.paid}</p>
              </div>
              <CreditCard className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{counts.total}</p>
              </div>
              <FileText className="w-8 h-8 text-gray-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>Reimbursement Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all">All ({requests.length})</TabsTrigger>
              <TabsTrigger value="pending">Pending ({counts.pending})</TabsTrigger>
              <TabsTrigger value="approved">Approved ({counts.approved})</TabsTrigger>
              <TabsTrigger value="paid">Paid ({counts.paid})</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
            </TabsList>
            
            {['all', 'pending', 'approved', 'paid', 'rejected'].map(status => (
              <TabsContent key={status} value={status} className="space-y-4">
                {filterRequests(status).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No {status === 'all' ? '' : status} requests found
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filterRequests(status).map((request) => (
                      <Card key={request.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="space-y-2 flex-1">
                              <div className="flex items-center gap-3">
                                <h3 className="font-semibold">{request.requester_name}</h3>
                                {getStatusBadge(request.status)}
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                <div className="flex items-center gap-2">
                                  <DollarSign className="w-4 h-4 text-green-600" />
                                  <span className="font-medium">${request.amount.toFixed(2)}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4 text-blue-600" />
                                  <span>{new Date(request.purchase_date).toLocaleDateString()}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <User className="w-4 h-4 text-purple-600" />
                                  <span>{request.vendor_name}</span>
                                </div>
                              </div>
                              
                              <p className="text-sm text-muted-foreground">{request.description}</p>
                              
                              {request.receipt_filename && (
                                <div className="flex items-center gap-2 text-sm">
                                  <FileText className="w-4 h-4" />
                                  <span>Receipt: {request.receipt_filename}</span>
                                </div>
                              )}
                            </div>
                            
                            <div className="flex gap-2 ml-4">
                              <Button variant="outline" size="sm">
                                <Eye className="w-4 h-4" />
                              </Button>
                              
                              {canApprove(request) && (
                                <Button 
                                  variant="default" 
                                  size="sm"
                                  onClick={() => handleApprove(request)}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  Approve
                                </Button>
                              )}
                              
                              {canProcessPayment(request) && (
                                <Button 
                                  variant="default" 
                                  size="sm"
                                  onClick={() => handlePayment(request)}
                                  className="bg-blue-600 hover:bg-blue-700"
                                >
                                  <CreditCard className="w-4 h-4 mr-1" />
                                  Pay
                                </Button>
                              )}
                              
                              {(userRole.isAdmin || userRole.isSuperAdmin) && (
                                <Button 
                                  variant="destructive" 
                                  size="sm"
                                  onClick={() => handleDelete(request)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <ReimbursementDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSuccess={fetchRequests}
      />

      {selectedRequest && (
        <>
          <ReimbursementApprovalDialog
            open={approvalDialogOpen}
            onOpenChange={setApprovalDialogOpen}
            request={selectedRequest}
            userRole={userRole}
            onSuccess={() => {
              fetchRequests();
              setApprovalDialogOpen(false);
              setSelectedRequest(null);
            }}
          />

          <ReimbursementPaymentDialog
            open={paymentDialogOpen}
            onOpenChange={setPaymentDialogOpen}
            request={selectedRequest}
            onSuccess={() => {
              fetchRequests();
              setPaymentDialogOpen(false);
              setSelectedRequest(null);
            }}
          />
        </>
      )}
    </div>
  );
};