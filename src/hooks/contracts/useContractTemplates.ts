// Hook for managing contract templates
import { useState, useEffect, useCallback } from 'react';
import { ContractService } from '@/services/contracts/ContractService';
import type { 
  Contract,
  ContractTemplate, 
  UseContractTemplatesReturn 
} from '@/types/contracts';
import { useToast } from '@/hooks/use-toast';

export const useContractTemplates = (): UseContractTemplatesReturn => {
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const templatesData = await ContractService.getTemplates();
      setTemplates(templatesData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch templates';
      setError(errorMessage);
      console.error('useContractTemplates.fetchTemplates error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    await fetchTemplates();
  }, [fetchTemplates]);

  const create = useCallback(async (
    data: Omit<ContractTemplate, 'id' | 'created_at' | 'updated_at' | 'created_by'>
  ): Promise<ContractTemplate | null> => {
    try {
      const newTemplate = await ContractService.createTemplate(data);
      
      if (newTemplate) {
        setTemplates(prev => [newTemplate, ...prev]);
        
        toast({
          title: "Template Created",
          description: `Template "${newTemplate.name}" has been created successfully.`,
        });
        
        return newTemplate;
      } else {
        throw new Error('Failed to create template');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create template';
      setError(errorMessage);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      return null;
    }
  }, [toast]);

  const update = useCallback(async (
    id: string, 
    data: Partial<ContractTemplate>
  ): Promise<boolean> => {
    try {
      // Note: This would need to be implemented in ContractService
      // const success = await ContractService.updateTemplate(id, data);
      const success = true; // Placeholder
      
      if (success) {
        setTemplates(prev => 
          prev.map(template => 
            template.id === id ? { ...template, ...data } : template
          )
        );
        
        toast({
          title: "Template Updated",
          description: "Template has been updated successfully.",
        });
        
        return true;
      } else {
        throw new Error('Failed to update template');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update template';
      setError(errorMessage);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      return false;
    }
  }, [toast]);

  const deleteTemplate = useCallback(async (id: string): Promise<boolean> => {
    try {
      // Note: This would need to be implemented in ContractService
      // const success = await ContractService.deleteTemplate(id);
      const success = true; // Placeholder
      
      if (success) {
        setTemplates(prev => prev.filter(template => template.id !== id));
        
        toast({
          title: "Template Deleted",
          description: "Template has been deleted successfully.",
        });
        
        return true;
      } else {
        throw new Error('Failed to delete template');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete template';
      setError(errorMessage);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      return false;
    }
  }, [toast]);

  const useTemplate = useCallback((
    template: ContractTemplate, 
    variables?: Record<string, any>
  ): Contract => {
    const contractData = ContractService.generateContractFromTemplate(template, variables);
    
    return {
      id: '', // Will be generated on save
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: '', // Will be set from auth context
      ...contractData
    } as Contract;
  }, []);

  // Initial load
  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  return {
    templates,
    loading,
    error,
    refresh,
    create,
    update,
    delete: deleteTemplate,
    useTemplate
  };
};