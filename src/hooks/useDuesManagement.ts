import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

export interface DuesRecord {
  id: string;
  user_id: string;
  amount: number;
  due_date: string;
  paid_date?: string;
  semester: string;
  academic_year: string;
  status: 'pending' | 'paid' | 'overdue' | 'partial';
  payment_method?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  user_profile?: {
    full_name: string;
    email: string;
    role: string;
  };
}

export interface PaymentPlan {
  id: string;
  dues_record_id: string;
  user_id: string;
  total_amount: number;
  installments: number;
  installment_amount: number;
  frequency: string;
  start_date: string;
  end_date: string;
  status: 'active' | 'completed' | 'cancelled';
  auto_debit: boolean;
  payment_method?: string;
  created_at: string;
  updated_at: string;
  installments_data?: PaymentInstallment[];
}

export interface PaymentInstallment {
  id: string;
  payment_plan_id: string;
  installment_number: number;
  amount: number;
  due_date: string;
  status: 'pending' | 'paid' | 'overdue';
  paid_amount: number;
  paid_at?: string;
  created_at: string;
  updated_at: string;
}

export const useDuesManagement = () => {
  const [duesRecords, setDuesRecords] = useState<DuesRecord[]>([]);
  const [paymentPlans, setPaymentPlans] = useState<PaymentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchDuesRecords = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_dues_records')
        .select(`
          *,
          user_profile:gw_profiles!user_id (
            full_name,
            email,
            role
          )
        `)
        .order('due_date', { ascending: false });

      if (error) throw error;
      setDuesRecords((data || []) as any);
    } catch (error) {
      console.error('Error fetching dues records:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      toast({
        title: "Error",
        description: `Failed to fetch dues records: ${error.message || 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };

  const fetchPaymentPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_dues_payment_plans')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPaymentPlans((data || []) as any);
    } catch (error) {
      console.error('Error fetching payment plans:', error);
      toast({
        title: "Error",
        description: "Failed to fetch payment plans",
        variant: "destructive",
      });
    }
  };

  const createDuesForSemester = async (
    semester: string = 'Fall 2025',
    dueDate: string = '2025-09-15',
    amount: number = 100
  ) => {
    try {
      console.log('Starting dues creation for semester:', semester);
      
      // Get all current members who don't have dues records for this semester
      const { data: members, error: membersError } = await supabase
        .from('gw_profiles')
        .select('user_id, full_name')
        .eq('role', 'member')
        .not('user_id', 'is', null);

      console.log('Members query result:', { members, error: membersError });

      if (membersError) {
        console.error('Error fetching members:', membersError);
        throw membersError;
      }

      if (!members || members.length === 0) {
        toast({
          title: "No Members Found",
          description: "No members found to create dues records for",
          variant: "destructive",
        });
        return 0;
      }

      console.log(`Found ${members.length} members with valid user_ids`);

      // Filter out any existing dues records for this semester
      const { data: existingDues, error: existingError } = await supabase
        .from('gw_dues_records')
        .select('user_id')
        .eq('semester', semester);

      console.log('Existing dues query result:', { existingDues, error: existingError });

      if (existingError) {
        console.error('Error fetching existing dues:', existingError);
        throw existingError;
      }

      const existingUserIds = new Set(existingDues?.map(d => d.user_id) || []);
      const membersToCreate = members.filter(member => 
        member.user_id && !existingUserIds.has(member.user_id)
      );

      console.log(`Creating dues for ${membersToCreate.length} members:`, membersToCreate.map(m => m.full_name));

      if (membersToCreate.length === 0) {
        toast({
          title: "No New Records Needed",
          description: `All members already have dues records for ${semester}`,
        });
        return 0;
      }

      // Create dues records for each member
      const duesRecords = membersToCreate.map(member => ({
        user_id: member.user_id,
        amount: amount,
        due_date: dueDate,
        semester: semester,
        academic_year: '2025-2026',
        status: 'pending' as const
      }));

      console.log('About to insert dues records:', duesRecords);

      const { data: insertResult, error } = await supabase
        .from('gw_dues_records')
        .insert(duesRecords)
        .select();

      console.log('Insert result:', { data: insertResult, error });

      if (error) {
        console.error('Error inserting dues records:', error);
        throw error;
      }
      
      toast({
        title: "Success",
        description: `Created dues records for ${membersToCreate.length} members`,
      });
      
      await fetchDuesRecords();
      return membersToCreate.length;
    } catch (error) {
      console.error('Error creating dues for semester:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      toast({
        title: "Error",
        description: `Failed to create dues records: ${error.message || 'Unknown error'}`,
        variant: "destructive",
      });
      throw error;
    }
  };

  const createPaymentPlan = async (
    duesRecordId: string,
    planType: 'full_payment' | 'two_installments' | 'three_installments'
  ) => {
    try {
      // Get the dues record to get the amount
      const { data: duesRecord, error: duesError } = await supabase
        .from('gw_dues_records')
        .select('amount, user_id')
        .eq('id', duesRecordId)
        .single();

      if (duesError) throw duesError;

      const installmentCount = planType === 'full_payment' ? 1 : planType === 'two_installments' ? 2 : 3;
      const installmentAmount = duesRecord.amount / installmentCount;

      // Create the payment plan
      const { data: paymentPlan, error: planError } = await supabase
        .from('gw_dues_payment_plans')
        .insert({
          dues_record_id: duesRecordId,
          user_id: duesRecord.user_id,
          total_amount: duesRecord.amount,
          installments: installmentCount,
          installment_amount: installmentAmount,
          frequency: planType === 'full_payment' ? 'one_time' : 'monthly',
          start_date: planType === 'full_payment' ? '2025-09-15' : '2025-07-15',
          end_date: '2025-09-15',
          status: 'active',
          auto_debit: false
        })
        .select()
        .single();

      if (planError) throw planError;

      toast({
        title: "Success",
        description: "Payment plan created successfully",
      });

      await fetchPaymentPlans();
      return paymentPlan;
    } catch (error) {
      console.error('Error creating payment plan:', error);
      toast({
        title: "Error",
        description: "Failed to create payment plan",
        variant: "destructive",
      });
      throw error;
    }
  };

  const markPaymentComplete = async (
    duesRecordId: string,
    paymentMethod?: string
  ) => {
    try {
      const { error } = await supabase
        .from('gw_dues_records')
        .update({
          status: 'paid',
          paid_date: new Date().toISOString().split('T')[0],
          payment_method: paymentMethod || 'manual',
          updated_at: new Date().toISOString()
        })
        .eq('id', duesRecordId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Payment recorded successfully",
      });

      await fetchDuesRecords();
    } catch (error) {
      console.error('Error marking payment complete:', error);
      toast({
        title: "Error",
        description: "Failed to record payment",
        variant: "destructive",
      });
      throw error;
    }
  };

  const createReminder = async (
    userId: string,
    duesRecordId: string,
    reminderType: 'upcoming_due' | 'overdue' | 'payment_plan_reminder',
    message: string,
    scheduledDate: string
  ) => {
    try {
      const { error } = await supabase
        .from('gw_dues_reminders')
        .insert({
          user_id: userId,
          dues_record_id: duesRecordId,
          reminder_type: reminderType,
          message: message,
          scheduled_date: scheduledDate
        });

      if (error) throw error;

      // Create immediate notification if due today
      const today = new Date().toISOString().split('T')[0];
      if (scheduledDate <= today) {
        await supabase
          .from('gw_notifications')
          .insert({
            user_id: userId,
            title: 'Dues Payment Reminder',
            message: message,
            type: 'dues_reminder',
            related_id: duesRecordId
          });
      }

      toast({
        title: "Success",
        description: "Reminder created successfully",
      });
    } catch (error) {
      console.error('Error creating reminder:', error);
      toast({
        title: "Error",
        description: "Failed to create reminder",
        variant: "destructive",
      });
      throw error;
    }
  };

  const sendBulkReminders = async () => {
    try {
      // Create notifications for overdue dues
      const overdueDues = duesRecords.filter(record => 
        record.status === 'pending' && new Date(record.due_date) < new Date()
      );

      for (const record of overdueDues) {
        await supabase
          .from('gw_notifications')
          .insert({
            user_id: record.user_id,
            title: 'Dues Payment Overdue',
            message: `Your ${record.semester} dues payment of $${record.amount} was due on ${new Date(record.due_date).toLocaleDateString()}. Please make your payment as soon as possible.`,
            type: 'dues_reminder',
            related_id: record.id
          });
      }
      
      toast({
        title: "Success",
        description: `Sent ${overdueDues.length} reminder notifications`,
      });
      
      return overdueDues.length;
    } catch (error) {
      console.error('Error sending bulk reminders:', error);
      toast({
        title: "Error",
        description: "Failed to send reminders",
        variant: "destructive",
      });
      throw error;
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchDuesRecords(), fetchPaymentPlans()]);
      setLoading(false);
    };

    loadData();
  }, []);

  return {
    duesRecords,
    paymentPlans,
    loading,
    createDuesForSemester,
    createPaymentPlan,
    markPaymentComplete,
    createReminder,
    sendBulkReminders,
    refetch: async () => {
      await Promise.all([fetchDuesRecords(), fetchPaymentPlans()]);
    }
  };
};