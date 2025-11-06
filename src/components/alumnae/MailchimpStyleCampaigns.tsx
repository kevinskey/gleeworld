import { useState, useEffect } from "react";
import { EmailTemplateBuilder } from "./EmailTemplateBuilder";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Mail, Send, Loader2, Users, CheckCircle2, Search, Calendar,
  BarChart3, Eye, Clock, TrendingUp, Save, FileText, Sparkles,
  PieChart, MousePointerClick, Inbox, Trash2
} from "lucide-react";

interface AlumnaeUser {
  user_id: string;
  email: string;
  full_name: string | null;
  graduation_year?: number;
  voice_part?: string;
}

interface Campaign {
  id: string;
  name: string;
  subject: string;
  content: string;
  status: 'draft' | 'scheduled' | 'sent';
  recipients_count: number;
  sent_at?: string;
  scheduled_for?: string;
  stats?: {
    sent: number;
    opened: number;
    clicked: number;
  };
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  category: string;
}

const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'welcome',
    name: 'Welcome Message',
    subject: 'Welcome to Spelman Glee Club Alumnae Network',
    content: `Dear {name},

Welcome to the Spelman College Glee Club Alumnae Network! We're thrilled to have you as part of our community.

As a member, you'll have access to:
• Exclusive alumnae events and reunions
• Networking opportunities with fellow Glee Club members
• Updates on current club activities and performances
• Mentorship programs

We look forward to staying connected with you!

To Amaze and Inspire,
Spelman College Glee Club`,
    category: 'engagement'
  },
  {
    id: 'reunion',
    name: 'Reunion Invitation',
    subject: 'You\'re Invited: Glee Club Reunion {year}',
    content: `Dear {name},

Mark your calendars! The Spelman College Glee Club Reunion is coming up.

📅 Date: {event_date}
📍 Location: {event_location}
🎵 Special Performance by Current Members

Join us for an unforgettable weekend of music, memories, and connection.

RSVP by {rsvp_date} to secure your spot.

To Amaze and Inspire,
Spelman College Glee Club`,
    category: 'events'
  },
  {
    id: 'newsletter',
    name: 'Monthly Newsletter',
    subject: 'Glee Club Monthly Update - {month} {year}',
    content: `Dear {name},

Here's what's happening with the Spelman College Glee Club this month:

🎤 Upcoming Performances
{performances}

👥 Member Spotlights
{spotlights}

📰 News & Updates
{news}

Stay connected and keep singing!

To Amaze and Inspire,
Spelman College Glee Club`,
    category: 'newsletter'
  },
  {
    id: 'donation',
    name: 'Donation Appeal',
    subject: 'Support the Legacy of Musical Excellence',
    content: `Dear {name},

Your time in the Glee Club shaped who you are today. Now, you can help shape the future for the next generation of Spelman singers.

Your donation helps:
• Fund scholarships for deserving members
• Support touring opportunities
• Maintain our music library and equipment
• Preserve our rich musical legacy

Every contribution, no matter the size, makes a difference.

To Amaze and Inspire,
Spelman College Glee Club`,
    category: 'fundraising'
  }
];

