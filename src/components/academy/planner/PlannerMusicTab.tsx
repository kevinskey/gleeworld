import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Music, Save, Loader2, Play, ExternalLink, Edit2, X, Sparkles, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { extractYouTubeVideoId } from '@/utils/youtubeUtils';

interface PlannerMusicTabProps {
  weekId: string;
  isAdmin?: boolean;
  liturgicalData?: any;
  sundayTitle?: string;
  season?: string;
}

// Proper of the Mass - liturgical moments in order
const PROPER_OF_MASS = [
  { order: 1, name: 'Prelude', required: false },
  { order: 2, name: 'Entrance Hymn', required: true },
  { order: 3, name: 'Kyrie', required: true },
  { order: 4, name: 'Gloria', required: false },
  { order: 5, name: 'Responsorial Psalm', required: true },
  { order: 6, name: 'Gospel Acclamation', required: true },
  { order: 7, name: 'Offertory', required: true },
  { order: 8, name: 'Sanctus', required: true },
  { order: 9, name: 'Memorial Acclamation', required: true },
  { order: 10, name: 'Great Amen', required: true },
  { order: 11, name: 'Agnus Dei', required: true },
  { order: 12, name: 'Communion', required: true },
  { order: 13, name: 'Meditation/Song of Praise', required: false },
  { order: 14, name: 'Recessional', required: true },
  { order: 15, name: 'Postlude', required: false },
];

interface MusicEntry {
  id?: string;
  order_number: number;
  moment: string;
  title: string;
  hymn_number: string;
  youtube_url: string;
}

interface AISuggestion {
  moment: string;
  title: string;
  hymn_number?: string;
  reason: string;
}

