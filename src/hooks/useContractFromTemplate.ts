
import { useState } from "react";
import { useContracts } from "@/hooks/useContracts";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import type { ContractTemplate } from "@/hooks/useContractTemplates";

export const useContractFromTemplate = () => {
  const [isCreating, setIsCreating] = useState(false);
  const { createContract, refetch } = useContracts();
  const { toast } = useToast();
  const { user } = useAuth();
  const { displayName } = useUserProfile(user);

  const createContractFromTemplate = async (template: ContractTemplate) => {
    setIsCreating(true);
    try {
      const username = displayName || user?.email || 'User';
      const contractTitle = `${username} - ${template.name}`;
      
      const contractData = await createContract({
        title: contractTitle,
        content: template.template_content,
        template_id: template.id,
      });

      if (contractData) {
        // Refresh the contracts list to show the new contract
        await refetch();
        
        toast({
          title: "Success",
          description: `Contract created from template "${template.name}"`,
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
