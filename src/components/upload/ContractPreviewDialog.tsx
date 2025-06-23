
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Eye, User, Mail, FileText, Signature, Image } from "lucide-react";
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
  headerImageUrl?: string;
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
  isLoading,
  headerImageUrl
}: ContractPreviewDialogProps) => {
  const getFieldTypeIcon = (type: SignatureField['type']) => {
    switch (type) {
      case 'signature': return <Signature className="h-3 w-3" />;
      case 'initials': return <User className="h-3 w-3" />;
      case 'date': return <FileText className="h-3 w-3" />;
      case 'text': return <FileText className="h-3 w-3" />;
      case 'username': return <User className="h-3 w-3" />;
      default: return <FileText className="h-3 w-3" />;
    }
  };

  const getFieldTypeLabel = (type: SignatureField['type']) => {
    switch (type) {
      case 'signature': return 'Signature';
      case 'initials': return 'Initials';
      case 'date': return 'Date';
      case 'text': return 'Text';
      case 'username': return 'Username';
      default: return 'Field';
    }
  };

  console.log('Preview Dialog - Signature Fields:', signatureFields);

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

          {/* Header Image */}
          {headerImageUrl && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-2">
                <Image className="h-4 w-4" />
                Header Image
              </h3>
              <div className="border rounded-lg p-4 bg-gray-50">
                <img 
                  src={headerImageUrl} 
                  alt="Contract Header" 
                  className="max-h-32 w-auto rounded border"
                />
              </div>
            </div>
          )}

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

          {/* Signature Fields - Always show this section */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-2">
              <Signature className="h-4 w-4" />
              Document Fields ({signatureFields?.length || 0})
            </h3>
            {signatureFields && signatureFields.length > 0 ? (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {signatureFields.map((field) => (
                  <div key={field.id} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getFieldTypeIcon(field.type)}
                      <div>
                        <p className="font-medium text-sm">{field.label}</p>
                        <p className="text-xs text-gray-500">
                          {getFieldTypeLabel(field.type)} • Page {field.page} • Position ({field.x}, {field.y})
                        </p>
                      </div>
                    </div>
                    <Badge variant={field.required ? "default" : "secondary"} className="text-xs">
                      {field.required ? "Required" : "Optional"}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  ⚠️ No signature fields have been added to this contract. Recipients won't be able to sign the document.
                </p>
              </div>
            )}
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
