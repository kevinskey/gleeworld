
import { useParams } from "react-router-dom";
import { useContractSigning } from "@/hooks/contract-signing/useContractSigning";
import { ContractNotFound } from "@/components/contract-signing/ContractNotFound";
import { ContractContentRenderer } from "@/components/contract-signing/ContractContentRenderer";
import { Loader2 } from "lucide-react";

const ContractSigning = () => {
  const { contractId } = useParams<{ contractId: string }>();
  
  console.log('ContractSigning: Component mounted');
  console.log('ContractSigning: URL params:', { contractId });
  console.log('ContractSigning: Window location:', window.location.href);
  
  if (!contractId) {
    console.error('ContractSigning: No contractId in URL params');
    return <ContractNotFound />;
  }

  // Validate contract ID format (should be UUID)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(contractId)) {
    console.error('ContractSigning: Invalid contract ID format:', contractId);
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
    hasContract: !!contract, 
    loading, 
    error, 
    hasSignatureRecord: !!signatureRecord,
    signatureFieldsCount: signatureFields?.length || 0
  });

  // Add detailed error logging
  if (error) {
    console.error('ContractSigning: Detailed error state:', {
      error,
      contractId,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    });
  }

  if (loading) {
    console.log('ContractSigning: Showing loading state');
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading contract...</p>
          <p className="text-sm text-gray-400 mt-2">Contract ID: {contractId}</p>
          <p className="text-xs text-gray-300 mt-1">Please wait while we fetch your contract...</p>
        </div>
      </div>
    );
  }

  if (error) {
    console.error('ContractSigning: Rendering error state:', error);
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Unable to Load Contract</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="bg-gray-100 p-3 rounded text-xs text-gray-500 mb-4">
            <p><strong>Contract ID:</strong> {contractId}</p>
            <p><strong>URL:</strong> {window.location.href}</p>
          </div>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 mr-2"
          >
            Retry Loading
          </button>
          <button 
            onClick={() => window.location.href = '/'} 
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Go to Homepage
          </button>
        </div>
      </div>
    );
  }

  if (!contract) {
    console.error('ContractSigning: No contract data available');
    return <ContractNotFound />;
  }

  console.log('ContractSigning: Rendering contract successfully:', contract.title);

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
