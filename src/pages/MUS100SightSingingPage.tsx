import React, { useState, useRef, useCallback } from 'react';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { ScoreDisplay } from '@/components/sight-singing/ScoreDisplay';
import { useTonePlayback } from '@/components/sight-singing/hooks/useTonePlayback';
import { Upload, FileMusic, Trash2, Play, Pause, Mic, MicOff, Share2 } from 'lucide-react';
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
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.xml') && !file.name.toLowerCase().endsWith('.musicxml')) {
      toast({
        title: "Invalid file type",
        description: "Please upload a MusicXML (.xml or .musicxml) file",
        variant: "destructive"
      });
      return;
    }

    try {
      const content = await file.text();
      const newFile: UploadedFile = {
        id: Date.now().toString(),
        name: file.name,
        content
      };

      setUploadedFiles(prev => [...prev, newFile]);
      setSelectedFile(newFile);
      toast({
        title: "File uploaded successfully",
        description: `${file.name} has been loaded for sight singing practice`
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Could not read the MusicXML file",
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
      <div className="space-y-6">
        <div className="border-b border-border pb-4">
          <h1 className="text-3xl font-bold text-foreground">MUS100 Sight Singing Practice</h1>
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
                      onChange={handleFileUpload} 
                      className="hidden" 
                    />
                    <Button 
                      onClick={() => document.getElementById('musicxml-upload')?.click()} 
                      variant="outline" 
                      className="w-full"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Choose File
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