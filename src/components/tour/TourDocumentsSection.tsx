import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  FileText, 
  Download, 
  Upload,
  Trash2,
  Plus,
  Loader2
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useDropzone } from "react-dropzone";

interface TourDocument {
  id: string;
  document_name: string;
  document_type: string | null;
  file_url: string | null;
  file_size: number | null;
  uploaded_by: string | null;
  uploaded_at: string | null;
}

const canManageDocuments = (role: string | null | undefined) => {
  if (!role) return false;
  const allowedRoles = ['admin', 'super_admin', 'tour_manager', 'superadmin'];
  return allowedRoles.includes(role.toLowerCase());
};

const formatFileSize = (bytes: number | null) => {
  if (!bytes) return 'Unknown size';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const TourDocumentsSection = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [documentName, setDocumentName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const userCanManage = canManageDocuments(user?.role);

  // Fetch documents using raw SQL query to bypass type restrictions
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['tour-documents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tour_documents' as any)
        .select('*')
        .order('uploaded_at', { ascending: false });
      
      if (error) throw error;
      return (data || []) as unknown as TourDocument[];
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (doc: TourDocument) => {
      // Delete from storage if file_url exists
      if (doc.file_url) {
        const path = doc.file_url.split('/tour-documents/')[1];
        if (path) {
          await supabase.storage.from('tour-documents').remove([path]);
        }
      }
      
      // Delete from database
      const { error } = await supabase
        .from('tour_documents' as any)
        .delete()
        .eq('id', doc.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tour-documents'] });
      toast.success('Document deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete document');
      console.error(error);
    }
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setSelectedFile(acceptedFiles[0]);
      if (!documentName) {
        setDocumentName(acceptedFiles[0].name.replace(/\.[^/.]+$/, ""));
      }
    }
  }, [documentName]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024 // 10MB
  });

  const handleUpload = async () => {
    if (!selectedFile || !documentName.trim()) {
      toast.error('Please provide a document name and select a file');
      return;
    }

    setUploading(true);
    try {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}-${documentName.replace(/\s+/g, '-')}.${fileExt}`;
      
      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('tour-documents')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('tour-documents')
        .getPublicUrl(fileName);

      // Insert into database
      const { error: insertError } = await supabase
        .from('tour_documents' as any)
        .insert({
          document_name: documentName,
          document_type: 'pdf',
          file_url: urlData.publicUrl,
          file_size: selectedFile.size,
          uploaded_by: user?.id
        });

      if (insertError) throw insertError;

      queryClient.invalidateQueries({ queryKey: ['tour-documents'] });
      toast.success('Document uploaded successfully');
      setIsUploadOpen(false);
      setDocumentName("");
      setSelectedFile(null);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = (doc: TourDocument) => {
    if (doc.file_url) {
      window.open(doc.file_url, '_blank');
    }
  };

  if (isLoading) {
    return (
      <Card className="p-8 text-center">
        <Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
        <p className="text-muted-foreground mt-2">Loading documents...</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Upload Button */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Tour Documents</h2>
        {userCanManage && (
          <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Document
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload PDF Document</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="docName">Document Name</Label>
                  <Input
                    id="docName"
                    value={documentName}
                    onChange={(e) => setDocumentName(e.target.value)}
                    placeholder="Enter document name"
                  />
                </div>
                
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                    isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
                  }`}
                >
                  <input {...getInputProps()} />
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  {selectedFile ? (
                    <div>
                      <p className="font-medium text-sm">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {isDragActive ? 'Drop the PDF here' : 'Drag & drop a PDF, or click to select'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Max size: 10MB</p>
                    </div>
                  )}
                </div>

                <Button 
                  onClick={handleUpload} 
                  disabled={uploading || !selectedFile || !documentName.trim()}
                  className="w-full"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Document
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Empty State */}
      {documents.length === 0 ? (
        <Card className="p-8 text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">No tour documents available yet.</p>
          {userCanManage && (
            <p className="text-sm text-muted-foreground mt-2">
              Click "Add Document" to upload your first PDF.
            </p>
          )}
        </Card>
      ) : (
        /* Documents List */
        <div className="space-y-3">
          {documents.map((doc) => (
            <Card key={doc.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{doc.document_name}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Badge variant="secondary" className="text-xs">PDF</Badge>
                      <span>{formatFileSize(doc.file_size)}</span>
                      {doc.uploaded_at && (
                        <span>• {new Date(doc.uploaded_at).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="outline" size="sm" onClick={() => handleDownload(doc)}>
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                    {userCanManage && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-destructive hover:text-destructive"
                        onClick={() => deleteMutation.mutate(doc)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
