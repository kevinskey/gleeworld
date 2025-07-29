import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Upload, 
  Image, 
  Video, 
  FileText, 
  Music, 
  X, 
  Plus,
  Eye,
  Lock,
  AlertCircle
} from "lucide-react";
import { useDropzone } from "react-dropzone";

export const MediaUploadTool = () => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState("private");
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const predefinedTags = [
    "Centennial", "MLK", "Tour", "Worship", "Alumni", "Concert", 
    "Rehearsal", "Social", "Community Service", "Awards", "Graduation"
  ];

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif'],
      'video/*': ['.mp4', '.mov', '.avi'],
      'audio/*': ['.mp3', '.wav', '.m4a'],
      'application/pdf': ['.pdf']
    },
    onDrop: (acceptedFiles) => {
      setSelectedFiles(prev => [...prev, ...acceptedFiles]);
    }
  });

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const addTag = (tag: string) => {
    if (tag && !tags.includes(tag)) {
      setTags(prev => [...prev, tag]);
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(prev => prev.filter(tag => tag !== tagToRemove));
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (file.type.startsWith('video/')) return <Video className="h-4 w-4" />;
    if (file.type.startsWith('audio/')) return <Music className="h-4 w-4" />;
    if (file.type === 'application/pdf') return <FileText className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleUpload = async () => {
    if (!eventName || selectedFiles.length === 0) {
      return;
    }

    setIsUploading(true);
    // Simulate upload progress
    for (let i = 0; i <= 100; i += 10) {
      setUploadProgress(i);
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // Reset form after upload
    setSelectedFiles([]);
    setEventName("");
    setEventDate("");
    setLocation("");
    setDescription("");
    setTags([]);
    setUploadProgress(0);
    setIsUploading(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Media Upload & Tagging Tool
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* File Upload Area */}
          <div>
            <Label>Upload Files</Label>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive ? 'border-primary bg-primary/5' : 'border-muted hover:border-primary/50'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
              {isDragActive ? (
                <p>Drop the files here...</p>
              ) : (
                <div>
                  <p className="mb-2">Drag and drop files here, or click to select</p>
                  <p className="text-sm text-muted-foreground">
                    Supports: Images, Videos, Audio, PDFs
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Selected Files */}
          {selectedFiles.length > 0 && (
            <div>
              <Label>Selected Files ({selectedFiles.length})</Label>
              <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex items-center gap-2">
                      {getFileIcon(file)}
                      <span className="text-sm truncate">{file.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {formatFileSize(file.size)}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Event Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="eventName">Event Name *</Label>
              <Select value={eventName} onValueChange={setEventName}>
                <SelectTrigger>
                  <SelectValue placeholder="Select event or type custom" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mlk-convocation">MLK Convocation</SelectItem>
                  <SelectItem value="fall-concert">Fall Concert</SelectItem>
                  <SelectItem value="spring-tour">Spring Tour</SelectItem>
                  <SelectItem value="homecoming">Homecoming Performance</SelectItem>
                  <SelectItem value="graduation">Graduation Ceremony</SelectItem>
                  <SelectItem value="custom">Custom Event</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="eventDate">Event Date</Label>
              <Input
                id="eventDate"
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              placeholder="e.g., Sisters Chapel, Atlanta Symphony Hall"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Brief description of the media content..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Tags */}
          <div>
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-2 mt-2 mb-2">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 ml-1"
                    onClick={() => removeTag(tag)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Add custom tag"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addTag(newTag)}
              />
              <Button
                variant="outline"
                onClick={() => addTag(newTag)}
                disabled={!newTag}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {predefinedTags.map((tag) => (
                <Button
                  key={tag}
                  variant="ghost"
                  size="sm"
                  className="text-xs h-6"
                  onClick={() => addTag(tag)}
                  disabled={tags.includes(tag)}
                >
                  {tag}
                </Button>
              ))}
            </div>
          </div>

          {/* Visibility Settings */}
          <div>
            <Label>Visibility Setting</Label>
            <Select value={visibility} onValueChange={setVisibility}>
              <SelectTrigger className="mt-2">
                <div className="flex items-center gap-2">
                  {visibility === "private" && <Lock className="h-4 w-4" />}
                  {visibility === "public" && <Eye className="h-4 w-4" />}
                  {visibility === "pending" && <AlertCircle className="h-4 w-4" />}
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="private">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Private Archive
                  </div>
                </SelectItem>
                <SelectItem value="public">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Public Gallery Ready
                  </div>
                </SelectItem>
                <SelectItem value="pending">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Pending Review
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Upload Progress */}
          {isUploading && (
            <div>
              <Label>Upload Progress</Label>
              <Progress value={uploadProgress} className="mt-2" />
              <p className="text-sm text-muted-foreground mt-1">
                Uploading... {uploadProgress}%
              </p>
            </div>
          )}

          {/* Upload Button */}
          <Button
            onClick={handleUpload}
            disabled={!eventName || selectedFiles.length === 0 || isUploading}
            className="w-full"
          >
            {isUploading ? "Uploading..." : "Upload Media"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};