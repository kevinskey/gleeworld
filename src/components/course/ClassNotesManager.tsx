import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Plus, FileText, Upload, Trash2, Download, Pin, Eye, EyeOff, BookOpen, GraduationCap, User, Loader2, Video, ExternalLink, Pencil, X, Share2, ChevronRight } from 'lucide-react';
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
  const [viewingNote, setViewingNote] = useState<ClassNote | null>(null);
  const [editingNote, setEditingNote] = useState<ClassNote | null>(null);
  
  // Form state for create
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState<'instructor_only' | 'all_students' | 'private'>('private');
  const [noteType, setNoteType] = useState<'lecture' | 'study' | 'personal' | 'resource'>('lecture');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState('');

  // Edit form state
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editVisibility, setEditVisibility] = useState<'instructor_only' | 'all_students' | 'private'>('private');
  const [editNoteType, setEditNoteType] = useState<'lecture' | 'study' | 'personal' | 'resource'>('lecture');
  const [editVideoUrl, setEditVideoUrl] = useState('');

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

  // Update note mutation
  const updateNoteMutation = useMutation({
    mutationFn: async ({ noteId, updates }: { noteId: string; updates: Partial<ClassNote> }) => {
      const { error } = await supabase
        .from('class_notes')
        .update(updates)
        .eq('id', noteId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-notes', courseId] });
      toast.success('Note updated');
      setEditingNote(null);
      setViewingNote(null);
    },
    onError: (error) => {
      toast.error('Failed to update note: ' + error.message);
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
      setViewingNote(null);
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
      return { url: publicUrl, name: selectedFile.name, type: selectedFile.type };
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

  const openEditMode = (note: ClassNote) => {
    setEditTitle(note.title);
    setEditContent(note.content || '');
    setEditVisibility(note.visibility);
    setEditNoteType(note.note_type);
    setEditVideoUrl(note.video_url || '');
    setEditingNote(note);
  };

  const handleSaveEdit = () => {
    if (!editingNote || !editTitle.trim()) return;
    updateNoteMutation.mutate({
      noteId: editingNote.id,
      updates: {
        title: editTitle,
        content: editContent || null,
        visibility: editVisibility,
        note_type: editNoteType,
        video_url: editVideoUrl.trim() || null,
      }
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
      case 'all_students': return 'Shared';
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

  const getNoteTypeLabel = (type: string) => {
    switch (type) {
      case 'lecture': return 'Lecture';
      case 'study': return 'Study';
      case 'resource': return 'Resource';
      default: return 'Personal';
    }
  };

  const isOwner = (note: ClassNote) => note.user_id === currentUser?.id;

  const filteredNotes = notes.filter(note => {
    // Students can see: their own notes + shared notes + instructor shared notes
    // Instructors can see all
    if (!isInstructor && !isOwner(note) && note.visibility !== 'all_students') {
      if (note.visibility === 'instructor_only') return false;
      if (note.visibility === 'private') return false;
    }
    if (activeTab === 'all') return true;
    if (activeTab === 'mine') return isOwner(note);
    if (activeTab === 'shared') return note.visibility === 'all_students';
    if (activeTab === 'pinned') return note.is_pinned;
    return note.note_type === activeTab;
  });

  // ─── Create Note Dialog Content ─────────────────────────────
  const createNoteForm = (
    <div className="space-y-4 pt-4">
      <div className="space-y-2">
        <Label>Title</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter note title..." />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Type</Label>
          <Select value={noteType} onValueChange={(v: any) => setNoteType(v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
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
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="private">Private</SelectItem>
              <SelectItem value="all_students">Share with Class</SelectItem>
              {isInstructor && <SelectItem value="instructor_only">Instructors Only</SelectItem>}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Content</Label>
        <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Write your notes here..." rows={6} />
      </div>
      <div className="space-y-2">
        <Label>Video Link (Optional)</Label>
        <div className="flex items-center gap-2">
          <Video className="h-4 w-4 text-muted-foreground" />
          <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Attach File (Optional)</Label>
        <div className="border-2 border-dashed rounded-lg p-4 text-center">
          <input type="file" id="file-upload" className="hidden" accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.mp3,.wav" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
          <label htmlFor="file-upload" className="cursor-pointer">
            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            {selectedFile ? <p className="text-sm font-medium">{selectedFile.name}</p> : <p className="text-sm text-muted-foreground">Click to upload PDF, DOC, images, or audio</p>}
          </label>
        </div>
      </div>
      <Button onClick={handleCreateNote} className="w-full" disabled={createNoteMutation.isPending || uploading}>
        {(createNoteMutation.isPending || uploading) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Create Note
      </Button>
    </div>
  );

  // ─── Note Card ───────────────────────────────────────────────
  const renderNoteCard = (note: ClassNote) => (
    <Card
      key={note.id}
      className={`relative cursor-pointer hover:shadow-md transition-shadow ${note.is_pinned ? 'ring-2 ring-primary' : ''}`}
      onClick={() => setViewingNote(note)}
    >
      {note.is_pinned && (
        <div className="absolute -top-2 -right-2 z-10">
          <Badge className="bg-primary"><Pin className="h-3 w-3" /></Badge>
        </div>
      )}
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {getNoteTypeIcon(note.note_type)}
            <CardTitle className="text-base line-clamp-1">{note.title}</CardTitle>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
        </div>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <Badge variant="outline" className="text-xs">
            {getVisibilityIcon(note.visibility)}
            <span className="ml-1">{getVisibilityLabel(note.visibility)}</span>
          </Badge>
          <Badge variant="secondary" className="text-xs">{getNoteTypeLabel(note.note_type)}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {note.content && <p className="text-sm text-muted-foreground line-clamp-3 mb-3">{note.content}</p>}
        {note.video_url && (
          <div className="flex items-center gap-2 p-2 bg-red-500/10 text-red-600 dark:text-red-400 rounded-md mb-3">
            <Video className="h-4 w-4" />
            <span className="text-sm truncate flex-1">Video attached</span>
          </div>
        )}
        {note.file_name && (
          <div className="flex items-center gap-2 p-2 bg-muted rounded-md mb-3">
            <FileText className="h-4 w-4" />
            <span className="text-sm truncate flex-1">{note.file_name}</span>
          </div>
        )}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{format(new Date(note.created_at), 'MMM d, yyyy')}</span>
          {isOwner(note) && <Badge variant="outline" className="text-[10px]">You</Badge>}
        </div>
      </CardContent>
    </Card>
  );

  // ─── View / Detail Dialog ───────────────────────────────────
  const viewDialog = (
    <Dialog open={!!viewingNote && !editingNote} onOpenChange={(open) => { if (!open) setViewingNote(null); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        {viewingNote && (
          <>
            <DialogHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <DialogTitle className="text-xl break-words">{viewingNote.title}</DialogTitle>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <Badge variant="outline" className="text-xs">
                      {getVisibilityIcon(viewingNote.visibility)}
                      <span className="ml-1">{getVisibilityLabel(viewingNote.visibility)}</span>
                    </Badge>
                    <Badge variant="secondary" className="text-xs">{getNoteTypeLabel(viewingNote.note_type)}</Badge>
                    {viewingNote.is_pinned && <Badge className="bg-primary text-xs"><Pin className="h-3 w-3 mr-1" />Pinned</Badge>}
                    <span className="text-xs text-muted-foreground">{format(new Date(viewingNote.created_at), 'MMM d, yyyy h:mm a')}</span>
                  </div>
                </div>
              </div>
            </DialogHeader>
            <ScrollArea className="flex-1 mt-4">
              <div className="space-y-4 pr-4">
                {viewingNote.content && (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <p className="whitespace-pre-wrap text-foreground">{viewingNote.content}</p>
                  </div>
                )}
                {viewingNote.video_url && (
                  <a href={viewingNote.video_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 p-3 bg-red-500/10 text-red-600 dark:text-red-400 rounded-md hover:bg-red-500/20 transition-colors">
                    <Video className="h-5 w-5" />
                    <span className="text-sm flex-1">Watch Video</span>
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
                {viewingNote.file_name && (
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                    <FileText className="h-5 w-5" />
                    <span className="text-sm truncate flex-1">{viewingNote.file_name}</span>
                    {viewingNote.file_url && (
                      <a href={viewingNote.file_url} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="outline"><Download className="h-4 w-4 mr-1" />Download</Button>
                      </a>
                    )}
                  </div>
                )}
              </div>
            </ScrollArea>
            {/* Action bar - owner can edit, pin, share, delete */}
            {isOwner(viewingNote) && (
              <DialogFooter className="flex-row flex-wrap gap-2 pt-4 border-t border-border sm:justify-start">
                <Button size="sm" variant="outline" onClick={() => openEditMode(viewingNote)}>
                  <Pencil className="h-4 w-4 mr-1" />Edit
                </Button>
                <Button size="sm" variant="outline"
                  onClick={() => togglePinMutation.mutate({ noteId: viewingNote.id, isPinned: viewingNote.is_pinned })}>
                  <Pin className={`h-4 w-4 mr-1 ${viewingNote.is_pinned ? 'fill-current' : ''}`} />
                  {viewingNote.is_pinned ? 'Unpin' : 'Pin'}
                </Button>
                <Button size="sm" variant="outline"
                  onClick={() => {
                    const newVis = viewingNote.visibility === 'all_students' ? 'private' : 'all_students';
                    updateNoteMutation.mutate({ noteId: viewingNote.id, updates: { visibility: newVis } });
                  }}>
                  <Share2 className="h-4 w-4 mr-1" />
                  {viewingNote.visibility === 'all_students' ? 'Make Private' : 'Share with Class'}
                </Button>
                <Button size="sm" variant="destructive"
                  onClick={() => { if (confirm('Delete this note?')) deleteNoteMutation.mutate(viewingNote.id); }}>
                  <Trash2 className="h-4 w-4 mr-1" />Delete
                </Button>
              </DialogFooter>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );

  // ─── Edit Dialog ────────────────────────────────────────────
  const editDialog = (
    <Dialog open={!!editingNote} onOpenChange={(open) => { if (!open) setEditingNote(null); }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Note</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={editNoteType} onValueChange={(v: any) => setEditNoteType(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
              <Select value={editVisibility} onValueChange={(v: any) => setEditVisibility(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Private</SelectItem>
                  <SelectItem value="all_students">Share with Class</SelectItem>
                  {isInstructor && <SelectItem value="instructor_only">Instructors Only</SelectItem>}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Content</Label>
            <Textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={8} />
          </div>
          <div className="space-y-2">
            <Label>Video Link (Optional)</Label>
            <Input value={editVideoUrl} onChange={(e) => setEditVideoUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSaveEdit} disabled={updateNoteMutation.isPending} className="flex-1">
              {updateNoteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
            <Button variant="outline" onClick={() => setEditingNote(null)}>Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Class Notes</h2>
          <p className="text-sm text-muted-foreground">View, create, and share notes with your class</p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />New Note</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Create New Note</DialogTitle></DialogHeader>
            {createNoteForm}
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <ScrollArea className="w-full">
          <TabsList className="inline-flex w-max">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="mine">My Notes</TabsTrigger>
            <TabsTrigger value="shared">Shared</TabsTrigger>
            <TabsTrigger value="lecture">Lectures</TabsTrigger>
            <TabsTrigger value="pinned">Pinned</TabsTrigger>
          </TabsList>
        </ScrollArea>

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
                  <Plus className="h-4 w-4 mr-2" />Create Note
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredNotes.map(renderNoteCard)}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {viewDialog}
      {editDialog}
    </div>
  );
};
