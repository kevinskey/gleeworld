
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, FileText } from "lucide-react";
import { useContractSigning } from "@/hooks/useContractSigning";
import { SignatureStatus } from "@/components/contract-signing/SignatureStatus";
import { ContractContentRenderer } from "@/components/contract-signing/ContractContentRenderer";
import { CompletionStatus } from "@/components/contract-signing/CompletionStatus";
import { W9StatusCard } from "@/components/contract-signing/W9StatusCard";
import { useToast } from "@/hooks/use-toast";

const ContractSigning = () => {
  const { contractId } = useParams<{ contractId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    contract,
    signatureRecord,
    loading,
    signing,
    signatureFields,
    completedFields,
    handleFieldComplete,
    isAdminOrAgentField,
    isArtistDateField,
    isContractSigned,
    embeddedSignatures,
    w9Status,
    w9Form,
    generateCombinedPDF,
    w9CheckCompleted
  } = useContractSigning(contractId);

  const handleW9Complete = () => {
    navigate('/w9-form');
  };

  const handleDownloadCombinedPDF = async () => {
    try {
      const pdfData = await generateCombinedPDF();
      if (pdfData && pdfData.downloadUrl) {
        window.open(pdfData.downloadUrl, '_blank');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate combined PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getCompletionProgress = () => {
    if (isContractSigned()) {
      return "Contract signed with embedded signatures";
    }
    if (signatureRecord?.status === 'pending_admin_signature') {
      return "Artist signed - Pending admin approval";
    }
    if (signatureRecord?.status === 'completed') {
      return "Fully completed";
    }
    
    const artistRequiredFields = signatureFields.filter(f => 
      f.required && !isAdminOrAgentField(f)
    );
    const completed = artistRequiredFields.filter(f => completedFields[f.id]);
    return `${completed.length}/${artistRequiredFields.length} artist fields completed`;
  };

  const canDownloadPDF = isContractSigned() && w9Status === 'completed';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading contract...</span>
        </div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Contract Not Found</h2>
            <p className="text-gray-600 mb-4">
              The contract you're looking for doesn't exist or has been removed.
            </p>
            <p className="text-sm text-gray-500">
              Contract ID: {contractId}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-4 md:py-8">
      <div className="max-w-4xl mx-auto px-2 md:px-4 space-y-4 md:space-y-6">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-6 w-6" />
              <span className="text-lg md:text-xl truncate">{contract?.title}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <W9StatusCard
              w9Status={w9Status}
              w9Form={w9Form}
              onW9Complete={handleW9Complete}
              onDownloadCombinedPDF={handleDownloadCombinedPDF}
              canDownloadPDF={canDownloadPDF}
              w9CheckCompleted={w9CheckCompleted}
            />
            
            <SignatureStatus signatureRecord={signatureRecord} />
            <div className="relative">
              <ContractContentRenderer
                contract={contract}
                signatureFields={signatureFields}
                completedFields={completedFields}
                signatureRecord={signatureRecord}
                isAdminOrAgentField={isAdminOrAgentField}
                isArtistDateField={isArtistDateField}
                onFieldComplete={handleFieldComplete}
                getCompletionProgress={getCompletionProgress}
                embeddedSignatures={embeddedSignatures}
              />
            </div>
          </CardContent>
        </Card>

        {signing && (
          <div className="text-center py-4">
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Embedding your signature in the document...</span>
            </div>
          </div>
        )}

        <CompletionStatus contract={contract} />
      </div>
    </div>
  );
};

export default ContractSigning;
