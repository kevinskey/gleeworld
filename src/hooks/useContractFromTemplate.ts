
import { useState } from "react";
import { useContracts } from "@/hooks/useContracts";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import type { ContractTemplate } from "@/hooks/useContractTemplates";

export const useContractFromTemplate = (onContractCreated?: () => void) => {
  const [isCreating, setIsCreating] = useState(false);
  const { createContract, refetch } = useContracts();
  const { toast } = useToast();
  const { user } = useAuth();
  const { displayName } = useUserProfile(user);

  const createContractFromTemplate = async (template: ContractTemplate) => {
    setIsCreating(true);
    try {
      const username = displayName || user?.email || 'User';
      
      // Clean the template name by removing "Copy of" prefix if it exists
      const cleanTemplateName = template.name.replace(/^Copy of /, '');
      const contractTitle = `${username} - ${cleanTemplateName}`;
      
      // Don't pass template_id - we're using template content, not linking to template
      const contractData = await createContract({
        title: contractTitle,
        content: template.template_content,
        // Explicitly don't pass template_id to avoid foreign key constraint issues
      });

      if (contractData) {
        // Refresh the contracts list to show the new contract
        await refetch();
        
        // Call the callback to update UI (switch to dashboard, etc.)
        if (onContractCreated) {
          onContractCreated();
        }
        
        toast({
          title: "Success",
          description: `Contract created from template "${cleanTemplateName}"`,
        });
        return contractData;
      }
      return null;
    } catch (error) {
      console.error('Error creating contract from template:', error);
      toast({
        title: "Error",
        description: "Failed to create contract from template",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsCreating(false);
    }
  };

  return {
    createContractFromTemplate,
    isCreating,
  };
};
