import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FileText, Eye, Send, Trash2, PenTool, RotateCcw, Edit, User, Calendar, CalendarCheck, Download } from "lucide-react";
import { jsPDF } from "jspdf";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";
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

  const [isDownloading, setIsDownloading] = useState(false);

  const handleSendClick = () => {
    if (hasBeenSent && onResend) {
      onResend(contract);
    } else {
      onSend(contract);
    }
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);
      let yPosition = margin;

      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      const titleLines = doc.splitTextToSize(contract.title, contentWidth);
      doc.text(titleLines, margin, yPosition);
      yPosition += (titleLines.length * 8) + 5;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      doc.text(`Status: ${contract.status} | Created: ${new Date(contract.created_at).toLocaleDateString()}`, margin, yPosition);
      yPosition += 10;
      doc.setTextColor(0);
      doc.setDrawColor(200);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 10;

      // Get content - fetch signatures if completed
      let content = contract.content;
      if (contract.status === 'completed') {
        const { data: sigRecord } = await supabase
          .from('contract_signatures_v2')
          .select('embedded_signatures')
          .eq('contract_id', contract.id)
          .eq('status', 'completed')
          .maybeSingle();
        if (sigRecord?.embedded_signatures && !content.includes('[EMBEDDED_SIGNATURES]')) {
          const sigStr = typeof sigRecord.embedded_signatures === 'string' 
            ? sigRecord.embedded_signatures 
            : JSON.stringify(sigRecord.embedded_signatures);
          content += `\n\n[EMBEDDED_SIGNATURES]${sigStr}[/EMBEDDED_SIGNATURES]`;
        }
      }

      let cleanContent = content
        .replace(/\[EMBEDDED_SIGNATURES\].*?\[\/EMBEDDED_SIGNATURES\]/gs, '')
        .replace(/\[SIGNATURE_FIELD:\d+\]/g, '')
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/\n{3,}/g, '\n\n').trim();

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(cleanContent, contentWidth);
      for (const line of lines) {
        if (yPosition > pageHeight - margin - 10) { doc.addPage(); yPosition = margin; }
        doc.text(line, margin, yPosition);
        yPosition += 5;
      }

      // Add signatures if present
      const sigMatch = content.match(/\[EMBEDDED_SIGNATURES\](.*?)\[\/EMBEDDED_SIGNATURES\]/s);
      if (sigMatch) {
        try {
          const sigs = JSON.parse(sigMatch[1]);
          if (sigs.length > 0) {
            if (yPosition > pageHeight - 80) { doc.addPage(); yPosition = margin; }
            yPosition += 10;
            doc.line(margin, yPosition, pageWidth - margin, yPosition);
            yPosition += 10;
            doc.setFontSize(14); doc.setFont('helvetica', 'bold');
            doc.text('Signatures', margin, yPosition); yPosition += 10;
            for (const sig of sigs) {
              if (yPosition > pageHeight - 50) { doc.addPage(); yPosition = margin; }
              doc.setFontSize(10); doc.setFont('helvetica', 'bold');
              doc.text(sig.signerType === 'admin' ? 'Admin Signature' : 'Artist Signature', margin, yPosition);
              yPosition += 5;
              if (sig.signatureData?.startsWith('data:image')) {
                try { doc.addImage(sig.signatureData, 'PNG', margin, yPosition, 50, 15); yPosition += 20; }
                catch { doc.setFont('helvetica', 'italic'); doc.text('[Digital Signature]', margin, yPosition); yPosition += 5; }
              } else {
                doc.setFont('helvetica', 'italic');
                doc.text(sig.signatureData || '[Digital Signature]', margin, yPosition); yPosition += 5;
              }
              doc.setFont('helvetica', 'normal'); doc.setTextColor(100);
              doc.text(`Signed: ${sig.dateSigned || ''} | ${sig.timestamp ? new Date(sig.timestamp).toLocaleString() : ''}`, margin, yPosition);
              doc.setTextColor(0); yPosition += 15;
            }
          }
        } catch {}
      }

      doc.save(`${contract.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
      toast.success('Contract PDF downloaded');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download contract');
    } finally {
      setIsDownloading(false);
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
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleDownload}
            disabled={isDownloading}
            title="Download PDF"
            className="h-8 w-8 p-0"
          >
            <Download className="h-3 w-3" />
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
