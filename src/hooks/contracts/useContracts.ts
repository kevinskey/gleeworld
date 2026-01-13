// Unified hook for managing multiple contracts
import { useState, useEffect, useCallback } from 'react';
import { ContractService } from '@/services/contracts/ContractService';
import { supabase } from '@/integrations/supabase/client';
import type { 
  Contract, 
  ContractFormData, 
  ContractFilters, 
  ContractStats,
  UseContractsReturn 
} from '@/types/contracts';
import { useToast } from '@/hooks/use-toast';

export const useContracts = (initialFilters?: ContractFilters): UseContractsReturn => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<ContractStats>({
    total: 0,
    draft: 0,
    sent: 0,
    signed: 0,
    completed: 0,
    cancelled: 0,
    overdue: 0
  });
  const [filters, setFiltersState] = useState<ContractFilters>(initialFilters || {});
  const { toast } = useToast();

  const fetchContracts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check if current user is super admin or just admin
      const { data: { user } } = await supabase.auth.getUser();
      let excludeSuperAdminContracts = false;
      
      if (user) {
        const { data: profile } = await supabase
          .from('gw_profiles')
          .select('is_admin, is_super_admin')
          .eq('user_id', user.id)
          .single();
        
        // If admin but NOT super admin, exclude super admin contracts
        if (profile?.is_admin && !profile?.is_super_admin) {
          excludeSuperAdminContracts = true;
        }
      }
      
      const [contractsData, statsData] = await Promise.all([
        ContractService.getContracts({ ...filters, excludeSuperAdminContracts }),
        ContractService.getStats()
      ]);
      
      setContracts(contractsData);
      setStats(statsData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch contracts';
      setError(errorMessage);
      console.error('useContracts.fetchContracts error:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const setFilters = useCallback((newFilters: Partial<ContractFilters>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
  }, []);

  const refresh = useCallback(async () => {
    await fetchContracts();
  }, [fetchContracts]);

  const create = useCallback(async (data: ContractFormData): Promise<Contract | null> => {
    try {
      const newContract = await ContractService.createContract(data);
      
      if (newContract) {
        setContracts(prev => [newContract, ...prev]);
        setStats(prev => ({ 
          ...prev, 
          total: prev.total + 1, 
          draft: prev.draft + 1 
        }));
        
        toast({
          title: "Contract Created",
          description: `"${newContract.title}" has been created successfully.`,
        });
        
        return newContract;
      } else {
        throw new Error('Failed to create contract');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create contract';
      setError(errorMessage);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      return null;
    }
  }, [toast]);

  const search = useCallback((query: string) => {
    setFilters({ search: query });
  }, [setFilters]);

  // Initial load
  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  return {
    contracts,
    loading,
    error,
    stats,
    filters,
    setFilters,
    refresh,
    create,
    search
  };
};