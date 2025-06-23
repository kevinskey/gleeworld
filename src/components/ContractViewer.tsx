
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ContractViewerContent } from "./ContractViewerContent";

interface Contract {
  id: string;
  title: string;
  content: string;
  status: string;
  created_at: string;
  updated_at?: string;
}

interface ContractViewerProps {
  contract: Contract | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "completed": return "bg-green-100 text-green-800";
    case "pending_admin_signature": return "bg-yellow-100 text-yellow-800";
    case "pending_recipient": return "bg-orange-100 text-orange-800";
    case "pending_sender": return "bg-red-100 text-red-800";
    case "draft": return "bg-gray-100 text-gray-800";
    default: return "bg-gray-100 text-gray-800";
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case "completed": return "Completed";
    case "pending_admin_signature": return "Pending Admin Signature";
    case "pending_recipient": return "Pending Recipient";
    case "pending_sender": return "Pending Your Signature";
    case "draft": return "Draft";
    default: return "Unknown";
  }
};

export const ContractViewer = ({ contract, open, onOpenChange }: ContractViewerProps) => {
  if (!contract) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl">{contract.title}</DialogTitle>
            <Badge className={getStatusColor(contract.status)}>
              {getStatusText(contract.status)}
            </Badge>
          </div>
          <DialogDescription>
            Created: {new Date(contract.created_at).toLocaleDateString()}
            {contract.updated_at && contract.updated_at !== contract.created_at && (
              <span className="ml-4">
                • Updated: {new Date(contract.updated_at).toLocaleDateString()}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        
        <ContractViewerContent contract={contract} />
      </DialogContent>
    </Dialog>
  );
};
