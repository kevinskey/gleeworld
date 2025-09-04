// Hook for managing a single contract
import { useState, useEffect, useCallback } from 'react';
import { ContractService } from '@/services/contracts/ContractService';
import type { Contract, UseContractReturn } from '@/types/contracts';
import { useToast } from '@/hooks/use-toast';

export const useContract = (contractId: string | undefined): UseContractReturn => {
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchContract = useCallback(async () => {
    if (!contractId) {
      setContract(null);
      setLoading(false);
      setError('No contract ID provided');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const contractData = await ContractService.getContract(contractId);
      
      if (contractData) {
        setContract(contractData);
      } else {
        setError('Contract not found');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch contract';
      setError(errorMessage);
      console.error('useContract.fetchContract error:', err);
    } finally {
      setLoading(false);
    }
  }, [contractId]);

  const refresh = useCallback(async () => {
    await fetchContract();
  }, [fetchContract]);

  const update = useCallback(async (data: Partial<Contract>): Promise<boolean> => {
    if (!contractId) return false;

    try {
      const success = await ContractService.updateContract(contractId, data);
      
      if (success) {
        setContract(prev => prev ? { ...prev, ...data } : null);
        
        toast({
          title: "Contract Updated",
          description: "Contract has been updated successfully.",
        });
        
        return true;
      } else {
        throw new Error('Failed to update contract');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update contract';
      setError(errorMessage);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      return false;
    }
  }, [contractId, toast]);

  const deleteContract = useCallback(async (): Promise<boolean> => {
    if (!contractId) return false;

    try {
      const success = await ContractService.deleteContract(contractId);
      
      if (success) {
        setContract(null);
        
        toast({
          title: "Contract Deleted",
          description: "Contract has been deleted successfully.",
        });
        
        return true;
      } else {
        throw new Error('Failed to delete contract');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete contract';
      setError(errorMessage);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      return false;
    }
  }, [contractId, toast]);

  // Initial load
  useEffect(() => {
    fetchContract();
  }, [fetchContract]);

  return {
    contract,
    loading,
    error,
    refresh,
    update,
    delete: deleteContract
  };
};