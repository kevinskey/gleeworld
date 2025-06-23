import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, CheckCircle2, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SignatureCanvas } from "@/components/SignatureCanvas";
import { Input } from "@/components/ui/input";
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

interface SignatureRecord {
  id: string;
  status: string;
  artist_signature_data?: string;
  admin_signature_data?: string;
  artist_signed_at?: string;
  admin_signed_at?: string;
  date_signed?: string;
}

const ContractSigning = () => {
  const { contractId } = useParams<{ contractId: string }>();
  const [contract, setContract] = useState<Contract | null>(null);
  const [signatureRecord, setSignatureRecord] = useState<SignatureRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [signatureFields, setSignatureFields] = useState<SignatureField[]>([]);
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
        
        // Check for existing signature record
        const { data: sigData } = await supabase
          .from('contract_signatures_v2')
          .select('*')
          .eq('contract_id', contractId)
          .single();

        if (sigData) {
          console.log("Found existing signature record:", sigData);
          setSignatureRecord(sigData);
        }
        
        const extractedFields = extractSignatureFieldsFromContract(data.content);
        console.log("Extracted signature fields:", extractedFields);
        setSignatureFields(extractedFields);
        
        await logActivity({
          actionType: ACTIVITY_TYPES.CONTRACT_VIEWED,
          resourceType: RESOURCE_TYPES.CONTRACT,
          resourceId: contractId,
          details: {
            contractTitle: data.title,
            contractStatus: data.status,
            signatureFieldsCount: extractedFields.length
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

  const extractSignatureFieldsFromContract = (content: string): SignatureField[] => {
    try {
      const signatureFieldsMatch = content.match(/Signature Fields: (\[.*?\])/);
      if (signatureFieldsMatch) {
        const fieldsData = JSON.parse(signatureFieldsMatch[1]);
        console.log("Found signature fields in content:", fieldsData);
        return fieldsData;
      }
    } catch (error) {
      console.error("Error parsing signature fields from content:", error);
    }

    console.log("Using default signature fields");
    return [
      {
        id: 1,
        label: "Artist Signature",
        type: 'signature',
        page: 1,
        x: 50,
        y: 50,
        required: true
      },
      {
        id: 2,
        label: "Date Signed",
        type: 'date',
        page: 1,
        x: 350,
        y: 50,
        required: true
      }
    ];
  };

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
    
    const updatedFields = { ...completedFields, [fieldId]: value };
    const requiredFields = signatureFields.filter(f => f.required);
    const allFieldsCompleted = requiredFields.every(f => updatedFields[f.id]);
    
    if (allFieldsCompleted && !signing) {
      handleArtistSign(updatedFields);
    }
  };

  const handleArtistSign = async (fieldsToUse = completedFields) => {
    const requiredFields = signatureFields.filter(f => f.required);
    
    const currentDate = new Date().toLocaleDateString();
    const updatedCompletedFields = { ...fieldsToUse };
    
    signatureFields.forEach(field => {
      if (field.type === 'date' && field.required && !updatedCompletedFields[field.id]) {
        updatedCompletedFields[field.id] = currentDate;
        console.log('Auto-filled date field', field.id, 'with current date:', currentDate);
      }
    });
    
    setCompletedFields(updatedCompletedFields);
    
    const missingFields = requiredFields.filter(f => !updatedCompletedFields[f.id]);

    console.log('Attempting to sign contract (Artist phase)');
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
      console.log("Calling artist-sign-contract function...");
      
      const signatureField = signatureFields.find(f => f.type === 'signature');
      const dateField = signatureFields.find(f => f.type === 'date');
      
      const signatureData = signatureField ? updatedCompletedFields[signatureField.id] : '';
      const dateSigned = dateField ? updatedCompletedFields[dateField.id] : currentDate;
      
      console.log('Artist signature data present:', !!signatureData);
      console.log('Artist signature data length:', signatureData?.length || 0);
      console.log('Date signed:', dateSigned);
      
      const { data, error } = await supabase.functions.invoke('artist-sign-contract', {
        body: {
          contractId: contract.id,
          artistSignatureData: signatureData,
          dateSigned: dateSigned,
        }
      });

      if (error) {
        console.error('Error from edge function:', error);
        throw error;
      }

      console.log('Artist contract signing completed:', data);

      await logActivity({
        actionType: ACTIVITY_TYPES.CONTRACT_SIGNED,
        resourceType: RESOURCE_TYPES.CONTRACT,
        resourceId: contract.id,
        details: {
          contractTitle: contract.title,
          dateSigned: dateSigned,
          signaturePhase: 'artist',
          signatureFieldsCompleted: Object.keys(updatedCompletedFields).length
        }
      });

      toast({
        title: "Artist Signature Complete!",
        description: "Your signature has been recorded. The contract is now pending admin approval.",
      });

      // Update signature record to show pending admin status
      setSignatureRecord({
        id: data.signatureId,
        status: 'pending_admin_signature',
        artist_signature_data: signatureData,
        artist_signed_at: new Date().toISOString(),
        date_signed: dateSigned
      });
      
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
    if (signatureRecord?.status === 'pending_admin_signature') {
      return "Artist signed - Pending admin approval";
    }
    if (signatureRecord?.status === 'completed') {
      return "Fully completed";
    }
    const requiredFields = signatureFields.filter(f => f.required);
    const completed = requiredFields.filter(f => completedFields[f.id]);
    return `${completed.length}/${requiredFields.length} fields completed`;
  };

  const renderSignatureStatus = () => {
    if (signatureRecord?.status === 'pending_admin_signature') {
      return (
        <Card className="mb-6 bg-yellow-50 border-yellow-200">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <Clock className="h-6 w-6 text-yellow-600" />
              <div>
                <h3 className="font-semibold text-yellow-800">Artist Signature Complete</h3>
                <p className="text-yellow-700">
                  Your signature has been recorded on {new Date(signatureRecord.artist_signed_at!).toLocaleDateString()}. 
                  The contract is now pending admin approval.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }
    
    if (signatureRecord?.status === 'completed') {
      return (
        <Card className="mb-6 bg-green-50 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
              <div>
                <h3 className="font-semibold text-green-800">Contract Fully Signed</h3>
                <p className="text-green-700">
                  This contract was completed on {new Date(signatureRecord.admin_signed_at!).toLocaleDateString()}. 
                  A copy has been sent to your email.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    return null;
  };

  const renderEmbeddedSignatureField = (field: SignatureField) => {
    // Don't show signature fields if already signed
    if (signatureRecord?.status === 'pending_admin_signature' || signatureRecord?.status === 'completed') {
      return null;
    }

    const isCompleted = !!completedFields[field.id];
    
    if (field.type === 'signature') {
      return (
        <div className="my-6 p-4 border-2 border-gray-300 rounded-lg bg-gray-50">
          <div className="mb-2 font-medium text-gray-700">{field.label}</div>
          {isCompleted ? (
            <div className="p-4 bg-green-50 border border-green-200 rounded text-green-700">
              ✓ Signature completed
            </div>
          ) : (
            <div className="space-y-3">
              <SignatureCanvas 
                onSignatureChange={(signature) => {
                  if (signature) {
                    console.log('Signature captured for field', field.id);
                  }
                }}
                disabled={false}
              />
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    const canvas = document.querySelector('canvas');
                    if (canvas) {
                      const signatureData = canvas.toDataURL();
                      if (signatureData && signatureData !== 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==') {
                        handleFieldComplete(field.id, signatureData);
                      }
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  Complete Signature
                </button>
              </div>
            </div>
          )}
        </div>
      );
    }
    
    if (field.type === 'date') {
      return (
        <div className="my-4 p-3 border border-gray-300 rounded bg-gray-50">
          <div className="mb-2 font-medium text-gray-700">{field.label}</div>
          {isCompleted ? (
            <div className="text-gray-900 font-medium">{completedFields[field.id]}</div>
          ) : (
            <div className="flex gap-2">
              <input
                type="date"
                onChange={(e) => handleFieldComplete(field.id, e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded"
              />
              <button 
                onClick={() => handleFieldComplete(field.id, new Date().toLocaleDateString())}
                className="px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors text-sm"
              >
                Today
              </button>
            </div>
          )}
        </div>
      );
    }
    
    return null;
  };

  const renderContractWithEmbeddedFields = () => {
    const content = contract?.content || '';
    let cleanContent = content.replace(/Signature Fields: \[.*?\]/g, '').trim();
    
    const lines = cleanContent.split('\n');
    const processedLines: (string | JSX.Element)[] = [];
    
    lines.forEach((line, index) => {
      processedLines.push(line);
      
      if (line.toLowerCase().includes('artist:')) {
        const artistSignatureField = signatureFields.find(f => 
          f.type === 'signature' && 
          (f.label.toLowerCase().includes('artist') || f.id === 1)
        );
        
        if (artistSignatureField) {
          processedLines.push(
            <div key={`signature-${artistSignatureField.id}`}>
              {renderEmbeddedSignatureField(artistSignatureField)}
            </div>
          );
        }
      }
      
      if ((index === lines.length - 1 || line.toLowerCase().includes('date executed')) && 
          signatureFields.some(f => f.type === 'date')) {
        
        const dateField = signatureFields.find(f => f.type === 'date');
        if (dateField) {
          processedLines.push(
            <div key={`date-${dateField.id}`}>
              {renderEmbeddedSignatureField(dateField)}
            </div>
          );
        }
      }
    });
    
    return (
      <div className="space-y-2">
        <div 
          className={`whitespace-pre-wrap border rounded-lg p-4 md:p-8 bg-white ${
            isMobile ? 'min-h-[400px] text-sm' : 'min-h-[600px]'
          }`}
        >
          {processedLines.map((item, index) => (
            <div key={index}>
              {typeof item === 'string' ? (
                <div dangerouslySetInnerHTML={{ __html: item.replace(/\n/g, '<br>') }} />
              ) : (
                item
              )}
            </div>
          ))}
        </div>
        
        {!signatureRecord && signatureFields.length > 0 && (
          <div className="text-center text-sm text-gray-600 bg-gray-50 p-3 rounded">
            Progress: {getCompletionProgress()}
          </div>
        )}
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
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-6 w-6" />
              <span className="text-lg md:text-xl truncate">{contract?.title}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderSignatureStatus()}
            <div className="relative">
              {renderContractWithEmbeddedFields()}
            </div>
          </CardContent>
        </Card>

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
