import React, { useState, useRef, useCallback } from 'react';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { ScoreDisplay } from '@/components/sight-singing/ScoreDisplay';
import { useTonePlayback } from '@/components/sight-singing/hooks/useTonePlayback';
import { Upload, FileMusic, Trash2, Play, Pause, Mic, MicOff, Share2, Music, BookOpen, Users } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface UploadedFile {
  id: string;
  name: string;
  content: string;
}

const MUS100SightSingingPage: React.FC = () => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<UploadedFile | null>(null);
  const [tempo, setTempo] = useState<number>(120);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  const {
    isPlaying,
    mode,
    setMode,
    startPlayback,
    stopPlayback
  } = useTonePlayback();

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
        const content = await file.text();
        const newFile: UploadedFile = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          name: file.name,
          content
        };
        newFiles.push(newFile);
      }

      setUploadedFiles(prev => [...prev, ...newFiles]);
      
      // Auto-select the first uploaded file if none is selected
      if (!selectedFile && newFiles.length > 0) {
        setSelectedFile(newFiles[0]);
      }

      toast({
        title: "Files uploaded successfully",
        description: `${newFiles.length} MusicXML file${newFiles.length > 1 ? 's' : ''} uploaded`
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Could not read some MusicXML files",
        variant: "destructive"
      });
    }

    event.target.value = '';
  };

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
    if (selectedFile?.id === fileId) {
      setSelectedFile(null);
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
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
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

  return (
    <UniversalLayout>
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
            <Music className="h-8 w-8 text-primary animate-pulse" style={{ animationDelay: '0.5s' }} />
          </div>
          <div className="absolute bottom-4 left-12 opacity-10">
            <Music className="h-12 w-12 text-primary animate-pulse" style={{ animationDelay: '1s' }} />
          </div>
          
          {/* Main header content */}
          <div className="relative px-6 py-12 md:py-16">
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
                <p className="text-xl md:text-2xl text-muted-foreground font-medium animate-fade-in" style={{ animationDelay: '0.2s' }}>
                  Practice & Perfect Your Musical Skills
                </p>
                <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed animate-fade-in" style={{ animationDelay: '0.4s' }}>
                  Upload MusicXML files, practice sight singing with interactive playback modes, 
                  and record yourself to track your progress. Develop your musical ear and vocal precision.
                </p>
              </div>
              
              {/* Feature highlights */}
              <div className="flex flex-wrap justify-center gap-4 pt-6 animate-fade-in" style={{ animationDelay: '0.6s' }}>
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-background/80 border border-border/50 backdrop-blur-sm">
                  <FileMusic className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">MusicXML Support</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-background/80 border border-border/50 backdrop-blur-sm">
                  <Play className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Interactive Playback</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-background/80 border border-border/50 backdrop-blur-sm">
                  <Mic className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Voice Recording</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileMusic className="h-5 w-5" />
                  MusicXML Files
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <label htmlFor="musicxml-upload" className="block text-sm font-medium">
                    Upload MusicXML File
                  </label>
                  <div className="flex items-center gap-2">
                    <Input 
                      id="musicxml-upload" 
                      type="file" 
                      accept=".xml,.musicxml" 
                      multiple
                      onChange={handleFileUpload} 
                      className="hidden" 
                    />
                    <Button 
                      onClick={() => document.getElementById('musicxml-upload')?.click()} 
                      variant="outline" 
                      className="w-full"
                    >
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
                    <div className="space-y-2">
                      {uploadedFiles.map(file => (
                        <div 
                          key={file.id} 
                          className={`p-3 rounded-md border cursor-pointer transition-colors ${
                            selectedFile?.id === file.id 
                              ? 'border-primary bg-primary/5' 
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div onClick={() => setSelectedFile(file)} className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{file.name}</p>
                            </div>
                            <div className="flex gap-1">
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeFile(file.id);
                                }} 
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>
                    {selectedFile ? selectedFile.name : 'Musical Score'}
                  </CardTitle>
                  {selectedFile && (
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <label className="text-sm font-medium">Mode:</label>
                        <select 
                          value={mode} 
                          onChange={(e) => setMode(e.target.value as any)}
                          className="px-3 py-2 text-sm border border-border rounded bg-background text-foreground z-50"
                        >
                          <option value="click-only">Click Only</option>
                          <option value="click-and-score">Click + Notes</option>
                          <option value="pitch-only">Notes Only</option>
                          <option value="record">Record</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-sm font-medium">Tempo:</label>
                        <div className="w-20">
                          <Slider
                            value={[tempo]}
                            onValueChange={(value) => setTempo(value[0])}
                            min={60}
                            max={200}
                            step={5}
                            className="cursor-pointer"
                          />
                        </div>
                        <span className="text-sm text-muted-foreground w-12">{tempo} BPM</span>
                      </div>
                      <Button onClick={handlePlayPause} variant="outline" size="sm" className="flex items-center gap-2">
                        {mode === 'record' ? (
                          isRecording ? (
                            <>
                              <MicOff className="h-4 w-4" />
                              Stop Recording
                            </>
                          ) : (
                            <>
                              <Mic className="h-4 w-4" />
                              Start Recording
                            </>
                          )
                        ) : (
                          isPlaying ? (
                            <>
                              <Pause className="h-4 w-4" />
                              Stop
                            </>
                          ) : (
                            <>
                              <Play className="h-4 w-4" />
                              Play
                            </>
                          )
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="h-[600px]">
                {selectedFile ? (
                  <ScoreDisplay musicXML={selectedFile.content} />
                ) : (
                  <div className="h-full flex items-center justify-center text-center">
                    <div className="space-y-3">
                      <FileMusic className="h-12 w-12 mx-auto text-muted-foreground" />
                      <div>
                        <p className="text-lg font-medium">No file selected</p>
                        <p className="text-sm text-muted-foreground">
                          Upload a MusicXML file to view the musical notation
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Share Recording Dialog */}
        {showShareDialog && recordedAudio && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
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
          </div>
        )}
      </div>
    </UniversalLayout>
  );
};

export default MUS100SightSingingPage;