import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { FileText, Plus, Trash2, Download, Upload, FileIcon } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CourseDocument {
  id: string;
  title: string;
  description: string | null;
  document_path: string;
  file_type: string | null;
  file_size: number | null;
  category: 'syllabus' | 'handout' | 'reading' | 'general';
  display_order: number;
}

interface CourseDocumentsSectionProps {
  courseId: string;
}

export function CourseDocumentsSection({ courseId }: CourseDocumentsSectionProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newDoc, setNewDoc] = useState({
    title: '',
    description: '',
    category: 'general' as CourseDocument['category'],
  });

  const isAdmin = (user as any)?.is_admin || (user as any)?.is_super_admin;

  // Fetch course documents
  const { data: documents, isLoading } = useQuery({
    queryKey: ['course-documents', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_documents')
        .select('*')
        .eq('course_id', courseId)
        .eq('is_published', true)
        .order('category', { ascending: true })
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as CourseDocument[];
    },
  });

  // Add document mutation
  const addDocumentMutation = useMutation({
    mutationFn: async (docData: typeof newDoc & { file: File }) => {
      const fileName = `${courseId}/${Date.now()}-${docData.file.name}`;
      
      // Upload file
      const { error: uploadError } = await supabase.storage
        .from('course-documents')
        .upload(fileName, docData.file);

      if (uploadError) throw uploadError;

      // Create database record
      const { data, error } = await supabase
        .from('course_documents')
        .insert([
          {
            course_id: courseId,
            title: docData.title,
            description: docData.description,
            document_path: fileName,
            file_type: docData.file.type,
            file_size: docData.file.size,
            category: docData.category,
            created_by: user?.id,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-documents', courseId] });
      toast.success('Document added successfully');
      setIsAddDialogOpen(false);
      setNewDoc({ title: '', description: '', category: 'general' });
    },
    onError: (error) => {
      toast.error('Failed to add document');
      console.error(error);
    },
  });

  // Delete document mutation
  const deleteDocumentMutation = useMutation({
    mutationFn: async (doc: CourseDocument) => {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('course-documents')
        .remove([doc.document_path]);

      if (storageError) throw storageError;

      // Delete database record
      const { error } = await supabase
        .from('course_documents')
        .delete()
        .eq('id', doc.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-documents', courseId] });
      toast.success('Document deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete document');
      console.error(error);
    },
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!newDoc.title) {
      toast.error('Please enter a title first');
      return;
    }

    addDocumentMutation.mutate({ ...newDoc, file });
  };

  const getDocumentUrl = (documentPath: string) => {
    const { data } = supabase.storage
      .from('course-documents')
      .getPublicUrl(documentPath);
    return data.publicUrl;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
    const kb = bytes / 1024;
    const mb = kb / 1024;
    if (mb >= 1) return `${mb.toFixed(2)} MB`;
    return `${kb.toFixed(2)} KB`;
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'syllabus': return 'bg-blue-500/10 text-blue-500';
      case 'handout': return 'bg-green-500/10 text-green-500';
      case 'reading': return 'bg-purple-500/10 text-purple-500';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  // Group documents by category
  const groupedDocs = documents?.reduce((acc, doc) => {
    if (!acc[doc.category]) acc[doc.category] = [];
    acc[doc.category].push(doc);
    return acc;
  }, {} as Record<string, CourseDocument[]>);

  if (isLoading) {
    return <div className="text-center py-8">Loading documents...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Course Documents
          </CardTitle>
          {isAdmin && (
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Document
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Course Document</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Title</label>
                    <Input
                      value={newDoc.title}
                      onChange={(e) => setNewDoc({ ...newDoc, title: e.target.value })}
                      placeholder="Document title"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Description</label>
                    <Textarea
                      value={newDoc.description}
                      onChange={(e) => setNewDoc({ ...newDoc, description: e.target.value })}
                      placeholder="Document description"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Category</label>
                    <Select
                      value={newDoc.category}
                      onValueChange={(value: CourseDocument['category']) =>
                        setNewDoc({ ...newDoc, category: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="syllabus">Syllabus</SelectItem>
                        <SelectItem value="handout">Handout</SelectItem>
                        <SelectItem value="reading">Reading</SelectItem>
                        <SelectItem value="general">General</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Document File (PDF, DOCX, etc.)</label>
                    <Input
                      type="file"
                      accept=".pdf,.doc,.docx,.txt"
                      onChange={handleFileUpload}
                      disabled={!newDoc.title || addDocumentMutation.isPending}
                    />
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {documents && documents.length > 0 ? (
          <div className="space-y-6">
            {Object.entries(groupedDocs || {}).map(([category, docs]) => (
              <div key={category}>
                <h3 className="font-semibold text-sm uppercase text-muted-foreground mb-3">
                  {category}
                </h3>
                <div className="space-y-2">
                  {docs.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start gap-3 flex-1">
                        <FileIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{doc.title}</h4>
                          {doc.description && (
                            <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                              {doc.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className={getCategoryColor(doc.category)}>
                              {doc.category}
                            </Badge>
                            {doc.file_size && (
                              <span className="text-xs text-muted-foreground">
                                {formatFileSize(doc.file_size)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(getDocumentUrl(doc.document_path), '_blank')}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                        {isAdmin && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteDocumentMutation.mutate(doc)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No course documents available yet
          </div>
        )}
      </CardContent>
    </Card>
  );
}
