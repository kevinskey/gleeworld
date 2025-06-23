import { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, Loader2, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useContracts } from "@/hooks/useContracts";
import { useUsers } from "@/hooks/useUsers";
import { supabase } from "@/integrations/supabase/client";
import { SignatureFieldEditor, SignatureField } from "./SignatureFieldEditor";
import { UserSelectionSection } from "./upload/UserSelectionSection";
import { StipendAmountField } from "./upload/StipendAmountField";
import { ContractContentSection } from "./upload/ContractContentSection";
import { FileUploadArea } from "./upload/FileUploadArea";
import { RecipientInformation } from "./upload/RecipientInformation";
import { ContractPreviewDialog } from "./upload/ContractPreviewDialog";

interface DocumentUploadProps {
  templateContent?: string;
  templateName?: string;
}

export const DocumentUpload = ({ templateContent, templateName }: DocumentUploadProps) => {
  const [dragOver, setDragOver] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [contractType, setContractType] = useState("");
  const [signatureFields, setSignatureFields] = useState<SignatureField[]>([]);
  const [contractTitle, setContractTitle] = useState("");
  const [contractContent, setContractContent] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [stipendAmount, setStipendAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const { toast } = useToast();
  const { createContract } = useContracts();
  const { users, loading: usersLoading } = useUsers();

  // Pre-fill form when template content is provided
  useEffect(() => {
    if (templateContent && templateName) {
      setContractContent(templateContent);
      setContractTitle(templateName);
      
      // Create default signature fields for ARTIST and AGENT
      const defaultSignatureFields: SignatureField[] = [
        {
          id: Date.now(),
          label: "ARTIST Signature",
          type: 'signature',
          page: 1,
          x: 100,
          y: 400,
          required: true
        },
        {
          id: Date.now() + 1,
          label: "AGENT Signature", 
          type: 'signature',
          page: 1,
          x: 400,
          y: 400,
          required: true
        }
      ];
      setSignatureFields(defaultSignatureFields);
      
      toast({
        title: "Template Applied",
        description: `Template "${templateName}" has been loaded with default signature fields`,
      });
    }
  }, [templateContent, templateName, toast]);

  // Handle user selection and placeholder replacement
  const handleUserSelection = (userId: string) => {
    setSelectedUserId(userId);
    const selectedUser = users.find(user => user.id === userId);
    
    if (selectedUser && contractContent) {
      let updatedContent = contractContent;
      
      // Replace placeholders
      updatedContent = updatedContent.replace(/\{\{username\}\}/g, selectedUser.full_name || selectedUser.email);
      updatedContent = updatedContent.replace(/\{\{useremail\}\}/g, selectedUser.email);
      
      setContractContent(updatedContent);
      setRecipientEmail(selectedUser.email);
      setRecipientName(selectedUser.full_name || selectedUser.email);
      
      toast({
        title: "User Selected",
        description: `Contract updated for ${selectedUser.full_name || selectedUser.email}`,
      });
    }
  };

  // Handle stipend amount change and update content
  const handleStipendChange = (amount: string) => {
    setStipendAmount(amount);
    if (contractContent) {
      const updatedContent = contractContent.replace(/\{\{stipend\}\}/g, amount ? `$${amount}` : '{{stipend}}');
      setContractContent(updatedContent);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const file = files[0];
    
    if (file && (file.type === 'application/pdf' || file.type.includes('word'))) {
      setUploadedFile(file);
      toast({
        title: "File uploaded successfully",
        description: `${file.name} is ready for processing.`,
      });
    } else {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF or Word document.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const handleFileUpload = (file: File | null) => {
    setUploadedFile(file);
    if (file) {
      toast({
        title: "File uploaded successfully",
        description: `${file.name} is ready for processing.`,
      });
    }
  };

  const handlePreviewContract = () => {
    if ((!uploadedFile && !contractContent) || !recipientEmail || !contractTitle) {
      toast({
        title: "Missing information",
        description: "Please upload a document or provide contract content, title, and recipient details.",
        variant: "destructive",
      });
      return;
    }

    if (signatureFields.filter(f => f.required).length === 0) {
      toast({
        title: "No signature fields",
        description: "Please add at least one required signature field.",
        variant: "destructive",
      });
      return;
    }

    setShowPreview(true);
  };

  const sendContract = async () => {
    setIsLoading(true);

    try {
      // Replace Date Executed placeholder with current date when signed
      let finalContent = contractContent || `Contract document: ${uploadedFile?.name}\n\nSignature Fields: ${JSON.stringify(signatureFields)}`;
      finalContent = finalContent.replace(/Date Executed:/g, `Date Executed: ${new Date().toLocaleDateString()}`);
      
      // Create contract in database with signature fields
      const contractData = await createContract({
        title: contractTitle,
        content: finalContent,
      });

      if (!contractData) {
        throw new Error("Failed to create contract");
      }

      // Send email notification
      const { error: emailError } = await supabase.functions.invoke('send-contract-email', {
        body: {
          recipientEmail,
          recipientName,
          contractTitle,
          contractId: contractData.id,
          senderName: "ContractFlow Team",
          customMessage: emailMessage,
          signatureFields: signatureFields
        }
      });

      if (emailError) {
        console.error("Email error:", emailError);
        toast({
          title: "Contract created but email failed",
          description: `Contract was saved but we couldn't send the email to ${recipientEmail}. Please send it manually.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Contract sent successfully",
          description: `Contract with ${signatureFields.length} signature fields has been sent to ${recipientEmail}.`,
        });
      }

      // Reset form and close preview
      setUploadedFile(null);
      setRecipientEmail("");
      setRecipientName("");
      setEmailMessage("");
      setContractType("");
      setContractTitle("");
      setContractContent("");
      setSignatureFields([]);
      setSelectedUserId("");
      setStipendAmount("");
      setShowPreview(false);
    } catch (error) {
      console.error("Error sending contract:", error);
      toast({
        title: "Error",
        description: "Failed to create and send contract. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create Contract</CardTitle>
          <CardDescription>
            Upload a document or use template content to begin the signing process
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <UserSelectionSection
            users={users}
            selectedUserId={selectedUserId}
            onUserSelect={handleUserSelection}
            usersLoading={usersLoading}
            showSection={!!contractContent}
          />

          <StipendAmountField
            stipendAmount={stipendAmount}
            onStipendChange={handleStipendChange}
            showField={contractContent?.includes('{{stipend}}') || false}
          />

          <ContractContentSection
            contractContent={contractContent}
            onContentChange={setContractContent}
            showSection={!!contractContent}
          />

          <FileUploadArea
            uploadedFile={uploadedFile}
            onFileUpload={handleFileUpload}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            dragOver={dragOver}
            showArea={!contractContent}
          />

          {(uploadedFile || contractContent) && (
            <>
              <div className="space-y-2">
                <Label htmlFor="contract-title">Contract Title</Label>
                <Input
                  id="contract-title"
                  value={contractTitle}
                  onChange={(e) => setContractTitle(e.target.value)}
                  placeholder="Enter contract title"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contract-type">Contract Type</Label>
                  <Select value={contractType} onValueChange={setContractType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select contract type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="service">Service Agreement</SelectItem>
                      <SelectItem value="nda">Non-Disclosure Agreement</SelectItem>
                      <SelectItem value="employment">Employment Contract</SelectItem>
                      <SelectItem value="lease">Lease Agreement</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <SignatureFieldEditor 
                fields={signatureFields}
                onFieldsChange={setSignatureFields}
              />

              <RecipientInformation
                recipientName={recipientName}
                recipientEmail={recipientEmail}
                emailMessage={emailMessage}
                onRecipientNameChange={setRecipientName}
                onRecipientEmailChange={setRecipientEmail}
                onEmailMessageChange={setEmailMessage}
              />

              <div className="flex justify-end gap-3 pt-4">
                <Button onClick={handlePreviewContract} variant="outline" size="lg">
                  <Eye className="h-4 w-4 mr-2" />
                  Preview Contract
                </Button>
                <Button onClick={sendContract} size="lg" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send for Signature
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <ContractPreviewDialog
        open={showPreview}
        onOpenChange={setShowPreview}
        contractTitle={contractTitle}
        contractContent={contractContent}
        recipientName={recipientName}
        recipientEmail={recipientEmail}
        emailMessage={emailMessage}
        signatureFields={signatureFields}
        onConfirmSend={sendContract}
        isLoading={isLoading}
      />
    </div>
  );
};
