import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Megaphone, 
  Send, 
  Pin, 
  Clock, 
  Edit2, 
  Trash2, 
  Plus,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Announcement {
  id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

interface CourseAnnouncementsManagerProps {
  courseId: string;
}

export const CourseAnnouncementsManager: React.FC<CourseAnnouncementsManagerProps> = ({ courseId }) => {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (courseId) {
      loadAnnouncements();
    }
  }, [courseId]);

  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('course_announcements')
        .select('*')
        .eq('course_id', courseId)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (error) {
      console.error('Error loading announcements:', error);
      toast.error('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error('Please fill in both title and content');
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        // Update existing announcement
        const { error } = await supabase
          .from('course_announcements')
          .update({
            title: title.trim(),
            content: content.trim(),
            is_pinned: isPinned,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingId);

        if (error) throw error;
        toast.success('Announcement updated successfully');
      } else {
        // Create new announcement
        const { error } = await supabase
          .from('course_announcements')
          .insert({
            course_id: courseId,
            title: title.trim(),
            content: content.trim(),
            is_pinned: isPinned,
            created_by: user?.id
          });

        if (error) throw error;
        toast.success('Announcement posted successfully');
      }

      // Reset form and reload
      resetForm();
      loadAnnouncements();
    } catch (error) {
      console.error('Error saving announcement:', error);
      toast.error('Failed to save announcement');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (announcement: Announcement) => {
    setEditingId(announcement.id);
    setTitle(announcement.title);
    setContent(announcement.content);
    setIsPinned(announcement.is_pinned);
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase
        .from('course_announcements')
        .delete()
        .eq('id', deleteId);

      if (error) throw error;
      toast.success('Announcement deleted');
      loadAnnouncements();
    } catch (error) {
      console.error('Error deleting announcement:', error);
      toast.error('Failed to delete announcement');
    } finally {
      setDeleteId(null);
    }
  };

  const togglePin = async (id: string, currentPinned: boolean) => {
    try {
      const { error } = await supabase
        .from('course_announcements')
        .update({ is_pinned: !currentPinned })
        .eq('id', id);

      if (error) throw error;
      toast.success(currentPinned ? 'Announcement unpinned' : 'Announcement pinned');
      loadAnnouncements();
    } catch (error) {
      console.error('Error toggling pin:', error);
      toast.error('Failed to update announcement');
    }
  };

  const resetForm = () => {
    setTitle('');
    setContent('');
    setIsPinned(false);
    setEditingId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Megaphone className="h-8 w-8 animate-pulse mx-auto mb-2" style={{ color: '#64748B' }} />
          <p style={{ color: '#475569' }}>Loading announcements...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Create/Edit Announcement */}
      <Card className="bg-white border border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            {editingId ? <Edit2 className="h-5 w-5 text-primary" /> : <Plus className="h-5 w-5 text-primary" />}
            {editingId ? 'Edit Announcement' : 'New Announcement'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title" className="text-sm font-medium mb-2 block">Title</Label>
            <Input
              id="title"
              placeholder="Announcement title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="content" className="text-sm font-medium mb-2 block">Content</Label>
            <Textarea
              id="content"
              placeholder="Write your announcement here..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="pinned"
              checked={isPinned}
              onCheckedChange={setIsPinned}
            />
            <Label htmlFor="pinned" className="flex items-center gap-2 cursor-pointer">
              <Pin className="h-4 w-4" />
              Pin to top
            </Label>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={handleSubmit} 
              disabled={saving}
              className="flex-1"
            >
              <Send className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : editingId ? 'Update Announcement' : 'Post Announcement'}
            </Button>
            {editingId && (
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            )}
          </div>

          <div className="text-xs flex items-start gap-2 p-3 bg-muted/50 rounded-lg" style={{ color: '#64748B' }}>
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <p>Announcements will appear on the student's Announcements tab for this course.</p>
          </div>
        </CardContent>
      </Card>

      {/* Announcements List */}
      <Card className="bg-white border border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Megaphone className="h-5 w-5 text-primary" />
            Posted Announcements ({announcements.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            {announcements.length === 0 ? (
              <div className="text-center py-8">
                <Megaphone className="h-16 w-16 mx-auto mb-4" style={{ color: '#94A3B8' }} />
                <p style={{ color: '#0F172A' }}>No announcements yet</p>
                <p className="text-sm" style={{ color: '#475569' }}>Create your first announcement to notify students</p>
              </div>
            ) : (
              <div className="space-y-4">
                {announcements.map((announcement) => (
                  <div key={announcement.id} className="border border-border/60 rounded-lg p-4 bg-white shadow-sm">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-medium text-foreground truncate">{announcement.title}</h4>
                          {announcement.is_pinned && (
                            <Badge variant="secondary" className="gap-1 text-xs">
                              <Pin className="h-3 w-3" />
                              Pinned
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-xs mt-1" style={{ color: '#64748B' }}>
                          <Clock className="h-3 w-3" />
                          {format(new Date(announcement.created_at), 'MMM d, yyyy h:mm a')}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => togglePin(announcement.id, announcement.is_pinned)}
                          title={announcement.is_pinned ? 'Unpin' : 'Pin'}
                        >
                          <Pin className={`h-4 w-4 ${announcement.is_pinned ? 'text-primary' : ''}`} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEdit(announcement)}
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(announcement.id)}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm line-clamp-3 whitespace-pre-wrap" style={{ color: '#475569' }}>
                      {announcement.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Announcement</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this announcement? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
