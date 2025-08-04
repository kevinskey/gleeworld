import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export interface Contract {
  id: string;
  title: string;
  content: string;
  status: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  stipend_amount?: number;
  creator_name?: string;
  creator_email?: string;
}

export const useContracts = () => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const channelRef = useRef<any>(null);
  const mountedRef = useRef(true);
  const fetchingRef = useRef(false);

  const fetchContracts = async () => {
    if (fetchingRef.current || !user) return;
    
    try {
      fetchingRef.current = true;
      setLoading(true);
      setError(null);
      console.log('Fetching contracts for user:', user.id);
      
      // First get contracts created by the current user
      const { data: contractsData, error: contractsError } = await supabase
        .from('contracts_v2')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      console.log('Contracts query result:', { data: contractsData, error: contractsError });

      if (contractsError) {
        console.error('Error fetching contracts:', contractsError);
        throw contractsError;
      }

      // Then get the creator profile information
      let transformedContracts = contractsData || [];
      
      if (contractsData && contractsData.length > 0 && user.id) {
        const { data: profileData } = await supabase
          .from('gw_profiles')
          .select('full_name, email')
          .eq('user_id', user.id)
          .single();

        // Transform the data to include creator information
        transformedContracts = contractsData.map(contract => ({
          ...contract,
          creator_name: profileData?.full_name || 'Unknown',
          creator_email: profileData?.email || 'Unknown'
        }));
      }
      
      if (mountedRef.current) {
        setContracts(transformedContracts);
      }
    } catch (error) {
      console.error('Error fetching contracts:', error);
      if (mountedRef.current) {
        setError('Failed to load contracts');
        toast({
          title: "Error",
          description: "Failed to load contracts",
          variant: "destructive",
        });
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
      fetchingRef.current = false;
    }
  };

  const createContract = async (contractData: { title: string; content: string; stipend_amount?: number }) => {
    try {
      if (!user) {
        throw new Error("User not authenticated");
      }

      console.log('Creating contract with user ID:', user.id);

      const { data, error } = await supabase
        .from('contracts_v2')
        .insert([{
          title: contractData.title,
          content: contractData.content,
          created_by: user.id,
          status: 'draft',
          stipend_amount: contractData.stipend_amount || null
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating contract:', error);
        throw error;
      }

      console.log('Contract created successfully:', data);
      
      // Update local state immediately
      if (mountedRef.current) {
        setContracts(prev => [data, ...prev]);
      }
      
      toast({
        title: "Success",
        description: "Contract created successfully",
      });

      return data;
    } catch (error) {
      console.error('Error creating contract:', error);
      toast({
        title: "Error",
        description: "Failed to create contract",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteContract = async (contractId: string) => {
    try {
      console.log('Attempting to delete contract:', contractId);

      // Check if user is super admin
      const { data: profile } = await supabase
        .from('gw_profiles')
        .select('role')
        .eq('user_id', user?.id)
        .single();

      const isSuperAdmin = profile?.role === 'super-admin';

      // Delete related records for super admins
      if (isSuperAdmin) {
        await supabase
          .from('admin_contract_notifications')
          .delete()
          .eq('contract_id', contractId);
      }

      // Delete contract signatures
      await supabase
        .from('contract_signatures_v2')
        .delete()
        .eq('contract_id', contractId);

      // Delete the contract
      const { error } = await supabase
        .from('contracts_v2')
        .delete()
        .eq('id', contractId);

      if (error) {
        console.error('Error deleting contract:', error);
        throw error;
      }

      // Update local state
      setContracts(prev => prev.filter(contract => contract.id !== contractId));
      
      toast({
        title: "Success",
        description: "Contract deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting contract:', error);
      toast({
        title: "Error",
        description: "Failed to delete contract",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    
    // Wait for auth to complete
    if (authLoading) {
      return;
    }

    if (!user) {
      setContracts([]);
      setLoading(false);
      setError(null);
      return;
    }

    // Fetch contracts
    fetchContracts();

    // Clean up any existing subscription before creating a new one
    if (channelRef.current) {
      console.log('Cleaning up existing subscription');
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Set up new subscription with unique channel name
    console.log('Setting up real-time subscription for contracts');
    
    const uniqueChannelName = `contracts-realtime-${user.id}-${Date.now()}-${Math.random()}`;
    const channel = supabase
      .channel(uniqueChannelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contracts_v2',
          filter: `created_by=eq.${user.id}` // Only listen to changes for this user's contracts
        },
        (payload) => {
          console.log('Real-time update:', payload);
          
          if (!mountedRef.current) return;
          
          // Defer updates to prevent auth conflicts
          setTimeout(() => {
            if (!mountedRef.current) return;
            
            if (payload.eventType === 'INSERT') {
              const newContract = payload.new as Contract;
              setContracts(prev => {
                if (prev.some(c => c.id === newContract.id)) return prev;
                return [newContract, ...prev];
              });
            } else if (payload.eventType === 'UPDATE') {
              const updatedContract = payload.new as Contract;
              setContracts(prev => 
                prev.map(c => c.id === updatedContract.id ? updatedContract : c)
              );
            } else if (payload.eventType === 'DELETE') {
              const deletedId = payload.old.id;
              setContracts(prev => prev.filter(c => c.id !== deletedId));
            }
          }, 100);
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
      });

    channelRef.current = channel;

    return () => {
      mountedRef.current = false;
      if (channelRef.current) {
        console.log('Cleaning up subscription on unmount');
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user, authLoading]);

  return {
    contracts,
    loading: authLoading || loading,
    error,
    createContract,
    deleteContract,
    refetch: fetchContracts,
    forceRefresh: fetchContracts,
  };
};
