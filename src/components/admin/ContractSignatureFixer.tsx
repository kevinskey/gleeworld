
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, RefreshCw, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { fixMissingSignaturesInCompletedContracts, checkContractSignatureStatus } from "@/utils/contractSignatureFixer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const ContractSignatureFixer = () => {
  const [isFixing, setIsFixing] = useState(false);
  const [fixResult, setFixResult] = useState<any>(null);
  const [contractId, setContractId] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<any>(null);
  const { toast } = useToast();

  const handleFixAllSignatures = async () => {
    setIsFixing(true);
    setFixResult(null);
    
    try {
      const result = await fixMissingSignaturesInCompletedContracts();
      setFixResult(result);
      
      toast({
        title: "Signature Fix Completed",
        description: `Fixed ${result.fixedContracts.length} contracts. ${result.alreadyFixedContracts.length} were already correct.`,
      });
    } catch (error) {
      console.error('Error fixing signatures:', error);
      toast({
        title: "Error",
        description: "Failed to fix contract signatures. Check console for details.",
        variant: "destructive",
      });
    } finally {
      setIsFixing(false);
    }
  };

  const handleCheckContract = async () => {
    if (!contractId.trim()) {
      toast({
        title: "Contract ID Required",
        description: "Please enter a contract ID to check.",
        variant: "destructive",
      });
      return;
    }

    setIsChecking(true);
    setCheckResult(null);

    try {
      const result = await checkContractSignatureStatus(contractId);
      setCheckResult(result);
      
      if (result.hasCompleteSignatures) {
        toast({
          title: "Contract Status",
          description: "Contract has complete signatures from both artist and admin.",
        });
      } else {
        toast({
          title: "Contract Status",
          description: "Contract is missing one or more signatures.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error checking contract:', error);
      toast({
        title: "Error",
        description: "Failed to check contract status. Verify the contract ID.",
        variant: "destructive",
      });
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Contract Signature Fixer
          </CardTitle>
          <CardDescription>
            Fix missing signatures in completed contracts by reconstructing them from signature records.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Check Individual Contract */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Check Individual Contract</h3>
            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="contract-id">Contract ID</Label>
                <Input
                  id="contract-id"
                  value={contractId}
                  onChange={(e) => setContractId(e.target.value)}
                  placeholder="Enter contract ID to check signature status"
                />
              </div>
              <div className="flex items-end">
                <Button 
                  onClick={handleCheckContract} 
                  disabled={isChecking || !contractId.trim()}
                  variant="outline"
                >
                  {isChecking ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      Check
                    </>
                  )}
                </Button>
              </div>
            </div>

            {checkResult && (
              <Card>
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{checkResult.contract.title}</h4>
                      <Badge variant={checkResult.hasCompleteSignatures ? "default" : "destructive"}>
                        {checkResult.hasCompleteSignatures ? "Complete" : "Incomplete"}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        {checkResult.hasArtistSignature ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        )}
                        <span>Artist Signature</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {checkResult.hasAdminSignature ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        )}
                        <span>Admin Signature</span>
                      </div>
                    </div>

                    <div className="text-sm text-gray-600">
                      <p>Status: {checkResult.contract.status}</p>
                      <p>Embedded Signatures: {checkResult.signatureCount}</p>
                      {checkResult.signatureRecord && (
                        <p>Signature Record: Found (ID: {checkResult.signatureRecord.id})</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Fix All Contracts */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Fix All Completed Contracts</h3>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                This will scan all completed contracts and add missing signatures from their signature records.
                Contracts that already have complete signatures will be skipped.
              </p>
              
              <Button 
                onClick={handleFixAllSignatures} 
                disabled={isFixing}
                size="lg"
              >
                {isFixing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Fixing Signatures...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Fix All Missing Signatures
                  </>
                )}
              </Button>

              {fixResult && (
                <Card>
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      <h4 className="font-medium">Fix Results</h4>
                      
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">
                            {fixResult.totalProcessed}
                          </div>
                          <div className="text-gray-600">Total Processed</div>
                        </div>
                        
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">
                            {fixResult.fixedContracts.length}
                          </div>
                          <div className="text-gray-600">Fixed</div>
                        </div>
                        
                        <div className="text-center">
                          <div className="text-2xl font-bold text-gray-600">
                            {fixResult.alreadyFixedContracts.length}
                          </div>
                          <div className="text-gray-600">Already Complete</div>
                        </div>
                      </div>

                      {fixResult.fixedContracts.length > 0 && (
                        <div>
                          <h5 className="font-medium text-green-700 mb-2">Fixed Contracts:</h5>
                          <ul className="text-sm space-y-1">
                            {fixResult.fixedContracts.map((title: string, index: number) => (
                              <li key={index} className="flex items-center gap-2">
                                <CheckCircle className="h-3 w-3 text-green-500" />
                                {title}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
