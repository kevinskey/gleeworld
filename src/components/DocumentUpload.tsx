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
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { supabase } from "@/integrations/supabase/client";
import { SignatureFieldEditor, SignatureField } from "./SignatureFieldEditor";
import { UserSelectionSection } from "./upload/UserSelectionSection";
import { StipendAmountField } from "./upload/StipendAmountField";
import { ContractContentSection } from "./upload/ContractContentSection";
import { FileUploadArea } from "./upload/FileUploadArea";
import { RecipientInformation } from "./upload/RecipientInformation";
import { ContractPreviewDialog } from "./upload/ContractPreviewDialog";
import { logActivity, ACTIVITY_TYPES, RESOURCE_TYPES } from "@/utils/activityLogger";

interface DocumentUploadProps {
  templateContent?: string;
  templateName?: string;
  headerImageUrl?: string;
  contractType?: string;
  onContractCreated?: () => void;
}

export const DocumentUpload = ({ 
  templateContent, 
  templateName, 
  headerImageUrl: templateHeaderImageUrl, 
  contractType: templateContractType,
  onContractCreated
}: DocumentUploadProps) => {
  const [dragOver, setDragOver] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [contractType, setContractType] = useState("");
  const [signatureFields, setSignatureFields] = useState<SignatureField[]>([]);
  const [contractTitle, setContractTitle] = useState("");
  const [contractContent, setContractContent] = useState("");
  const [originalTemplateContent, setOriginalTemplateContent] = useState(""); // Store original template
  const [selectedUserId, setSelectedUserId] = useState("");
  const [stipendAmount, setStipendAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [headerImageUrl, setHeaderImageUrl] = useState<string>(""); // New state
  const [hasStipendField, setHasStipendField] = useState(false); // Track if template has stipend field
  const { toast } = useToast();
  const { createContract } = useContracts();
  const { users, loading: usersLoading } = useUsers();
  const { user } = useAuth();
  const { displayName } = useUserProfile(user);

  // Pre-fill form when template content is provided
  useEffect(() => {
    if (templateContent && templateName) {
      console.log('Applying template to form:', { templateName, templateContent });
      setOriginalTemplateContent(templateContent); // Store original template
      setContractContent(templateContent);
      
      // Don't generate title here - wait for user selection
      // The title will be updated when a user is selected
      setContractTitle(templateName); // Just use template name as placeholder
      
      // Set contract type from template
      if (templateContractType) {
        setContractType(templateContractType);
      }
      
      // Set header image URL if provided
      if (templateHeaderImageUrl) {
        setHeaderImageUrl(templateHeaderImageUrl);
      }
      
      // Check if template has stipend field and remember it
      if (templateContent.includes('{{stipend}}')) {
        setHasStipendField(true);
      }
      
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
        description: `Template "${templateName}" has been applied. Select a user to generate the contract title.`,
      });
    }
  }, [templateContent, templateName, templateHeaderImageUrl, templateContractType, toast]);

  // Function to update contract content with all current values
  const updateContractContent = (userInfo?: any, currentStipend?: string) => {
    if (!originalTemplateContent) return;
    
    let updatedContent = originalTemplateContent;
    
    // Replace user placeholders
    const selectedUser = userInfo || (selectedUserId ? users.find(user => user.id === selectedUserId) : null);
    if (selectedUser) {
      updatedContent = updatedContent.replace(/\{\{username\}\}/g, selectedUser.full_name || selectedUser.email);
      updatedContent = updatedContent.replace(/\{\{useremail\}\}/g, selectedUser.email);
    }
    
    // Replace stipend placeholder
    const stipend = currentStipend !== undefined ? currentStipend : stipendAmount;
    if (stipend) {
      updatedContent = updatedContent.replace(/\{\{stipend\}\}/g, `$${stipend}`);
    }
    
    setContractContent(updatedContent);
  };

  // Handle user selection and placeholder replacement
  const handleUserSelection = (userId: string) => {
    setSelectedUserId(userId);
    const selectedUser = users.find(user => user.id === userId);
    
    if (selectedUser) {
      setRecipientEmail(selectedUser.email);
      setRecipientName(selectedUser.full_name || selectedUser.email);
      
      // Update contract title with selected user when using template
      if (templateName) {
        const recipientName = selectedUser.full_name || selectedUser.email;
        const generatedTitle = `${recipientName} - ${templateName}`;
        setContractTitle(generatedTitle);
      }
      
      // Update contract content with user info
      updateContractContent(selectedUser);
      
      toast({
        title: "User Selected",
        description: `Contract updated for ${selectedUser.full_name || selectedUser.email}`,
      });
    }
  };

  // Handle stipend amount change and update content
  const handleStipendChange = (amount: string) => {
    console.log('Stipend amount changed to:', amount);
    setStipendAmount(amount);
    
    // Update contract content with new stipend amount
    updateContractContent(undefined, amount);
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

    console.log('Preview - Signature fields being passed:', signatureFields);
    console.log('Preview - Number of signature fields:', signatureFields.length);

    setShowPreview(true);
  };

  const sendContract = async () => {
    setIsLoading(true);

    try {
      // Replace Date Executed placeholder with current date when signed
      let finalContent = contractContent || `Contract document: ${uploadedFile?.name}\n\nSignature Fields: ${JSON.stringify(signatureFields)}`;
      finalContent = finalContent.replace(/Date Executed:/g, `Date Executed: ${new Date().toLocaleDateString()}`);
      
      console.log('Creating contract with final content and no template_id');
      
      // Create contract in database without template_id (we're using template content, not linking to template)
      const contractData = await createContract({
        title: contractTitle,
        content: finalContent,
        // Explicitly don't pass template_id - we're creating a new contract from template content
      });

      if (!contractData) {
        throw new Error("Failed to create contract");
      }

      // Log contract sending activity
      await logActivity({
        actionType: ACTIVITY_TYPES.CONTRACT_SENT,
        resourceType: RESOURCE_TYPES.CONTRACT,
        resourceId: contractData.id,
        details: {
          contractTitle,
          recipientEmail,
          recipientName,
          signatureFieldsCount: signatureFields.length,
          hasCustomMessage: !!emailMessage,
          contractType
        }
      });

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
      setOriginalTemplateContent(""); 
      setSignatureFields([]);
      setSelectedUserId("");
      setStipendAmount("");
      setHeaderImageUrl("");
      setHasStipendField(false);
      setShowPreview(false);

      // Trigger contract created callback to refresh the contracts list
      if (onContractCreated) {
        onContractCreated();
      }
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
            showField={hasStipendField}
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
                  <Select value={contractType} onValueChange={setContractType} disabled={!!templateContractType}>
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
                  {templateContractType && (
                    <p className="text-sm text-gray-500">Contract type set by template</p>
                  )}
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
        headerImageUrl={headerImageUrl}
      />
    </div>
  );
};
