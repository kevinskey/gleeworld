
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Clock, AlertCircle } from "lucide-react";

interface SignatureRecord {
  id: string;
  status: string;
  artist_signature_data?: string;
  admin_signature_data?: string;
  artist_signed_at?: string;
  admin_signed_at?: string;
  date_signed?: string;
  signed_by_artist_at?: string;
  signed_by_admin_at?: string;
}

interface SignatureStatusProps {
  signatureRecord: SignatureRecord | null;
}

export const SignatureStatus = ({ signatureRecord }: SignatureStatusProps) => {
  console.log('SignatureStatus - signatureRecord:', signatureRecord);
  
  if (!signatureRecord) {
    console.log('SignatureStatus - No signature record found');
    return (
      <Card className="mb-6 bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-3">
            <AlertCircle className="h-6 w-6 text-blue-600" />
            <div>
              <h3 className="font-semibold text-blue-800">Ready to Sign</h3>
              <p className="text-blue-700">
                Please complete all signature fields below to sign this contract.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (signatureRecord?.status === 'pending_admin_signature') {
    console.log('SignatureStatus - Showing pending admin signature status');
    return (
      <Card className="mb-6 bg-yellow-50 border-yellow-200">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-3">
            <Clock className="h-6 w-6 text-yellow-600" />
            <div>
              <h3 className="font-semibold text-yellow-800">Artist Signature Complete</h3>
              <p className="text-yellow-700">
                {signatureRecord.artist_signed_at || signatureRecord.signed_by_artist_at
                  ? `Your signature has been recorded on ${new Date(signatureRecord.artist_signed_at || signatureRecord.signed_by_artist_at).toLocaleDateString()}.`
                  : 'Your signature has been recorded.'
                } The contract is now pending admin approval.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (signatureRecord?.status === 'completed') {
    console.log('SignatureStatus - Showing completed status');
    return (
      <Card className="mb-6 bg-green-50 border-green-200">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-3">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
            <div>
              <h3 className="font-semibold text-green-800">Contract Fully Signed</h3>
              <p className="text-green-700">
                This contract was completed on {signatureRecord.admin_signed_at || signatureRecord.signed_by_admin_at
                  ? new Date(signatureRecord.admin_signed_at || signatureRecord.signed_by_admin_at).toLocaleDateString()
                  : 'recently'
                }. A copy has been sent to your email.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  console.log('SignatureStatus - Status not recognized:', signatureRecord?.status);
  return (
    <Card className="mb-6 bg-gray-50 border-gray-200">
      <CardContent className="pt-6">
        <div className="flex items-center space-x-3">
          <AlertCircle className="h-6 w-6 text-gray-600" />
          <div>
            <h3 className="font-semibold text-gray-800">Signature Status Unknown</h3>
            <p className="text-gray-700">
              Status: {signatureRecord?.status || 'No status'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
