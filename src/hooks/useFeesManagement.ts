import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

export interface StudentFee {
  id: string;
  user_id: string;
  amount: number;
  due_date: string;
  paid_date?: string;
  semester: string;
  academic_year: string;
  status: 'pending' | 'paid' | 'overdue' | 'partial' | 'refunded' | 'waived';
  payment_method?: string;
  notes?: string;
  // New columns from migration
  template_id?: string;
  category: string;
  name: string;
  payment_reference?: string;
  stripe_payment_intent_id?: string;
  context_type?: string;
  context_id?: string;
  paid_at?: string;
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
  student_fee_id: string;
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
  source: string;
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
  notes?: string | null;
  paid_date?: string | null;
  payment_method?: string | null;
  stripe_payment_intent_id?: string | null;
  transaction_id?: string | null;
  created_at: string;
  updated_at: string;
}

export const useFeesManagement = () => {
  const [studentFees, setStudentFees] = useState<StudentFee[]>([]);
  const [paymentPlans, setPaymentPlans] = useState<PaymentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchStudentFees = async () => {
    try {
      console.log('Fetching student fees...');
      const { data, error } = await supabase
        .from('gw_student_fees')
        .select(`
          *,
          user_profile:gw_profiles_directory!user_id (
            full_name,
            email,
            role
          )
        `)
        .order('due_date', { ascending: false });

      console.log('Fetch student fees result:', { data, error });
      if (error) throw error;
      setStudentFees((data || []) as any);
      console.log('Set student fees:', data?.length || 0, 'records');
    } catch (error) {
      console.error('Error fetching student fees:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      toast({
        title: "Error",
        description: `Failed to fetch student fees: ${error.message || 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };

  const fetchPaymentPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_fee_payment_plans')
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

  const createFeesForSemester = async (
    semester: string = 'Fall 2025',
    dueDate: string = '2025-09-15',
    amount: number = 100
  ) => {
    try {
      console.log('Starting fee creation for semester:', semester);

      // Get all current members who don't have fee records for this semester
      const { data: members, error: membersError } = await supabase
        .from('gw_profiles_directory')
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
          description: "No members found to create fee records for",
          variant: "destructive",
        });
        return 0;
      }

      console.log(`Found ${members.length} members with valid user_ids`);

      // Filter out any existing fee records for this semester
      const { data: existingFees, error: existingError } = await supabase
        .from('gw_student_fees')
        .select('user_id')
        .eq('semester', semester);

      console.log('Existing fees query result:', { existingFees, error: existingError });

      if (existingError) {
        console.error('Error fetching existing fees:', existingError);
        throw existingError;
      }

      const existingUserIds = new Set(existingFees?.map(d => d.user_id) || []);
      const membersToCreate = members.filter(member =>
        member.user_id && !existingUserIds.has(member.user_id)
      );

      console.log(`Creating fees for ${membersToCreate.length} members:`, membersToCreate.map(m => m.full_name));

      if (membersToCreate.length === 0) {
        toast({
          title: "No New Records Needed",
          description: `All members already have fee records for ${semester}`,
        });
        return 0;
      }

      // Create fee records for each member
      const feeRecords = membersToCreate.map(member => ({
        user_id: member.user_id,
        amount: amount,
        due_date: dueDate,
        semester: semester,
        academic_year: '2025-2026',
        status: 'pending' as const,
        category: 'dues',
        name: `${semester} 2025-2026`,
      }));

      console.log('About to insert fee records:', feeRecords);

      const { data: insertResult, error } = await supabase
        .from('gw_student_fees')
        .insert(feeRecords)
        .select();

      console.log('Insert result:', { data: insertResult, error });

      if (error) {
        console.error('Error inserting fee records:', error);
        throw error;
      }

      toast({
        title: "Success",
        description: `Created fee records for ${membersToCreate.length} members`,
      });

      await fetchStudentFees();
      return membersToCreate.length;
    } catch (error) {
      console.error('Error creating fees for semester:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      toast({
        title: "Error",
        description: `Failed to create fee records: ${error.message || 'Unknown error'}`,
        variant: "destructive",
      });
      throw error;
    }
  };

  const createPaymentPlan = async (
    studentFeeId: string,
    planType: 'two_installments' | 'five_installments' | 'ten_installments'
  ) => {
    try {
      // Get the fee record to get the amount
      const { data: feeRecord, error: feeError } = await supabase
        .from('gw_student_fees')
        .select('amount, user_id')
        .eq('id', studentFeeId)
        .single();

      if (feeError) throw feeError;

      const installmentCount = planType === 'two_installments' ? 2 : planType === 'five_installments' ? 5 : 10;
      const installmentAmount = feeRecord.amount / installmentCount;

      // Determine frequency and dates based on plan type
      let frequency, startDate;
      if (planType === 'two_installments') {
        frequency = 'monthly';
        startDate = '2025-08-15';
      } else if (planType === 'five_installments') {
        frequency = 'monthly';
        startDate = '2025-05-15';
      } else { // ten_installments
        frequency = 'bi_weekly';
        startDate = '2025-03-15';
      }

      // Create the payment plan
      const { data: paymentPlan, error: planError } = await supabase
        .from('gw_fee_payment_plans')
        .insert({
          student_fee_id: studentFeeId,
          user_id: feeRecord.user_id,
          total_amount: feeRecord.amount,
          installments: installmentCount,
          installment_amount: installmentAmount,
          frequency: frequency,
          start_date: startDate,
          end_date: '2025-09-15',
          status: 'active',
          auto_debit: false,
          source: 'self_serve',
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
    studentFeeId: string,
    paymentMethod?: string
  ) => {
    try {
      const { error } = await supabase
        .from('gw_student_fees')
        .update({
          status: 'paid',
          paid_date: new Date().toISOString().split('T')[0],
          payment_method: paymentMethod || 'manual',
          updated_at: new Date().toISOString()
        })
        .eq('id', studentFeeId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Payment recorded successfully",
      });

      await fetchStudentFees();
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
    studentFeeId: string,
    reminderType: 'upcoming_due' | 'overdue' | 'payment_plan_reminder',
    message: string,
    scheduledDate: string
  ) => {
    try {
      const { error } = await supabase
        .from('gw_fee_reminders')
        .insert({
          user_id: userId,
          student_fee_id: studentFeeId,
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
            title: 'Fee Payment Reminder',
            message: message,
            type: 'dues_reminder',
            related_id: studentFeeId
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

  // ── Task 6: RPC-backed payment / refund / waive ──────────────────────────

  const recordPayment = useCallback(async (
    feeId: string,
    method: 'cash' | 'check' | 'venmo' | 'other' | 'stripe',
    amount: number,
    reference?: string,
  ) => {
    const { data, error } = await supabase.rpc('record_fee_payment', {
      p_fee_id: feeId,
      p_method: method,
      p_amount: amount,
      p_reference: reference ?? null,
    });
    if (error) throw error;
    await fetchStudentFees();
    return data;
  }, []);

  const refundFee = useCallback(async (feeId: string, note: string) => {
    // Fetch the fee to determine how it was paid
    const { data: fee, error: feeErr } = await supabase
      .from('gw_student_fees')
      .select('payment_method, stripe_payment_intent_id')
      .eq('id', feeId)
      .single();
    if (feeErr) throw feeErr;

    if (fee?.payment_method === 'stripe' && fee?.stripe_payment_intent_id) {
      // Route through edge function so the Stripe refund is issued first
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const { error: fnError } = await supabase.functions.invoke('refund-fee-stripe', {
        body: { studentFeeId: feeId, note },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (fnError) throw fnError;
    } else {
      // Non-Stripe payment: call the RPC directly
      const { data, error } = await supabase.rpc('refund_fee', {
        p_fee_id: feeId,
        p_note: note,
      });
      if (error) throw error;
    }

    await fetchStudentFees();
  }, []);

  const waiveFee = useCallback(async (feeId: string, note: string) => {
    const { data, error } = await supabase.rpc('waive_fee', {
      p_fee_id: feeId,
      p_note: note,
    });
    if (error) throw error;
    await fetchStudentFees();
    return data;
  }, []);

  // ─────────────────────────────────────────────────────────────────────────

  const sendBulkReminders = async () => {
    try {
      // Create notifications for overdue fees
      const overdueFees = studentFees.filter(record =>
        record.status === 'pending' && new Date(record.due_date) < new Date()
      );

      for (const record of overdueFees) {
        await supabase
          .from('gw_notifications')
          .insert({
            user_id: record.user_id,
            title: 'Fee Payment Overdue',
            message: `Your ${record.semester} fee payment of $${record.amount} was due on ${new Date(record.due_date).toLocaleDateString()}. Please make your payment as soon as possible.`,
            type: 'dues_reminder',
            related_id: record.id
          });
      }

      toast({
        title: "Success",
        description: `Sent ${overdueFees.length} reminder notifications`,
      });

      return overdueFees.length;
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
      console.log('useFeesManagement: Starting to load data...');
      setLoading(true);
      try {
        await Promise.all([fetchStudentFees(), fetchPaymentPlans()]);
        console.log('useFeesManagement: Data loaded successfully');
      } catch (error) {
        console.error('useFeesManagement: Error loading data:', error);
      }
      setLoading(false);
    };

    loadData();
  }, []);

  return {
    studentFees,
    paymentPlans,
    loading,
    fetchStudentFees,
    createFeesForSemester,
    createPaymentPlan,
    markPaymentComplete,
    recordPayment,
    refundFee,
    waiveFee,
    createReminder,
    sendBulkReminders,
    refetch: async () => {
      await Promise.all([fetchStudentFees(), fetchPaymentPlans()]);
    }
  };
};
