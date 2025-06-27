
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Calendar, Download, Eye } from "lucide-react";
import { useUserContracts } from "@/hooks/useUserContracts";
import { useState } from "react";
import { ContractViewer } from "@/components/ContractViewer";

export const UserContractsList = () => {
  const { contracts, loading, error } = useUserContracts();
  const [selectedContract, setSelectedContract] = useState<any>(null);
  const [contractViewerOpen, setContractViewerOpen] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending_artist_signature': return 'bg-yellow-100 text-yellow-800';
      case 'pending_admin_signature': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleViewContract = (contract: any) => {
    setSelectedContract(contract);
    setContractViewerOpen(true);
  };

  if (loading) {
    return (
      <Card className="glass-card border-spelman-400/20">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-spelman-400"></div>
            <span className="ml-2 text-white">Loading contracts...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="glass-card border-spelman-400/20">
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <p className="text-red-300 mb-4">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (contracts.length === 0) {
    return (
      <Card className="glass-card border-spelman-400/20">
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <FileText className="h-12 w-12 mx-auto text-spelman-400/50 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No Contracts Yet</h3>
            <p className="text-white/70">You don't have any contracts assigned to you yet.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {contracts.map((contract) => (
          <Card key={contract.id} className="glass-card border-spelman-400/20">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-white flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    {contract.title}
                  </CardTitle>
                  <CardDescription className="text-white/70">
                    Created on {new Date(contract.created_at).toLocaleDateString()}
                  </CardDescription>
                </div>
                <Badge className={getStatusColor(contract.signature_status)}>
                  {contract.signature_status.replace('_', ' ')}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-sm text-white/70 space-y-1">
                  {contract.artist_signed_at && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>Artist signed: {new Date(contract.artist_signed_at).toLocaleDateString()}</span>
                    </div>
                  )}
                  {contract.admin_signed_at && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>Admin signed: {new Date(contract.admin_signed_at).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewContract(contract)}
                    className="glass border-spelman-400/30 text-spelman-300 hover:bg-spelman-500/20"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View
                  </Button>
                  {contract.signature_status === 'completed' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="glass border-spelman-400/30 text-spelman-300 hover:bg-spelman-500/20"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <ContractViewer 
        contract={selectedContract}
        open={contractViewerOpen}
        onOpenChange={setContractViewerOpen}
      />
    </>
  );
};
