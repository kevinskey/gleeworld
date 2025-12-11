import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  FileText, 
  Edit, 
  Trash2, 
  User, 
  Calendar,
  Clock,
  Star,
  Music2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { SheetMusicEditDialog } from "./SheetMusicEditDialog";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { PDFThumbnail } from "./PDFThumbnail";
import { OSMDViewer } from "@/components/OSMDViewer";

interface SheetMusic {
  id: string;
  title: string;
  composer: string | null;
  arranger: string | null;
  key_signature: string | null;
  time_signature: string | null;
  tempo_marking: string | null;
  difficulty_level: string | null;
  voice_parts: string[] | null;
  language: string | null;
  pdf_url: string | null;
  audio_preview_url: string | null;
  thumbnail_url: string | null;
  tags: string[] | null;
  is_public: boolean;
  created_by: string;
  created_at: string;
  xml_content: string | null;
  xml_url: string | null;
}

interface SheetMusicLibraryProps {
  searchQuery: string;
  selectedCategory: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
  viewMode: "grid" | "list";
  columns?: number;
  onPdfSelect?: (pdfUrl: string, title: string, id?: string) => void;
}

export const SheetMusicLibrary = ({
  searchQuery,
  selectedCategory,
  sortBy,
  sortOrder,
  viewMode,
  columns = 1,
  onPdfSelect,
}: SheetMusicLibraryProps) => {
  const { user } = useAuth();
  const { profile } = useUserRole();
  const { toast } = useToast();
  const [sheetMusic, setSheetMusic] = useState<SheetMusic[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [editDialog, setEditDialog] = useState<{ open: boolean; item: SheetMusic | null }>({
    open: false,
    item: null,
  });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; item: SheetMusic | null }>({
    open: false,
    item: null,
  });

  // Check if user can edit music (admins and librarians only)
  const canEditMusic = profile?.role && ['admin', 'super-admin', 'librarian'].includes(profile.role);

  useEffect(() => {
    fetchSheetMusic();
  }, []);

  const fetchSheetMusic = async () => {
    try {
      console.log('SheetMusicLibrary: Starting to fetch sheet music...');
      setLoading(true);
      
      const { data, error } = await supabase
        .from('gw_sheet_music')
        .select('*')
        .eq('is_archived', false)
        .order('created_at', { ascending: false });

      console.log('SheetMusicLibrary: Query result:', { data: data?.length || 0, error });

      if (error) {
        console.error('SheetMusicLibrary: Database error:', error);
        throw error;
      }
      
      setSheetMusic(data || []);
      console.log('SheetMusicLibrary: Successfully loaded', data?.length || 0, 'items');
    } catch (error) {
      console.error('SheetMusicLibrary: Error fetching sheet music:', error);
      toast({
        title: "Error",
        description: "Failed to load sheet music library",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedMusic = useMemo(() => {
    let filtered = sheetMusic.filter((item) => {
      const matchesSearch = searchQuery === "" || 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.composer?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.arranger?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory = selectedCategory === "all" || 
        item.tags?.some(tag => tag.toLowerCase() === selectedCategory.toLowerCase());

      return matchesSearch && matchesCategory;
    });

    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case "title":
          aValue = a.title;
          bValue = b.title;
          break;
        case "composer":
          aValue = a.composer || "";
          bValue = b.composer || "";
          break;
        case "created_at":
          aValue = a.created_at;
          bValue = b.created_at;
          break;
        case "difficulty_level":
          const difficultyOrder = { "beginner": 1, "intermediate": 2, "advanced": 3, "expert": 4 };
          aValue = difficultyOrder[a.difficulty_level as keyof typeof difficultyOrder] || 0;
          bValue = difficultyOrder[b.difficulty_level as keyof typeof difficultyOrder] || 0;
          break;
        default:
          aValue = a.title;
          bValue = b.title;
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [sheetMusic, searchQuery, selectedCategory, sortBy, sortOrder]);

  const handleEdit = (item: SheetMusic) => {
    setEditDialog({ open: true, item });
  };

  const handleDelete = (item: SheetMusic) => {
    setDeleteDialog({ open: true, item });
  };

  const confirmDelete = async () => {
    if (!deleteDialog.item) return;

    try {
      const { error } = await supabase
        .from('gw_sheet_music')
        .delete()
        .eq('id', deleteDialog.item.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Sheet music deleted successfully",
      });

      setDeleteDialog({ open: false, item: null });
      fetchSheetMusic();
    } catch (error) {
      console.error('Error deleting sheet music:', error);
      toast({
        title: "Error",
        description: "Failed to delete sheet music",
        variant: "destructive",
      });
    }
  };

  const getDifficultyColor = (level: string | null) => {
    switch (level?.toLowerCase()) {
      case "beginner": return "bg-green-100 text-green-800";
      case "intermediate": return "bg-yellow-100 text-yellow-800";
      case "advanced": return "bg-orange-100 text-orange-800";
      case "expert": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-32 bg-gray-200 rounded mb-4"></div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (filteredAndSortedMusic.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No sheet music found</h3>
          <p className="text-muted-foreground text-center">
            {searchQuery || selectedCategory !== "all" 
              ? "Try adjusting your search or filter criteria"
              : "Start by uploading your first piece of sheet music"
            }
          </p>
        </CardContent>
      </Card>
    );
  }

  const getGridCols = () => {
    if (columns === 1) return 'grid-cols-1';
    if (columns === 2) return 'grid-cols-2';
    if (columns === 3) return 'grid-cols-3';
    return 'grid-cols-1';
  };

  const renderGridView = () => (
    <div className={`grid ${getGridCols()} gap-2 w-full max-w-full`}>
      {filteredAndSortedMusic.map((item) => {
        const isSelected = selectedItemId === item.id;
        
        return (
          <Card 
            key={item.id} 
            className={`group hover:shadow-lg transition-all cursor-pointer ${
              isSelected ? 'ring-2 ring-primary shadow-lg' : ''
            }`}
            onClick={() => {
              const nextId = isSelected ? null : item.id;
              setSelectedItemId(nextId);
                if (nextId && onPdfSelect) {
                  if (item.pdf_url) {
                    onPdfSelect(item.pdf_url, item.title, item.id);
                  } else if (item.xml_content || item.xml_url) {
                    // For XML files, we'll handle viewing inline
                    console.log('Selected MusicXML item:', item.title);
                  }
                }
            }}
          >
            <CardHeader className={`${isSelected ? 'pb-2' : 'pb-0 pt-2'}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0 max-w-full">
                  <CardTitle className={`${isSelected ? 'text-sm md:text-base' : 'text-xs md:text-sm'} font-medium truncate leading-snug`} title={item.title}>
                    {item.title}
                  </CardTitle>
                  {(item.composer || item.arranger) && !isSelected && (
                    <p className="text-xs text-muted-foreground truncate leading-none" title={item.composer || item.arranger}>
                      {item.composer ? `by ${item.composer}` : `arr. ${item.arranger}`}
                    </p>
                  )}
                  {isSelected && (
                    <>
                      {item.composer && (
                        <p className="text-xs text-muted-foreground truncate" title={item.composer}>
                          by {item.composer}
                        </p>
                      )}
                      {item.arranger && (
                        <p className="text-xs text-muted-foreground truncate" title={item.arranger}>
                          arr. {item.arranger}
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className={`${isSelected ? 'space-y-3' : 'space-y-0 pt-0 pb-1'}`}>
              {/* Collapsed/Expanded Content */}
              {isSelected ? (
                <div className="space-y-3">
                  {/* PDF Viewer */}
                  {item.pdf_url && (
                    <div className="aspect-[3/4] bg-muted rounded-lg overflow-hidden">
                      <PDFThumbnail
                        pdfUrl={item.pdf_url}
                        alt={`${item.title} thumbnail`}
                        title={item.title}
                        className="w-full h-full"
                      />
                    </div>
                  )}
                  
                  {/* MusicXML Viewer */}
                  {(item.xml_content || item.xml_url) && !item.pdf_url && (
                    <div className="bg-muted rounded-lg overflow-hidden h-64">
                      <OSMDViewer
                        xmlContent={item.xml_content || undefined}
                        xmlUrl={item.xml_url || undefined}
                        title={item.title}
                        className="w-full h-full"
                      />
                    </div>
                  )}
                  
                  {/* Fallback when no content */}
                  {!item.pdf_url && !item.xml_content && !item.xml_url && (
                    <div className="aspect-[3/4] bg-muted rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">No preview available</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-1.5 bg-muted/20 rounded-sm flex items-center justify-center">
                  <div className="w-2 h-1 bg-muted-foreground/30 rounded-sm"></div>
                </div>
              )}

              {/* Details - only show when selected */}
              {isSelected && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {item.key_signature && (
                      <span>Key: {item.key_signature}</span>
                    )}
                    {item.time_signature && (
                      <span>• {item.time_signature}</span>
                    )}
                  </div>

                  {item.voice_parts && item.voice_parts.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {item.voice_parts.slice(0, 3).map((part, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {part}
                        </Badge>
                      ))}
                      {item.voice_parts.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{item.voice_parts.length - 3} more
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {canEditMusic && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(item);
                    }}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                )}
                {canEditMusic && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(item);
                    }}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );

  const renderListView = () => (
    <div className="space-y-1 w-full max-w-full">
      {filteredAndSortedMusic.map((item) => {
        const isSelected = selectedItemId === item.id;
        
        return (
          <Card 
            key={item.id} 
            className={`hover:shadow-md transition-all cursor-pointer ${
              isSelected ? 'ring-2 ring-primary shadow-lg' : ''
            }`}
            onClick={() => {
              const nextId = isSelected ? null : item.id;
              setSelectedItemId(nextId);
              if (nextId && onPdfSelect) {
                if (item.pdf_url) {
                  onPdfSelect(item.pdf_url, item.title, item.id);
                } else if (item.xml_content || item.xml_url) {
                  // For XML files, we'll handle viewing inline
                  console.log('Selected MusicXML item:', item.title);
                }
              }
            }}
          >
            <CardContent className={`${isSelected ? 'p-3' : 'py-1 px-3'}`}>
              <div className="flex items-center gap-2 min-h-[2.5rem]">
                {/* Collapsed/Expanded Thumbnail */}
                {isSelected ? (
                  <div className="w-12 h-16 bg-muted rounded overflow-hidden flex-shrink-0">
                    {item.pdf_url ? (
                      <PDFThumbnail
                        pdfUrl={item.pdf_url}
                        alt={`${item.title} thumbnail`}
                        title={item.title}
                        className="w-full h-full"
                      />
                    ) : (item.xml_content || item.xml_url) ? (
                      <div className="w-full h-full flex items-center justify-center bg-blue-50">
                        <Music2 className="h-4 w-4 text-blue-600" />
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-4 h-4 bg-muted/30 rounded flex items-center justify-center flex-shrink-0">
                    {(item.xml_content || item.xml_url) ? (
                      <Music2 className="h-2 w-2 text-blue-600/60" />
                    ) : (
                      <div className="w-2 h-1 bg-muted-foreground/30 rounded-sm"></div>
                    )}
                  </div>
                )}

                {/* Content */}
                <div className="flex-1 min-w-0 max-w-full">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0 max-w-full">
                      <h3 className={`${isSelected ? 'text-xs sm:text-sm md:text-base' : 'text-xs sm:text-sm'} font-medium truncate leading-snug`}>{item.title}</h3>
                      {(item.composer || item.arranger) && (
                        <p className="text-xs text-muted-foreground truncate leading-none">
                          {item.composer ? `by ${item.composer}` : `arr. ${item.arranger}`}
                        </p>
                      )}
                      
                      {isSelected && (
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          {item.key_signature && <span>Key: {item.key_signature}</span>}
                          {item.time_signature && <span>Time: {item.time_signature}</span>}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1 flex-shrink-0">
                      {canEditMusic && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(item);
                          }}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      )}
                      {canEditMusic && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(item);
                          }}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Expanded MusicXML View for List Mode */}
              {isSelected && (item.xml_content || item.xml_url) && !item.pdf_url && (
                <div className="mt-3 bg-muted rounded-lg overflow-hidden h-48">
                  <OSMDViewer
                    xmlContent={item.xml_content || undefined}
                    xmlUrl={item.xml_url || undefined}
                    title={item.title}
                    className="w-full h-full"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );

  return (
    <>
      {viewMode === "grid" ? renderGridView() : renderListView()}

      {/* Dialogs */}
      <SheetMusicEditDialog
        open={editDialog.open}
        onOpenChange={(open) => setEditDialog({ open, item: null })}
        item={editDialog.item}
        onSave={fetchSheetMusic}
      />

      <DeleteConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, item: null })}
        title="Delete Sheet Music"
        description={`Are you sure you want to delete "${deleteDialog.item?.title}"? This action cannot be undone.`}
        onConfirm={confirmDelete}
      />
    </>
  );
};