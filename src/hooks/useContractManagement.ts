import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Contract {
  id: string;
  title: string;
  content: string;
  status: 'draft' | 'pending' | 'active' | 'completed' | 'cancelled';
  created_by: string;
  created_at: string;
  updated_at: string;
  event_id?: string;
  assigned_to?: string[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string;
  contract_type: string;
  tags?: string[];
  notes?: string;
  archived: boolean;
}

export interface ContractMember {
  id: string;
  contract_id: string;
  user_id: string;
  role: string;
  assigned_at: string;
  assigned_by?: string;
  user?: {
    id: string;
    full_name?: string;
    email?: string;
  };
}

export interface ContractFilters {
  status?: string;
  contract_type?: string;
  priority?: string;
  archived?: boolean;
  search?: string;
  assigned_to?: string;
}

export interface ContractSort {
  field: 'title' | 'created_at' | 'updated_at' | 'due_date' | 'priority' | 'status';
  direction: 'asc' | 'desc';
}

export const useContractManagement = () => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ContractFilters>({});
  const [sort, setSort] = useState<ContractSort>({ field: 'updated_at', direction: 'desc' });
  const { toast } = useToast();

  const fetchContracts = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('contracts')
        .select('*');

      // Apply filters
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.contract_type) {
        query = query.eq('contract_type', filters.contract_type);
      }
      if (filters.priority) {
        query = query.eq('priority', filters.priority);
      }
      if (filters.archived !== undefined) {
        query = query.eq('archived', filters.archived);
      }
      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,content.ilike.%${filters.search}%`);
      }

      // Apply sorting
      query = query.order(sort.field, { ascending: sort.direction === 'asc' });

      const { data, error } = await query;

      if (error) throw error;
      setContracts((data || []) as Contract[]);
    } catch (error) {
      console.error('Error fetching contracts:', error);
      toast({
        title: "Error",
        description: "Failed to fetch contracts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createContract = async (contractData: Partial<Contract>) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('contracts')
        .insert({
          title: contractData.title || '',
          content: contractData.content || '',
          created_by: user.user.id,
          status: contractData.status || 'draft',
          priority: contractData.priority || 'medium',
          contract_type: contractData.contract_type || 'general',
          archived: false,
          ...contractData,
        })
        .select()
        .single();

      if (error) throw error;

      setContracts(prev => [data as Contract, ...prev]);
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

  const updateContract = async (id: string, updates: Partial<Contract>) => {
    try {
      const { data, error } = await supabase
        .from('contracts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setContracts(prev => prev.map(c => c.id === id ? data as Contract : c));
      toast({
        title: "Success",
        description: "Contract updated successfully",
      });
      
      return data;
    } catch (error) {
      console.error('Error updating contract:', error);
      toast({
        title: "Error",
        description: "Failed to update contract",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteContract = async (id: string) => {
    try {
      const { error } = await supabase
        .from('contracts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setContracts(prev => prev.filter(c => c.id !== id));
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
      throw error;
    }
  };

  const archiveContract = async (id: string) => {
    return updateContract(id, { archived: true });
  };

  const unarchiveContract = async (id: string) => {
    return updateContract(id, { archived: false });
  };

  const duplicateContract = async (id: string) => {
    try {
      const original = contracts.find(c => c.id === id);
      if (!original) throw new Error('Contract not found');

      const duplicate = {
        title: `${original.title} (Copy)`,
        content: original.content,
        contract_type: original.contract_type,
        priority: original.priority,
        tags: original.tags,
        notes: original.notes,
      };

      return await createContract(duplicate);
    } catch (error) {
      console.error('Error duplicating contract:', error);
      toast({
        title: "Error",
        description: "Failed to duplicate contract",
        variant: "destructive",
      });
      throw error;
    }
  };

  const assignMember = async (contractId: string, userId: string, role: string = 'member') => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('contract_members')
        .insert({
          contract_id: contractId,
          user_id: userId,
          role,
          assigned_by: user.user.id,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Member assigned successfully",
      });
    } catch (error) {
      console.error('Error assigning member:', error);
      toast({
        title: "Error",
        description: "Failed to assign member",
        variant: "destructive",
      });
      throw error;
    }
  };

  const removeMember = async (contractId: string, userId: string) => {
    try {
      const { error } = await supabase
        .from('contract_members')
        .delete()
        .eq('contract_id', contractId)
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Member removed successfully",
      });
    } catch (error) {
      console.error('Error removing member:', error);
      toast({
        title: "Error",
        description: "Failed to remove member",
        variant: "destructive",
      });
      throw error;
    }
  };

  const getContractMembers = async (contractId: string): Promise<ContractMember[]> => {
    try {
      const { data, error } = await supabase
        .from('contract_members')
        .select(`
          *,
          user:gw_profiles(
            user_id,
            full_name,
            email
          )
        `)
        .eq('contract_id', contractId);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching contract members:', error);
      return [];
    }
  };

  useEffect(() => {
    fetchContracts();
  }, [filters, sort]);

  return {
    contracts,
    loading,
    filters,
    sort,
    setFilters,
    setSort,
    createContract,
    updateContract,
    deleteContract,
    archiveContract,
    unarchiveContract,
    duplicateContract,
    assignMember,
    removeMember,
    getContractMembers,
    refetch: fetchContracts,
  };
};