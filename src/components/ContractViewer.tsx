import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ContractViewerContent } from "./ContractViewerContent";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Contract {
  id: string;
  title: string;
  content: string;
  status: string;
  created_at: string;
  updated_at?: string;
}

interface ContractViewerProps {
  contract: Contract | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "completed": return "bg-green-100 text-green-800";
    case "pending_admin_signature": return "bg-yellow-100 text-yellow-800";
    case "pending_recipient": return "bg-orange-100 text-orange-800";
    case "pending_sender": return "bg-red-100 text-red-800";
    case "draft": return "bg-gray-100 text-gray-800";
    default: return "bg-gray-100 text-gray-800";
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case "completed": return "Completed";
    case "pending_admin_signature": return "Pending Admin Signature";
    case "pending_recipient": return "Pending Recipient";
    case "pending_sender": return "Pending Your Signature";
    case "draft": return "Draft";
    default: return "Unknown";
  }
};

export const ContractViewer = ({ contract, open, onOpenChange }: ContractViewerProps) => {
  const [enhancedContract, setEnhancedContract] = useState<Contract | null>(null);

  useEffect(() => {
    const fetchSignatureData = async () => {
      if (!contract || !open) {
        setEnhancedContract(contract);
        return;
      }

      // For draft contracts, just use the contract as-is without trying to fetch signature data
      if (contract.status === 'draft') {
        console.log('Contract is draft, displaying as-is:', contract.title);
        setEnhancedContract(contract);
        return;
      }

      // If contract is completed, try to fetch embedded signatures from signature record
      if (contract.status === 'completed') {
        try {
          const { data: signatureRecord, error } = await supabase
            .from('contract_signatures_v2')
            .select('embedded_signatures')
            .eq('contract_id', contract.id)
            .eq('status', 'completed')
            .maybeSingle();

          if (!error && signatureRecord?.embedded_signatures) {
            console.log('Found signature record with embedded signatures:', signatureRecord.embedded_signatures);
            
            // Check if contract content already has embedded signatures
            const hasEmbeddedSignatures = contract.content.includes('[EMBEDDED_SIGNATURES]');
            
            if (!hasEmbeddedSignatures) {
              console.log('Adding embedded signatures to contract content for viewing');
              // Add embedded signatures to contract content for display
              let signaturesData = signatureRecord.embedded_signatures;
              
              // Handle both string and object formats
              let signaturesString;
              if (typeof signaturesData === 'string') {
                // If it's already a string, try to parse it to validate, then use as-is
                try {
                  JSON.parse(signaturesData);
                  signaturesString = signaturesData;
                } catch {
                  // If parsing fails, it might be raw JSON, wrap it
                  signaturesString = signaturesData;
                }
              } else {
                // If it's an object, stringify it
                signaturesString = JSON.stringify(signaturesData);
              }
              
              const signaturesSection = `\n\n[EMBEDDED_SIGNATURES]${signaturesString}[/EMBEDDED_SIGNATURES]`;
              const enhancedContent = contract.content + signaturesSection;
              
              console.log('Enhanced contract content with signatures, length:', enhancedContent.length);
              
              setEnhancedContract({
                ...contract,
                content: enhancedContent
              });
              return;
            } else {
              console.log('Contract already has embedded signatures in content');
            }
          } else {
            console.log('No signature record found or no embedded signatures');
          }
        } catch (error) {
          console.error('Error fetching signature data for contract viewer:', error);
        }
      }

      setEnhancedContract(contract);
    };

    fetchSignatureData();
  }, [contract, open]);

  if (!enhancedContract) return null;

  console.log('ContractViewer rendering contract:', {
    title: enhancedContract.title,
    status: enhancedContract.status,
    contentLength: enhancedContract.content?.length || 0,
    hasEmbeddedSignatures: enhancedContract.content?.includes('[EMBEDDED_SIGNATURES]') || false
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl">{enhancedContract.title}</DialogTitle>
            <Badge className={getStatusColor(enhancedContract.status)}>
              {getStatusText(enhancedContract.status)}
            </Badge>
          </div>
          <DialogDescription>
            Created: {new Date(enhancedContract.created_at).toLocaleDateString()}
            {enhancedContract.updated_at && enhancedContract.updated_at !== enhancedContract.created_at && (
              <span className="ml-4">
                • Updated: {new Date(enhancedContract.updated_at).toLocaleDateString()}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        
        <ContractViewerContent contract={enhancedContract} />
      </DialogContent>
    </Dialog>
  );
};
