
import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Contract {
  id: string;
  title: string;
  content: string;
  status: string;
  created_at: string;
}

const ContractSigning = () => {
  const { contractId } = useParams<{ contractId: string }>();
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchContract = async () => {
      if (!contractId) return;

      try {
        const { data, error } = await supabase
          .from('contracts')
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
  }, [contractId, toast]);

  const handleSign = async () => {
    if (!contract) return;

    setSigning(true);
    try {
      const { error } = await supabase
        .from('contracts')
        .update({ status: 'completed' })
        .eq('id', contract.id);

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: "Contract signed successfully!",
      });

      setContract({ ...contract, status: 'completed' });
    } catch (error) {
      console.error('Error signing contract:', error);
      toast({
        title: "Error",
        description: "Failed to sign contract",
        variant: "destructive",
      });
    } finally {
      setSigning(false);
    }
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
            <p className="text-gray-600">The contract you're looking for doesn't exist or has been removed.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-6 w-6" />
              <span>{contract.title}</span>
            </CardTitle>
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <span>Status: {contract.status}</span>
              <span>Created: {new Date(contract.created_at).toLocaleDateString()}</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="prose max-w-none">
              <div 
                className="whitespace-pre-wrap border rounded-lg p-4 bg-white"
                dangerouslySetInnerHTML={{ __html: contract.content.replace(/\n/g, '<br>') }}
              />
            </div>

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
                      Signing...
                    </>
                  ) : (
                    'Sign Contract'
                  )}
                </Button>
              </div>
            )}

            {contract.status === 'completed' && (
              <div className="text-center py-6">
                <div className="inline-flex items-center px-4 py-2 bg-green-100 text-green-800 rounded-full">
                  ✓ Contract Signed Successfully
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ContractSigning;
