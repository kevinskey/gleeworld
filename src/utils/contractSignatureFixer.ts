
import { supabase } from "@/integrations/supabase/client";

interface EmbeddedSignature {
  fieldId: number;
  signatureData: string;
  dateSigned: string;
  ipAddress?: string;
  timestamp: string;
  signerType: 'artist' | 'admin';
  signerName?: string;
}

export const fixMissingSignaturesInCompletedContracts = async () => {
  try {
    console.log('Starting to fix missing signatures in completed contracts...');

    // Get all completed contracts
    const { data: completedContracts, error: contractsError } = await supabase
      .from('contracts_v2')
      .select('id, title, content, status')
      .eq('status', 'completed');

    if (contractsError) {
      console.error('Error fetching completed contracts:', contractsError);
      throw contractsError;
    }

    console.log(`Found ${completedContracts?.length || 0} completed contracts`);

    const fixedContracts: string[] = [];
    const alreadyFixedContracts: string[] = [];

    for (const contract of completedContracts || []) {
      // Check if contract already has embedded signatures
      const hasEmbeddedSignatures = contract.content.includes('[EMBEDDED_SIGNATURES]');
      
      if (hasEmbeddedSignatures) {
        // Parse existing signatures to check if both are present
        const signatureMatch = contract.content.match(/\[EMBEDDED_SIGNATURES\](.*?)\[\/EMBEDDED_SIGNATURES\]/s);
        if (signatureMatch) {
          try {
            const embeddedSignatures: EmbeddedSignature[] = JSON.parse(signatureMatch[1]);
            const hasArtistSignature = embeddedSignatures.some(sig => sig.signerType === 'artist');
            const hasAdminSignature = embeddedSignatures.some(sig => sig.signerType === 'admin');
            
            if (hasArtistSignature && hasAdminSignature) {
              alreadyFixedContracts.push(contract.title);
              continue;
            }
          } catch (e) {
            console.error('Error parsing existing embedded signatures:', e);
          }
        }
      }

      // Get signature record for this contract
      const { data: signatureRecord, error: signatureError } = await supabase
        .from('contract_signatures_v2')
        .select('*')
        .eq('contract_id', contract.id)
        .eq('status', 'completed')
        .maybeSingle();

      if (signatureError) {
        console.error(`Error fetching signature record for contract ${contract.id}:`, signatureError);
        continue;
      }

      if (!signatureRecord) {
        console.warn(`No signature record found for completed contract ${contract.id}`);
        continue;
      }

      // Build embedded signatures array
      const embeddedSignatures: EmbeddedSignature[] = [];

      // Add artist signature if present
      if (signatureRecord.artist_signature_data && signatureRecord.artist_signed_at) {
        embeddedSignatures.push({
          fieldId: 1,
          signatureData: signatureRecord.artist_signature_data,
          dateSigned: signatureRecord.date_signed || new Date(signatureRecord.artist_signed_at).toLocaleDateString(),
          timestamp: signatureRecord.artist_signed_at,
          ipAddress: signatureRecord.signer_ip ? String(signatureRecord.signer_ip) : 'unknown',
          signerType: 'artist',
          signerName: 'Artist'
        });
      }

      // Add admin signature if present
      if (signatureRecord.admin_signature_data && signatureRecord.admin_signed_at) {
        embeddedSignatures.push({
          fieldId: 999,
          signatureData: signatureRecord.admin_signature_data,
          dateSigned: signatureRecord.date_signed || new Date(signatureRecord.admin_signed_at).toLocaleDateString(),
          timestamp: signatureRecord.admin_signed_at,
          ipAddress: 'admin-portal',
          signerType: 'admin',
          signerName: 'Dr. Kevin P. Johnson'
        });
      }

      if (embeddedSignatures.length === 0) {
        console.warn(`No signature data found for contract ${contract.id}`);
        continue;
      }

      // Update contract content with embedded signatures
      let updatedContent = contract.content;
      
      // Remove existing embedded signatures section if present
      updatedContent = updatedContent.replace(/\[EMBEDDED_SIGNATURES\].*?\[\/EMBEDDED_SIGNATURES\]/gs, '');
      
      // Add new embedded signatures section
      const signaturesSection = `\n\n[EMBEDDED_SIGNATURES]${JSON.stringify(embeddedSignatures)}[/EMBEDDED_SIGNATURES]`;
      updatedContent += signaturesSection;

      // Update the contract
      const { error: updateError } = await supabase
        .from('contracts_v2')
        .update({
          content: updatedContent,
          updated_at: new Date().toISOString()
        })
        .eq('id', contract.id);

      if (updateError) {
        console.error(`Error updating contract ${contract.id}:`, updateError);
        continue;
      }

      // Update signature record with embedded signatures
      const { error: signatureUpdateError } = await supabase
        .from('contract_signatures_v2')
        .update({
          embedded_signatures: JSON.stringify(embeddedSignatures)
        })
        .eq('id', signatureRecord.id);

      if (signatureUpdateError) {
        console.error(`Error updating signature record for contract ${contract.id}:`, signatureUpdateError);
      }

      fixedContracts.push(contract.title);
      console.log(`Fixed signatures for contract: ${contract.title}`);
    }

    console.log('Signature fixing completed');
    console.log(`Fixed contracts (${fixedContracts.length}):`, fixedContracts);
    console.log(`Already fixed contracts (${alreadyFixedContracts.length}):`, alreadyFixedContracts);

    return {
      success: true,
      fixedContracts,
      alreadyFixedContracts,
      totalProcessed: completedContracts?.length || 0
    };

  } catch (error) {
    console.error('Error fixing signatures in completed contracts:', error);
    throw error;
  }
};

export const checkContractSignatureStatus = async (contractId: string) => {
  try {
    const { data: contract, error: contractError } = await supabase
      .from('contracts_v2')
      .select('id, title, content, status')
      .eq('id', contractId)
      .single();

    if (contractError) {
      throw contractError;
    }

    const { data: signatureRecord, error: signatureError } = await supabase
      .from('contract_signatures_v2')
      .select('*')
      .eq('contract_id', contractId)
      .maybeSingle();

    // Check embedded signatures in content
    let embeddedSignatures: EmbeddedSignature[] = [];
    const signatureMatch = contract.content.match(/\[EMBEDDED_SIGNATURES\](.*?)\[\/EMBEDDED_SIGNATURES\]/s);
    if (signatureMatch) {
      try {
        embeddedSignatures = JSON.parse(signatureMatch[1]);
      } catch (e) {
        console.error('Error parsing embedded signatures:', e);
      }
    }

    const hasArtistSignature = embeddedSignatures.some(sig => sig.signerType === 'artist');
    const hasAdminSignature = embeddedSignatures.some(sig => sig.signerType === 'admin');
    
    return {
      contract,
      signatureRecord,
      embeddedSignatures,
      hasArtistSignature,
      hasAdminSignature,
      hasCompleteSignatures: hasArtistSignature && hasAdminSignature,
      signatureCount: embeddedSignatures.length
    };
  } catch (error) {
    console.error('Error checking contract signature status:', error);
    throw error;
  }
};