export const MailchimpStyleCampaigns = () => {
  const [activeTab, setActiveTab] = useState('campaigns');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [alumnae, setAlumnae] = useState<AlumnaeUser[]>([]);
  const [filteredAlumnae, setFilteredAlumnae] = useState<AlumnaeUser[]>([]);
  const [selectedRecipients, setSelectedRecipients] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);

  // Campaign builder state
  const [campaignName, setCampaignName] = useState("");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [segmentFilter, setSegmentFilter] = useState<string>("all");
  const [scheduledFor, setScheduledFor] = useState<string>("");

  const loadTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
      toast.error("Failed to load templates");
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      const { error } = await supabase
        .from('email_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;

      toast.success("Template deleted successfully");
      loadTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error("Failed to delete template");
    }
  };

  useEffect(() => {
    loadAlumnae();
    loadCampaigns();
    loadTemplates();
  }, []);

  useEffect(() => {
    applySegmentation();
  }, [alumnae, segmentFilter, searchQuery]);

  const loadAlumnae = async () => {
    setLoading(true);
    try {
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'alumna');

      if (rolesError) throw rolesError;

      const alumnaeIds = rolesData.map(r => r.user_id);

      if (alumnaeIds.length === 0) {
        setAlumnae([]);
        setLoading(false);
        return;
      }

      const { data: profilesData, error: profilesError } = await supabase
        .from('gw_profiles')
        .select('user_id, email, full_name, graduation_year, voice_part')
        .in('user_id', alumnaeIds)
        .not('email', 'is', null);

      if (profilesError) throw profilesError;

      setAlumnae(profilesData || []);
    } catch (error: any) {
      toast.error("Failed to load alumnae", { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const loadCampaigns = async () => {
    // TODO: Load campaigns from database when table is created
    // For now, start with empty campaigns
    setCampaigns([]);
  };

  const applySegmentation = () => {
    let filtered = [...alumnae];

    // Apply segment filter
    if (segmentFilter === 'recent') {
      const currentYear = new Date().getFullYear();
      filtered = filtered.filter(a => a.graduation_year && a.graduation_year >= currentYear - 5);
    } else if (segmentFilter === 'decade') {
      const currentYear = new Date().getFullYear();
      const decade = Math.floor(currentYear / 10) * 10;
      filtered = filtered.filter(a => a.graduation_year && a.graduation_year >= decade && a.graduation_year < decade + 10);
    } else if (segmentFilter.startsWith('voice_')) {
      const voicePart = segmentFilter.replace('voice_', '');
      filtered = filtered.filter(a => a.voice_part?.toLowerCase() === voicePart.toLowerCase());
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(a =>
        a.full_name?.toLowerCase().includes(query) ||
        a.email.toLowerCase().includes(query)
      );
    }

    setFilteredAlumnae(filtered);
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = EMAIL_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(templateId);
      setSubject(template.subject);
      setContent(template.content);
    }
  };

  const toggleRecipient = (userId: string) => {
    const newSet = new Set(selectedRecipients);
    if (newSet.has(userId)) {
      newSet.delete(userId);
    } else {
      newSet.add(userId);
    }
    setSelectedRecipients(newSet);
  };

  const selectAll = () => {
    if (filteredAlumnae.every(a => selectedRecipients.has(a.user_id))) {
      const newSet = new Set(selectedRecipients);
      filteredAlumnae.forEach(a => newSet.delete(a.user_id));
      setSelectedRecipients(newSet);
    } else {
      setSelectedRecipients(new Set([...selectedRecipients, ...filteredAlumnae.map(a => a.user_id)]));
    }
  };

  const sendCampaign = async (isDraft: boolean = false) => {
    if (!isDraft && selectedRecipients.size === 0) {
      toast.error("Please select at least one recipient");
      return;
    }

    if (!subject || !content) {
      toast.error("Subject and content are required");
      return;
    }

    setLoading(true);
    try {
      const recipients = alumnae
        .filter(a => selectedRecipients.has(a.user_id))
        .map(a => ({ email: a.email, name: a.full_name || a.email }));

      if (!isDraft) {
        const { data, error } = await supabase.functions.invoke('send-alumnae-email', {
          body: { recipients, subject, message: content }
        });

        if (error) throw error;

        toast.success("Campaign sent successfully!", {
          description: `Email sent to ${recipients.length} alumnae`
        });

        // Reset form
        setCampaignName("");
        setSubject("");
        setContent("");
        setSelectedRecipients(new Set());
        setSelectedTemplate("");
      } else {
        toast.success("Campaign saved as draft");
      }

      loadCampaigns();
    } catch (error: any) {
      toast.error("Failed to send campaign", { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const getCampaignStats = (campaign: Campaign) => {
    if (!campaign.stats) return null;
    const openRate = ((campaign.stats.opened / campaign.stats.sent) * 100).toFixed(1);
    const clickRate = ((campaign.stats.clicked / campaign.stats.sent) * 100).toFixed(1);
    return { openRate, clickRate };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-2">
            <Mail className="h-8 w-8 text-primary" />
            Email Campaigns
          </h2>
          <p className="text-muted-foreground mt-1">
            Create, manage, and track email campaigns to alumnae
          </p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          {alumnae.length} Total Alumnae
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="campaigns" className="gap-2">
            <Inbox className="h-4 w-4" />
            Campaigns
          </TabsTrigger>
          <TabsTrigger value="create" className="gap-2">
            <Sparkles className="h-4 w-4" />
            Create
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <FileText className="h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* Campaigns List */}
        <TabsContent value="campaigns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Overview</CardTitle>
              <CardDescription>View and manage all email campaigns</CardDescription>
            </CardHeader>
            <CardContent>
              {campaigns.length === 0 ? (
                <div className="text-center py-12">
                  <Mail className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No campaigns yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create your first email campaign to get started
                  </p>
                  <Button onClick={() => setActiveTab('create')}>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Create Campaign
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {campaigns.map((campaign) => {
                    const stats = getCampaignStats(campaign);
                    return (
                      <Card key={campaign.id} className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-semibold text-lg">{campaign.name}</h3>
                              <Badge variant={
                              campaign.status === 'sent' ? 'default' :
                              campaign.status === 'scheduled' ? 'secondary' : 'outline'
                            }>
                              {campaign.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{campaign.subject}</p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {campaign.recipients_count} recipients
                            </span>
                            {campaign.sent_at && (
                              <span className="flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                Sent {new Date(campaign.sent_at).toLocaleDateString()}
                              </span>
                            )}
                            {campaign.scheduled_for && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Scheduled for {new Date(campaign.scheduled_for).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          {stats && (
                            <div className="flex gap-6 mt-3">
                              <div className="flex items-center gap-2">
                                <Eye className="h-4 w-4 text-blue-600" />
                                <span className="text-sm font-medium">{stats.openRate}% opened</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <MousePointerClick className="h-4 w-4 text-green-600" />
                                <span className="text-sm font-medium">{stats.clickRate}% clicked</span>
                              </div>
                            </div>
                          )}
                        </div>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Create Campaign */}
        <TabsContent value="create" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Settings</CardTitle>
              <CardDescription>Configure your email campaign</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Campaign Name (Internal)</Label>
                <Input
                  placeholder="e.g., Spring 2024 Reunion Invite"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                />
              </div>

              <div>
                <Label>Use Template</Label>
                <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Start from scratch or select a template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Start from scratch</SelectItem>
                    {EMAIL_TEMPLATES.map(template => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Email Subject</Label>
                <Input
                  placeholder="Enter email subject line"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>

              <div>
                <Label>Email Content</Label>
                <Textarea
                  placeholder="Compose your email message..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="min-h-[200px]"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Tip: Use {"{name}"} to personalize with recipient's name
                </p>
              </div>

              <div>
                <Label>Schedule (Optional)</Label>
                <Input
                  type="datetime-local"
                  value={scheduledFor}
                  onChange={(e) => setScheduledFor(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recipients</CardTitle>
                  <CardDescription>Select who will receive this campaign</CardDescription>
                </div>
                <Badge variant="secondary" className="text-lg px-3 py-1">
                  {selectedRecipients.size} selected
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label>Segment</Label>
                  <Select value={segmentFilter} onValueChange={setSegmentFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Alumnae</SelectItem>
                      <SelectItem value="recent">Recent Graduates (Last 5 Years)</SelectItem>
                      <SelectItem value="decade">Current Decade</SelectItem>
                      <SelectItem value="voice_soprano">Sopranos</SelectItem>
                      <SelectItem value="voice_alto">Altos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Label>Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  Showing {filteredAlumnae.length} of {alumnae.length} alumnae
                </p>
                <Button variant="outline" size="sm" onClick={selectAll}>
                  {filteredAlumnae.every(a => selectedRecipients.has(a.user_id)) && filteredAlumnae.length > 0
                    ? 'Deselect All' : 'Select All'}
                </Button>
              </div>

              <ScrollArea className="h-[300px] border rounded-lg p-4">
                <div className="space-y-2">
                  {filteredAlumnae.map((alumna) => (
                    <div key={alumna.user_id} className="flex items-center space-x-3 p-2 hover:bg-muted rounded">
                      <Checkbox
                        checked={selectedRecipients.has(alumna.user_id)}
                        onCheckedChange={() => toggleRecipient(alumna.user_id)}
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{alumna.full_name || alumna.email}</p>
                        <p className="text-xs text-muted-foreground">{alumna.email}</p>
                      </div>
                      {alumna.graduation_year && (
                        <Badge variant="outline" className="text-xs">
                          '{alumna.graduation_year.toString().slice(-2)}
                        </Badge>
                      )}
                    </div>
                  ))}

                  {filteredAlumnae.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      {searchQuery ? `No alumnae found matching "${searchQuery}"` : 'No alumnae available'}
                    </p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => sendCampaign(true)} disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              Save Draft
            </Button>
            <Button onClick={() => sendCampaign(false)} disabled={loading || selectedRecipients.size === 0}>
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : scheduledFor ? (
                <Clock className="h-4 w-4 mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              {scheduledFor ? 'Schedule Campaign' : 'Send Now'}
            </Button>
          </div>
        </TabsContent>

        {/* Templates */}
        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Email Templates</CardTitle>
                <CardDescription>Create and manage custom email templates</CardDescription>
              </div>
              <EmailTemplateBuilder onTemplateCreated={loadTemplates} />
            </CardHeader>
            <CardContent>
              {loadingTemplates ? (
                <p className="text-sm text-muted-foreground">Loading templates...</p>
              ) : templates.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-2" />
                  <p className="text-sm text-muted-foreground">No templates yet. Create your first template!</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {templates.map((template) => (
                    <Card key={template.id} className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold">{template.name}</h3>
                          <Badge variant="outline" className="mt-1">{template.category}</Badge>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSubject(template.subject);
                              setActiveTab('create');
                            }}
                          >
                            <Sparkles className="h-4 w-4 mr-1" />
                            Use
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteTemplate(template.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">{template.subject}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Created {new Date(template.created_at).toLocaleDateString()}
                      </p>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
                <Mail className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{campaigns.length}</div>
                <p className="text-xs text-muted-foreground">All time</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Open Rate</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {campaigns.filter(c => c.stats).length > 0
                    ? (campaigns
                        .filter(c => c.stats)
                        .reduce((acc, c) => acc + ((c.stats!.opened / c.stats!.sent) * 100), 0) /
                      campaigns.filter(c => c.stats).length).toFixed(1) + '%'
                    : 'N/A'}
                </div>
                <p className="text-xs text-muted-foreground">Calculated from sent campaigns</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Recipients</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{alumnae.length}</div>
                <p className="text-xs text-muted-foreground">Active alumnae</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Campaign Performance</CardTitle>
              <CardDescription>Detailed analytics for sent campaigns</CardDescription>
            </CardHeader>
            <CardContent>
              {campaigns.filter(c => c.status === 'sent').length === 0 ? (
                <div className="text-center py-12">
                  <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No campaign data yet</h3>
                  <p className="text-sm text-muted-foreground">
                    Analytics will appear here once you send campaigns
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {campaigns.filter(c => c.status === 'sent').map((campaign) => {
                    const stats = getCampaignStats(campaign);
                    if (!stats) return null;
                    return (
                      <div key={campaign.id} className="border-b pb-4 last:border-0">
                        <h4 className="font-medium mb-2">{campaign.name}</h4>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Sent</p>
                            <p className="text-lg font-semibold">{campaign.stats?.sent}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Open Rate</p>
                            <p className="text-lg font-semibold text-blue-600">{stats.openRate}%</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Click Rate</p>
                            <p className="text-lg font-semibold text-green-600">{stats.clickRate}%</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
