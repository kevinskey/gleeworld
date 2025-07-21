import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { FileText, Send, Calendar, Users, Eye, Edit, Trash2, Plus, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Newsletter {
  id: string;
  title: string;
  content: string;
  target_audience: string;
  status: string;
  scheduled_date?: string;
  sent_date?: string;
  created_at: string;
  created_by: string;
  recipient_count?: number;
}

const NEWSLETTER_AUDIENCES = [
  { value: 'alumni', label: 'Alumni Network' },
  { value: 'executive_board', label: 'Executive Board' },
  { value: 'current_members', label: 'Current Members' },
  { value: 'all_members', label: 'All Members' },
  { value: 'donors_supporters', label: 'Donors & Supporters' },
  { value: 'custom', label: 'Custom List' },
];

export const NewsletterManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingNewsletter, setEditingNewsletter] = useState<Newsletter | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    target_audience: '',
    status: 'draft',
    scheduled_date: '',
    include_events: true,
    include_updates: true,
    include_achievements: true,
  });

  useEffect(() => {
    loadNewsletters();
  }, []);

  const loadNewsletters = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('gw_newsletters')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNewsletters(data || []);
    } catch (error) {
      console.error('Error loading newsletters:', error);
      toast({
        title: "Error",
        description: "Failed to load newsletters",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateNewsletterContent = () => {
    let content = `Dear Members,\n\nWelcome to the ${formData.title}!\n\n`;

    if (formData.include_updates) {
      content += `## Recent Updates\n\n- Major announcements and news from the Glee Club\n- Upcoming events and performances\n- Important deadlines and reminders\n\n`;
    }

    if (formData.include_achievements) {
      content += `## Member Achievements\n\n- Recognition of outstanding performances\n- Academic and professional accomplishments\n- Community service highlights\n\n`;
    }

    if (formData.include_events) {
      content += `## Upcoming Events\n\n- Performance dates and venues\n- Rehearsal schedules\n- Special events and celebrations\n\n`;
    }

    content += `Thank you for being part of our musical family!\n\nBest regards,\nSpelman College Glee Club`;

    return content;
  };

  const handleCreateNewsletter = async () => {
    if (!formData.title.trim() || !formData.target_audience) {
      toast({
        title: "Validation Error",
        description: "Please fill in the title and select target audience",
        variant: "destructive",
      });
      return;
    }

    const content = formData.content || generateNewsletterContent();

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('gw_newsletters')
        .insert([{
          title: formData.title,
          content: content,
          target_audience: formData.target_audience,
          status: formData.status,
          scheduled_date: formData.scheduled_date || null,
          created_by: user?.id,
        }])
        .select()
        .single();

      if (error) throw error;

      // If status is 'sent', actually send the newsletter
      if (formData.status === 'sent') {
        await sendNewsletter(data.id);
      }

      toast({
        title: "Newsletter Created",
        description: formData.status === 'sent' ? "Newsletter created and sent successfully" : "Newsletter saved as draft",
      });

      resetForm();
      loadNewsletters();

    } catch (error) {
      console.error('Error creating newsletter:', error);
      toast({
        title: "Error",
        description: "Failed to create newsletter",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const sendNewsletter = async (newsletterId: string) => {
    try {
      const { error } = await supabase.functions.invoke('send-newsletter', {
        body: {
          newsletterId: newsletterId,
          sentBy: user?.id,
        }
      });

      if (error) throw error;

      // Update newsletter status
      await supabase
        .from('gw_newsletters')
        .update({ 
          status: 'sent', 
          sent_date: new Date().toISOString() 
        })
        .eq('id', newsletterId);

      loadNewsletters();

    } catch (error) {
      console.error('Error sending newsletter:', error);
      throw error;
    }
  };

  const handleSendNewsletter = async (newsletter: Newsletter) => {
    setLoading(true);
    try {
      await sendNewsletter(newsletter.id);
      toast({
        title: "Newsletter Sent",
        description: "Newsletter has been sent to all recipients",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send newsletter",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      target_audience: '',
      status: 'draft',
      scheduled_date: '',
      include_events: true,
      include_updates: true,
      include_achievements: true,
    });
    setShowCreateForm(false);
    setEditingNewsletter(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return 'bg-green-100 text-green-800';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Newsletter Manager</h2>
          <p className="text-muted-foreground">
            Create and send newsletters to alumni and executive board members
          </p>
        </div>
        <Button 
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          New Newsletter
        </Button>
      </div>

      {/* Create/Edit Form */}
      {(showCreateForm || editingNewsletter) && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingNewsletter ? 'Edit Newsletter' : 'Create New Newsletter'}
            </CardTitle>
            <CardDescription>
              Design and distribute newsletters to your target audience
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="newsletter-title">Newsletter Title</Label>
                <Input
                  id="newsletter-title"
                  placeholder="e.g., Monthly Newsletter - March 2024"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="audience">Target Audience</Label>
                <Select value={formData.target_audience} onValueChange={(value) => setFormData(prev => ({ ...prev, target_audience: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select audience" />
                  </SelectTrigger>
                  <SelectContent>
                    {NEWSLETTER_AUDIENCES.map((audience) => (
                      <SelectItem key={audience.value} value={audience.value}>
                        {audience.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Save as Draft</SelectItem>
                    <SelectItem value="scheduled">Schedule for Later</SelectItem>
                    <SelectItem value="sent">Send Immediately</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.status === 'scheduled' && (
                <div>
                  <Label htmlFor="schedule-date">Schedule Date</Label>
                  <Input
                    id="schedule-date"
                    type="datetime-local"
                    value={formData.scheduled_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, scheduled_date: e.target.value }))}
                  />
                </div>
              )}
            </div>

            {/* Content Sections */}
            <div>
              <Label className="text-base font-medium">Include Sections</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-updates"
                    checked={formData.include_updates}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, include_updates: !!checked }))}
                  />
                  <Label htmlFor="include-updates">Recent Updates</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-achievements"
                    checked={formData.include_achievements}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, include_achievements: !!checked }))}
                  />
                  <Label htmlFor="include-achievements">Member Achievements</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-events"
                    checked={formData.include_events}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, include_events: !!checked }))}
                  />
                  <Label htmlFor="include-events">Upcoming Events</Label>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="newsletter-content">Content</Label>
              <Textarea
                id="newsletter-content"
                placeholder="Enter newsletter content or leave blank to auto-generate based on selected sections"
                className="min-h-[300px]"
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Leave blank to auto-generate content based on selected sections
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
              <Button onClick={handleCreateNewsletter} disabled={loading} className="flex items-center gap-2">
                <Save className="h-4 w-4" />
                {loading ? 'Saving...' : editingNewsletter ? 'Update Newsletter' : 'Create Newsletter'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Newsletters List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Newsletter History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading && newsletters.length === 0 ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Loading newsletters...</p>
            </div>
          ) : newsletters.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No newsletters created yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {newsletters.map((newsletter) => (
                <div key={newsletter.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h3 className="font-semibold">{newsletter.title}</h3>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(newsletter.status)}>
                          {newsletter.status.toUpperCase()}
                        </Badge>
                        <Badge variant="outline">
                          {NEWSLETTER_AUDIENCES.find(a => a.value === newsletter.target_audience)?.label}
                        </Badge>
                        {newsletter.recipient_count && (
                          <Badge variant="outline">
                            {newsletter.recipient_count} recipients
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {newsletter.sent_date ? (
                        <div>Sent: {new Date(newsletter.sent_date).toLocaleDateString()}</div>
                      ) : newsletter.scheduled_date ? (
                        <div>Scheduled: {new Date(newsletter.scheduled_date).toLocaleDateString()}</div>
                      ) : (
                        <div>Created: {new Date(newsletter.created_at).toLocaleDateString()}</div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      Preview
                    </Button>
                    {newsletter.status === 'draft' && (
                      <>
                        <Button variant="outline" size="sm" className="flex items-center gap-1">
                          <Edit className="h-3 w-3" />
                          Edit
                        </Button>
                        <Button 
                          variant="default" 
                          size="sm" 
                          className="flex items-center gap-1"
                          onClick={() => handleSendNewsletter(newsletter)}
                          disabled={loading}
                        >
                          <Send className="h-3 w-3" />
                          Send Now
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};