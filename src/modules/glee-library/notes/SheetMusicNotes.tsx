import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Music, User, Crown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface SheetMusicNote {
  id: string;
  author_id: string;
  role: 'conductor' | 'composer' | 'section_leader';
  note_type: 'historical' | 'interpretive' | 'rehearsal';
  title: string;
  content: string;
  created_at: string;
  author_name?: string;
}

interface SheetMusicNotesProps {
  musicId: string;
}

export const SheetMusicNotes = ({ musicId }: SheetMusicNotesProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notes, setNotes] = useState<SheetMusicNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newNote, setNewNote] = useState({
    title: '',
    content: '',
    role: 'section_leader' as const,
    note_type: 'rehearsal' as const
  });

  useEffect(() => {
    fetchNotes();
  }, [musicId]);

  const fetchNotes = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_sheet_music_notes')
        .select('*')
        .eq('music_id', musicId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get author names separately
      const authorIds = [...new Set(data?.map(note => note.author_id) || [])];
      const { data: profiles } = await supabase
        .from('gw_profiles')
        .select('user_id, full_name')
        .in('user_id', authorIds);

      const profileMap = profiles?.reduce((acc, profile) => {
        acc[profile.user_id] = profile.full_name;
        return acc;
      }, {} as Record<string, string>) || {};

      const notesWithAuthor = data?.map(note => ({
        ...note,
        role: note.role as 'conductor' | 'composer' | 'section_leader',
        note_type: note.note_type as 'historical' | 'interpretive' | 'rehearsal',
        author_name: profileMap[note.author_id] || 'Unknown'
      })) || [];

      setNotes(notesWithAuthor);
    } catch (error) {
      console.error('Error fetching notes:', error);
      toast({
        title: "Error",
        description: "Failed to load notes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!user || !newNote.title.trim() || !newNote.content.trim()) return;

    try {
      const { error } = await supabase
        .from('gw_sheet_music_notes')
        .insert({
          music_id: musicId,
          author_id: user.id,
          ...newNote
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Note added successfully",
      });

      setNewNote({
        title: '',
        content: '',
        role: 'section_leader',
        note_type: 'rehearsal'
      });
      setShowAddDialog(false);
      fetchNotes();
    } catch (error) {
      console.error('Error adding note:', error);
      toast({
        title: "Error",
        description: "Failed to add note",
        variant: "destructive",
      });
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'conductor': return <Crown className="h-4 w-4" />;
      case 'composer': return <Music className="h-4 w-4" />;
      case 'section_leader': return <User className="h-4 w-4" />;
      default: return <User className="h-4 w-4" />;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'conductor': return 'default';
      case 'composer': return 'secondary';
      case 'section_leader': return 'outline';
      default: return 'outline';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'historical': return 'text-blue-600';
      case 'interpretive': return 'text-green-600';
      case 'rehearsal': return 'text-orange-600';
      default: return 'text-gray-600';
    }
  };

  const groupedNotes = notes.reduce((acc, note) => {
    if (!acc[note.note_type]) acc[note.note_type] = [];
    acc[note.note_type].push(note);
    return acc;
  }, {} as Record<string, SheetMusicNote[]>);

  if (loading) {
    return <div className="flex justify-center py-8">Loading notes...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Composer & Conductor Notes</h3>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button size="sm">
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Note
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Note</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={newNote.title}
                  onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
                  placeholder="Note title"
                />
              </div>
              <div>
                <Label htmlFor="role">Your Role</Label>
                <Select value={newNote.role} onValueChange={(value: any) => setNewNote({ ...newNote, role: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="section_leader">Section Leader</SelectItem>
                    <SelectItem value="conductor">Conductor</SelectItem>
                    <SelectItem value="composer">Composer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="note_type">Note Type</Label>
                <Select value={newNote.note_type} onValueChange={(value: any) => setNewNote({ ...newNote, note_type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rehearsal">Rehearsal Notes</SelectItem>
                    <SelectItem value="interpretive">Interpretive Notes</SelectItem>
                    <SelectItem value="historical">Historical Context</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  value={newNote.content}
                  onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                  placeholder="Enter your note content..."
                  rows={4}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddNote}>
                  Add Note
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {notes.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No notes have been added yet.
        </div>
      ) : (
        <Tabs defaultValue="rehearsal" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="rehearsal">Rehearsal</TabsTrigger>
            <TabsTrigger value="interpretive">Interpretive</TabsTrigger>
            <TabsTrigger value="historical">Historical</TabsTrigger>
          </TabsList>
          
          {['rehearsal', 'interpretive', 'historical'].map(type => (
            <TabsContent key={type} value={type} className="space-y-4">
              {groupedNotes[type]?.length > 0 ? (
                groupedNotes[type].map(note => (
                  <Card key={note.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{note.title}</CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge variant={getRoleBadgeVariant(note.role)} className="flex items-center gap-1">
                            {getRoleIcon(note.role)}
                            {note.role.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>By {note.author_name}</span>
                        <span>{new Date(note.created_at).toLocaleDateString()}</span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="whitespace-pre-wrap">{note.content}</p>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No {type} notes available.
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
};