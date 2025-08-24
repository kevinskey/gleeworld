import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { 
  Send, 
  Mail, 
  MessageSquare, 
  Bell, 
  Users, 
  UserCheck, 
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Loader2,
  FileText,
  Phone
} from "lucide-react";
import { toast } from 'sonner';
import { useCommunicationSystem } from '@/hooks/useCommunicationSystem';
import { useAuth } from '@/contexts/AuthContext';
import { GroupSMSInterface } from '@/components/messaging/GroupSMSInterface';

interface NotificationFormData {
  title: string;
  content: string;
  type: string;
  priority: string;
  recipientGroups: string[];
  channels: string[];
  scheduledFor?: string;
  templateId?: string;
}

const ComprehensiveNotificationSystem = () => {
  const { user } = useAuth();
  const {
    communications,
    messageGroups,
    templates,
    loading,
    sendCommunication,
    saveDraft,
    fetchCommunications
  } = useCommunicationSystem();

  const [formData, setFormData] = useState<NotificationFormData>({
    title: '',
    content: '',
    type: 'announcement',
    priority: 'normal',
    recipientGroups: [],
    channels: ['in_app'],
    scheduledFor: '',
    templateId: ''
  });

  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState('compose');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');

  const communicationTypes = [
    { value: 'announcement', label: 'Announcement', icon: Bell, color: 'bg-blue-500' },
    { value: 'notification', label: 'Notification', icon: AlertCircle, color: 'bg-yellow-500' },
    { value: 'message', label: 'Message', icon: MessageSquare, color: 'bg-green-500' },
    { value: 'reminder', label: 'Reminder', icon: Clock, color: 'bg-purple-500' }
  ];

  const priorityLevels = [
    { value: 'low', label: 'Low', color: 'bg-gray-500' },
    { value: 'normal', label: 'Normal', color: 'bg-blue-500' },
    { value: 'high', label: 'High', color: 'bg-orange-500' },
    { value: 'urgent', label: 'Urgent', color: 'bg-red-500' }
  ];

  const channelOptions = [
    { value: 'email', label: 'Email', icon: Mail, description: 'Send via email using Resend' },
    { value: 'sms', label: 'SMS', icon: MessageSquare, description: 'Send text messages via Twilio' },
    { value: 'in_app', label: 'In-App', icon: Bell, description: 'Create in-app notifications' }
  ];

  // Handle form input changes
  const handleInputChange = (field: keyof NotificationFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Handle recipient group selection
  const handleGroupToggle = (groupId: string) => {
    setFormData(prev => ({
      ...prev,
      recipientGroups: prev.recipientGroups.includes(groupId)
        ? prev.recipientGroups.filter(id => id !== groupId)
        : [...prev.recipientGroups, groupId]
    }));
  };

  // Handle channel selection
  const handleChannelToggle = (channel: string) => {
    setFormData(prev => ({
      ...prev,
      channels: prev.channels.includes(channel)
        ? prev.channels.filter(c => c !== channel)
        : [...prev.channels, channel]
    }));
  };

  // Load template
  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setFormData(prev => ({
        ...prev,
        title: template.subject,
        content: template.content,
        templateId: templateId
      }));
      toast.success('Template loaded successfully');
    }
  };

  // Send communication
  const handleSend = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error('Please fill in both title and content');
      return;
    }

    if (formData.recipientGroups.length === 0) {
      toast.error('Please select at least one recipient group');
      return;
    }

    if (formData.channels.length === 0) {
      toast.error('Please select at least one delivery channel');
      return;
    }

    setSending(true);

    try {
      const result = await sendCommunication(
        formData.title,
        formData.content,
        formData.recipientGroups,
        formData.channels,
        formData.type,
        formData.priority,
        formData.scheduledFor || undefined
      );

      if (result) {
        // Reset form
        setFormData({
          title: '',
          content: '',
          type: 'announcement',
          priority: 'normal',
          recipientGroups: [],
          channels: ['in_app'],
          scheduledFor: '',
          templateId: ''
        });

        // Switch to history tab
        setActiveTab('history');
        
        toast.success(formData.scheduledFor ? 'Communication scheduled successfully' : 'Communication sent successfully');
      }
    } catch (error) {
      console.error('Error sending communication:', error);
    } finally {
      setSending(false);
    }
  };

  // Save as draft
  const handleSaveDraft = async () => {
    if (!formData.title.trim() && !formData.content.trim()) {
      toast.error('Please add some content before saving as draft');
      return;
    }

    try {
      await saveDraft(formData.title, formData.content, formData.type);
      setActiveTab('history');
    } catch (error) {
      console.error('Error saving draft:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'sending':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'scheduled':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'draft':
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
          Communication Center
        </h1>
        <p className="text-muted-foreground">
          Send notifications and announcements via email, SMS, and in-app notifications
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="compose" className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Compose
          </TabsTrigger>
          <TabsTrigger value="group-sms" className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Group SMS
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="compose" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main Compose Form */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Compose Communication</CardTitle>
                  <CardDescription>
                    Create and send notifications to Glee Club members
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Template Selection */}
                  {templates.length > 0 && (
                    <div className="space-y-2">
                      <Label>Load Template (Optional)</Label>
                      <Select onValueChange={handleTemplateSelect}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a template..." />
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
                  )}

                  {/* Title */}
                  <div className="space-y-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      placeholder="Enter communication title..."
                    />
                  </div>

                  {/* Content */}
                  <div className="space-y-2">
                    <Label htmlFor="content">Message *</Label>
                    <Textarea
                      id="content"
                      value={formData.content}
                      onChange={(e) => handleInputChange('content', e.target.value)}
                      placeholder="Enter your message..."
                      rows={6}
                    />
                  </div>

                  {/* Type and Priority */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select value={formData.type} onValueChange={(value) => handleInputChange('type', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {communicationTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              <div className="flex items-center gap-2">
                                <type.icon className="h-4 w-4" />
                                {type.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Priority</Label>
                      <Select value={formData.priority} onValueChange={(value) => handleInputChange('priority', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {priorityLevels.map((priority) => (
                            <SelectItem key={priority.value} value={priority.value}>
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${priority.color}`} />
                                {priority.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Schedule */}
                  <div className="space-y-2">
                    <Label htmlFor="schedule">Schedule for Later (Optional)</Label>
                    <Input
                      id="schedule"
                      type="datetime-local"
                      value={formData.scheduledFor}
                      onChange={(e) => handleInputChange('scheduledFor', e.target.value)}
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    <Button onClick={handleSend} disabled={sending} className="flex-1">
                      {sending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          {formData.scheduledFor ? 'Schedule' : 'Send Now'}
                        </>
                      )}
                    </Button>
                    <Button variant="outline" onClick={handleSaveDraft}>
                      Save Draft
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar - Recipients and Channels */}
            <div className="space-y-6">
              {/* Recipients */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Recipients
                  </CardTitle>
                  <CardDescription>
                    Select who should receive this communication
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {messageGroups.map((group) => (
                      <div key={group.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={group.id}
                          checked={formData.recipientGroups.includes(group.id)}
                          onCheckedChange={() => handleGroupToggle(group.id)}
                        />
                        <Label htmlFor={group.id} className="flex-1 cursor-pointer">
                          <div className="font-medium">{group.name}</div>
                          {group.description && (
                            <div className="text-sm text-muted-foreground">{group.description}</div>
                          )}
                        </Label>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Delivery Channels */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Send className="h-5 w-5" />
                    Delivery Channels
                  </CardTitle>
                  <CardDescription>
                    Choose how to deliver this communication
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {channelOptions.map((channel) => (
                      <div key={channel.value} className="flex items-start space-x-3">
                        <Checkbox
                          id={channel.value}
                          checked={formData.channels.includes(channel.value)}
                          onCheckedChange={() => handleChannelToggle(channel.value)}
                        />
                        <div className="grid gap-1.5 leading-none">
                          <Label
                            htmlFor={channel.value}
                            className="flex items-center gap-2 cursor-pointer font-medium"
                          >
                            <channel.icon className="h-4 w-4" />
                            {channel.label}
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            {channel.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Group SMS Tab */}
        <TabsContent value="group-sms" className="space-y-4">
          <div className="space-y-4">
            {messageGroups.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Phone className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No message groups available</p>
                <p className="text-sm">Create a message group first to enable SMS</p>
              </div>
            ) : (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Phone className="h-5 w-5 mr-2" />
                      Group SMS Conversations
                    </CardTitle>
                    <CardDescription>
                      Enable GroupMe-style SMS messaging for your groups. Members can send and receive messages via text.
                    </CardDescription>
                  </CardHeader>
                </Card>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Select Group</Label>
                    <Select 
                      value={selectedGroupId} 
                      onValueChange={setSelectedGroupId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a group for SMS" />
                      </SelectTrigger>
                      <SelectContent>
                        {messageGroups.map((group) => (
                          <SelectItem key={group.id} value={group.id}>
                            {group.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedGroupId && (
                    <GroupSMSInterface
                      groupId={selectedGroupId}
                      groupName={messageGroups.find(g => g.id === selectedGroupId)?.name || 'Group'}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <CardTitle>Communication Templates</CardTitle>
              <CardDescription>
                Pre-built templates for common communications
              </CardDescription>
            </CardHeader>
            <CardContent>
              {templates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No templates available
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {templates.map((template) => (
                    <Card key={template.id} className="cursor-pointer hover:bg-accent transition-colors">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">{template.name}</CardTitle>
                          <Badge variant="secondary">{template.category}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                          {template.content}
                        </p>
                        <Button
                          size="sm"
                          onClick={() => {
                            handleTemplateSelect(template.id);
                            setActiveTab('compose');
                          }}
                          className="w-full"
                        >
                          Use Template
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Communication History</CardTitle>
              <CardDescription>
                View your recent communications and their delivery status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {communications.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No communications sent yet
                </div>
              ) : (
                <div className="space-y-4">
                  {communications.map((comm) => (
                    <div key={comm.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <h3 className="font-semibold">{comm.title}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {comm.content}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(comm.status)}
                          <Badge variant={comm.status === 'sent' ? 'default' : 'secondary'}>
                            {comm.status}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Type: {comm.type}</span>
                        <span>Priority: {comm.priority}</span>
                        <span>{formatDate(comm.created_at)}</span>
                      </div>

                      {comm.metadata?.delivery_summary && (
                        <div className="flex gap-4 text-sm">
                          <span className="text-green-600">
                            ✓ {comm.metadata.delivery_summary.emailsSent || 0} emails
                          </span>
                          <span className="text-blue-600">
                            📱 {comm.metadata.delivery_summary.smsSent || 0} SMS
                          </span>
                          <span className="text-purple-600">
                            🔔 {comm.metadata.delivery_summary.inAppCreated || 0} in-app
                          </span>
                          {comm.metadata.delivery_summary.errors?.length > 0 && (
                            <span className="text-red-600">
                              ⚠ {comm.metadata.delivery_summary.errors.length} errors
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ComprehensiveNotificationSystem;