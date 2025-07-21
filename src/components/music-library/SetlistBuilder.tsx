import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Music, 
  Plus, 
  Trash2, 
  GripVertical, 
  CalendarIcon,
  MapPin,
  Users,
  Save,
  Edit,
  Eye,
  FileText
} from 'lucide-react';
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Setlist {
  id: string;
  title: string;
  description: string | null;
  performance_date: string | null;
  venue: string | null;
  is_public: boolean;
  created_by: string;
  created_at: string;
  items?: SetlistItem[];
}

interface SetlistItem {
  id: string;
  position: number;
  notes: string | null;
  sheet_music?: {
    id: string;
    title: string;
    composer: string | null;
    pdf_url: string | null;
  };
}

interface SheetMusic {
  id: string;
  title: string;
  composer: string | null;
  pdf_url: string | null;
}

interface SetlistBuilderProps {
  onPdfSelect: (pdfUrl: string, title: string) => void;
}

export const SetlistBuilder: React.FC<SetlistBuilderProps> = ({ onPdfSelect }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [setlists, setSetlists] = useState<Setlist[]>([]);
  const [selectedSetlist, setSelectedSetlist] = useState<Setlist | null>(null);
  const [sheetMusic, setSheetMusic] = useState<SheetMusic[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Form state for creating/editing setlists
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    venue: '',
    performance_date: undefined as Date | undefined,
    is_public: false,
  });

  useEffect(() => {
    console.log('SetlistBuilder: useEffect triggered, user:', user?.id);
    if (user) {
      loadSetlists();
      loadSheetMusic();
    }
  }, [user]);

  const loadSetlists = async () => {
    console.log('SetlistBuilder: Loading setlists for user:', user?.id);
    try {
      const { data, error } = await supabase
        .from('setlists')
        .select('*')
        .eq('created_by', user?.id)
        .order('created_at', { ascending: false });

      console.log('SetlistBuilder: Setlists query result:', { data, error });
      if (error) throw error;
      setSetlists(data || []);
    } catch (error) {
      console.error('Error loading setlists:', error);
      toast({
        title: "Error",
        description: "Failed to load setlists.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSheetMusic = async () => {
    console.log('SetlistBuilder: Loading sheet music...');
    try {
      const { data, error } = await supabase
        .from('gw_sheet_music')
        .select('id, title, composer, pdf_url')
        .order('title');

      console.log('SetlistBuilder: Sheet music query result:', { count: data?.length, error });
      if (error) throw error;
      setSheetMusic(data || []);
    } catch (error) {
      console.error('Error loading sheet music:', error);
    }
  };

  const loadSetlistItems = async (setlistId: string) => {
    try {
      const { data, error } = await supabase
        .from('setlist_items')
        .select(`
          *,
          sheet_music:gw_sheet_music(id, title, composer, pdf_url)
        `)
        .eq('setlist_id', setlistId)
        .order('position');

      if (error) throw error;
      
      if (selectedSetlist) {
        setSelectedSetlist({
          ...selectedSetlist,
          items: data || []
        });
      }
    } catch (error) {
      console.error('Error loading setlist items:', error);
    }
  };

  const createSetlist = async () => {
    if (!formData.title.trim()) {
      toast({
        title: "Title Required",
        description: "Please enter a setlist title.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('setlists')
        .insert({
          title: formData.title,
          description: formData.description || null,
          venue: formData.venue || null,
          performance_date: formData.performance_date ? format(formData.performance_date, 'yyyy-MM-dd') : null,
          is_public: formData.is_public,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      setSetlists([data, ...setlists]);
      setSelectedSetlist(data);
      setIsCreating(false);
      resetForm();
      
      toast({
        title: "Success",
        description: "Setlist created successfully.",
      });
    } catch (error) {
      console.error('Error creating setlist:', error);
      toast({
        title: "Error",
        description: "Failed to create setlist.",
        variant: "destructive",
      });
    }
  };

  const addToSetlist = async (sheetMusicId: string) => {
    if (!selectedSetlist) return;

    try {
      const nextPosition = (selectedSetlist.items?.length || 0) + 1;
      
      const { data, error } = await supabase
        .from('setlist_items')
        .insert({
          setlist_id: selectedSetlist.id,
          sheet_music_id: sheetMusicId,
          position: nextPosition,
        })
        .select()
        .single();

      if (error) throw error;

      loadSetlistItems(selectedSetlist.id);
      
      toast({
        title: "Added",
        description: "Sheet music added to setlist.",
      });
    } catch (error) {
      console.error('Error adding to setlist:', error);
      toast({
        title: "Error",
        description: "Failed to add to setlist.",
        variant: "destructive",
      });
    }
  };

  const removeFromSetlist = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('setlist_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      if (selectedSetlist) {
        loadSetlistItems(selectedSetlist.id);
      }
      
      toast({
        title: "Removed",
        description: "Sheet music removed from setlist.",
      });
    } catch (error) {
      console.error('Error removing from setlist:', error);
      toast({
        title: "Error",
        description: "Failed to remove from setlist.",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      venue: '',
      performance_date: undefined,
      is_public: false,
    });
  };

  const handleViewPdf = (item: SetlistItem) => {
    if (item.sheet_music?.pdf_url) {
      onPdfSelect(item.sheet_music.pdf_url, item.sheet_music.title);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  console.log('SetlistBuilder render: isCreating =', isCreating);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Music className="h-5 w-5" />
            Setlist Builder
          </h3>
          <p className="text-sm text-muted-foreground">
            Create and manage performance setlists
          </p>
        </div>
        <Button 
          onClick={() => {
            console.log('SetlistBuilder: New Setlist button clicked');
            setIsCreating(true);
          }} 
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          New Setlist
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Setlists Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">My Setlists</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {setlists.map((setlist) => (
              <div
                key={setlist.id}
                className={cn(
                  "p-3 border rounded-lg cursor-pointer transition-colors",
                  selectedSetlist?.id === setlist.id 
                    ? "border-primary bg-primary/5" 
                    : "hover:bg-muted/50"
                )}
                onClick={() => {
                  setSelectedSetlist(setlist);
                  loadSetlistItems(setlist.id);
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate">{setlist.title}</h4>
                    {setlist.description && (
                      <p className="text-sm text-muted-foreground truncate">
                        {setlist.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      {setlist.performance_date && (
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="h-3 w-3" />
                          {format(new Date(setlist.performance_date), 'MMM d, yyyy')}
                        </span>
                      )}
                      {setlist.venue && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {setlist.venue}
                        </span>
                      )}
                    </div>
                  </div>
                  {setlist.is_public && (
                    <Badge variant="secondary" className="ml-2">
                      <Users className="h-3 w-3 mr-1" />
                      Public
                    </Badge>
                  )}
                </div>
              </div>
            ))}
            
            {setlists.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Music className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No setlists yet</p>
                <p className="text-sm">Create your first setlist to get started</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Current Setlist or Sheet Music Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {selectedSetlist ? `${selectedSetlist.title} Items` : 'Available Sheet Music'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedSetlist ? (
              <div className="space-y-3">
                {selectedSetlist.items?.map((item, index) => (
                  <div key={item.id} className="flex items-center gap-3 p-3 border rounded-lg">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-muted-foreground">
                          {index + 1}.
                        </span>
                        <h4 className="font-medium truncate">
                          {item.sheet_music?.title}
                        </h4>
                      </div>
                      {item.sheet_music?.composer && (
                        <p className="text-sm text-muted-foreground">
                          {item.sheet_music.composer}
                        </p>
                      )}
                      {item.notes && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {item.notes}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewPdf(item)}
                        disabled={!item.sheet_music?.pdf_url}
                      >
                        <FileText className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => removeFromSetlist(item.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
                
                {(!selectedSetlist.items || selectedSetlist.items.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No items in this setlist</p>
                    <p className="text-sm">Add sheet music from the library below</p>
                  </div>
                )}
                
                <Separator />
                
                <div className="space-y-2">
                  <h5 className="font-medium text-sm">Add Sheet Music</h5>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {sheetMusic.map((music) => (
                      <div key={music.id} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex-1 min-w-0">
                          <h6 className="text-sm font-medium truncate">{music.title}</h6>
                          {music.composer && (
                            <p className="text-xs text-muted-foreground">{music.composer}</p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => addToSetlist(music.id)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {sheetMusic.map((music) => (
                  <div key={music.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{music.title}</h4>
                      {music.composer && (
                        <p className="text-sm text-muted-foreground">{music.composer}</p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => music.pdf_url && onPdfSelect(music.pdf_url, music.title)}
                      disabled={!music.pdf_url}
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Setlist Dialog */}
      {isCreating && (
        <Card className="mt-6 bg-background border-2 border-primary p-4" style={{ minHeight: '200px' }}>
          <CardHeader>
            <CardTitle className="text-base text-primary">✨ Create New Setlist ✨</CardTitle>
            <div className="text-sm text-muted-foreground">Form is now visible - isCreating: {isCreating.toString()}</div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Concert Setlist"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="venue">Venue</Label>
                <Input
                  id="venue"
                  value={formData.venue}
                  onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                  placeholder="Concert Hall"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Spring concert program..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Performance Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.performance_date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.performance_date ? (
                      format(formData.performance_date, "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.performance_date}
                    onSelect={(date) => setFormData({ ...formData, performance_date: date })}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_public"
                  checked={formData.is_public}
                  onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="is_public" className="text-sm">
                  Make this setlist public
                </Label>
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setIsCreating(false); resetForm(); }}>
                  Cancel
                </Button>
                <Button onClick={createSetlist}>
                  <Save className="h-4 w-4 mr-2" />
                  Create Setlist
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};