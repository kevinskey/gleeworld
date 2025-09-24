import React, { useState, useRef, useCallback, useEffect } from 'react';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { ScoreDisplay } from '@/components/sight-singing/ScoreDisplay';
import { useTonePlayback } from '@/components/sight-singing/hooks/useTonePlayback';
import { Upload, FileMusic, Trash2, Play, Pause, Mic, MicOff, Share2, Music, BookOpen, Users, Download, ArrowLeft, GripVertical } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
interface SortableFileItemProps {
  file: UploadedFile;
  isSelected: boolean;
  onSelect: (file: UploadedFile) => void;
  onRemove: (fileId: string) => void;
}
const SortableFileItem: React.FC<SortableFileItemProps> = ({
  file,
  isSelected,
  onSelect,
  onRemove
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: file.id
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };
  return <div ref={setNodeRef} style={style} className={`p-3 rounded-md border cursor-pointer transition-colors ${isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted/50 rounded">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
          <div onClick={() => onSelect(file)} className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{file.name}</p>
          </div>
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={e => {
          e.stopPropagation();
          onRemove(file.id);
        }} className="h-8 w-8 p-0 text-destructive hover:text-destructive">
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>;
};
interface UploadedFile {
  id: string;
  name: string;
  content: string;
}
interface PublicMusicXML {
  id: string;
  title: string;
  composer?: string;
  xml_content: string;
  created_at: string;
}
const MUS100SightSingingPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    user
  } = useAuth();
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [publicFiles, setPublicFiles] = useState<PublicMusicXML[]>([]);
  const [selectedFile, setSelectedFile] = useState<UploadedFile | null>(null);
  const [tempo, setTempo] = useState<number>(120);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [loadingPublic, setLoadingPublic] = useState(true);
  const scoreDisplayRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates
  }));
  const {
    isPlaying,
    mode,
    setMode,
    startPlayback,
    stopPlayback
  } = useTonePlayback();

  // Fetch public MusicXML files and user's uploaded files on component mount
  useEffect(() => {
    fetchPublicMusicXML();
    if (user?.id) {
      fetchUserUploadedFiles();
    }
  }, [user?.id]);
  const fetchUserUploadedFiles = async () => {
    if (!user?.id) return;
    try {
      const {
        data,
        error
      } = await supabase.from('gw_sheet_music').select('id, title, xml_content, created_at').eq('created_by', user.id).eq('is_public', false).not('xml_content', 'is', null).order('created_at', {
        ascending: false
      });
      if (error) throw error;

      // Remove duplicates based on title and content
      const uniqueFiles = new Map<string, any>();
      (data || []).forEach(file => {
        const key = `${file.title}-${file.xml_content.substring(0, 100)}`;
        if (!uniqueFiles.has(key)) {
          uniqueFiles.set(key, file);
        }
      });
      const userFiles: UploadedFile[] = Array.from(uniqueFiles.values()).map(file => ({
        id: file.id,
        name: file.title + '.xml',
        content: file.xml_content
      }));
      setUploadedFiles(userFiles);
    } catch (error) {
      console.error('Error fetching user uploaded files:', error);
      toast({
        title: "Error",
        description: "Failed to load your uploaded files",
        variant: "destructive"
      });
    }
  };
  const fetchPublicMusicXML = async () => {
    try {
      setLoadingPublic(true);
      const {
        data,
        error
      } = await supabase.from('gw_sheet_music').select('id, title, composer, xml_content, created_at').eq('is_public', true).eq('is_archived', false).not('xml_content', 'is', null).order('created_at', {
        ascending: false
      });
      if (error) throw error;
      setPublicFiles(data || []);
    } catch (error) {
      console.error('Error fetching public MusicXML:', error);
      toast({
        title: "Error",
        description: "Failed to load public MusicXML library",
        variant: "destructive"
      });
    } finally {
      setLoadingPublic(false);
    }
  };
  const handlePublicFileSelect = (publicFile: PublicMusicXML) => {
    const fileData: UploadedFile = {
      id: publicFile.id,
      name: publicFile.title,
      content: publicFile.xml_content
    };
    setSelectedFile(fileData);
  };
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    const validFiles: File[] = [];
    const invalidFiles: string[] = [];

    // Validate all files first
    Array.from(files).forEach(file => {
      if (file.name.toLowerCase().endsWith('.xml') || file.name.toLowerCase().endsWith('.musicxml')) {
        validFiles.push(file);
      } else {
        invalidFiles.push(file.name);
      }
    });
    if (invalidFiles.length > 0) {
      toast({
        title: "Some files skipped",
        description: `${invalidFiles.length} non-MusicXML files were skipped`,
        variant: "destructive"
      });
    }
    if (validFiles.length === 0) {
      toast({
        title: "No valid files",
        description: "Please upload MusicXML (.xml or .musicxml) files",
        variant: "destructive"
      });
      return;
    }
    try {
      const newFiles: UploadedFile[] = [];

      // Process all valid files
      for (const file of validFiles) {
        // Read file content
        const content = await file.text();

        // Upload to Supabase storage
        const fileExt = file.name.split('.').pop();
        const storageFileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
        const filePath = `musicxml/${storageFileName}`;
        const {
          error: uploadError
        } = await supabase.storage.from('user-files').upload(filePath, file);
        if (uploadError) {
          console.error('Upload error:', uploadError);
          toast({
            title: "Upload failed",
            description: `Could not upload ${file.name}`,
            variant: "destructive"
          });
          continue;
        }

        // Check for duplicates before saving
        const displayTitle = file.name.replace(/\.(xml|musicxml)$/i, '');
        const {
          data: existingFiles
        } = await supabase.from('gw_sheet_music').select('id, title, xml_content').eq('created_by', user?.id).eq('title', displayTitle);

        // Skip if exact duplicate exists
        const isDuplicate = existingFiles?.some(existing => existing.xml_content === content);
        if (isDuplicate) {
          console.log(`Skipping duplicate file: ${file.name}`);
          // Clean up uploaded file
          await supabase.storage.from('user-files').remove([filePath]);
          continue;
        }

        // Save to database
        const {
          data: sheetMusicData,
          error: dbError
        } = await supabase.from('gw_sheet_music').insert({
          title: displayTitle,
          xml_url: filePath,
          xml_content: content,
          created_by: user?.id,
          is_public: false,
          tags: ['practice', 'mus100']
        }).select().single();
        if (dbError) {
          console.error('Database error:', dbError);
          // Clean up uploaded file if database save fails
          await supabase.storage.from('user-files').remove([filePath]);
          toast({
            title: "Save failed",
            description: `Could not save ${file.name} to database`,
            variant: "destructive"
          });
          continue;
        }
        const newFile: UploadedFile = {
          id: sheetMusicData.id,
          name: file.name,
          content
        };
        newFiles.push(newFile);
      }
      if (newFiles.length > 0) {
        setUploadedFiles(prev => [...prev, ...newFiles]);

        // Auto-select the first uploaded file if none is selected
        if (!selectedFile && newFiles.length > 0) {
          setSelectedFile(newFiles[0]);
        }
        toast({
          title: "Files uploaded successfully",
          description: `${newFiles.length} MusicXML file${newFiles.length > 1 ? 's' : ''} uploaded and saved`
        });
      }
    } catch (error) {
      console.error('Upload process error:', error);
      toast({
        title: "Upload failed",
        description: "Could not process MusicXML files",
        variant: "destructive"
      });
    }
    event.target.value = '';
  };
  const removeFile = async (fileId: string) => {
    try {
      // First try to delete from database (this will give us the file path)
      const {
        data: fileData,
        error: fetchError
      } = await supabase.from('gw_sheet_music').select('xml_url').eq('id', fileId).eq('created_by', user?.id).single();
      if (!fetchError && fileData?.xml_url) {
        // Delete from storage
        const {
          error: storageError
        } = await supabase.storage.from('user-files').remove([fileData.xml_url]);
        if (storageError) {
          console.error('Storage deletion error:', storageError);
        }

        // Delete from database
        const {
          error: dbError
        } = await supabase.from('gw_sheet_music').delete().eq('id', fileId).eq('created_by', user?.id);
        if (dbError) {
          console.error('Database deletion error:', dbError);
          toast({
            title: "Delete failed",
            description: "Could not delete file from database",
            variant: "destructive"
          });
          return;
        }
        toast({
          title: "File deleted",
          description: "File removed successfully"
        });
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      toast({
        title: "Delete failed",
        description: "Could not delete file",
        variant: "destructive"
      });
    }

    // Remove from local state regardless
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
    if (selectedFile?.id === fileId) {
      setSelectedFile(null);
    }
  };
  const handleDragEnd = (event: DragEndEvent) => {
    const {
      active,
      over
    } = event;
    if (active.id !== over?.id) {
      setUploadedFiles(items => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over?.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      audioChunksRef.current = [];
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      mediaRecorderRef.current.ondataavailable = event => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: 'audio/webm'
        });
        setRecordedAudio(audioBlob);
        setShowShareDialog(true);
        stream.getTracks().forEach(track => track.stop());
      };
      mediaRecorderRef.current.start();
      setIsRecording(true);
      toast({
        title: "Recording started",
        description: "Sing along to the music!"
      });
    } catch (error) {
      toast({
        title: "Recording failed",
        description: "Could not access microphone",
        variant: "destructive"
      });
    }
  }, []);
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);
  
  const handleFileSelect = useCallback((file: UploadedFile) => {
    setSelectedFile(file);
    // Scroll to score display at the top
    setTimeout(() => {
      scoreDisplayRef.current?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }, 100);
  }, []);
  const handlePlayPause = () => {
    if (!selectedFile) return;
    if (mode === 'record') {
      if (isRecording) {
        stopRecording();
      } else {
        startRecording();
      }
      return;
    }
    if (isPlaying) {
      stopPlayback();
    } else {
      startPlayback(selectedFile.content, tempo, mode === 'click-only' ? 'click-only' : 'click-and-score');
    }
  };
  const handleShareRecording = () => {
    if (recordedAudio) {
      const url = URL.createObjectURL(recordedAudio);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sight-singing-${selectedFile?.name || 'recording'}-${Date.now()}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({
        title: "Recording downloaded",
        description: "Your sight singing recording has been saved"
      });
    }
    setShowShareDialog(false);
  };
  return <UniversalLayout>
      <div className="space-y-8">
        {/* Beautiful Header */}
        <div className="relative overflow-hidden">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent"></div>
          
          {/* Decorative musical notes */}
          <div className="absolute top-4 right-8 opacity-20">
            <Music className="h-16 w-16 text-primary animate-pulse" />
          </div>
          <div className="absolute top-12 right-24 opacity-15">
            <Music className="h-8 w-8 text-primary animate-pulse" style={{
            animationDelay: '0.5s'
          }} />
          </div>
          <div className="absolute bottom-4 left-12 opacity-10">
            <Music className="h-12 w-12 text-primary animate-pulse" style={{
            animationDelay: '1s'
          }} />
          </div>
          
          {/* Main header content */}
          <div className="relative px-4 py-4 md:py-6">
            {/* Back button */}
            <div className="max-w-4xl mx-auto">
              <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-6 text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </div>
            
            <div className="max-w-4xl mx-auto text-center space-y-6">
              <div className="flex items-center justify-center gap-4 mb-6">
                <div className="p-3 rounded-full bg-primary/10 border border-primary/20">
                  <BookOpen className="h-8 w-8 text-primary" />
                </div>
                <div className="h-8 w-px bg-border"></div>
                <div className="p-3 rounded-full bg-primary/10 border border-primary/20">
                  <Music className="h-8 w-8 text-primary" />
                </div>
                <div className="h-8 w-px bg-border"></div>
                <div className="p-3 rounded-full bg-primary/10 border border-primary/20">
                  <Users className="h-8 w-8 text-primary" />
                </div>
              </div>
              
              <div className="space-y-4">
                <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent animate-fade-in">
                  MUS100 Sight Singing
                </h1>
                <p className="text-xl md:text-2xl text-muted-foreground font-medium animate-fade-in" style={{
                animationDelay: '0.2s'
              }}>
                  Practice & Perfect Your Musical Skills
                </p>
                
              </div>
              
              {/* Feature highlights */}
              
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          <div className="lg:col-span-1 space-y-4 md:space-y-6">
            {/* Upload Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Upload MusicXML Files
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <label htmlFor="musicxml-upload" className="block text-sm font-medium">
                    Upload MusicXML File
                  </label>
                  <div className="flex items-center gap-2">
                    <Input id="musicxml-upload" type="file" accept=".xml,.musicxml" multiple onChange={handleFileUpload} className="hidden" />
                    <Button onClick={() => document.getElementById('musicxml-upload')?.click()} variant="outline" className="w-full py-1">
                      <Upload className="h-4 w-4 mr-2" />
                      Choose Files
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Uploaded Files</h4>
                  {uploadedFiles.length === 0 ? <p className="text-sm text-muted-foreground">No files uploaded yet</p> : <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                      <SortableContext items={uploadedFiles.map(file => file.id)} strategy={verticalListSortingStrategy}>
                        <div className="space-y-2">
                          {uploadedFiles.map(file => <SortableFileItem key={file.id} file={file} isSelected={selectedFile?.id === file.id} onSelect={handleFileSelect} onRemove={removeFile} />)}
                        </div>
                      </SortableContext>
                    </DndContext>}
                </div>
              </CardContent>
            </Card>

            {/* Public Library Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileMusic className="h-5 w-5" />
                  Public MusicXML Library
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingPublic ? <p className="text-sm text-muted-foreground">Loading library...</p> : publicFiles.length === 0 ? <p className="text-sm text-muted-foreground">No public files available</p> : <div className="space-y-2 max-h-64 overflow-y-auto">
                    {publicFiles.map(file => <div key={file.id} className={`p-3 rounded-md border cursor-pointer transition-colors ${selectedFile?.id === file.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`} onClick={() => handlePublicFileSelect(file)}>
                        <div className="space-y-1">
                          <p className="text-sm font-medium truncate">{file.title}</p>
                          {file.composer && <p className="text-xs text-muted-foreground">by {file.composer}</p>}
                          <p className="text-xs text-muted-foreground">
                            Added {new Date(file.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>)}
                  </div>}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Card ref={scoreDisplayRef} className="h-full">
              <CardHeader>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <CardTitle>
                    {selectedFile ? selectedFile.name : 'Musical Score'}
                  </CardTitle>
                  {selectedFile && <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <label className="text-sm font-medium">Mode:</label>
                        <select value={mode} onChange={e => setMode(e.target.value as any)} className="px-3 py-2 text-sm border border-border rounded bg-background text-foreground z-50">
                          <option value="click-only">Click Only</option>
                          <option value="click-and-score">Click + Notes</option>
                          <option value="pitch-only">Notes Only</option>
                          <option value="record">Record</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-sm font-medium">Tempo:</label>
                        <div className="w-20">
                          <Slider value={[tempo]} onValueChange={value => setTempo(value[0])} min={60} max={200} step={5} className="cursor-pointer" />
                        </div>
                        <span className="text-sm text-muted-foreground w-12">{tempo} BPM</span>
                      </div>
                      <Button onClick={handlePlayPause} variant="outline" size="sm" className="flex items-center gap-2">
                        {mode === 'record' ? isRecording ? <>
                              <MicOff className="h-4 w-4" />
                              Stop Recording
                            </> : <>
                              <Mic className="h-4 w-4" />
                              Start Recording
                            </> : isPlaying ? <>
                              <Pause className="h-4 w-4" />
                              Stop
                            </> : <>
                              <Play className="h-4 w-4" />
                              Play
                            </>}
                      </Button>
                    </div>}
                </div>
              </CardHeader>
              <CardContent className="h-[400px] md:h-[600px] px-0 md:px-6">
                {selectedFile ? <ScoreDisplay musicXML={selectedFile.content} /> : <div className="h-full flex items-center justify-center text-center">
                    <div className="space-y-3">
                      <FileMusic className="h-12 w-12 mx-auto text-muted-foreground" />
                      <div>
                        <p className="text-lg font-medium">No file selected</p>
                        <p className="text-sm text-muted-foreground">
                          Upload a MusicXML file to view the musical notation
                        </p>
                      </div>
                    </div>
                  </div>}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Share Recording Dialog */}
        {showShareDialog && recordedAudio && <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-96 mx-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Share2 className="h-5 w-5" />
                  Recording Complete
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Your sight singing recording is ready! Would you like to download it?
                </p>
                <div className="flex gap-2">
                  <Button onClick={handleShareRecording} className="flex-1">
                    <Share2 className="h-4 w-4 mr-2" />
                    Download Recording
                  </Button>
                  <Button onClick={() => setShowShareDialog(false)} variant="outline" className="flex-1">
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>}
      </div>
    </UniversalLayout>;
};
export default MUS100SightSingingPage;