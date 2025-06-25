
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
            // Check if contract content already has embedded signatures
            const hasEmbeddedSignatures = contract.content.includes('[EMBEDDED_SIGNATURES]');
            
            if (!hasEmbeddedSignatures) {
              // Add embedded signatures to contract content for display
              const signaturesSection = `\n\n[EMBEDDED_SIGNATURES]${JSON.stringify(signatureRecord.embedded_signatures)}[/EMBEDDED_SIGNATURES]`;
              const enhancedContent = contract.content + signaturesSection;
              
              setEnhancedContract({
                ...contract,
                content: enhancedContent
              });
              return;
            }
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
