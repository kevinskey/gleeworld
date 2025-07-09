
import { useState } from "react";
import { useContracts } from "@/hooks/useContracts";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { supabase } from "@/integrations/supabase/client";
import { logActivity, ACTIVITY_TYPES, RESOURCE_TYPES } from "@/utils/activityLogger";
import type { ContractTemplate } from "@/hooks/useContractTemplates";

// Hook for creating contracts from templates
export const useContractFromTemplate = (onContractCreated?: () => void) => {
  const [isCreating, setIsCreating] = useState(false);
  const { createContract, refetch } = useContracts();
  const { toast } = useToast();
  const { user } = useAuth();
  const { displayName } = useUserProfile(user);

  console.log('useContractFromTemplate: Hook initialized, user:', user?.id, 'displayName:', displayName);

  const createContractFromTemplate = async (template: ContractTemplate, selectedUser?: { full_name?: string; email: string; stipend_amount?: string }) => {
    console.log('useContractFromTemplate: Starting contract creation from template:', template.name);
    
    if (!user) {
      console.error('useContractFromTemplate: User not authenticated');
      toast({
        title: "Authentication Required",
        description: "Please sign in to create contracts",
        variant: "destructive",
      });
      return null;
    }

    if (!template.template_content) {
      console.error('useContractFromTemplate: Template content is missing');
      toast({
        title: "Template Error",
        description: "Template content is missing",
        variant: "destructive",
      });
      return null;
    }

    setIsCreating(true);
    try {
      console.log('useContractFromTemplate: Creating contract from template:', {
        templateId: template.id,
        templateName: template.name,
        selectedUser: selectedUser?.email,
        userId: user.id,
        displayName
      });

      // Use selected user name if provided, otherwise fall back to current user
      const recipientName = selectedUser?.full_name || selectedUser?.email || displayName || user?.email || 'User';
      const recipientEmail = selectedUser?.email || user?.email || '';
      
      // Generate contract title with recipient's name + template name
      const contractTitle = `${recipientName} - ${template.name}`;
      
      console.log('useContractFromTemplate: Generated contract title:', contractTitle);
      console.log('useContractFromTemplate: About to call createContract...');
      console.log('useContractFromTemplate: Template content length:', template.template_content.length);
      
      // Replace template variables with actual values
      const stipendAmount = selectedUser?.stipend_amount || '$500.00';
      let processedContent = template.template_content
        .replace(/\{\{username\}\}/g, recipientName)
        .replace(/\{\{useremail\}\}/g, recipientEmail)
        .replace(/\{\{stipend\}\}/g, stipendAmount);
      
      console.log('useContractFromTemplate: Processed template variables in contract content');
      
      // Create contract with processed template content
      const contractData = await createContract({
        title: contractTitle,
        content: processedContent,
      });

      console.log('useContractFromTemplate: createContract completed, result:', contractData);

      if (!contractData) {
        console.error('useContractFromTemplate: createContract returned null/undefined');
        throw new Error('Failed to create contract - no data returned');
      }

      console.log('useContractFromTemplate: Contract created successfully:', contractData);

      // Log template usage activity
      try {
        console.log('useContractFromTemplate: Logging template usage activity...');
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
        console.log('useContractFromTemplate: Activity logged successfully');
      } catch (logError) {
        console.warn('useContractFromTemplate: Failed to log activity:', logError);
        // Don't fail the contract creation if logging fails
      }

      // Send email to recipient
      if (selectedUser?.email && selectedUser.email !== user?.email) {
        try {
          console.log('useContractFromTemplate: Sending contract email to recipient...');
          const { data: emailData, error: emailError } = await supabase.functions.invoke('send-contract-email', {
            body: {
              contractId: contractData.id,
              recipientEmail: selectedUser.email,
              recipientName: recipientName,
              contractTitle: contractTitle,
              customMessage: `Please review and sign your contract: ${contractTitle}`,
              isResend: false
            }
          });

          if (emailError) {
            console.warn('useContractFromTemplate: Failed to send email:', emailError);
            toast({
              title: "Contract Created",
              description: `Contract "${contractTitle}" created successfully, but email notification failed to send`,
              variant: "destructive",
            });
          } else {
            console.log('useContractFromTemplate: Email sent successfully:', emailData);
            toast({
              title: "Success",
              description: `Contract "${contractTitle}" created and email sent to ${selectedUser.email}`,
            });
          }
        } catch (emailError) {
          console.warn('useContractFromTemplate: Email sending error:', emailError);
          toast({
            title: "Contract Created",
            description: `Contract "${contractTitle}" created successfully, but email notification failed to send`,
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Success",
          description: `Contract "${contractTitle}" created from template`,
        });
      }

      // Refresh the contracts list to show the new contract
      console.log('useContractFromTemplate: Refreshing contracts list...');
      await refetch();

      // Call the callback to update UI (switch to dashboard, etc.)
      if (onContractCreated) {
        console.log('useContractFromTemplate: Calling onContractCreated callback');
        onContractCreated();
      }
      
      return contractData;
    } catch (error) {
      console.error('useContractFromTemplate: Error creating contract from template:', error);
      
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
