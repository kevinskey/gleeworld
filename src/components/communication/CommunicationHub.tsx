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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
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
        <Accordion type="single" collapsible defaultValue="notifications" className="w-full">
          <AccordionItem value="wellness">
            <AccordionTrigger>Wellness</AccordionTrigger>
            <AccordionContent>
              <Card>
                <CardHeader>
                  <CardTitle>Wellness Suite</CardTitle>
                  <CardDescription>Voice care, wellness tracking, and resources</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={() => navigate('/wellness')}>Open Wellness Suite</Button>
                </CardContent>
              </Card>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="notifications">
            <AccordionTrigger>Notifications</AccordionTrigger>
            <AccordionContent>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Message Composition */}
                <div className="lg:col-span-2 space-y-6">
                  <MessageComposer
                    title={title}
                    content={content}
                    onTitleChange={setTitle}
                    onContentChange={setContent}
                    templates={templates}
                    onTemplateSelect={handleTemplateSelect}
                  />
                  <RecipientSelector
                    selectedGroups={selectedGroups}
                    onGroupToggle={handleGroupToggle}
                    recipientCount={recipientCount}
                  />
                </div>

                {/* Right Column - Delivery & Controls */}
                <div className="space-y-6">
                  <ChannelSelector
                    selectedChannels={selectedChannels}
                    onChannelToggle={handleChannelToggle}
                    recipientCount={recipientCount}
                  />
                  <SendControls
                    title={title}
                    content={content}
                    selectedGroups={selectedGroups}
                    selectedChannels={selectedChannels}
                    recipientCount={recipientCount}
                    isLoading={isLoading}
                    scheduledFor={scheduledFor}
                    onScheduledForChange={setScheduledFor}
                    onSend={handleSend}
                    onSaveDraft={handleSaveDraft}
                  />
                </div>
              </div>

              {/* Single-user quick sender */}
              <div className="mt-10">
                <NotificationSenderPanel />
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="announcements">
            <AccordionTrigger>Announcements</AccordionTrigger>
            <AccordionContent>
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
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
};