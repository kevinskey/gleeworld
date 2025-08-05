import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { CreditCard, DollarSign, Calendar, Building2, FileText, User, CheckCircle } from "lucide-react";
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

interface ReimbursementPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: ReimbursementRequest;
  onSuccess: () => void;
}

export const ReimbursementPaymentDialog = ({ 
  open, 
  onOpenChange, 
  request, 
  onSuccess 
}: ReimbursementPaymentDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [paymentData, setPaymentData] = useState({
    payment_method: '',
    check_number: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_notes: ''
  });

  const handlePayment = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Update the reimbursement request with payment information
      const { error: updateError } = await supabase
        .from('gw_reimbursement_requests')
        .update({
          status: 'paid',
          payment_method: paymentData.payment_method,
          check_number: paymentData.check_number,
          payment_date: paymentData.payment_date,
          paid_by: user.id,
          payment_notes: paymentData.payment_notes
        })
        .eq('id', request.id);

      if (updateError) throw updateError;

      // Log the payment action
      const { error: logError } = await supabase
        .from('gw_reimbursement_approvals')
        .insert([{
          reimbursement_id: request.id,
          approver_id: user.id,
          action: 'paid',
          notes: `Payment processed via ${paymentData.payment_method}${paymentData.check_number ? ` - Check #${paymentData.check_number}` : ''}`
        }]);

      if (logError) throw logError;

      // Create a finance record for the ledger
      const { error: financeError } = await supabase
        .from('finance_records')
        .insert([{
          user_id: user.id,
          type: 'debit',
          amount: request.amount,
          balance: 0, // This will be calculated by the system
          description: `Reimbursement: ${request.description}`,
          category: 'Reimbursement',
          date: paymentData.payment_date,
          notes: `Paid to: ${request.requester_name} via ${paymentData.payment_method}${paymentData.check_number ? ` - Check #${paymentData.check_number}` : ''}`
        }]);

      if (financeError) {
        console.error('Error creating finance record:', financeError);
        // Don't fail the whole transaction for this
      }

      toast({
        title: "Payment Processed",
        description: `Reimbursement of $${request.amount.toFixed(2)} has been processed successfully`
      });

      onSuccess();
    } catch (error) {
      console.error('Error processing payment:', error);
      toast({
        title: "Error",
        description: "Failed to process payment",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <CreditCard className="w-6 h-6 text-brand-primary" />
            Process Payment
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Request Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                Payment Summary
                <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                  Ready for Payment
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium">Payee</p>
                    <p className="text-sm text-muted-foreground">{request.requester_name}</p>
                    <p className="text-xs text-muted-foreground">{request.requester_email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-green-600" />
                  <div>
                    <p className="text-sm font-medium">Amount</p>
                    <p className="text-2xl font-bold text-green-600">${request.amount.toFixed(2)}</p>
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
                <p className="text-sm text-muted-foreground p-2 bg-muted rounded">
                  {request.description}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Payment Details Form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Payment Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="payment_method">Payment Method *</Label>
                  <Select 
                    value={paymentData.payment_method} 
                    onValueChange={(value) => setPaymentData({...paymentData, payment_method: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent className="bg-background">
                      <SelectItem value="check">Check</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="petty_cash">Petty Cash</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="payment_date">Payment Date *</Label>
                  <Input
                    id="payment_date"
                    type="date"
                    value={paymentData.payment_date}
                    onChange={(e) => setPaymentData({...paymentData, payment_date: e.target.value})}
                    required
                  />
                </div>
              </div>

              {paymentData.payment_method === 'check' && (
                <div>
                  <Label htmlFor="check_number">Check Number</Label>
                  <Input
                    id="check_number"
                    value={paymentData.check_number}
                    onChange={(e) => setPaymentData({...paymentData, check_number: e.target.value})}
                    placeholder="Enter check number"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="payment_notes">Payment Notes (Optional)</Label>
                <Textarea
                  id="payment_notes"
                  value={paymentData.payment_notes}
                  onChange={(e) => setPaymentData({...paymentData, payment_notes: e.target.value})}
                  placeholder="Add any notes about this payment..."
                  rows={3}
                />
              </div>

              <div className="p-4 bg-yellow-50 rounded border border-yellow-200">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800">Payment Confirmation</p>
                    <p className="text-sm text-yellow-700">
                      Once processed, this payment will be recorded in the ledger and the request will be marked as completed.
                    </p>
                  </div>
                </div>
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
                  onClick={handlePayment}
                  disabled={loading || !paymentData.payment_method}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  {loading ? "Processing..." : `Process Payment ($${request.amount.toFixed(2)})`}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};