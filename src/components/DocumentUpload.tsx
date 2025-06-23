
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
import { ContractCreationMode } from "./upload/ContractCreationMode";
import { CreateNewContractSection } from "./upload/CreateNewContractSection";
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
  const [originalTemplateContent, setOriginalTemplateContent] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [stipendAmount, setStipendAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [headerImageUrl, setHeaderImageUrl] = useState<string>("");
  const [hasStipendField, setHasStipendField] = useState(false);
  const [creationMode, setCreationMode] = useState<'upload' | 'create' | 'template'>('create');
  const [templateApplied, setTemplateApplied] = useState(false);

  const { toast } = useToast();
  const { createContract } = useContracts();
  const { users, loading: usersLoading, refetch: refetchUsers } = useUsers();
  const { user } = useAuth();
  const { displayName } = useUserProfile(user);

  // Apply template content when provided - only run once
  useEffect(() => {
    if (templateContent && templateName && !templateApplied) {
      console.log('Applying template to form:', { templateName, templateContent });
      
      setOriginalTemplateContent(templateContent);
      setContractContent(templateContent);
      setCreationMode('template');
      setContractTitle(templateName);
      
      if (templateContractType) {
        setContractType(templateContractType);
      }
      
      if (templateHeaderImageUrl) {
        setHeaderImageUrl(templateHeaderImageUrl);
      }
      
      if (templateContent.includes('{{stipend}}')) {
        setHasStipendField(true);
      }
      
      // Set default signature fields
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
      setTemplateApplied(true);
      
      toast({
        title: "Template Applied",
        description: `Template "${templateName}" has been applied. Select a user to generate the contract title.`,
      });
    }
  }, [templateContent, templateName, templateHeaderImageUrl, templateContractType, templateApplied, toast]);

  // Function to update contract content with placeholders
  const updateContractContent = useCallback((userInfo?: any, currentStipend?: string) => {
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
  }, [originalTemplateContent, selectedUserId, users, stipendAmount]);

  // Handle creation mode changes
  const handleCreationModeChange = (mode: 'upload' | 'create' | 'template') => {
    setCreationMode(mode);
    
    if (mode !== 'template') {
      setContractContent("");
      setContractTitle("");
      setUploadedFile(null);
      setSignatureFields([]);
      setOriginalTemplateContent("");
      setHasStipendField(false);
      setHeaderImageUrl("");
      setTemplateApplied(false);
    }
    
    if (mode === 'create') {
      setContractContent("");
      setContractTitle("");
      const defaultSignatureFields: SignatureField[] = [
        {
          id: Date.now(),
          label: "Company Signature",
          type: 'signature',
          page: 1,
          x: 100,
          y: 400,
          required: true
        },
        {
          id: Date.now() + 1,
          label: "Client Signature", 
          type: 'signature',
          page: 1,
          x: 400,
          y: 400,
          required: true
        }
      ];
      setSignatureFields(defaultSignatureFields);
    }
  };

  // Handle user selection
  const handleUserSelection = (userId: string) => {
    setSelectedUserId(userId);
    const selectedUser = users.find(user => user.id === userId);
    
    if (selectedUser) {
      setRecipientEmail(selectedUser.email);
      setRecipientName(selectedUser.full_name || selectedUser.email);
      
      if (templateName) {
        const recipientName = selectedUser.full_name || selectedUser.email;
        const generatedTitle = `${recipientName} - ${templateName}`;
        setContractTitle(generatedTitle);
      }
      
      updateContractContent(selectedUser);
      
      toast({
        title: "User Selected",
        description: `Contract updated for ${selectedUser.full_name || selectedUser.email}`,
      });
    }
  };

  const handleStipendChange = (amount: string) => {
    setStipendAmount(amount);
    updateContractContent(undefined, amount);
  };

  // Handle drag and drop events
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

    setShowPreview(true);
  };

  const sendContract = async () => {
    if (!contractTitle.trim() || !recipientEmail.trim() || (!contractContent.trim() && !uploadedFile)) {
      toast({
        title: "Missing Information",
        description: "Please provide all required fields.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      let finalContent = contractContent || `Contract document: ${uploadedFile?.name}\n\nSignature Fields: ${JSON.stringify(signatureFields)}`;
      finalContent = finalContent.replace(/Date Executed:/g, `Date Executed: ${new Date().toLocaleDateString()}`);
      
      const contractData = await createContract({
        title: contractTitle,
        content: finalContent,
      });

      if (!contractData) {
        throw new Error("Failed to create contract");
      }

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
          contractType,
          creationMode
        }
      });

      try {
        const { data: emailData, error: emailError } = await supabase.functions.invoke('send-contract-email', {
          body: {
            recipientEmail,
            recipientName,
            contractTitle,
            contractId: contractData.id,
            senderName: displayName || "ContractFlow Team",
            customMessage: emailMessage,
            signatureFields: signatureFields || []
          }
        });

        if (emailError) {
          console.error("Email error:", emailError);
          toast({
            title: "Contract created successfully",
            description: `Contract was created but email sending failed. You may need to send the signing link manually to ${recipientEmail}.`,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Contract sent successfully",
            description: `Contract with ${signatureFields.length} signature fields has been sent to ${recipientEmail}.`,
          });
        }
      } catch (emailErr) {
        console.error("Email sending error:", emailErr);
        toast({
          title: "Contract created successfully",
          description: `Contract was created but email sending failed. Please check your email configuration.`,
          variant: "destructive",
        });
      }

      // Reset form
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
      setCreationMode('create');
      setShowPreview(false);
      setTemplateApplied(false);

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

  const showUserSelection = creationMode === 'template' && !!contractContent;
  const showContractContent = creationMode === 'template' && !!contractContent;
  const showFileUpload = creationMode === 'upload';
  const showCreateNew = creationMode === 'create';
  const hasContent = contractContent || uploadedFile;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create Contract</CardTitle>
          <CardDescription>
            Choose how you'd like to create your contract
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <ContractCreationMode
            mode={creationMode}
            onModeChange={handleCreationModeChange}
            hasTemplate={!!templateContent}
          />

          <UserSelectionSection
            users={users}
            selectedUserId={selectedUserId}
            onUserSelect={handleUserSelection}
            usersLoading={usersLoading}
            showSection={showUserSelection}
            onRefreshUsers={refetchUsers}
          />

          <StipendAmountField
            stipendAmount={stipendAmount}
            onStipendChange={handleStipendChange}
            showField={hasStipendField}
          />

          <ContractContentSection
            contractContent={contractContent}
            onContentChange={setContractContent}
            showSection={showContractContent}
          />

          <CreateNewContractSection
            contractTitle={contractTitle}
            contractContent={contractContent}
            onTitleChange={setContractTitle}
            onContentChange={setContractContent}
            showSection={showCreateNew}
          />

          <FileUploadArea
            uploadedFile={uploadedFile}
            onFileUpload={handleFileUpload}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            dragOver={dragOver}
            showArea={showFileUpload}
          />

          <SignatureFieldEditor 
            fields={signatureFields}
            onFieldsChange={setSignatureFields}
          />

          {hasContent && (
            <>
              {creationMode !== 'create' && (
                <div className="space-y-2">
                  <Label htmlFor="contract-title">Contract Title</Label>
                  <Input
                    id="contract-title"
                    value={contractTitle}
                    onChange={(e) => setContractTitle(e.target.value)}
                    placeholder="Enter contract title"
                  />
                </div>
              )}

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
                <Button 
                  onClick={sendContract} 
                  size="lg" 
                  disabled={isLoading || !contractTitle.trim() || !recipientEmail.trim()}
                >
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
