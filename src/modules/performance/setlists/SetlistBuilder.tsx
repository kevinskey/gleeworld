import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Music2, 
  Calendar, 
  GripVertical, 
  X,
  Download,
  Eye,
  Lock,
  Globe
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
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
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from 'react-beautiful-dnd';

interface Setlist {
  id: string;
  title: string;
  concert_name: string;
  event_date: string | null;
  description: string | null;
  venue: string | null;
  is_published: boolean;
  created_at: string;
}

interface SetlistItem {
  id: string;
  setlist_id: string;
  music_id: string;
  order_index: number;
  voice_part_notes: string | null;
  tempo_notes: string | null;
  staging_notes: string | null;
  music: {
    title: string;
    composer: string | null;
    arranger: string | null;
    voice_parts: string[] | null;
  };
}

interface SheetMusic {
  id: string;
  title: string;
  composer: string | null;
  arranger: string | null;
  voice_parts: string[] | null;
}

export const SetlistBuilder = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [setlists, setSetlists] = useState<Setlist[]>([]);
  const [selectedSetlist, setSelectedSetlist] = useState<Setlist | null>(null);
  const [setlistItems, setSetlistItems] = useState<SetlistItem[]>([]);
  const [availableMusic, setAvailableMusic] = useState<SheetMusic[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newSetlist, setNewSetlist] = useState({
    title: '',
    concert_name: '',
    event_date: '',
    description: '',
    venue: ''
  });

  useEffect(() => {
    fetchSetlists();
    fetchAvailableMusic();
  }, []);

  useEffect(() => {
    if (selectedSetlist) {
      fetchSetlistItems(selectedSetlist.id);
    }
  }, [selectedSetlist]);

  const fetchSetlists = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_setlists')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSetlists(data || []);
    } catch (error) {
      console.error('Error fetching setlists:', error);
      toast({
        title: 'Error',
        description: 'Failed to load setlists',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSetlistItems = async (setlistId: string) => {
    try {
      const { data, error } = await supabase
        .from('gw_setlist_items')
        .select(`
          *,
          music:gw_sheet_music(title, composer, arranger, voice_parts)
        `)
        .eq('setlist_id', setlistId)
        .order('order_index');

      if (error) throw error;
      setSetlistItems(data || []);
    } catch (error) {
      console.error('Error fetching setlist items:', error);
      toast({
        title: 'Error',
        description: 'Failed to load setlist items',
        variant: 'destructive'
      });
    }
  };

  const fetchAvailableMusic = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_sheet_music')
        .select('id, title, composer, arranger, voice_parts')
        .order('title');

      if (error) throw error;
      setAvailableMusic(data || []);
    } catch (error) {
      console.error('Error fetching music:', error);
    }
  };

  const createSetlist = async () => {
    if (!newSetlist.title || !newSetlist.concert_name) {
      toast({
        title: 'Error',
        description: 'Title and concert name are required',
        variant: 'destructive'
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('gw_setlists')
        .insert({
          title: newSetlist.title,
          concert_name: newSetlist.concert_name,
          event_date: newSetlist.event_date || null,
          description: newSetlist.description || null,
          venue: newSetlist.venue || null,
          created_by: user?.id
        })
        .select()
        .single();

      if (error) throw error;

      setSetlists([data, ...setlists]);
      setNewSetlist({
        title: '',
        concert_name: '',
        event_date: '',
        description: '',
        venue: ''
      });
      setCreateDialogOpen(false);
      
      toast({
        title: 'Success',
        description: 'Setlist created successfully'
      });
    } catch (error) {
      console.error('Error creating setlist:', error);
      toast({
        title: 'Error',
        description: 'Failed to create setlist',
        variant: 'destructive'
      });
    }
  };

  const addMusicToSetlist = async (musicId: string) => {
    if (!selectedSetlist) return;

    const nextOrderIndex = setlistItems.length;

    try {
      const { data, error } = await supabase
        .from('gw_setlist_items')
        .insert({
          setlist_id: selectedSetlist.id,
          music_id: musicId,
          order_index: nextOrderIndex
        })
        .select(`
          *,
          music:gw_sheet_music(title, composer, arranger, voice_parts)
        `)
        .single();

      if (error) throw error;

      setSetlistItems([...setlistItems, data]);
      toast({
        title: 'Success',
        description: 'Music added to setlist'
      });
    } catch (error) {
      console.error('Error adding music:', error);
      toast({
        title: 'Error',
        description: 'Failed to add music to setlist',
        variant: 'destructive'
      });
    }
  };

  const removeFromSetlist = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('gw_setlist_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      setSetlistItems(setlistItems.filter(item => item.id !== itemId));
      toast({
        title: 'Success',
        description: 'Music removed from setlist'
      });
    } catch (error) {
      console.error('Error removing music:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove music',
        variant: 'destructive'
      });
    }
  };

  const togglePublished = async (setlist: Setlist) => {
    try {
      const { error } = await supabase
        .from('gw_setlists')
        .update({ is_published: !setlist.is_published })
        .eq('id', setlist.id);

      if (error) throw error;

      setSetlists(setlists.map(s => 
        s.id === setlist.id 
          ? { ...s, is_published: !s.is_published }
          : s
      ));

      if (selectedSetlist?.id === setlist.id) {
        setSelectedSetlist({ ...selectedSetlist, is_published: !selectedSetlist.is_published });
      }

      toast({
        title: 'Success',
        description: `Setlist ${setlist.is_published ? 'unpublished' : 'published'}`
      });
    } catch (error) {
      console.error('Error updating setlist:', error);
      toast({
        title: 'Error',
        description: 'Failed to update setlist',
        variant: 'destructive'
      });
    }
  };

  const reorderItems = async (result: DropResult) => {
    if (!result.destination) return;

    const newItems = Array.from(setlistItems);
    const [movedItem] = newItems.splice(result.source.index, 1);
    newItems.splice(result.destination.index, 0, movedItem);

    // Update order indices
    const updates = newItems.map((item, index) => ({
      ...item,
      order_index: index
    }));

    setSetlistItems(updates);

    // Update in database
    try {
      const updatePromises = updates.map(item => 
        supabase
          .from('gw_setlist_items')
          .update({ order_index: item.order_index })
          .eq('id', item.id)
      );

      await Promise.all(updatePromises);
    } catch (error) {
      console.error('Error reordering items:', error);
      toast({
        title: 'Error',
        description: 'Failed to reorder items',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading setlists...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Setlist Builder</h2>
          <p className="text-muted-foreground">Create and manage performance setlists</p>
        </div>
        
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Setlist
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create New Setlist</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Setlist Title *</Label>
                <Input
                  id="title"
                  value={newSetlist.title}
                  onChange={(e) => setNewSetlist({...newSetlist, title: e.target.value})}
                  placeholder="e.g., Spring Concert Setlist"
                />
              </div>
              <div>
                <Label htmlFor="concert_name">Concert Name *</Label>
                <Input
                  id="concert_name"
                  value={newSetlist.concert_name}
                  onChange={(e) => setNewSetlist({...newSetlist, concert_name: e.target.value})}
                  placeholder="e.g., Spring Concert 2024"
                />
              </div>
              <div>
                <Label htmlFor="event_date">Event Date</Label>
                <Input
                  id="event_date"
                  type="date"
                  value={newSetlist.event_date}
                  onChange={(e) => setNewSetlist({...newSetlist, event_date: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="venue">Venue</Label>
                <Input
                  id="venue"
                  value={newSetlist.venue}
                  onChange={(e) => setNewSetlist({...newSetlist, venue: e.target.value})}
                  placeholder="e.g., Sisters Chapel"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newSetlist.description}
                  onChange={(e) => setNewSetlist({...newSetlist, description: e.target.value})}
                  placeholder="Optional description..."
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={createSetlist} className="flex-1">
                  Create Setlist
                </Button>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Setlists List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Music2 className="h-5 w-5" />
              Setlists
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {setlists.map((setlist) => (
              <div
                key={setlist.id}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedSetlist?.id === setlist.id 
                    ? 'bg-primary/10 border-primary' 
                    : 'hover:bg-muted'
                }`}
                onClick={() => setSelectedSetlist(setlist)}
              >
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-medium text-sm">{setlist.title}</h4>
                  <div className="flex items-center gap-1">
                    {setlist.is_published ? (
                      <Globe className="h-4 w-4 text-green-600" />
                    ) : (
                      <Lock className="h-4 w-4 text-orange-600" />
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{setlist.concert_name}</p>
                {setlist.event_date && (
                  <div className="flex items-center gap-1 mt-1">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {new Date(setlist.event_date).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Selected Setlist */}
        {selectedSetlist && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{selectedSetlist.title}</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => togglePublished(selectedSetlist)}
                  >
                    {selectedSetlist.is_published ? (
                      <>
                        <Lock className="h-4 w-4 mr-1" />
                        Unpublish
                      </>
                    ) : (
                      <>
                        <Globe className="h-4 w-4 mr-1" />
                        Publish
                      </>
                    )}
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-1" />
                    Export PDF
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{selectedSetlist.concert_name}</p>
            </CardHeader>
            <CardContent>
              <DragDropContext onDragEnd={reorderItems}>
                <Droppable droppableId="setlist-items">
                  {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                      {setlistItems.map((item, index) => (
                        <Draggable key={item.id} draggableId={item.id} index={index}>
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className="flex items-center gap-2 p-2 border rounded-lg bg-background"
                            >
                              <div {...provided.dragHandleProps}>
                                <GripVertical className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <span className="text-sm font-medium w-6">{index + 1}.</span>
                              <div className="flex-1">
                                <p className="font-medium text-sm">{item.music.title}</p>
                                {item.music.composer && (
                                  <p className="text-xs text-muted-foreground">
                                    by {item.music.composer}
                                  </p>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeFromSetlist(item.id)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </CardContent>
          </Card>
        )}

        {/* Available Music */}
        <Card>
          <CardHeader>
            <CardTitle>Available Music</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-96 overflow-y-auto">
            {availableMusic
              .filter(music => !setlistItems.some(item => item.music_id === music.id))
              .map((music) => (
                <div
                  key={music.id}
                  className="flex items-center justify-between p-2 border rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium text-sm">{music.title}</p>
                    {music.composer && (
                      <p className="text-xs text-muted-foreground">by {music.composer}</p>
                    )}
                    {music.voice_parts && music.voice_parts.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {music.voice_parts.map((part, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {part}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addMusicToSetlist(music.id)}
                    disabled={!selectedSetlist}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};