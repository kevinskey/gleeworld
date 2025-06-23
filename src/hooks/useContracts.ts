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
      console.log('Creating contract with data:', contract);
      
      // Check if template_id exists if provided
      if (contract.template_id) {
        const { data: templateExists, error: templateError } = await supabase
          .from('contract_templates')
          .select('id')
          .eq('id', contract.template_id)
          .single();

        if (templateError || !templateExists) {
          console.warn('Template not found, creating contract without template_id');
          // Remove template_id if template doesn't exist
          const { template_id, ...contractWithoutTemplate } = contract;
          return await createContract(contractWithoutTemplate);
        }
      }

      const { data, error } = await supabase
        .from('contracts_v2')
        .insert([{
          title: contract.title,
          content: contract.content,
          template_id: contract.template_id || null,
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

  const deleteContract = async (id: string) => {
    try {
      const { error } = await supabase
        .from('contracts_v2')
        .update({ archived: true })
        .eq('id', id);

      if (error) throw error;

      setContracts(prev => prev.filter(contract => contract.id !== id));
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
    deleteContract,
    updateContractStatus,
    refetch: fetchContracts,
  };
};
