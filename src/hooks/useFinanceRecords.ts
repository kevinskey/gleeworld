
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

      console.log('=== COMPREHENSIVE CONTRACT DATA ANALYSIS ===');
      
      // Query ALL contracts_v2 with complete field analysis
      const { data: allContractsV2, error: allContractsV2Error } = await supabase
        .from('contracts_v2')
        .select('*');

      if (allContractsV2Error) {
        console.error('Error querying contracts_v2:', allContractsV2Error);
        throw allContractsV2Error;
      }

      console.log(`CONTRACTS_V2 ANALYSIS:`);
      console.log(`- Total contracts found: ${allContractsV2?.length || 0}`);
      
      if (allContractsV2 && allContractsV2.length > 0) {
        // Show all unique field names across all contracts
        const allFields = new Set();
        allContractsV2.forEach(contract => {
          Object.keys(contract).forEach(key => allFields.add(key));
        });
        console.log(`- All available fields:`, Array.from(allFields));
        
        // Analyze stipend-related fields
        const stipendFields = Array.from(allFields).filter(field => 
          field.toLowerCase().includes('stipend') || 
          field.toLowerCase().includes('amount') || 
          field.toLowerCase().includes('payment')
        );
        console.log(`- Stipend-related fields:`, stipendFields);
        
        // Check each contract for stipend data
        allContractsV2.forEach((contract, index) => {
          console.log(`CONTRACT ${index + 1}:`, {
            id: contract.id,
            title: contract.title,
            stipend_amount: contract.stipend_amount,
            content_preview: contract.content?.substring(0, 100) + '...',
            all_data: contract
          });
          
          // Search content for dollar amounts
          if (contract.content) {
            const dollarMatches = contract.content.match(/\$[\d,]+(?:\.\d{2})?/g);
            if (dollarMatches) {
              console.log(`  - Dollar amounts found in content:`, dollarMatches);
            }
            
            // Search for stipend mentions
            const stipendMentions = contract.content.toLowerCase().includes('stipend');
            if (stipendMentions) {
              console.log(`  - Content mentions "stipend"`);
            }
          }
        });
      }

      // Query ALL generated_contracts
      const { data: allGeneratedContracts, error: allGeneratedError } = await supabase
        .from('generated_contracts')
        .select('*');

      if (allGeneratedError) {
        console.error('Error querying generated_contracts:', allGeneratedError);
        throw allGeneratedError;
      }

      console.log(`\nGENERATED_CONTRACTS ANALYSIS:`);
      console.log(`- Total generated contracts found: ${allGeneratedContracts?.length || 0}`);
      
      if (allGeneratedContracts && allGeneratedContracts.length > 0) {
        // Show all unique field names
        const allGenFields = new Set();
        allGeneratedContracts.forEach(contract => {
          Object.keys(contract).forEach(key => allGenFields.add(key));
        });
        console.log(`- All available fields:`, Array.from(allGenFields));
        
        // Check each generated contract for stipend data
        allGeneratedContracts.forEach((contract, index) => {
          console.log(`GENERATED CONTRACT ${index + 1}:`, {
            id: contract.id,
            event_name: contract.event_name,
            stipend: contract.stipend,
            status: contract.status,
            all_data: contract
          });
          
          if (contract.stipend && contract.stipend > 0) {
            console.log(`  ✓ HAS STIPEND: $${contract.stipend}`);
          }
        });
      }

      // Try to find contracts with any numeric stipend values
      console.log(`\n=== STIPEND IMPORT PROCESS ===`);
      
      // Import from contracts_v2 with stipend_amount
      const contractsWithStipends = allContractsV2?.filter(contract => {
        const hasStipendAmount = contract.stipend_amount && contract.stipend_amount > 0;
        console.log(`Contract ${contract.id}: stipend_amount = ${contract.stipend_amount}, will import: ${hasStipendAmount}`);
        return hasStipendAmount;
      }) || [];

      console.log(`Found ${contractsWithStipends.length} contracts_v2 with stipend amounts`);

      for (const contract of contractsWithStipends) {
        const recordDate = new Date(contract.created_at).toISOString().split('T')[0];
        console.log(`Importing contract stipend:`, {
          id: contract.id,
          title: contract.title,
          amount: contract.stipend_amount,
          date: recordDate
        });

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
          console.log(`✓ Successfully imported contract stipend: ${contract.id}`);
        } else {
          console.error(`✗ Error inserting contract stipend:`, insertError);
        }
      }

      // Import from generated_contracts with stipend field
      const generatedWithStipends = allGeneratedContracts?.filter(contract => {
        const hasStipend = contract.stipend && contract.stipend > 0;
        console.log(`Generated contract ${contract.id}: stipend = ${contract.stipend}, will import: ${hasStipend}`);
        return hasStipend;
      }) || [];

      console.log(`Found ${generatedWithStipends.length} generated contracts with stipends`);

      for (const contract of generatedWithStipends) {
        console.log(`Importing generated contract stipend:`, {
          id: contract.id,
          event_name: contract.event_name,
          amount: contract.stipend
        });

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
          console.log(`✓ Successfully imported generated contract stipend: ${contract.id}`);
        } else {
          console.error(`✗ Error inserting generated contract stipend:`, insertError);
        }
      }

      console.log(`\n=== IMPORT SUMMARY ===`);
      console.log(`Total contracts_v2: ${allContractsV2?.length || 0}`);
      console.log(`Total generated_contracts: ${allGeneratedContracts?.length || 0}`);
      console.log(`Contracts with stipend_amount: ${contractsWithStipends.length}`);
      console.log(`Generated contracts with stipend: ${generatedWithStipends.length}`);
      console.log(`Total imported: ${importedCount}`);

      // Check if there are contracts that might have stipend data in other formats
      if (importedCount < 38) {
        console.log(`\n=== INVESTIGATING MISSING STIPENDS ===`);
        console.log(`Expected 38 stipends but only found ${importedCount}`);
        console.log(`Need to check for other stipend storage formats...`);
        
        // Look for any contracts with dollar amounts in content
        allContractsV2?.forEach(contract => {
          if (contract.content) {
            const dollarMatches = contract.content.match(/\$[\d,]+(?:\.\d{2})?/g);
            if (dollarMatches && dollarMatches.length > 0) {
              console.log(`Contract ${contract.id} has dollar amounts in content:`, dollarMatches);
            }
          }
        });
      }

      // Recalculate balances
      if (importedCount > 0) {
        await recalculateBalances();
        
        toast({
          title: "Import Results",
          description: `Imported ${importedCount} stipend records. Check console for detailed analysis.`,
        });
      } else {
        toast({
          title: "No Stipends Found",
          description: "No stipend data found. Check console for detailed analysis of contract data.",
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
