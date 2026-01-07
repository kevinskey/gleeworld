import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FileText, Eye, Send, Trash2, PenTool, RotateCcw, Edit, User, Calendar, CalendarCheck } from "lucide-react";
import { getStatusColor, getStatusText } from "./contractUtils";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useContractRecipientProfile } from "@/hooks/useContractRecipientProfile";
import { isAdmin } from "@/constants/permissions";
import { formatContractDisplayName } from "@/lib/contract-utils";
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
  onSyncToCalendar?: (contract: Contract) => void;
  isSyncing?: boolean;
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
  onEditTitle,
  onSyncToCalendar,
  isSyncing
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
    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border border-border rounded-lg hover:shadow-md transition-all duration-200 gap-3 bg-card/80 backdrop-blur-sm shadow-sm">
      <div className="flex items-start sm:items-center space-x-3 min-w-0 flex-1">
        <Checkbox 
          checked={isSelected}
          onCheckedChange={(checked) => onSelect(contract.id, checked as boolean)}
          className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary mt-1 sm:mt-0"
        />
        <Avatar className="h-10 w-10 border-2 border-border shadow-sm flex-shrink-0">
          <AvatarImage 
            src={recipientProfile?.avatar_url || "/placeholder.svg"} 
            alt={recipientProfile?.full_name || "User"} 
            className="object-cover"
          />
          <AvatarFallback className="bg-muted text-muted-foreground">
            {recipientProfile?.full_name ? 
              recipientProfile.full_name.split(' ').map(n => n[0]).join('').toUpperCase() :
              <User className="h-4 w-4" />
            }
          </AvatarFallback>
        </Avatar>
        <FileText className="h-6 w-6 text-primary flex-shrink-0 mt-1 sm:mt-0" />
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-foreground text-sm truncate">{formatContractDisplayName(contract.title)}</h3>
          <p className="text-xs text-muted-foreground">Status: {getStatusText(contract.status)}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
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
        <Badge className={`${getStatusColor(contract.status)} border-border text-xs`}>
          {getStatusText(contract.status)}
        </Badge>
        
        <div className="flex space-x-1">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onView(contract)}
            title="View Contract"
            className="h-8 w-8 p-0"
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
            className={hasBeenSent ? "border-orange-500 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950 h-8 w-8 p-0" : "h-8 w-8 p-0"}
          >
            {hasBeenSent ? (
              <RotateCcw className="h-3 w-3" />
            ) : (
              <Send className="h-3 w-3" />
            )}
          </Button>
          
          {/* Sync to Calendar button for completed contracts */}
          {userIsAdmin && ['draft', 'pending', 'sent', 'pending_recipient', 'completed'].includes(contract.status) && onSyncToCalendar && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onSyncToCalendar(contract)}
              disabled={isSyncing}
              title={(contract as any).calendar_event_id ? "Synced to Calendar" : "Sync to Calendar"}
              className={`h-8 w-8 p-0 ${(contract as any).calendar_event_id 
                ? "border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-950" 
                : "border-purple-300 text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950"}`}
            >
              {(contract as any).calendar_event_id ? (
                <CalendarCheck className="h-3 w-3" />
              ) : (
                <Calendar className="h-3 w-3" />
              )}
            </Button>
          )}
          
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
