import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  FileText, 
  Download, 
  Eye, 
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
import { SheetMusicEditDialog } from "./SheetMusicEditDialog";
import { SheetMusicViewDialog } from "./SheetMusicViewDialog";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";

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
}

interface SheetMusicLibraryProps {
  searchQuery: string;
  selectedCategory: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
  viewMode: "grid" | "list";
}

export const SheetMusicLibrary = ({
  searchQuery,
  selectedCategory,
  sortBy,
  sortOrder,
  viewMode,
}: SheetMusicLibraryProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sheetMusic, setSheetMusic] = useState<SheetMusic[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialog, setEditDialog] = useState<{ open: boolean; item: SheetMusic | null }>({
    open: false,
    item: null,
  });
  const [viewDialog, setViewDialog] = useState<{ open: boolean; item: SheetMusic | null }>({
    open: false,
    item: null,
  });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; item: SheetMusic | null }>({
    open: false,
    item: null,
  });

  useEffect(() => {
    fetchSheetMusic();
  }, []);

  const fetchSheetMusic = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('gw_sheet_music')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSheetMusic(data || []);
    } catch (error) {
      console.error('Error fetching sheet music:', error);
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

  const handleView = (item: SheetMusic) => {
    setViewDialog({ open: true, item });
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

  const renderGridView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {filteredAndSortedMusic.map((item) => (
        <Card key={item.id} className="group hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-sm font-medium truncate" title={item.title}>
                  {item.title}
                </CardTitle>
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
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Thumbnail */}
            <div className="aspect-[3/4] bg-muted rounded-lg overflow-hidden">
              {item.thumbnail_url ? (
                <img
                  src={item.thumbnail_url}
                  alt={`${item.title} thumbnail`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <FileText className="h-12 w-12 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Details */}
            <div className="space-y-2">
              {item.difficulty_level && (
                <Badge variant="secondary" className={getDifficultyColor(item.difficulty_level)}>
                  {item.difficulty_level}
                </Badge>
              )}
              
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

            {/* Actions */}
            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button size="sm" variant="outline" onClick={() => handleView(item)}>
                <Eye className="h-3 w-3" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleEdit(item)}>
                <Edit className="h-3 w-3" />
              </Button>
              {item.pdf_url && (
                <Button size="sm" variant="outline" asChild>
                  <a href={item.pdf_url} download target="_blank" rel="noopener noreferrer">
                    <Download className="h-3 w-3" />
                  </a>
                </Button>
              )}
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => handleDelete(item)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderListView = () => (
    <div className="space-y-2">
      {filteredAndSortedMusic.map((item) => (
        <Card key={item.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              {/* Thumbnail */}
              <div className="w-16 h-20 bg-muted rounded overflow-hidden flex-shrink-0">
                {item.thumbnail_url ? (
                  <img
                    src={item.thumbnail_url}
                    alt={`${item.title} thumbnail`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FileText className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{item.title}</h3>
                    {item.composer && (
                      <p className="text-sm text-muted-foreground">by {item.composer}</p>
                    )}
                    {item.arranger && (
                      <p className="text-sm text-muted-foreground">arr. {item.arranger}</p>
                    )}
                    
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      {item.key_signature && <span>Key: {item.key_signature}</span>}
                      {item.time_signature && <span>Time: {item.time_signature}</span>}
                      {item.difficulty_level && (
                        <Badge variant="secondary" className={getDifficultyColor(item.difficulty_level)}>
                          {item.difficulty_level}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleView(item)}>
                      <Eye className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleEdit(item)}>
                      <Edit className="h-3 w-3" />
                    </Button>
                    {item.pdf_url && (
                      <Button size="sm" variant="outline" asChild>
                        <a href={item.pdf_url} download target="_blank" rel="noopener noreferrer">
                          <Download className="h-3 w-3" />
                        </a>
                      </Button>
                    )}
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleDelete(item)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
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

      <SheetMusicViewDialog
        open={viewDialog.open}
        onOpenChange={(open) => setViewDialog({ open, item: null })}
        item={viewDialog.item}
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