import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BookOpen, Search, Download, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

interface SheetMusic {
  id: string;
  title: string;
  composer: string;
  voice_parts?: string[];
  difficulty_level: string;
  is_public: boolean;
  created_at: string;
}

export const MusicLibraryViewer = () => {
  const navigate = useNavigate();
  const [sheetMusic, setSheetMusic] = useState<SheetMusic[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  useEffect(() => {
    fetchSheetMusic();
  }, []);

  const fetchSheetMusic = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_sheet_music')
        .select('*')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setSheetMusic(data || []);
    } catch (error) {
      console.error('Error fetching sheet music:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMusic = sheetMusic.filter(music =>
    music.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    music.composer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'beginner': return 'default';
      case 'intermediate': return 'secondary';
      case 'advanced': return 'destructive';
      default: return 'outline';
    }
  };

  const handleTitleClick = (music: SheetMusic) => {
    setEditingId(music.id);
    setEditingTitle(music.title);
  };

  const handleTitleSave = async (musicId: string) => {
    if (!editingTitle.trim()) return;
    
    try {
      const { error } = await supabase
        .from('gw_sheet_music')
        .update({ title: editingTitle })
        .eq('id', musicId);

      if (error) throw error;

      setSheetMusic(prev => 
        prev.map(music => 
          music.id === musicId ? { ...music, title: editingTitle } : music
        )
      );
    } catch (error) {
      console.error('Error updating title:', error);
    } finally {
      setEditingId(null);
      setEditingTitle("");
    }
  };

  const handleTitleCancel = () => {
    setEditingId(null);
    setEditingTitle("");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Music Library
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search sheet music..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {loading ? (
          <div className="text-muted-foreground">Loading sheet music...</div>
        ) : filteredMusic.length > 0 ? (
          <div className="space-y-3">
            {filteredMusic.map((music) => (
              <div key={music.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-sm">
                      {editingId === music.id ? (
                        <Input
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleTitleSave(music.id);
                            if (e.key === 'Escape') handleTitleCancel();
                          }}
                          onBlur={() => handleTitleSave(music.id)}
                          className="h-6 px-2 text-sm font-medium min-w-0 flex-shrink"
                          autoFocus
                        />
                      ) : (
                        <h4 
                          className="font-medium cursor-pointer hover:text-primary" 
                          onClick={() => handleTitleClick(music)}
                        >
                          {music.title}
                        </h4>
                      )}
                      <span className="text-muted-foreground">by {music.composer || "Unknown"}</span>
                      {music.voice_parts && music.voice_parts.length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {music.voice_parts.join(', ')}
                        </Badge>
                      )}
                      <Badge variant="secondary" className="text-xs">
                        D
                      </Badge>
                      <span className="text-xs text-muted-foreground">5 copies</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-muted-foreground text-center py-4">
            {searchTerm ? "No music found matching your search" : "No sheet music available"}
          </div>
        )}

        <Button 
          variant="outline" 
          size="sm" 
          className="w-full"
          onClick={() => navigate('/music-library')}
        >
          View Full Library
        </Button>
      </CardContent>
    </Card>
  );
};