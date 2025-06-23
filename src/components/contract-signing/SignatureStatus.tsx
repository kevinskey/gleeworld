
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Clock } from "lucide-react";

interface SignatureRecord {
  id: string;
  status: string;
  artist_signature_data?: string;
  admin_signature_data?: string;
  artist_signed_at?: string;
  admin_signed_at?: string;
  date_signed?: string;
}

interface SignatureStatusProps {
  signatureRecord: SignatureRecord | null;
}

export const SignatureStatus = ({ signatureRecord }: SignatureStatusProps) => {
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
