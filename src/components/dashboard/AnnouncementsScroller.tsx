import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Megaphone, Plus, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useUserRole } from '@/hooks/useUserRole';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface Announcement {
  id: string;
  title: string;
  content: string;
  announcement_type: string | null;
  is_featured: boolean | null;
  created_at: string;
  created_by: string | null;
  creator_name?: string;
}

export const AnnouncementsScroller = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { profile } = useUserRole();

  const canCreate = profile?.is_admin || profile?.is_super_admin || profile?.is_exec_board;

  useEffect(() => {
    fetchAnnouncements();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel('announcements-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'gw_announcements' 
      }, () => {
        fetchAnnouncements();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('gw_announcements')
        .select(`
          id,
          title,
          content,
          announcement_type,
          is_featured,
          created_at,
          created_by
        `)
        .or(`expire_date.is.null,expire_date.gte.${now}`)
        .or(`publish_date.is.null,publish_date.lte.${now}`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Fetch creator names
      const creatorIds = [...new Set((data || []).map(a => a.created_by).filter(Boolean))];
      let creatorMap: Record<string, string> = {};
      
      if (creatorIds.length > 0) {
        const { data: profiles } = await supabase
          .from('gw_profiles')
          .select('user_id, full_name')
          .in('user_id', creatorIds);
        
        if (profiles) {
          creatorMap = Object.fromEntries(profiles.map(p => [p.user_id, p.full_name || 'Unknown']));
        }
      }

      setAnnouncements((data || []).map(a => ({
        ...a,
        creator_name: a.created_by ? creatorMap[a.created_by] || 'Admin' : 'Admin'
      })));
    } catch (error) {
      console.error('Error fetching announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newTitle.trim() || !newContent.trim()) {
      toast.error('Please fill in both title and content');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('gw_announcements')
        .insert({
          title: newTitle.trim(),
          content: newContent.trim(),
          created_by: profile?.user_id,
          announcement_type: 'general',
          target_audience: 'all'
        });

      if (error) throw error;

      toast.success('Announcement created!');
      setNewTitle('');
      setNewContent('');
      setIsCreateOpen(false);
    } catch (error) {
      console.error('Error creating announcement:', error);
      toast.error('Failed to create announcement');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full bg-background/95 backdrop-blur-sm rounded-xl border p-3 animate-pulse">
        <div className="h-6 bg-muted rounded w-1/2 mb-3"></div>
        <div className="space-y-2">
          <div className="h-16 bg-muted rounded"></div>
          <div className="h-16 bg-muted rounded"></div>
          <div className="h-16 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col rounded-xl border-2 border-slate-400/50 dark:border-slate-500 bg-gradient-to-b from-slate-200 via-slate-100 to-slate-300 dark:from-slate-700 dark:via-slate-600 dark:to-slate-800 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-slate-400/30 dark:border-slate-500/30">
        <div className="flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">Announcements</h3>
        </div>
        {canCreate && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Announcement</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Input
                    placeholder="Announcement title..."
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                  />
                </div>
                <div>
                  <Textarea
                    placeholder="Announcement content..."
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    rows={4}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreate} disabled={isSubmitting}>
                    {isSubmitting ? 'Creating...' : 'Create'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Scrollable content */}
      <ScrollArea className="flex-1 p-2">
        {announcements.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No announcements yet
          </div>
        ) : (
          <div className="space-y-2">
            {announcements.map((announcement) => (
              <div
                key={announcement.id}
                className={`p-3 rounded-lg border transition-colors ${
                  announcement.is_featured
                    ? 'bg-primary/10 border-primary/30'
                    : 'bg-background/60 border-border/50 hover:bg-background/80'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-medium text-sm line-clamp-1">{announcement.title}</h4>
                  {announcement.is_featured && (
                    <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded shrink-0">
                      Featured
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {announcement.content}
                </p>
                <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                  <span>{announcement.creator_name}</span>
                  <span>{formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true })}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};
