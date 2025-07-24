import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Upload, Download, FileText, PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface MarkedScore {
  id: string;
  uploader_id: string;
  voice_part: string;
  file_url: string;
  description: string | null;
  created_at: string;
  uploader_name?: string;
}

interface MarkedScoresProps {
  musicId: string;
  voiceParts: string[];
}

export const MarkedScores = ({ musicId, voiceParts }: MarkedScoresProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [markedScores, setMarkedScores] = useState<MarkedScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newScore, setNewScore] = useState({
    voice_part: '',
    description: '',
    file: null as File | null
  });

  useEffect(() => {
    fetchMarkedScores();
  }, [musicId]);

  const fetchMarkedScores = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_marked_scores')
        .select('*')
        .eq('music_id', musicId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get uploader names separately
      const uploaderIds = [...new Set(data?.map(score => score.uploader_id) || [])];
      const { data: profiles } = await supabase
        .from('gw_profiles')
        .select('user_id, full_name')
        .in('user_id', uploaderIds);

      const profileMap = profiles?.reduce((acc, profile) => {
        acc[profile.user_id] = profile.full_name;
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
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!user || !newScore.file || !newScore.voice_part) return;

    setUploading(true);
    try {
      // Upload file to storage
      const fileExt = newScore.file.name.split('.').pop();
      const fileName = `${Date.now()}_${newScore.voice_part}_${musicId}.${fileExt}`;
      const filePath = `marked-scores/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('marked-scores')
        .upload(filePath, newScore.file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('marked-scores')
        .getPublicUrl(filePath);

      // Save to database
      const { error: dbError } = await supabase
        .from('gw_marked_scores')
        .insert({
          music_id: musicId,
          uploader_id: user.id,
          voice_part: newScore.voice_part,
          file_url: publicUrl,
          description: newScore.description || null
        });

      if (dbError) throw dbError;

      toast({
        title: "Success",
        description: "Marked score uploaded successfully",
      });

      setNewScore({
        voice_part: '',
        description: '',
        file: null
      });
      setShowUploadDialog(false);
      fetchMarkedScores();
    } catch (error) {
      console.error('Error uploading marked score:', error);
      toast({
        title: "Error",
        description: "Failed to upload marked score",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (score: MarkedScore) => {
    try {
      // Extract file path from URL
      const urlParts = score.file_url.split('/');
      const filePath = urlParts.slice(-2).join('/'); // Get 'marked-scores/filename'
      
      const { data, error } = await supabase.storage
        .from('marked-scores')
        .download(filePath);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${score.voice_part}_marked_score.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      toast({
        title: "Error",
        description: "Failed to download file",
        variant: "destructive",
      });
    }
  };

  const groupedScores = markedScores.reduce((acc, score) => {
    if (!acc[score.voice_part]) acc[score.voice_part] = [];
    acc[score.voice_part].push(score);
    return acc;
  }, {} as Record<string, MarkedScore[]>);

  if (loading) {
    return <div className="flex justify-center py-8">Loading marked scores...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Marked Scores</h3>
        <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
          <DialogTrigger asChild>
            <Button size="sm">
              <PlusCircle className="h-4 w-4 mr-2" />
              Upload Marked Score
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Marked Score</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="voice_part">Voice Part</Label>
                <Select value={newScore.voice_part} onValueChange={(value) => setNewScore({ ...newScore, voice_part: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select voice part" />
                  </SelectTrigger>
                  <SelectContent>
                    {voiceParts.map(part => (
                      <SelectItem key={part} value={part}>{part}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="file">PDF File</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setNewScore({ ...newScore, file: e.target.files?.[0] || null })}
                />
              </div>
              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={newScore.description}
                  onChange={(e) => setNewScore({ ...newScore, description: e.target.value })}
                  placeholder="Describe the markings or notes..."
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleUpload} 
                  disabled={uploading || !newScore.file || !newScore.voice_part}
                >
                  {uploading ? 'Uploading...' : 'Upload'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {markedScores.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No marked scores have been uploaded yet.
        </div>
      ) : (
        <div className="space-y-6">
          {voiceParts.map(voicePart => (
            groupedScores[voicePart] && (
              <div key={voicePart} className="space-y-3">
                <h4 className="font-medium text-lg flex items-center gap-2">
                  {voicePart}
                  <Badge variant="secondary">{groupedScores[voicePart].length}</Badge>
                </h4>
                <div className="grid gap-3">
                  {groupedScores[voicePart].map(score => (
                    <Card key={score.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {score.voice_part} Marked Score
                          </CardTitle>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownload(score)}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                        </div>
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span>Uploaded by {score.uploader_name}</span>
                          <span>{new Date(score.created_at).toLocaleDateString()}</span>
                        </div>
                      </CardHeader>
                      {score.description && (
                        <CardContent>
                          <p className="text-sm text-muted-foreground">{score.description}</p>
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>
              </div>
            )
          ))}
        </div>
      )}
    </div>
  );
};