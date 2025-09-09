import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Plus, 
  Upload, 
  Download, 
  Eye, 
  Edit, 
  Trash2, 
  Music, 
  FileMusic,
  Search,
  Filter
} from 'lucide-react';
import { useSheetMusicLibrary } from '@/hooks/useSheetMusicLibrary';
import { useToast } from '@/hooks/use-toast';
import { ScoreDisplay } from '@/components/sight-singing/ScoreDisplay';

interface MusicXMLLibraryProps {
  user: any;
}

export const MusicXMLLibrary: React.FC<MusicXMLLibraryProps> = ({ user }) => {
  const { scores, loading, addScore, updateScore, deleteScore, uploadXML } = useSheetMusicLibrary();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [filterKey, setFilterKey] = useState<string>('all');
  const [selectedScore, setSelectedScore] = useState<any>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingScore, setEditingScore] = useState<any>(null);

  // New score form state
  const [newScore, setNewScore] = useState({
    title: '',
    composer: '',
    arranger: '',
    difficulty_level: 'beginner',
    key_signature: 'C major',
    time_signature: '4/4',
    voice_parts: ['soprano'],
    tags: '',
    is_public: false
  });

  const difficultyLevels = ['beginner', 'intermediate', 'advanced', 'expert'];
  const keySignatures = [
    'C major', 'G major', 'D major', 'A major', 'E major', 'B major', 'F# major',
    'C# major', 'F major', 'Bb major', 'Eb major', 'Ab major', 'Db major', 'Gb major',
    'Cb major', 'A minor', 'E minor', 'B minor', 'F# minor', 'C# minor', 'G# minor',
    'D# minor', 'A# minor', 'D minor', 'G minor', 'C minor', 'F minor', 'Bb minor',
    'Eb minor', 'Ab minor'
  ];
  const timeSignatures = ['4/4', '3/4', '2/4', '6/8', '9/8', '12/8', '2/2', '3/2'];
  const voiceParts = ['soprano', 'alto', 'tenor', 'bass'];

  const filteredScores = scores.filter(score => {
    const matchesSearch = score.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         score.composer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         score.arranger?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesLevel = filterLevel === 'all' || score.difficulty_level === filterLevel;
    const matchesKey = filterKey === 'all' || score.key_signature === filterKey;
    
    return matchesSearch && matchesLevel && matchesKey;
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.xml') && !file.name.toLowerCase().endsWith('.musicxml')) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a .xml or .musicxml file.",
        variant: "destructive",
      });
      return;
    }

    try {
      const uploadedScore = await uploadXML(file);
      toast({
        title: "Score Uploaded",
        description: "MusicXML file has been uploaded successfully.",
      });
      // Reset form
      event.target.value = '';
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload file.",
        variant: "destructive",
      });
    }
  };

  const handleCreateScore = async () => {
    try {
      const scoreData = {
        ...newScore,
        tags: newScore.tags.split(',').map(tag => tag.trim()).filter(Boolean),
        voice_parts: newScore.voice_parts
      };
      
      await addScore(scoreData);
      
      toast({
        title: "Score Created",
        description: "New score has been created successfully.",
      });
      
      setIsCreateDialogOpen(false);
      setNewScore({
        title: '',
        composer: '',
        arranger: '',
        difficulty_level: 'beginner',
        key_signature: 'C major',
        time_signature: '4/4',
        voice_parts: ['soprano'],
        tags: '',
        is_public: false
      });
    } catch (error) {
      toast({
        title: "Creation Failed",
        description: error instanceof Error ? error.message : "Failed to create score.",
        variant: "destructive",
      });
    }
  };

  const handleEditScore = (score: any) => {
    setEditingScore({
      ...score,
      tags: score.tags?.join(', ') || ''
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateScore = async () => {
    if (!editingScore) return;

    try {
      const updateData = {
        ...editingScore,
        tags: editingScore.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean)
      };
      
      await updateScore(editingScore.id, updateData);
      
      toast({
        title: "Score Updated",
        description: "Score has been updated successfully.",
      });
      
      setIsEditDialogOpen(false);
      setEditingScore(null);
    } catch (error) {
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update score.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteScore = async (scoreId: string) => {
    if (!confirm('Are you sure you want to delete this score? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteScore(scoreId);
      toast({
        title: "Score Deleted",
        description: "Score has been deleted successfully.",
      });
    } catch (error) {
      toast({
        title: "Delete Failed",
        description: error instanceof Error ? error.message : "Failed to delete score.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading library...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex-1 space-y-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search scores..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterLevel} onValueChange={setFilterLevel}>
              <SelectTrigger className="w-32">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                {difficultyLevels.map(level => (
                  <SelectItem key={level} value={level}>
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterKey} onValueChange={setFilterKey}>
              <SelectTrigger className="w-32">
                <Music className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Keys</SelectItem>
                {keySignatures.map(key => (
                  <SelectItem key={key} value={key}>{key}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Score
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Score</DialogTitle>
                <DialogDescription>
                  Create a new MusicXML score entry in the library
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={newScore.title}
                      onChange={(e) => setNewScore({...newScore, title: e.target.value})}
                      placeholder="Score title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="composer">Composer</Label>
                    <Input
                      id="composer"
                      value={newScore.composer}
                      onChange={(e) => setNewScore({...newScore, composer: e.target.value})}
                      placeholder="Composer name"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="arranger">Arranger</Label>
                    <Input
                      id="arranger"
                      value={newScore.arranger}
                      onChange={(e) => setNewScore({...newScore, arranger: e.target.value})}
                      placeholder="Arranger name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="difficulty">Difficulty Level</Label>
                    <Select value={newScore.difficulty_level} onValueChange={(value) => setNewScore({...newScore, difficulty_level: value})}>
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
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="key_signature">Key Signature</Label>
                    <Select value={newScore.key_signature} onValueChange={(value) => setNewScore({...newScore, key_signature: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {keySignatures.map(key => (
                          <SelectItem key={key} value={key}>{key}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time_signature">Time Signature</Label>
                    <Select value={newScore.time_signature} onValueChange={(value) => setNewScore({...newScore, time_signature: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {timeSignatures.map(time => (
                          <SelectItem key={time} value={time}>{time}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="tags">Tags (comma-separated)</Label>
                  <Input
                    id="tags"
                    value={newScore.tags}
                    onChange={(e) => setNewScore({...newScore, tags: e.target.value})}
                    placeholder="sight-reading, warm-up, scales"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateScore} disabled={!newScore.title}>
                  Create Score
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          
          <div className="relative">
            <input
              type="file"
              accept=".xml,.musicxml"
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <Button variant="outline">
              <Upload className="h-4 w-4 mr-2" />
              Upload XML
            </Button>
          </div>
        </div>
      </div>

      {/* Scores Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredScores.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="pt-6">
              <div className="text-center">
                <FileMusic className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground">No Scores Found</h3>
                <p className="text-sm text-muted-foreground">
                  {searchTerm || filterLevel !== 'all' || filterKey !== 'all' 
                    ? 'Try adjusting your search filters.'
                    : 'Create your first score or upload a MusicXML file.'
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredScores.map((score) => (
            <Card key={score.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <CardTitle className="text-base">{score.title}</CardTitle>
                    {score.composer && (
                      <CardDescription className="text-sm">
                        by {score.composer}
                        {score.arranger && ` (arr. ${score.arranger})`}
                      </CardDescription>
                    )}
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {score.difficulty_level}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{score.key_signature}</span>
                  <span>•</span>
                  <span>{score.time_signature}</span>
                  {score.voice_parts && score.voice_parts.length > 0 && (
                    <>
                      <span>•</span>
                      <span>{score.voice_parts.join(', ')}</span>
                    </>
                  )}
                </div>
                
                {score.tags && score.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {score.tags.slice(0, 3).map((tag: string, index: number) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {score.tags.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{score.tags.length - 3} more
                      </Badge>
                    )}
                  </div>
                )}
                
                <div className="flex justify-between items-center pt-2">
                  <div className="flex gap-1">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setSelectedScore(score)}
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleEditScore(score)}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleDeleteScore(score.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  
                  <span className="text-xs text-muted-foreground">
                    {score.is_public ? 'Public' : 'Private'}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Score Viewer Dialog */}
      <Dialog open={!!selectedScore} onOpenChange={() => setSelectedScore(null)}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>{selectedScore?.title}</DialogTitle>
            <DialogDescription>
              {selectedScore?.composer && `by ${selectedScore.composer}`}
              {selectedScore?.arranger && ` (arr. ${selectedScore.arranger})`}
            </DialogDescription>
          </DialogHeader>
          {selectedScore?.xml_content && (
            <ScrollArea className="flex-1">
              <ScoreDisplay musicXML={selectedScore.xml_content} />
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Score Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Score</DialogTitle>
            <DialogDescription>
              Update score information and metadata
            </DialogDescription>
          </DialogHeader>
          {editingScore && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-title">Title *</Label>
                  <Input
                    id="edit-title"
                    value={editingScore.title}
                    onChange={(e) => setEditingScore({...editingScore, title: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-composer">Composer</Label>
                  <Input
                    id="edit-composer"
                    value={editingScore.composer || ''}
                    onChange={(e) => setEditingScore({...editingScore, composer: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-difficulty">Difficulty Level</Label>
                  <Select 
                    value={editingScore.difficulty_level} 
                    onValueChange={(value) => setEditingScore({...editingScore, difficulty_level: value})}
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
                <div className="space-y-2">
                  <Label htmlFor="edit-key">Key Signature</Label>
                  <Select 
                    value={editingScore.key_signature} 
                    onValueChange={(value) => setEditingScore({...editingScore, key_signature: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {keySignatures.map(key => (
                        <SelectItem key={key} value={key}>{key}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-tags">Tags (comma-separated)</Label>
                <Input
                  id="edit-tags"
                  value={editingScore.tags}
                  onChange={(e) => setEditingScore({...editingScore, tags: e.target.value})}
                  placeholder="sight-reading, warm-up, scales"
                />
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateScore}>
              Update Score
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};