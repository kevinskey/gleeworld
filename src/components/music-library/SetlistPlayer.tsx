import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { PDFViewer } from "@/components/PDFViewer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  X,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Plus,
  Trash2,
  Edit3,
  Save,
  FileText,
  Music,
  Users,
  Calendar,
  MapPin,
  Search,
  Maximize2,
  Minimize2,
  MoreVertical
} from "lucide-react";
import { format } from "date-fns";

interface SetlistPlayerProps {
  setlistId: string;
  onClose: () => void;
}

interface SetlistItem {
  id: string;
  position: number;
  notes?: string;
  sheet_music?: {
    id: string;
    title: string;
    composer?: string;
    pdf_url?: string;
  };
}

interface Setlist {
  id: string;
  title: string;
  description?: string;
  venue?: string;
  performance_date?: string;
  is_public: boolean;
  items?: SetlistItem[];
}

interface SheetMusic {
  id: string;
  title: string;
  composer?: string;
  pdf_url?: string;
}

export const SetlistPlayer = ({ setlistId, onClose }: SetlistPlayerProps) => {
  const [setlist, setSetlist] = useState<Setlist | null>(null);
  const [sheetMusic, setSheetMusic] = useState<SheetMusic[]>([]);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [selectedPdfUrl, setSelectedPdfUrl] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    venue: "",
    performance_date: "",
    is_public: false
  });
  const [isAddingTrack, setIsAddingTrack] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isPdfMaximized, setIsPdfMaximized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSetlist();
    loadSheetMusic();
  }, [setlistId]);

  const loadSetlist = async () => {
    try {
      const { data, error } = await supabase
        .from('setlists')
        .select(`
          *,
          items:setlist_items(
            id,
            position,
            notes,
            sheet_music:gw_sheet_music(
              id,
              title,
              composer,
              pdf_url
            )
          )
        `)
        .eq('id', setlistId)
        .single();

      if (error) throw error;

      if (data) {
        // Sort items by position
        if (data.items) {
          data.items.sort((a: SetlistItem, b: SetlistItem) => a.position - b.position);
        }
        setSetlist(data);
        setEditForm({
          title: data.title || "",
          description: data.description || "",
          venue: data.venue || "",
          performance_date: data.performance_date || "",
          is_public: data.is_public || false
        });

        // Auto-select first PDF if available
        if (data.items && data.items.length > 0 && data.items[0].sheet_music?.pdf_url) {
          setSelectedPdfUrl(data.items[0].sheet_music.pdf_url);
        }
      }
    } catch (error) {
      console.error('Error loading setlist:', error);
      toast.error("Failed to load setlist");
    } finally {
      setLoading(false);
    }
  };

  const loadSheetMusic = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_sheet_music')
        .select('id, title, composer, pdf_url')
        .order('title');

      if (error) throw error;
      setSheetMusic(data || []);
    } catch (error) {
      console.error('Error loading sheet music:', error);
    }
  };

  const handleSaveEdit = async () => {
    try {
      const { error } = await supabase
        .from('setlists')
        .update({
          title: editForm.title,
          description: editForm.description,
          venue: editForm.venue,
          performance_date: editForm.performance_date || null,
          is_public: editForm.is_public
        })
        .eq('id', setlistId);

      if (error) throw error;

      setSetlist(prev => prev ? { ...prev, ...editForm } : null);
      setIsEditing(false);
      toast.success("Setlist updated successfully");
    } catch (error) {
      console.error('Error updating setlist:', error);
      toast.error("Failed to update setlist");
    }
  };

  const addTrackToSetlist = async (sheetMusicId: string) => {
    if (!setlist) return;

    try {
      const maxPosition = Math.max(0, ...(setlist.items?.map(item => item.position) || [0]));
      
      const { data, error } = await supabase
        .from('setlist_items')
        .insert({
          setlist_id: setlistId,
          sheet_music_id: sheetMusicId,
          position: maxPosition + 1
        })
        .select(`
          id,
          position,
          notes,
          sheet_music:gw_sheet_music(
            id,
            title,
            composer,
            pdf_url
          )
        `)
        .single();

      if (error) throw error;

      setSetlist(prev => prev ? {
        ...prev,
        items: [...(prev.items || []), data].sort((a, b) => a.position - b.position)
      } : null);

      setIsAddingTrack(false);
      setSearchQuery("");
      toast.success("Track added to setlist");
    } catch (error) {
      console.error('Error adding track:', error);
      toast.error("Failed to add track");
    }
  };

  const deleteSetlist = async () => {
    if (!confirm("Are you sure you want to delete this setlist? This action cannot be undone.")) {
      return;
    }

    try {
      const { error } = await supabase
        .from('setlists')
        .delete()
        .eq('id', setlistId);

      if (error) throw error;

      toast.success("Setlist deleted successfully");
      onClose(); // Return to main library
    } catch (error) {
      console.error('Error deleting setlist:', error);
      toast.error("Failed to delete setlist");
    }
  };

  const removeTrackFromSetlist = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('setlist_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      setSetlist(prev => prev ? {
        ...prev,
        items: prev.items?.filter(item => item.id !== itemId)
      } : null);

      toast.success("Track removed from setlist");
    } catch (error) {
      console.error('Error removing track:', error);
      toast.error("Failed to remove track");
    }
  };

  const goToNext = () => {
    if (!setlist?.items) return;
    const nextIndex = Math.min(currentItemIndex + 1, setlist.items.length - 1);
    setCurrentItemIndex(nextIndex);
    const nextItem = setlist.items[nextIndex];
    if (nextItem?.sheet_music?.pdf_url) {
      setSelectedPdfUrl(nextItem.sheet_music.pdf_url);
    }
  };

  const goToPrevious = () => {
    const prevIndex = Math.max(currentItemIndex - 1, 0);
    setCurrentItemIndex(prevIndex);
    const prevItem = setlist?.items?.[prevIndex];
    if (prevItem?.sheet_music?.pdf_url) {
      setSelectedPdfUrl(prevItem.sheet_music.pdf_url);
    }
  };

  const selectTrack = (index: number) => {
    setCurrentItemIndex(index);
    const item = setlist?.items?.[index];
    if (item?.sheet_music?.pdf_url) {
      setSelectedPdfUrl(item.sheet_music.pdf_url);
    }
  };

  const filteredSheetMusic = sheetMusic.filter(music =>
    music.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    music.composer?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="fixed inset-0 bg-background z-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!setlist) {
    return (
      <div className="fixed inset-0 bg-background z-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold mb-2">Setlist not found</h2>
          <Button onClick={onClose}>Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* Header */}
      <div className="bg-primary/5 border-b p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            Close
          </Button>
          
          {isEditing ? (
            <div className="flex items-center gap-2">
              <Input
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                className="text-lg font-semibold"
                placeholder="Setlist title"
              />
              <Button size="sm" onClick={handleSaveEdit}>
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold">{setlist.title}</h1>
              <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)}>
                <Edit3 className="h-4 w-4" />
              </Button>
              {setlist.is_public && (
                <Badge variant="secondary">
                  <Users className="h-3 w-3 mr-1" />
                  Public
                </Badge>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="ghost">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem 
                    className="text-destructive"
                    onClick={deleteSetlist}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Setlist
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        {/* Transport Controls */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={goToPrevious}
            disabled={currentItemIndex === 0}
          >
            <SkipBack className="h-4 w-4" />
          </Button>
          
          <span className="text-sm text-muted-foreground">
            {currentItemIndex + 1} / {setlist.items?.length || 0}
          </span>
          
          <Button
            size="sm"
            variant="outline"
            onClick={goToNext}
            disabled={!setlist.items || currentItemIndex === setlist.items.length - 1}
          >
            <SkipForward className="h-4 w-4" />
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsPdfMaximized(!isPdfMaximized)}
          >
            {isPdfMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Setlist Panel */}
        <div className={`${isPdfMaximized ? 'w-0 overflow-hidden' : 'w-80'} border-r bg-muted/20 transition-all duration-300`}>
          <div className="p-4 space-y-4 h-full overflow-y-auto">
            {/* Setlist Info */}
            {isEditing ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Edit Setlist</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="text-xs font-medium">Venue</label>
                    <Input
                      value={editForm.venue}
                      onChange={(e) => setEditForm({ ...editForm, venue: e.target.value })}
                      placeholder="Concert Hall"
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium">Description</label>
                    <Textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      placeholder="Spring concert program..."
                      rows={3}
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium">Performance Date</label>
                    <Input
                      type="datetime-local"
                      value={editForm.performance_date}
                      onChange={(e) => setEditForm({ ...editForm, performance_date: e.target.value })}
                      className="text-sm"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="public"
                      checked={editForm.is_public}
                      onChange={(e) => setEditForm({ ...editForm, is_public: e.target.checked })}
                    />
                    <label htmlFor="public" className="text-xs">Make public</label>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-3 space-y-2">
                  {setlist.venue && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-3 w-3" />
                      {setlist.venue}
                    </div>
                  )}
                  {setlist.performance_date && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(setlist.performance_date), "PPP")}
                    </div>
                  )}
                  {setlist.description && (
                    <p className="text-sm text-muted-foreground">{setlist.description}</p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Track List */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between p-3">
                <CardTitle className="text-sm">Tracks ({setlist.items?.length || 0})</CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsAddingTrack(true)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-1">
                  {setlist.items?.map((item, index) => (
                    <div
                      key={item.id}
                      className={`flex items-center gap-2 p-3 cursor-pointer transition-colors ${
                        index === currentItemIndex 
                          ? 'bg-primary/10 border-l-2 border-primary' 
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => selectTrack(index)}
                    >
                      <span className="text-xs font-medium w-6">{index + 1}.</span>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium truncate">
                          {item.sheet_music?.title}
                        </h4>
                        {item.sheet_music?.composer && (
                          <p className="text-xs text-muted-foreground">
                            {item.sheet_music.composer}
                          </p>
                        )}
                        {item.notes && (
                          <p className="text-xs text-muted-foreground italic">
                            {item.notes}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {item.sheet_music?.pdf_url && (
                          <FileText className="h-3 w-3 text-green-500" />
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeTrackFromSetlist(item.id);
                          }}
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  {(!setlist.items || setlist.items.length === 0) && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Music className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-xs">No tracks in setlist</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Add Track Panel */}
            {isAddingTrack && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between p-3">
                  <CardTitle className="text-sm">Add Track</CardTitle>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsAddingTrack(false)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </CardHeader>
                <CardContent className="p-3 space-y-3">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                    <Input
                      placeholder="Search tracks..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 text-sm"
                    />
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {filteredSheetMusic.map((music) => (
                      <div
                        key={music.id}
                        className="flex items-center justify-between p-2 text-xs border rounded cursor-pointer hover:bg-accent/50 transition-colors"
                        onClick={() => addTrackToSetlist(music.id)}
                      >
                        <div className="flex-1 min-w-0">
                          <h6 className="font-medium truncate">{music.title}</h6>
                          {music.composer && (
                            <p className="text-muted-foreground truncate">{music.composer}</p>
                          )}
                        </div>
                        <Plus className="h-3 w-3 text-muted-foreground" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* PDF Viewer */}
        <div className="flex-1 bg-background">
          {selectedPdfUrl ? (
            <PDFViewer pdfUrl={selectedPdfUrl} />
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No PDF Selected</h3>
                <p>Select a track with a PDF to view it here</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};