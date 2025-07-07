
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
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);

  const fetchStipends = async (autoSync = true) => {
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

      // Auto-sync contract stipends to finance records first if enabled
      if (autoSync && autoSyncEnabled) {
        await autoSyncContractStipends();
      }

      console.log('Fetching all contract stipend data...');

      // Fetch all contract signatures with stipend amounts (these represent user assignments to contracts)
      // Only show COMPLETED contracts
      const { data: contractSignatures, error: signaturesError } = await supabase
        .from('contract_signatures')
        .select(`
          id,
          user_id,
          contract_id,
          contracts_v2!inner(id, title, stipend_amount, created_at, status)
        `)
        .not('contracts_v2.stipend_amount', 'is', null)
        .gt('contracts_v2.stipend_amount', 0)
        .eq('contracts_v2.status', 'completed');

      if (signaturesError) {
        console.error('Error fetching contract signatures:', signaturesError);
        throw signaturesError;
      }

      // Fetch all contract user assignments with stipend amounts
      // Only show COMPLETED contracts
      const { data: contractAssignments, error: assignmentsError } = await supabase
        .from('contract_user_assignments')
        .select(`
          id,
          user_id,
          contract_id,
          generated_contracts!inner(id, event_name, stipend, created_at, status)
        `)
        .not('generated_contracts.stipend', 'is', null)
        .gt('generated_contracts.stipend', 0)
        .eq('generated_contracts.status', 'completed');

      if (assignmentsError) {
        console.error('Error fetching contract assignments:', assignmentsError);
        throw assignmentsError;
      }

      // Fetch all user profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email');

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Also fetch any actual payments for context
      const { data: userPayments } = await supabase
        .from('user_payments')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('Data fetched:', {
        contractSignatures: contractSignatures?.length || 0,
        contractAssignments: contractAssignments?.length || 0,
        userPayments: userPayments?.length || 0
      });

      // Process contract signatures (contracts_v2 assigned to users)
      const contractSignatureStipends = contractSignatures?.map(signature => {
        const userProfile = profileMap.get(signature.user_id);
        const contract = signature.contracts_v2 as any;
        return {
          amount: Number(contract?.stipend_amount) || 0,
          description: `Stipend from ${contract?.title}`,
          user_name: userProfile?.full_name || '',
          user_email: userProfile?.email || '',
          date: new Date(contract?.created_at).toISOString().split('T')[0],
          category: 'Contract Stipend',
          reference: `Contract Signature: ${signature.id}`,
          contract_title: contract?.title,
          contract_id: contract?.id
        };
      }) || [];

      // Process contract assignments (generated_contracts assigned to users)
      const contractAssignmentStipends = contractAssignments?.map(assignment => {
        const userProfile = profileMap.get(assignment.user_id);
        const contract = assignment.generated_contracts as any;
        return {
          amount: Number(contract?.stipend) || 0,
          description: `Stipend for ${contract?.event_name}`,
          user_name: userProfile?.full_name || '',
          user_email: userProfile?.email || '',
          date: new Date(contract?.created_at).toISOString().split('T')[0],
          category: 'Event Stipend',
          reference: `Assignment: ${assignment.id}`,
          contract_title: contract?.event_name,
          contract_id: contract?.id
        };
      }) || [];

      // Process actual payments
      const actualPayments = userPayments?.map(payment => {
        const userProfile = profileMap.get(payment.user_id);
        return {
          amount: Number(payment.amount) || 0,
          description: `Payment - ${payment.notes || 'Stipend payment'}`,
          user_name: userProfile?.full_name || '',
          user_email: userProfile?.email || '',
          date: payment.payment_date || new Date(payment.created_at).toISOString().split('T')[0],
          category: 'Payment Made',
          reference: `Payment: ${payment.id}`,
          contract_title: payment.contract_id ? 'Contract Payment' : 'Manual Payment',
          contract_id: payment.contract_id
        };
      }) || [];

      // Combine all stipend records
      const allStipends = [...contractSignatureStipends, ...contractAssignmentStipends, ...actualPayments];
      
      // Filter out zero amounts and sort by date (most recent first)
      const validStipends = allStipends.filter(stipend => stipend.amount > 0);
      validStipends.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setStipends(validStipends);

      // Calculate summary
      const totalAmount = validStipends.reduce((sum, record) => sum + record.amount, 0);
      const totalCount = validStipends.length;
      const averageAmount = totalCount > 0 ? totalAmount / totalCount : 0;
      const uniqueUsers = new Set(validStipends.map(s => s.user_email)).size;

      setSummary({
        totalAmount,
        totalCount,
        averageAmount,
        uniqueUsers
      });

      console.log('Stipend processing complete:', {
        totalStipends: validStipends.length,
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

  const autoSyncContractStipends = async () => {
    try {
      console.log('Auto-syncing contract stipends to finance records...');

      // Get all existing finance records that were auto-synced to avoid duplicates
      const { data: existingRecords } = await supabase
        .from('finance_records')
        .select('reference')
        .eq('type', 'stipend')
        .like('notes', '%Auto-synced%');

      const existingReferences = new Set(existingRecords?.map(r => r.reference) || []);

      let syncedCount = 0;

      // Auto-sync contracts_v2 stipends - but assign to contract recipients, not creators
      // Only sync from COMPLETED contracts
      const { data: contractSignatures } = await supabase
        .from('contract_signatures')
        .select(`
          id,
          user_id,
          contract_id,
          contracts_v2!inner(id, title, stipend_amount, created_at, status)
        `)
        .not('contracts_v2.stipend_amount', 'is', null)
        .gt('contracts_v2.stipend_amount', 0)
        .eq('contracts_v2.status', 'completed');

      for (const signature of contractSignatures || []) {
        const contract = signature.contracts_v2 as any;
        const reference = `Contract Signature: ${signature.id}`;
        
        if (!existingReferences.has(reference)) {
          const { error } = await supabase
            .from('finance_records')
            .insert({
              user_id: signature.user_id, // Assign to the contract recipient, not creator
              date: new Date(contract.created_at).toISOString().split('T')[0],
              type: 'stipend',
              category: 'Performance',
              description: `Stipend from ${contract.title}`,
              amount: Number(contract.stipend_amount),
              balance: 0,
              reference: reference,
              notes: 'Auto-synced from contract system'
            });

          if (!error) {
            syncedCount++;
          }
        }
      }

      // Auto-sync generated_contracts stipends - assign to assignment recipients
      // Only sync from COMPLETED contracts
      const { data: contractAssignments } = await supabase
        .from('contract_user_assignments')
        .select(`
          id,
          user_id,
          contract_id,
          generated_contracts!inner(id, event_name, stipend, created_at, status)
        `)
        .not('generated_contracts.stipend', 'is', null)
        .gt('generated_contracts.stipend', 0)
        .eq('generated_contracts.status', 'completed');

      for (const assignment of contractAssignments || []) {
        const contract = assignment.generated_contracts as any;
        const reference = `Contract Assignment: ${assignment.id}`;
        
        if (!existingReferences.has(reference)) {
          const { error } = await supabase
            .from('finance_records')
            .insert({
              user_id: assignment.user_id, // Assign to the user who was assigned the contract
              date: new Date(contract.created_at).toISOString().split('T')[0],
              type: 'stipend',
              category: 'Performance',
              description: `Stipend for ${contract.event_name}`,
              amount: Number(contract.stipend),
              balance: 0,
              reference: reference,
              notes: 'Auto-synced from contract system'
            });

          if (!error) {
            syncedCount++;
          }
        }
      }

      if (syncedCount > 0) {
        console.log(`Auto-synced ${syncedCount} new stipend records`);
      }

    } catch (error) {
      console.error('Error in auto-sync:', error);
      // Don't throw error here to prevent disrupting the main fetch
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

      // Sync contracts_v2 stipends - only COMPLETED contracts
      const { data: contractsV2 } = await supabase
        .from('contracts_v2')
        .select('*')
        .not('stipend_amount', 'is', null)
        .gt('stipend_amount', 0)
        .eq('status', 'completed');

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

      // Sync generated_contracts stipends - only COMPLETED contracts
      const { data: generatedContracts } = await supabase
        .from('generated_contracts')
        .select('*')
        .not('stipend', 'is', null)
        .gt('stipend', 0)
        .eq('status', 'completed');

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
    syncContractStipends,
    autoSyncEnabled,
    setAutoSyncEnabled
  };
};
