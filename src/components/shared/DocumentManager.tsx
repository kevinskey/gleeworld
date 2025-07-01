
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Upload, 
  FileText, 
  Download, 
  Trash2, 
  Eye, 
  FolderOpen,
  Search
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { hasPermission } from "@/constants/permissions";

interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
  uploadedBy: string;
  bucket: string;
  status: 'active' | 'archived';
}

interface DocumentManagerProps {
  bucket?: string;
  allowedTypes?: string[];
  maxSize?: number;
  className?: string;
}

export const DocumentManager = ({ 
  bucket = 'user-files',
  allowedTypes = ['.pdf', '.doc', '.docx', '.jpg', '.png'],
  maxSize = 10485760, // 10MB
  className = ""
}: DocumentManagerProps) => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBucket, setSelectedBucket] = useState(bucket);

  // Document buckets based on user permissions
  const getAvailableBuckets = () => {
    const buckets = [
      { id: 'user-files', name: 'My Documents', icon: FileText },
      { id: 'w9-forms', name: 'W9 Forms', icon: FileText },
    ];

    if (user && hasPermission(user.role || 'user', 'view_all_contracts')) {
      buckets.push(
        { id: 'contract-documents', name: 'Contracts', icon: FileText },
        { id: 'signed-contracts', name: 'Signed Contracts', icon: FileText },
        { id: 'receipts', name: 'Receipts', icon: FileText }
      );
    }

    return buckets;
  };

  const handleFileUpload = async (file: File) => {
    setLoading(true);
    try {
      // File upload logic would go here
      console.log('Uploading file to bucket:', selectedBucket, file);
      // Simulate upload
      setTimeout(() => {
        setLoading(false);
      }, 2000);
    } catch (error) {
      console.error('Upload failed:', error);
      setLoading(false);
    }
  };

  const filteredDocuments = documents.filter(doc =>
    doc.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Document Manager
          </CardTitle>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64"
            />
            <Search className="h-4 w-4 text-gray-500" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={selectedBucket} onValueChange={setSelectedBucket}>
          <TabsList className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 mb-6">
            {getAvailableBuckets().map((bucket) => (
              <TabsTrigger key={bucket.id} value={bucket.id} className="text-xs">
                <bucket.icon className="h-3 w-3 mr-1" />
                {bucket.name}
              </TabsTrigger>
            ))}
          </TabsList>

          {getAvailableBuckets().map((bucket) => (
            <TabsContent key={bucket.id} value={bucket.id}>
              <div className="space-y-4">
                {/* Upload Area */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600 mb-2">
                    Drop files here or click to browse
                  </p>
                  <p className="text-xs text-gray-500 mb-4">
                    Supported: {allowedTypes.join(', ')} (Max: {Math.round(maxSize / 1024 / 1024)}MB)
                  </p>
                  <Button disabled={loading}>
                    {loading ? 'Uploading...' : 'Choose Files'}
                  </Button>
                </div>

                {/* Documents List */}
                <div className="space-y-2">
                  {filteredDocuments.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No documents in this bucket yet</p>
                    </div>
                  ) : (
                    filteredDocuments.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                        <div className="flex items-center gap-3">
                          <FileText className="h-8 w-8 text-blue-600" />
                          <div>
                            <p className="font-medium text-sm">{doc.name}</p>
                            <p className="text-xs text-gray-500">
                              {(doc.size / 1024 / 1024).toFixed(2)} MB • {doc.uploadedAt}
                            </p>
                          </div>
                          <Badge variant={doc.status === 'active' ? 'default' : 'secondary'}>
                            {doc.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                          {hasPermission(user?.role || 'user', 'delete_users') && (
                            <Button variant="ghost" size="sm" className="text-red-600">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
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
  );
};
