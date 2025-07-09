
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface AdminPayment {
  id: string;
  user_id: string;
  contract_id: string | null;
  amount: number | null;
  payment_date: string | null;
  payment_method: string;
  notes: string | null;
  user_email: string;
  user_full_name: string | null;
  contract_title: string | null;
  created_at: string;
}

export const useAdminPayments = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPayments = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // First get payments
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('user_payments')
        .select('*')
        .order('created_at', { ascending: false });

      if (paymentsError) throw paymentsError;

      // Then enrich with user and contract data
      const enrichedPayments = await Promise.all(
        (paymentsData || []).map(async (payment) => {
          // Get user profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('id', payment.user_id)
            .single();

          // Get contract if exists
          let contractTitle = null;
          if (payment.contract_id) {
            const { data: contract } = await supabase
              .from('contracts_v2')
              .select('title')
              .eq('id', payment.contract_id)
              .single();
            contractTitle = contract?.title || null;
          }

          return {
            id: payment.id,
            user_id: payment.user_id,
            contract_id: payment.contract_id,
            amount: payment.amount,
            payment_date: payment.payment_date,
            payment_method: payment.payment_method,
            notes: payment.notes,
            user_email: profile?.email || '',
            user_full_name: profile?.full_name || null,
            contract_title: contractTitle,
            created_at: payment.created_at,
          };
        })
      );

      setPayments(enrichedPayments);
    } catch (error) {
      console.error('Error fetching payments:', error);
      setError('Failed to load payments');
      toast({
        title: "Error",
        description: "Failed to load payments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createPayment = async (paymentData: {
    user_id: string;
    contract_id?: string;
    amount: number;
    payment_date: string;
    payment_method: string;
    notes?: string;
  }) => {
    try {
      const { data, error } = await supabase
        .from('user_payments')
        .insert([{
          ...paymentData,
          paid_by: user?.id,
        }])
        .select()
        .single();

      if (error) throw error;

      // Create corresponding finance record
      await supabase
        .from('finance_records')
        .insert([{
          user_id: paymentData.user_id,
          date: paymentData.payment_date,
          type: 'payment',
          category: 'Payment',
          description: `Payment received via ${paymentData.payment_method}`,
          amount: -paymentData.amount, // Negative because it's money going out to the user
          balance: 0, // Will be recalculated by sync function
          reference: paymentData.contract_id ? `Contract ID: ${paymentData.contract_id}` : `Payment ID: ${data.id}`,
          notes: paymentData.notes || 'Payment processed through admin panel'
        }]);

      // Create notification for the user
      await supabase
        .from('user_notifications')
        .insert([{
          user_id: paymentData.user_id,
          title: 'Payment Received',
          message: `Thank you for your service! Your payment of $${paymentData.amount} has been issued via ${paymentData.payment_method}.`,
          type: 'success',
          created_by: user?.id,
        }]);

      // Send email notification
      try {
        await supabase.functions.invoke('send-payment-notification', {
          body: {
            userId: paymentData.user_id,
            amount: paymentData.amount,
            paymentMethod: paymentData.payment_method,
            contractId: paymentData.contract_id,
          }
        });
      } catch (emailError) {
        console.error('Email notification failed:', emailError);
        // Don't fail the payment creation if email fails
      }

      toast({
        title: "Success",
        description: "Payment recorded and notification sent",
      });

      fetchPayments();
      return data;
    } catch (error) {
      console.error('Error creating payment:', error);
      toast({
        title: "Error",
        description: "Failed to record payment",
        variant: "destructive",
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [user]);

  const updatePayment = async (paymentId: string, paymentData: {
    amount?: number;
    payment_date?: string;
    payment_method?: string;
    notes?: string;
  }) => {
    try {
      const { data, error } = await supabase
        .from('user_payments')
        .update(paymentData)
        .eq('id', paymentId)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Payment updated successfully",
      });

      // Refresh the data immediately
      await fetchPayments();
      return data;
    } catch (error) {
      console.error('Error updating payment:', error);
      toast({
        title: "Error",
        description: "Failed to update payment",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deletePayment = async (paymentId: string) => {
    try {
      // First, delete the corresponding finance record if it exists
      await supabase
        .from('finance_records')
        .delete()
        .like('reference', `%Payment ID: ${paymentId}%`);

      // Delete the payment
      const { error } = await supabase
        .from('user_payments')
        .delete()
        .eq('id', paymentId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Payment deleted successfully",
      });

      // Refresh the data immediately
      await fetchPayments();
    } catch (error) {
      console.error('Error deleting payment:', error);
      toast({
        title: "Error",
        description: "Failed to delete payment",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Set up real-time subscription for immediate updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('payment-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_payments'
        },
        () => {
          // Refresh payments when any payment changes
          fetchPayments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    payments,
    loading,
    error,
    refetch: fetchPayments,
    createPayment,
    updatePayment,
    deletePayment,
  };
};
