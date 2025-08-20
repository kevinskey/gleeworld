import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Upload, FileAudio, FileText, Music, X, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface UploadedFile {
  id: string;
  file: File;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  url?: string;
  type: 'audio' | 'pdf' | 'musicxml';
}

export const FileUploadSection: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [uploads, setUploads] = useState<UploadedFile[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<string>('');
  const [assignments, setAssignments] = useState<any[]>([]);

  // Fetch assignments on component mount
  React.useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from('music_fundamentals_assignments')
        .select('*')
        .eq('is_active', true)
        .order('due_date', { ascending: true });

      if (error) throw error;
      setAssignments(data || []);
    } catch (error) {
      console.error('Error fetching assignments:', error);
    }
  };

  const getFileType = (file: File): 'audio' | 'pdf' | 'musicxml' => {
    if (file.type.startsWith('audio/')) return 'audio';
    if (file.type === 'application/pdf') return 'pdf';
    if (file.name.endsWith('.xml') || file.name.endsWith('.musicxml')) return 'musicxml';
    return 'pdf'; // default
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'audio': return <FileAudio className="h-4 w-4" />;
      case 'pdf': return <FileText className="h-4 w-4" />;
      case 'musicxml': return <Music className="h-4 w-4" />;
      default: return <Upload className="h-4 w-4" />;
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to upload files.",
        variant: "destructive"
      });
      return;
    }

    const newUploads: UploadedFile[] = acceptedFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      progress: 0,
      status: 'uploading',
      type: getFileType(file)
    }));

    setUploads(prev => [...prev, ...newUploads]);

    // Start uploading each file
    newUploads.forEach(upload => {
      uploadFile(upload);
    });
  }, [user]);

  const uploadFile = async (upload: UploadedFile) => {
    try {
      const fileName = `${user!.id}/${Date.now()}_${upload.file.name}`;
      
      const { data, error } = await supabase.storage
        .from('music-fundamentals')
        .upload(fileName, upload.file);

      // Simulate progress for UI feedback
      const interval = setInterval(() => {
        setUploads(prev => prev.map(u => 
          u.id === upload.id ? { ...u, progress: Math.min(u.progress + 10, 90) } : u
        ));
      }, 100);

      setTimeout(() => clearInterval(interval), 1000);

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('music-fundamentals')
        .getPublicUrl(fileName);

      // Update upload status
      setUploads(prev => prev.map(u => 
        u.id === upload.id 
          ? { ...u, status: 'completed', progress: 100, url: publicUrl }
          : u
      ));

      toast({
        title: "Upload Successful",
        description: `${upload.file.name} has been uploaded successfully.`
      });

    } catch (error) {
      console.error('Upload error:', error);
      setUploads(prev => prev.map(u => 
        u.id === upload.id ? { ...u, status: 'error' } : u
      ));
      
      toast({
        title: "Upload Failed",
        description: `Failed to upload ${upload.file.name}. Please try again.`,
        variant: "destructive"
      });
    }
  };

  const removeUpload = (id: string) => {
    setUploads(prev => prev.filter(u => u.id !== id));
  };

  const submitToAssignment = async () => {
    if (!selectedAssignment || !user) {
      toast({
        title: "Missing Information",
        description: "Please select an assignment first.",
        variant: "destructive"
      });
      return;
    }

    const completedUploads = uploads.filter(u => u.status === 'completed');
    if (completedUploads.length === 0) {
      toast({
        title: "No Files Ready",
        description: "Please wait for files to finish uploading.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Submit each completed upload as a submission
      for (const upload of completedUploads) {
        const { error } = await supabase
          .from('music_fundamentals_submissions')
          .insert({
            assignment_id: selectedAssignment,
            student_id: user.id,
            submission_type: upload.type,
            file_url: upload.url,
            file_name: upload.file.name
          });

        if (error) throw error;
      }

      toast({
        title: "Submissions Created",
        description: `${completedUploads.length} file(s) submitted successfully.`
      });

      // Clear uploads after successful submission
      setUploads([]);
      setSelectedAssignment('');

    } catch (error) {
      console.error('Submission error:', error);
      toast({
        title: "Submission Failed",
        description: "Failed to submit files. Please try again.",
        variant: "destructive"
      });
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'audio/*': ['.mp3', '.wav', '.m4a'],
      'application/pdf': ['.pdf'],
      'application/xml': ['.xml', '.musicxml']
    },
    multiple: true
  });

  return (
    <div className="space-y-6">
      {/* Assignment Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Assignment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="assignment">Choose which assignment to submit to:</Label>
            <Select value={selectedAssignment} onValueChange={setSelectedAssignment}>
              <SelectTrigger>
                <SelectValue placeholder="Select an assignment..." />
              </SelectTrigger>
              <SelectContent>
                {assignments.map((assignment) => (
                  <SelectItem key={assignment.id} value={assignment.id}>
                    {assignment.title} - Due: {new Date(assignment.due_date).toLocaleDateString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* File Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Files</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive 
                ? 'border-primary bg-primary/5' 
                : 'border-muted-foreground/25 hover:border-primary/50'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            {isDragActive ? (
              <p className="text-lg">Drop your files here...</p>
            ) : (
              <div>
                <p className="text-lg mb-2">Drag & drop files here, or click to select</p>
                <p className="text-sm text-muted-foreground">
                  Supports: MP3, WAV, PDF, MusicXML files
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Upload Progress */}
      {uploads.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {uploads.map((upload) => (
                <div key={upload.id} className="flex items-center gap-4 p-3 border rounded-lg">
                  <div className="flex-shrink-0">
                    {getFileIcon(upload.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{upload.file.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Progress value={upload.progress} className="flex-1" />
                      <Badge 
                        variant={
                          upload.status === 'completed' ? 'default' :
                          upload.status === 'error' ? 'destructive' : 'secondary'
                        }
                      >
                        {upload.status === 'completed' && <CheckCircle className="h-3 w-3 mr-1" />}
                        {upload.status}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeUpload(upload.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            {uploads.some(u => u.status === 'completed') && selectedAssignment && (
              <div className="mt-4 pt-4 border-t">
                <Button onClick={submitToAssignment} className="w-full">
                  Submit to Assignment
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};