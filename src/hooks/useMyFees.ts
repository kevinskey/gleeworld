import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MyFeeInstallment {
  id: string;
  installment_number: number;
  amount: number;
  due_date: string;
  status: 'pending' | 'paid' | 'overdue';
  paid_at?: string;
}

export interface MyPlan {
  id: string;
  student_fee_id: string;
  installments: MyFeeInstallment[];
}

export interface MyFee {
  id: string;
  category: string;
  name: string;
  amount: number;
  paid_amount: number;
  due_date: string | null;
  status: string;
  payment_method: string | null;
  paid_at: string | null;
  plan?: MyPlan;
}

export const useMyFees = () => {
  const [unpaid, setUnpaid] = useState<MyFee[]>([]);
  const [paid, setPaid] = useState<MyFee[]>([]);
  const [plans, setPlans] = useState<MyPlan[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: fees } = await supabase
        .from('gw_student_fees')
        .select('id, category, name, amount, paid_amount, due_date, status, payment_method, paid_at')
        .eq('user_id', user.id)
        .order('due_date', { ascending: true, nullsFirst: false });

      const { data: rawPlans } = await supabase
        .from('gw_fee_payment_plans')
        .select('id, student_fee_id, installments:gw_fee_plan_installments(id, installment_number, amount, due_date, status, paid_at)')
        .eq('user_id', user.id)
        .eq('status', 'active');

      const planByFee = new Map<string, MyPlan>();
      (rawPlans ?? []).forEach((p) => planByFee.set(p.student_fee_id, p as unknown as MyPlan));

      const decorated: MyFee[] = (fees ?? []).map((f) => ({
        ...(f as unknown as MyFee),
        plan: planByFee.get(f.id),
      }));

      setUnpaid(decorated.filter((f) => f.status === 'pending' || f.status === 'partial' || f.status === 'overdue'));
      setPaid(decorated.filter((f) => f.status === 'paid' || f.status === 'refunded' || f.status === 'waived'));
      setPlans((rawPlans as unknown as MyPlan[]) ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const totalOwed = unpaid.reduce((sum, f) => sum + (Number(f.amount) - Number(f.paid_amount)), 0);

  return { unpaid, paid, plans, totalOwed, loading, refetch: fetchAll };
};
