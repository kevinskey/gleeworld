
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FileText, Eye, Send, Trash2, PenTool, RotateCcw, Edit, User } from "lucide-react";
import { getStatusColor, getStatusText } from "./contractUtils";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useContractRecipientProfile } from "@/hooks/useContractRecipientProfile";
import { isAdmin } from "@/constants/permissions";
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
  onEditTitle?: (contract: Contract) => void;
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
  onResend,
  onEditTitle
}: ContractItemProps) => {
  const { user } = useAuth();
  const { userProfile } = useUserProfile(user);
  const { profile: recipientProfile } = useContractRecipientProfile(contract.id);
  const hasBeenSent = sendCount > 0;
  const userIsAdmin = user && userProfile && isAdmin(userProfile.role);

  const handleSendClick = () => {
    if (hasBeenSent && onResend) {
      onResend(contract);
    } else {
      onSend(contract);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border border-brand-200/30 rounded-lg hover:shadow-md transition-all duration-200 gap-3 bg-white/95 backdrop-blur-sm shadow-sm">
      <div className="flex items-start sm:items-center space-x-3 min-w-0 flex-1">
        <Checkbox 
          checked={isSelected}
          onCheckedChange={(checked) => onSelect(contract.id, checked as boolean)}
          className="border-brand-300 data-[state=checked]:bg-brand-400 data-[state=checked]:border-brand-400 mt-1 sm:mt-0"
        />
        <Avatar className="h-10 w-10 border-2 border-brand-200/50 shadow-sm flex-shrink-0">
          <AvatarImage 
            src={recipientProfile?.avatar_url || "/placeholder.svg"} 
            alt={recipientProfile?.full_name || "User"} 
            className="object-cover"
          />
          <AvatarFallback className="bg-gradient-to-br from-brand-100 to-brand-200 text-brand-700">
            {recipientProfile?.full_name ? 
              recipientProfile.full_name.split(' ').map(n => n[0]).join('').toUpperCase() :
              <User className="h-4 w-4" />
            }
          </AvatarFallback>
        </Avatar>
        <FileText className="h-6 w-6 text-brand-500 flex-shrink-0 mt-1 sm:mt-0" />
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-brand-800 truncate">{contract.title}</h3>
          <p className="text-sm text-brand-600">Status: {getStatusText(contract.status)}</p>
          <div className="flex items-center gap-2 text-xs text-brand-500">
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
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 flex-shrink-0">
        <Badge className={`${getStatusColor(contract.status)} border-brand-200/50 text-xs`}>
          {getStatusText(contract.status)}
        </Badge>
        
        <div className="flex space-x-1">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onView(contract)}
            title="View Contract"
            className="border-brand-300 text-brand-700 hover:bg-brand-50 h-8 w-8 p-0"
          >
            <Eye className="h-3 w-3" />
          </Button>
          
          {userIsAdmin && onEditTitle && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onEditTitle(contract)}
              title="Edit Contract Title"
              className="border-blue-300 text-blue-700 hover:bg-blue-50 h-8 w-8 p-0"
            >
              <Edit className="h-3 w-3" />
            </Button>
          )}
          
          {contract.status === 'pending_admin_signature' && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onAdminSign(contract)}
              title="Admin Sign Contract"
              className="border-green-300 text-green-700 hover:bg-green-50 h-8 w-8 p-0"
            >
              <PenTool className="h-3 w-3" />
            </Button>
          )}
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleSendClick}
            title={hasBeenSent ? "Resend Contract" : "Send Contract"}
            className={hasBeenSent ? "border-orange-300 text-orange-700 hover:bg-orange-50 h-8 w-8 p-0" : "border-brand-300 text-brand-700 hover:bg-brand-50 h-8 w-8 p-0"}
          >
            {hasBeenSent ? (
              <RotateCcw className="h-3 w-3" />
            ) : (
              <Send className="h-3 w-3" />
            )}
          </Button>
          
          {userIsAdmin && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onDelete(contract.id)}
              className="border-red-300 text-red-700 hover:bg-red-50 h-8 w-8 p-0"
              title="Delete Contract"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
