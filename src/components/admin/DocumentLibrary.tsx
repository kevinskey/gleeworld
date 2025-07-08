import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Upload, 
  FileText, 
  Download, 
  Trash2, 
  Eye, 
  FolderOpen,
  Search,
  Plus,
  Edit,
  RefreshCw,
  File,
  Image,
  Archive
} from "lucide-react";

interface StorageFile {
  id: string;
  name: string;
  bucket_id: string;
  size: number;
  created_at: string;
  updated_at: string;
  metadata: any;
  public_url?: string;
}

interface CreateDocumentData {
  name: string;
  bucket: string;
  file: File | null;
  description: string;
  category: string;
}

export const DocumentLibrary = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBucket, setSelectedBucket] = useState("user-files");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<StorageFile | null>(null);
  const [uploading, setUploading] = useState(false);

  const [createData, setCreateData] = useState<CreateDocumentData>({
    name: '',
    bucket: 'user-files',
    file: null,
    description: '',
    category: 'document'
  });

  // Available buckets with metadata
  const buckets = [
    { id: 'user-files', name: 'User Files', icon: FileText, public: true, description: 'User uploaded documents' },
    { id: 'contract-documents', name: 'Contract Documents', icon: FileText, public: false, description: 'Contract templates and documents' },
    { id: 'signed-contracts', name: 'Signed Contracts', icon: Archive, public: false, description: 'Completed signed contracts' },
    { id: 'contract-signatures', name: 'Contract Signatures', icon: Edit, public: false, description: 'Digital signatures' },
    { id: 'receipts', name: 'Receipts', icon: File, public: true, description: 'Receipt images and documents' },
    { id: 'w9-forms', name: 'W9 Forms', icon: FileText, public: false, description: 'Tax forms' },
    { id: 'performer-documents', name: 'Performer Documents', icon: FileText, public: true, description: 'Performer related files' },
    { id: 'licenses', name: 'Licenses', icon: File, public: true, description: 'License documents' },
    { id: 'template-headers', name: 'Template Headers', icon: Image, public: true, description: 'Template header images' }
  ];

  const categories = [
    'document', 'image', 'template', 'contract', 'receipt', 'form', 'signature', 'license', 'other'
  ];

  useEffect(() => {
    fetchFiles();
  }, [selectedBucket]);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.storage
        .from(selectedBucket)
        .list('', {
          limit: 100,
          offset: 0
        });

      if (error) throw error;

      const filesWithMetadata = data?.map(file => ({
        id: file.id || file.name,
        name: file.name,
        bucket_id: selectedBucket,
        size: file.metadata?.size || 0,
        created_at: file.created_at || new Date().toISOString(),
        updated_at: file.updated_at || new Date().toISOString(),
        metadata: file.metadata || {},
        public_url: buckets.find(b => b.id === selectedBucket)?.public 
          ? supabase.storage.from(selectedBucket).getPublicUrl(file.name).data.publicUrl
          : undefined
      })) || [];

      setFiles(filesWithMetadata);
    } catch (error) {
      console.error('Error fetching files:', error);
      toast({
        title: "Error",
        description: "Failed to fetch files",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDocument = async () => {
    if (!createData.file || !createData.name) {
      toast({
        title: "Error",
        description: "Please provide a file and name",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const fileName = `${Date.now()}-${createData.file.name}`;
      
      const { data, error } = await supabase.storage
        .from(createData.bucket)
        .upload(fileName, createData.file, {
          metadata: {
            description: createData.description,
            category: createData.category,
            originalName: createData.name,
            uploadedBy: user?.id
          }
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Document uploaded successfully",
      });

      setShowCreateDialog(false);
      setCreateData({
        name: '',
        bucket: 'user-files',
        file: null,
        description: '',
        category: 'document'
      });
      
      if (createData.bucket === selectedBucket) {
        fetchFiles();
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Error",
        description: "Failed to upload document",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = async (fileName: string) => {
    try {
      const { error } = await supabase.storage
        .from(selectedBucket)
        .remove([fileName]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "File deleted successfully",
      });

      fetchFiles();
    } catch (error) {
      console.error('Error deleting file:', error);
      toast({
        title: "Error",
        description: "Failed to delete file",
        variant: "destructive",
      });
    }
  };

  const handleDownloadFile = async (fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from(selectedBucket)
        .download(fileName);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      toast({
        title: "Error",
        description: "Failed to download file",
        variant: "destructive",
      });
    }
  };

  const filteredFiles = files.filter(file =>
    file.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedBucketInfo = buckets.find(b => b.id === selectedBucket);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'svg'].includes(ext || '')) {
      return <Image className="h-8 w-8 text-blue-600" />;
    }
    return <FileText className="h-8 w-8 text-blue-600" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="h-6 w-6" />
                Document Library Administration
              </CardTitle>
              <p className="text-gray-600 mt-1">Manage all documents across storage buckets</p>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Upload Document
              </Button>
              <Button variant="outline" onClick={fetchFiles} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <Search className="h-4 w-4 text-gray-500" />
          </div>
        </CardContent>
      </Card>

      {/* Storage Buckets */}
      <Card>
        <CardContent className="pt-6">
          <Tabs value={selectedBucket} onValueChange={setSelectedBucket}>
            <TabsList className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 mb-6">
              {buckets.map((bucket) => (
                <TabsTrigger key={bucket.id} value={bucket.id} className="text-xs">
                  <bucket.icon className="h-3 w-3 mr-1" />
                  <span className="hidden sm:inline">{bucket.name}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {buckets.map((bucket) => (
              <TabsContent key={bucket.id} value={bucket.id}>
                <div className="space-y-4">
                  {/* Bucket Info */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <bucket.icon className="h-6 w-6 text-gray-600" />
                      <div>
                        <h3 className="font-medium">{bucket.name}</h3>
                        <p className="text-sm text-gray-600">{bucket.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={bucket.public ? "default" : "secondary"}>
                        {bucket.public ? "Public" : "Private"}
                      </Badge>
                      <Badge variant="outline">
                        {filteredFiles.length} files
                      </Badge>
                    </div>
                  </div>

                  {/* Files List */}
                  <div className="space-y-2">
                    {loading ? (
                      <div className="text-center py-8">
                        <RefreshCw className="h-8 w-8 mx-auto animate-spin text-gray-400 mb-2" />
                        <p className="text-gray-600">Loading files...</p>
                      </div>
                    ) : filteredFiles.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No documents in this bucket</p>
                        <p className="text-sm">Upload files to get started</p>
                      </div>
                    ) : (
                      filteredFiles.map((file) => (
                        <div key={file.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                          <div className="flex items-center gap-3">
                            {getFileIcon(file.name)}
                            <div>
                              <p className="font-medium">{file.metadata?.originalName || file.name}</p>
                              <p className="text-sm text-gray-500">
                                {formatFileSize(file.size)} • {new Date(file.created_at).toLocaleDateString()}
                              </p>
                              {file.metadata?.description && (
                                <p className="text-xs text-gray-400 mt-1">{file.metadata.description}</p>
                              )}
                            </div>
                            {file.metadata?.category && (
                              <Badge variant="outline" className="ml-2">
                                {file.metadata.category}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {file.public_url && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => window.open(file.public_url, '_blank')}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleDownloadFile(file.name)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-red-600"
                              onClick={() => handleDeleteFile(file.name)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Create Document Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>
              Upload a new document to the selected storage bucket
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="bucket">Storage Bucket</Label>
              <Select value={createData.bucket} onValueChange={(value) => setCreateData({...createData, bucket: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {buckets.map((bucket) => (
                    <SelectItem key={bucket.id} value={bucket.id}>
                      {bucket.name} ({bucket.public ? 'Public' : 'Private'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="name">Document Name</Label>
              <Input
                id="name"
                value={createData.name}
                onChange={(e) => setCreateData({...createData, name: e.target.value})}
                placeholder="Enter document name"
              />
            </div>

            <div>
              <Label htmlFor="category">Category</Label>
              <Select value={createData.category} onValueChange={(value) => setCreateData({...createData, category: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={createData.description}
                onChange={(e) => setCreateData({...createData, description: e.target.value})}
                placeholder="Enter document description"
              />
            </div>

            <div>
              <Label htmlFor="file">File</Label>
              <Input
                id="file"
                type="file"
                onChange={(e) => setCreateData({...createData, file: e.target.files?.[0] || null})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateDocument} disabled={uploading}>
              {uploading ? 'Uploading...' : 'Upload Document'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};