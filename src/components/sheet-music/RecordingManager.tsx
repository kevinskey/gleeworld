import { useState, useRef } from "react";
import { Upload, Mic, Play, Pause, Download, Trash2, FileAudio } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRecordings } from "@/hooks/useRecordings";
import { useToast } from "@/hooks/use-toast";

interface RecordingManagerProps {
  sheetMusicId: string;
}

export const RecordingManager = ({ sheetMusicId }: RecordingManagerProps) => {
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [quality, setQuality] = useState("standard");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [playingRecording, setPlayingRecording] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { 
    recordings, 
    loading, 
    uploadRecording, 
    deleteRecording, 
    getRecordingsForSheetMusic 
  } = useRecordings();
  const { toast } = useToast();

  const sheetMusicRecordings = getRecordingsForSheetMusic(sheetMusicId);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('audio/')) {
        toast({
          title: "Invalid File Type",
          description: "Please select an audio file.",
          variant: "destructive",
        });
        return;
      }
      
      // Validate file size (50MB max)
      if (file.size > 50 * 1024 * 1024) {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile) {
      toast({
        title: "No File Selected",
        description: "Please select an audio file to upload.",
        variant: "destructive",
      });
      return;
    }

    if (!title.trim()) {
      toast({
        title: "Title Required",
        description: "Please enter a title for your recording.",
        variant: "destructive",
      });
      return;
    }

    try {
      await uploadRecording(selectedFile, {
        title: title.trim(),
        description: description.trim() || null,
        associated_sheet_music_id: sheetMusicId,
        quality,
        recording_date: new Date().toISOString(),
      });

      toast({
        title: "Recording Uploaded",
        description: "Your recording has been uploaded successfully.",
      });

      // Reset form
      setTitle("");
      setDescription("");
      setQuality("standard");
      setSelectedFile(null);
      setShowUploadForm(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "Failed to upload recording. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (recordingId: string) => {
    if (!confirm("Are you sure you want to delete this recording?")) {
      return;
    }

    try {
      await deleteRecording(recordingId);
      toast({
        title: "Recording Deleted",
        description: "Your recording has been deleted successfully.",
      });
    } catch (error) {
      toast({
        title: "Delete Failed",
        description: "Failed to delete recording. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handlePlayPause = (recordingId: string) => {
    if (playingRecording === recordingId) {
      setPlayingRecording(null);
      // Pause audio logic would go here
    } else {
      setPlayingRecording(recordingId);
      // Play audio logic would go here
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'Unknown';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Upload Form */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Practice Recordings</CardTitle>
            <Button 
              onClick={() => setShowUploadForm(!showUploadForm)}
              size="sm"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Recording
            </Button>
          </div>
        </CardHeader>
        
        {showUploadForm && (
          <CardContent className="border-t">
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="file">Audio File*</Label>
                <Input
                  id="file"
                  type="file"
                  accept="audio/*"
                  onChange={handleFileSelect}
                  ref={fileInputRef}
                  required
                />
                {selectedFile && (
                  <p className="text-sm text-muted-foreground">
                    Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Title*</Label>
                <Input
                  id="title"
                  placeholder="Practice Session - Take 1"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="quality">Quality</Label>
                <Select value={quality} onValueChange={setQuality}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="high">High Quality</SelectItem>
                    <SelectItem value="performance">Performance</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Notes about this recording..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={loading}>
                  Upload Recording
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowUploadForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        )}
      </Card>

      {/* Recordings List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Recordings ({sheetMusicRecordings.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {sheetMusicRecordings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileAudio className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No recordings uploaded yet.</p>
              <p className="text-sm">Upload your first practice recording to track your progress!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sheetMusicRecordings.map((recording) => (
                <div key={recording.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePlayPause(recording.id)}
                      >
                        {playingRecording === recording.id ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                      
                      <div>
                        <h4 className="font-medium">{recording.title}</h4>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{recording.quality}</span>
                          <span>{formatDuration(recording.duration)}</span>
                          {recording.file_size && (
                            <span>{formatFileSize(recording.file_size)}</span>
                          )}
                          {recording.recording_date && (
                            <span>
                              {new Date(recording.recording_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {recording.description && (
                      <p className="text-sm text-muted-foreground">
                        {recording.description}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {recording.audio_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = recording.audio_url;
                          link.download = `${recording.title}.${recording.format?.split('/')[1] || 'audio'}`;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(recording.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};