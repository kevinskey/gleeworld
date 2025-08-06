import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useGoogleDocuments } from '@/hooks/useGoogleDocuments';
import { GoogleAuth } from '@/components/google-auth/GoogleAuth';
import { DocumentContainer } from '@/components/DocumentContainer';
import { 
  Plus, 
  ExternalLink, 
  RotateCcw, 
  Share2, 
  Trash2, 
  FileText, 
  Clock,
  Users
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const DOCUMENT_TYPES = [
  { value: 'general', label: 'General Document' },
  { value: 'meeting_minutes', label: 'Meeting Minutes' },
  { value: 'contract', label: 'Contract' },
  { value: 'report', label: 'Report' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'memo', label: 'Memo' }
];

export const GoogleDocsManager = () => {
  const { documents, loading, creating, createDocument, syncDocument, deleteDocument } = useGoogleDocuments();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocDescription, setNewDocDescription] = useState('');
  const [newDocType, setNewDocType] = useState('general');
  const [authSuccess, setAuthSuccess] = useState(false);

  const handleCreateDocument = async () => {
    if (!newDocTitle.trim()) return;
    
    const document = await createDocument(
      newDocTitle,
      newDocDescription,
      newDocType
    );
    
    if (document) {
      setNewDocTitle('');
      setNewDocDescription('');
      setNewDocType('general');
      setShowCreateForm(false);
    }
  };

  const handleSyncDocument = async (documentId: string) => {
    await syncDocument(documentId);
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (confirm('Are you sure you want to delete this document?')) {
      await deleteDocument(documentId);
    }
  };

  const getTypeColor = (type: string) => {
    const colors = {
      general: 'bg-blue-100 text-blue-800',
      meeting_minutes: 'bg-green-100 text-green-800',
      contract: 'bg-red-100 text-red-800',
      report: 'bg-purple-100 text-purple-800',
      proposal: 'bg-orange-100 text-orange-800',
      memo: 'bg-gray-100 text-gray-800'
    };
    return colors[type] || colors.general;
  };

  return (
    <DocumentContainer>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Google Docs Manager</h1>
            <p className="text-gray-600 mt-2">Create, manage, and collaborate on documents</p>
          </div>
          <Button 
            onClick={() => setShowCreateForm(true)}
            disabled={creating}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Document
          </Button>
        </div>

        {/* Google Authentication */}
        {!authSuccess && (
          <GoogleAuth 
            onAuthSuccess={() => setAuthSuccess(true)}
            serviceType="docs"
            edgeFunctionName="google-docs-manager"
          />
        )}

        {/* Create Document Form */}
        {showCreateForm && (
          <Card className="border-blue-200">
            <CardHeader>
              <CardTitle className="text-xl">Create New Document</CardTitle>
              <CardDescription>
                Create a new Google Doc with automatic syncing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Document Title *
                </label>
                <Input
                  value={newDocTitle}
                  onChange={(e) => setNewDocTitle(e.target.value)}
                  placeholder="Enter document title..."
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Document Type
                </label>
                <Select value={newDocType} onValueChange={setNewDocType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <Textarea
                  value={newDocDescription}
                  onChange={(e) => setNewDocDescription(e.target.value)}
                  placeholder="Enter document description..."
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={handleCreateDocument}
                  disabled={creating || !newDocTitle.trim()}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {creating ? 'Creating...' : 'Create Document'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowCreateForm(false)}
                  disabled={creating}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Documents List */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Your Documents</h2>
          
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading documents...</p>
            </div>
          ) : documents.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No documents yet</h3>
                <p className="text-gray-600 mb-4">Create your first Google Doc to get started</p>
                <Button 
                  onClick={() => setShowCreateForm(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Document
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {documents.map((doc) => (
                <Card key={doc.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg line-clamp-2">{doc.title}</CardTitle>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge className={getTypeColor(doc.document_type)}>
                            {DOCUMENT_TYPES.find(t => t.value === doc.document_type)?.label || doc.document_type}
                          </Badge>
                          {doc.shared_with && doc.shared_with.length > 0 && (
                            <Badge variant="outline" className="text-xs">
                              <Users className="h-3 w-3 mr-1" />
                              {doc.shared_with.length}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    {doc.description && (
                      <CardDescription className="line-clamp-2">
                        {doc.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  
                  <CardContent>
                    <div className="flex items-center text-sm text-gray-500 mb-4">
                      <Clock className="h-4 w-4 mr-1" />
                      <span>
                        {doc.last_synced_at 
                          ? `Synced ${formatDistanceToNow(new Date(doc.last_synced_at))} ago`
                          : `Created ${formatDistanceToNow(new Date(doc.created_at))} ago`
                        }
                      </span>
                    </div>
                    
                    <div className="flex gap-2 flex-wrap">
                      {doc.google_doc_url && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => window.open(doc.google_doc_url, '_blank')}
                          className="flex-1"
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          Open
                        </Button>
                      )}
                      
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleSyncDocument(doc.id)}
                        title="Sync with Google Docs"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                      
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {/* TODO: Implement sharing */}}
                        title="Share document"
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>
                      
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleDeleteDocument(doc.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        title="Delete document"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </DocumentContainer>
  );
};