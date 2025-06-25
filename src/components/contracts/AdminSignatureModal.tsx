
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PenTool, Loader2 } from "lucide-react";
import { SignatureCanvas } from "@/components/SignatureCanvas";
import type { Contract } from "@/hooks/useContracts";

interface AdminSignatureModalProps {
  isOpen: boolean;
  contract: Contract | null;
  adminSignature: string;
  isSigningContract: boolean;
  onSignatureChange: (signature: string) => void;
  onClose: () => void;
  onComplete: () => void;
}

export const AdminSignatureModal = ({
  isOpen,
  contract,
  adminSignature,
  isSigningContract,
  onSignatureChange,
  onClose,
  onComplete
}: AdminSignatureModalProps) => {
  if (!isOpen || !contract) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Admin Sign: {contract.title}</span>
            <Button variant="ghost" onClick={onClose}>
              ×
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-3">Your Admin Signature</h3>
            <div className="border-2 border-gray-300 rounded-lg p-4 bg-white">
              <SignatureCanvas 
                onSignatureChange={onSignatureChange}
                disabled={false}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={onComplete}
              disabled={!adminSignature || isSigningContract}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSigningContract ? (
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
  );
};
