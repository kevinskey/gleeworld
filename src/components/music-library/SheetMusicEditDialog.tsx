import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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

interface SheetMusicEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: SheetMusic | null;
  onSave: () => void;
}

export const SheetMusicEditDialog = ({
  open,
  onOpenChange,
  item,
  onSave,
}: SheetMusicEditDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    composer: "",
    arranger: "",
    key_signature: "",
    time_signature: "",
    tempo_marking: "",
    difficulty_level: "",
    language: "",
    tags: [] as string[],
  });

  useEffect(() => {
    if (item) {
      setFormData({
        title: item.title || "",
        composer: item.composer || "",
        arranger: item.arranger || "",
        key_signature: item.key_signature || "",
        time_signature: item.time_signature || "",
        tempo_marking: item.tempo_marking || "",
        difficulty_level: item.difficulty_level || "",
        language: item.language || "",
        tags: item.tags || [],
      });
    }
  }, [item]);

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleSave = async () => {
    if (!item || !formData.title.trim()) {
      toast({
        title: "Error",
        description: "Title is required",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase
        .from('gw_sheet_music')
        .update({
          title: formData.title,
          composer: formData.composer || null,
          arranger: formData.arranger || null,
          key_signature: formData.key_signature || null,
          time_signature: formData.time_signature || null,
          tempo_marking: formData.tempo_marking || null,
          difficulty_level: formData.difficulty_level || null,
          language: formData.language || null,
          tags: formData.tags,
        })
        .eq('id', item.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Sheet music updated successfully",
      });

      onSave();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating sheet music:', error);
      toast({
        title: "Error",
        description: "Failed to update sheet music",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Sheet Music</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter piece title"
              />
            </div>
            <div>
              <Label htmlFor="composer">Composer</Label>
              <Input
                id="composer"
                value={formData.composer}
                onChange={(e) => setFormData(prev => ({ ...prev, composer: e.target.value }))}
                placeholder="Enter composer name"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="arranger">Arranger</Label>
              <Input
                id="arranger"
                value={formData.arranger}
                onChange={(e) => setFormData(prev => ({ ...prev, arranger: e.target.value }))}
                placeholder="Enter arranger name"
              />
            </div>
            <div>
              <Label htmlFor="language">Language</Label>
              <Input
                id="language"
                value={formData.language}
                onChange={(e) => setFormData(prev => ({ ...prev, language: e.target.value }))}
                placeholder="e.g., English, Latin"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="key">Key Signature</Label>
              <Input
                id="key"
                value={formData.key_signature}
                onChange={(e) => setFormData(prev => ({ ...prev, key_signature: e.target.value }))}
                placeholder="e.g., C major"
              />
            </div>
            <div>
              <Label htmlFor="time">Time Signature</Label>
              <Input
                id="time"
                value={formData.time_signature}
                onChange={(e) => setFormData(prev => ({ ...prev, time_signature: e.target.value }))}
                placeholder="e.g., 4/4"
              />
            </div>
            <div>
              <Label htmlFor="tempo">Tempo Marking</Label>
              <Input
                id="tempo"
                value={formData.tempo_marking}
                onChange={(e) => setFormData(prev => ({ ...prev, tempo_marking: e.target.value }))}
                placeholder="e.g., Andante"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="difficulty">Difficulty Level</Label>
            <Select value={formData.difficulty_level} onValueChange={(value) => setFormData(prev => ({ ...prev, difficulty_level: value }))}>
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
              {formData.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                  {tag}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => removeTag(tag)} />
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};