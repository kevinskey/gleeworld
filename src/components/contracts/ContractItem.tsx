
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, Eye, Send, Trash2, PenTool, RotateCcw } from "lucide-react";
import { getStatusColor, getStatusText } from "./contractUtils";
import type { Contract } from "@/hooks/useContracts";

interface ContractItemProps {
  contract: Contract;
  isSelected: boolean;
  sendCount: number;
  onSelect: (contractId: string, checked: boolean) => void;
  onView: (contract: Contract) => void;
  onDelete: (contractId: string) => void;
  onAdminSign: (contract: Contract) => void;
  onSend: (contract: Contract) => void;
  onResend?: (contract: Contract) => void;
}

export const ContractItem = ({
  contract,
  isSelected,
  sendCount,
  onSelect,
  onView,
  onDelete,
  onAdminSign,
  onSend,
  onResend
}: ContractItemProps) => {
  const hasBeenSent = sendCount > 0;

  const handleSendClick = () => {
    if (hasBeenSent && onResend) {
      onResend(contract);
    } else {
      onSend(contract);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors gap-4 bg-white shadow-sm">
      <div className="flex items-start sm:items-center space-x-4 min-w-0 flex-1">
        <Checkbox 
          checked={isSelected}
          onCheckedChange={(checked) => onSelect(contract.id, checked as boolean)}
          className="border-gray-400"
        />
        <FileText className="h-8 w-8 text-gray-600 flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-black truncate text-lg">{contract.title}</h3>
          <p className="text-sm text-gray-700 font-medium">Status: {getStatusText(contract.status)}</p>
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <span>Created: {new Date(contract.created_at).toLocaleDateString()}</span>
            {contract.updated_at !== contract.created_at && (
              <span>• Updated: {new Date(contract.updated_at).toLocaleDateString()}</span>
            )}
            {hasBeenSent && (
              <span>• Sent {sendCount} time{sendCount > 1 ? 's' : ''}</span>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-shrink-0">
        <Badge className={`${getStatusColor(contract.status)} border-gray-300 font-medium`}>
          {getStatusText(contract.status)}
        </Badge>
        
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onView(contract)}
            title="View Contract"
            className="border-gray-300 text-black hover:bg-gray-100 font-medium"
          >
            <Eye className="h-4 w-4" />
          </Button>
          
          {contract.status === 'pending_admin_signature' && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onAdminSign(contract)}
              title="Admin Sign Contract"
              className="border-green-400 text-green-700 hover:bg-green-50 font-medium"
            >
              <PenTool className="h-4 w-4" />
            </Button>
          )}
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleSendClick}
            title={hasBeenSent ? "Resend Contract" : "Send Contract"}
            className={hasBeenSent ? "border-orange-400 text-orange-700 hover:bg-orange-50 font-medium" : "border-blue-400 text-blue-700 hover:bg-blue-50 font-medium"}
          >
            {hasBeenSent ? (
              <>
                <RotateCcw className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Resend</span>
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Send</span>
              </>
            )}
          </Button>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onDelete(contract.id)}
            className="border-red-400 text-red-700 hover:bg-red-50 font-medium"
            title="Delete Contract"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
