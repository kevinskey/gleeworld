
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { FinanceRecord } from "@/components/finance/FinanceTable";

export const useFinanceRecords = () => {
  const [records, setRecords] = useState<FinanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchRecords = async () => {
    if (!user) {
      setRecords([]);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('finance_records')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });
      
      if (fetchError) {
        throw fetchError;
      }
      
      const typedRecords = (data || []).map(record => ({
        ...record,
        type: record.type as FinanceRecord['type']
      }));
      
      setRecords(typedRecords);
    } catch (err) {
      setError('Failed to fetch finance records');
    } finally {
      setLoading(false);
    }
  };

  const calculateNewBalance = (currentBalance: number, amount: number, type: string): number => {
    switch (type) {
      case 'stipend':
      case 'credit':
        return currentBalance + amount;
      case 'receipt':
      case 'payment':  
      case 'debit':
        return currentBalance - amount;
      default:
        return currentBalance;
    }
  };

  const createRecord = async (recordData: Omit<FinanceRecord, 'id' | 'created_at' | 'updated_at' | 'balance'>): Promise<FinanceRecord | null> => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to create finance records",
        variant: "destructive",
      });
      return null;
    }

    try {
      const { data: latestRecord } = await supabase
        .from('finance_records')
        .select('balance')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const currentBalance = latestRecord?.balance || 0;
      const newBalance = calculateNewBalance(currentBalance, recordData.amount, recordData.type);

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

      const typedRecord = {
        ...data,
        type: data.type as FinanceRecord['type']
      };

      await fetchRecords();
      
      toast({
        title: "Success",
        description: "Finance record created successfully",
      });

      return typedRecord;
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to create finance record",
        variant: "destructive",
      });
      return null;
    }
  };

  const updateRecord = async (id: string, updates: Partial<FinanceRecord>): Promise<boolean> => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to update finance records",
        variant: "destructive",
      });
      return false;
    }

    try {
      const { error } = await supabase
        .from('finance_records')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

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
      toast({
        title: "Error",
        description: "Failed to update finance record",
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteRecord = async (id: string): Promise<boolean> => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to delete finance records",
        variant: "destructive",
      });
      return false;
    }

    try {
      const { error } = await supabase
        .from('finance_records')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

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
      toast({
        title: "Error",
        description: "Failed to delete finance record",
        variant: "destructive",
      });
      return false;
    }
  };

  const recalculateBalances = async () => {
    if (!user) return;

    try {
      const { data: allRecords, error } = await supabase
        .from('finance_records')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) throw error;

      let runningBalance = 0;
      const updatedRecords = allRecords?.map((record) => {
        const newBalance = calculateNewBalance(runningBalance, Number(record.amount), record.type);
        runningBalance = newBalance;
        return { ...record, balance: newBalance };
      }) || [];

      for (const record of updatedRecords) {
        await supabase
          .from('finance_records')
          .update({ balance: record.balance })
          .eq('id', record.id);
      }
      
      await fetchRecords();
    } catch (err) {
      console.error('Error recalculating balances:', err);
    }
  };

  const clearAllRecords = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to clear finance records",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('finance_records')
        .delete()
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      await fetchRecords();
      
      toast({
        title: "Success",
        description: "All finance records cleared successfully",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to clear finance records",
        variant: "destructive",
      });
    }
  };

  const importStipendRecords = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to import stipend records",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      // Step 1: Clear ALL existing finance records
      await clearAllRecords();

      let importedCount = 0;

      // Step 2: Import from contracts_v2 with structured stipend_amount
      const { data: contractsV2, error: contractsV2Error } = await supabase
        .from('contracts_v2')
        .select('*')
        .not('stipend_amount', 'is', null)
        .gt('stipend_amount', 0);

      if (contractsV2Error) {
        throw contractsV2Error;
      }

      for (const contract of contractsV2 || []) {
        if (contract.stipend_amount && contract.stipend_amount > 0) {
          const recordDate = new Date(contract.created_at).toISOString().split('T')[0];

          const { error: insertError } = await supabase
            .from('finance_records')
            .insert({
              user_id: user.id,
              date: recordDate,
              type: 'stipend',
              category: 'Performance',
              description: `Stipend from ${contract.title}`,
              amount: Number(contract.stipend_amount),
              balance: 0, // Will be recalculated
              reference: `Contract ID: ${contract.id}`,
              notes: 'Imported from contract system'
            });
          
          if (!insertError) {
            importedCount++;
          }
        }
      }

      // Step 3: Import from generated_contracts with structured stipend data
      const { data: generatedContracts, error: generatedError } = await supabase
        .from('generated_contracts')
        .select('*')
        .not('stipend', 'is', null)
        .gt('stipend', 0);

      if (generatedError) {
        throw generatedError;
      }

      for (const contract of generatedContracts || []) {
        if (contract.stipend && contract.stipend > 0) {
          const { error: insertError } = await supabase
            .from('finance_records')
            .insert({
              user_id: user.id,
              date: new Date(contract.created_at).toISOString().split('T')[0],
              type: 'stipend',
              category: 'Performance',
              description: `Stipend for ${contract.event_name}`,
              amount: Number(contract.stipend),
              balance: 0, // Will be recalculated
              reference: `Generated Contract ID: ${contract.id}`,
              notes: 'Imported from contract system'
            });
          
          if (!insertError) {
            importedCount++;
          }
        }
      }

      // Step 4: Recalculate all balances after importing
      if (importedCount > 0) {
        await recalculateBalances();
        
        toast({
          title: "Import Successful",
          description: `Cleared existing records and imported ${importedCount} stipend records from contracts`,
        });
      } else {
        toast({
          title: "No Records Found",
          description: "No stipend data found in contracts",
        });
      }
      
    } catch (err) {
      toast({
        title: "Import Failed",
        description: "Failed to import stipend records from contracts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
  }, [user]);

  return {
    records,
    loading,
    error,
    createRecord,
    updateRecord,
    deleteRecord,
    clearAllRecords,
    importStipendRecords,
    exportToExcel,
    importFromExcel,
    refetch: fetchRecords
  };
};
