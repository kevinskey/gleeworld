
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, FileText } from "lucide-react";

interface CreateNewContractSectionProps {
  contractTitle: string;
  contractContent: string;
  onTitleChange: (title: string) => void;
  onContentChange: (content: string) => void;
  showSection: boolean;
}

export const CreateNewContractSection = ({
  contractTitle,
  contractContent,
  onTitleChange,
  onContentChange,
  showSection
}: CreateNewContractSectionProps) => {
  if (!showSection) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Create New Contract
        </CardTitle>
        <CardDescription>
          Build your contract from scratch
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="new-contract-title">Contract Title</Label>
          <Input
            id="new-contract-title"
            value={contractTitle}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Enter contract title (e.g., Service Agreement with John Doe)"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="new-contract-content">Contract Content</Label>
          <Textarea
            id="new-contract-content"
            value={contractContent}
            onChange={(e) => onContentChange(e.target.value)}
            placeholder="Enter your contract content here...

Example:
SERVICE AGREEMENT

This Service Agreement ('Agreement') is entered into on [Date] between [Your Company] ('Company') and [Client Name] ('Client').

1. SERVICES
Company agrees to provide [description of services].

2. COMPENSATION
Client agrees to pay Company [amount] for the services described above.

3. TERM
This agreement shall begin on [start date] and continue until [end date].

4. SIGNATURES
By signing below, both parties agree to the terms of this contract.

Company Signature: _________________ Date: _________

Client Signature: _________________ Date: _________"
            rows={12}
            className="font-mono text-sm"
          />
          <p className="text-sm text-gray-500">
            Write your contract content. You can add signature fields after creating the content.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
