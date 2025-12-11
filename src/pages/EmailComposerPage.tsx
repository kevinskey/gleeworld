import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Mail, 
  Send, 
  Paperclip, 
  Bold, 
  Italic, 
  Underline, 
  List, 
  ListOrdered,
  Link as LinkIcon,
  Image,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Smartphone,
  Users,
  X,
  Plus,
  Search,
  Clock,
  Save,
  Sparkles,
  ArrowLeft,
  CheckCircle2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { RECIPIENT_GROUPS, RecipientGroup } from '@/types/communication';

const EmailComposerPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { userProfile } = useUserProfile(user);
  
  // Composer state
  const [composerMode, setComposerMode] = useState<'email' | 'sms'>('email');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [recipients, setRecipients] = useState<string[]>([]);
  const [recipientInput, setRecipientInput] = useState('');
  const [selectedGroups, setSelectedGroups] = useState<RecipientGroup[]>([]);
  const [ccRecipients, setCcRecipients] = useState<string[]>([]);
  const [bccRecipients, setBccRecipients] = useState<string[]>([]);
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Search for members
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    const { data, error } = await supabase
      .from('gw_profiles')
      .select('user_id, email, full_name, first_name, last_name, phone_number')
      .or(`email.ilike.%${query}%,full_name.ilike.%${query}%`)
      .limit(10);
    
    if (!error && data) {
      setSearchResults(data);
    }
    setIsSearching(false);
  };
  
  // Add recipient
  const addRecipient = (email: string, name?: string) => {
    const display = name ? `${name} <${email}>` : email;
    if (!recipients.includes(display)) {
      setRecipients([...recipients, display]);
    }
    setRecipientInput('');
    setSearchQuery('');
    setSearchResults([]);
  };
  
  // Remove recipient
  const removeRecipient = (recipient: string) => {
    setRecipients(recipients.filter(r => r !== recipient));
  };
  
  // Toggle group selection
  const toggleGroup = (group: RecipientGroup) => {
    if (selectedGroups.some(g => g.id === group.id)) {
      setSelectedGroups(selectedGroups.filter(g => g.id !== group.id));
    } else {
      setSelectedGroups([...selectedGroups, group]);
    }
  };
  
  // Send email
  const handleSendEmail = async () => {
    if (recipients.length === 0 && selectedGroups.length === 0) {
      toast({
        title: "No recipients",
        description: "Please add at least one recipient",
        variant: "destructive"
      });
      return;
    }
    
    if (!subject.trim()) {
      toast({
        title: "Subject required",
        description: "Please enter a subject line",
        variant: "destructive"
      });
      return;
    }
    
    if (!content.trim()) {
      toast({
        title: "Message required",
        description: "Please enter a message",
        variant: "destructive"
      });
      return;
    }
    
    setIsSending(true);
    
    try {
      // Extract emails from recipients
      const emailAddresses = recipients.map(r => {
        const match = r.match(/<(.+)>/);
        return match ? match[1] : r;
      });
      
      // Build branded HTML email
      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e3a5f 0%, #0056a6 50%, #2563eb 100%); padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold; letter-spacing: -0.5px;">
                ✨ GleeWorld
              </h1>
              <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">
                Spelman College Glee Club
              </p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 24px 0; color: #1e293b; font-size: 22px; font-weight: 600;">
                ${subject}
              </h2>
              <div style="color: #475569; font-size: 16px; line-height: 1.7;">
                ${content.replace(/\n/g, '<br>')}
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 40px; border-top: 1px solid #e2e8f0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="margin: 0; color: #64748b; font-size: 13px;">
                      Sent from GleeWorld by ${userProfile?.full_name || user?.email}
                    </p>
                    <p style="margin: 8px 0 0 0; color: #94a3b8; font-size: 12px;">
                      © ${new Date().getFullYear()} Spelman College Glee Club. All rights reserved.
                    </p>
                  </td>
                  <td align="right">
                    <a href="https://gleeworld.org" style="color: #0056a6; text-decoration: none; font-size: 13px;">
                      Visit GleeWorld →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `;
      
      const { data, error } = await supabase.functions.invoke('gw-send-email', {
        body: {
          to: emailAddresses,
          subject: subject,
          html: htmlContent,
          text: content,
          cc: ccRecipients.length > 0 ? ccRecipients : undefined,
          bcc: bccRecipients.length > 0 ? bccRecipients : undefined
        }
      });
      
      if (error) throw error;
      
      toast({
        title: "Email sent!",
        description: `Successfully sent to ${emailAddresses.length} recipient(s)`,
      });
      
      // Reset form
      setSubject('');
      setContent('');
      setRecipients([]);
      setCcRecipients([]);
      setBccRecipients([]);
      
    } catch (error: any) {
      console.error('Failed to send email:', error);
      toast({
        title: "Failed to send",
        description: error.message || "Please try again",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };
  
  // Send SMS
  const handleSendSMS = async () => {
    if (recipients.length === 0 && selectedGroups.length === 0) {
      toast({
        title: "No recipients",
        description: "Please add at least one recipient",
        variant: "destructive"
      });
      return;
    }
    
    if (!content.trim()) {
      toast({
        title: "Message required",
        description: "Please enter a message",
        variant: "destructive"
      });
      return;
    }
    
    setIsSending(true);
    
    try {
      // For SMS, we need phone numbers
      const { data, error } = await supabase.functions.invoke('broadcast-sms', {
        body: {
          message: content,
          senderUserId: user?.id,
          senderName: userProfile?.full_name || 'GleeWorld'
        }
      });
      
      if (error) throw error;
      
      toast({
        title: "SMS sent!",
        description: data?.message || "Messages sent successfully",
      });
      
      setContent('');
      
    } catch (error: any) {
      console.error('Failed to send SMS:', error);
      toast({
        title: "Failed to send",
        description: error.message || "Please try again",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <UniversalLayout>
      <div className="min-h-screen bg-background py-4 sm:py-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
              <Mail className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">GleeWorld Messenger</h1>
              <p className="text-sm text-muted-foreground">Send branded emails and SMS to members or anyone</p>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Composer */}
          <div className="lg:col-span-2 space-y-4">
            {/* Mode Tabs */}
            <Tabs value={composerMode} onValueChange={(v) => setComposerMode(v as 'email' | 'sms')} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="email" className="gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </TabsTrigger>
                <TabsTrigger value="sms" className="gap-2">
                  <Smartphone className="h-4 w-4" />
                  SMS
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="email" className="mt-4 space-y-4">
                <Card className="border-2">
                  <CardContent className="p-4 space-y-4">
                    {/* Recipients */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">To:</Label>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={() => setShowCc(!showCc)} className="h-6 text-xs">
                            Cc
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setShowBcc(!showBcc)} className="h-6 text-xs">
                            Bcc
                          </Button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 p-2 min-h-[44px] border rounded-lg bg-background">
                        {recipients.map((r, i) => (
                          <Badge key={i} variant="secondary" className="gap-1 pr-1">
                            {r}
                            <button onClick={() => removeRecipient(r)} className="hover:bg-muted-foreground/20 rounded-full p-0.5">
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                        <Input
                          value={recipientInput}
                          onChange={(e) => {
                            setRecipientInput(e.target.value);
                            handleSearch(e.target.value);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && recipientInput.includes('@')) {
                              addRecipient(recipientInput);
                            }
                          }}
                          placeholder="Type email or search members..."
                          className="flex-1 min-w-[200px] border-0 shadow-none focus-visible:ring-0 p-0 h-8"
                        />
                      </div>
                      {/* Search Results */}
                      {searchResults.length > 0 && (
                        <Card className="absolute z-50 w-full max-w-md shadow-lg">
                          <ScrollArea className="max-h-[200px]">
                            {searchResults.map((person) => (
                              <button
                                key={person.user_id}
                                onClick={() => addRecipient(person.email, person.full_name)}
                                className="w-full flex items-center gap-3 p-3 hover:bg-muted text-left"
                              >
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                                  {person.full_name?.[0] || person.email[0].toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-medium text-sm">{person.full_name || 'Unknown'}</p>
                                  <p className="text-xs text-muted-foreground">{person.email}</p>
                                </div>
                              </button>
                            ))}
                          </ScrollArea>
                        </Card>
                      )}
                    </div>
                    
                    {/* CC Field */}
                    {showCc && (
                      <div className="space-y-1">
                        <Label className="text-sm text-muted-foreground">Cc:</Label>
                        <Input
                          placeholder="Add CC recipients..."
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const val = (e.target as HTMLInputElement).value;
                              if (val.includes('@')) {
                                setCcRecipients([...ccRecipients, val]);
                                (e.target as HTMLInputElement).value = '';
                              }
                            }
                          }}
                        />
                        <div className="flex flex-wrap gap-1">
                          {ccRecipients.map((cc, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {cc}
                              <button onClick={() => setCcRecipients(ccRecipients.filter((_, idx) => idx !== i))}>
                                <X className="h-3 w-3 ml-1" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* BCC Field */}
                    {showBcc && (
                      <div className="space-y-1">
                        <Label className="text-sm text-muted-foreground">Bcc:</Label>
                        <Input
                          placeholder="Add BCC recipients..."
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const val = (e.target as HTMLInputElement).value;
                              if (val.includes('@')) {
                                setBccRecipients([...bccRecipients, val]);
                                (e.target as HTMLInputElement).value = '';
                              }
                            }
                          }}
                        />
                        <div className="flex flex-wrap gap-1">
                          {bccRecipients.map((bcc, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {bcc}
                              <button onClick={() => setBccRecipients(bccRecipients.filter((_, idx) => idx !== i))}>
                                <X className="h-3 w-3 ml-1" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <Separator />
                    
                    {/* Subject */}
                    <div className="space-y-1">
                      <Label className="text-sm font-medium">Subject:</Label>
                      <Input
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="Enter subject line..."
                        className="text-base font-medium"
                      />
                    </div>
                    
                    <Separator />
                    
                    {/* Formatting Toolbar */}
                    <div className="flex flex-wrap items-center gap-1 p-2 bg-muted/50 rounded-lg">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <Bold className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <Italic className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <Underline className="h-4 w-4" />
                      </Button>
                      <Separator orientation="vertical" className="h-6 mx-1" />
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <List className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <ListOrdered className="h-4 w-4" />
                      </Button>
                      <Separator orientation="vertical" className="h-6 mx-1" />
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <AlignLeft className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <AlignCenter className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <AlignRight className="h-4 w-4" />
                      </Button>
                      <Separator orientation="vertical" className="h-6 mx-1" />
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <LinkIcon className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <Image className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <Paperclip className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {/* Message Body */}
                    <Textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Compose your message..."
                      className="min-h-[300px] text-base leading-relaxed resize-none"
                    />
                    
                    {/* Character Count */}
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{content.length} characters</span>
                      <span>Branded GleeWorld template will be applied</span>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Actions */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={isScheduled}
                        onCheckedChange={setIsScheduled}
                      />
                      <Label className="text-sm">Schedule for later</Label>
                    </div>
                    {isScheduled && (
                      <Input
                        type="datetime-local"
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                        className="w-auto"
                      />
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button variant="outline" className="gap-2">
                      <Save className="h-4 w-4" />
                      Save Draft
                    </Button>
                    <Button 
                      onClick={handleSendEmail}
                      disabled={isSending}
                      className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                    >
                      {isSending ? (
                        <>Sending...</>
                      ) : isScheduled ? (
                        <>
                          <Clock className="h-4 w-4" />
                          Schedule
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          Send Email
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="sms" className="mt-4 space-y-4">
                <Card className="border-2">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Smartphone className="h-5 w-5 text-primary" />
                      Compose SMS
                    </CardTitle>
                    <CardDescription>
                      Send SMS to all members with phone numbers or select groups
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Type your SMS message..."
                      className="min-h-[150px] text-base resize-none"
                      maxLength={480}
                    />
                    <div className="flex justify-between text-xs">
                      <span className={content.length > 160 ? 'text-amber-500' : 'text-muted-foreground'}>
                        {content.length}/480 characters
                      </span>
                      <span className="text-muted-foreground">
                        {content.length <= 160 ? '1 SMS segment' : `${Math.ceil(content.length / 160)} SMS segments`}
                      </span>
                    </div>
                  </CardContent>
                </Card>
                
                <div className="flex justify-end">
                  <Button 
                    onClick={handleSendSMS}
                    disabled={isSending || !content.trim()}
                    className="gap-2"
                  >
                    {isSending ? (
                      <>Sending...</>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Send SMS to All Members
                      </>
                    )}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>
          
          {/* Sidebar - Quick Recipients */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="h-5 w-5 text-primary" />
                  Quick Add Groups
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search groups..." className="pl-9" />
                </div>
                
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {RECIPIENT_GROUPS.map((group) => (
                      <button
                        key={group.id}
                        onClick={() => toggleGroup(group)}
                        className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${
                          selectedGroups.some(g => g.id === group.id)
                            ? 'bg-primary/10 border-primary'
                            : 'hover:bg-muted'
                        }`}
                      >
                        <span className="text-sm font-medium">{group.label}</span>
                        {selectedGroups.some(g => g.id === group.id) && (
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                        )}
                      </button>
                    ))}
                  </div>
                </ScrollArea>
                
                {selectedGroups.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Selected Groups:</Label>
                      <div className="flex flex-wrap gap-1">
                        {selectedGroups.map((g) => (
                          <Badge key={g.id} variant="default" className="gap-1">
                            {g.label}
                            <button onClick={() => toggleGroup(g)}>
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
            
            {/* Email Preview */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border overflow-hidden">
                  <div className="bg-gradient-to-r from-primary to-primary/70 p-4 text-center">
                    <h3 className="text-white font-bold text-lg">✨ GleeWorld</h3>
                    <p className="text-white/80 text-xs">Spelman College Glee Club</p>
                  </div>
                  <div className="p-4 bg-card">
                    <h4 className="font-semibold text-sm mb-2 truncate">
                      {subject || 'Your Subject Line'}
                    </h4>
                    <p className="text-xs text-muted-foreground line-clamp-4">
                      {content || 'Your message will appear here with beautiful GleeWorld branding...'}
                    </p>
                  </div>
                  <div className="bg-muted/50 p-3 text-center">
                    <p className="text-xs text-muted-foreground">
                      Sent from GleeWorld
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </UniversalLayout>
  );
};

export default EmailComposerPage;
