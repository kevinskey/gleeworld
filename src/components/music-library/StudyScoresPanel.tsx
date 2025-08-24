import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Share2, FileText, Plus, Trash2, FileImage } from 'lucide-react';
import { useStudyScores } from '@/hooks/useStudyScores';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface StudyScoresPanelProps {
  currentSelected?: { url: string; title: string; id?: string } | null;
  onOpenScore: (pdfUrl: string, title: string, id?: string) => void;
}

// Minimal shape for marked scores
interface MarkedScore {
  id: string;
  music_id: string;
  voice_part: string;
  description: string;
  file_url: string;
  uploader_id: string;
  created_at: string;
}

type UnifiedItem =
  | ({ type: 'study' } & ReturnType<typeof useStudyScores>['scores'][number])
  | ({ type: 'marked'; computedTitle: string } & MarkedScore);

export const StudyScoresPanel: React.FC<StudyScoresPanelProps> = ({ currentSelected, onOpenScore }) => {
  const { user } = useAuth();
  const { scores, loading, creating, createFromCurrent, shareStudyScore, fetchScores } = useStudyScores(currentSelected);

  const [markedScores, setMarkedScores] = useState<MarkedScore[]>([]);
  const [loadingMarked, setLoadingMarked] = useState(false);
  const [shareOpenId, setShareOpenId] = useState<string | null>(null);
  const [shareEmail, setShareEmail] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fetch user's own marked scores so they also appear here
  const fetchMarked = useCallback(async () => {
    if (!user?.id) {
      console.log('StudyScores: No user ID, skipping marked scores fetch');
      return;
    }
    console.log('StudyScores: Fetching marked scores for user:', user.id);
    setLoadingMarked(true);
    try {
      const { data, error } = await supabase
        .from('gw_marked_scores')
        .select('id, music_id, voice_part, description, file_url, uploader_id, created_at')
        .eq('uploader_id', user.id)
        .order('created_at', { ascending: false });
      if (error) {
        console.error('StudyScores: Error fetching marked scores:', error);
        throw error;
      }
      console.log('StudyScores: Fetched marked scores:', data);
      setMarkedScores((data || []) as MarkedScore[]);
    } catch (e) {
      console.error('Failed to load marked scores for Study Scores panel', e);
    } finally {
      setLoadingMarked(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchMarked();
  }, [fetchMarked]);

  // Live-sync marked scores when they change elsewhere
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel('rt-marked-scores')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'gw_marked_scores', filter: `uploader_id=eq.${user.id}` },
        (payload: any) => {
          try {
            if (payload.eventType === 'DELETE') {
              const id = payload.old?.id;
              if (id) setMarkedScores((prev) => prev.filter((m) => m.id !== id));
            } else if (payload.eventType === 'INSERT') {
              const row = payload.new;
              if (row) {
                setMarkedScores((prev) => {
                  if (prev.some((m) => m.id === row.id)) return prev;
                  const item = {
                    id: row.id,
                    music_id: row.music_id,
                    voice_part: row.voice_part,
                    description: row.description,
                    file_url: row.file_url,
                    uploader_id: row.uploader_id,
                    created_at: row.created_at,
                  } as MarkedScore;
                  return [item, ...prev];
                });
              }
            } else if (payload.eventType === 'UPDATE') {
              const row = payload.new;
              if (row) {
                setMarkedScores((prev) => prev.map((m) => (m.id === row.id ? { ...m, ...row } : m)));
              }
            }
          } catch (e) {
            console.warn('Realtime sync error (marked scores):', e);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const unified: UnifiedItem[] = useMemo(() => {
    const studyItems: UnifiedItem[] = scores.map((s) => ({ type: 'study', ...s }));
    const markedItems: UnifiedItem[] = markedScores.map((m) => ({
      type: 'marked',
      computedTitle: `${m.voice_part ? m.voice_part + ' • ' : ''}${m.description || 'Marked Score'}`,
      ...m,
    }));
    return [...studyItems, ...markedItems].sort((a, b) => {
      const aDate = 'created_at' in a ? new Date(a.created_at).getTime() : 0;
      const bDate = 'created_at' in b ? new Date(b.created_at).getTime() : 0;
      return bDate - aDate;
    });
  }, [scores, markedScores]);

  const canCreate = useMemo(() => Boolean(currentSelected?.id && currentSelected?.url), [currentSelected]);

  const deleteStudy = async (id: string, pdfUrl: string) => {
    if (!window.confirm('Delete this Study Score? This will remove shares and the stored copy.')) return;
    setDeletingId(id);
    try {
      console.log('Starting study score deletion for:', id);
      
      // Remove collaborators first
      const { error: collabErr } = await supabase.from('gw_study_score_collaborators').delete().eq('study_score_id', id);
      if (collabErr) {
        console.error('Error deleting collaborators:', collabErr);
        throw collabErr;
      }
      
      // Delete study score row
      const { error: delErr } = await supabase.from('gw_study_scores').delete().eq('id', id);
      if (delErr) {
        console.error('Error deleting study score:', delErr);
        throw delErr;
      }
      
      // Best-effort: delete storage object
      try {
        const url = new URL(pdfUrl);
        const idx = url.pathname.indexOf('/object/public/study-scores/');
        if (idx !== -1) {
          const path = url.pathname.substring(idx + '/object/public/'.length); // 'study-scores/...'
          const filePath = path.replace('study-scores/', '');
          if (filePath) {
            console.log('Deleting storage file:', filePath);
            await supabase.storage.from('study-scores').remove([filePath]);
          }
        }
      } catch (e) {
        console.warn('Study score storage delete skipped:', e);
      }
      
      console.log('Study score deleted successfully, refreshing scores');
      await fetchScores();
      toast.success('Study score deleted successfully');
    } catch (e: any) {
      console.error('Failed to delete study score:', e);
      toast.error(e?.message || 'Failed to delete study score. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const deleteMarked = async (id: string, fileUrl: string) => {
    if (!window.confirm('Delete this Marked Score? This will also remove any shares.')) return;
    setDeletingId(id);
    try {
      console.log('Starting marked score deletion for:', id);
      
      // Delete related records first
      await supabase.from('gw_annotation_shares').delete().eq('marked_score_id', id);
      await supabase.from('gw_annotation_public_shares').delete().eq('marked_score_id', id);
      
      // Delete the main record
      const { error: deleteError } = await supabase.from('gw_marked_scores').delete().eq('id', id);
      if (deleteError) {
        console.error('Error deleting marked score:', deleteError);
        throw deleteError;
      }
      
      // Try to remove file from storage
      try {
        const url = new URL(fileUrl);
        const idx = url.pathname.indexOf('/object/public/marked-scores/');
        if (idx !== -1) {
          const path = url.pathname.substring(idx + '/object/public/'.length);
          const filePath = path.replace('marked-scores/', '');
          if (filePath) {
            console.log('Deleting storage file:', filePath);
            await supabase.storage.from('marked-scores').remove([filePath]);
          }
        }
      } catch (e) {
        console.warn('Marked score storage delete skipped:', e);
      }
      
      // Force UI update by removing from local state and refetching
      setMarkedScores((prev) => prev.filter((m) => m.id !== id));
      // Also refetch to ensure consistency
      await fetchMarked();
      console.log('Marked score deleted successfully');
      toast.success('Marked score deleted successfully');
    } catch (e: any) {
      console.error('Failed to delete marked score:', e);
      toast.error(e?.message || 'Failed to delete marked score. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Study Scores & Marked Scores</CardTitle>
          <Button
            size="sm"
            variant="secondary"
            disabled={!canCreate || creating}
            onClick={async () => {
              const created = await createFromCurrent();
              if (created) {
                onOpenScore(created.pdf_url, created.title, created.derived_sheet_music_id);
              }
            }}
            className="gap-2"
          >
            <Plus className="h-4 w-4" /> Add current
          </Button>
        </div>
        {currentSelected?.title && (
          <p className="text-xs text-muted-foreground mt-1">Current: {currentSelected.title}</p>
        )}
      </CardHeader>
      <CardContent>
        {loading || loadingMarked ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : unified.length === 0 ? (
          <p className="text-sm text-muted-foreground">No Study Scores or Marked Scores yet.</p>
        ) : (
          <div className="space-y-2">
            {unified.map((item) => (
              <div key={`${item.type}-${item.id}`} className="border rounded p-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 overflow-hidden">
                     {item.type === 'marked' ? (
                       <FileImage className="h-4 w-4 shrink-0 text-orange-500" />
                     ) : (
                       <FileText className="h-4 w-4 shrink-0 text-blue-500" />
                     )}
                    {item.type === 'marked' ? (
                      <button
                        className="text-sm font-medium hover:underline truncate text-left"
                        onClick={() => {
                          console.log('Opening marked score in new tab:', item.computedTitle, item.file_url);
                          window.open(item.file_url, '_blank');
                        }}
                        title="Open marked score"
                      >
                        {item.computedTitle}
                      </button>
                    ) : (
                      <button
                        className="text-sm font-medium hover:underline truncate text-left"
                        onClick={() => {
                          console.log('Opening study score:', item.title, item.pdf_url);
                          onOpenScore(item.pdf_url, item.title, item.derived_sheet_music_id);
                        }}
                      >
                        {item.title}
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {item.type === 'study' && (
                      <Button size="icon" variant="ghost" onClick={() => setShareOpenId(shareOpenId === item.id ? null : item.id)}>
                        <Share2 className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() =>
                        item.type === 'study'
                          ? deleteStudy(item.id, item.pdf_url)
                          : deleteMarked(item.id, item.file_url)
                      }
                      disabled={deletingId === item.id}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {item.type === 'study' && shareOpenId === item.id && (
                  <div className="mt-2 flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Invite by email"
                      value={shareEmail}
                      onChange={(e) => setShareEmail(e.target.value)}
                      className="h-8"
                    />
                    <Button
                      size="sm"
                      onClick={async () => {
                        if (!shareEmail) return;
                        await shareStudyScore(item.id, shareEmail, 'editor');
                        setShareEmail('');
                        setShareOpenId(null);
                      }}
                    >
                      Share
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
