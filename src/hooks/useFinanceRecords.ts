
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
      console.log('No user found, clearing records');
      setRecords([]);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching finance records for user:', user.id);
      
      const { data, error: fetchError } = await supabase
        .from('finance_records')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });
      
      if (fetchError) {
        console.error('Database error fetching records:', fetchError);
        throw fetchError;
      }
      
      console.log('Raw data from database:', data);
      
      // Cast the data to FinanceRecord type since we know the database constraints ensure valid types
      const typedRecords = (data || []).map(record => ({
        ...record,
        type: record.type as FinanceRecord['type']
      }));
      
      console.log('Processed finance records:', typedRecords);
      setRecords(typedRecords);
    } catch (err) {
      console.error('Error fetching finance records:', err);
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
      // Get the current balance (most recent record)
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

      // Cast the returned data to FinanceRecord type
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
    if (!user) return;

    try {
      console.log('Starting balance recalculation for user:', user.id);
      
      // Fetch all records ordered by date (oldest first), then by creation time for same dates
      const { data: allRecords, error } = await supabase
        .from('finance_records')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) throw error;

      console.log('Records to recalculate:', allRecords?.length || 0);

      let runningBalance = 0;
      const updatedRecords = allRecords?.map((record, index) => {
        const newBalance = calculateNewBalance(runningBalance, Number(record.amount), record.type);
        runningBalance = newBalance;
        
        console.log(`Record ${index + 1}: ${record.type} $${record.amount} -> Balance: $${newBalance}`);
        
        return { ...record, balance: newBalance };
      }) || [];

      // Update all records with new balances
      for (const record of updatedRecords) {
        await supabase
          .from('finance_records')
          .update({ balance: record.balance })
          .eq('id', record.id);
      }

      console.log('Balance recalculation completed');
      
      // Refresh the display
      await fetchRecords();
    } catch (err) {
      console.error('Error recalculating balances:', err);
    }
  };

  // Clean function to clear existing stipend records before import
  const clearExistingStipendRecords = async () => {
    if (!user) return;

    console.log('Clearing existing stipend records for user:', user.id);
    
    const { error } = await supabase
      .from('finance_records')
      .delete()
      .eq('user_id', user.id)
      .eq('type', 'stipend')
      .ilike('notes', '%Imported from contract system%');

    if (error) {
      console.error('Error clearing existing stipend records:', error);
      throw error;
    }

    console.log('Existing stipend records cleared');
  };

  // Extract stipend amount from structured contract data (prioritize structured data)
  const getStipendFromContract = (contract: any): number => {
    // Priority 1: Check structured stipend_amount in contracts_v2
    if (contract.stipend_amount && contract.stipend_amount > 0) {
      console.log(`Found structured stipend: $${contract.stipend_amount}`);
      return Number(contract.stipend_amount);
    }

    // Priority 2: Check structured stipend in generated_contracts  
    if (contract.stipend && contract.stipend > 0) {
      console.log(`Found generated contract stipend: $${contract.stipend}`);
      return Number(contract.stipend);
    }

    console.log(`No structured stipend found for contract: ${contract.title || contract.id}`);
    return 0;
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
      console.log('Starting clean stipend import for user:', user.id);

      // Step 1: Clear existing imported stipend records
      await clearExistingStipendRecords();

      let importedCount = 0;

      // Step 2: Import from generated_contracts (structured stipend data)
      console.log('Importing from generated_contracts...');
      const { data: generatedContracts, error: generatedError } = await supabase
        .from('generated_contracts')
        .select('*')
        .not('stipend', 'is', null)
        .gt('stipend', 0);

      if (generatedError) {
        console.error('Error fetching generated contracts:', generatedError);
        throw generatedError;
      }

      for (const contract of generatedContracts || []) {
        const stipendAmount = getStipendFromContract(contract);
        
        if (stipendAmount > 0) {
          console.log(`Importing generated contract stipend: $${stipendAmount} for ${contract.event_name}`);
          
          const { error: insertError } = await supabase
            .from('finance_records')
            .insert({
              user_id: user.id,
              date: new Date(contract.created_at).toISOString().split('T')[0],
              type: 'stipend',
              category: 'Performance',
              description: `Stipend for ${contract.event_name}`,
              amount: stipendAmount,
              balance: 0, // Will be recalculated
              reference: `Generated Contract ID: ${contract.id}`,
              notes: 'Imported from contract system'
            });
          
          if (insertError) {
            console.error('Error inserting generated contract record:', insertError);
          } else {
            importedCount++;
          }
        }
      }

      // Step 3: Import from contracts_v2 with structured stipend_amount
      console.log('Importing from contracts_v2 with structured stipend amounts...');
      const { data: contractsV2, error: contractsV2Error } = await supabase
        .from('contracts_v2')
        .select(`
          *,
          contract_signatures_v2!inner(
            status,
            artist_signed_at
          )
        `)
        .not('stipend_amount', 'is', null)
        .gt('stipend_amount', 0)
        .eq('contract_signatures_v2.status', 'completed');

      if (contractsV2Error) {
        console.error('Error fetching contracts_v2:', contractsV2Error);
        throw contractsV2Error;
      }

      for (const contract of contractsV2 || []) {
        const stipendAmount = getStipendFromContract(contract);
        
        if (stipendAmount > 0) {
          console.log(`Importing contracts_v2 stipend: $${stipendAmount} for ${contract.title}`);
          
          const signatureData = contract.contract_signatures_v2[0];
          const recordDate = signatureData?.artist_signed_at 
            ? new Date(signatureData.artist_signed_at).toISOString().split('T')[0]
            : new Date(contract.created_at).toISOString().split('T')[0];

          const { error: insertError } = await supabase
            .from('finance_records')
            .insert({
              user_id: user.id,
              date: recordDate,
              type: 'stipend',
              category: 'Performance',
              description: `Stipend from ${contract.title}`,
              amount: stipendAmount,
              balance: 0, // Will be recalculated
              reference: `Contract ID: ${contract.id}`,
              notes: 'Imported from contract system'
            });
          
          if (insertError) {
            console.error('Error inserting contracts_v2 record:', insertError);
          } else {
            importedCount++;
          }
        }
      }

      console.log(`Import completed. Total imported: ${importedCount}`);

      // Step 4: Recalculate all balances after importing
      if (importedCount > 0) {
        await recalculateBalances();
        
        toast({
          title: "Import Successful",
          description: `Imported ${importedCount} stipend records from contracts`,
        });
      } else {
        toast({
          title: "No Records Found",
          description: "No structured stipend data found in contracts",
        });
      }
      
    } catch (err) {
      console.error('Error importing stipend records:', err);
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
    importStipendRecords,
    exportToExcel,
    importFromExcel,
    refetch: fetchRecords
  };
};
