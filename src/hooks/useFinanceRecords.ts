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

      // Clear existing records first
      await clearAllRecords();

      let importedCount = 0;

      // Query ALL contracts_v2 to see what's available and examine the full structure
      console.log('=== DEBUGGING CONTRACTS_V2 ===');
      const { data: allContractsV2, error: allContractsV2Error } = await supabase
        .from('contracts_v2')
        .select('*');

      if (allContractsV2Error) {
        console.error('Error querying contracts_v2:', allContractsV2Error);
        throw allContractsV2Error;
      }

      console.log(`Found ${allContractsV2?.length || 0} total contracts in contracts_v2`);
      
      // Log the first few contracts to see their structure
      if (allContractsV2 && allContractsV2.length > 0) {
        console.log('Sample contracts_v2 structure:', allContractsV2.slice(0, 3));
        
        // Check all possible fields that might contain stipend data
        allContractsV2.forEach((contract, index) => {
          if (index < 5) { // Only log first 5 for brevity
            console.log(`Contract ${index + 1} fields:`, {
              id: contract.id,
              title: contract.title,
              stipend_amount: contract.stipend_amount,
              content_snippet: contract.content?.substring(0, 200),
              all_fields: Object.keys(contract)
            });
          }
        });
      }

      // Query ALL generated_contracts to see what's available and examine the full structure
      console.log('=== DEBUGGING GENERATED_CONTRACTS ===');
      const { data: allGeneratedContracts, error: allGeneratedError } = await supabase
        .from('generated_contracts')
        .select('*');

      if (allGeneratedError) {
        console.error('Error querying generated_contracts:', allGeneratedError);
        throw allGeneratedError;
      }

      console.log(`Found ${allGeneratedContracts?.length || 0} total generated contracts`);
      
      // Log the first few generated contracts to see their structure
      if (allGeneratedContracts && allGeneratedContracts.length > 0) {
        console.log('Sample generated_contracts structure:', allGeneratedContracts.slice(0, 3));
        
        // Check all possible fields that might contain stipend data
        allGeneratedContracts.forEach((contract, index) => {
          if (index < 5) { // Only log first 5 for brevity
            console.log(`Generated Contract ${index + 1} fields:`, {
              id: contract.id,
              event_name: contract.event_name,
              stipend: contract.stipend,
              all_fields: Object.keys(contract)
            });
          }
        });
      }

      // Search for stipend data in content field of contracts_v2
      const contractsWithStipendInContent = allContractsV2?.filter(contract => {
        const content = contract.content?.toLowerCase() || '';
        return content.includes('stipend') || content.includes('$') || content.includes('payment');
      }) || [];

      console.log(`Found ${contractsWithStipendInContent.length} contracts_v2 with stipend mentions in content`);

      // Search for any numeric values that might be stipends
      const contractsWithPossibleStipends = allContractsV2?.filter(contract => {
        return contract.stipend_amount && contract.stipend_amount > 0;
      }) || [];

      console.log(`Found ${contractsWithPossibleStipends.length} contracts_v2 with stipend_amount field`);

      // Import from contracts_v2 with stipend_amount
      for (const contract of contractsWithPossibleStipends) {
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
            balance: 0,
            reference: `Contract ID: ${contract.id}`,
            notes: 'Imported from contract system'
          });
        
        if (!insertError) {
          importedCount++;
          console.log('Successfully imported contract stipend:', contract.id);
        } else {
          console.error('Error inserting contract stipend:', insertError);
        }
      }

      // Import from generated_contracts with stipend field
      const generatedWithStipends = allGeneratedContracts?.filter(contract => 
        contract.stipend && contract.stipend > 0
      ) || [];

      console.log(`Found ${generatedWithStipends.length} generated contracts with stipends`);

      for (const contract of generatedWithStipends) {
        const { error: insertError } = await supabase
          .from('finance_records')
          .insert({
            user_id: user.id,
            date: new Date(contract.created_at).toISOString().split('T')[0],
            type: 'stipend',
            category: 'Performance',
            description: `Stipend for ${contract.event_name}`,
            amount: Number(contract.stipend),
            balance: 0,
            reference: `Generated Contract ID: ${contract.id}`,
            notes: 'Imported from contract system'
          });
        
        if (!insertError) {
          importedCount++;
          console.log('Successfully imported generated contract stipend:', contract.id);
        } else {
          console.error('Error inserting generated contract stipend:', insertError);
        }
      }

      console.log(`=== IMPORT SUMMARY ===`);
      console.log(`Total contracts_v2: ${allContractsV2?.length || 0}`);
      console.log(`Total generated_contracts: ${allGeneratedContracts?.length || 0}`);
      console.log(`Contracts with stipend_amount: ${contractsWithPossibleStipends.length}`);
      console.log(`Generated contracts with stipend: ${generatedWithStipends.length}`);
      console.log(`Total imported: ${importedCount}`);

      // Recalculate balances
      if (importedCount > 0) {
        await recalculateBalances();
        
        toast({
          title: "Import Successful",
          description: `Cleared existing records and imported ${importedCount} stipend records from contracts`,
        });
      } else {
        toast({
          title: "No Records Found",
          description: "No stipend data found in contracts. Check console for detailed analysis.",
        });
      }
      
    } catch (err) {
      console.error('Import failed:', err);
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
