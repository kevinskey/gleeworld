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
      console.log('Starting stipend import for user:', user.id);

      // Fetch signed contracts with stipend amounts
      const { data: contractSignatures, error: contractError } = await supabase
        .from('contract_signatures_v2')
        .select(`
          *,
          contracts_v2!inner(
            id,
            title,
            content,
            created_at
          )
        `)
        .eq('status', 'completed');

      if (contractError) {
        console.error('Error fetching contract signatures:', contractError);
        throw contractError;
      }

      console.log('Found contract signatures:', contractSignatures?.length || 0);

      // Also fetch from generated_contracts table
      const { data: generatedContracts, error: generatedError } = await supabase
        .from('generated_contracts')
        .select('*')
        .not('stipend', 'is', null)
        .gt('stipend', 0);

      if (generatedError) {
        console.error('Error fetching generated contracts:', generatedError);
        throw generatedError;
      }

      console.log('Found generated contracts with stipends:', generatedContracts?.length || 0);

      let importedCount = 0;
      
      // Process contract signatures
      for (const signature of contractSignatures || []) {
        const contract = signature.contracts_v2;
        
        // Extract stipend amount from contract content
        const content = contract.content || '';
        const stipendMatch = content.match(/\$?([\d,]+(?:\.\d{2})?)/);
        
        if (stipendMatch) {
          const stipendAmount = parseFloat(stipendMatch[1].replace(/,/g, ''));
          
          if (stipendAmount > 0) {
            console.log(`Processing contract ${contract.id} with stipend $${stipendAmount}`);
            
            // Check if record already exists
            const { data: existingRecord } = await supabase
              .from('finance_records')
              .select('id')
              .eq('user_id', user.id)
              .eq('type', 'stipend')
              .eq('amount', stipendAmount)
              .eq('description', `Stipend from ${contract.title}`)
              .maybeSingle();

            if (!existingRecord) {
              const { error: insertError } = await supabase
                .from('finance_records')
                .insert({
                  user_id: user.id,
                  date: signature.artist_signed_at ? new Date(signature.artist_signed_at).toISOString().split('T')[0] : new Date(contract.created_at).toISOString().split('T')[0],
                  type: 'stipend',
                  category: 'Performance',
                  description: `Stipend from ${contract.title}`,
                  amount: stipendAmount,
                  balance: 0, // Will be recalculated
                  reference: `Contract ID: ${contract.id}`,
                  notes: 'Imported from contract system'
                });
              
              if (insertError) {
                console.error('Error inserting stipend record:', insertError);
              } else {
                importedCount++;
                console.log(`Imported stipend record: $${stipendAmount} from ${contract.title}`);
              }
            } else {
              console.log(`Stipend record already exists for ${contract.title}`);
            }
          }
        }
      }

      // Process generated contracts
      for (const contract of generatedContracts || []) {
        if (contract.stipend && contract.stipend > 0) {
          console.log(`Processing generated contract ${contract.id} with stipend $${contract.stipend}`);
          
          // Check if record already exists
          const { data: existingRecord } = await supabase
            .from('finance_records')
            .select('id')
            .eq('user_id', user.id)
            .eq('type', 'stipend')
            .eq('amount', contract.stipend)
            .eq('description', `Stipend for ${contract.event_name}`)
            .maybeSingle();

          if (!existingRecord) {
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
                reference: `Event Contract ID: ${contract.id}`,
                notes: 'Imported from contract system'
              });
            
            if (insertError) {
              console.error('Error inserting generated contract stipend record:', insertError);
            } else {
              importedCount++;
              console.log(`Imported stipend record: $${contract.stipend} for ${contract.event_name}`);
            }
          } else {
            console.log(`Stipend record already exists for ${contract.event_name}`);
          }
        }
      }

      console.log(`Import completed. Total imported: ${importedCount}`);

      if (importedCount > 0) {
        // Recalculate all balances after importing
        await recalculateBalances();
        
        toast({
          title: "Import Successful",
          description: `Imported ${importedCount} stipend records from contracts`,
        });
      } else {
        toast({
          title: "No New Records",
          description: "No new stipend records found to import",
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
