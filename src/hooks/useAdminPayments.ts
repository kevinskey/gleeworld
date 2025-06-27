
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

      const { data, error } = await supabase
        .from('user_payments')
        .select(`
          *,
          profiles!user_id (email, full_name),
          contracts_v2 (title)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const transformedPayments = (data || []).map(payment => ({
        id: payment.id,
        user_id: payment.user_id,
        contract_id: payment.contract_id,
        amount: payment.amount,
        payment_date: payment.payment_date,
        payment_method: payment.payment_method,
        notes: payment.notes,
        user_email: payment.profiles?.email || '',
        user_full_name: payment.profiles?.full_name || null,
        contract_title: payment.contracts_v2?.title || null,
        created_at: payment.created_at,
      }));

      setPayments(transformedPayments);
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

      // Create notification for the user
      await supabase
        .from('user_notifications')
        .insert([{
          user_id: paymentData.user_id,
          title: 'Payment Received',
          message: `You have received a payment of $${paymentData.amount} via ${paymentData.payment_method}.`,
          type: 'success',
          created_by: user?.id,
        }]);

      toast({
        title: "Success",
        description: "Payment recorded successfully",
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

  return {
    payments,
    loading,
    error,
    refetch: fetchPayments,
    createPayment,
  };
};
