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
  const [selectedFile, setSelectedFile] = useState<UploadedFile | null>(null);
  const [tempo, setTempo] = useState<number>(120);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null);
  const [showShareDialog, setShowShareDialog] = useState(false);
  
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
      const {
        data,
        error
      } = await supabase.from('gw_sheet_music').select('id, title, composer, xml_content, xml_url, created_at').eq('is_public', true).eq('is_archived', false).order('created_at', {
        ascending: false
      });
      if (error) throw error;

      // Filter and process files to ensure they have XML content
      const processedFiles: UploadedFile[] = [];
      
      for (const file of data || []) {
        let xmlContent = file.xml_content;
        
        // If no xml_content but has xml_url, try to fetch it
        if (!xmlContent && file.xml_url) {
          try {
            const { data: fileData, error: downloadError } = await supabase.storage
              .from('user-files')
              .download(file.xml_url);
            
            if (!downloadError && fileData) {
              xmlContent = await fileData.text();
            }
          } catch (downloadError) {
            console.warn(`Failed to download XML for ${file.title}:`, downloadError);
            continue; // Skip this file if we can't get the content
          }
        }
        
        // Only include files that have XML content
        if (xmlContent) {
          processedFiles.push({
            id: file.id,
            name: file.title,
            content: xmlContent
          });
        }
      }
      
      setUploadedFiles(processedFiles);
    } catch (error) {
      console.error('Error fetching public MusicXML:', error);
      toast({
        title: "Error",
        description: "Failed to load public MusicXML library",
        variant: "destructive"
      });
    }
  };
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    // Check if user is logged in
    if (!user?.id) {
      toast({
        title: "Authentication required",
        description: "Please log in to upload files",
        variant: "destructive"
      });
      return;
    }
    
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
        } = await supabase.from('gw_sheet_music').select('id, title, xml_content').eq('created_by', user.id).eq('title', displayTitle);

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
          created_by: user.id,
          is_public: true,
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
          type: 'audio/mp3'
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
  const handlePlayPause = async (e?: React.MouseEvent) => {
    // Prevent any default behavior or event propagation
    e?.preventDefault();
    e?.stopPropagation();
    
    if (!selectedFile) return;
    if (mode === 'record-click' || mode === 'record-both') {
      if (isRecording) {
        try {
          stopRecording();
          stopPlayback();
        } catch (error) {
          console.error('Error stopping recording:', error);
          toast({
            title: 'Error',
            description: 'Failed to stop recording',
            variant: 'destructive'
          });
        }
      } else {
        try {
          await startRecording();
          await startPlayback(selectedFile.content, tempo, mode === 'record-click' ? 'click-only' : 'click-and-score');
        } catch (error) {
          console.error('Error starting recording:', error);
          toast({
            title: 'Error',
            description: 'Failed to start recording. Please allow microphone access.',
            variant: 'destructive'
          });
        }
      }
      return;
    }
    if (isPlaying) {
      stopPlayback();
    } else {
      try {
        await startPlayback(selectedFile.content, tempo, mode === 'click-only' ? 'click-only' : 'click-and-score');
      } catch (error) {
        console.error('Playback failed:', error);
        toast({
          title: 'Playback failed',
          description: error instanceof Error ? error.message : 'Audio could not start. Please tap once and try again.',
          variant: 'destructive'
        });
      }
    }
  };
  const handleShareRecording = () => {
    if (recordedAudio) {
      const url = URL.createObjectURL(recordedAudio);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sight-singing-${selectedFile?.name || 'recording'}-${Date.now()}.mp3`;
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
          <div className="relative px-6 py-12 md:py-16">
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
                
                <div className="p-3 rounded-full bg-primary/10 border border-primary/20">
                  <Users className="h-8 w-8 text-primary" />
                </div>
              </div>
              
              
              
              {/* Feature highlights */}
              
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            {/* Upload Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Upload Files
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <label htmlFor="musicxml-upload" className="block text-sm font-medium">
                    Upload MusicXML File
                  </label>
                  <div className="flex items-center gap-2">
                    <Input id="musicxml-upload" type="file" accept=".xml,.musicxml" multiple onChange={handleFileUpload} className="hidden" />
                    <Button onClick={() => document.getElementById('musicxml-upload')?.click()} variant="outline" className="w-full">
                      <Upload className="h-4 w-4 mr-2" />
                      Choose Files
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Uploaded Files</h4>
                  {uploadedFiles.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No files uploaded yet</p>
                  ) : (
                    <>
                      {/* Mobile: native selector (spinner) */}
                      <div className="lg:hidden">
                        <select
                          className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                          value={selectedFile?.id || ''}
                          onChange={(e) => {
                            const file = uploadedFiles.find(f => f.id === e.target.value);
                            if (file) {
                              setSelectedFile(file);
                              setTimeout(() => {
                                const scoreElement = document.querySelector('[data-score-display]');
                                if (scoreElement) {
                                  (scoreElement as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'start' });
                                }
                              }, 100);
                            }
                          }}
                        >
                          <option value="">Select uploaded composition…</option>
                          {uploadedFiles.map(file => {
                            const label = file.name.replace(/\.(xml|musicxml)$/i, '');
                            return (
                              <option key={file.id} value={file.id}>{label}</option>
                            );
                          })}
                        </select>
                      </div>

                      {/* Desktop: draggable list */}
                      <div className="hidden lg:block">
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                          <SortableContext items={uploadedFiles.map(file => file.id)} strategy={verticalListSortingStrategy}>
                            <div className="space-y-2">
                              {uploadedFiles.map(file => (
                                <SortableFileItem
                                  key={file.id}
                                  file={file}
                                  isSelected={selectedFile?.id === file.id}
                                  onSelect={setSelectedFile}
                                  onRemove={removeFile}
                                />
                              ))}
                            </div>
                          </SortableContext>
                        </DndContext>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

          </div>

          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader>
                <div className="space-y-3">
                  <CardTitle>
                    {selectedFile ? selectedFile.name : 'Musical Score'}
                  </CardTitle>
                  {selectedFile && (
                    <div className="space-y-3">
                      {/* Mobile-first responsive controls */}
                      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                        <div className="flex items-center gap-2 min-w-0">
                          <label className="text-sm font-medium whitespace-nowrap">Mode:</label>
                          <select 
                            value={mode} 
                            onChange={e => setMode(e.target.value as any)} 
                            className="flex-1 px-3 py-2 text-sm border border-border rounded bg-background text-foreground min-w-[120px]"
                          >
                            <option value="click-only">Click Only</option>
                            <option value="click-and-score">Click + Notes</option>
                            <option value="pitch-only">Notes Only</option>
                            <option value="record">Record</option>
                          </select>
                        </div>
                        
                        <div className="flex items-center gap-2 w-full sm:w-auto min-w-0">
                          <label className="text-sm font-medium whitespace-nowrap">Tempo:</label>
                          <div className="flex-1 min-w-[80px] max-w-[120px]">
                            <Slider 
                              value={[tempo]} 
                              onValueChange={value => setTempo(value[0])} 
                              min={60} 
                              max={200} 
                              step={5} 
                              className="cursor-pointer" 
                            />
                          </div>
                          <span className="text-sm text-muted-foreground whitespace-nowrap min-w-[50px]">
                            {tempo} BPM
                          </span>
                        </div>
                      </div>
                      
                      <Button 
                        onClick={(e) => handlePlayPause(e)} 
                        variant="outline" 
                        size="sm" 
                        type="button"
                        className="w-full sm:w-auto flex items-center justify-center gap-2"
                      >
                        {(mode === 'record-click' || mode === 'record-both') ? isRecording ? (
                          <>
                            <MicOff className="h-4 w-4" />
                            Stop Recording
                          </>
                        ) : (
                          <>
                            <Mic className="h-4 w-4" />
                            Start Recording
                          </>
                        ) : isPlaying ? (
                          <>
                            <Pause className="h-4 w-4" />
                            Stop
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4" />
                            Play
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="h-[600px]" data-score-display>
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