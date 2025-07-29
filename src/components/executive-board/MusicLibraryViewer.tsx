import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BookOpen, Search, Download, Eye, X, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SheetMusic {
  id: string;
  title: string;
  composer: string;
  voice_parts?: string[];
  difficulty_level: string;
  is_public: boolean;
  created_at: string;
  key_signature?: string;
  time_signature?: string;
  tempo?: string;
}

export const MusicLibraryViewer = () => {
  const navigate = useNavigate();
  const [sheetMusic, setSheetMusic] = useState<SheetMusic[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState({
    title: "",
    voicing: "",
    customVoicing: "",
    keySignature: "",
    timeSignature: "",
    tempo: ""
  });

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
    setEditingData({
      title: music.title,
      voicing: music.voice_parts?.[0] || "",
      customVoicing: "",
      keySignature: music.key_signature || "",
      timeSignature: music.time_signature || "",
      tempo: music.tempo || ""
    });
  };

  const handleSave = async (musicId: string) => {
    if (!editingData.title.trim()) return;
    
    const finalVoicing = editingData.voicing === "Custom" ? editingData.customVoicing : editingData.voicing;
    
    try {
      const { error } = await supabase
        .from('gw_sheet_music')
        .update({ 
          title: editingData.title,
          voice_parts: finalVoicing ? [finalVoicing] : null,
          key_signature: editingData.keySignature || null,
          time_signature: editingData.timeSignature || null,
          tempo: editingData.tempo || null
        })
        .eq('id', musicId);

      if (error) throw error;

      setSheetMusic(prev => 
        prev.map(music => 
          music.id === musicId ? { 
            ...music, 
            title: editingData.title,
            voice_parts: finalVoicing ? [finalVoicing] : music.voice_parts,
            key_signature: editingData.keySignature || music.key_signature,
            time_signature: editingData.timeSignature || music.time_signature,
            tempo: editingData.tempo || music.tempo
          } : music
        )
      );
    } catch (error) {
      console.error('Error updating sheet music:', error);
    } finally {
      setEditingId(null);
      setEditingData({
        title: "",
        voicing: "",
        customVoicing: "",
        keySignature: "",
        timeSignature: "",
        tempo: ""
      });
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditingData({
      title: "",
      voicing: "",
      customVoicing: "",
      keySignature: "",
      timeSignature: "",
      tempo: ""
    });
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
                        <div className="flex-1 space-y-2 p-2 border rounded bg-background">
                          <div className="flex items-center gap-2">
                            <Input
                              value={editingData.title}
                              onChange={(e) => setEditingData(prev => ({ ...prev, title: e.target.value }))}
                              placeholder="Title"
                              className="h-8 text-sm font-medium"
                            />
                            <Button size="sm" variant="ghost" onClick={() => handleSave(music.id)}>
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={handleCancel}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <Select value={editingData.voicing} onValueChange={(value) => setEditingData(prev => ({ ...prev, voicing: value }))}>
                                <SelectTrigger className="h-6">
                                  <SelectValue placeholder="Voicing" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="S">S</SelectItem>
                                  <SelectItem value="SA">SA</SelectItem>
                                  <SelectItem value="SSA">SSA</SelectItem>
                                  <SelectItem value="SSAA">SSAA</SelectItem>
                                  <SelectItem value="SATB">SATB</SelectItem>
                                  <SelectItem value="TTBB">TTBB</SelectItem>
                                  <SelectItem value="Custom">Custom</SelectItem>
                                </SelectContent>
                              </Select>
                              {editingData.voicing === "Custom" && (
                                <Input
                                  value={editingData.customVoicing}
                                  onChange={(e) => setEditingData(prev => ({ ...prev, customVoicing: e.target.value }))}
                                  placeholder="Custom voicing"
                                  className="h-6 mt-1"
                                />
                              )}
                            </div>
                            <Input
                              value={editingData.keySignature}
                              onChange={(e) => setEditingData(prev => ({ ...prev, keySignature: e.target.value }))}
                              placeholder="Key signature"
                              className="h-6"
                            />
                            <Input
                              value={editingData.timeSignature}
                              onChange={(e) => setEditingData(prev => ({ ...prev, timeSignature: e.target.value }))}
                              placeholder="Time signature"
                              className="h-6"
                            />
                            <Input
                              value={editingData.tempo}
                              onChange={(e) => setEditingData(prev => ({ ...prev, tempo: e.target.value }))}
                              placeholder="Tempo"
                              className="h-6"
                            />
                          </div>
                        </div>
                      ) : (
                        <>
                          <h4 
                            className="font-medium cursor-pointer hover:text-primary" 
                            onClick={() => handleTitleClick(music)}
                          >
                            {music.title}
                          </h4>
                          <span className="text-muted-foreground">by {music.composer || "Unknown"}</span>
                          {music.voice_parts && music.voice_parts.length > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {music.voice_parts.join(', ')}
                            </Badge>
                          )}
                          {music.key_signature && (
                            <Badge variant="outline" className="text-xs">
                              {music.key_signature}
                            </Badge>
                          )}
                          {music.time_signature && (
                            <Badge variant="outline" className="text-xs">
                              {music.time_signature}
                            </Badge>
                          )}
                          {music.tempo && (
                            <Badge variant="outline" className="text-xs">
                              {music.tempo}
                            </Badge>
                          )}
                          <Badge variant="secondary" className="text-xs">
                            D
                          </Badge>
                          <span className="text-xs text-muted-foreground">5 copies</span>
                        </>
                      )}
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