import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCommunication } from '@/hooks/useCommunication';
import { 
  RecipientGroup, 
  RECIPIENT_GROUPS, 
  COMMUNICATION_CHANNELS,
  MessageTemplate 
} from '@/types/communication';
import { Send, Save, Clock, Users, MessageSquare } from 'lucide-react';

export const UnifiedCommunicationForm = () => {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedGroups, setSelectedGroups] = useState<RecipientGroup[]>([]);
  const [selectedChannels, setSelectedChannels] = useState<string[]>(['email']);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
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
      setSelectedTemplate(templateId);
    }
  };

  const handleSend = async () => {
    console.log('Schedule message button clicked:', {
      title,
      content: content ? 'has content' : 'empty',
      selectedGroups: selectedGroups.length,
      selectedChannels: selectedChannels.length,
      scheduledFor,
      isLoading
    });
    
    if (!title || !content || selectedGroups.length === 0 || selectedChannels.length === 0) {
      console.log('Form validation failed - missing required fields');
      return;
    }

    await sendCommunication(title, content, selectedGroups, selectedChannels, scheduledFor);
    
    // Reset form
    setTitle('');
    setContent('');
    setSelectedGroups([]);
    setSelectedChannels(['email']);
    setScheduledFor(undefined);
    setSelectedTemplate('');
    
    // Navigate back to dashboard after successful send
    navigate('/dashboard');
  };

  const handleSaveDraft = async () => {
    if (!title || !content) {
      console.log('Cannot save draft - missing title or content');
      return;
    }

    await saveDraft(title, content, selectedGroups, selectedChannels, selectedTemplate || undefined);
    
    // Navigate back to dashboard after saving draft
    navigate('/dashboard');
  };

  const groupedRecipients = RECIPIENT_GROUPS.reduce((acc, group) => {
    if (!acc[group.type]) {
      acc[group.type] = [];
    }
    acc[group.type].push(group);
    return acc;
  }, {} as Record<string, RecipientGroup[]>);

  const getGroupTypeLabel = (type: string) => {
    const labels = {
      'role': 'Administrative Roles',
      'voice_part': 'Voice Parts',
      'academic_year': 'Academic Standing',
      'special': 'Special Groups'
    };
    return labels[type as keyof typeof labels] || type;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Unified Communication Center
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Template Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Message Template (Optional)</label>
            <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Select a template to start with" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name} ({template.category})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Message Details */}
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Subject/Title</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter message subject"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Message Content</label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Enter your message content..."
                rows={6}
              />
            </div>
          </div>

          {/* Recipient Groups */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Recipients</label>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="text-sm text-muted-foreground">
                  {recipientCount} recipient{recipientCount !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {Object.entries(groupedRecipients).map(([type, groups]) => (
              <div key={type} className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">
                  {getGroupTypeLabel(type)}
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {groups.map((group) => (
                    <div key={group.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={group.id}
                        checked={selectedGroups.some(g => g.id === group.id)}
                        onCheckedChange={() => handleGroupToggle(group)}
                      />
                      <label
                        htmlFor={group.id}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {group.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {selectedGroups.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selectedGroups.map((group) => (
                  <Badge
                    key={group.id}
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() => handleGroupToggle(group)}
                  >
                    {group.label} ×
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Communication Channels */}
          <div className="space-y-4">
            <label className="text-sm font-medium">Delivery Channels</label>
            <div className="grid grid-cols-2 gap-4">
              {COMMUNICATION_CHANNELS.map((channel) => (
                <div key={channel.id} className="flex items-start space-x-2">
                  <Checkbox
                    id={channel.id}
                    checked={selectedChannels.includes(channel.id)}
                    onCheckedChange={() => handleChannelToggle(channel.id)}
                    disabled={!channel.enabled}
                  />
                  <div className="space-y-1">
                    <label
                      htmlFor={channel.id}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {channel.label}
                    </label>
                    <p className="text-xs text-muted-foreground">
                      {channel.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Scheduling */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Schedule (Optional)</label>
            <Input
              type="datetime-local"
              value={scheduledFor ? scheduledFor.toISOString().slice(0, 16) : ''}
              onChange={(e) => setScheduledFor(e.target.value ? new Date(e.target.value) : undefined)}
            />
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              onClick={handleSend}
              disabled={!title || !content || selectedGroups.length === 0 || selectedChannels.length === 0 || isLoading}
              className="flex items-center gap-2"
            >
              {scheduledFor ? (
                <>
                  <Clock className="h-4 w-4" />
                  Schedule Message
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Send Now
                </>
              )}
            </Button>
            
            {/* Debug info */}
            <div className="text-xs text-muted-foreground">
              Debug: Title: {title ? '✓' : '✗'}, Content: {content ? '✓' : '✗'}, 
              Groups: {selectedGroups.length}, Channels: {selectedChannels.length},
              Scheduled: {scheduledFor ? scheduledFor.toString() : 'No'}
            </div>

            <Button
              variant="outline"
              onClick={handleSaveDraft}
              disabled={!title || !content || isLoading}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              Save Draft
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};