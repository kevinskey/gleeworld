
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Contract } from "@/hooks/useContracts";

export const useAdminSigning = () => {
  const { toast } = useToast();
  const [signingContract, setSigningContract] = useState<string | null>(null);
  const [adminSignature, setAdminSignature] = useState<string>("");
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [contractToSign, setContractToSign] = useState<Contract | null>(null);

  const handleAdminSign = async (contract: Contract) => {
    setContractToSign(contract);
    setShowSignatureModal(true);
  };

  const handleCompleteAdminSigning = async () => {
    if (!contractToSign || !adminSignature) {
      toast({
        title: "Signature Required",
        description: "Please provide your signature before completing the contract",
        variant: "destructive",
      });
      return;
    }

    setSigningContract(contractToSign.id);
    try {
      console.log('Admin signing contract:', contractToSign.id);
      
      // Get the current contract content to extract existing embedded signatures
      const { data: contractData, error: contractError } = await supabase
        .from('contracts_v2')
        .select('content')
        .eq('id', contractToSign.id)
        .single();

      if (contractError) {
        console.error('Error fetching contract:', contractError);
        throw contractError;
      }

      // Parse existing embedded signatures
      let existingSignatures: any[] = [];
      const signatureMatch = contractData.content.match(/\[EMBEDDED_SIGNATURES\](.*?)\[\/EMBEDDED_SIGNATURES\]/s);
      if (signatureMatch) {
        try {
          existingSignatures = JSON.parse(signatureMatch[1]);
          console.log('Existing signatures found:', existingSignatures);
        } catch (e) {
          console.error('Error parsing existing signatures:', e);
        }
      }

      // Create new admin signature with proper signer identification
      const newAdminSignature = {
        fieldId: 999, // Unique ID for admin signature
        signatureData: adminSignature,
        dateSigned: new Date().toLocaleDateString(),
        timestamp: new Date().toISOString(),
        ipAddress: 'admin-portal',
        signerType: 'admin',
        signerName: 'Dr. Kevin P. Johnson' // Admin name for display
      };

      // Remove any existing admin signatures and add the new one
      const updatedSignatures = [
        ...existingSignatures.filter((sig: any) => sig.signerType !== 'admin'),
        newAdminSignature
      ];

      console.log('Updated signatures with admin:', updatedSignatures);

      // Update contract content with embedded signatures
      let updatedContent = contractData.content;
      updatedContent = updatedContent.replace(/\[EMBEDDED_SIGNATURES\].*?\[\/EMBEDDED_SIGNATURES\]/s, '');
      const signaturesSection = `\n\n[EMBEDDED_SIGNATURES]${JSON.stringify(updatedSignatures)}[/EMBEDDED_SIGNATURES]`;
      updatedContent += signaturesSection;

      const adminSignedAt = new Date().toISOString();

      // Check if there's an existing signature record, if not create one
      const { data: existingSignatureRecord } = await supabase
        .from('contract_signatures_v2')
        .select('*')
        .eq('contract_id', contractToSign.id)
        .maybeSingle();

      if (existingSignatureRecord) {
        // Update existing signature record
        const { error: updateError } = await supabase
          .from('contract_signatures_v2')
          .update({
            admin_signature_data: adminSignature,
            admin_signed_at: adminSignedAt,
            status: 'completed'
          })
          .eq('id', existingSignatureRecord.id);

        if (updateError) {
          console.error('Error updating signature record:', updateError);
          throw updateError;
        }
      } else {
        // Create new signature record
        const { error: createError } = await supabase
          .from('contract_signatures_v2')
          .insert({
            contract_id: contractToSign.id,
            admin_signature_data: adminSignature,
            admin_signed_at: adminSignedAt,
            status: 'completed',
            date_signed: new Date().toLocaleDateString()
          });

        if (createError) {
          console.error('Error creating signature record:', createError);
          throw createError;
        }
      }

      console.log('Signature record handled successfully');

      // Update contract status and content
      const { error: contractUpdateError } = await supabase
        .from('contracts_v2')
        .update({
          content: updatedContent,
          status: 'completed',
          updated_at: adminSignedAt
        })
        .eq('id', contractToSign.id);

      if (contractUpdateError) {
        console.error('Error updating contract:', contractUpdateError);
        throw contractUpdateError;
      }

      console.log('Contract updated successfully with embedded admin signature');

      toast({
        title: "Contract Completed!",
        description: `"${contractToSign.title}" has been fully signed and completed.`,
      });

      // Close modal and clear state
      setShowSignatureModal(false);
      setContractToSign(null);
      setAdminSignature("");
      
      // Force a page refresh to update the contracts list
      window.location.reload();

    } catch (error) {
      console.error('Error signing contract:', error);
      toast({
        title: "Error",
        description: "Failed to complete contract signing. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSigningContract(null);
    }
  };

  const closeSignatureModal = () => {
    setShowSignatureModal(false);
    setContractToSign(null);
    setAdminSignature("");
  };

  return {
    signingContract,
    adminSignature,
    showSignatureModal,
    contractToSign,
    handleAdminSign,
    handleCompleteAdminSigning,
    closeSignatureModal,
    setAdminSignature
  };
};
