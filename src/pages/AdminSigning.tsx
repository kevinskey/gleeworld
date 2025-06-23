
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, PenTool, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { SignatureCanvas } from "@/components/SignatureCanvas";

interface ContractSignature {
  id: string;
  contract_id: string;
  status: string;
  artist_signed_at: string;
  date_signed: string;
  contracts_v2: {
    id: string;
    title: string;
    content: string;
    created_at: string;
  };
}

interface EmbeddedSignature {
  fieldId: number;
  signatureData: string;
  dateSigned: string;
  ipAddress?: string;
  timestamp: string;
  signerType?: 'artist' | 'admin';
}

const AdminSigning = () => {
  const [pendingContracts, setPendingContracts] = useState<ContractSignature[]>([]);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState<string | null>(null);
  const [selectedContract, setSelectedContract] = useState<ContractSignature | null>(null);
  const [adminSignature, setAdminSignature] = useState<string>("");
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchPendingContracts();
  }, [user, navigate]);

  const fetchPendingContracts = async () => {
    try {
      const { data, error } = await supabase
        .from('contract_signatures_v2')
        .select(`
          id,
          contract_id,
          status,
          artist_signed_at,
          date_signed,
          contracts_v2 (
            id,
            title,
            content,
            created_at
          )
        `)
        .eq('status', 'pending_admin_signature')
        .order('artist_signed_at', { ascending: false });

      if (error) {
        console.error('Error fetching pending contracts:', error);
        throw error;
      }

      setPendingContracts(data || []);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to load pending contracts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignContract = async (signatureRecord: ContractSignature) => {
    if (!adminSignature) {
      toast({
        title: "Signature Required",
        description: "Please provide your signature before completing the contract",
        variant: "destructive",
      });
      return;
    }

    setSigning(signatureRecord.id);
    try {
      console.log('Admin signing contract with signature ID:', signatureRecord.id);
      
      // Get the current contract content to extract existing embedded signatures
      const { data: contractData, error: contractError } = await supabase
        .from('contracts_v2')
        .select('content')
        .eq('id', signatureRecord.contract_id)
        .single();

      if (contractError) {
        console.error('Error fetching contract:', contractError);
        throw contractError;
      }

      // Parse existing embedded signatures
      let existingSignatures: EmbeddedSignature[] = [];
      const signatureMatch = contractData.content.match(/\[EMBEDDED_SIGNATURES\](.*?)\[\/EMBEDDED_SIGNATURES\]/s);
      if (signatureMatch) {
        try {
          existingSignatures = JSON.parse(signatureMatch[1]);
        } catch (e) {
          console.error('Error parsing existing signatures:', e);
        }
      }

      // Create new admin signature
      const newAdminSignature: EmbeddedSignature = {
        fieldId: 3, // Different field ID for admin signature
        signatureData: adminSignature,
        dateSigned: new Date().toLocaleDateString(),
        timestamp: new Date().toISOString(),
        ipAddress: 'unknown',
        signerType: 'admin'
      };

      // Combine existing signatures with new admin signature
      // Keep all existing signatures and add the new admin signature
      const updatedSignatures = [
        ...existingSignatures.filter(sig => sig.signerType !== 'admin'), // Remove any existing admin signatures
        newAdminSignature // Add the new admin signature
      ];

      // Update contract content with embedded signatures
      let updatedContent = contractData.content;
      
      // Remove existing embedded signatures section if it exists
      updatedContent = updatedContent.replace(/\[EMBEDDED_SIGNATURES\].*?\[\/EMBEDDED_SIGNATURES\]/s, '');
      
      // Add new embedded signatures section
      const signaturesSection = `\n\n[EMBEDDED_SIGNATURES]${JSON.stringify(updatedSignatures)}[/EMBEDDED_SIGNATURES]`;
      updatedContent += signaturesSection;

      // Update the signature record with admin signature
      const { error: updateError } = await supabase
        .from('contract_signatures_v2')
        .update({
          admin_signature_data: adminSignature,
          admin_signed_at: new Date().toISOString(),
          status: 'completed'
        })
        .eq('id', signatureRecord.id);

      if (updateError) {
        console.error('Error updating signature record:', updateError);
        throw updateError;
      }

      // Update contract status and content
      const { error: contractUpdateError } = await supabase
        .from('contracts_v2')
        .update({
          content: updatedContent,
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', signatureRecord.contract_id);

      if (contractUpdateError) {
        console.error('Error updating contract:', contractUpdateError);
        throw contractUpdateError;
      }

      console.log('Admin signature embedded successfully in document');

      toast({
        title: "Contract Completed!",
        description: `"${signatureRecord.contracts_v2.title}" has been fully signed and completed.`,
      });

      // Immediately refresh the list and close the modal
      setSelectedContract(null);
      setAdminSignature("");
      await fetchPendingContracts(); // This will update the UI immediately
    } catch (error) {
      console.error('Error signing contract:', error);
      toast({
        title: "Error",
        description: "Failed to complete contract signing. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSigning(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading pending contracts...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Contract Signing</h1>
            <p className="text-gray-600">Review and sign contracts pending your approval</p>
          </div>
          <Button onClick={() => navigate("/")} variant="outline">
            Back to Dashboard
          </Button>
        </div>

        {pendingContracts.length === 0 ? (
          <Card>
            <CardContent className="pt-8 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">All Caught Up!</h3>
              <p className="text-gray-500">No contracts are currently pending your signature.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {pendingContracts.map((contract) => (
              <Card key={contract.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center space-x-2">
                        <FileText className="h-5 w-5" />
                        <span>{contract.contracts_v2.title}</span>
                      </CardTitle>
                      <p className="text-sm text-gray-500 mt-1">
                        Artist signed on {new Date(contract.artist_signed_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge className="bg-yellow-100 text-yellow-800">
                      Pending Your Signature
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => setSelectedContract(contract)}
                    >
                      <PenTool className="h-4 w-4 mr-2" />
                      Review & Sign
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Contract Review and Signing Modal */}
        {selectedContract && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{selectedContract.contracts_v2.title}</span>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setSelectedContract(null);
                      setAdminSignature("");
                    }}
                  >
                    ×
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Contract Content */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Contract Content</h3>
                  <div className="bg-gray-50 p-4 rounded-lg border max-h-60 overflow-y-auto">
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">
                      {selectedContract.contracts_v2.content}
                    </div>
                  </div>
                </div>

                {/* Signature Information */}
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <h4 className="font-medium text-green-800 mb-2">Artist Signature Status</h4>
                  <p className="text-green-700 text-sm">
                    ✓ Artist signed on {new Date(selectedContract.artist_signed_at).toLocaleDateString()}
                    {selectedContract.date_signed && (
                      <span className="ml-2">• Date: {selectedContract.date_signed}</span>
                    )}
                  </p>
                </div>

                {/* Admin Signature Section */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Your Signature</h3>
                  <div className="border-2 border-gray-300 rounded-lg p-4 bg-white">
                    <SignatureCanvas 
                      onSignatureChange={setAdminSignature}
                      disabled={false}
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedContract(null);
                      setAdminSignature("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => handleSignContract(selectedContract)}
                    disabled={!adminSignature || signing === selectedContract.id}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {signing === selectedContract.id ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Completing Contract...
                      </>
                    ) : (
                      <>
                        <PenTool className="h-4 w-4 mr-2" />
                        Complete Contract
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSigning;
