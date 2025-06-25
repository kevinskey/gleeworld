
import { useParams } from "react-router-dom";
import { useContractSigning } from "@/hooks/contract-signing/useContractSigning";
import { ContractNotFound } from "@/components/contract-signing/ContractNotFound";
import { ContractContentRenderer } from "@/components/contract-signing/ContractContentRenderer";
import { Loader2 } from "lucide-react";

const ContractSigning = () => {
  const { contractId } = useParams<{ contractId: string }>();
  
  console.log('ContractSigning: Component mounted with contractId:', contractId);
  
  if (!contractId) {
    console.error('ContractSigning: No contractId provided');
    return <ContractNotFound />;
  }

  const { 
    contract,
    signatureFields,
    signatureRecord,
    completedFields,
    loading, 
    signing,
    error,
    handleFieldComplete,
    handleSignContract,
    isAdminOrAgentField,
    isArtistDateField,
    embeddedSignatures
  } = useContractSigning(contractId);

  console.log('ContractSigning: Hook state:', { 
    contract, 
    loading, 
    error, 
    signatureRecord,
    signatureFields: signatureFields?.length 
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading contract...</p>
        </div>
      </div>
    );
  }

  if (error) {
    console.error('ContractSigning: Error loading contract:', error);
    return <ContractNotFound />;
  }

  if (!contract) {
    console.error('ContractSigning: Contract not found');
    return <ContractNotFound />;
  }

  const getCompletionProgress = () => {
    const totalFields = signatureFields.filter(field => !isAdminOrAgentField(field)).length;
    const completedCount = Object.keys(completedFields).length;
    return `${completedCount}/${totalFields}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold mb-4">{contract.title}</h1>
          
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
      </div>
    </div>
  );
};

export default ContractSigning;
