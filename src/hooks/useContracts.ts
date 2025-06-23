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
  const { user } = useAuth();
  const channelRef = useRef<any>(null);

  const fetchContracts = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching contracts...');
      
      const { data, error } = await supabase
        .from('contracts_v2')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching contracts:', error);
        throw error;
      }
      
      console.log('Contracts fetched successfully:', data?.length || 0);
      setContracts(data || []);
    } catch (error) {
      console.error('Error fetching contracts:', error);
      setError('Failed to load contracts');
      toast({
        title: "Error",
        description: "Failed to load contracts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
      
      // Update local state
      setContracts(prev => [data, ...prev]);
      
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
    if (!user) return;

    fetchContracts();

    // Clean up any existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Set up real-time subscription
    const channel = supabase
      .channel('contracts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contracts_v2'
        },
        (payload) => {
          console.log('Real-time contract update:', payload);
          
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
        }
      )
      .subscribe();

    channelRef.current = channel;

    // Cleanup function
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user]);

  return {
    contracts,
    loading,
    error,
    createContract,
    deleteContract,
    refetch: fetchContracts,
  };
};
