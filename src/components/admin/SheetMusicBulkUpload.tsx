import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Upload, 
  FileText, 
  X, 
  Check, 
  AlertCircle,
  Music,
  Trash2
} from "lucide-react";

interface UploadFile {
  file: File;
  id: string;
  title: string;
  composer: string;
  arranger: string;
  keySignature: string;
  timeSignature: string;
  difficultyLevel: string;
  voiceParts: string[];
  language: string;
  tags: string[];
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
  uploadedUrl?: string;
}

export const SheetMusicBulkUpload = () => {
  const { toast } = useToast();
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [globalSettings, setGlobalSettings] = useState({
    composer: '',
    arranger: '',
    keySignature: '',
    timeSignature: '',
    difficultyLevel: 'intermediate',
    language: 'English',
    voiceParts: [] as string[],
    tags: [] as string[]
  });

  const difficultyLevels = ['beginner', 'intermediate', 'advanced', 'expert'];
  const commonVoiceParts = ['Soprano', 'Alto', 'Tenor', 'Bass', 'Piano'];
  const commonLanguages = ['English', 'Latin', 'Spanish', 'French', 'German', 'Italian'];

  const processFiles = useCallback((selectedFiles: File[]) => {
    const pdfFiles = selectedFiles.filter(file => file.type === 'application/pdf');
    
    if (pdfFiles.length !== selectedFiles.length) {
      toast({
        title: "Invalid Files",
        description: "Only PDF files are allowed for sheet music upload.",
        variant: "destructive",
      });
    }

    const newFiles: UploadFile[] = pdfFiles.map(file => ({
      file,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: file.name.replace('.pdf', '').replace(/_/g, ' '),
      composer: globalSettings.composer,
      arranger: globalSettings.arranger,
      keySignature: globalSettings.keySignature,
      timeSignature: globalSettings.timeSignature,
      difficultyLevel: globalSettings.difficultyLevel,
      voiceParts: [...globalSettings.voiceParts],
      language: globalSettings.language,
      tags: [...globalSettings.tags],
      status: 'pending',
      progress: 0
    }));

    setFiles(prev => [...prev, ...newFiles]);
    
    if (newFiles.length > 0) {
      toast({
        title: "Files Added",
        description: `${newFiles.length} PDF file(s) added for upload.`,
      });
    }
  }, [globalSettings, toast]);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    processFiles(selectedFiles);
  }, [processFiles]);

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      processFiles(droppedFiles);
    }
  }, [processFiles]);

  // Window-wide drag and drop support
  useEffect(() => {
    let dragCounter = 0;

    const handleWindowDragEnter = (e: DragEvent) => {
      e.preventDefault();
      dragCounter++;
      if (dragCounter === 1) {
        setDragOver(true);
      }
    };

    const handleWindowDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounter--;
      if (dragCounter === 0) {
        setDragOver(false);
      }
    };

    const handleWindowDragOver = (e: DragEvent) => {
      e.preventDefault();
    };

    const handleWindowDrop = (e: DragEvent) => {
      e.preventDefault();
      dragCounter = 0;
      setDragOver(false);
      
      const droppedFiles = Array.from(e.dataTransfer.files);
      if (droppedFiles.length > 0) {
        processFiles(droppedFiles);
      }
    };

    window.addEventListener('dragenter', handleWindowDragEnter);
    window.addEventListener('dragleave', handleWindowDragLeave);
    window.addEventListener('dragover', handleWindowDragOver);
    window.addEventListener('drop', handleWindowDrop);

    return () => {
      window.removeEventListener('dragenter', handleWindowDragEnter);
      window.removeEventListener('dragleave', handleWindowDragLeave);
      window.removeEventListener('dragover', handleWindowDragOver);
      window.removeEventListener('drop', handleWindowDrop);
    };
  }, [processFiles]);

  const updateFile = (id: string, updates: Partial<UploadFile>) => {
    setFiles(prev => prev.map(file => 
      file.id === id ? { ...file, ...updates } : file
    ));
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(file => file.id !== id));
  };

  const uploadSingleFile = async (fileData: UploadFile): Promise<boolean> => {
    try {
      updateFile(fileData.id, { status: 'uploading', progress: 10 });

      // Generate unique filename
      const timestamp = Date.now();
      const fileName = `${timestamp}-${fileData.file.name}`;
      const filePath = `sheet-music/${fileName}`;

      updateFile(fileData.id, { progress: 30 });

      // Upload file to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('sheet-music')
        .upload(filePath, fileData.file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      updateFile(fileData.id, { progress: 60 });

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('sheet-music')
        .getPublicUrl(filePath);

      updateFile(fileData.id, { progress: 80 });

      // Create database entry
      const { error: dbError } = await supabase
        .from('gw_sheet_music')
        .insert({
          title: fileData.title,
          composer: fileData.composer || null,
          arranger: fileData.arranger || null,
          key_signature: fileData.keySignature || null,
          time_signature: fileData.timeSignature || null,
          difficulty_level: fileData.difficultyLevel || null,
          voice_parts: fileData.voiceParts.length > 0 ? fileData.voiceParts : null,
          language: fileData.language || null,
          pdf_url: urlData.publicUrl,
          tags: fileData.tags.length > 0 ? fileData.tags : null,
          is_public: true,
          created_by: (await supabase.auth.getUser()).data.user?.id
        });

      if (dbError) throw dbError;

      updateFile(fileData.id, { 
        status: 'success', 
        progress: 100,
        uploadedUrl: urlData.publicUrl
      });

      return true;
    } catch (error) {
      updateFile(fileData.id, { 
        status: 'error', 
        progress: 0,
        error: error.message || 'Upload failed'
      });
      return false;
    }
  };

  const handleBulkUpload = async () => {
    if (files.length === 0) {
      toast({
        title: "No Files",
        description: "Please select PDF files to upload.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    
    try {
      let successCount = 0;
      let errorCount = 0;

      // Upload files sequentially to avoid overwhelming the server
      for (const file of files) {
        if (file.status === 'pending') {
          const success = await uploadSingleFile(file);
          if (success) {
            successCount++;
          } else {
            errorCount++;
          }
          
          // Small delay between uploads
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      toast({
        title: "Upload Complete",
        description: `${successCount} files uploaded successfully${errorCount > 0 ? `, ${errorCount} failed` : ''}.`,
        variant: errorCount > 0 ? "destructive" : "default",
      });

    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "An error occurred during bulk upload.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const applyGlobalSettings = () => {
    setFiles(prev => prev.map(file => ({
      ...file,
      composer: globalSettings.composer || file.composer,
      arranger: globalSettings.arranger || file.arranger,
      keySignature: globalSettings.keySignature || file.keySignature,
      timeSignature: globalSettings.timeSignature || file.timeSignature,
      difficultyLevel: globalSettings.difficultyLevel || file.difficultyLevel,
      language: globalSettings.language || file.language,
      voiceParts: globalSettings.voiceParts.length > 0 ? [...globalSettings.voiceParts] : file.voiceParts,
      tags: globalSettings.tags.length > 0 ? [...globalSettings.tags] : file.tags
    })));

    toast({
      title: "Settings Applied",
      description: "Global settings have been applied to all files.",
    });
  };

  const addVoicePart = (filePart: string, fileId?: string) => {
    if (fileId) {
      updateFile(fileId, {
        voiceParts: [...files.find(f => f.id === fileId)?.voiceParts || [], filePart]
      });
    } else {
      setGlobalSettings(prev => ({
        ...prev,
        voiceParts: [...prev.voiceParts, filePart]
      }));
    }
  };

  const removeVoicePart = (part: string, fileId?: string) => {
    if (fileId) {
      updateFile(fileId, {
        voiceParts: files.find(f => f.id === fileId)?.voiceParts.filter(p => p !== part) || []
      });
    } else {
      setGlobalSettings(prev => ({
        ...prev,
        voiceParts: prev.voiceParts.filter(p => p !== part)
      }));
    }
  };

  const addTag = (tag: string, fileId?: string) => {
    if (fileId) {
      updateFile(fileId, {
        tags: [...files.find(f => f.id === fileId)?.tags || [], tag]
      });
    } else {
      setGlobalSettings(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
    }
  };

  const removeTag = (tag: string, fileId?: string) => {
    if (fileId) {
      updateFile(fileId, {
        tags: files.find(f => f.id === fileId)?.tags.filter(t => t !== tag) || []
      });
    } else {
      setGlobalSettings(prev => ({
        ...prev,
        tags: prev.tags.filter(t => t !== tag)
      }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <Music className="h-8 w-8 text-blue-500" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sheet Music Bulk Upload</h1>
          <p className="text-gray-600">Upload multiple PDF sheet music files with metadata</p>
        </div>
      </div>

      {/* File Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Upload className="h-5 w-5 mr-2" />
            Select Files
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div 
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-all ${
              dragOver 
                ? 'border-primary bg-primary/10 scale-105' 
                : 'border-gray-300 hover:border-primary/50'
            }`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <FileText className={`h-12 w-12 mx-auto mb-4 transition-colors ${
              dragOver ? 'text-primary' : 'text-gray-400'
            }`} />
            <div className="space-y-2">
              <p className="text-lg font-medium">
                {dragOver ? 'Drop PDF files here!' : 'Select PDF files to upload'}
              </p>
              <p className="text-gray-600">
                {dragOver ? 'Release to add files' : 'Choose multiple PDF sheet music files or drag them anywhere'}
              </p>
              <Input
                type="file"
                multiple
                accept=".pdf"
                onChange={handleFileSelect}
                className="max-w-xs mx-auto"
                disabled={uploading}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Global Settings */}
      {files.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Global Settings</CardTitle>
              <Button onClick={applyGlobalSettings} variant="outline" size="sm">
                Apply to All Files
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="global_composer">Composer</Label>
                <Input
                  id="global_composer"
                  value={globalSettings.composer}
                  onChange={(e) => setGlobalSettings(prev => ({ ...prev, composer: e.target.value }))}
                  placeholder="Composer name"
                />
              </div>
              <div>
                <Label htmlFor="global_arranger">Arranger</Label>
                <Input
                  id="global_arranger"
                  value={globalSettings.arranger}
                  onChange={(e) => setGlobalSettings(prev => ({ ...prev, arranger: e.target.value }))}
                  placeholder="Arranger name"
                />
              </div>
              <div>
                <Label htmlFor="global_key">Key Signature</Label>
                <Input
                  id="global_key"
                  value={globalSettings.keySignature}
                  onChange={(e) => setGlobalSettings(prev => ({ ...prev, keySignature: e.target.value }))}
                  placeholder="e.g., C major, F# minor"
                />
              </div>
              <div>
                <Label htmlFor="global_time">Time Signature</Label>
                <Input
                  id="global_time"
                  value={globalSettings.timeSignature}
                  onChange={(e) => setGlobalSettings(prev => ({ ...prev, timeSignature: e.target.value }))}
                  placeholder="e.g., 4/4, 3/4"
                />
              </div>
              <div>
                <Label htmlFor="global_difficulty">Difficulty Level</Label>
                <Select
                  value={globalSettings.difficultyLevel}
                  onValueChange={(value) => setGlobalSettings(prev => ({ ...prev, difficultyLevel: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {difficultyLevels.map(level => (
                      <SelectItem key={level} value={level}>
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="global_language">Language</Label>
                <Select
                  value={globalSettings.language}
                  onValueChange={(value) => setGlobalSettings(prev => ({ ...prev, language: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {commonLanguages.map(lang => (
                      <SelectItem key={lang} value={lang}>
                        {lang}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Voice Parts */}
            <div>
              <Label>Voice Parts</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {globalSettings.voiceParts.map(part => (
                  <Badge key={part} variant="secondary" className="flex items-center gap-1">
                    {part}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => removeVoicePart(part)}
                    />
                  </Badge>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {commonVoiceParts
                  .filter(part => !globalSettings.voiceParts.includes(part))
                  .map(part => (
                    <Button
                      key={part}
                      variant="outline"
                      size="sm"
                      onClick={() => addVoicePart(part)}
                    >
                      + {part}
                    </Button>
                  ))
                }
              </div>
            </div>

            {/* Tags */}
            <div>
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {globalSettings.tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                    {tag}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => removeTag(tag)}
                    />
                  </Badge>
                ))}
              </div>
              <Input
                placeholder="Add tag and press Enter"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                    addTag(e.currentTarget.value.trim());
                    e.currentTarget.value = '';
                  }
                }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* File List */}
      {files.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Files to Upload ({files.length})</CardTitle>
              <Button 
                onClick={handleBulkUpload} 
                disabled={uploading || files.every(f => f.status !== 'pending')}
                className="bg-blue-500 hover:bg-blue-600"
              >
                {uploading ? 'Uploading...' : 'Upload All'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {files.map((file) => (
                <div key={file.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-6 w-6 text-blue-500" />
                      <div>
                        <h4 className="font-medium">{file.file.name}</h4>
                        <p className="text-sm text-gray-600">{(file.file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {file.status === 'success' && <Check className="h-5 w-5 text-green-500" />}
                      {file.status === 'error' && <AlertCircle className="h-5 w-5 text-red-500" />}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(file.id)}
                        disabled={uploading}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {file.status === 'uploading' && (
                    <div className="mb-3">
                      <Progress value={file.progress} className="w-full" />
                      <p className="text-sm text-gray-600 mt-1">Uploading... {file.progress}%</p>
                    </div>
                  )}

                  {file.status === 'error' && (
                    <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
                      Error: {file.error}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    <Input
                      placeholder="Title"
                      value={file.title}
                      onChange={(e) => updateFile(file.id, { title: e.target.value })}
                      disabled={uploading || file.status === 'success'}
                    />
                    <Input
                      placeholder="Composer"
                      value={file.composer}
                      onChange={(e) => updateFile(file.id, { composer: e.target.value })}
                      disabled={uploading || file.status === 'success'}
                    />
                    <Input
                      placeholder="Arranger"
                      value={file.arranger}
                      onChange={(e) => updateFile(file.id, { arranger: e.target.value })}
                      disabled={uploading || file.status === 'success'}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};