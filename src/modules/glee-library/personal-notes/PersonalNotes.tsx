import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Edit, Trash2, PlusCircle, StickyNote } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface PersonalNote {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

interface PersonalNotesProps {
  musicId: string;
}

export const PersonalNotes = ({ musicId }: PersonalNotesProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notes, setNotes] = useState<PersonalNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingNote, setEditingNote] = useState<PersonalNote | null>(null);
  const [noteForm, setNoteForm] = useState({
    title: '',
    content: ''
  });

  useEffect(() => {
    fetchNotes();
  }, [musicId]);

  const fetchNotes = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('gw_personal_notes')
        .select('*')
        .eq('music_id', musicId)
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (error) {
      console.error('Error fetching personal notes:', error);
      toast({
        title: "Error",
        description: "Failed to load your notes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNote = async () => {
    if (!user || !noteForm.title.trim() || !noteForm.content.trim()) return;

    try {
      if (editingNote) {
        // Update existing note
        const { error } = await supabase
          .from('gw_personal_notes')
          .update({
            title: noteForm.title,
            content: noteForm.content
          })
          .eq('id', editingNote.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Note updated successfully",
        });
      } else {
        // Create new note
        const { error } = await supabase
          .from('gw_personal_notes')
          .insert({
            music_id: musicId,
            user_id: user.id,
            title: noteForm.title,
            content: noteForm.content
          });

        if (error) throw error;

        toast({
          title: "Success",
          description: "Note created successfully",
        });
      }

      setNoteForm({ title: '', content: '' });
      setEditingNote(null);
      setShowDialog(false);
      fetchNotes();
    } catch (error) {
      console.error('Error saving note:', error);
      toast({
        title: "Error",
        description: "Failed to save note",
        variant: "destructive",
      });
    }
  };

  const handleEditNote = (note: PersonalNote) => {
    setEditingNote(note);
    setNoteForm({
      title: note.title,
      content: note.content
    });
    setShowDialog(true);
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      const { error } = await supabase
        .from('gw_personal_notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Note deleted successfully",
      });
      fetchNotes();
    } catch (error) {
      console.error('Error deleting note:', error);
      toast({
        title: "Error",
        description: "Failed to delete note",
        variant: "destructive",
      });
    }
  };

  const openNewNoteDialog = () => {
    setEditingNote(null);
    setNoteForm({ title: '', content: '' });
    setShowDialog(true);
  };

  if (loading) {
    return <div className="flex justify-center py-8">Loading your notes...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <StickyNote className="h-5 w-5" />
          My Personal Notes
        </h3>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={openNewNoteDialog}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Note
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingNote ? 'Edit Note' : 'Add Personal Note'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={noteForm.title}
                  onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })}
                  placeholder="Note title"
                />
              </div>
              <div>
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  value={noteForm.content}
                  onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })}
                  placeholder="Write your personal notes here..."
                  rows={6}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveNote}>
                  {editingNote ? 'Update' : 'Save'} Note
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {notes.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <StickyNote className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No personal notes yet.</p>
          <p className="text-sm">Add your first note to get started!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map(note => (
            <Card key={note.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{note.title}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditNote(note)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteNote(note.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  {note.updated_at !== note.created_at ? 'Updated' : 'Created'} on{' '}
                  {new Date(note.updated_at).toLocaleDateString()}
                </div>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm">{note.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};