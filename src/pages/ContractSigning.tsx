import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, CheckCircle2, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SignatureFieldOverlay } from "@/components/SignatureFieldOverlay";
import { useIsMobile } from "@/hooks/use-mobile";
import { logActivity, ACTIVITY_TYPES, RESOURCE_TYPES } from "@/utils/activityLogger";

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
      x: 50,
      y: 400,
      required: true
    },
    {
      id: 2,
      label: "Date Signed",
      type: 'date',
      page: 1,
      x: 350,
      y: 400,
      required: true
    }
  ]);
  const [completedFields, setCompletedFields] = useState<Record<number, string>>({});
  const [redirectCountdown, setRedirectCountdown] = useState(5);
  const { toast } = useToast();
  const isMobile = useIsMobile();

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
        
        // Log contract view activity
        await logActivity({
          actionType: ACTIVITY_TYPES.CONTRACT_VIEWED,
          resourceType: RESOURCE_TYPES.CONTRACT,
          resourceId: contractId,
          details: {
            contractTitle: data.title,
            contractStatus: data.status
          }
        });
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

  // Countdown effect for redirect
  useEffect(() => {
    if (contract?.status === 'completed' && redirectCountdown > 0) {
      const timer = setTimeout(() => {
        setRedirectCountdown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (contract?.status === 'completed' && redirectCountdown === 0) {
      window.location.href = 'https://reader.gleeworld.org';
    }
  }, [contract?.status, redirectCountdown]);

  const handleFieldComplete = (fieldId: number, value: string) => {
    console.log('Field completed:', fieldId, 'with value type:', typeof value, 'length:', value?.length);
    setCompletedFields(prev => ({
      ...prev,
      [fieldId]: value
    }));
    
    // Auto-complete contract when all required fields are filled
    const updatedFields = { ...completedFields, [fieldId]: value };
    const requiredFields = signatureFields.filter(f => f.required);
    const allFieldsCompleted = requiredFields.every(f => updatedFields[f.id]);
    
    if (allFieldsCompleted && !signing) {
      handleSign(updatedFields);
    }
  };

  const handleSign = async (fieldsToUse = completedFields) => {
    const requiredFields = signatureFields.filter(f => f.required);
    
    // Automatically set the current date for date fields before validation
    const currentDate = new Date().toLocaleDateString();
    const updatedCompletedFields = { ...fieldsToUse };
    
    // Auto-fill date fields with current date if not already filled
    signatureFields.forEach(field => {
      if (field.type === 'date' && field.required && !updatedCompletedFields[field.id]) {
        updatedCompletedFields[field.id] = currentDate;
        console.log('Auto-filled date field', field.id, 'with current date:', currentDate);
      }
    });
    
    // Update state with auto-filled dates
    setCompletedFields(updatedCompletedFields);
    
    const missingFields = requiredFields.filter(f => !updatedCompletedFields[f.id]);

    console.log('Attempting to sign contract');
    console.log('Required fields:', requiredFields.map(f => f.id));
    console.log('Completed fields:', Object.keys(updatedCompletedFields));
    console.log('Missing fields:', missingFields.map(f => f.id));

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
      const signatureData = updatedCompletedFields[1]; // Assuming field ID 1 is the signature
      
      console.log('Signature data present:', !!signatureData);
      console.log('Signature data length:', signatureData?.length || 0);
      console.log('Date signed:', updatedCompletedFields[2]); // Assuming field ID 2 is the date
      
      const { data, error } = await supabase.functions.invoke('complete-contract-signing', {
        body: {
          contractId: contract.id,
          signatureData: signatureData,
          dateSigned: updatedCompletedFields[2] || currentDate,
        }
      });

      if (error) {
        console.error('Error from edge function:', error);
        throw error;
      }

      console.log('Contract signing completed:', data);

      // Log contract signing activity
      await logActivity({
        actionType: ACTIVITY_TYPES.CONTRACT_SIGNED,
        resourceType: RESOURCE_TYPES.CONTRACT,
        resourceId: contract.id,
        details: {
          contractTitle: contract.title,
          dateSigned: updatedCompletedFields[2] || currentDate,
          signatureFieldsCompleted: Object.keys(updatedCompletedFields).length
        }
      });

      toast({
        title: "Success!",
        description: "Your contract has been signed and saved successfully.",
      });

      setContract({ ...contract, status: 'completed' });
      
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

  const renderContractWithSignatureFields = () => {
    const content = contract?.content || '';
    
    // Find the position of "AGREED AND ACCEPTED BY: ARTIST"
    const artistSignatureIndex = content.indexOf('AGREED AND ACCEPTED BY: ARTIST');
    
    if (artistSignatureIndex === -1) {
      // If the text is not found, render normally
      return (
        <div 
          className={`whitespace-pre-wrap border rounded-lg p-4 md:p-8 bg-white relative overflow-x-auto ${
            isMobile ? 'min-h-[400px] text-sm' : 'min-h-[600px]'
          }`}
          dangerouslySetInnerHTML={{ __html: content.replace(/\n/g, '<br>') }}
        />
      );
    }

    // Split content at the artist signature line
    const beforeArtist = content.substring(0, artistSignatureIndex);
    const artistLine = 'AGREED AND ACCEPTED BY: ARTIST';
    const afterArtist = content.substring(artistSignatureIndex + artistLine.length);

    return (
      <div 
        className={`whitespace-pre-wrap border rounded-lg p-4 md:p-8 bg-white relative overflow-x-auto ${
          isMobile ? 'min-h-[400px] text-sm' : 'min-h-[600px]'
        }`}
      >
        <div dangerouslySetInnerHTML={{ __html: beforeArtist.replace(/\n/g, '<br>') }} />
        <div>{artistLine}</div>
        <div style={{ height: '120px', position: 'relative', margin: '20px 0' }}>
          {/* Render signature field overlays in this dedicated space */}
          {contract.status !== 'completed' && signatureFields.map((field) => (
            <SignatureFieldOverlay
              key={field.id}
              field={{
                ...field,
                // Position fields within this signature area
                x: field.type === 'signature' ? (isMobile ? 20 : 50) : (isMobile ? 200 : 350),
                y: 20, // Fixed position within the signature area
              }}
              onFieldComplete={handleFieldComplete}
              isCompleted={!!completedFields[field.id]}
              value={completedFields[field.id]}
            />
          ))}
        </div>
        <div dangerouslySetInnerHTML={{ __html: afterArtist.replace(/\n/g, '<br>') }} />
      </div>
    );
  };

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
        {/* Mobile-optimized progress indicator */}
        {contract?.status !== 'completed' && isMobile && (
          <div className="bg-white rounded-lg p-4 shadow-sm border">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Progress:</span>
              <span className="text-blue-600">{getCompletionProgress()} fields completed</span>
            </div>
          </div>
        )}

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <div className="flex items-center space-x-2">
                <FileText className="h-6 w-6" />
                <span className="text-lg md:text-xl truncate">{contract?.title}</span>
              </div>
              {contract?.status !== 'completed' && !isMobile && (
                <div className="text-sm text-gray-500">
                  Progress: {getCompletionProgress()} fields completed
                </div>
              )}
            </CardTitle>
            <div className="flex flex-col md:flex-row md:items-center md:space-x-4 text-sm text-gray-500 gap-1 md:gap-0">
              <span>Status: <span className="capitalize">{contract?.status}</span></span>
              <span>Created: {contract ? new Date(contract.created_at).toLocaleDateString() : ''}</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative">
              {renderContractWithSignatureFields()}
            </div>
          </CardContent>
        </Card>

        {/* Show signing in progress indicator */}
        {signing && (
          <div className="text-center py-4">
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Processing your signature...</span>
            </div>
          </div>
        )}

        {contract?.status === 'completed' && (
          <div className="text-center py-8">
            <Card className="max-w-md mx-auto bg-green-50 border-green-200">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center space-y-4">
                  <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full">
                    <CheckCircle2 className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-xl font-semibold text-green-800 mb-2">
                      Contract Signed Successfully!
                    </h3>
                    <p className="text-green-700 mb-4">
                      Your signed contract has been generated and stored securely.
                    </p>
                    <div className="space-y-2">
                      <p className="text-sm text-green-600">
                        Redirecting to reader.gleeworld.org in {redirectCountdown} seconds...
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => window.location.href = 'https://reader.gleeworld.org'}
                        className="border-green-300 text-green-700 hover:bg-green-100"
                      >
                        Go Now
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContractSigning;
