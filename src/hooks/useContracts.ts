
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

  const fetchContracts = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching contracts...');
      console.log('Current user:', user?.id);
      console.log('Auth loading:', authLoading);
      
      const { data, error } = await supabase
        .from('contracts_v2')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('Contracts query result:', { data, error });
      console.log('Contracts count:', data?.length || 0);

      if (error) {
        console.error('Error fetching contracts:', error);
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }
      
      console.log('Contracts fetched successfully:', data?.length || 0);
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
      console.log('Contract created_by field:', data.created_by);
      
      // Update local state immediately to prevent UI flicker
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
      console.log('Current user:', user?.id);

      // Check if user is super admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user?.id)
        .single();

      const isSuperAdmin = profile?.role === 'super-admin';
      console.log('User is super admin:', isSuperAdmin);

      // Delete related records in the correct order for super admins
      if (isSuperAdmin) {
        // First, delete admin contract notifications
        const { error: notificationsError } = await supabase
          .from('admin_contract_notifications')
          .delete()
          .eq('contract_id', contractId);

        if (notificationsError) {
          console.error('Error deleting admin notifications:', notificationsError);
          // Continue anyway for super admins
        } else {
          console.log('Admin notifications deleted successfully');
        }
      }

      // Delete contract signatures
      const { error: signaturesError } = await supabase
        .from('contract_signatures_v2')
        .delete()
        .eq('contract_id', contractId);

      if (signaturesError) {
        console.error('Error deleting contract signatures:', signaturesError);
        if (!isSuperAdmin) {
          throw new Error(`Failed to delete contract signatures: ${signaturesError.message}`);
        }
        console.log('Continuing with contract deletion despite signature deletion error (super admin)');
      } else {
        console.log('Contract signatures deleted successfully');
      }

      // Finally delete the contract
      const { error } = await supabase
        .from('contracts_v2')
        .delete()
        .eq('id', contractId);

      if (error) {
        console.error('Error deleting contract:', error);
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw new Error(`Failed to delete contract: ${error.message}`);
      }

      console.log('Contract deleted successfully from database');

      // Update local state immediately
      setContracts(prev => prev.filter(contract => contract.id !== contractId));
      
      toast({
        title: "Success",
        description: "Contract deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting contract:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete contract",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    
    console.log('useContracts effect triggered');
    console.log('Auth loading:', authLoading);
    console.log('User:', user?.id);
    
    // Wait for auth to complete loading before making decisions
    if (authLoading) {
      console.log('Auth still loading, waiting...');
      return;
    }

    if (!user) {
      console.log('No authenticated user, clearing contracts');
      if (mountedRef.current) {
        setContracts([]);
        setLoading(false);
        setError(null);
      }
      return;
    }

    console.log('User authenticated, fetching contracts for:', user.id);
    fetchContracts();

    // Clean up any existing channel before creating a new one
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Set up real-time subscription with improved stability
    const channel = supabase
      .channel(`contracts-changes-${user.id}`) // Unique channel per user
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contracts_v2'
        },
        (payload) => {
          console.log('Real-time contract update:', payload);
          
          if (!mountedRef.current) return;
          
          // Use setTimeout to defer state updates and prevent auth conflicts
          setTimeout(() => {
            if (!mountedRef.current) return;
            
            if (payload.eventType === 'INSERT') {
              const newContract = payload.new as Contract;
              setContracts(prev => {
                // Check if contract already exists to prevent duplicates
                const exists = prev.some(contract => contract.id === newContract.id);
                if (exists) return prev;
                return [newContract, ...prev];
              });
            } else if (payload.eventType === 'UPDATE') {
              const updatedContract = payload.new as Contract;
              console.log('Contract updated via real-time:', updatedContract.id, 'Status:', updatedContract.status);
              setContracts(prev => 
                prev.map(contract => 
                  contract.id === updatedContract.id ? updatedContract : contract
                )
              );
            } else if (payload.eventType === 'DELETE') {
              const deletedId = payload.old.id;
              setContracts(prev => 
                prev.filter(contract => contract.id !== deletedId)
              );
            }
          }, 0);
        }
      )
      .subscribe((status) => {
        console.log('Real-time subscription status:', status);
      });

    channelRef.current = channel;

    // Cleanup function
    return () => {
      mountedRef.current = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user, authLoading]);

  // Add a method to force refresh contracts
  const forceRefresh = async () => {
    console.log('Force refreshing contracts...');
    await fetchContracts();
  };

  return {
    contracts,
    loading: authLoading || loading,
    error,
    createContract,
    deleteContract,
    refetch: fetchContracts,
    forceRefresh,
  };
};
