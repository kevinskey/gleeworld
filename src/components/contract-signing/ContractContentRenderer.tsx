
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SignatureFieldOverlay } from "@/components/SignatureFieldOverlay";
import { SignatureCanvas } from "@/components/SignatureCanvas";
import { EmbeddedSignatureDisplay } from "./EmbeddedSignatureDisplay";
import { ContractProgressStatus } from "./ContractProgressStatus";
import { ContractContentProcessor } from "./ContractContentProcessor";
import { SignatureStatus } from "./SignatureStatus";
import { CompletionStatus } from "./CompletionStatus";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface ContractContentRendererProps {
  contract: any;
  signatureFields: any[];
  completedFields: Record<number, string>;
  signatureRecord: any;
  isAdminOrAgentField: (field: any) => boolean;
  isArtistDateField: (field: any) => boolean;
  onFieldComplete: (fieldId: number, value: string) => void;
  getCompletionProgress: () => string;
  embeddedSignatures: any[];
}

export const ContractContentRenderer = ({
  contract,
  signatureFields,
  completedFields,
  signatureRecord,
  isAdminOrAgentField,
  isArtistDateField,
  onFieldComplete,
  getCompletionProgress,
  embeddedSignatures
}: ContractContentRendererProps) => {
  const [finalSignature, setFinalSignature] = useState<string | null>(null);
  const [signingInProgress, setSigningInProgress] = useState(false);
  const { toast } = useToast();

  const handleFinalSignatureComplete = async () => {
    if (!finalSignature) {
      toast({
        title: "Signature Required",
        description: "Please provide your signature to complete the contract.",
        variant: "destructive",
      });
      return;
    }

    setSigningInProgress(true);
    try {
      // Here you would call your contract signing function
      // For now, we'll just show a success message
      toast({
        title: "Contract Signed",
        description: "Your contract has been signed successfully!",
      });
    } catch (error) {
      console.error('Error signing contract:', error);
      toast({
        title: "Error",
        description: "Failed to sign contract. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSigningInProgress(false);
    }
  };

  const isContractCompleted = signatureRecord?.status === 'completed';
  const artistFields = signatureFields.filter(field => !isAdminOrAgentField(field));
  const allFieldsCompleted = artistFields.every(field => completedFields[field.id]);

  return (
    <div className="space-y-6">
      {/* Contract Progress Status */}
      <ContractProgressStatus
        completionProgress={getCompletionProgress()}
        isContractCompleted={isContractCompleted}
      />

      {/* Contract Content with Signature Fields */}
      <Card className="p-6">
        <div className="relative">
          <ContractContentProcessor 
            content={contract.content}
            embeddedSignatures={embeddedSignatures}
          />
          
          {/* Render signature field overlays */}
          {signatureFields
            .filter(field => !isAdminOrAgentField(field))
            .map((field) => (
              <SignatureFieldOverlay
                key={field.id}
                field={field}
                onFieldComplete={onFieldComplete}
                isCompleted={!!completedFields[field.id]}
                value={completedFields[field.id]}
              />
            ))}
        </div>
      </Card>

      {/* Signature Status */}
      <SignatureStatus 
        signatureRecord={signatureRecord}
        embeddedSignatures={embeddedSignatures}
      />

      {/* Final Signature Section */}
      {allFieldsCompleted && !isContractCompleted && (
        <Card className="p-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Final Signature</h3>
            <p className="text-gray-600">
              Please provide your final signature to complete the contract.
            </p>
            
            <SignatureCanvas 
              onSignatureChange={setFinalSignature}
              disabled={signingInProgress}
            />
            
            <Button 
              onClick={handleFinalSignatureComplete}
              disabled={!finalSignature || signingInProgress}
              className="w-full"
              size="lg"
            >
              {signingInProgress ? "Signing Contract..." : "Complete Contract Signing"}
            </Button>
          </div>
        </Card>
      )}

      {/* Completion Status */}
      <CompletionStatus 
        isContractCompleted={isContractCompleted}
        signatureRecord={signatureRecord}
      />
    </div>
  );
};
