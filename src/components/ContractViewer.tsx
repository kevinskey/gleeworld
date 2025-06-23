
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, User, FileText } from "lucide-react";
import type { Contract } from "@/hooks/useContracts";

interface ContractViewerProps {
  contract: Contract | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ContractViewer = ({ contract, open, onOpenChange }: ContractViewerProps) => {
  if (!contract) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-100 text-green-800";
      case "pending_recipient": return "bg-yellow-100 text-yellow-800";
      case "pending_sender": return "bg-blue-100 text-blue-800";
      case "draft": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "completed": return "Completed";
      case "pending_recipient": return "Pending Recipient";
      case "pending_sender": return "Pending Your Signature";
      case "draft": return "Draft";
      default: return "Unknown";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl">{contract.title}</DialogTitle>
              <DialogDescription className="mt-2 flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Created: {new Date(contract.created_at).toLocaleDateString()}
                </span>
                <span className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  {contract.created_by || 'System'}
                </span>
              </DialogDescription>
            </div>
            <Badge className={getStatusColor(contract.status)}>
              {getStatusText(contract.status)}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Contract Content
            </h3>
            <div className="bg-gray-50 p-4 rounded-lg border">
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {contract.content}
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-sm text-gray-500">
              Last updated: {new Date(contract.updated_at).toLocaleDateString()}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button>
                Edit Contract
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
