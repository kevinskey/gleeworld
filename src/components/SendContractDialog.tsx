
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { Loader2, Send, RotateCcw, History, Mail, User, MessageSquare } from "lucide-react";
import type { Contract } from "@/hooks/useContracts";

interface ContractRecipient {
  id: string;
  recipient_email: string;
  recipient_name: string;
  custom_message?: string;
  sent_at: string;
  is_resend: boolean;
  resend_reason?: string;
  email_status: string;
  delivery_status: string;
}

interface SendContractDialogProps {
  contract: Contract;
  isOpen: boolean;
  onClose: () => void;
  onSent: () => void;
}

export const SendContractDialog = ({ contract, isOpen, onClose, onSent }: SendContractDialogProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { displayName } = useUserProfile(user);
  
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  const [isResend, setIsResend] = useState(false);
  const [resendReason, setResendReason] = useState("");
  const [sendHistory, setSendHistory] = useState<ContractRecipient[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (isOpen && contract) {
      loadSendHistory();
    }
  }, [isOpen, contract]);

  const loadSendHistory = async () => {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('contract_recipients_v2')
        .select('*')
        .eq('contract_id', contract.id)
        .order('sent_at', { ascending: false });

      if (error) throw error;
      setSendHistory(data || []);
    } catch (error) {
      console.error('Error loading send history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleResendToRecipient = (recipient: ContractRecipient) => {
    setRecipientEmail(recipient.recipient_email);
    setRecipientName(recipient.recipient_name);
    setIsResend(true);
    setCustomMessage(`Resending as requested - Original sent on ${new Date(recipient.sent_at).toLocaleDateString()}`);
  };

  const handleSend = async () => {
    if (!recipientEmail || !recipientName) {
      toast({
        title: "Missing Information",
        description: "Please provide recipient email and name",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Get signature fields from contract content
      const signatureFields = extractSignatureFields(contract.content);

      // Send the email
      const { data, error } = await supabase.functions.invoke('send-contract-email', {
        body: {
          recipientEmail,
          recipientName,
          contractTitle: contract.title,
          contractId: contract.id,
          senderName: displayName || "ContractFlow Team",
          customMessage: isResend ? `${customMessage}${resendReason ? ` - Reason: ${resendReason}` : ''}` : customMessage,
          signatureFields: signatureFields,
          isResend
        }
      });

      if (error) throw error;

      // Record the send in our tracking table
      const { error: recordError } = await supabase
        .from('contract_recipients_v2')
        .insert({
          contract_id: contract.id,
          recipient_email: recipientEmail,
          recipient_name: recipientName,
          custom_message: customMessage,
          sent_by: user?.id,
          is_resend: isResend,
          resend_reason: resendReason || null,
          email_status: 'sent'
        });

      if (recordError) {
        console.error('Error recording send:', recordError);
        // Don't fail the whole operation for tracking errors
      }

      // Update contract status if first send
      if (!isResend && sendHistory.length === 0) {
        const { error: updateError } = await supabase
          .from('contracts_v2')
          .update({ status: 'pending_recipient' })
          .eq('id', contract.id);

        if (updateError) {
          console.error('Error updating contract status:', updateError);
        }
      }

      toast({
        title: isResend ? "Contract Resent" : "Contract Sent",
        description: `"${contract.title}" has been ${isResend ? 'resent' : 'sent'} to ${recipientEmail}`,
      });

      // Reset form
      setRecipientEmail("");
      setRecipientName("");
      setCustomMessage("");
      setIsResend(false);
      setResendReason("");
      
      // Reload history and notify parent
      await loadSendHistory();
      onSent();
      onClose();

    } catch (error) {
      console.error('Error sending contract:', error);
      toast({
        title: "Error",
        description: "Failed to send contract. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const extractSignatureFields = (content: string) => {
    // Extract signature fields from contract content
    // This is a simplified version - you might want to enhance this based on your contract format
    const signatureMatches = content.match(/\[SIGNATURE_FIELD:([^\]]+)\]/g) || [];
    return signatureMatches.map((match, index) => {
      const fieldName = match.replace('[SIGNATURE_FIELD:', '').replace(']', '');
      return {
        id: index + 1,
        label: fieldName,
        type: 'signature' as const,
        page: 1,
        x: 100,
        y: 100 + (index * 50),
        required: true
      };
    });
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'opened': return 'bg-purple-100 text-purple-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Send Contract: {contract.title}
          </DialogTitle>
          <DialogDescription>
            Send this contract to a recipient or resend to a previous recipient
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Send Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {isResend ? <RotateCcw className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                {isResend ? 'Resend Contract' : 'Send Contract'}
              </CardTitle>
              <CardDescription>
                {isResend ? 'Resend this contract to a recipient' : 'Send this contract to a new recipient'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="recipientEmail" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Recipient Email
                </Label>
                <Input
                  id="recipientEmail"
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="recipient@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="recipientName" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Recipient Name
                </Label>
                <Input
                  id="recipientName"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Recipient's full name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customMessage" className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Custom Message (Optional)
                </Label>
                <Textarea
                  id="customMessage"
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Add a personal message to include in the email..."
                  rows={3}
                />
              </div>

              {isResend && (
                <div className="space-y-2">
                  <Label htmlFor="resendReason">Resend Reason (Optional)</Label>
                  <Input
                    id="resendReason"
                    value={resendReason}
                    onChange={(e) => setResendReason(e.target.value)}
                    placeholder="e.g., Recipient didn't receive original email"
                  />
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleSend}
                  disabled={loading || !recipientEmail || !recipientName}
                  className="flex-1"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {isResend ? 'Resending...' : 'Sending...'}
                    </>
                  ) : (
                    <>
                      {isResend ? <RotateCcw className="h-4 w-4 mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                      {isResend ? 'Resend' : 'Send'} Contract
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
              </div>

              {isResend && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setIsResend(false);
                    setRecipientEmail("");
                    setRecipientName("");
                    setCustomMessage("");
                    setResendReason("");
                  }}
                  className="w-full"
                >
                  Switch to New Send
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Send History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-4 w-4" />
                Send History
              </CardTitle>
              <CardDescription>
                Previous sends of this contract
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingHistory ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Loading history...</span>
                </div>
              ) : sendHistory.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <History className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p>No previous sends</p>
                  <p className="text-sm">This contract hasn't been sent yet</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {sendHistory.map((recipient) => (
                    <div key={recipient.id} className="p-3 border rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium">{recipient.recipient_name}</p>
                          <p className="text-sm text-gray-600">{recipient.recipient_email}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {recipient.is_resend && (
                            <Badge variant="secondary" className="text-xs">
                              Resend
                            </Badge>
                          )}
                          <Badge className={getStatusBadgeColor(recipient.email_status)}>
                            {recipient.email_status}
                          </Badge>
                        </div>
                      </div>
                      
                      <p className="text-xs text-gray-500 mb-2">
                        Sent: {new Date(recipient.sent_at).toLocaleString()}
                      </p>
                      
                      {recipient.custom_message && (
                        <p className="text-sm text-gray-700 mb-2 italic">
                          "{recipient.custom_message}"
                        </p>
                      )}
                      
                      {recipient.resend_reason && (
                        <p className="text-xs text-orange-600 mb-2">
                          Resend reason: {recipient.resend_reason}
                        </p>
                      )}
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleResendToRecipient(recipient)}
                        className="w-full"
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Resend to this recipient
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};
