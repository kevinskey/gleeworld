
import { useState } from "react";
import { useContracts } from "@/hooks/useContracts";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { logActivity, ACTIVITY_TYPES, RESOURCE_TYPES } from "@/utils/activityLogger";
import type { ContractTemplate } from "@/hooks/useContractTemplates";

export const useContractFromTemplate = (onContractCreated?: () => void) => {
  const [isCreating, setIsCreating] = useState(false);
  const { createContract, refetch } = useContracts();
  const { toast } = useToast();
  const { user } = useAuth();
  const { displayName } = useUserProfile(user);

  const createContractFromTemplate = async (template: ContractTemplate, selectedUser?: { full_name?: string; email: string }) => {
    setIsCreating(true);
    try {
      // Use selected user name if provided, otherwise fall back to current user
      const recipientName = selectedUser?.full_name || selectedUser?.email || displayName || user?.email || 'User';
      
      // Generate contract title with recipient's name + template name
      const contractTitle = `${recipientName} - ${template.name}`;
      
      // Don't pass template_id - we're using template content, not linking to template
      const contractData = await createContract({
        title: contractTitle,
        content: template.template_content,
        // Explicitly don't pass template_id to avoid foreign key constraint issues
      });

      if (contractData) {
        // Log template usage activity
        await logActivity({
          actionType: ACTIVITY_TYPES.TEMPLATE_USED,
          resourceType: RESOURCE_TYPES.TEMPLATE,
          resourceId: template.id,
          details: {
            templateName: template.name,
            contractId: contractData.id,
            contractTitle,
            recipientName,
            recipientEmail: selectedUser?.email
          }
        });

        // Refresh the contracts list to show the new contract
        await refetch();
        
        // Call the callback to update UI (switch to dashboard, etc.)
        if (onContractCreated) {
          onContractCreated();
        }
        
        toast({
          title: "Success",
          description: `Contract "${contractTitle}" created from template`,
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
