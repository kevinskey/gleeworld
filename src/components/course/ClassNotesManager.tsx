import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Plus, FileText, Upload, Trash2, Download, Pin, Eye, EyeOff, BookOpen, GraduationCap, User, Loader2, Video, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';

interface ClassNote {
  id: string;
  course_id: string;
  user_id: string;
  title: string;
  content: string | null;
  file_url: string | null;
  file_name: string | null;
  file_type: string | null;
  video_url: string | null;
  visibility: 'instructor_only' | 'all_students' | 'private';
  note_type: 'lecture' | 'study' | 'personal' | 'resource';
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

interface ClassNotesManagerProps {
  courseId: string;
  isInstructor?: boolean;
}

export const ClassNotesManager = ({ courseId, isInstructor = false }: ClassNotesManagerProps) => {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [uploading, setUploading] = useState(false);
  
  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState<'instructor_only' | 'all_students' | 'private'>('private');
  const [noteType, setNoteType] = useState<'lecture' | 'study' | 'personal' | 'resource'>('lecture');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState('');
  // Fetch current user
  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    }
  });

  // Fetch notes
  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['class-notes', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('class_notes')
        .select('*')
        .eq('course_id', courseId)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as ClassNote[];
    },
    enabled: !!courseId
  });

  // Create note mutation
  const createNoteMutation = useMutation({
    mutationFn: async (noteData: { title: string; content: string; visibility: string; noteType: string; fileUrl?: string; fileName?: string; fileType?: string; videoUrl?: string }) => {
      if (!currentUser) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('class_notes')
        .insert({
          course_id: courseId,
          user_id: currentUser.id,
          title: noteData.title,
          content: noteData.content || null,
          visibility: noteData.visibility,
          note_type: noteData.noteType,
          file_url: noteData.fileUrl || null,
          file_name: noteData.fileName || null,
          file_type: noteData.fileType || null,
          video_url: noteData.videoUrl || null
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-notes', courseId] });
      toast.success('Note created successfully');
      resetForm();
      setIsCreateOpen(false);
    },
    onError: (error) => {
      toast.error('Failed to create note: ' + error.message);
    }
  });

  // Delete note mutation
  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      const { error } = await supabase
        .from('class_notes')
        .delete()
        .eq('id', noteId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-notes', courseId] });
      toast.success('Note deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete note: ' + error.message);
    }
  });

  // Toggle pin mutation
  const togglePinMutation = useMutation({
    mutationFn: async ({ noteId, isPinned }: { noteId: string; isPinned: boolean }) => {
      const { error } = await supabase
        .from('class_notes')
        .update({ is_pinned: !isPinned })
        .eq('id', noteId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-notes', courseId] });
    }
  });

  const resetForm = () => {
    setTitle('');
    setContent('');
    setVisibility('private');
    setNoteType('lecture');
    setSelectedFile(null);
    setVideoUrl('');
  };

  const handleFileUpload = async (): Promise<{ url: string; name: string; type: string } | null> => {
    if (!selectedFile || !currentUser) return null;
    
    setUploading(true);
    try {
      const fileExt = selectedFile.name.split('.').pop();
      const filePath = `${currentUser.id}/${courseId}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('class-notes')
        .upload(filePath, selectedFile);
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('class-notes')
        .getPublicUrl(filePath);
      
      return {
        url: publicUrl,
        name: selectedFile.name,
        type: selectedFile.type
      };
    } catch (error: any) {
      toast.error('Failed to upload file: ' + error.message);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleCreateNote = async () => {
    if (!title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    let fileData = null;
    if (selectedFile) {
      fileData = await handleFileUpload();
    }

    createNoteMutation.mutate({
      title,
      content,
      visibility,
      noteType,
      fileUrl: fileData?.url,
      fileName: fileData?.name,
      fileType: fileData?.type,
      videoUrl: videoUrl.trim() || undefined
    });
  };

  const getVisibilityIcon = (vis: string) => {
    switch (vis) {
      case 'all_students': return <Eye className="h-3 w-3" />;
      case 'instructor_only': return <GraduationCap className="h-3 w-3" />;
      default: return <EyeOff className="h-3 w-3" />;
    }
  };

  const getVisibilityLabel = (vis: string) => {
    switch (vis) {
      case 'all_students': return 'Shared with Students';
      case 'instructor_only': return 'Instructors Only';
      default: return 'Private';
    }
  };

  const getNoteTypeIcon = (type: string) => {
    switch (type) {
      case 'lecture': return <BookOpen className="h-4 w-4" />;
      case 'study': return <GraduationCap className="h-4 w-4" />;
      case 'resource': return <FileText className="h-4 w-4" />;
      default: return <User className="h-4 w-4" />;
    }
  };

  const filteredNotes = notes.filter(note => {
    if (activeTab === 'all') return true;
    if (activeTab === 'mine') return note.user_id === currentUser?.id;
    if (activeTab === 'shared') return note.visibility === 'all_students';
    if (activeTab === 'pinned') return note.is_pinned;
    return note.note_type === activeTab;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Class Notes</h2>
          <p className="text-muted-foreground">Manage lecture notes, study materials, and resources</p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Note
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create New Note</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter note title..."
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={noteType} onValueChange={(v: any) => setNoteType(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lecture">Lecture Notes</SelectItem>
                      <SelectItem value="study">Study Material</SelectItem>
                      <SelectItem value="resource">Resource</SelectItem>
                      <SelectItem value="personal">Personal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Visibility</Label>
                  <Select value={visibility} onValueChange={(v: any) => setVisibility(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="private">Private</SelectItem>
                      <SelectItem value="all_students">Share with Students</SelectItem>
                      {isInstructor && <SelectItem value="instructor_only">Instructors Only</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Content</Label>
                <Textarea 
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write your notes here..."
                  rows={6}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Video Link (Optional)</Label>
                <div className="flex items-center gap-2">
                  <Video className="h-4 w-4 text-muted-foreground" />
                  <Input 
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://youtube.com/watch?v=... or Vimeo link"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Attach File (Optional)</Label>
                <div className="border-2 border-dashed rounded-lg p-4 text-center">
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.mp3,.wav"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    {selectedFile ? (
                      <p className="text-sm font-medium">{selectedFile.name}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground">Click to upload PDF, DOC, images, or audio</p>
                    )}
                  </label>
                </div>
              </div>
              
              <Button 
                onClick={handleCreateNote} 
                className="w-full"
                disabled={createNoteMutation.isPending || uploading}
              >
                {(createNoteMutation.isPending || uploading) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Note
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All Notes</TabsTrigger>
          <TabsTrigger value="mine">My Notes</TabsTrigger>
          <TabsTrigger value="shared">Shared</TabsTrigger>
          <TabsTrigger value="lecture">Lectures</TabsTrigger>
          <TabsTrigger value="pinned">Pinned</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredNotes.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No notes yet</h3>
                <p className="text-muted-foreground mb-4">Create your first note to get started</p>
                <Button onClick={() => setIsCreateOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Note
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredNotes.map((note) => (
                <Card key={note.id} className={`relative ${note.is_pinned ? 'ring-2 ring-primary' : ''}`}>
                  {note.is_pinned && (
                    <div className="absolute -top-2 -right-2">
                      <Badge className="bg-primary">
                        <Pin className="h-3 w-3" />
                      </Badge>
                    </div>
                  )}
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {getNoteTypeIcon(note.note_type)}
                        <CardTitle className="text-base line-clamp-1">{note.title}</CardTitle>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        {getVisibilityIcon(note.visibility)}
                        <span className="ml-1">{getVisibilityLabel(note.visibility)}</span>
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {note.content && (
                      <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                        {note.content}
                      </p>
                    )}
                    
                    {note.video_url && (
                      <a 
                        href={note.video_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-2 bg-red-500/10 text-red-600 dark:text-red-400 rounded-md mb-3 hover:bg-red-500/20 transition-colors"
                      >
                        <Video className="h-4 w-4" />
                        <span className="text-sm truncate flex-1">Watch Video</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    
                    {note.file_name && (
                      <div className="flex items-center gap-2 p-2 bg-muted rounded-md mb-3">
                        <FileText className="h-4 w-4" />
                        <span className="text-sm truncate flex-1">{note.file_name}</span>
                        {note.file_url && (
                          <a href={note.file_url} target="_blank" rel="noopener noreferrer">
                            <Button size="icon" variant="ghost" className="h-6 w-6">
                              <Download className="h-3 w-3" />
                            </Button>
                          </a>
                        )}
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{format(new Date(note.created_at), 'MMM d, yyyy')}</span>
                      
                      {note.user_id === currentUser?.id && (
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => togglePinMutation.mutate({ noteId: note.id, isPinned: note.is_pinned })}
                          >
                            <Pin className={`h-3 w-3 ${note.is_pinned ? 'fill-current' : ''}`} />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-destructive"
                            onClick={() => {
                              if (confirm('Delete this note?')) {
                                deleteNoteMutation.mutate(note.id);
                              }
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
