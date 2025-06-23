
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Eye, User, Mail, FileText, Signature } from "lucide-react";
import { SignatureField } from "../SignatureFieldEditor";

interface ContractPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractTitle: string;
  contractContent: string;
  recipientName: string;
  recipientEmail: string;
  emailMessage: string;
  signatureFields: SignatureField[];
  onConfirmSend: () => void;
  isLoading: boolean;
}

export const ContractPreviewDialog = ({
  open,
  onOpenChange,
  contractTitle,
  contractContent,
  recipientName,
  recipientEmail,
  emailMessage,
  signatureFields,
  onConfirmSend,
  isLoading
}: ContractPreviewDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Contract Preview
          </DialogTitle>
          <DialogDescription>
            Review the contract details before sending to the recipient
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Contract Title */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Contract Title</h3>
            <p className="text-lg font-semibold">{contractTitle}</p>
          </div>

          {/* Recipient Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">Recipient:</span>
              <span className="text-sm">{recipientName}</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">Email:</span>
              <span className="text-sm">{recipientEmail}</span>
            </div>
          </div>

          {/* Signature Fields */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-2">
              <Signature className="h-4 w-4" />
              Signature Fields ({signatureFields.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {signatureFields.map((field) => (
                <Badge key={field.id} variant="outline" className="flex items-center gap-1">
                  <Signature className="h-3 w-3" />
                  {field.label}
                  {field.required && <span className="text-red-500">*</span>}
                </Badge>
              ))}
            </div>
          </div>

          {/* Email Message */}
          {emailMessage && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Custom Email Message</h3>
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm whitespace-pre-wrap">{emailMessage}</p>
              </div>
            </div>
          )}

          {/* Contract Content */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Contract Content
            </h3>
            <ScrollArea className="h-64 w-full border rounded-lg p-4 bg-gray-50">
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {contractContent}
              </div>
            </ScrollArea>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Back to Edit
            </Button>
            <Button onClick={onConfirmSend} disabled={isLoading}>
              {isLoading ? (
                <>
                  <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Contract
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
