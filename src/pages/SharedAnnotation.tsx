import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Download, Eye, Calendar, User } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface SharedAnnotation {
  id: string;
  title: string;
  description?: string;
  permission_type: string;
  is_public: boolean;
  view_count: number;
  created_at: string;
  marked_score: {
    id: string;
    file_url: string;
    description: string;
    voice_part: string;
    canvas_data?: string;
    music: {
      title: string;
      composer?: string;
      pdf_url?: string;
    };
  };
  shared_by_profile: {
    full_name: string;
    email: string;
  };
}

export const SharedAnnotation = () => {
  const { shareToken } = useParams<{ shareToken: string }>();
  const [annotation, setAnnotation] = useState<SharedAnnotation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (shareToken) {
      fetchSharedAnnotation();
    }
  }, [shareToken]);

  const fetchSharedAnnotation = async () => {
    if (!shareToken) return;

    try {
      // Increment view count
      await supabase.rpc('increment_annotation_share_views', {
        share_token_param: shareToken
      });

      // Fetch the shared annotation with separate queries to avoid join issues
      const { data: shareData, error: shareError } = await supabase
        .from('gw_annotation_public_shares')
        .select('*')
        .eq('share_token', shareToken)
        .eq('is_active', true)
        .single();

      if (shareError) {
        if (shareError.code === 'PGRST116') {
          setError('This shared annotation link is invalid or has expired.');
        } else {
          throw shareError;
        }
        return;
      }

      // Fetch marked score data
      const { data: markedScoreData, error: markedScoreError } = await supabase
        .from('gw_marked_scores')
        .select('*')
        .eq('id', shareData.marked_score_id)
        .single();

      if (markedScoreError) throw markedScoreError;

      // Fetch music data
      const { data: musicData, error: musicError } = await supabase
        .from('gw_sheet_music')
        .select('title, composer, pdf_url')
        .eq('id', markedScoreData.music_id)
        .single();

      if (musicError) throw musicError;

      // Fetch profile data
      const { data: profileData, error: profileError } = await supabase
        .from('gw_profiles')
        .select('full_name, email')
        .eq('user_id', shareData.shared_by)
        .single();

      if (profileError) throw profileError;

      // Combine all data
      const combinedData: SharedAnnotation = {
        ...shareData,
        marked_score: {
          ...markedScoreData,
          music: musicData
        },
        shared_by_profile: profileData
      };

      setAnnotation(combinedData);
    } catch (error) {
      console.error('Error fetching shared annotation:', error);
      setError('Failed to load shared annotation');
      toast.error('Failed to load shared annotation');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!annotation) return;

    try {
      const response = await fetch(annotation.marked_score.file_url);
      const blob = await response.blob();
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${annotation.title}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Annotation downloaded!');
    } catch (error) {
      console.error('Error downloading annotation:', error);
      toast.error('Failed to download annotation');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading shared annotation...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !annotation) {
    return (
      <div className="container mx-auto py-8">
        <Card className="max-w-md mx-auto">
          <CardContent className="text-center py-8">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <h2 className="text-xl font-semibold mb-2">Unable to Load Annotation</h2>
            <p className="text-muted-foreground">{error || 'This annotation could not be found.'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{annotation.title}</h1>
              <p className="text-muted-foreground">
                {annotation.marked_score.music.title}
                {annotation.marked_score.music.composer && ` by ${annotation.marked_score.music.composer}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {annotation.view_count} views
              </Badge>
              <Badge variant={annotation.permission_type === 'edit' ? 'default' : 'secondary'}>
                {annotation.permission_type === 'edit' ? 'Editable' : 'View Only'}
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {annotation.description && (
              <p className="text-muted-foreground">{annotation.description}</p>
            )}
            
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>Shared by {annotation.shared_by_profile.full_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>{new Date(annotation.created_at).toLocaleDateString()}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleDownload} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Download Annotation
              </Button>
              {annotation.marked_score.music.pdf_url && (
                <Button asChild variant="outline">
                  <a href={annotation.marked_score.music.pdf_url} target="_blank" rel="noopener noreferrer">
                    View Original PDF
                  </a>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Annotation Display */}
      <Card>
        <CardContent className="p-0">
          <div className="aspect-[4/3] w-full bg-gray-50 rounded-lg overflow-hidden">
            <img
              src={annotation.marked_score.file_url}
              alt={annotation.title}
              className="w-full h-full object-contain"
              onError={(e) => {
                console.error('Error loading annotation image');
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Footer Info */}
      <Card>
        <CardContent className="py-4">
          <div className="text-center text-sm text-muted-foreground">
            <p>This is a shared musical annotation from GleeWorld.org</p>
            <p className="mt-1">
              Voice Part: <span className="font-medium">{annotation.marked_score.voice_part}</span>
              {annotation.marked_score.description && (
                <> • <span className="font-medium">{annotation.marked_score.description}</span></>
              )}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};