import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface GoogleDocument {
  id: string;
  title: string;
  description?: string;
  google_doc_id?: string;
  google_doc_url?: string;
  document_type: string;
  content_preview?: string;
  owner_id: string;
  created_by?: string;
  shared_with?: string[];
  permissions: any;
  tags?: string[];
  status: string;
  last_synced_at?: string;
  created_at: string;
  updated_at: string;
}

export const useGoogleDocuments = () => {
  const [documents, setDocuments] = useState<GoogleDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('gw_documents')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast({
        title: "Error",
        description: "Failed to fetch documents.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createDocument = async (
    title: string, 
    description?: string, 
    documentType: string = 'general',
    tags: string[] = []
  ) => {
    try {
      setCreating(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // First create the document record
      const { data: documentData, error: documentError } = await supabase
        .from('gw_documents')
        .insert({
          title,
          description,
          document_type: documentType,
          owner_id: user.id,
          created_by: user.id,
          tags,
          permissions: { public_read: false, public_write: false }
        })
        .select()
        .single();

      if (documentError) throw documentError;

      // Then create the Google Doc
      const { data: googleDocData, error: googleDocError } = await supabase.functions.invoke(
        'google-docs-manager',
        {
          body: {
            action: 'create',
            title,
            content: description || `# ${title}\n\nStart writing your document here...`,
            documentId: documentData.id
          }
        }
      );

      if (googleDocError) throw googleDocError;

      if (googleDocData.needsAuth) {
        toast({
          title: "Authentication Required",
          description: "Please authenticate with Google first.",
          variant: "destructive"
        });
        return null;
      }

      // Update the document with Google Doc info
      const { error: updateError } = await supabase
        .from('gw_documents')
        .update({
          google_doc_id: googleDocData.documentId,
          google_doc_url: googleDocData.documentUrl,
          last_synced_at: new Date().toISOString()
        })
        .eq('id', documentData.id);

      if (updateError) throw updateError;

      toast({
        title: "Document Created",
        description: `"${title}" has been created successfully.`
      });

      // Refresh documents list
      await fetchDocuments();

      return {
        ...documentData,
        google_doc_id: googleDocData.documentId,
        google_doc_url: googleDocData.documentUrl
      };

    } catch (error) {
      console.error('Error creating document:', error);
      toast({
        title: "Creation Failed",
        description: error.message || "Failed to create document.",
        variant: "destructive"
      });
      return null;
    } finally {
      setCreating(false);
    }
  };

  const syncDocument = async (documentId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke(
        'google-docs-manager',
        {
          body: {
            action: 'sync',
            documentId
          }
        }
      );

      if (error) throw error;

      if (data.needsAuth) {
        toast({
          title: "Authentication Required",
          description: "Please authenticate with Google first.",
          variant: "destructive"
        });
        return false;
      }

      toast({
        title: "Document Synced",
        description: "Document content has been synchronized."
      });

      await fetchDocuments();
      return true;

    } catch (error) {
      console.error('Error syncing document:', error);
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync document.",
        variant: "destructive"
      });
      return false;
    }
  };

  const shareDocument = async (documentId: string, userIds: string[], permissionType: 'read' | 'write' = 'read') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Update the shared_with array
      const { error: updateError } = await supabase
        .from('gw_documents')
        .update({
          shared_with: userIds,
          updated_at: new Date().toISOString()
        })
        .eq('id', documentId);

      if (updateError) throw updateError;

      // Create sharing records
      const shareRecords = userIds.map(userId => ({
        document_id: documentId,
        user_id: userId,
        permission_type: permissionType,
        granted_by: user.id
      }));

      const { error: shareError } = await supabase
        .from('gw_document_shares')
        .upsert(shareRecords, { onConflict: 'document_id,user_id' });

      if (shareError) throw shareError;

      toast({
        title: "Document Shared",
        description: `Document shared with ${userIds.length} user(s).`
      });

      await fetchDocuments();
      return true;

    } catch (error) {
      console.error('Error sharing document:', error);
      toast({
        title: "Sharing Failed",
        description: error.message || "Failed to share document.",
        variant: "destructive"
      });
      return false;
    }
  };

  const deleteDocument = async (documentId: string) => {
    try {
      const { error } = await supabase
        .from('gw_documents')
        .update({ status: 'deleted' })
        .eq('id', documentId);

      if (error) throw error;

      toast({
        title: "Document Deleted",
        description: "Document has been moved to trash."
      });

      await fetchDocuments();
      return true;

    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete document.",
        variant: "destructive"
      });
      return false;
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  return {
    documents,
    loading,
    creating,
    createDocument,
    syncDocument,
    shareDocument,
    deleteDocument,
    refetch: fetchDocuments
  };
};