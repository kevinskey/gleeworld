
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
    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-white/20 rounded-lg hover:bg-white/10 transition-colors gap-4 glass-card bg-white/5">
      <div className="flex items-start sm:items-center space-x-4 min-w-0 flex-1">
        <Checkbox 
          checked={isSelected}
          onCheckedChange={(checked) => onSelect(contract.id, checked as boolean)}
          className="border-white/40 data-[state=checked]:bg-spelman-500 data-[state=checked]:border-spelman-400"
        />
        <FileText className="h-8 w-8 text-spelman-300 flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-white truncate text-lg drop-shadow-sm">{contract.title}</h3>
          <p className="text-sm text-white/80 font-medium">Status: {getStatusText(contract.status)}</p>
          <div className="flex items-center gap-2 text-xs text-white/70">
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
        <Badge className={`${getStatusColor(contract.status)} border-white/30 font-medium`}>
          {getStatusText(contract.status)}
        </Badge>
        
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onView(contract)}
            title="View Contract"
            className="glass border-white/30 text-white hover:bg-white/20 font-medium"
          >
            <Eye className="h-4 w-4" />
          </Button>
          
          {contract.status === 'pending_admin_signature' && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onAdminSign(contract)}
              title="Admin Sign Contract"
              className="glass border-green-400/40 text-green-200 hover:bg-green-500/30 font-medium"
            >
              <PenTool className="h-4 w-4" />
            </Button>
          )}
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleSendClick}
            title={hasBeenSent ? "Resend Contract" : "Send Contract"}
            className={hasBeenSent ? "glass border-orange-400/40 text-orange-200 hover:bg-orange-500/30 font-medium" : "glass border-blue-400/40 text-blue-200 hover:bg-blue-500/30 font-medium"}
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
            className="glass border-red-400/40 text-red-200 hover:bg-red-500/30 font-medium"
            title="Delete Contract"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
