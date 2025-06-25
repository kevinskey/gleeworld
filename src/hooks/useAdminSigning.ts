
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
      
      // Get the current contract content and signature record
      const { data: contractData, error: contractError } = await supabase
        .from('contracts_v2')
        .select('content')
        .eq('id', contractToSign.id)
        .single();

      if (contractError) {
        console.error('Error fetching contract:', contractError);
        throw contractError;
      }

      // Get existing signature record to preserve artist signature data
      const { data: signatureRecord, error: signatureError } = await supabase
        .from('contract_signatures_v2')
        .select('*')
        .eq('contract_id', contractToSign.id)
        .single();

      if (signatureError) {
        console.error('Error fetching signature record:', signatureError);
        throw signatureError;
      }

      // Parse existing embedded signatures from contract content
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

      // Create artist signature object from signature record if not already in embedded signatures
      let artistSignature = existingSignatures.find(sig => sig.signerType === 'artist');
      if (!artistSignature && signatureRecord.artist_signature_data) {
        artistSignature = {
          fieldId: 1,
          signatureData: signatureRecord.artist_signature_data,
          dateSigned: signatureRecord.date_signed || new Date().toLocaleDateString(),
          timestamp: signatureRecord.artist_signed_at || new Date().toISOString(),
          ipAddress: signatureRecord.signer_ip || 'unknown',
          signerType: 'artist',
          signerName: 'Artist' // You might want to get actual artist name from contract content
        };
      }

      // Create new admin signature
      const newAdminSignature = {
        fieldId: 999,
        signatureData: adminSignature,
        dateSigned: new Date().toLocaleDateString(),
        timestamp: new Date().toISOString(),
        ipAddress: 'admin-portal',
        signerType: 'admin',
        signerName: 'Dr. Kevin P. Johnson'
      };

      // Build complete signatures array with both artist and admin
      const updatedSignatures = [];
      
      // Add artist signature if it exists
      if (artistSignature) {
        updatedSignatures.push(artistSignature);
      }
      
      // Add admin signature
      updatedSignatures.push(newAdminSignature);

      console.log('Complete signatures array with both artist and admin:', updatedSignatures);

      // Update contract content with both embedded signatures
      let updatedContent = contractData.content;
      updatedContent = updatedContent.replace(/\[EMBEDDED_SIGNATURES\].*?\[\/EMBEDDED_SIGNATURES\]/s, '');
      const signaturesSection = `\n\n[EMBEDDED_SIGNATURES]${JSON.stringify(updatedSignatures)}[/EMBEDDED_SIGNATURES]`;
      updatedContent += signaturesSection;

      const adminSignedAt = new Date().toISOString();

      // Update signature record with admin signature
      const { error: updateError } = await supabase
        .from('contract_signatures_v2')
        .update({
          admin_signature_data: adminSignature,
          admin_signed_at: adminSignedAt,
          status: 'completed',
          embedded_signatures: JSON.stringify(updatedSignatures)
        })
        .eq('id', signatureRecord.id);

      if (updateError) {
        console.error('Error updating signature record:', updateError);
        throw updateError;
      }

      console.log('Signature record updated with both signatures');

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

      console.log('Contract updated successfully with both artist and admin embedded signatures');

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
