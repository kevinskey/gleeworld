import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, File, Trash2, ExternalLink, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface BudgetAttachment {
  id: string;
  filename: string;
  file_url: string;
  file_type?: string;
  created_at: string;
}

interface BudgetFileUploadProps {
  budgetId: string;
  attachments: BudgetAttachment[];
  onAttachmentsChange: (attachments: BudgetAttachment[]) => void;
}

export const BudgetFileUpload: React.FC<BudgetFileUploadProps> = ({
  budgetId,
  attachments,
  onAttachmentsChange
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [googleDocUrl, setGoogleDocUrl] = useState("");
  const [showGoogleDocInput, setShowGoogleDocInput] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!user) return;

    setUploading(true);
    const newAttachments: BudgetAttachment[] = [];

    try {
      for (const file of acceptedFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${budgetId}/${Date.now()}-${file.name}`;
        
        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('budget-documents')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('budget-documents')
          .getPublicUrl(fileName);

        // Save to database
        const { data: attachmentData, error: dbError } = await supabase
          .from('budget_attachments')
          .insert({
            budget_id: budgetId,
            filename: file.name,
            file_url: publicUrl,
            file_type: fileExt,
            uploaded_by: user.id
          })
          .select()
          .single();

        if (dbError) throw dbError;

        newAttachments.push(attachmentData);
      }

      onAttachmentsChange([...attachments, ...newAttachments]);
      toast({
        title: "Files uploaded successfully",
        description: `${acceptedFiles.length} file(s) uploaded to budget`,
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload files. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  }, [user, budgetId, attachments, onAttachmentsChange, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp']
    },
    disabled: uploading
  });

  const handleGoogleDocSubmit = async () => {
    if (!googleDocUrl.trim() || !user) return;

    try {
      const { data, error } = await supabase
        .from('budget_attachments')
        .insert({
          budget_id: budgetId,
          filename: `Google Doc - ${new Date().toLocaleDateString()}`,
          file_url: googleDocUrl,
          file_type: 'google-doc',
          uploaded_by: user.id
        })
        .select()
        .single();

      if (error) throw error;

      onAttachmentsChange([...attachments, data]);
      setGoogleDocUrl("");
      setShowGoogleDocInput(false);
      toast({
        title: "Google Doc linked successfully",
        description: "Google Doc has been added to the budget",
      });
    } catch (error) {
      toast({
        title: "Failed to link Google Doc",
        description: "Please check the URL and try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAttachment = async (attachmentId: string, fileName: string) => {
    try {
      // Delete from storage if it's a file upload (not Google Doc)
      const attachment = attachments.find(a => a.id === attachmentId);
      if (attachment && attachment.file_type !== 'google-doc') {
        const filePath = `${user?.id}/${budgetId}/${fileName}`;
        await supabase.storage
          .from('budget-documents')
          .remove([filePath]);
      }

      // Delete from database
      const { error } = await supabase
        .from('budget_attachments')
        .delete()
        .eq('id', attachmentId);

      if (error) throw error;

      onAttachmentsChange(attachments.filter(a => a.id !== attachmentId));
      toast({
        title: "Attachment deleted",
        description: "File has been removed from the budget",
      });
    } catch (error) {
      toast({
        title: "Delete failed",
        description: "Failed to delete attachment. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getFileIcon = (fileType?: string) => {
    if (fileType === 'google-doc') return <ExternalLink className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Budget Documents & Quotes</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowGoogleDocInput(!showGoogleDocInput)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Google Doc
        </Button>
      </div>

      {/* Google Doc Input */}
      {showGoogleDocInput && (
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-2">
              <Input
                placeholder="Paste Google Doc/Sheet URL here..."
                value={googleDocUrl}
                onChange={(e) => setGoogleDocUrl(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleGoogleDocSubmit} size="sm">
                Add Link
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setShowGoogleDocInput(false);
                  setGoogleDocUrl("");
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* File Upload Dropzone */}
      <Card>
        <CardContent className="p-6">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive 
                ? 'border-primary bg-primary/5' 
                : 'border-muted-foreground/25 hover:border-primary/50'
            } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <input {...getInputProps()} />
            <Upload className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
            {isDragActive ? (
              <p className="text-primary">Drop files here to upload</p>
            ) : (
              <div>
                <p className="font-medium mb-2">
                  {uploading ? 'Uploading...' : 'Drop files here or click to browse'}
                </p>
                <p className="text-sm text-muted-foreground">
                  Supports PDF, Word documents, and images
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Attachments List */}
      {attachments.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <Label className="text-sm font-medium mb-3 block">Uploaded Files</Label>
            <div className="space-y-2">
              {attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {getFileIcon(attachment.file_type)}
                    <div>
                      <p className="font-medium text-sm">{attachment.filename}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(attachment.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(attachment.file_url, '_blank')}
                    >
                      {attachment.file_type === 'google-doc' ? 'Open' : 'Download'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteAttachment(attachment.id, attachment.filename)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};