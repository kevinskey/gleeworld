import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSheetMusicLibrary, SheetMusic } from '@/hooks/useSheetMusicLibrary';
import { Upload, Download, Music, Plus, Search, Edit, Trash2, FileMusic } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ScoreLibraryManagerProps {
  onScoreSelect?: (score: SheetMusic) => void;
  selectedScoreId?: string;
}

export const ScoreLibraryManager: React.FC<ScoreLibraryManagerProps> = ({
  onScoreSelect,
  selectedScoreId
}) => {
  const { scores, loading, addScore, updateScore, deleteScore, uploadXML, downloadXML } = useSheetMusicLibrary();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [editingScore, setEditingScore] = useState<SheetMusic | null>(null);
  const [newScore, setNewScore] = useState({
    title: '',
    composer: '',
    arranger: '',
    difficulty_level: '',
    key_signature: '',
    time_signature: '',
    voice_parts: [] as string[],
    tags: [] as string[],
    is_public: false,
  });

  const filteredScores = scores.filter(score =>
    score.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    score.composer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    score.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.xml') && !fileName.endsWith('.musicxml')) {
      toast({
        title: "Invalid File",
        description: "Please upload a .xml or .musicxml file.",
        variant: "destructive",
      });
      return;
    }

    try {
      await uploadXML(file);
      toast({
        title: "Success",
        description: "XML file uploaded and score created successfully.",
      });
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload XML file.",
        variant: "destructive",
      });
    }
  };

  const handleCreateScore = async () => {
    try {
      await addScore(newScore);
      setNewScore({
        title: '',
        composer: '',
        arranger: '',
        difficulty_level: '',
        key_signature: '',
        time_signature: '',
        voice_parts: [],
        tags: [],
        is_public: false,
      });
      toast({
        title: "Success",
        description: "Score created successfully.",
      });
    } catch (error) {
      toast({
        title: "Creation Failed",
        description: error instanceof Error ? error.message : "Failed to create score.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateScore = async () => {
    if (!editingScore) return;

    try {
      await updateScore(editingScore.id, editingScore);
      setEditingScore(null);
      toast({
        title: "Success",
        description: "Score updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update score.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteScore = async (scoreId: string) => {
    try {
      await deleteScore(scoreId);
      toast({
        title: "Success",
        description: "Score archived successfully.",
      });
    } catch (error) {
      toast({
        title: "Archive Failed",
        description: error instanceof Error ? error.message : "Failed to archive score.",
        variant: "destructive",
      });
    }
  };

  const handleDownloadXML = (score: SheetMusic) => {
    try {
      downloadXML(score);
      toast({
        title: "Success",
        description: "XML file downloaded successfully.",
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: error instanceof Error ? error.message : "Failed to download XML.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Loading score library...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Music className="h-5 w-5" />
          Score Library
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="browse" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="browse">Browse</TabsTrigger>
            <TabsTrigger value="upload">Upload XML</TabsTrigger>
            <TabsTrigger value="create">Create New</TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="space-y-4">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              <Input
                placeholder="Search scores..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
            </div>

            <div className="grid gap-4 max-h-96 overflow-y-auto">
              {filteredScores.map((score) => (
                <div
                  key={score.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedScoreId === score.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                  }`}
                  onClick={() => onScoreSelect?.(score)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-medium">{score.title}</h3>
                      {score.composer && (
                        <p className="text-sm text-muted-foreground">by {score.composer}</p>
                      )}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {score.difficulty_level && (
                          <Badge variant="secondary">{score.difficulty_level}</Badge>
                        )}
                        {score.key_signature && (
                          <Badge variant="outline">{score.key_signature}</Badge>
                        )}
                        {score.time_signature && (
                          <Badge variant="outline">{score.time_signature}</Badge>
                        )}
                        {score.xml_content && (
                          <Badge variant="default" className="bg-green-500">
                            <FileMusic className="h-3 w-3 mr-1" />
                            XML
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {score.xml_content && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadXML(score);
                          }}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingScore(score);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit Score</DialogTitle>
                          </DialogHeader>
                          {editingScore && (
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="edit-title">Title</Label>
                                <Input
                                  id="edit-title"
                                  value={editingScore.title}
                                  onChange={(e) => setEditingScore({
                                    ...editingScore,
                                    title: e.target.value
                                  })}
                                />
                              </div>
                              <div>
                                <Label htmlFor="edit-composer">Composer</Label>
                                <Input
                                  id="edit-composer"
                                  value={editingScore.composer || ''}
                                  onChange={(e) => setEditingScore({
                                    ...editingScore,
                                    composer: e.target.value
                                  })}
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label htmlFor="edit-key">Key Signature</Label>
                                  <Input
                                    id="edit-key"
                                    value={editingScore.key_signature || ''}
                                    onChange={(e) => setEditingScore({
                                      ...editingScore,
                                      key_signature: e.target.value
                                    })}
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="edit-time">Time Signature</Label>
                                  <Input
                                    id="edit-time"
                                    value={editingScore.time_signature || ''}
                                    onChange={(e) => setEditingScore({
                                      ...editingScore,
                                      time_signature: e.target.value
                                    })}
                                  />
                                </div>
                              </div>
                              <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setEditingScore(null)}>
                                  Cancel
                                </Button>
                                <Button onClick={handleUpdateScore}>
                                  Update Score
                                </Button>
                              </div>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteScore(score.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="upload" className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">Upload MusicXML File</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Select a .xml or .musicxml file to add to your score library
              </p>
              <Input
                type="file"
                accept=".xml,.musicxml"
                onChange={handleFileUpload}
                className="max-w-sm mx-auto"
              />
            </div>
          </TabsContent>

          <TabsContent value="create" className="space-y-4">
            <div className="grid gap-4">
              <div>
                <Label htmlFor="new-title">Title *</Label>
                <Input
                  id="new-title"
                  value={newScore.title}
                  onChange={(e) => setNewScore({ ...newScore, title: e.target.value })}
                  placeholder="Enter score title"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="new-composer">Composer</Label>
                  <Input
                    id="new-composer"
                    value={newScore.composer}
                    onChange={(e) => setNewScore({ ...newScore, composer: e.target.value })}
                    placeholder="Composer name"
                  />
                </div>
                <div>
                  <Label htmlFor="new-arranger">Arranger</Label>
                  <Input
                    id="new-arranger"
                    value={newScore.arranger}
                    onChange={(e) => setNewScore({ ...newScore, arranger: e.target.value })}
                    placeholder="Arranger name"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="new-difficulty">Difficulty</Label>
                  <Select
                    value={newScore.difficulty_level}
                    onValueChange={(value) => setNewScore({ ...newScore, difficulty_level: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                      <SelectItem value="professional">Professional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="new-key">Key Signature</Label>
                  <Input
                    id="new-key"
                    value={newScore.key_signature}
                    onChange={(e) => setNewScore({ ...newScore, key_signature: e.target.value })}
                    placeholder="e.g., C major"
                  />
                </div>
                <div>
                  <Label htmlFor="new-time">Time Signature</Label>
                  <Input
                    id="new-time"
                    value={newScore.time_signature}
                    onChange={(e) => setNewScore({ ...newScore, time_signature: e.target.value })}
                    placeholder="e.g., 4/4"
                  />
                </div>
              </div>
              <Button 
                onClick={handleCreateScore} 
                disabled={!newScore.title}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Score
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};