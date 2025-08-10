import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageComposer } from './MessageComposer';
import { RecipientSelector } from './RecipientSelector';
import { ChannelSelector } from './ChannelSelector';
import { SendControls } from './SendControls';
import { NotificationSenderPanel } from './NotificationSenderPanel';
import { useCommunication } from '@/hooks/useCommunication';
import { RecipientGroup } from '@/types/communication';
import { ArrowLeft, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export const CommunicationHub = () => {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedGroups, setSelectedGroups] = useState<RecipientGroup[]>([]);
  const [selectedChannels, setSelectedChannels] = useState<string[]>(['email']);
  const [recipientCount, setRecipientCount] = useState(0);
  const [scheduledFor, setScheduledFor] = useState<Date | undefined>();

  const {
    isLoading,
    templates,
    fetchTemplates,
    getRecipientCount,
    sendCommunication,
    saveDraft,
  } = useCommunication();

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  useEffect(() => {
    if (selectedGroups.length > 0) {
      getRecipientCount(selectedGroups).then(setRecipientCount);
    } else {
      setRecipientCount(0);
    }
  }, [selectedGroups, getRecipientCount]);

  const handleGroupToggle = (group: RecipientGroup) => {
    setSelectedGroups(prev => {
      const exists = prev.find(g => g.id === group.id);
      if (exists) {
        return prev.filter(g => g.id !== group.id);
      } else {
        return [...prev, group];
      }
    });
  };

  const handleChannelToggle = (channelId: string) => {
    setSelectedChannels(prev => {
      if (prev.includes(channelId)) {
        return prev.filter(id => id !== channelId);
      } else {
        return [...prev, channelId];
      }
    });
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setTitle(template.subject);
      setContent(template.content);
    }
  };

  const handleSend = async () => {
    if (!title || !content || selectedGroups.length === 0 || selectedChannels.length === 0) {
      return;
    }

    try {
      await sendCommunication(title, content, selectedGroups, selectedChannels, scheduledFor);
      
      // Reset form
      setTitle('');
      setContent('');
      setSelectedGroups([]);
      setSelectedChannels(['email']);
      setScheduledFor(undefined);
      
      // Navigate back to dashboard
      navigate('/dashboard');
    } catch (error) {
      console.error('Failed to send communication:', error);
    }
  };

  const handleSaveDraft = async () => {
    if (!title || !content) {
      return;
    }

    try {
      await saveDraft(title, content, selectedGroups, selectedChannels);
      navigate('/dashboard');
    } catch (error) {
      console.error('Failed to save draft:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard')}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <div className="flex items-center gap-2">
                <MessageCircle className="h-6 w-6 text-primary" />
                <h1 className="text-2xl font-bold">Communication Hub</h1>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              To Amaze and Inspire — Wellness, Notifications, Announcements
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <Tabs defaultValue="notifications" className="w-full">
          <div className="flex items-center justify-between mb-4">
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="wellness">Wellness</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
              <TabsTrigger value="announcements">Announcements</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="wellness" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle>Wellness Suite</CardTitle>
                <CardDescription>Voice care, wellness tracking, and resources</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => navigate('/wellness')}>Open Wellness Suite</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="mt-0">
            <NotificationSenderPanel />
          </TabsContent>

          <TabsContent value="announcements" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle>Announcements</CardTitle>
                <CardDescription>Create and view club announcements</CardDescription>
              </CardHeader>
              <CardContent className="flex gap-2">
                <Button onClick={() => navigate('/announcements')}>View Announcements</Button>
                <Button variant="outline" onClick={() => navigate('/admin/announcements/new')}>Create Announcement</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};