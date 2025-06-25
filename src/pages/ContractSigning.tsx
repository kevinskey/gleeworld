
import { useParams } from "react-router-dom";
import { useContractSigning } from "@/hooks/contract-signing/useContractSigning";
import { useContractFetcher } from "@/hooks/contract-signing/useContractFetcher";
import { ContractNotFound } from "@/components/contract-signing/ContractNotFound";
import { SigningDashboard } from "@/components/SigningDashboard";
import { Loader2 } from "lucide-react";

const ContractSigning = () => {
  const { contractId } = useParams<{ contractId: string }>();
  
  console.log('ContractSigning: Component mounted with contractId:', contractId);
  
  if (!contractId) {
    console.error('ContractSigning: No contractId provided');
    return <ContractNotFound />;
  }

  const { contract, loading: contractLoading, error: contractError } = useContractFetcher(contractId);
  const { 
    loading: signingLoading, 
    error: signingError, 
    handleSignContract 
  } = useContractSigning(contractId);

  console.log('ContractSigning: Contract state:', { contract, contractLoading, contractError });
  console.log('ContractSigning: Signing state:', { signingLoading, signingError });

  if (contractLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading contract...</p>
        </div>
      </div>
    );
  }

  if (contractError) {
    console.error('ContractSigning: Error loading contract:', contractError);
    return <ContractNotFound />;
  }

  if (!contract) {
    console.error('ContractSigning: Contract not found');
    return <ContractNotFound />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SigningDashboard 
        contract={contract}
        onSignContract={handleSignContract}
        loading={signingLoading}
      />
    </div>
  );
};

export default ContractSigning;
