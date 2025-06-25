
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
      
      const { data, error } = await supabase
        .from('contracts_v2')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('Contracts query result:', { data, error });

      if (error) {
        console.error('Error fetching contracts:', error);
        throw error;
      }
      
      if (mountedRef.current) {
        setContracts(data || []);
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

  const createContract = async (contractData: { title: string; content: string }) => {
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
          status: 'draft'
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
        .from('profiles')
        .select('role')
        .eq('id', user?.id)
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

    // Clean up existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Set up real-time subscription
    const channel = supabase
      .channel(`contracts-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contracts_v2'
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
      .subscribe();

    channelRef.current = channel;

    return () => {
      mountedRef.current = false;
      if (channelRef.current) {
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
