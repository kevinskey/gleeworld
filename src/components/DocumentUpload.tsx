import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileText, X, Send, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useContracts } from "@/hooks/useContracts";
import { supabase } from "@/integrations/supabase/client";
import { SignatureFieldEditor, SignatureField } from "./SignatureFieldEditor";

export const DocumentUpload = () => {
  const [dragOver, setDragOver] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [contractType, setContractType] = useState("");
  const [signatureFields, setSignatureFields] = useState<SignatureField[]>([]);
  const [contractTitle, setContractTitle] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { createContract } = useContracts();

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

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      toast({
        title: "File uploaded successfully",
        description: `${file.name} is ready for processing.`,
      });
    }
  };

  const sendContract = async () => {
    if (!uploadedFile || !recipientEmail || !contractTitle) {
      toast({
        title: "Missing information",
        description: "Please upload a document, provide a title, and recipient details.",
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

    setIsLoading(true);

    try {
      // Create contract in database with signature fields
      const contractData = await createContract({
        title: contractTitle,
        content: `Contract document: ${uploadedFile.name}\n\nSignature Fields: ${JSON.stringify(signatureFields)}`,
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

      // Reset form
      setUploadedFile(null);
      setRecipientEmail("");
      setRecipientName("");
      setEmailMessage("");
      setContractType("");
      setContractTitle("");
      setSignatureFields([]);
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
          <CardTitle>Upload Contract Document</CardTitle>
          <CardDescription>
            Upload a PDF or Word document to begin the signing process
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* File Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {uploadedFile ? (
              <div className="space-y-4">
                <FileText className="h-16 w-16 text-green-600 mx-auto" />
                <div>
                  <p className="text-lg font-medium text-gray-900">{uploadedFile.name}</p>
                  <p className="text-sm text-gray-500">
                    {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setUploadedFile(null)}
                  className="mt-2"
                >
                  <X className="h-4 w-4 mr-2" />
                  Remove File
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <Upload className="h-16 w-16 text-gray-400 mx-auto" />
                <div>
                  <p className="text-lg font-medium text-gray-900">
                    Drop your document here, or click to browse
                  </p>
                  <p className="text-sm text-gray-500">
                    Supports PDF and Word documents (max 10MB)
                  </p>
                </div>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileInput}
                  className="hidden"
                  id="file-upload"
                />
                <Button asChild className="mt-4">
                  <label htmlFor="file-upload" className="cursor-pointer">
                    Choose File
                  </label>
                </Button>
              </div>
            )}
          </div>

          {uploadedFile && (
            <>
              {/* Contract Title */}
              <div className="space-y-2">
                <Label htmlFor="contract-title">Contract Title</Label>
                <Input
                  id="contract-title"
                  value={contractTitle}
                  onChange={(e) => setContractTitle(e.target.value)}
                  placeholder="Enter contract title"
                />
              </div>

              {/* Contract Details */}
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

              {/* Enhanced Signature Fields */}
              <SignatureFieldEditor 
                fields={signatureFields}
                onFieldsChange={setSignatureFields}
              />

              {/* Recipient Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Recipient Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="recipient-name">Recipient Name</Label>
                    <Input
                      id="recipient-name"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      placeholder="John Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="recipient-email">Recipient Email</Label>
                    <Input
                      id="recipient-email"
                      type="email"
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                      placeholder="john@company.com"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email-message">Custom Message (Optional)</Label>
                  <Textarea
                    id="email-message"
                    value={emailMessage}
                    onChange={(e) => setEmailMessage(e.target.value)}
                    placeholder="Please review and sign the attached contract..."
                    rows={3}
                  />
                </div>
              </div>

              {/* Send Button */}
              <div className="flex justify-end pt-4">
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
    </div>
  );
};
