import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Music, 
  Youtube, 
  Save, 
  Loader2,
  Play,
  ExternalLink
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { extractYouTubeVideoId } from '@/utils/youtubeUtils';

// Order of Mass liturgical moments
const LITURGICAL_MOMENTS = [
  { order: 1, name: 'Prelude', required: false },
  { order: 2, name: 'Entrance Hymn', required: true },
  { order: 3, name: 'Kyrie', required: true },
  { order: 4, name: 'Gloria', required: false },
  { order: 5, name: 'Responsorial Psalm', required: true },
  { order: 6, name: 'Gospel Acclamation', required: true },
  { order: 7, name: 'Preparation of the Gifts (Offertory)', required: true },
  { order: 8, name: 'Eucharistic Acclamations', required: true },
  { order: 9, name: 'Communion Song', required: true },
  { order: 10, name: 'Meditation / Reflection', required: false },
  { order: 11, name: 'Sending Forth / Recessional', required: true },
  { order: 12, name: 'Postlude', required: false },
];

export interface MusicSelection {
  id?: string;
  module_id: string;
  order_number: number;
  liturgical_moment: string;
  title: string;
  composer_source: string;
  music_key: string;
  ensemble: string;
  youtube_url: string;
  notes: string;
}

interface OrderOfMassMusicEditorProps {
  moduleId: string;
  isEditing: boolean;
  onSave?: () => void;
}

