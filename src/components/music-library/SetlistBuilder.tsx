
import React, { useState, useEffect } from 'react';
import { Switch } from "@/components/ui/switch";
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
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
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
  FileText,
  AlertCircle,
  Play
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
  onPdfSelect: (pdfUrl: string, title: string, id?: string) => void;
  onOpenPlayer?: (setlistId: string) => void;
}

export const SetlistBuilder: React.FC<SetlistBuilderProps> = ({ onPdfSelect, onOpenPlayer }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [setlists, setSetlists] = useState<Setlist[]>([]);
  const [selectedSetlist, setSelectedSetlist] = useState<Setlist | null>(null);
  const [sheetMusic, setSheetMusic] = useState<SheetMusic[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingSetlist, setEditingSetlist] = useState<Setlist | null>(null);
  const [loading, setLoading] = useState(true);
  const [createLoading, setCreateLoading] = useState(false);
  const [sheetMusicSearch, setSheetMusicSearch] = useState('');
  
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
      testDatabaseConnection();
    }
  }, [user]);

  const testDatabaseConnection = async () => {
    try {
      console.log('SetlistBuilder: Testing database connection...');
      const { data: authUser } = await supabase.auth.getUser();
      console.log('SetlistBuilder: Auth user:', authUser?.user?.id);
      
      // Test if we can query the setlists table
      const { data, error, count } = await supabase
        .from('setlists')
        .select('*', { count: 'exact', head: true });
      
      console.log('SetlistBuilder: Database test result:', { data, error, count });
      
      if (error) {
        console.error('SetlistBuilder: Database connection test failed:', error);
        toast({
          title: "Database Connection Issue",
          description: `Unable to connect to setlists table: ${error.message}`,
          variant: "destructive",
        });
      } else {
        console.log('SetlistBuilder: Database connection successful');
      }
    } catch (error) {
      console.error('SetlistBuilder: Database connection test error:', error);
    }
  };

  const loadSetlists = async () => {
    console.log('SetlistBuilder: Loading setlists for user:', user?.id);
    try {
      // Librarians and admins should see all setlists
      let query = supabase
        .from('setlists')
        .select('*')
        .order('created_at', { ascending: false });
      
      // Regular users only see their own setlists
      // RLS will handle permissions, but we filter here for optimization
      const { data: profileData } = await supabase
        .from('gw_profiles')
        .select('role, is_admin, is_super_admin')
        .eq('user_id', user?.id)
        .single();
      
      const { data: rolesData } = await supabase
        .from('app_roles')
        .select('role')
        .eq('user_id', user?.id)
        .eq('is_active', true);
      
      const hasLibrarianRole = rolesData?.some(r => r.role === 'librarian');
      const isAdmin = profileData?.is_admin || profileData?.is_super_admin;
      
      // Only filter by created_by if user is not an admin or librarian
      if (!isAdmin && !hasLibrarianRole) {
        // Show user's own setlists or public ones
        query = query.or(`created_by.eq.${user?.id},is_public.eq.true`);
      }
      
      const { data, error } = await query;

      console.log('SetlistBuilder: Setlists query result:', { data, error });
      if (error) {
        console.error('SetlistBuilder: Error loading setlists:', error);
        toast({
          title: "Error Loading Setlists",
          description: error.message,
          variant: "destructive",
        });
        throw error;
      }
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
      if (error) {
        console.error('SetlistBuilder: Error loading sheet music:', error);
        toast({
          title: "Error Loading Sheet Music",
          description: error.message,
          variant: "destructive",
        });
        throw error;
      }
      setSheetMusic(data || []);
    } catch (error) {
      console.error('Error loading sheet music:', error);
    }
  };

  const loadSetlistItems = async (setlistId: string) => {
    console.log('SetlistBuilder: Loading items for setlist:', setlistId);
    try {
      const { data, error } = await supabase
        .from('setlist_items')
        .select(`
          *,
          sheet_music:gw_sheet_music(id, title, composer, pdf_url)
        `)
        .eq('setlist_id', setlistId)
        .order('position');

      console.log('SetlistBuilder: Setlist items query result:', { data, error });
      if (error) {
        console.error('SetlistBuilder: Error loading setlist items:', error);
        toast({
          title: "Error Loading Setlist Items",
          description: error.message,
          variant: "destructive",
        });
        throw error;
      }
      
      // Process items to ensure fresh signed URLs for PDFs
      const processedItems = await Promise.all((data || []).map(async (item: any) => {
        if (item.sheet_music?.pdf_url) {
          // Extract the path from the existing URL and generate a fresh signed URL
          const urlPath = item.sheet_music.pdf_url;
          
          // Check if it's a Supabase storage URL that needs refreshing
          if (urlPath.includes('supabase.co/storage')) {
            try {
              // Extract the file path from the URL
              const pathMatch = urlPath.match(/\/object\/(sign|public)\/([^?]+)/);
              if (pathMatch) {
                const [, , filePath] = pathMatch;
                const decodedPath = decodeURIComponent(filePath);
                
                // Split into bucket and path
                const [bucket, ...pathParts] = decodedPath.split('/');
                const path = pathParts.join('/');
                
                console.log('SetlistBuilder: Refreshing signed URL for:', { bucket, path });
                
                // Generate a fresh signed URL
                const { data: signedData, error: signError } = await supabase.storage
                  .from(bucket)
                  .createSignedUrl(path, 3600); // 1 hour expiry
                
                if (!signError && signedData?.signedUrl) {
                  return {
                    ...item,
                    sheet_music: {
                      ...item.sheet_music,
                      pdf_url: signedData.signedUrl
                    }
                  };
                }
              }
            } catch (urlError) {
              console.warn('SetlistBuilder: Failed to refresh signed URL:', urlError);
            }
          }
        }
        return item;
      }));
      
      // Update the selected setlist with the loaded items
      setSelectedSetlist(prev => {
        if (prev && prev.id === setlistId) {
          return {
            ...prev,
            items: processedItems
          };
        }
        return prev;
      });
    } catch (error) {
      console.error('Error loading setlist items:', error);
    }
  };

  const createSetlist = async () => {
    console.log('SetlistBuilder: createSetlist called with data:', formData);
    console.log('SetlistBuilder: Current user:', user?.id);

    if (!formData.title.trim()) {
      console.log('SetlistBuilder: Title validation failed');
      toast({
        title: "Title Required",
        description: "Please enter a setlist title.",
        variant: "destructive",
      });
      return;
    }

    if (!user?.id) {
      console.log('SetlistBuilder: User not authenticated');
      toast({
        title: "Authentication Error",
        description: "Please log in to create setlists.",
        variant: "destructive",
      });
      return;
    }

    setCreateLoading(true);
    
    try {
      console.log('SetlistBuilder: Attempting to create setlist...');
      
      const insertData = {
        title: formData.title.trim(),
        description: formData.description?.trim() || null,
        venue: formData.venue?.trim() || null,
        performance_date: formData.performance_date ? format(formData.performance_date, 'yyyy-MM-dd') : null,
        is_public: formData.is_public,
        created_by: user.id,
      };

      console.log('SetlistBuilder: Insert data:', insertData);

      const { data, error } = await supabase
        .from('setlists')
        .insert(insertData)
        .select()
        .single();

      console.log('SetlistBuilder: Insert result:', { data, error });

      if (error) {
        console.error('SetlistBuilder: Insert error:', error);
        toast({
          title: "Database Error",
          description: `Failed to create setlist: ${error.message}`,
          variant: "destructive",
        });
        throw error;
      }

      console.log('SetlistBuilder: Setlist created successfully:', data);
      setSetlists([data, ...setlists]);
      // Don't auto-select the setlist - keep showing available sheet music
      setIsCreating(false);
      resetForm();
      
      toast({
        title: "Success",
        description: "Setlist created successfully.",
      });
    } catch (error) {
      console.error('SetlistBuilder: Error in createSetlist:', error);
      toast({
        title: "Error",
        description: `Failed to create setlist: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setCreateLoading(false);
    }
  };

  const updateSetlist = async () => {
    if (!editingSetlist) return;

    if (!formData.title.trim()) {
      toast({
        title: "Title Required",
        description: "Please enter a setlist title.",
        variant: "destructive",
      });
      return;
    }

    setCreateLoading(true);
    
    try {
      const updateData = {
        title: formData.title.trim(),
        description: formData.description?.trim() || null,
        venue: formData.venue?.trim() || null,
        performance_date: formData.performance_date ? format(formData.performance_date, 'yyyy-MM-dd') : null,
        is_public: formData.is_public,
      };

      const { data, error } = await supabase
        .from('setlists')
        .update(updateData)
        .eq('id', editingSetlist.id)
        .select()
        .single();

      if (error) throw error;

      setSetlists(setlists.map(s => s.id === data.id ? data : s));
      setIsEditing(false);
      setEditingSetlist(null);
      resetForm();
      
      toast({
        title: "Success",
        description: "Setlist updated successfully!",
      });
    } catch (error) {
      console.error('Error updating setlist:', error);
      toast({
        title: "Error",
        description: `Failed to update setlist: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setCreateLoading(false);
    }
  };


  const addToSetlist = async (sheetMusicId: string) => {
    if (!selectedSetlist) return;

    // Check if this sheet music is already in the setlist
    const isAlreadyInSetlist = selectedSetlist.items?.some(
      item => item.sheet_music?.id === sheetMusicId
    );

    if (isAlreadyInSetlist) {
      const musicTitle = sheetMusic.find(m => m.id === sheetMusicId)?.title || 'Unknown';
      toast({
        title: "Already in Setlist",
        description: `"${musicTitle}" is already in this setlist.`,
        variant: "default",
      });
      return;
    }

    console.log('SetlistBuilder: Adding sheet music to setlist:', { selectedSetlist: selectedSetlist.id, sheetMusicId });

    try {
      // Query the database for the current max position to avoid race conditions
      const { data: maxPositionData, error: maxPositionError } = await supabase
        .from('setlist_items')
        .select('position')
        .eq('setlist_id', selectedSetlist.id)
        .order('position', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (maxPositionError) {
        console.error('SetlistBuilder: Error getting max position:', maxPositionError);
        throw maxPositionError;
      }

      const nextPosition = (maxPositionData?.position || 0) + 1;
      
      const { data, error } = await supabase
        .from('setlist_items')
        .insert({
          setlist_id: selectedSetlist.id,
          sheet_music_id: sheetMusicId,
          position: nextPosition,
        })
        .select()
        .maybeSingle();

      console.log('SetlistBuilder: Add to setlist result:', { data, error });

      if (error) {
        console.error('SetlistBuilder: Error adding to setlist:', error);
        
        // Handle specific constraint errors
        if (error.code === '23505' && error.message.includes('setlist_items_setlist_id_sheet_music_id_key')) {
          const musicTitle = sheetMusic.find(m => m.id === sheetMusicId)?.title || 'Unknown';
          toast({
            title: "Already in Setlist",
            description: `"${musicTitle}" is already in this setlist.`,
            variant: "default",
          });
        } else if (error.code === '23505' && error.message.includes('setlist_items_setlist_id_position_key')) {
          // If there's still a position conflict, retry with a higher position
          const retryPosition = nextPosition + 1;
          const { data: retryData, error: retryError } = await supabase
            .from('setlist_items')
            .insert({
              setlist_id: selectedSetlist.id,
              sheet_music_id: sheetMusicId,
              position: retryPosition,
            })
            .select()
            .maybeSingle();

          if (retryError) {
            toast({
              title: "Error Adding to Setlist",
              description: retryError.message,
              variant: "destructive",
            });
            return;
          }
        } else {
          toast({
            title: "Error Adding to Setlist",
            description: error.message,
            variant: "destructive",
          });
        }
        return;
      }

      await loadSetlistItems(selectedSetlist.id);
      const musicTitle = sheetMusic.find(m => m.id === sheetMusicId)?.title || 'Unknown';
      toast({
        title: "Added",
        description: `"${musicTitle}" added to setlist.`,
      });
    } catch (error) {
      console.error('Error adding to setlist:', error);
      toast({
        title: "Error",
        description: `Failed to add to setlist: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };

  const removeFromSetlist = async (itemId: string) => {
    console.log('SetlistBuilder: Removing item from setlist:', itemId);
    try {
      const { error } = await supabase
        .from('setlist_items')
        .delete()
        .eq('id', itemId);

      if (error) {
        console.error('SetlistBuilder: Error removing from setlist:', error);
        toast({
          title: "Error Removing Item",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      if (selectedSetlist) {
        await loadSetlistItems(selectedSetlist.id);
      }
      
      toast({
        title: "Removed",
        description: "Sheet music removed from setlist.",
      });
    } catch (error) {
      console.error('Error removing from setlist:', error);
      toast({
        title: "Error",
        description: `Failed to remove from setlist: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    console.log('SetlistBuilder: Resetting form');
    setFormData({
      title: '',
      description: '',
      venue: '',
      performance_date: undefined,
      is_public: false,
    });
    setEditingSetlist(null);
  };

  const handleEditSetlist = (setlist: Setlist) => {
    setEditingSetlist(setlist);
    setFormData({
      title: setlist.title,
      description: setlist.description || '',
      venue: setlist.venue || '',
      performance_date: setlist.performance_date ? new Date(setlist.performance_date) : undefined,
      is_public: setlist.is_public,
    });
    setIsEditing(true);
    setIsCreating(false);
  };

  const openSetlistPlayer = (setlistId: string) => {
    if (onOpenPlayer) {
      onOpenPlayer(setlistId);
    }
  };

  const handleViewPdf = (item: SetlistItem) => {
    if (item.sheet_music?.pdf_url) {
      onPdfSelect(item.sheet_music.pdf_url, item.sheet_music.title, item.sheet_music.id);
    }
  };

  // Filter sheet music based on search
  const filteredSheetMusic = sheetMusic.filter(music => 
    music.title.toLowerCase().includes(sheetMusicSearch.toLowerCase()) ||
    (music.composer && music.composer.toLowerCase().includes(sheetMusicSearch.toLowerCase()))
  );

  // Component for sheet music hover card
  const SheetMusicHoverCard = ({ music, children }: { music: SheetMusic; children: React.ReactNode }) => (
    <HoverCard>
      <HoverCardTrigger asChild>
        {children}
      </HoverCardTrigger>
      <HoverCardContent 
        className="w-80 bg-background/80 backdrop-blur-sm border shadow-lg" 
        side="right"
        sideOffset={5}
      >
        <div className="space-y-2">
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1">
              <h4 className="text-sm font-semibold leading-tight">{music.title}</h4>
              {music.composer && (
                <p className="text-xs text-muted-foreground">Composed by {music.composer}</p>
              )}
            </div>
            {music.pdf_url && (
              <Badge variant="outline" className="ml-2">
                <FileText className="h-3 w-3 mr-1" />
                PDF
              </Badge>
            )}
          </div>
          <div className="pt-2 border-t">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Music className="h-3 w-3" />
              <span>Sheet Music</span>
              {music.pdf_url ? (
                <span className="text-green-600">• Available</span>
              ) : (
                <span className="text-amber-600">• No PDF</span>
              )}
            </div>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Authentication Required</h3>
              <p className="text-muted-foreground">Please log in to create and manage setlists.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  console.log('SetlistBuilder render: isCreating =', isCreating, 'createLoading =', createLoading);

  return (
    <div className="space-y-3">
      {/* Compact Header */}
      <div className="flex items-center justify-between gap-2 px-1">
        <span className="text-sm font-semibold text-foreground">My Setlists</span>
        <Button 
          onClick={() => {
            console.log('SetlistBuilder: New Setlist button clicked');
            setIsCreating(!isCreating);
          }} 
          className="h-7 px-2 gap-1"
          disabled={createLoading}
          variant={isCreating ? "secondary" : "outline"}
          size="sm"
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="text-xs">New</span>
        </Button>
      </div>

      {/* Mac-style Setlist List */}
      <div className="space-y-1 min-h-[calc(100vh-200px)] max-h-[calc(100vh-120px)] overflow-y-auto">
        {setlists.map((setlist) => (
          <div key={setlist.id}>
            {/* Setlist Row */}
            <div
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors group border",
                selectedSetlist?.id === setlist.id 
                  ? "bg-primary text-primary-foreground border-primary" 
                  : "bg-card hover:bg-accent border-border text-foreground"
              )}
              onClick={() => {
                if (selectedSetlist?.id === setlist.id) {
                  setSelectedSetlist(null);
                } else {
                  setSelectedSetlist(setlist);
                  loadSetlistItems(setlist.id);
                }
              }}
            >
              <Music className="h-4 w-4 flex-shrink-0" />
              <span className="flex-1 min-w-0 text-sm font-medium truncate">{setlist.title}</span>
              {setlist.is_public && (
                <Badge variant="secondary" className="text-xs">Public</Badge>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditSetlist(setlist);
                }}
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Edit className="h-3.5 w-3.5" />
              </Button>
            </div>
            
            {/* Expanded Setlist Items */}
            {selectedSetlist?.id === setlist.id && (
              <div className="ml-6 pl-3 border-l-2 border-primary/30 space-y-1 py-2 mt-1">
                {selectedSetlist.items?.map((item, index) => (
                  <div 
                    key={item.id} 
                    className="flex items-center gap-2 px-2 py-1.5 rounded bg-white hover:bg-slate-50 group/item border border-slate-200"
                    style={{ backgroundColor: 'white' }}
                  >
                    <span className="text-xs w-5 text-right font-mono" style={{ color: '#475569' }}>{index + 1}.</span>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium truncate block" style={{ color: '#0f172a' }}>{item.sheet_music?.title}</span>
                      {item.sheet_music?.composer && (
                        <span className="text-xs truncate block" style={{ color: '#475569' }}>{item.sheet_music.composer}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleViewPdf(item)}
                        disabled={!item.sheet_music?.pdf_url}
                        className="h-5 w-5 p-0"
                      >
                        <FileText className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openSetlistPlayer(selectedSetlist.id)}
                        className="h-5 w-5 p-0"
                      >
                        <Play className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeFromSetlist(item.id)}
                        className="h-5 w-5 p-0 text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
                
                {(!selectedSetlist.items || selectedSetlist.items.length === 0) && (
                  <div className="text-center py-3 text-sm text-muted-foreground bg-muted/30 rounded">
                    No songs added yet. Search below to add music.
                  </div>
                )}
                
                {/* Add Sheet Music - Compact */}
                <div className="pt-2 mt-2 border-t border-dashed">
                  <Label className="text-xs text-muted-foreground mb-1 block">Add sheet music:</Label>
                  <Input
                    placeholder="Search music to add..."
                    value={sheetMusicSearch}
                    onChange={(e) => setSheetMusicSearch(e.target.value)}
                    className="h-8 text-sm"
                  />
                  {sheetMusicSearch && (
                    <div className="max-h-32 overflow-y-auto mt-2 space-y-1 bg-card rounded border p-1">
                      {filteredSheetMusic.slice(0, 5).map((music) => (
                        <div 
                          key={music.id} 
                          className="flex items-center gap-2 px-2 py-1.5 text-sm rounded cursor-pointer hover:bg-accent text-foreground"
                          onClick={() => addToSetlist(music.id)}
                        >
                          <Plus className="h-4 w-4 text-primary" />
                          <span className="truncate flex-1">{music.title}</span>
                          {music.composer && (
                            <span className="text-xs text-muted-foreground truncate max-w-[100px]">{music.composer}</span>
                          )}
                        </div>
                      ))}
                      {filteredSheetMusic.length === 0 && (
                        <div className="text-center py-2 text-sm text-muted-foreground">
                          No music found
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
        
        {setlists.length === 0 && !loading && (
          <div className="text-center py-6 text-muted-foreground bg-muted/30 rounded-lg border border-dashed">
            <Music className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm font-medium">No setlists yet</p>
            <p className="text-xs mt-1">Click "New" above to create your first setlist</p>
          </div>
        )}
      </div>

      {/* Create/Edit Setlist Form */}
      {(isCreating || isEditing) && (
        <Card className="mt-2">
          <CardHeader className="py-3">
            <CardTitle className="text-sm">
              {isEditing ? 'Edit Setlist' : 'New Setlist'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 py-2">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-xs">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Concert Setlist"
                disabled={createLoading}
                className="h-8 text-sm"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="venue" className="text-xs">Venue</Label>
              <Input
                id="venue"
                value={formData.venue}
                onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                placeholder="Concert Hall"
                disabled={createLoading}
                className="h-8 text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-xs">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Spring concert program..."
                rows={2}
                disabled={createLoading}
                className="text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Performance Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal h-8 text-sm",
                      !formData.performance_date && "text-muted-foreground"
                    )}
                    disabled={createLoading}
                  >
                    <CalendarIcon className="mr-2 h-3 w-3" />
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

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_public"
                checked={formData.is_public}
                onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                className="rounded h-3 w-3"
                disabled={createLoading}
              />
              <Label htmlFor="is_public" className="text-xs">
                Make public
              </Label>
            </div>
              
            <div className="flex gap-2 pt-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => { 
                  setIsCreating(false);
                  setIsEditing(false);
                  resetForm(); 
                }}
                disabled={createLoading}
                className="h-7 text-xs"
              >
                Cancel
              </Button>
              <Button 
                size="sm"
                onClick={isEditing ? updateSetlist : createSetlist}
                disabled={createLoading || !formData.title.trim()}
                className="h-7 text-xs"
              >
                <Save className="h-3 w-3 mr-1" />
                {createLoading ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
