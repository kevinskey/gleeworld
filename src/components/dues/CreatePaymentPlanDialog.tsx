import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { addMonths, addWeeks, format } from "date-fns";

interface CreatePaymentPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  duesRecords: any[];
}

export const CreatePaymentPlanDialog = ({ open, onOpenChange, onSuccess, duesRecords }: CreatePaymentPlanDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    dues_record_id: '',
    user_id: '',
    total_amount: '',
    installments: '3',
    frequency: 'monthly',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    auto_debit: false,
    payment_method: 'card'
  });

  const handleDuesRecordChange = (duesRecordId: string) => {
    const record = duesRecords.find(r => r.id === duesRecordId);
    if (record) {
      setFormData(prev => ({
        ...prev,
        dues_record_id: duesRecordId,
        user_id: record.user_id,
        total_amount: record.amount?.toString() || ''
      }));
    }
  };

  const calculateInstallmentAmount = () => {
    const total = parseFloat(formData.total_amount) || 0;
    const installments = parseInt(formData.installments) || 1;
    return (total / installments).toFixed(2);
  };

  const calculateEndDate = () => {
    if (!formData.start_date) return null;
    
    const startDate = new Date(formData.start_date);
    const installments = parseInt(formData.installments) || 1;
    
    if (formData.frequency === 'weekly') {
      return addWeeks(startDate, installments - 1);
    } else if (formData.frequency === 'monthly') {
      return addMonths(startDate, installments - 1);
    } else if (formData.frequency === 'quarterly') {
      return addMonths(startDate, (installments - 1) * 3);
    }
    
    return startDate;
  };

  const generateInstallments = async (paymentPlanId: string) => {
    const installments = parseInt(formData.installments) || 1;
    const installmentAmount = parseFloat(calculateInstallmentAmount());
    const startDate = new Date(formData.start_date);
    
    const installmentData = [];
    
    for (let i = 0; i < installments; i++) {
      let dueDate = new Date(startDate);
      
      if (formData.frequency === 'weekly') {
        dueDate = addWeeks(startDate, i);
      } else if (formData.frequency === 'monthly') {
        dueDate = addMonths(startDate, i);
      } else if (formData.frequency === 'quarterly') {
        dueDate = addMonths(startDate, i * 3);
      }
      
      installmentData.push({
        payment_plan_id: paymentPlanId,
        installment_number: i + 1,
        amount: installmentAmount,
        due_date: format(dueDate, 'yyyy-MM-dd'),
        status: 'pending'
      });
    }
    
    const { error } = await supabase
      .from('gw_payment_plan_installments')
      .insert(installmentData);
      
    if (error) throw error;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    try {
      const endDate = calculateEndDate();
      const installmentAmount = parseFloat(calculateInstallmentAmount());
      
      const { data: planData, error: planError } = await supabase
        .from('gw_dues_payment_plans')
        .insert([{
          dues_record_id: formData.dues_record_id,
          user_id: formData.user_id,
          total_amount: parseFloat(formData.total_amount),
          installments: parseInt(formData.installments),
          installment_amount: installmentAmount,
          frequency: formData.frequency,
          start_date: formData.start_date,
          end_date: endDate ? format(endDate, 'yyyy-MM-dd') : null,
          auto_debit: formData.auto_debit,
          payment_method: formData.payment_method,
          status: 'active'
        }])
        .select()
        .single();

      if (planError) throw planError;

      // Generate installments
      await generateInstallments(planData.id);

      toast({
        title: "Success",
        description: "Payment plan created successfully"
      });

      setFormData({
        dues_record_id: '',
        user_id: '',
        total_amount: '',
        installments: '3',
        frequency: 'monthly',
        start_date: format(new Date(), 'yyyy-MM-dd'),
        auto_debit: false,
        payment_method: 'card'
      });

      onSuccess();
    } catch (error) {
      console.error('Error creating payment plan:', error);
      toast({
        title: "Error",
        description: "Failed to create payment plan",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const pendingDuesRecords = duesRecords.filter(record => record.status === 'pending');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Payment Plan</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="dues_record">Dues Record</Label>
            <Select 
              value={formData.dues_record_id} 
              onValueChange={handleDuesRecordChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select dues record" />
              </SelectTrigger>
              <SelectContent>
                {pendingDuesRecords.map(record => (
                  <SelectItem key={record.id} value={record.id}>
                    {record.gw_profiles?.full_name || 'Unknown'} - ${record.amount?.toFixed(2)} ({record.semester})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="total_amount">Total Amount ($)</Label>
            <Input
              id="total_amount"
              type="number"
              step="0.01"
              min="0"
              value={formData.total_amount}
              onChange={(e) => setFormData({...formData, total_amount: e.target.value})}
              placeholder="0.00"
              required
            />
          </div>

          <div>
            <Label htmlFor="installments">Number of Installments</Label>
            <Select 
              value={formData.installments} 
              onValueChange={(value) => setFormData({...formData, installments: value})}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2">2 installments</SelectItem>
                <SelectItem value="3">3 installments</SelectItem>
                <SelectItem value="4">4 installments</SelectItem>
                <SelectItem value="6">6 installments</SelectItem>
                <SelectItem value="12">12 installments</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="frequency">Payment Frequency</Label>
            <Select 
              value={formData.frequency} 
              onValueChange={(value) => setFormData({...formData, frequency: value})}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="start_date">Start Date</Label>
            <Input
              id="start_date"
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData({...formData, start_date: e.target.value})}
              required
            />
          </div>

          <div>
            <Label htmlFor="payment_method">Payment Method</Label>
            <Select 
              value={formData.payment_method} 
              onValueChange={(value) => setFormData({...formData, payment_method: value})}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="card">Credit/Debit Card</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="auto_debit">Enable Auto-Debit</Label>
            <Switch
              id="auto_debit"
              checked={formData.auto_debit}
              onCheckedChange={(checked) => setFormData({...formData, auto_debit: checked})}
            />
          </div>

          {formData.total_amount && formData.installments && (
            <div className="p-3 rounded-lg bg-brand-subtle/20 border border-brand-accent/20">
              <div className="text-sm font-medium mb-1">Payment Summary</div>
              <div className="text-sm text-muted-foreground">
                {formData.installments} payments of ${calculateInstallmentAmount()} each
              </div>
              {calculateEndDate() && (
                <div className="text-sm text-muted-foreground">
                  Final payment: {format(calculateEndDate()!, 'MMM dd, yyyy')}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !formData.dues_record_id}
              className="flex-1 bg-gradient-to-r from-brand-primary to-brand-secondary hover:from-brand-primary/90 hover:to-brand-secondary/90"
            >
              {loading ? "Creating..." : "Create Payment Plan"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};