
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { FinanceRecord } from "@/components/finance/FinanceTable";

export const useFinanceRecords = () => {
  const [records, setRecords] = useState<FinanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchRecords = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('finance_records')
        .select('*')
        .order('date', { ascending: false });
      
      if (fetchError) {
        throw fetchError;
      }
      
      setRecords(data || []);
    } catch (err) {
      console.error('Error fetching finance records:', err);
      setError('Failed to fetch finance records');
    } finally {
      setLoading(false);
    }
  };

  const calculateBalance = (existingRecords: FinanceRecord[], newAmount: number, type: string) => {
    const currentBalance = existingRecords.length > 0 ? existingRecords[0].balance : 0; // Most recent record first
    
    switch (type) {
      case 'stipend':
      case 'credit':
        return currentBalance + newAmount;
      case 'receipt':
      case 'payment':
      case 'debit':
        return currentBalance - newAmount;
      default:
        return currentBalance;
    }
  };

  const createRecord = async (recordData: Omit<FinanceRecord, 'id' | 'created_at' | 'updated_at' | 'balance'>): Promise<FinanceRecord | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const newBalance = calculateBalance(records, recordData.amount, recordData.type);

      const { data, error } = await supabase
        .from('finance_records')
        .insert({
          ...recordData,
          user_id: user.id,
          balance: newBalance
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Recalculate all balances for records after this one
      await recalculateBalances();
      
      toast({
        title: "Success",
        description: "Finance record created successfully",
      });

      return data;
    } catch (err) {
      console.error('Error creating finance record:', err);
      toast({
        title: "Error",
        description: "Failed to create finance record",
        variant: "destructive",
      });
      return null;
    }
  };

  const updateRecord = async (id: string, updates: Partial<FinanceRecord>): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('finance_records')
        .update(updates)
        .eq('id', id);

      if (error) {
        throw error;
      }

      // Recalculate balances if amount or type changed
      if (updates.amount !== undefined || updates.type !== undefined) {
        await recalculateBalances();
      } else {
        await fetchRecords();
      }

      toast({
        title: "Success",
        description: "Finance record updated successfully",
      });

      return true;
    } catch (err) {
      console.error('Error updating finance record:', err);
      toast({
        title: "Error",
        description: "Failed to update finance record",
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteRecord = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('finance_records')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      await recalculateBalances();

      toast({
        title: "Success",
        description: "Finance record deleted successfully",
      });

      return true;
    } catch (err) {
      console.error('Error deleting finance record:', err);
      toast({
        title: "Error",
        description: "Failed to delete finance record",
        variant: "destructive",
      });
      return false;
    }
  };

  const recalculateBalances = async () => {
    try {
      // Fetch all records ordered by date (oldest first)
      const { data: allRecords, error } = await supabase
        .from('finance_records')
        .select('*')
        .order('date', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) throw error;

      let runningBalance = 0;
      const updatedRecords = allRecords?.map(record => {
        switch (record.type) {
          case 'stipend':
          case 'credit':
            runningBalance += Number(record.amount);
            break;
          case 'receipt':
          case 'payment':
          case 'debit':
            runningBalance -= Number(record.amount);
            break;
        }
        return { ...record, balance: runningBalance };
      }) || [];

      // Update all records with new balances
      for (const record of updatedRecords) {
        await supabase
          .from('finance_records')
          .update({ balance: record.balance })
          .eq('id', record.id);
      }

      // Refresh the display
      await fetchRecords();
    } catch (err) {
      console.error('Error recalculating balances:', err);
    }
  };

  const exportToExcel = () => {
    const headers = ['Date', 'Type', 'Category', 'Description', 'Amount', 'Balance', 'Reference', 'Notes'];
    const csvContent = [
      headers.join(','),
      ...records.map(record => [
        record.date,
        record.type,
        record.category,
        `"${record.description}"`,
        record.amount,
        record.balance,
        record.reference || '',
        `"${record.notes || ''}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finance-records-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Success",
      description: "Finance records exported to CSV",
    });
  };

  const importFromExcel = async (file: File) => {
    try {
      toast({
        title: "Info",
        description: "Excel import feature coming soon!",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to import Excel file",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  return {
    records,
    loading,
    error,
    createRecord,
    updateRecord,
    deleteRecord,
    exportToExcel,
    importFromExcel,
    refetch: fetchRecords
  };
};
