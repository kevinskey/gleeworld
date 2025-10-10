import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Save, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export const InterviewManager = () => {
  const { user } = useAuth();
  const [intervieweeName, setIntervieweeName] = useState("");
  const [classYear, setClassYear] = useState<number | undefined>(undefined);
  const [title, setTitle] = useState("");
  const [interviewType, setInterviewType] = useState<'video' | 'audio' | 'text'>('text');
  const [videoUrl, setVideoUrl] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [transcript, setTranscript] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [durationMinutes, setDurationMinutes] = useState<number | undefined>(undefined);
  const [tags, setTags] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!intervieweeName || !title) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSaving(true);
    try {
      const interviewData = {
        interviewee_name: intervieweeName,
        interviewee_class_year: classYear || null,
        title,
        interview_type: interviewType,
        video_url: videoUrl || null,
        audio_url: audioUrl || null,
        transcript: transcript || null,
        excerpt: excerpt || null,
        thumbnail_url: thumbnailUrl || null,
        duration_minutes: durationMinutes || null,
        tags: tags ? tags.split(',').map(t => t.trim()) : [],
        is_featured: isFeatured,
        is_published: isPublished,
        published_by: user?.id,
        published_at: isPublished ? new Date().toISOString() : null
      };

      const { error } = await supabase
        .from('alumnae_interviews')
        .insert(interviewData);

      if (error) throw error;

      toast.success("Interview saved successfully!");
      
      // Reset form
      setIntervieweeName("");
      setClassYear(undefined);
      setTitle("");
      setInterviewType('text');
      setVideoUrl("");
      setAudioUrl("");
      setTranscript("");
      setExcerpt("");
      setThumbnailUrl("");
      setDurationMinutes(undefined);
      setTags("");
      setIsFeatured(false);
      setIsPublished(false);
    } catch (error: any) {
      console.error('Error saving interview:', error);
      toast.error(error.message || "Failed to save interview");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="intervieweeName">Interviewee Name *</Label>
          <Input
            id="intervieweeName"
            placeholder="Enter interviewee name"
            value={intervieweeName}
            onChange={(e) => setIntervieweeName(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="classYear">Class Year</Label>
          <Input
            id="classYear"
            type="number"
            placeholder="e.g., 2020"
            value={classYear || ""}
            onChange={(e) => setClassYear(e.target.value ? parseInt(e.target.value) : undefined)}
            min={1900}
            max={2100}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">Interview Title *</Label>
        <Input
          id="title"
          placeholder="Enter interview title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="interviewType">Interview Type</Label>
        <Select value={interviewType} onValueChange={(val) => setInterviewType(val as any)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="text">Text</SelectItem>
            <SelectItem value="audio">Audio</SelectItem>
            <SelectItem value="video">Video</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {interviewType === 'video' && (
        <div className="space-y-2">
          <Label htmlFor="videoUrl">Video URL</Label>
          <Input
            id="videoUrl"
            placeholder="https://..."
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
          />
        </div>
      )}

      {interviewType === 'audio' && (
        <div className="space-y-2">
          <Label htmlFor="audioUrl">Audio URL</Label>
          <Input
            id="audioUrl"
            placeholder="https://..."
            value={audioUrl}
            onChange={(e) => setAudioUrl(e.target.value)}
          />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="excerpt">Excerpt (Short Description)</Label>
        <Textarea
          id="excerpt"
          placeholder="Brief description or quote from the interview"
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="transcript">Transcript/Full Content</Label>
        <Textarea
          id="transcript"
          placeholder="Full transcript or interview content"
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          rows={8}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="thumbnailUrl">Thumbnail Image URL</Label>
          <Input
            id="thumbnailUrl"
            placeholder="https://..."
            value={thumbnailUrl}
            onChange={(e) => setThumbnailUrl(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="duration">Duration (minutes)</Label>
          <Input
            id="duration"
            type="number"
            placeholder="e.g., 30"
            value={durationMinutes || ""}
            onChange={(e) => setDurationMinutes(e.target.value ? parseInt(e.target.value) : undefined)}
            min={1}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="tags">Tags (comma-separated)</Label>
        <Input
          id="tags"
          placeholder="career, music, leadership"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
        />
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center space-x-2">
          <Switch
            id="featured"
            checked={isFeatured}
            onCheckedChange={setIsFeatured}
          />
          <Label htmlFor="featured">Featured Interview</Label>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t">
        <Button
          variant={isPublished ? "destructive" : "default"}
          onClick={() => setIsPublished(!isPublished)}
          className="gap-2"
        >
          {isPublished ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {isPublished ? "Unpublish" : "Publish"}
        </Button>

        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save Interview"}
        </Button>
      </div>
    </div>
  );
};
