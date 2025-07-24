import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface Budget {
  id: string;
  title: string;
  description?: string;
  total_amount: number;
  allocated_amount: number;
  spent_amount: number;
  remaining_amount: number;
  budget_type: 'project' | 'event' | 'contract' | 'annual';
  status: 'active' | 'completed' | 'cancelled' | 'on_hold';
  start_date: string;
  end_date?: string;
  created_by: string;
  contract_id?: string;
  event_id?: string;
  created_at: string;
  updated_at: string;
}

export interface BudgetCategory {
  id: string;
  budget_id: string;
  name: string;
  description?: string;
  allocated_amount: number;
  spent_amount: number;
  remaining_amount: number;
  created_at: string;
  updated_at: string;
}

export interface BudgetPermission {
  id: string;
  budget_id: string;
  user_id: string;
  permission_type: 'view' | 'edit' | 'manage';
  granted_by: string;
  granted_at: string;
}

export interface BudgetTransaction {
  id: string;
  budget_id: string;
  budget_category_id?: string;
  finance_record_id?: string;
  payment_id?: string;
  receipt_id?: string;
  transaction_type: 'expense' | 'payment' | 'receipt' | 'stipend' | 'allocation';
  amount: number;
  description?: string;
  transaction_date: string;
  created_at: string;
}

export interface BudgetUserAssociation {
  id: string;
  budget_id: string;
  user_id: string;
  permission_type: 'view' | 'edit' | 'manage';
  added_by: string;
  added_at: string;
}

export interface BudgetAttachment {
  id: string;
  budget_id?: string;
  event_id?: string;
  filename: string;
  file_url: string;
  file_type?: string;
  uploaded_by?: string;
  created_at: string;
}

export const useBudgets = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBudgets = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('budgets')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setBudgets((data as Budget[]) || []);
    } catch (err) {
      console.error('Error fetching budgets:', err);
      setError('Failed to load budgets');
      toast({
        title: "Error",
        description: "Failed to load budgets",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createBudget = async (
    budgetData: Omit<Budget, 'id' | 'created_at' | 'updated_at' | 'remaining_amount' | 'spent_amount' | 'created_by'> & { created_by?: string },
    userAssociations?: Array<{ user: { id: string; email: string; full_name?: string }; permission_type: 'view' | 'edit' | 'manage' }>
  ) => {
    if (!user) return null;

    try {
      // Create the budget
      const { data, error: createError } = await supabase
        .from('budgets')
        .insert([{
          ...budgetData,
          created_by: user.id
        }])
        .select()
        .single();

      if (createError) throw createError;

      // Create user associations if provided
      if (userAssociations && userAssociations.length > 0) {
        const associations = userAssociations.map(assoc => ({
          budget_id: data.id,
          user_id: assoc.user.id,
          permission_type: assoc.permission_type,
          added_by: user.id
        }));

        const { error: assocError } = await supabase
          .from('budget_user_associations')
          .insert(associations);

        if (assocError) {
          console.error('Error creating user associations:', assocError);
          // Don't fail budget creation if associations fail
        }
      }

      setBudgets(prev => [data as Budget, ...prev]);
      toast({
        title: "Success",
        description: "Budget created successfully",
      });

      return data;
    } catch (err) {
      console.error('Error creating budget:', err);
      toast({
        title: "Error",
        description: "Failed to create budget",
        variant: "destructive",
      });
      return null;
    }
  };

  const updateBudget = async (id: string, updates: Partial<Budget>) => {
    try {
      const { data, error: updateError } = await supabase
        .from('budgets')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      setBudgets(prev => prev.map(budget => 
        budget.id === id ? data as Budget : budget
      ));

      toast({
        title: "Success",
        description: "Budget updated successfully",
      });

      return data;
    } catch (err) {
      console.error('Error updating budget:', err);
      toast({
        title: "Error",
        description: "Failed to update budget",
        variant: "destructive",
      });
      return null;
    }
  };

  const deleteBudget = async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('budgets')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setBudgets(prev => prev.filter(budget => budget.id !== id));
      toast({
        title: "Success",
        description: "Budget deleted successfully",
      });

      return true;
    } catch (err) {
      console.error('Error deleting budget:', err);
      toast({
        title: "Error",
        description: "Failed to delete budget",
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    fetchBudgets();
  }, [user]);

  return {
    budgets,
    loading,
    error,
    createBudget,
    updateBudget,
    deleteBudget,
    refetch: fetchBudgets
  };
};

export const useBudgetCategories = (budgetId: string) => {
  const { toast } = useToast();
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = async () => {
    if (!budgetId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('budget_categories')
        .select('*')
        .eq('budget_id', budgetId)
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (err) {
      console.error('Error fetching budget categories:', err);
      toast({
        title: "Error",
        description: "Failed to load budget categories",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createCategory = async (categoryData: Omit<BudgetCategory, 'id' | 'created_at' | 'updated_at' | 'remaining_amount' | 'spent_amount'>) => {
    try {
      const { data, error } = await supabase
        .from('budget_categories')
        .insert([categoryData])
        .select()
        .single();

      if (error) throw error;

      setCategories(prev => [...prev, data]);
      toast({
        title: "Success",
        description: "Category created successfully",
      });

      return data;
    } catch (err) {
      console.error('Error creating category:', err);
      toast({
        title: "Error",
        description: "Failed to create category",
        variant: "destructive",
      });
      return null;
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [budgetId]);

  return {
    categories,
    loading,
    createCategory,
    refetch: fetchCategories
  };
};

export const useBudgetTransactions = (budgetId: string) => {
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<BudgetTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTransactions = async () => {
    if (!budgetId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('budget_transactions')
        .select('*')
        .eq('budget_id', budgetId)
        .order('transaction_date', { ascending: false });

      if (error) throw error;
      setTransactions((data as BudgetTransaction[]) || []);
    } catch (err) {
      console.error('Error fetching budget transactions:', err);
      toast({
        title: "Error",
        description: "Failed to load budget transactions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [budgetId]);

  return {
    transactions,
    loading,
    refetch: fetchTransactions
  };
};