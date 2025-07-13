import { useState, useRef } from "react";
import { ArrowLeft, Upload, File, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useSheetMusic } from "@/hooks/useSheetMusic";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface SheetMusicUploadProps {
  onBack: () => void;
  onUploadComplete: () => void;
}

const VOICE_PARTS = ['Soprano', 'Alto', 'Tenor', 'Bass'];
const DIFFICULTY_LEVELS = ['Easy', 'Medium', 'Hard'];
const COMMON_TAGS = ['Classical', 'Contemporary', 'Spiritual', 'Folk', 'Pop', 'Jazz', 'Musical Theatre', 'Traditional'];

export const SheetMusicUpload = ({ onBack, onUploadComplete }: SheetMusicUploadProps) => {
  const [title, setTitle] = useState("");
  const [composer, setComposer] = useState("");
  const [arranger, setArranger] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [keySignature, setKeySignature] = useState("");
  const [timeSignature, setTimeSignature] = useState("");
  const [tempoMarking, setTempoMarking] = useState("");
  const [language, setLanguage] = useState("");
  const [voiceParts, setVoiceParts] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { createSheetMusic } = useSheetMusic();
  const { toast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast({
          title: "Invalid File Type",
          description: "Please select a PDF file.",
          variant: "destructive",
        });
        return;
      }
      
      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        toast({
          title: "File Too Large",
          description: "Please select a file smaller than 50MB.",
          variant: "destructive",
        });
        return;
      }
      
      setSelectedFile(file);
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const handleVoicePartChange = (voicePart: string, checked: boolean) => {
    if (checked) {
      setVoiceParts([...voiceParts, voicePart]);
    } else {
      setVoiceParts(voiceParts.filter(vp => vp !== voicePart));
    }
  };

  const handleTagChange = (tag: string, checked: boolean) => {
    if (checked) {
      setTags([...tags, tag]);
    } else {
      setTags(tags.filter(t => t !== tag));
    }
  };

  const addCustomTag = () => {
    if (customTag.trim() && !tags.includes(customTag.trim())) {
      setTags([...tags, customTag.trim()]);
      setCustomTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile) {
      toast({
        title: "No File Selected",
        description: "Please select a PDF file to upload.",
        variant: "destructive",
      });
      return;
    }

    if (!title.trim()) {
      toast({
        title: "Title Required",
        description: "Please enter a title for the sheet music.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      // Upload PDF to storage
      const fileName = `sheet-music/${Date.now()}_${selectedFile.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('user-files')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('user-files')
        .getPublicUrl(fileName);

      // Create sheet music record
      await createSheetMusic({
        title: title.trim(),
        composer: composer.trim() || null,
        arranger: arranger.trim() || null,
        difficulty_level: difficulty || null,
        key_signature: keySignature.trim() || null,
        time_signature: timeSignature.trim() || null,
        tempo_marking: tempoMarking.trim() || null,
        language: language.trim() || null,
        voice_parts: voiceParts.length > 0 ? voiceParts : null,
        tags: tags.length > 0 ? tags : null,
        pdf_url: publicUrl,
        is_public: true,
      });

      toast({
        title: "Sheet Music Uploaded",
        description: "The sheet music has been uploaded successfully.",
      });

      onUploadComplete();
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload sheet music. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Library
        </Button>
      </div>

      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Upload Sheet Music</CardTitle>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* File Upload */}
            <div className="space-y-2">
              <Label htmlFor="file">PDF File*</Label>
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                {selectedFile ? (
                  <div className="flex items-center justify-center gap-3">
                    <File className="h-8 w-8 text-primary" />
                    <div>
                      <p className="font-medium">{selectedFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div>
                    <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-lg font-medium mb-2">Upload Sheet Music PDF</p>
                    <p className="text-sm text-muted-foreground mb-4">
                      Drag and drop or click to select a PDF file (max 50MB)
                    </p>
                    <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                      Select PDF File
                    </Button>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            </div>

            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title*</Label>
                <Input
                  id="title"
                  placeholder="Ave Maria"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="composer">Composer</Label>
                <Input
                  id="composer"
                  placeholder="Franz Schubert"
                  value={composer}
                  onChange={(e) => setComposer(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="arranger">Arranger</Label>
                <Input
                  id="arranger"
                  placeholder="John Smith"
                  value={arranger}
                  onChange={(e) => setArranger(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="difficulty">Difficulty Level</Label>
                <Select value={difficulty} onValueChange={setDifficulty}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    {DIFFICULTY_LEVELS.map((level) => (
                      <SelectItem key={level} value={level}>
                        {level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Musical Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="keySignature">Key Signature</Label>
                <Input
                  id="keySignature"
                  placeholder="C Major"
                  value={keySignature}
                  onChange={(e) => setKeySignature(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="timeSignature">Time Signature</Label>
                <Input
                  id="timeSignature"
                  placeholder="4/4"
                  value={timeSignature}
                  onChange={(e) => setTimeSignature(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tempoMarking">Tempo Marking</Label>
                <Input
                  id="tempoMarking"
                  placeholder="Andante (♩ = 76)"
                  value={tempoMarking}
                  onChange={(e) => setTempoMarking(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="language">Language</Label>
              <Input
                id="language"
                placeholder="Latin, English, etc."
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              />
            </div>

            {/* Voice Parts */}
            <div className="space-y-2">
              <Label>Voice Parts</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {VOICE_PARTS.map((voicePart) => (
                  <div key={voicePart} className="flex items-center space-x-2">
                    <Checkbox
                      id={`voice-${voicePart}`}
                      checked={voiceParts.includes(voicePart)}
                      onCheckedChange={(checked) => handleVoicePartChange(voicePart, checked as boolean)}
                    />
                    <Label htmlFor={`voice-${voicePart}`} className="text-sm">
                      {voicePart}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                {COMMON_TAGS.map((tag) => (
                  <div key={tag} className="flex items-center space-x-2">
                    <Checkbox
                      id={`tag-${tag}`}
                      checked={tags.includes(tag)}
                      onCheckedChange={(checked) => handleTagChange(tag, checked as boolean)}
                    />
                    <Label htmlFor={`tag-${tag}`} className="text-sm">
                      {tag}
                    </Label>
                  </div>
                ))}
              </div>

              {/* Custom Tag Input */}
              <div className="flex gap-2">
                <Input
                  placeholder="Add custom tag..."
                  value={customTag}
                  onChange={(e) => setCustomTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomTag())}
                />
                <Button type="button" variant="outline" onClick={addCustomTag}>
                  Add
                </Button>
              </div>

              {/* Selected Tags */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => removeTag(tag)}>
                      {tag} <X className="h-3 w-3 ml-1" />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Submit */}
            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={uploading || !selectedFile || !title.trim()}>
                {uploading ? "Uploading..." : "Upload Sheet Music"}
              </Button>
              <Button type="button" variant="outline" onClick={onBack}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};