export const OrderOfMassMusicEditor: React.FC<OrderOfMassMusicEditorProps> = ({
  moduleId,
  isEditing,
  onSave
}) => {
  const [selections, setSelections] = useState<MusicSelection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [linkModal, setLinkModal] = useState<{ 
    open: boolean; 
    url: string; 
    title: string;
    type: 'youtube' | 'website';
    videoId?: string;
  }>({
    open: false,
    url: '',
    title: '',
    type: 'website'
  });

  useEffect(() => {
    fetchSelections();
  }, [moduleId]);

  const fetchSelections = async () => {
    setLoading(true);
    try {
      // Query the table directly with raw SQL-like approach since types aren't generated yet
      const { data, error } = await supabase
        .from('lh100_music_selections' as any)
        .select('*')
        .eq('module_id', moduleId)
        .order('order_number');

      if (error && !error.message.includes('does not exist')) throw error;

      const existingData = (data || []) as unknown as MusicSelection[];

      // Merge with default moments
      const merged = LITURGICAL_MOMENTS.map(moment => {
        const existing = existingData.find(s => s.order_number === moment.order);
        return existing || {
          module_id: moduleId,
          order_number: moment.order,
          liturgical_moment: moment.name,
          title: '',
          composer_source: '',
          music_key: '',
          ensemble: '',
          youtube_url: '',
          notes: ''
        };
      });

      setSelections(merged);
    } catch (error) {
      console.error('Error fetching music selections:', error);
      // Initialize with empty selections
      setSelections(LITURGICAL_MOMENTS.map(moment => ({
        module_id: moduleId,
        order_number: moment.order,
        liturgical_moment: moment.name,
        title: '',
        composer_source: '',
        music_key: '',
        ensemble: '',
        youtube_url: '',
        notes: ''
      })));
    } finally {
      setLoading(false);
    }
  };

  const updateSelection = (orderNumber: number, field: keyof MusicSelection, value: string) => {
    setSelections(prev => prev.map(s => 
      s.order_number === orderNumber ? { ...s, [field]: value } : s
    ));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Filter out empty selections (no title)
      const toSave = selections.filter(s => s.title.trim());

      // Delete existing selections for this module
      await supabase
        .from('lh100_music_selections' as any)
        .delete()
        .eq('module_id', moduleId);

      if (toSave.length > 0) {
        const { error } = await supabase
          .from('lh100_music_selections' as any)
          .insert(toSave.map(s => ({
            module_id: s.module_id,
            order_number: s.order_number,
            liturgical_moment: s.liturgical_moment,
            title: s.title,
            composer_source: s.composer_source,
            music_key: s.music_key,
            ensemble: s.ensemble,
            youtube_url: s.youtube_url,
            notes: s.notes
          })));

        if (error) throw error;
      }

      toast.success('Music selections saved');
      onSave?.();
    } catch (error) {
      console.error('Error saving music selections:', error);
      toast.error('Failed to save music selections');
    } finally {
      setSaving(false);
    }
  };

  const getLinkInfo = (url: string) => {
    if (!url || !url.trim()) return null;
    
    const videoId = extractYouTubeVideoId(url);
    if (videoId) {
      return {
        type: 'youtube' as const,
        videoId,
        url,
        label: 'Watch'
      };
    }
    
    // Handle other URLs (USCCB, etc.)
    return {
      type: 'website' as const,
      url,
      label: 'Open'
    };
  };

  const openLinkModal = (url: string, title: string, type: 'youtube' | 'website', videoId?: string) => {
    setLinkModal({ open: true, url, title, type, videoId });
  };

  const closeLinkModal = () => {
    setLinkModal({ open: false, url: '', title: '', type: 'website' });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Music className="h-4 w-4 text-primary" />
            Order of Mass – Music Selections
          </CardTitle>
          {isEditing && (
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Save className="h-4 w-4 mr-1" />
              )}
              Save Music
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-12 text-center">#</TableHead>
                <TableHead className="min-w-[180px]">Liturgical Moment</TableHead>
                <TableHead className="min-w-[200px]">Title</TableHead>
                <TableHead className="min-w-[200px]">Link</TableHead>
                <TableHead className="min-w-[200px]">Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {selections.map((selection) => {
                const moment = LITURGICAL_MOMENTS.find(m => m.order === selection.order_number);
                const linkInfo = getLinkInfo(selection.youtube_url);
                
                return (
                  <TableRow key={selection.order_number} className="group">
                    <TableCell className="text-center font-medium text-muted-foreground">
                      {selection.order_number}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{selection.liturgical_moment}</span>
                        {moment?.required && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0">
                            Required
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          value={selection.title}
                          onChange={(e) => updateSelection(selection.order_number, 'title', e.target.value)}
                          placeholder="Song title..."
                          className="h-8 text-sm"
                        />
                      ) : (
                        <span className="text-sm">{selection.title || '—'}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          value={selection.youtube_url}
                          onChange={(e) => updateSelection(selection.order_number, 'youtube_url', e.target.value)}
                          placeholder="URL (YouTube, USCCB, etc.)..."
                          className="h-8 text-sm"
                        />
                      ) : linkInfo ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openLinkModal(
                            linkInfo.url, 
                            selection.title || selection.liturgical_moment,
                            linkInfo.type,
                            linkInfo.type === 'youtube' ? linkInfo.videoId : undefined
                          )}
                          className="flex items-center gap-1 text-primary hover:text-primary h-7 px-2"
                        >
                          {linkInfo.type === 'youtube' ? (
                            <Play className="h-3 w-3 fill-current" />
                          ) : (
                            <ExternalLink className="h-3 w-3" />
                          )}
                          <span className="text-sm">{linkInfo.label}</span>
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          value={selection.notes}
                          onChange={(e) => updateSelection(selection.order_number, 'notes', e.target.value)}
                          placeholder="Notes..."
                          className="h-8 text-sm"
                        />
                      ) : (
                        <span className="text-sm text-muted-foreground">{selection.notes || '—'}</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Link Modal - YouTube or Website */}
      <Dialog open={linkModal.open} onOpenChange={(open) => !open && closeLinkModal()}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden max-h-[90vh]">
          <DialogHeader className="p-4 pb-2">
            <DialogTitle className="flex items-center gap-2 text-base">
              {linkModal.type === 'youtube' ? (
                <Youtube className="h-5 w-5 text-red-500" />
              ) : (
                <ExternalLink className="h-5 w-5 text-primary" />
              )}
              {linkModal.title}
            </DialogTitle>
          </DialogHeader>
          <div className={linkModal.type === 'youtube' ? 'aspect-video w-full' : 'h-[70vh] w-full'}>
            {linkModal.type === 'youtube' && linkModal.videoId ? (
              <iframe
                src={`https://www.youtube.com/embed/${linkModal.videoId}?autoplay=1`}
                title={linkModal.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            ) : linkModal.url ? (
              <iframe
                src={linkModal.url}
                title={linkModal.title}
                className="w-full h-full border-0"
                sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
