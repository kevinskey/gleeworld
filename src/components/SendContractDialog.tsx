import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AutoEnrollHandler } from "@/components/contracts/AutoEnrollHandler";

interface Contract {
  id: string;
  title: string;
  content: string;
  status: string;
  created_at: string;
}

interface SendContractDialogProps {
  isOpen: boolean;
  onClose: () => void;
  contract: Contract | null;
  onSent?: () => void;
  initialRecipientEmail?: string;
  initialRecipientName?: string;
  isResend?: boolean;
}

export const SendContractDialog = ({ 
  isOpen, 
  onClose, 
  contract, 
  onSent,
  initialRecipientEmail = "",
  initialRecipientName = "",
  isResend = false
}: SendContractDialogProps) => {
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [autoEnrolled, setAutoEnrolled] = useState(false);
  const { toast } = useToast();

  // Auto-populate fields when dialog opens with initial values
  useEffect(() => {
    console.log('SendContractDialog useEffect triggered:', {
      isOpen,
      initialRecipientEmail,
      initialRecipientName,
      isResend
    });
    
    if (isOpen) {
      setRecipientEmail(initialRecipientEmail || "");
      setRecipientName(initialRecipientName || "");
      setCustomMessage("");
      setAutoEnrolled(false);
    }
  }, [isOpen, initialRecipientEmail, initialRecipientName, isResend]);

  const handleSend = async () => {
    if (!contract || !recipientEmail) {
      toast({
        title: "Error",
        description: "Please provide recipient email",
        variant: "destructive",
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      toast({
        title: "Error",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    setSending(true);
    try {
      console.log('Sending contract via edge function...');
      console.log('Recipient email:', recipientEmail);
      console.log('Recipient name:', recipientName);
      console.log('Is resend:', isResend);
      
      const { data, error } = await supabase.functions.invoke('send-contract-email', {
        body: {
          contractId: contract.id,
          contractTitle: contract.title,
          recipientEmail: recipientEmail,
          recipientName: recipientName || recipientEmail.split('@')[0],
          customMessage: customMessage || undefined,
          isResend: isResend
        }
      });

      if (error) {
        console.error('Error sending contract:', error);
        throw new Error(error.message || 'Failed to send contract');
      }

      console.log('Contract sent successfully:', data);

      toast({
        title: isResend ? "Contract Resent!" : "Contract Sent!",
        description: `Contract has been ${isResend ? 'resent' : 'sent'} to ${recipientEmail}${data?.autoEnrolled ? ' (user was automatically enrolled)' : ''}`,
      });

      // Reset form
      setRecipientEmail("");
      setRecipientName("");
      setCustomMessage("");
      setAutoEnrolled(false);
      
      onClose();
      if (onSent) onSent();
    } catch (error: any) {
      console.error('Send contract error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send contract",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleEnrollmentComplete = (enrolled: boolean, userId?: string) => {
    if (enrolled) {
      setAutoEnrolled(true);
      console.log('User auto-enrolled with ID:', userId);
    }
  };

  // Reset form when dialog closes
  const handleClose = () => {
    setRecipientEmail("");
    setRecipientName("");
    setCustomMessage("");
    setAutoEnrolled(false);
    onClose();
  };

  const dialogTitle = isResend ? "Resend Contract for Signing" : "Send Contract for Signing";

  return (
    <>
      {recipientEmail && (
        <AutoEnrollHandler
          recipientEmail={recipientEmail}
          recipientName={recipientName}
          contractId={contract?.id}
          onEnrollmentComplete={handleEnrollmentComplete}
        />
      )}
      
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {contract && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium">{contract.title}</p>
                <p className="text-sm text-gray-600">Created: {new Date(contract.created_at).toLocaleDateString()}</p>
              </div>
            )}

            {isResend && (
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-sm text-orange-800">
                  📧 Resending contract - fields auto-populated from last recipient
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="recipient-email">Recipient Email *</Label>
              <Input
                id="recipient-email"
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value.trim())}
                placeholder="Enter recipient's email address"
                required
                autoComplete="off"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="recipient-name">Recipient Name</Label>
              <Input
                id="recipient-name"
                type="text"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="Enter recipient's full name (optional)"
                autoComplete="off"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="custom-message">Custom Message</Label>
              <Textarea
                id="custom-message"
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Add a personal message (optional)"
                rows={3}
              />
            </div>

            {autoEnrolled && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  ✓ This user will be automatically enrolled in the system
                </p>
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={handleClose} disabled={sending}>
                Cancel
              </Button>
              <Button onClick={handleSend} disabled={sending || !recipientEmail}>
                {sending ? (isResend ? "Resending..." : "Sending...") : (isResend ? "Resend Contract" : "Send Contract")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
