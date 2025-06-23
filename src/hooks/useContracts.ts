
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
        .from('contracts')
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

      const { data, error } = await supabase
        .from('contracts')
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
      const { error } = await supabase
        .from('contracts')
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
          table: 'contracts'
        },
        (payload) => {
          console.log('Real-time contract update:', payload);
          
          if (payload.eventType === 'INSERT') {
            setContracts(prev => [payload.new as Contract, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setContracts(prev => 
              prev.map(contract => 
                contract.id === payload.new.id ? payload.new as Contract : contract
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setContracts(prev => 
              prev.filter(contract => contract.id !== payload.old.id)
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
