
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FileText, Calendar, Download, Eye, User } from "lucide-react";
import { useUserContracts } from "@/hooks/useUserContracts";
import { useProfile } from "@/hooks/useProfile";
import { useState } from "react";
import { ContractViewer } from "@/components/ContractViewer";

export const UserContractsList = () => {
  const { contracts, loading, error } = useUserContracts();
  const { profile } = useProfile();
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
    console.log('UserContractsList: Viewing contract:', contract);
    setSelectedContract(contract);
    setContractViewerOpen(true);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
            <span className="ml-2 text-gray-900">Loading contracts...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (contracts.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <FileText className="h-12 w-12 mx-auto text-brand-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Contracts Yet</h3>
            <p className="text-gray-600">You don't have any contracts assigned to you yet.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {contracts.map((contract) => (
          <Card key={contract.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12 border-2 border-brand-200/50 shadow-sm flex-shrink-0">
                    <AvatarImage 
                      src={profile?.avatar_url || undefined} 
                      alt={profile?.full_name || "User"} 
                      className="object-cover"
                    />
                    <AvatarFallback className="bg-gradient-to-br from-brand-100 to-brand-200 text-brand-700">
                      {profile?.full_name ? 
                        profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase() :
                        <User className="h-5 w-5" />
                      }
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-gray-900 flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      {contract.title}
                    </CardTitle>
                    <CardDescription className="text-gray-600">
                      Created on {new Date(contract.created_at).toLocaleDateString()}
                    </CardDescription>
                  </div>
                </div>
                <Badge className={getStatusColor(contract.signature_status)}>
                  {contract.signature_status.replace('_', ' ')}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600 space-y-1">
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
                    className="border-brand-300 text-brand-700 hover:bg-brand-50"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View
                  </Button>
                  {contract.signature_status === 'completed' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-brand-300 text-brand-700 hover:bg-brand-50"
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
