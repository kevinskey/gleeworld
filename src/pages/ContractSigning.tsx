
import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SignatureFieldOverlay } from "@/components/SignatureFieldOverlay";

interface Contract {
  id: string;
  title: string;
  content: string;
  status: string;
  created_at: string;
}

interface SignatureField {
  id: number;
  label: string;
  type: 'signature' | 'date' | 'text' | 'initials' | 'username';
  page: number;
  x: number;
  y: number;
  required: boolean;
}

const ContractSigning = () => {
  const { contractId } = useParams<{ contractId: string }>();
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [signatureFields] = useState<SignatureField[]>([
    {
      id: 1,
      label: "Your Signature",
      type: 'signature',
      page: 1,
      x: 100,
      y: 300,
      required: true
    },
    {
      id: 2,
      label: "Date Signed",
      type: 'date',
      page: 1,
      x: 400,
      y: 300,
      required: true
    }
  ]);
  const [completedFields, setCompletedFields] = useState<Record<number, string>>({});
  const { toast } = useToast();

  useEffect(() => {
    const fetchContract = async () => {
      if (!contractId) {
        console.log("No contract ID provided in URL");
        setLoading(false);
        return;
      }

      console.log("Fetching contract with ID:", contractId);

      try {
        const { data, error } = await supabase
          .from('contracts_v2')
          .select('*')
          .eq('id', contractId)
          .single();

        if (error) {
          console.error('Error fetching contract:', error);
          toast({
            title: "Error",
            description: "Contract not found",
            variant: "destructive",
          });
          return;
        }

        console.log("Contract found:", data);
        setContract(data);
      } catch (error) {
        console.error('Error:', error);
        toast({
          title: "Error",
          description: "Failed to load contract",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchContract();
  }, [contractId]);

  const handleFieldComplete = (fieldId: number, value: string) => {
    setCompletedFields(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const handleSign = async () => {
    const requiredFields = signatureFields.filter(f => f.required);
    const missingFields = requiredFields.filter(f => !completedFields[f.id]);

    if (missingFields.length > 0) {
      toast({
        title: "Missing Required Fields",
        description: `Please complete: ${missingFields.map(f => f.label).join(', ')}`,
        variant: "destructive",
      });
      return;
    }

    if (!contract) return;

    setSigning(true);
    try {
      console.log("Calling complete-contract-signing function...");
      
      // Get the signature data from completed fields
      const signatureData = completedFields[1]; // Assuming field ID 1 is the signature
      
      const { data, error } = await supabase.functions.invoke('complete-contract-signing', {
        body: {
          contractId: contract.id,
          signatureData: signatureData,
          // You can add recipient email/name here if needed
          // recipientEmail: "user@example.com",
          // recipientName: "User Name"
        }
      });

      if (error) {
        console.error('Error from edge function:', error);
        throw error;
      }

      console.log('Contract signing completed:', data);

      toast({
        title: "Success",
        description: "Contract signed successfully! PDF generated and stored.",
      });

      setContract({ ...contract, status: 'completed' });
      
      // Redirect to reader.gleeworld.org after successful signing
      setTimeout(() => {
        window.location.href = 'https://reader.gleeworld.org';
      }, 3000); // 3 second delay to show the success message

    } catch (error) {
      console.error('Error signing contract:', error);
      toast({
        title: "Error",
        description: "Failed to sign contract. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSigning(false);
    }
  };

  const getCompletionProgress = () => {
    const requiredFields = signatureFields.filter(f => f.required);
    const completed = requiredFields.filter(f => completedFields[f.id]);
    return `${completed.length}/${requiredFields.length}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading contract...</span>
        </div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileText className="h-6 w-6" />
                <span>{contract.title}</span>
              </div>
              {contract.status !== 'completed' && (
                <div className="text-sm text-gray-500">
                  Progress: {getCompletionProgress()} fields completed
                </div>
              )}
            </CardTitle>
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <span>Status: {contract.status}</span>
              <span>Created: {new Date(contract.created_at).toLocaleDateString()}</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <div 
                className="whitespace-pre-wrap border rounded-lg p-8 bg-white min-h-[600px] relative"
                dangerouslySetInnerHTML={{ __html: contract.content.replace(/\n/g, '<br>') }}
              />
              
              {/* Render signature field overlays */}
              {contract.status !== 'completed' && signatureFields.map((field) => (
                <SignatureFieldOverlay
                  key={field.id}
                  field={field}
                  onFieldComplete={handleFieldComplete}
                  isCompleted={!!completedFields[field.id]}
                  value={completedFields[field.id]}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {contract.status !== 'completed' && (
          <div className="flex justify-center pt-6">
            <Button 
              onClick={handleSign}
              disabled={signing}
              size="lg"
              className="px-8"
            >
              {signing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing Signature...
                </>
              ) : (
                'Complete Contract Signing'
              )}
            </Button>
          </div>
        )}

        {contract.status === 'completed' && (
          <div className="text-center py-6">
            <div className="inline-flex items-center px-4 py-2 bg-green-100 text-green-800 rounded-full">
              ✓ Contract Signed Successfully - PDF Generated & Stored - Redirecting to reader.gleeworld.org...
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContractSigning;
