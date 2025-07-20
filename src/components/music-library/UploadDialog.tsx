import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, Music, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeTab: string;
}

export const UploadDialog = ({ open, onOpenChange, activeTab }: UploadDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [currentTab, setCurrentTab] = useState(activeTab);

  // Sheet Music Form
  const [sheetMusicForm, setSheetMusicForm] = useState({
    title: "",
    composer: "",
    arranger: "",
    key_signature: "",
    time_signature: "",
    tempo_marking: "",
    difficulty_level: "",
    language: "",
    tags: [] as string[],
    pdfFile: null as File | null,
    audioFile: null as File | null,
  });

  // Audio Form
  const [audioForm, setAudioForm] = useState({
    title: "",
    artist: "",
    genre: "",
    audioFile: null as File | null,
  });

  const [newTag, setNewTag] = useState("");

  const addTag = () => {
    if (newTag.trim() && !sheetMusicForm.tags.includes(newTag.trim())) {
      setSheetMusicForm(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setSheetMusicForm(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleFileChange = (file: File | null, type: "pdf" | "audio" | "audioTrack") => {
    if (type === "pdf") {
      setSheetMusicForm(prev => ({ ...prev, pdfFile: file }));
    } else if (type === "audio") {
      setSheetMusicForm(prev => ({ ...prev, audioFile: file }));
    } else if (type === "audioTrack") {
      setAudioForm(prev => ({ ...prev, audioFile: file }));
    }
  };

  const uploadFile = async (file: File, bucket: string, folder: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file);

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const submitSheetMusic = async () => {
    if (!sheetMusicForm.title.trim() || !sheetMusicForm.pdfFile) {
      toast({
        title: "Error",
        description: "Please provide a title and PDF file",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      // Upload PDF
      const pdfUrl = await uploadFile(sheetMusicForm.pdfFile, 'sheet-music', 'pdfs');
      
      // Upload audio preview if provided
      let audioUrl = null;
      if (sheetMusicForm.audioFile) {
        audioUrl = await uploadFile(sheetMusicForm.audioFile, 'sheet-music', 'audio');
      }

      // Insert sheet music record
      const { error } = await supabase
        .from('gw_sheet_music')
        .insert({
          title: sheetMusicForm.title,
          composer: sheetMusicForm.composer || null,
          arranger: sheetMusicForm.arranger || null,
          key_signature: sheetMusicForm.key_signature || null,
          time_signature: sheetMusicForm.time_signature || null,
          tempo_marking: sheetMusicForm.tempo_marking || null,
          difficulty_level: sheetMusicForm.difficulty_level || null,
          language: sheetMusicForm.language || null,
          pdf_url: pdfUrl,
          audio_preview_url: audioUrl,
          tags: sheetMusicForm.tags,
          is_public: true,
          created_by: user?.id,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Sheet music uploaded successfully",
      });

      // Reset form
      setSheetMusicForm({
        title: "",
        composer: "",
        arranger: "",
        key_signature: "",
        time_signature: "",
        tempo_marking: "",
        difficulty_level: "",
        language: "",
        tags: [],
        pdfFile: null,
        audioFile: null,
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Error uploading sheet music:', error);
      toast({
        title: "Error",
        description: "Failed to upload sheet music",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const submitAudio = async () => {
    if (!audioForm.title.trim() || !audioForm.audioFile) {
      toast({
        title: "Error",
        description: "Please provide a title and audio file",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      // Upload audio file
      const audioUrl = await uploadFile(audioForm.audioFile, 'sheet-music', 'audio');

      // Insert track record
      const { error } = await supabase
        .from('music_tracks')
        .insert({
          title: audioForm.title,
          artist: audioForm.artist || null,
          genre: audioForm.genre || null,
          audio_url: audioUrl,
          created_by: user?.id,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Audio track uploaded successfully",
      });

      // Reset form
      setAudioForm({
        title: "",
        artist: "",
        genre: "",
        audioFile: null,
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Error uploading audio:', error);
      toast({
        title: "Error",
        description: "Failed to upload audio track",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Music</DialogTitle>
        </DialogHeader>

        <Tabs value={currentTab} onValueChange={setCurrentTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="sheet-music">Sheet Music (PDF)</TabsTrigger>
            <TabsTrigger value="audio">Audio Track (MP3)</TabsTrigger>
          </TabsList>

          <TabsContent value="sheet-music" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sm-title">Title *</Label>
                <Input
                  id="sm-title"
                  value={sheetMusicForm.title}
                  onChange={(e) => setSheetMusicForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter piece title"
                />
              </div>
              <div>
                <Label htmlFor="sm-composer">Composer</Label>
                <Input
                  id="sm-composer"
                  value={sheetMusicForm.composer}
                  onChange={(e) => setSheetMusicForm(prev => ({ ...prev, composer: e.target.value }))}
                  placeholder="Enter composer name"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sm-arranger">Arranger</Label>
                <Input
                  id="sm-arranger"
                  value={sheetMusicForm.arranger}
                  onChange={(e) => setSheetMusicForm(prev => ({ ...prev, arranger: e.target.value }))}
                  placeholder="Enter arranger name"
                />
              </div>
              <div>
                <Label htmlFor="sm-language">Language</Label>
                <Input
                  id="sm-language"
                  value={sheetMusicForm.language}
                  onChange={(e) => setSheetMusicForm(prev => ({ ...prev, language: e.target.value }))}
                  placeholder="e.g., English, Latin"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="sm-key">Key Signature</Label>
                <Input
                  id="sm-key"
                  value={sheetMusicForm.key_signature}
                  onChange={(e) => setSheetMusicForm(prev => ({ ...prev, key_signature: e.target.value }))}
                  placeholder="e.g., C major"
                />
              </div>
              <div>
                <Label htmlFor="sm-time">Time Signature</Label>
                <Input
                  id="sm-time"
                  value={sheetMusicForm.time_signature}
                  onChange={(e) => setSheetMusicForm(prev => ({ ...prev, time_signature: e.target.value }))}
                  placeholder="e.g., 4/4"
                />
              </div>
              <div>
                <Label htmlFor="sm-tempo">Tempo Marking</Label>
                <Input
                  id="sm-tempo"
                  value={sheetMusicForm.tempo_marking}
                  onChange={(e) => setSheetMusicForm(prev => ({ ...prev, tempo_marking: e.target.value }))}
                  placeholder="e.g., Andante"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="sm-difficulty">Difficulty Level</Label>
              <Select value={sheetMusicForm.difficulty_level} onValueChange={(value) => setSheetMusicForm(prev => ({ ...prev, difficulty_level: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                  <SelectItem value="expert">Expert</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Tags</Label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add a tag"
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                />
                <Button type="button" onClick={addTag}>Add</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {sheetMusicForm.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                    {tag}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => removeTag(tag)} />
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="sm-pdf">PDF File *</Label>
              <Input
                id="sm-pdf"
                type="file"
                accept=".pdf"
                onChange={(e) => handleFileChange(e.target.files?.[0] || null, "pdf")}
              />
            </div>

            <div>
              <Label htmlFor="sm-audio">Audio Preview (optional)</Label>
              <Input
                id="sm-audio"
                type="file"
                accept="audio/*"
                onChange={(e) => handleFileChange(e.target.files?.[0] || null, "audio")}
              />
            </div>

            <Button onClick={submitSheetMusic} disabled={loading} className="w-full">
              {loading ? "Uploading..." : "Upload Sheet Music"}
            </Button>
          </TabsContent>

          <TabsContent value="audio" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="audio-title">Title *</Label>
                <Input
                  id="audio-title"
                  value={audioForm.title}
                  onChange={(e) => setAudioForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter track title"
                />
              </div>
              <div>
                <Label htmlFor="audio-artist">Artist</Label>
                <Input
                  id="audio-artist"
                  value={audioForm.artist}
                  onChange={(e) => setAudioForm(prev => ({ ...prev, artist: e.target.value }))}
                  placeholder="Enter artist name"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="audio-genre">Genre</Label>
              <Select value={audioForm.genre} onValueChange={(value) => setAudioForm(prev => ({ ...prev, genre: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select genre" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="classical">Classical</SelectItem>
                  <SelectItem value="gospel">Gospel</SelectItem>
                  <SelectItem value="spiritual">Spirituals</SelectItem>
                  <SelectItem value="contemporary">Contemporary</SelectItem>
                  <SelectItem value="folk">Folk</SelectItem>
                  <SelectItem value="world">World Music</SelectItem>
                  <SelectItem value="liturgical">Liturgical</SelectItem>
                  <SelectItem value="traditional">Traditional</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="audio-file">Audio File *</Label>
              <Input
                id="audio-file"
                type="file"
                accept="audio/*"
                onChange={(e) => handleFileChange(e.target.files?.[0] || null, "audioTrack")}
              />
            </div>

            <Button onClick={submitAudio} disabled={loading} className="w-full">
              {loading ? "Uploading..." : "Upload Audio Track"}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};