export const PlannerMusicTab: React.FC<PlannerMusicTabProps> = ({ 
  weekId, 
  isAdmin = false,
  liturgicalData,
  sundayTitle,
  season 
}) => {
  const [entries, setEntries] = useState<MusicEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [linkModal, setLinkModal] = useState<{ open: boolean; url: string; title: string; videoId?: string }>({
    open: false, url: '', title: ''
  });

  useEffect(() => {
    fetchMusicPlan();
  }, [weekId]);

  const fetchMusicPlan = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('liturgical_music_plan')
        .select('*')
        .eq('week_id', weekId)
        .order('service_order');

      if (error) throw error;

      // Merge existing data with all moments
      const merged = PROPER_OF_MASS.map(moment => {
        const existing = data?.find(d => d.moment === moment.name || d.service_order === moment.order);
        return {
          id: existing?.id,
          order_number: moment.order,
          moment: moment.name,
          title: existing?.title || '',
          hymn_number: existing?.hymn_number || '',
          youtube_url: existing?.youtube_url || '',
        };
      });

      setEntries(merged);
    } catch (error) {
      console.error('Error fetching music plan:', error);
      // Initialize empty
      setEntries(PROPER_OF_MASS.map(m => ({
        order_number: m.order,
        moment: m.name,
        title: '',
        hymn_number: '',
        youtube_url: '',
      })));
    } finally {
      setLoading(false);
    }
  };

  const updateEntry = (orderNumber: number, field: keyof MusicEntry, value: string) => {
    setEntries(prev => prev.map(e =>
      e.order_number === orderNumber ? { ...e, [field]: value } : e
    ));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Delete existing entries for this week
      await supabase
        .from('liturgical_music_plan')
        .delete()
        .eq('week_id', weekId);

      // Insert entries that have content
      const toSave = entries.filter(e => e.title.trim() || e.hymn_number.trim());
      
      if (toSave.length > 0) {
        const { error } = await supabase
          .from('liturgical_music_plan')
          .insert(toSave.map(e => ({
            week_id: weekId,
            service_order: e.order_number,
            moment: e.moment,
            title: e.title,
            hymn_number: e.hymn_number,
            youtube_url: e.youtube_url,
            status: 'planned'
          })));

        if (error) throw error;
      }

      toast.success('Music plan saved');
      setIsEditing(false);
      fetchMusicPlan();
    } catch (error) {
      console.error('Error saving music plan:', error);
      toast.error('Failed to save music plan');
    } finally {
      setSaving(false);
    }
  };

  const openVideoModal = (url: string, title: string) => {
    const videoId = extractYouTubeVideoId(url);
    if (videoId) {
      setLinkModal({ open: true, url, title, videoId });
    } else if (url) {
      window.open(url, '_blank');
    }
  };

  const getAISuggestions = async () => {
    setAiLoading(true);
    setSuggestions([]);
    setShowSuggestions(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('suggest-liturgical-music', {
        body: {
          readings: liturgicalData?.readings,
          season: season || liturgicalData?.season,
          sundayTitle: sundayTitle || liturgicalData?.celebration || 'Sunday'
        }
      });

      if (error) throw error;

      if (data.suggestions) {
        setSuggestions(data.suggestions);
        toast.success('AI suggestions ready!');
      } else if (data.rawSuggestions) {
        toast.info('Received text suggestions - parsing not available');
      } else if (data.error) {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error getting AI suggestions:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to get AI suggestions');
      setShowSuggestions(false);
    } finally {
      setAiLoading(false);
    }
  };

  const applySuggestion = (suggestion: AISuggestion) => {
    // Find matching moment in entries
    const momentMap: Record<string, string[]> = {
      'Entrance Hymn': ['Entrance Hymn', 'Entrance/Opening'],
      'Responsorial Psalm': ['Responsorial Psalm'],
      'Gospel Acclamation': ['Gospel Acclamation'],
      'Offertory': ['Offertory'],
      'Communion': ['Communion'],
      'Recessional': ['Recessional'],
    };

    const matchingMoments = momentMap[suggestion.moment] || [suggestion.moment];
    const entry = entries.find(e => 
      matchingMoments.some(m => e.moment.toLowerCase().includes(m.toLowerCase()))
    );

    if (entry) {
      setEntries(prev => prev.map(e =>
        e.order_number === entry.order_number
          ? { ...e, title: suggestion.title, hymn_number: suggestion.hymn_number || '' }
          : e
      ));
      toast.success(`Applied "${suggestion.title}" to ${entry.moment}`);
    } else {
      toast.error(`Could not find matching moment for ${suggestion.moment}`);
    }
  };

  const hasAnyContent = entries.some(e => e.title.trim() || e.hymn_number.trim());

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2">Loading music plan...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Music className="h-5 w-5 text-primary" />
          Service Music Plan
        </h3>
        <div className="flex gap-2">
          {isAdmin && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={getAISuggestions}
              disabled={aiLoading}
            >
              {aiLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Sparkles className="h-4 w-4 mr-1" />
              )}
              AI Suggest
            </Button>
          )}
          {isAdmin && (
            <>
              {isEditing ? (
                <>
                  <Button variant="outline" size="sm" onClick={() => { setIsEditing(false); fetchMusicPlan(); }}>
                    <X className="h-4 w-4 mr-1" />
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                    Save
                  </Button>
                </>
              ) : (
                <Button size="sm" onClick={() => setIsEditing(true)}>
                  <Edit2 className="h-4 w-4 mr-1" />
                  Edit Plan
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* AI Suggestions Panel */}
      {showSuggestions && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                AI Music Suggestions
              </h4>
              <Button variant="ghost" size="sm" onClick={() => setShowSuggestions(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            {aiLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
                <span className="text-muted-foreground">Analyzing readings and generating suggestions...</span>
              </div>
            ) : suggestions.length > 0 ? (
              <div className="space-y-2">
                {suggestions.map((s, i) => (
                  <div key={i} className="flex items-start gap-3 p-2 rounded-lg bg-background hover:bg-muted/50 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">{s.moment}</Badge>
                        {s.hymn_number && (
                          <span className="text-xs font-mono text-muted-foreground">{s.hymn_number}</span>
                        )}
                      </div>
                      <p className="font-medium text-sm mt-1">{s.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{s.reason}</p>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => { applySuggestion(s); setIsEditing(true); }}
                      className="shrink-0"
                    >
                      <Check className="h-3 w-3 mr-1" />
                      Apply
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-4">
                No suggestions available. Try again.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-10 text-center">#</TableHead>
                  <TableHead className="min-w-[160px]">Moment</TableHead>
                  <TableHead className="min-w-[200px]">Title</TableHead>
                  <TableHead className="w-24">Hymn #</TableHead>
                  <TableHead className="min-w-[180px]">YouTube Link</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => {
                  const moment = PROPER_OF_MASS.find(m => m.order === entry.order_number);
                  const hasVideo = entry.youtube_url && extractYouTubeVideoId(entry.youtube_url);

                  return (
                    <TableRow key={entry.order_number} className={entry.title ? '' : 'opacity-60'}>
                      <TableCell className="text-center font-medium text-muted-foreground">
                        {entry.order_number}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{entry.moment}</span>
                          {moment?.required && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0">
                              Req
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            value={entry.title}
                            onChange={(e) => updateEntry(entry.order_number, 'title', e.target.value)}
                            placeholder="Song title..."
                            className="h-8 text-sm"
                          />
                        ) : (
                          <span className="text-sm">{entry.title || '—'}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            value={entry.hymn_number}
                            onChange={(e) => updateEntry(entry.order_number, 'hymn_number', e.target.value)}
                            placeholder="#123"
                            className="h-8 text-sm w-20"
                          />
                        ) : (
                          <span className="text-sm font-mono">{entry.hymn_number || '—'}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            value={entry.youtube_url}
                            onChange={(e) => updateEntry(entry.order_number, 'youtube_url', e.target.value)}
                            placeholder="https://youtube.com/..."
                            className="h-8 text-sm"
                          />
                        ) : hasVideo ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openVideoModal(entry.youtube_url, entry.title || entry.moment)}
                            className="flex items-center gap-1 text-primary hover:text-primary h-7 px-2"
                          >
                            <Play className="h-3 w-3 fill-current" />
                            <span className="text-sm">Watch</span>
                          </Button>
                        ) : entry.youtube_url ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(entry.youtube_url, '_blank')}
                            className="flex items-center gap-1 h-7 px-2"
                          >
                            <ExternalLink className="h-3 w-3" />
                            <span className="text-sm">Open</span>
                          </Button>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* YouTube Modal */}
      <Dialog open={linkModal.open} onOpenChange={(open) => !open && setLinkModal({ open: false, url: '', title: '' })}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-2">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Play className="h-5 w-5 text-red-500" />
              {linkModal.title}
            </DialogTitle>
          </DialogHeader>
          {linkModal.videoId && (
            <div className="aspect-video w-full">
              <iframe
                src={`https://www.youtube.com/embed/${linkModal.videoId}?autoplay=1`}
                title={linkModal.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
