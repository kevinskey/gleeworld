import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface AudioTrack {
  id: string;
  title: string;
  artist: string | null;
  album_id: string | null;
  audio_url: string | null;
  duration: number | null;
  track_number: number | null;
  lyrics: string | null;
  genre: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
  play_count: number;
  music_albums?: {
    title: string;
    cover_image_url: string | null;
  };
}

interface AudioEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: AudioTrack | null;
  onSave: () => void;
}

export const AudioEditDialog = ({
  open,
  onOpenChange,
  item,
  onSave,
}: AudioEditDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    artist: "",
    genre: "",
    track_number: "",
    lyrics: "",
  });

  useEffect(() => {
    if (item) {
      setFormData({
        title: item.title || "",
        artist: item.artist || "",
        genre: item.genre || "",
        track_number: item.track_number?.toString() || "",
        lyrics: item.lyrics || "",
      });
    }
  }, [item]);

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
        .from('music_tracks')
        .update({
          title: formData.title,
          artist: formData.artist || null,
          genre: formData.genre || null,
          track_number: formData.track_number ? parseInt(formData.track_number) : null,
          lyrics: formData.lyrics || null,
        })
        .eq('id', item.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Audio track updated successfully",
      });

      onSave();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating audio track:', error);
      toast({
        title: "Error",
        description: "Failed to update audio track",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Audio Track</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter track title"
            />
          </div>

          <div>
            <Label htmlFor="artist">Artist</Label>
            <Input
              id="artist"
              value={formData.artist}
              onChange={(e) => setFormData(prev => ({ ...prev, artist: e.target.value }))}
              placeholder="Enter artist name"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="genre">Genre</Label>
              <Select value={formData.genre} onValueChange={(value) => setFormData(prev => ({ ...prev, genre: value }))}>
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
              <Label htmlFor="track_number">Track Number</Label>
              <Input
                id="track_number"
                type="number"
                value={formData.track_number}
                onChange={(e) => setFormData(prev => ({ ...prev, track_number: e.target.value }))}
                placeholder="Track #"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="lyrics">Lyrics</Label>
            <Textarea
              id="lyrics"
              value={formData.lyrics}
              onChange={(e) => setFormData(prev => ({ ...prev, lyrics: e.target.value }))}
              placeholder="Enter lyrics (optional)"
              rows={4}
            />
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