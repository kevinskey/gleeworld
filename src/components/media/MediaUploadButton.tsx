import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useDropzone } from "react-dropzone";
import { 
  Upload, 
  Image, 
  Video, 
  FileText, 
  Music, 
  X, 
  Plus,
  CloudUpload
} from "lucide-react";

interface MediaUploadButtonProps {
  context?: string;
  onUploadComplete?: (uploadedFiles: any[]) => void;
  className?: string;
}

export const MediaUploadButton = ({ 
  context = "homepage", 
  onUploadComplete,
  className = ""
}: MediaUploadButtonProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const predefinedTags = [
    "homepage", "hero", "event", "performance", "concert", "tour", 
    "alumnae", "centennial", "mlk", "worship", "community", "awards",
    "rehearsal", "social", "graduation", "historical", "promotional"
  ];

  const categories = [
    { value: "general", label: "General Media" },
    { value: "hero", label: "Hero Images" },
    { value: "events", label: "Event Media" },
    { value: "performances", label: "Performance Media" },
    { value: "historical", label: "Historical Content" },
    { value: "promotional", label: "Promotional Materials" }
  ];

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'],
      'video/*': ['.mp4', '.mov', '.avi', '.webm'],
      'audio/*': ['.mp3', '.wav', '.m4a', '.ogg'],
      'application/pdf': ['.pdf']
    },
    multiple: true, // Enable multiple file selection
    maxSize: 50 * 1024 * 1024, // 50MB max file size
    onDrop: (acceptedFiles, rejectedFiles) => {
      if (rejectedFiles.length > 0) {
        toast({
          title: "Some files were rejected",
          description: "Please ensure files are under 50MB and in supported formats",
          variant: "destructive"
        });
      }
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
    if (!user || !title || selectedFiles.length === 0) {
      toast({
        title: "Missing information",
        description: "Please provide a title and select at least one file",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      const totalFiles = selectedFiles.length;
      let completedUploads = 0;

      // Create upload promises for simultaneous uploads
      const uploadPromises = selectedFiles.map(async (file, index) => {
        const fileName = `${Date.now()}-${index}-${file.name}`;
        const filePath = `${category}/${fileName}`;

        try {
          // Upload file to storage
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('media-library')
            .upload(filePath, file);

          if (uploadError) {
            console.error('Upload error for file:', file.name, uploadError);
            throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`);
          }

          // Get public URL
          const { data: urlData } = supabase.storage
            .from('media-library')
            .getPublicUrl(filePath);

          // Store metadata in database
          const { data: mediaData, error: dbError } = await supabase
            .from('gw_media_library')
            .insert({
              title: selectedFiles.length === 1 ? title : `${title} - ${file.name}`,
              description: description || null,
              file_url: urlData.publicUrl,
              file_path: filePath,
              file_type: file.type,
              file_size: file.size,
              category: category,
              tags: tags.length > 0 ? tags : null,
              context: context,
              uploaded_by: user.id,
              is_public: category === 'hero' || category === 'promotional'
            })
            .select()
            .single();

          if (dbError) {
            console.error('Database error for file:', file.name, dbError);
            // Clean up uploaded file if database insert fails
            await supabase.storage.from('media-library').remove([filePath]);
            throw new Error(`Failed to save ${file.name}: ${dbError.message}`);
          }

          // Update progress
          completedUploads++;
          setUploadProgress((completedUploads / totalFiles) * 100);

          return { 
            id: mediaData.id, 
            title: selectedFiles.length === 1 ? title : `${title} - ${file.name}`, 
            file_url: urlData.publicUrl,
            success: true,
            fileName: file.name
          };
        } catch (error) {
          console.error(`Upload failed for ${file.name}:`, error);
          completedUploads++;
          setUploadProgress((completedUploads / totalFiles) * 100);
          return {
            success: false,
            fileName: file.name,
            error: error.message
          };
        }
      });

      // Wait for all uploads to complete
      const results = await Promise.all(uploadPromises);
      
      // Separate successful and failed uploads
      const successfulUploads = results.filter(result => result.success);
      const failedUploads = results.filter(result => !result.success);

      // Show results
      if (successfulUploads.length > 0) {
        toast({
          title: "Upload completed",
          description: `Successfully uploaded ${successfulUploads.length} of ${totalFiles} file(s)`
        });
      }

      if (failedUploads.length > 0) {
        const failedFileNames = failedUploads.map(f => f.fileName).join(', ');
        toast({
          title: "Some uploads failed",
          description: `Failed to upload: ${failedFileNames}`,
          variant: "destructive"
        });
      }

      // Reset form
      setSelectedFiles([]);
      setTitle("");
      setDescription("");
      setTags([]);
      setIsOpen(false);
      
      // Callback for parent component
      if (onUploadComplete) {
        onUploadComplete(successfulUploads);
      }

    } catch (error) {
      console.error('Upload failed:', error);
      toast({
        title: "Upload failed",
        description: error.message || "An error occurred during upload",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Don't render if user is not authenticated
  if (!user) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={className}>
          <CloudUpload className="h-4 w-4 mr-2" />
          Upload Media
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload to Media Library
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* File Upload Area */}
          <div>
            <Label>Upload Files</Label>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                isDragActive ? 'border-primary bg-primary/5' : 'border-muted hover:border-primary/50'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              {isDragActive ? (
                <p>Drop the files here...</p>
              ) : (
                <div>
                  <p className="mb-1">Drag and drop files here, or click to select</p>
                  <p className="text-sm text-muted-foreground">
                    Supports: Images, Videos, Audio, PDFs (max 50MB each)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Selected Files */}
          {selectedFiles.length > 0 && (
            <div>
              <Label>Selected Files ({selectedFiles.length})</Label>
              <div className="mt-2 space-y-2 max-h-32 overflow-y-auto">
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

          {/* Title and Description */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="Media title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Brief description of the media content..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
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

          {/* Upload Progress */}
          {isUploading && (
            <div>
              <Label>Upload Progress</Label>
              <Progress value={uploadProgress} className="mt-2" />
              <p className="text-sm text-muted-foreground mt-1">
                Uploading... {Math.round(uploadProgress)}%
              </p>
            </div>
          )}

          {/* Upload Button */}
          <div className="flex gap-2">
            <Button
              onClick={handleUpload}
              disabled={!title || selectedFiles.length === 0 || isUploading}
              className="flex-1"
            >
              {isUploading ? "Uploading..." : "Upload to Media Library"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isUploading}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};