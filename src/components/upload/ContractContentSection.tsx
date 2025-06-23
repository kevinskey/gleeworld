
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ContractContentSectionProps {
  contractContent: string;
  onContentChange: (content: string) => void;
  showSection: boolean;
}

export const ContractContentSection = ({ contractContent, onContentChange, showSection }: ContractContentSectionProps) => {
  if (!showSection) return null;

  return (
    <div className="space-y-2">
      <Label htmlFor="contract-content">Contract Content (from template)</Label>
      <Textarea
        id="contract-content"
        value={contractContent}
        onChange={(e) => onContentChange(e.target.value)}
        placeholder="Contract content will appear here..."
        rows={8}
        className="font-mono text-sm"
      />
      <p className="text-sm text-gray-500">
        You can edit this content before sending the contract.
      </p>
    </div>
  );
};
