
import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileText, X, Send, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const DocumentUpload = () => {
  const [dragOver, setDragOver] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [contractType, setContractType] = useState("");
  const [signatureFields, setSignatureFields] = useState<Array<{id: number, label: string, page: number, x: number, y: number}>>([]);
  const { toast } = useToast();

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

  const addSignatureField = () => {
    setSignatureFields([...signatureFields, {
      id: Date.now(),
      label: `Signature ${signatureFields.length + 1}`,
      page: 1,
      x: 100,
      y: 100
    }]);
  };

  const removeSignatureField = (id: number) => {
    setSignatureFields(signatureFields.filter(field => field.id !== id));
  };

  const sendContract = () => {
    if (!uploadedFile || !recipientEmail) {
      toast({
        title: "Missing information",
        description: "Please upload a document and provide recipient details.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Contract sent successfully",
      description: `Contract has been sent to ${recipientEmail} for signature.`,
    });

    // Reset form
    setUploadedFile(null);
    setRecipientEmail("");
    setRecipientName("");
    setEmailMessage("");
    setContractType("");
    setSignatureFields([]);
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

              {/* Signature Fields */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Signature Fields</Label>
                  <Button variant="outline" size="sm" onClick={addSignatureField}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Field
                  </Button>
                </div>
                
                {signatureFields.map((field) => (
                  <div key={field.id} className="flex items-center space-x-4 p-3 border rounded-lg">
                    <Input
                      placeholder="Field label"
                      value={field.label}
                      onChange={(e) => {
                        setSignatureFields(signatureFields.map(f => 
                          f.id === field.id ? {...f, label: e.target.value} : f
                        ));
                      }}
                      className="flex-1"
                    />
                    <div className="flex items-center space-x-2">
                      <Label className="text-sm">Page:</Label>
                      <Input
                        type="number"
                        value={field.page}
                        onChange={(e) => {
                          setSignatureFields(signatureFields.map(f => 
                            f.id === field.id ? {...f, page: parseInt(e.target.value)} : f
                          ));
                        }}
                        className="w-16"
                        min="1"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeSignatureField(field.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

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
                <Button onClick={sendContract} size="lg">
                  <Send className="h-4 w-4 mr-2" />
                  Send for Signature
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
