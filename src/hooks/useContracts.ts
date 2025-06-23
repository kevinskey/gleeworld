
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Contract {
  id: string;
  title: string;
  content: string;
  status: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  is_template: boolean;
  template_id?: string;
  archived: boolean;
}

export const useContracts = () => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchContracts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('contracts_v2')
        .select('*')
        .eq('archived', false)
        .eq('is_template', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContracts(data || []);
    } catch (error) {
      console.error('Error fetching contracts:', error);
      toast({
        title: "Error",
        description: "Failed to load contracts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createContract = async (contract: {
    title: string;
    content: string;
    template_id?: string;
  }) => {
    try {
      const { data, error } = await supabase
        .from('contracts_v2')
        .insert([{
          ...contract,
          created_by: null, // Set to null since we don't have auth yet
          status: 'draft',
          is_template: false,
          archived: false,
        }])
        .select()
        .single();

      if (error) throw error;

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
      return null;
    }
  };

  const updateContractStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from('contracts_v2')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      setContracts(prev => 
        prev.map(contract => 
          contract.id === id ? { ...contract, status } : contract
        )
      );

      toast({
        title: "Success",
        description: "Contract status updated",
      });
    } catch (error) {
      console.error('Error updating contract:', error);
      toast({
        title: "Error",
        description: "Failed to update contract",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchContracts();
  }, []);

  return {
    contracts,
    loading,
    createContract,
    updateContractStatus,
    refetch: fetchContracts,
  };
};
