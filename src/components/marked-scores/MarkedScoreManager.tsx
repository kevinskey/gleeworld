import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnnotationCanvas } from './AnnotationCanvas';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { uploadFileAndGetUrl, getFileUrl } from '@/utils/storage';
import { 
  Plus, 
  Edit3, 
  Eye, 
  Download, 
  Trash2,
  FileImage,
  Calendar,
  User
} from 'lucide-react';

interface MarkedScore {
  id: string;
  music_id: string;
  voice_part: string;
  description: string;
  file_url: string;
  canvas_data?: string;
  uploader_id: string;
  created_at: string;
  uploader_name?: string;
}

interface MarkedScoreManagerProps {
  musicId: string;
  musicTitle: string;
  originalPdfUrl?: string;
  voiceParts: string[];
}

export const MarkedScoreManager = ({ 
  musicId, 
  musicTitle, 
  originalPdfUrl,
  voiceParts 
}: MarkedScoreManagerProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [markedScores, setMarkedScores] = useState<MarkedScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [editingScore, setEditingScore] = useState<MarkedScore | null>(null);
  const [currentScore, setCurrentScore] = useState<MarkedScore | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const [newScore, setNewScore] = useState({
    voice_part: '',
    description: '',
  });

  useEffect(() => {
    fetchMarkedScores();
  }, [musicId]);

  const fetchMarkedScores = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('gw_marked_scores')
        .select('*')
        .eq('music_id', musicId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get uploader names
      const uploaderIds = [...new Set(data?.map(score => score.uploader_id) || [])];
      const { data: profiles } = await supabase
        .from('gw_profiles')
        .select('user_id, first_name, last_name')
        .in('user_id', uploaderIds);

      const profileMap = profiles?.reduce((acc, profile) => {
        acc[profile.user_id] = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Anonymous';
        return acc;
      }, {} as Record<string, string>) || {};

      const scoresWithUploader = data?.map(score => ({
        ...score,
        uploader_name: profileMap[score.uploader_id] || 'Unknown'
      })) || [];

      setMarkedScores(scoresWithUploader);
    } catch (error) {
      console.error('Error fetching marked scores:', error);
      toast({
        title: "Error",
        description: "Failed to load marked scores",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    setEditingScore(null);
    setNewScore({ voice_part: '', description: '' });
    setShowCreateDialog(true);
  };

  const handleEdit = (score: MarkedScore) => {
    setEditingScore(score);
    setNewScore({
      voice_part: score.voice_part,
      description: score.description
    });
    setShowCreateDialog(true);
  };

  const handleView = (score: MarkedScore) => {
    setCurrentScore(score);
    setShowViewDialog(true);
  };

  const handleSaveAnnotations = async (canvasData: string, imageBlob: Blob) => {
    if (!user) return;

    try {
      // Upload the annotated image
      const timestamp = Date.now();
      const fileName = `${timestamp}_${newScore.voice_part}_${musicId}.png`;
      
      // Convert blob to File
      const imageFile = new File([imageBlob], fileName, { type: 'image/png' });
      
      // Upload to marked-scores bucket
      const uploadResult = await uploadFileAndGetUrl(imageFile, 'marked-scores', user.id);
      
      if (!uploadResult) {
        throw new Error('Failed to upload marked score image');
      }

      const scoreData = {
        music_id: musicId,
        voice_part: newScore.voice_part,
        description: newScore.description,
        file_url: uploadResult.url,
        canvas_data: canvasData,
        uploader_id: user.id
      };

      if (editingScore) {
        // Update existing score
        const { error } = await supabase
          .from('gw_marked_scores')
          .update(scoreData)
          .eq('id', editingScore.id);

        if (error) throw error;
      } else {
        // Create new score
        const { error } = await supabase
          .from('gw_marked_scores')
          .insert(scoreData);

        if (error) throw error;
      }

      setShowCreateDialog(false);
      setHasUnsavedChanges(false);
      await fetchMarkedScores();
      
      toast({
        title: "Success",
        description: editingScore ? "Marked score updated successfully" : "Marked score saved successfully"
      });
    } catch (error) {
      console.error('Error saving marked score:', error);
      throw error; // Re-throw to be handled by AnnotationCanvas
    }
  };

  const handleDownload = async (score: MarkedScore) => {
    try {
      const response = await fetch(score.file_url);
      const blob = await response.blob();
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${musicTitle}_${score.voice_part}_marked.png`;
      link.click();
      
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Success",
        description: "Marked score downloaded successfully"
      });
    } catch (error) {
      console.error('Error downloading marked score:', error);
      toast({
        title: "Error",
        description: "Failed to download marked score",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (score: MarkedScore) => {
    if (!window.confirm('Are you sure you want to delete this marked score?')) return;

    try {
      const { error } = await supabase
        .from('gw_marked_scores')
        .delete()
        .eq('id', score.id);

      if (error) throw error;

      await fetchMarkedScores();
      
      toast({
        title: "Success",
        description: "Marked score deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting marked score:', error);
      toast({
        title: "Error",
        description: "Failed to delete marked score",
        variant: "destructive"
      });
    }
  };

  const groupedScores = markedScores.reduce((acc, score) => {
    if (!acc[score.voice_part]) acc[score.voice_part] = [];
    acc[score.voice_part].push(score);
    return acc;
  }, {} as Record<string, MarkedScore[]>);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h3 className="text-lg font-semibold">Marked Scores</h3>
          <p className="text-sm text-muted-foreground">
            Annotate and save marked versions of this sheet music
          </p>
        </div>
        <Button onClick={handleCreateNew} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Create Marked Score
        </Button>
      </div>

      {/* Marked Scores List */}
      {loading ? (
        <div className="text-center py-8">Loading marked scores...</div>
      ) : markedScores.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <FileImage className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No marked scores yet</p>
            <p className="text-sm text-muted-foreground">Create your first annotated score!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedScores).map(([voicePart, scores]) => (
            <Card key={voicePart}>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Badge variant="outline">{voicePart}</Badge>
                  <span className="text-sm text-muted-foreground">
                    ({scores.length} score{scores.length !== 1 ? 's' : ''})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  {scores.map((score) => (
                    <div key={score.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 border rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{score.description || 'Untitled'}</p>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{score.uploader_name}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 flex-shrink-0" />
                            {new Date(score.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-1 sm:gap-2 flex-wrap sm:flex-nowrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleView(score)}
                          className="flex-1 sm:flex-none"
                        >
                          <Eye className="h-4 w-4 sm:mr-0" />
                          <span className="ml-2 sm:hidden">View</span>
                        </Button>
                        {score.uploader_id === user?.id && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(score)}
                            className="flex-1 sm:flex-none"
                          >
                            <Edit3 className="h-4 w-4 sm:mr-0" />
                            <span className="ml-2 sm:hidden">Edit</span>
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(score)}
                          className="flex-1 sm:flex-none"
                        >
                          <Download className="h-4 w-4 sm:mr-0" />
                          <span className="ml-2 sm:hidden">Download</span>
                        </Button>
                        {score.uploader_id === user?.id && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(score)}
                            className="flex-1 sm:flex-none"
                          >
                            <Trash2 className="h-4 w-4 sm:mr-0" />
                            <span className="ml-2 sm:hidden">Delete</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog 
        open={showCreateDialog} 
        onOpenChange={(open) => {
          if (!open && hasUnsavedChanges) {
            if (window.confirm('You have unsaved changes. Are you sure you want to close?')) {
              setShowCreateDialog(false);
              setHasUnsavedChanges(false);
            }
          } else {
            setShowCreateDialog(open);
          }
        }}
      >
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle>
              {editingScore ? 'Edit Marked Score' : 'Create Marked Score'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Metadata Form */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="voice_part">Voice Part</Label>
                <Select 
                  value={newScore.voice_part} 
                  onValueChange={(value) => setNewScore({...newScore, voice_part: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select voice part" />
                  </SelectTrigger>
                  <SelectContent>
                    {voiceParts.map((part) => (
                      <SelectItem key={part} value={part}>{part}</SelectItem>
                    ))}
                    <SelectItem value="All Parts">All Parts</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={newScore.description}
                  onChange={(e) => setNewScore({...newScore, description: e.target.value})}
                  placeholder="Brief description of markings..."
                />
              </div>
            </div>

            {/* Annotation Canvas */}
            <AnnotationCanvas
              backgroundImageUrl={originalPdfUrl}
              initialAnnotations={editingScore?.canvas_data}
              onSave={handleSaveAnnotations}
              onAnnotationChange={setHasUnsavedChanges}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle>View Marked Score</DialogTitle>
          </DialogHeader>
          
          {currentScore && (
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium">{currentScore.description || 'Untitled'}</h4>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <Badge variant="outline">{currentScore.voice_part}</Badge>
                    <span>By {currentScore.uploader_name}</span>
                    <span>{new Date(currentScore.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={() => handleDownload(currentScore)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
              
              <div className="border rounded-lg overflow-hidden">
                <img 
                  src={currentScore.file_url} 
                  alt="Marked Score"
                  className="w-full h-auto"
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};