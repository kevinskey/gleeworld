
import { useState } from "react";
import { useContracts } from "@/hooks/useContracts";
import { useToast } from "@/hooks/use-toast";
import type { ContractTemplate } from "@/hooks/useContractTemplates";

export const useContractFromTemplate = () => {
  const [isCreating, setIsCreating] = useState(false);
  const { createContract, refetch } = useContracts();
  const { toast } = useToast();

  const createContractFromTemplate = async (template: ContractTemplate) => {
    setIsCreating(true);
    try {
      const contractData = await createContract({
        title: `${template.name} - ${new Date().toLocaleDateString()}`,
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
