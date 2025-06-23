import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { logActivity, ACTIVITY_TYPES, RESOURCE_TYPES } from "@/utils/activityLogger";

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
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchContracts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching contracts...');
      
      const { data, error } = await supabase
        .from('contracts_v2')
        .select('*')
        .eq('archived', false)
        .eq('is_template', false)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Contracts fetched successfully:', data?.length || 0);
      setContracts(data || []);
    } catch (error) {
      console.error('Error fetching contracts:', error);
      setError('Failed to load contracts');
      setContracts([]);
      
      // Only show toast if it's not a network connectivity issue
      if (error && typeof error === 'object' && 'message' in error) {
        const errorMessage = (error as any).message;
        if (!errorMessage.includes('Failed to fetch')) {
          toast({
            title: "Error",
            description: "Failed to load contracts",
            variant: "destructive",
          });
        }
      }
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const createContract = async (contract: {
    title: string;
    content: string;
    template_id?: string;
  }) => {
    try {
      console.log('Creating contract with data:', contract);
      
      // Prepare the contract data - only include template_id if it's provided and valid
      const contractData: any = {
        title: contract.title,
        content: contract.content,
        created_by: null, // Set to null since we don't have auth yet
        status: 'draft',
        is_template: false,
        archived: false,
      };

      // Only add template_id if it's provided
      if (contract.template_id) {
        // Check if template_id exists if provided
        const { data: templateExists, error: templateError } = await supabase
          .from('contract_templates')
          .select('id')
          .eq('id', contract.template_id)
          .single();

        if (!templateError && templateExists) {
          contractData.template_id = contract.template_id;
        } else {
          console.warn('Template not found, creating contract without template_id');
        }
      }

      const { data, error } = await supabase
        .from('contracts_v2')
        .insert([contractData])
        .select()
        .single();

      if (error) throw error;

      // Log contract creation activity
      await logActivity({
        actionType: ACTIVITY_TYPES.CONTRACT_CREATED,
        resourceType: RESOURCE_TYPES.CONTRACT,
        resourceId: data.id,
        details: {
          contractTitle: contract.title,
          hasTemplate: !!contract.template_id,
          templateId: contract.template_id
        }
      });

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
      // Get contract details before deletion for logging
      const contractToDelete = contracts.find(c => c.id === id);
      
      const { error } = await supabase
        .from('contracts_v2')
        .update({ archived: true })
        .eq('id', id);

      if (error) throw error;

      // Log contract deletion activity
      if (contractToDelete) {
        await logActivity({
          actionType: ACTIVITY_TYPES.CONTRACT_DELETED,
          resourceType: RESOURCE_TYPES.CONTRACT,
          resourceId: id,
          details: {
            contractTitle: contractToDelete.title,
            contractStatus: contractToDelete.status
          }
        });
      }

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
      // Get contract details for logging
      const contractToUpdate = contracts.find(c => c.id === id);
      const previousStatus = contractToUpdate?.status;
      
      const { error } = await supabase
        .from('contracts_v2')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      // Log contract update activity
      if (contractToUpdate) {
        await logActivity({
          actionType: ACTIVITY_TYPES.CONTRACT_UPDATED,
          resourceType: RESOURCE_TYPES.CONTRACT,
          resourceId: id,
          details: {
            contractTitle: contractToUpdate.title,
            previousStatus,
            newStatus: status,
            updateType: 'status_change'
          }
        });
      }

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
  }, [fetchContracts]);

  return {
    contracts,
    loading,
    error,
    createContract,
    deleteContract,
    updateContractStatus,
    refetch: fetchContracts,
  };
};
