import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Upload, Download, FileText, PlusCircle, Edit3, Palette } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { MarkedScoreManager } from '@/components/marked-scores/MarkedScoreManager';

interface MarkedScore {
  id: string;
  uploader_id: string;
  voice_part: string;
  file_url: string;
  description: string | null;
  canvas_data?: string | null;
  created_at: string;
  uploader_name?: string;
}

interface MarkedScoresProps {
  musicId: string;
  musicTitle?: string;
  originalPdfUrl?: string;
  voiceParts: string[];
}

export const MarkedScores = ({ musicId, musicTitle, originalPdfUrl, voiceParts }: MarkedScoresProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [markedScores, setMarkedScores] = useState<MarkedScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAnnotationManager, setShowAnnotationManager] = useState(false);
  const [showLegacyUpload, setShowLegacyUpload] = useState(false);
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

  const handleLegacyUpload = async () => {
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
      setShowLegacyUpload(false);
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

  const annotatedScores = markedScores.filter(score => score.canvas_data);
  const legacyScores = markedScores.filter(score => !score.canvas_data);
  
  const groupedScores = markedScores.reduce((acc, score) => {
    if (!acc[score.voice_part]) acc[score.voice_part] = [];
    acc[score.voice_part].push(score);
    return acc;
  }, {} as Record<string, MarkedScore[]>);

  if (loading) {
    return <div className="flex justify-center py-8">Loading marked scores...</div>;
  }

  // Use the new annotation manager if we have original PDF URL
  if (originalPdfUrl) {
    return (
      <MarkedScoreManager
        musicId={musicId}
        musicTitle={musicTitle || 'Sheet Music'}
        originalPdfUrl={originalPdfUrl}
        voiceParts={voiceParts}
      />
    );
  }

  // Fallback to legacy system for uploaded PDFs without original
  return (
    <div className="pt-12 md:pt-14 space-y-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h3 className="text-lg font-semibold">Marked Scores</h3>
          <p className="text-sm text-muted-foreground">
            Upload annotated versions of this sheet music
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          {originalPdfUrl && (
            <Button onClick={() => setShowAnnotationManager(true)} className="w-full sm:w-auto">
              <Palette className="h-4 w-4 mr-2" />
              Create Annotated Score
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setShowLegacyUpload(true)} className="w-full sm:w-auto">
            <Upload className="h-4 w-4 mr-2" />
            Upload File
          </Button>
        </div>
      </div>

      {markedScores.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No marked scores yet</p>
            <p className="text-sm text-muted-foreground">
              Upload or create your first annotated score!
            </p>
          </CardContent>
        </Card>
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
                      <CardHeader className="pb-3 border-b">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <CardTitle className="text-base flex items-center gap-2 min-w-0">
                            <FileText className="h-4 w-4 flex-shrink-0" />
                            <span className="truncate">{score.description || `${score.voice_part} Marked Score`}</span>
                            {score.canvas_data && (
                              <Badge variant="default" className="text-xs flex-shrink-0">
                                Annotated
                              </Badge>
                            )}
                          </CardTitle>
                          <div className="flex gap-2 w-full sm:w-auto">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownload(score)}
                              className="w-full sm:w-auto"
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </Button>
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0 text-sm text-muted-foreground">
                          <span className="truncate">Uploaded by {score.uploader_name}</span>
                          <span>{new Date(score.created_at).toLocaleDateString()}</span>
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </div>
            )
          ))}
        </div>
      )}

      {/* Legacy Upload Dialog - keeping for backwards compatibility */}
      {showLegacyUpload && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Upload Marked Score</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Voice Part</label>
                <select 
                  value={newScore.voice_part} 
                  onChange={(e) => setNewScore({ ...newScore, voice_part: e.target.value })}
                  className="w-full p-2 border rounded"
                >
                  <option value="">Select voice part</option>
                  {voiceParts.map(part => (
                    <option key={part} value={part}>{part}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">PDF File</label>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={(e) => setNewScore({ ...newScore, file: e.target.files?.[0] || null })}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Description (Optional)</label>
                <textarea
                  value={newScore.description}
                  onChange={(e) => setNewScore({ ...newScore, description: e.target.value })}
                  placeholder="Describe the markings or notes..."
                  rows={3}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowLegacyUpload(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleLegacyUpload} 
                  disabled={uploading || !newScore.file || !newScore.voice_part}
                >
                  {uploading ? 'Uploading...' : 'Upload'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};