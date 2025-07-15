import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Save, Send, Bell } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/hooks/useNotifications';
import { Database } from '@/integrations/supabase/types';

type Announcement = Database['public']['Tables']['gw_announcements']['Row'];
type AnnouncementInsert = Database['public']['Tables']['gw_announcements']['Insert'];

interface AnnouncementFormProps {
  mode: 'create' | 'edit';
}

const AnnouncementForm: React.FC<AnnouncementFormProps> = ({ mode }) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const { sendNotification } = useNotifications();
  const [loading, setLoading] = useState(false);
  const [announcement, setAnnouncement] = useState<Partial<AnnouncementInsert>>({
    title: '',
    content: '',
    announcement_type: 'general',
    target_audience: 'all',
    is_featured: false,
    publish_date: new Date().toISOString(),
    expire_date: null,
  });

  useEffect(() => {
    if (mode === 'edit' && id) {
      loadAnnouncement();
    }
  }, [mode, id]);

  const loadAnnouncement = async () => {
    if (!id) return;
    
    try {
      const { data, error } = await supabase
        .from('gw_announcements')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      
      setAnnouncement({
        ...data,
        publish_date: data.publish_date || new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error loading announcement:', error);
      toast.error('Failed to load announcement');
    }
  };

  const handleSubmit = async (action: 'save' | 'publish') => {
    if (!announcement.title?.trim() || !announcement.content?.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      
      const announcementData: AnnouncementInsert = {
        ...announcement,
        title: announcement.title!,
        content: announcement.content!,
        created_by: user?.id || null,
        publish_date: action === 'publish' ? new Date().toISOString() : announcement.publish_date,
      };

      let result;
      if (mode === 'create') {
        result = await supabase
          .from('gw_announcements')
          .insert(announcementData)
          .select()
          .single();
      } else {
        result = await supabase
          .from('gw_announcements')
          .update(announcementData)
          .eq('id', id!)
          .select()
          .single();
      }

      if (result.error) throw result.error;

      // Send notifications if publishing
      if (action === 'publish') {
        await sendNotificationsToUsers(result.data);
      }

      toast.success(`Announcement ${action === 'publish' ? 'published' : 'saved'} successfully`);
      navigate('/announcements');
    } catch (error) {
      console.error('Error saving announcement:', error);
      toast.error('Failed to save announcement');
    } finally {
      setLoading(false);
    }
  };

  const sendNotificationsToUsers = async (announcementData: Announcement) => {
    try {
      // Get all users to notify based on target audience
      const { data: profiles } = await supabase
        .from('gw_profiles')
        .select('user_id, email');

      if (!profiles) return;

      // Send notifications to all users
      for (const profile of profiles) {
        if (profile.user_id) {
          await sendNotification(
            profile.user_id,
            `New Announcement: ${announcementData.title}`,
            announcementData.content.substring(0, 200) + (announcementData.content.length > 200 ? '...' : ''),
            {
              type: announcementData.announcement_type || 'general',
              category: 'announcement',
              actionUrl: '/announcements',
              actionLabel: 'View Announcements',
              priority: announcementData.is_featured ? 1 : 0,
              sendEmail: true,
              sendSms: announcementData.announcement_type === 'urgent',
            }
          );
        }
      }

      toast.success('Notifications sent to all users');
    } catch (error) {
      console.error('Error sending notifications:', error);
      toast.error('Announcement saved but failed to send notifications');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-8">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/announcements')}
            className="hover:bg-white/20"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Announcements
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-white">
              {mode === 'create' ? 'Create Announcement' : 'Edit Announcement'}
            </h1>
            <p className="text-white/80">
              {mode === 'create' ? 'Create a new announcement for the community' : 'Edit the announcement details'}
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Announcement Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={announcement.title || ''}
                onChange={(e) => setAnnouncement(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter announcement title"
              />
            </div>

            {/* Content */}
            <div className="space-y-2">
              <Label htmlFor="content">Content *</Label>
              <Textarea
                id="content"
                value={announcement.content || ''}
                onChange={(e) => setAnnouncement(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Enter announcement content"
                rows={8}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Type */}
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select
                  value={announcement.announcement_type || 'general'}
                  onValueChange={(value) => setAnnouncement(prev => ({ ...prev, announcement_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="important">Important</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="event">Event</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Target Audience */}
              <div className="space-y-2">
                <Label htmlFor="audience">Target Audience</Label>
                <Select
                  value={announcement.target_audience || 'all'}
                  onValueChange={(value) => setAnnouncement(prev => ({ ...prev, target_audience: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Members</SelectItem>
                    <SelectItem value="members">Active Members</SelectItem>
                    <SelectItem value="admins">Administrators</SelectItem>
                    <SelectItem value="officers">Officers</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Publish Date */}
              <div className="space-y-2">
                <Label htmlFor="publishDate">Publish Date</Label>
                <Input
                  id="publishDate"
                  type="datetime-local"
                  value={announcement.publish_date ? new Date(announcement.publish_date).toISOString().slice(0, 16) : ''}
                  onChange={(e) => setAnnouncement(prev => ({ 
                    ...prev, 
                    publish_date: e.target.value ? new Date(e.target.value).toISOString() : null 
                  }))}
                />
              </div>

              {/* Expire Date */}
              <div className="space-y-2">
                <Label htmlFor="expireDate">Expire Date (Optional)</Label>
                <Input
                  id="expireDate"
                  type="datetime-local"
                  value={announcement.expire_date ? new Date(announcement.expire_date).toISOString().slice(0, 16) : ''}
                  onChange={(e) => setAnnouncement(prev => ({ 
                    ...prev, 
                    expire_date: e.target.value ? new Date(e.target.value).toISOString() : null 
                  }))}
                />
              </div>
            </div>

            {/* Featured */}
            <div className="flex items-center space-x-2">
              <Switch
                id="featured"
                checked={announcement.is_featured || false}
                onCheckedChange={(checked) => setAnnouncement(prev => ({ ...prev, is_featured: checked }))}
              />
              <Label htmlFor="featured">Featured Announcement</Label>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-4 pt-6">
              <Button
                variant="outline"
                onClick={() => navigate('/announcements')}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleSubmit('save')}
                disabled={loading}
              >
                <Save className="h-4 w-4 mr-2" />
                Save Draft
              </Button>
              <Button
                onClick={() => handleSubmit('publish')}
                disabled={loading}
              >
                <Send className="h-4 w-4 mr-2" />
                {loading ? 'Publishing...' : 'Publish & Notify'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AnnouncementForm;