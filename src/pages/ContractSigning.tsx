
import { useParams } from "react-router-dom";
import { ContractNotFound } from "@/components/contract-signing/ContractNotFound";
import { ContractContentRenderer } from "@/components/contract-signing/ContractContentRenderer";
import { SignatureStatus } from "@/components/contract-signing/SignatureStatus";
import { CompletionStatus } from "@/components/contract-signing/CompletionStatus";
import { W9StatusCard } from "@/components/contract-signing/W9StatusCard";
import { useContractSigning } from "@/hooks/contract-signing/useContractSigning";

const ContractSigning = () => {
  const { contractId } = useParams<{ contractId: string }>();
  
  console.log('ContractSigning - Contract ID from params:', contractId);

  const {
    contract,
    signatureFields,
    signatureRecord,
    completedFields,
    loading,
    signing,
    embeddedSignatures,
    handleFieldComplete,
    isAdminOrAgentField,
    isArtistDateField,
    isContractSigned,
    w9Status,
    w9Form,
    generateCombinedPDF,
  } = useContractSigning(contractId);

  console.log('ContractSigning - Hook results:', {
    contract: contract?.id || 'null',
    loading,
    signatureRecord: signatureRecord?.id || 'null'
  });

  const getCompletionProgress = () => {
    if (!signatureFields.length) return "No signature fields";
    
    const totalFields = signatureFields.filter(f => !isAdminOrAgentField(f)).length;
    const completedCount = Object.keys(completedFields).filter(fieldId => 
      !isAdminOrAgentField(signatureFields.find(f => f.id === parseInt(fieldId)) || signatureFields[0])
    ).length;
    
    return `${completedCount}/${totalFields} fields completed`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading contract...</p>
        </div>
      </div>
    );
  }

  // Show contract not found if no contract is loaded and not loading
  if (!contract && !loading) {
    return <ContractNotFound contractId={contractId || 'unknown'} />;
  }

  // Don't render anything if still loading or no contract
  if (!contract) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{contract.title}</h1>
          <p className="text-gray-600">Please review and sign the contract below.</p>
        </div>

        {/* Status Cards */}
        <div className="space-y-6">
          <SignatureStatus signatureRecord={signatureRecord} />
          <CompletionStatus contract={contract} />
          <W9StatusCard w9Status={w9Status} w9Form={w9Form} />
          
          {/* Contract Content */}
          <ContractContentRenderer
            contract={contract}
            signatureFields={signatureFields}
            completedFields={completedFields}
            signatureRecord={signatureRecord}
            isAdminOrAgentField={isAdminOrAgentField}
            isArtistDateField={isArtistDateField}
            onFieldComplete={handleFieldComplete}
            getCompletionProgress={getCompletionProgress}
            embeddedSignatures={embeddedSignatures || []}
          />
        </div>
      </div>
    </div>
  );
};

export default ContractSigning;
