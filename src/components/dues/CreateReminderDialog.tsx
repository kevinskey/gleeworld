import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { addDays, format } from "date-fns";

interface CreateReminderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  duesRecords: any[];
  paymentPlans: any[];
}

export const CreateReminderDialog = ({ 
  open, 
  onOpenChange, 
  onSuccess, 
  duesRecords, 
  paymentPlans 
}: CreateReminderDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    target_type: 'dues_record', // dues_record, payment_plan, installment
    target_id: '',
    user_id: '',
    reminder_type: 'email',
    reminder_frequency: 'weekly',
    days_before_due: '7',
    custom_message: ''
  });

  const handleTargetChange = (targetId: string) => {
    let userId = '';
    
    if (formData.target_type === 'dues_record') {
      const record = duesRecords.find(r => r.id === targetId);
      userId = record?.user_id || '';
    } else if (formData.target_type === 'payment_plan') {
      const plan = paymentPlans.find(p => p.id === targetId);
      userId = plan?.user_id || '';
    }
    
    setFormData(prev => ({
      ...prev,
      target_id: targetId,
      user_id: userId
    }));
  };

  const calculateNextSendDate = () => {
    // This would be calculated based on the target's due date
    // For now, we'll use a default of tomorrow
    return addDays(new Date(), 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    try {
      const reminderData: any = {
        user_id: formData.user_id,
        reminder_type: formData.reminder_type,
        reminder_frequency: formData.reminder_frequency,
        days_before_due: parseInt(formData.days_before_due),
        next_send_at: calculateNextSendDate().toISOString(),
        is_active: true,
        custom_message: formData.custom_message || null
      };

      // Set the appropriate target field
      if (formData.target_type === 'dues_record') {
        reminderData.dues_record_id = formData.target_id;
      } else if (formData.target_type === 'payment_plan') {
        reminderData.payment_plan_id = formData.target_id;
      }

      const { error } = await (supabase as any)
        .from('gw_dues_reminders')
        .insert([reminderData]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Reminder created successfully"
      });

      setFormData({
        target_type: 'dues_record',
        target_id: '',
        user_id: '',
        reminder_type: 'email',
        reminder_frequency: 'weekly',
        days_before_due: '7',
        custom_message: ''
      });

      onSuccess();
    } catch (error) {
      console.error('Error creating reminder:', error);
      toast({
        title: "Error",
        description: "Failed to create reminder",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getTargetOptions = () => {
    if (formData.target_type === 'dues_record') {
      return duesRecords.filter(record => record.status !== 'paid').map(record => ({
        value: record.id,
        label: `${record.gw_profiles?.full_name || 'Unknown'} - ${record.semester} ($${record.amount?.toFixed(2)})`
      }));
    } else if (formData.target_type === 'payment_plan') {
      return paymentPlans.filter(plan => plan.status === 'active').map(plan => ({
        value: plan.id,
        label: `Payment Plan - $${plan.total_amount?.toFixed(2)} (${plan.installments} installments)`
      }));
    }
    return [];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Reminder</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="target_type">Reminder For</Label>
            <Select 
              value={formData.target_type} 
              onValueChange={(value) => setFormData({...formData, target_type: value, target_id: '', user_id: ''})}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dues_record">Dues Record</SelectItem>
                <SelectItem value="payment_plan">Payment Plan</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="target_id">Select Target</Label>
            <Select 
              value={formData.target_id} 
              onValueChange={handleTargetChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select target" />
              </SelectTrigger>
              <SelectContent>
                {getTargetOptions().map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="reminder_type">Reminder Type</Label>
            <Select 
              value={formData.reminder_type} 
              onValueChange={(value) => setFormData({...formData, reminder_type: value})}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="push">Push Notification</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="reminder_frequency">Frequency</Label>
            <Select 
              value={formData.reminder_frequency} 
              onValueChange={(value) => setFormData({...formData, reminder_frequency: value})}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="days_before_due">Days Before Due Date</Label>
            <Select 
              value={formData.days_before_due} 
              onValueChange={(value) => setFormData({...formData, days_before_due: value})}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 day</SelectItem>
                <SelectItem value="3">3 days</SelectItem>
                <SelectItem value="7">1 week</SelectItem>
                <SelectItem value="14">2 weeks</SelectItem>
                <SelectItem value="30">1 month</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="custom_message">Custom Message (Optional)</Label>
            <Textarea
              id="custom_message"
              value={formData.custom_message}
              onChange={(e) => setFormData({...formData, custom_message: e.target.value})}
              placeholder="Add a custom message to include in the reminder..."
              rows={3}
            />
          </div>

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
              disabled={loading || !formData.target_id}
              className="flex-1 bg-gradient-to-r from-brand-primary to-brand-secondary hover:from-brand-primary/90 hover:to-brand-secondary/90"
            >
              {loading ? "Creating..." : "Create Reminder"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};