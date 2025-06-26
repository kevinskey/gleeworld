
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
    if (!user) {
      console.error('User not authenticated');
      toast({
        title: "Authentication Required",
        description: "Please sign in to create contracts",
        variant: "destructive",
      });
      return null;
    }

    if (!template.template_content) {
      console.error('Template content is missing');
      toast({
        title: "Template Error",
        description: "Template content is missing",
        variant: "destructive",
      });
      return null;
    }

    setIsCreating(true);
    try {
      console.log('Creating contract from template:', {
        templateId: template.id,
        templateName: template.name,
        selectedUser: selectedUser?.email,
        userId: user.id
      });

      // Use selected user name if provided, otherwise fall back to current user
      const recipientName = selectedUser?.full_name || selectedUser?.email || displayName || user?.email || 'User';
      
      // Generate contract title with recipient's name + template name
      const contractTitle = `${recipientName} - ${template.name}`;
      
      // Create contract with template content
      const contractData = await createContract({
        title: contractTitle,
        content: template.template_content,
      });

      if (!contractData) {
        throw new Error('Failed to create contract - no data returned');
      }

      console.log('Contract created successfully:', contractData);

      // Log template usage activity
      try {
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
      } catch (logError) {
        console.warn('Failed to log activity:', logError);
        // Don't fail the contract creation if logging fails
      }

      // Refresh the contracts list to show the new contract
      await refetch();
      
      toast({
        title: "Success",
        description: `Contract "${contractTitle}" created from template`,
      });

      // Call the callback to update UI (switch to dashboard, etc.)
      if (onContractCreated) {
        onContractCreated();
      }
      
      return contractData;
    } catch (error) {
      console.error('Error creating contract from template:', error);
      
      let errorMessage = "Failed to create contract from template";
      if (error instanceof Error) {
        errorMessage = `Failed to create contract: ${error.message}`;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
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
