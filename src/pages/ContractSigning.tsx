
import { useParams } from "react-router-dom";
import { useContractSigning } from "@/hooks/contract-signing/useContractSigning";
import { ContractContentRenderer } from "@/components/contract-signing/ContractContentRenderer";
import { ContractErrorBoundary } from "@/components/contract-signing/ContractErrorBoundary";
import { Loader2, Mail, AlertCircle } from "lucide-react";

const ContractSigning = () => {
  const { contractId } = useParams<{ contractId: string }>();
  
  console.log('=== ContractSigning Debug Info ===');
  console.log('ContractSigning: Component mounted');
  console.log('ContractSigning: Current URL:', window.location.href);
  console.log('ContractSigning: Current pathname:', window.location.pathname);
  console.log('ContractSigning: contractId from useParams:', contractId);
  console.log('ContractSigning: All URL params:', useParams());
  console.log('ContractSigning: typeof contractId:', typeof contractId);
  console.log('ContractSigning: contractId length:', contractId?.length);
  console.log('=== End Debug Info ===');
  
  // Show immediate feedback if no contractId
  if (!contractId) {
    console.error('ContractSigning: No contractId in URL params');
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-red-700 mb-2">Invalid Contract Link</h2>
          <p className="text-red-600 mb-4">No contract ID found in the URL. Please use the complete link from your email.</p>
          <div className="bg-gray-100 p-3 rounded text-sm text-gray-500">
            <p><strong>Current URL:</strong> {window.location.href}</p>
            <p><strong>Expected format:</strong> /contract-signing/[contract-id]</p>
            <p><strong>Pathname:</strong> {window.location.pathname}</p>
          </div>
        </div>
      </div>
    );
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
    signatureFieldsCount: signatureFields?.length || 0,
    embeddedSignaturesCount: Array.isArray(embeddedSignatures) ? embeddedSignatures.length : 0,
    contractId
  });

  // Enhanced loading state
  if (loading) {
    console.log('ContractSigning: Showing loading state');
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Loading Contract</h2>
          <p className="text-gray-600 mb-4">Please wait while we fetch your contract...</p>
          <div className="bg-gray-100 p-3 rounded text-sm text-gray-500">
            <p><strong>Contract ID:</strong> {contractId}</p>
            <p><strong>Current URL:</strong> {window.location.href}</p>
          </div>
        </div>
      </div>
    );
  }

  // Enhanced error state
  if (error) {
    console.error('ContractSigning: Rendering error state:', error);
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-3" />
            <h2 className="text-xl font-semibold text-red-700 mb-2">Unable to Load Contract</h2>
            <p className="text-red-600 mb-4">{error}</p>
          </div>
          
          <div className="bg-gray-100 p-4 rounded text-sm text-gray-600 mb-6">
            <p className="font-medium mb-2">Debug Information:</p>
            <p><strong>Contract ID:</strong> {contractId}</p>
            <p><strong>URL:</strong> {window.location.href}</p>
            <p><strong>Pathname:</strong> {window.location.pathname}</p>
          </div>
          
          <div className="space-y-3">
            <button 
              onClick={() => window.location.reload()} 
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Retry Loading
            </button>
            <a 
              href="mailto:contracts@contract.gleeworld.org" 
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
            >
              <Mail className="h-4 w-4" />
              Get Help
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Enhanced no contract state
  if (!contract) {
    console.error('ContractSigning: No contract data available');
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
            <AlertCircle className="h-8 w-8 text-yellow-500 mx-auto mb-3" />
            <h2 className="text-xl font-semibold text-yellow-700 mb-2">Contract Not Found</h2>
            <p className="text-yellow-600 mb-4">The contract you're looking for could not be found.</p>
          </div>
          
          <div className="bg-gray-100 p-4 rounded text-sm text-gray-600 mb-6">
            <p><strong>Contract ID:</strong> {contractId}</p>
            <p><strong>URL:</strong> {window.location.href}</p>
          </div>
          
          <a 
            href="mailto:contracts@contract.gleeworld.org" 
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            <Mail className="h-4 w-4" />
            Contact Support
          </a>
        </div>
      </div>
    );
  }

  console.log('ContractSigning: Rendering contract successfully:', contract.title);

  const getCompletionProgress = () => {
    const safeSignatureFields = Array.isArray(signatureFields) ? signatureFields : [];
    const safeCompletedFields = completedFields || {};
    const totalFields = safeSignatureFields.filter(field => !isAdminOrAgentField(field)).length;
    const completedCount = Object.keys(safeCompletedFields).length;
    return `${completedCount}/${totalFields}`;
  };

  // Ensure all arrays are safe before passing to components
  const safeEmbeddedSignatures = Array.isArray(embeddedSignatures) ? embeddedSignatures : [];
  const safeSignatureFields = Array.isArray(signatureFields) ? signatureFields : [];
  const safeCompletedFields = completedFields || {};

  console.log('ContractSigning: About to render main content with contract:', contract.title);

  return (
    <ContractErrorBoundary>
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{contract.title}</h1>
              <div className="text-sm text-gray-500">
                Contract ID: {contractId}
              </div>
              <div className="text-xs text-green-600 mt-2">
                ✓ Contract loaded successfully
              </div>
            </div>
            
            <ContractContentRenderer
              contract={contract}
              signatureFields={safeSignatureFields}
              completedFields={safeCompletedFields}
              signatureRecord={signatureRecord}
              isAdminOrAgentField={isAdminOrAgentField}
              isArtistDateField={isArtistDateField}
              onFieldComplete={handleFieldComplete}
              getCompletionProgress={getCompletionProgress}
              embeddedSignatures={safeEmbeddedSignatures}
            />
            
            {/* Contact Information */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">
                  Questions about this contract?
                </p>
                <a 
                  href="mailto:contracts@contract.gleeworld.org" 
                  className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
                >
                  <Mail className="h-4 w-4" />
                  contracts@contract.gleeworld.org
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ContractErrorBoundary>
  );
};

export default ContractSigning;
