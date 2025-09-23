import React, { useState } from 'react';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScoreDisplay } from '@/components/sight-singing/ScoreDisplay';
import { useTonePlayback } from '@/components/sight-singing/hooks/useTonePlayback';
import { Upload, FileMusic, Trash2, Play, Pause, Volume2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface UploadedFile {
  id: string;
  name: string;
  content: string;
}

const MUS100SightSingingPage: React.FC = () => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<UploadedFile | null>(null);
  const { isPlaying, startPlayback, stopPlayback } = useTonePlayback();

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

    // Reset input
    event.target.value = '';
  };

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
    if (selectedFile?.id === fileId) {
      setSelectedFile(null);
    }
  };

  const downloadMusicXML = (file: UploadedFile) => {
    const blob = new Blob([file.content], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePlayPause = () => {
    if (!selectedFile) return;

    if (isPlaying) {
      stopPlayback();
    } else {
      startPlayback(selectedFile.content, 120); // 120 BPM default tempo
    }
  };

  return (
    <UniversalLayout>
      <div className="space-y-6">
        <div className="border-b border-border pb-4">
          <h1 className="text-3xl font-bold text-foreground">MUS100 Sight Singing Practice</h1>
          <p className="text-muted-foreground mt-2">
            Upload MusicXML files to practice sight singing with professional notation display.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* File Management Panel */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileMusic className="h-5 w-5" />
                  MusicXML Files
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Upload Section */}
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

                {/* File List */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Uploaded Files</h4>
                  {uploadedFiles.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No files uploaded yet</p>
                  ) : (
                    <div className="space-y-2">
                      {uploadedFiles.map((file) => (
                        <div
                          key={file.id}
                          className={`p-3 rounded-md border cursor-pointer transition-colors ${
                            selectedFile?.id === file.id
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div
                              onClick={() => setSelectedFile(file)}
                              className="flex-1 min-w-0"
                            >
                              <p className="text-sm font-medium truncate">{file.name}</p>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  downloadMusicXML(file);
                                }}
                                className="h-8 w-8 p-0"
                              >
                                <Upload className="h-3 w-3" />
                              </Button>
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

          {/* Score Display Panel */}
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>
                    {selectedFile ? selectedFile.name : 'Musical Score'}
                  </CardTitle>
                  {selectedFile && (
                    <div className="flex gap-2">
                      <Button
                        onClick={handlePlayPause}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        {isPlaying ? (
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
              <CardContent className="h-[600px]">
                {selectedFile ? (
                  <ScoreDisplay
                    musicXML={selectedFile.content}
                  />
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
      </div>
    </UniversalLayout>
  );
};

export default MUS100SightSingingPage;