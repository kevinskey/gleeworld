
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface RecipientInformationProps {
  recipientName: string;
  recipientEmail: string;
  emailMessage: string;
  onRecipientNameChange: (name: string) => void;
  onRecipientEmailChange: (email: string) => void;
  onEmailMessageChange: (message: string) => void;
}

export const RecipientInformation = ({
  recipientName,
  recipientEmail,
  emailMessage,
  onRecipientNameChange,
  onRecipientEmailChange,
  onEmailMessageChange
}: RecipientInformationProps) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Recipient Information</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="recipient-name">Recipient Name</Label>
          <Input
            id="recipient-name"
            value={recipientName}
            onChange={(e) => onRecipientNameChange(e.target.value)}
            placeholder="John Doe"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="recipient-email">Recipient Email</Label>
          <Input
            id="recipient-email"
            type="email"
            value={recipientEmail}
            onChange={(e) => onRecipientEmailChange(e.target.value)}
            placeholder="john@company.com"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="email-message">Custom Message (Optional)</Label>
        <Textarea
          id="email-message"
          value={emailMessage}
          onChange={(e) => onEmailMessageChange(e.target.value)}
          placeholder="Please review and sign the attached contract..."
          rows={3}
        />
      </div>
    </div>
  );
};
