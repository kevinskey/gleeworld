import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, XCircle, DollarSign, Calendar, Building2, FileText, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
}

interface ReimbursementApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: ReimbursementRequest;
  userRole: {isTreasurer: boolean, isAdmin: boolean, isSuperAdmin: boolean};
  onSuccess: () => void;
}

export const ReimbursementApprovalDialog = ({ 
  open, 
  onOpenChange, 
  request, 
  userRole, 
  onSuccess 
}: ReimbursementApprovalDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const [notes, setNotes] = useState('');

  const handleApproval = async (approveAction: 'approve' | 'reject') => {
    if (!user) return;
    
    setLoading(true);
    try {
      let newStatus = request.status;
      let updateFields: any = {};

      if (request.status === 'pending_treasurer' && userRole.isTreasurer) {
        if (approveAction === 'approve') {
          newStatus = 'pending_super_admin';
          updateFields = {
            status: newStatus,
            treasurer_id: user.id,
            treasurer_approved_at: new Date().toISOString(),
            treasurer_notes: notes
          };
        } else {
          newStatus = 'rejected';
          updateFields = {
            status: newStatus,
            treasurer_id: user.id,
            treasurer_notes: notes
          };
        }
      } else if (request.status === 'pending_super_admin' && userRole.isSuperAdmin) {
        if (approveAction === 'approve') {
          newStatus = 'ready_for_payment';
          updateFields = {
            status: newStatus,
            super_admin_id: user.id,
            super_admin_approved_at: new Date().toISOString(),
            super_admin_notes: notes
          };
        } else {
          newStatus = 'rejected';
          updateFields = {
            status: newStatus,
            super_admin_id: user.id,
            super_admin_notes: notes
          };
        }
      }

      // Update the reimbursement request
      const { error: updateError } = await supabase
        .from('gw_reimbursement_requests')
        .update(updateFields)
        .eq('id', request.id);

      if (updateError) throw updateError;

      // Log the approval action
      const { error: logError } = await supabase
        .from('gw_reimbursement_approvals')
        .insert([{
          reimbursement_id: request.id,
          approver_id: user.id,
          action: approveAction === 'approve' ? 'approved' : 'rejected',
          notes: notes
        }]);

      if (logError) throw logError;

      toast({
        title: "Success",
        description: `Reimbursement request ${approveAction === 'approve' ? 'approved' : 'rejected'} successfully`
      });

      onSuccess();
    } catch (error) {
      console.error('Error updating reimbursement request:', error);
      toast({
        title: "Error",
        description: "Failed to update reimbursement request",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getNextStep = () => {
    if (request.status === 'pending_treasurer') {
      return "This request will be sent to Super Admin for final approval after Treasurer approval.";
    }
    if (request.status === 'pending_super_admin') {
      return "This request will be ready for payment processing after Super Admin approval.";
    }
    return "";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <CheckCircle className="w-6 h-6 text-brand-primary" />
            Review Reimbursement Request
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Request Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                Request Details
                <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                  {request.status.replace(/_/g, ' ').toUpperCase()}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium">Requester</p>
                    <p className="text-sm text-muted-foreground">{request.requester_name}</p>
                    <p className="text-xs text-muted-foreground">{request.requester_email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-green-600" />
                  <div>
                    <p className="text-sm font-medium">Amount</p>
                    <p className="text-lg font-bold text-green-600">${request.amount.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-purple-600" />
                  <div>
                    <p className="text-sm font-medium">Purchase Date</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(request.purchase_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-orange-600" />
                  <div>
                    <p className="text-sm font-medium">Vendor</p>
                    <p className="text-sm text-muted-foreground">{request.vendor_name}</p>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-1">Description</p>
                <p className="text-sm text-muted-foreground p-3 bg-muted rounded">
                  {request.description}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium mb-1">Business Purpose</p>
                <p className="text-sm text-muted-foreground p-3 bg-muted rounded">
                  {request.business_purpose}
                </p>
              </div>

              {request.receipt_filename && (
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <div>
                    <p className="text-sm font-medium">Receipt</p>
                    <p className="text-sm text-muted-foreground">{request.receipt_filename}</p>
                    {request.receipt_url && (
                      <a 
                        href={request.receipt_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-brand-primary hover:underline"
                      >
                        View Receipt
                      </a>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Approval Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {request.status === 'pending_treasurer' ? 'Treasurer Approval' : 'Super Admin Approval'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-blue-50 rounded border border-blue-200">
                <p className="text-sm text-blue-800">{getNextStep()}</p>
              </div>

              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any notes about this approval decision..."
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button 
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  variant="destructive"
                  onClick={() => handleApproval('reject')}
                  disabled={loading}
                  className="flex-1"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  {loading ? "Processing..." : "Reject"}
                </Button>
                <Button 
                  onClick={() => handleApproval('approve')}
                  disabled={loading}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {loading ? "Processing..." : "Approve"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};