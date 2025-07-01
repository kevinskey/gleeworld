
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface StipendRecord {
  amount: number;
  description: string;
  user_name: string;
  user_email: string;
  date: string;
  category: string;
  reference?: string;
  contract_title?: string;
  contract_id?: string;
}

interface StipendSummary {
  totalAmount: number;
  totalCount: number;
  averageAmount: number;
  uniqueUsers: number;
}

export const useAdminStipends = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [stipends, setStipends] = useState<StipendRecord[]>([]);
  const [summary, setSummary] = useState<StipendSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStipends = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Check if user is admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!profile || !['admin', 'super-admin'].includes(profile.role)) {
        throw new Error('Access denied: Admin privileges required');
      }

      console.log('Fetching comprehensive contract and stipend data...');

      // Fetch stipend records from finance_records
      const { data: financeRecords, error: financeError } = await supabase
        .from('finance_records')
        .select('*')
        .eq('type', 'stipend')
        .order('date', { ascending: false });

      if (financeError) {
        console.error('Error fetching finance records:', financeError);
        throw financeError;
      }

      // Fetch user profiles to get names and emails
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email');

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        throw profilesError;
      }

      // Create a map for quick profile lookup
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Fetch contracts with stipend amounts
      const { data: contractsV2, error: contractsError } = await supabase
        .from('contracts_v2')
        .select('id, title, stipend_amount, created_at, created_by')
        .not('stipend_amount', 'is', null)
        .gt('stipend_amount', 0);

      if (contractsError) {
        console.error('Error fetching contracts_v2:', contractsError);
      }

      // Fetch generated contracts with stipends
      const { data: generatedContracts, error: generatedError } = await supabase
        .from('generated_contracts')
        .select('id, event_name, stipend, created_at, created_by')
        .not('stipend', 'is', null)
        .gt('stipend', 0);

      if (generatedError) {
        console.error('Error fetching generated_contracts:', generatedError);
      }

      console.log('Data fetched:', {
        financeRecords: financeRecords?.length || 0,
        contractsV2: contractsV2?.length || 0,
        generatedContracts: generatedContracts?.length || 0
      });

      // Process existing finance records
      const existingStipends = financeRecords?.map(record => {
        const userProfile = profileMap.get(record.user_id);
        return {
          amount: record.amount || 0,
          description: record.description,
          user_name: userProfile?.full_name || '',
          user_email: userProfile?.email || '',
          date: record.date,
          category: record.category,
          reference: record.reference,
          contract_title: record.description.includes('Stipend from') ? 
            record.description.replace('Stipend from ', '') : undefined,
          contract_id: record.reference?.includes('Contract ID:') ?
            record.reference.replace('Contract ID: ', '') : undefined
        };
      }) || [];

      // Process contracts_v2 that might not be in finance_records yet
      const contractStipends = contractsV2?.map(contract => {
        const userProfile = profileMap.get(contract.created_by);
        return {
          amount: Number(contract.stipend_amount) || 0,
          description: `Stipend from ${contract.title}`,
          user_name: userProfile?.full_name || '',
          user_email: userProfile?.email || '',
          date: new Date(contract.created_at).toISOString().split('T')[0],
          category: 'Performance',
          reference: `Contract ID: ${contract.id}`,
          contract_title: contract.title,
          contract_id: contract.id
        };
      }) || [];

      // Process generated contracts that might not be in finance_records yet
      const generatedStipends = generatedContracts?.map(contract => {
        const userProfile = profileMap.get(contract.created_by);
        return {
          amount: Number(contract.stipend) || 0,
          description: `Stipend for ${contract.event_name}`,
          user_name: userProfile?.full_name || '',
          user_email: userProfile?.email || '',
          date: new Date(contract.created_at).toISOString().split('T')[0],
          category: 'Performance',
          reference: `Generated Contract ID: ${contract.id}`,
          contract_title: contract.event_name,
          contract_id: contract.id
        };
      }) || [];

      // Combine all stipends and remove duplicates based on reference
      const allStipends = [...existingStipends, ...contractStipends, ...generatedStipends];
      const uniqueStipends = allStipends.filter((stipend, index, self) => 
        index === self.findIndex(s => s.reference === stipend.reference)
      );

      // Sort by date (most recent first)
      uniqueStipends.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setStipends(uniqueStipends);

      // Calculate summary
      const totalAmount = uniqueStipends.reduce((sum, record) => sum + record.amount, 0);
      const totalCount = uniqueStipends.length;
      const averageAmount = totalCount > 0 ? totalAmount / totalCount : 0;
      const uniqueUsers = new Set(uniqueStipends.map(s => s.user_email)).size;

      setSummary({
        totalAmount,
        totalCount,
        averageAmount,
        uniqueUsers
      });

      console.log('Stipend processing complete:', {
        totalStipends: uniqueStipends.length,
        totalAmount,
        uniqueUsers
      });

    } catch (err) {
      console.error('Error fetching stipends:', err);
      setError('Failed to load stipend data');
      toast({
        title: "Error",
        description: "Failed to load stipend data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const syncContractStipends = async () => {
    if (!user) return;

    try {
      setLoading(true);
      console.log('Syncing contract stipends to finance records...');

      // Check if user is admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!profile || !['admin', 'super-admin'].includes(profile.role)) {
        throw new Error('Access denied: Admin privileges required');
      }

      // Get all existing finance records to avoid duplicates
      const { data: existingRecords } = await supabase
        .from('finance_records')
        .select('reference')
        .eq('type', 'stipend');

      const existingReferences = new Set(existingRecords?.map(r => r.reference) || []);

      let syncedCount = 0;

      // Sync contracts_v2 stipends
      const { data: contractsV2 } = await supabase
        .from('contracts_v2')
        .select('*')
        .not('stipend_amount', 'is', null)
        .gt('stipend_amount', 0);

      for (const contract of contractsV2 || []) {
        const reference = `Contract ID: ${contract.id}`;
        if (!existingReferences.has(reference) && contract.created_by) {
          const { error } = await supabase
            .from('finance_records')
            .insert({
              user_id: contract.created_by,
              date: new Date(contract.created_at).toISOString().split('T')[0],
              type: 'stipend',
              category: 'Performance',
              description: `Stipend from ${contract.title}`,
              amount: Number(contract.stipend_amount),
              balance: 0, // Will be recalculated
              reference: reference,
              notes: 'Auto-synced from contract system'
            });

          if (!error) {
            syncedCount++;
            console.log(`Synced contract stipend: ${contract.id}`);
          }
        }
      }

      // Sync generated_contracts stipends
      const { data: generatedContracts } = await supabase
        .from('generated_contracts')
        .select('*')
        .not('stipend', 'is', null)
        .gt('stipend', 0);

      for (const contract of generatedContracts || []) {
        const reference = `Generated Contract ID: ${contract.id}`;
        if (!existingReferences.has(reference) && contract.created_by) {
          const { error } = await supabase
            .from('finance_records')
            .insert({
              user_id: contract.created_by,
              date: new Date(contract.created_at).toISOString().split('T')[0],
              type: 'stipend',
              category: 'Performance',
              description: `Stipend for ${contract.event_name}`,
              amount: Number(contract.stipend),
              balance: 0, // Will be recalculated
              reference: reference,
              notes: 'Auto-synced from contract system'
            });

          if (!error) {
            syncedCount++;
            console.log(`Synced generated contract stipend: ${contract.id}`);
          }
        }
      }

      if (syncedCount > 0) {
        toast({
          title: "Sync Complete",
          description: `Synced ${syncedCount} contract stipends to finance records`,
        });
        await fetchStipends(); // Refresh the data
      } else {
        toast({
          title: "Already Synced",
          description: "All contract stipends are already in finance records",
        });
      }

    } catch (err) {
      console.error('Error syncing stipends:', err);
      toast({
        title: "Sync Failed",
        description: "Failed to sync contract stipends",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStipends();
  }, [user]);

  return {
    stipends,
    summary,
    loading,
    error,
    refetch: fetchStipends,
    syncContractStipends
  };
};
