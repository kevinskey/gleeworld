import React, { useState, useEffect } from 'react';
import { Mail, Search, Archive, Trash2, Reply, Forward, MoreHorizontal, Paperclip, Star, ChevronDown, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const EmailModule = () => {
  const { toast } = useToast();
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [archivedEmails, setArchivedEmails] = useState<string[]>([]);
  const [deletedEmails, setDeletedEmails] = useState<string[]>([]);
  const [currentView, setCurrentView] = useState<'inbox' | 'archived' | 'drafts'>('inbox');
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [drafts, setDrafts] = useState<any[]>([]);
  const [loadingDrafts, setLoadingDrafts] = useState(false);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);

  // Fetch real users from database
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data: profiles, error } = await supabase
          .from('gw_profiles')
          .select('user_id, full_name, email, role')
          .not('full_name', 'is', null)
          .order('full_name');

        if (error) {
          console.error('Error fetching users:', error);
          return;
        }

        // Transform database users to match expected format
        const transformedUsers = profiles.map(profile => ({
          id: profile.user_id,
          name: profile.full_name,
          email: profile.email,
          role: profile.role || 'member'
        }));

        // Add predefined groups
        const groups = [
          { id: 'exec-group', name: 'Executive Board', email: 'exec@gleeworld.org', role: 'Group' },
          { id: 'all-members', name: 'All Members', email: 'members@gleeworld.org', role: 'Group' },
          { id: 'music-library', name: 'Music Library', email: 'library@gleeworld.org', role: 'Department' }
        ];

        setUsers([...transformedUsers, ...groups]);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
    fetchDrafts();
  }, []);

  // Fetch drafts from database
  const fetchDrafts = async () => {
    try {
      setLoadingDrafts(true);
      const { data, error } = await supabase
        .from('gw_email_drafts')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching drafts:', error);
        return;
      }

      setDrafts(data || []);
    } catch (error) {
      console.error('Error fetching drafts:', error);
    } finally {
      setLoadingDrafts(false);
    }
  };

  // Save draft to database
  const handleSaveDraft = async () => {
    if (!selectedRecipients.length && !subject.trim() && !message.trim()) {
      toast({
        title: "Nothing to save",
        description: "Please add recipients, subject, or message to save a draft",
        variant: "destructive",
      });
      return;
    }

    try {
      const draftData = {
        recipients: selectedRecipients,
        subject: subject,
        message: message,
        user_id: (await supabase.auth.getUser()).data.user?.id
      };

      let result;
      if (currentDraftId) {
        // Update existing draft
        result = await supabase
          .from('gw_email_drafts')
          .update(draftData)
          .eq('id', currentDraftId);
      } else {
        // Create new draft
        result = await supabase
          .from('gw_email_drafts')
          .insert(draftData)
          .select()
          .single();
        
        if (result.data) {
          setCurrentDraftId(result.data.id);
        }
      }

      if (result.error) {
        throw result.error;
      }

      toast({
        title: "Draft saved",
        description: currentDraftId ? "Draft updated successfully" : "Draft saved successfully",
      });

      fetchDrafts(); // Refresh drafts list
      setShowCompose(false); // Close the compose dialog
    } catch (error: any) {
      console.error('Error saving draft:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save draft",
        variant: "destructive",
      });
    }
  };

  // Load draft for editing
  const handleLoadDraft = (draft: any) => {
    setSelectedRecipients(draft.recipients || []);
    setSubject(draft.subject || '');
    setMessage(draft.message || '');
    setCurrentDraftId(draft.id);
    setShowCompose(true);
  };

  // Clear form and reset draft ID
  const clearForm = () => {
    setSelectedRecipients([]);
    setSubject('');
    setMessage('');
    setCurrentDraftId(null);
  };

  // Delete draft
  const handleDeleteDraft = async (draftId: string) => {
    try {
      const { error } = await supabase
        .from('gw_email_drafts')
        .delete()
        .eq('id', draftId);

      if (error) {
        throw error;
      }

      toast({
        title: "Draft deleted",
        description: "Draft deleted successfully",
      });

      fetchDrafts(); // Refresh drafts list
      
      if (currentDraftId === draftId) {
        clearForm();
      }
    } catch (error: any) {
      console.error('Error deleting draft:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete draft",
        variant: "destructive",
      });
    }
  };

  const emails = [
    {
      id: '1',
      sender: 'Dr. Johnson',
      subject: 'Rehearsal Schedule Update - This Week',
      preview: 'Please note the schedule changes for this week\'s rehearsals...',
      timestamp: '2m ago',
      unread: true,
      starred: false,
      hasAttachment: false
    },
    {
      id: '2',
      sender: 'Sarah Williams',
      subject: 'Tour Preparations - Important Updates',
      preview: 'We need to finalize the tour arrangements by Friday...',
      timestamp: '1h ago',
      unread: true,
      starred: true,
      hasAttachment: true
    },
    {
      id: '3',
      sender: 'Executive Board',
      subject: 'Wardrobe Fitting Schedule',
      preview: 'Individual wardrobe fittings will begin next week...',
      timestamp: '3h ago',
      unread: false,
      starred: false,
      hasAttachment: false
    },
    {
      id: '4',
      sender: 'Music Library',
      subject: 'New Sheet Music Available',
      preview: 'We\'ve added several new pieces to our digital library...',
      timestamp: '1d ago',
      unread: false,
      starred: false,
      hasAttachment: true
    }
  ];

  // Filter emails based on current view and deleted status
  const filteredEmails = emails.filter(email => {
    if (deletedEmails.includes(email.id)) return false;
    
    if (currentView === 'inbox') {
      return !archivedEmails.includes(email.id);
    } else if (currentView === 'archived') {
      return archivedEmails.includes(email.id);
    }
    return true;
  });

  const handleArchiveEmail = (emailId: string) => {
    setArchivedEmails(prev => [...prev, emailId]);
    if (selectedEmail === emailId) {
      setSelectedEmail(null);
    }
  };

  const handleDeleteEmail = (emailId: string) => {
    setDeletedEmails(prev => [...prev, emailId]);
    if (selectedEmail === emailId) {
      setSelectedEmail(null);
    }
  };

  const handleSendEmail = async () => {
    if (!selectedRecipients.length) {
      toast({
        title: "Error",
        description: "Please select at least one recipient",
        variant: "destructive",
      });
      return;
    }

    if (!subject.trim()) {
      toast({
        title: "Error", 
        description: "Please enter a subject",
        variant: "destructive",
      });
      return;
    }

    if (!message.trim()) {
      toast({
        title: "Error",
        description: "Please enter a message",
        variant: "destructive",
      });
      return;
    }

    setSending(true);

    try {
      // Get recipient emails
      const recipientEmails = selectedRecipients.map(recipientId => {
        const user = users.find(u => u.id === recipientId);
        return user?.email;
      }).filter(Boolean);

      if (!recipientEmails.length) {
        throw new Error("No valid recipient emails found");
      }

      // Send email using the existing edge function
      const { error } = await supabase.functions.invoke('gw-send-email', {
        body: {
          to: recipientEmails,
          subject: subject,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 20px;">
                <h1 style="color: #2563eb; margin: 0;">GleeWorld</h1>
                <p style="color: #666; margin: 5px 0 0 0;">Spelman College Glee Club</p>
              </div>
              
              <h2 style="color: #333; margin-bottom: 20px;">${subject}</h2>
              
              <div style="line-height: 1.6; color: #333; white-space: pre-wrap;">
                ${message}
              </div>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px;">
                <p>Sent via GleeWorld</p>
                <p>Spelman College Glee Club</p>
              </div>
            </div>
          `,
          from: "GleeWorld <noreply@gleeworld.org>"
        }
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: `Email sent to ${recipientEmails.length} recipient${recipientEmails.length > 1 ? 's' : ''}`,
      });

      // Delete draft if it was being edited
      if (currentDraftId) {
        await supabase
          .from('gw_email_drafts')
          .delete()
          .eq('id', currentDraftId);
        fetchDrafts();
      }

      // Clear form
      clearForm();
      setShowCompose(false);

    } catch (error: any) {
      console.error('Error sending email:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send email",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const selectedEmailData = emails.find(email => email.id === selectedEmail);

  return (
    <div className="h-full flex flex-col lg:flex-row bg-background">
      {/* Email List - 60% width on desktop */}
      <div className={`${selectedEmail ? 'hidden lg:flex' : 'flex'} flex-col w-full lg:w-[60%] border-r border-border bg-background/50`}>
        <div className="p-4 border-b border-border bg-gradient-to-r from-blue-50/50 to-indigo-50/50">
          <div className="flex items-center gap-2 mb-4">
            <Mail className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Email</h2>
            <Badge variant="outline">{filteredEmails.length}</Badge>
          </div>
          
          {/* View Selector */}
          <div className="flex gap-1 mb-4 p-1 bg-muted rounded-lg">
            <Button
              variant={currentView === 'inbox' ? 'default' : 'ghost'}
              size="sm"
              className="flex-1 text-xs lg:text-sm"
              onClick={() => setCurrentView('inbox')}
            >
              Inbox ({currentView === 'inbox' ? filteredEmails.length : emails.filter(e => !archivedEmails.includes(e.id) && !deletedEmails.includes(e.id)).length})
            </Button>
            <Button
              variant={currentView === 'archived' ? 'default' : 'ghost'}
              size="sm"
              className="flex-1 text-xs lg:text-sm"
              onClick={() => setCurrentView('archived')}
            >
              Archived ({archivedEmails.length})
            </Button>
            <Button
              variant={currentView === 'drafts' ? 'default' : 'ghost'}
              size="sm"
              className="flex-1 text-xs lg:text-sm"
              onClick={() => setCurrentView('drafts')}
            >
              Drafts ({drafts.length})
            </Button>
          </div>
          
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input placeholder="Search emails..." className="pl-10" />
          </div>

          <div className="flex gap-2">
            <Dialog open={showCompose} onOpenChange={setShowCompose}>
              <DialogTrigger asChild>
                <Button size="sm" className="flex-1">
                  Compose
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Compose Email</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <Label htmlFor="to">To</Label>
                    <div className="mt-1">
                      <div className="border rounded-md p-2 bg-background min-h-[40px]">
                        {selectedRecipients.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {selectedRecipients.map((recipientId) => {
                              const user = users.find(u => u.id === recipientId);
                              return user ? (
                                <Badge key={recipientId} variant="secondary" className="text-xs">
                                  {user.name}
                                  <button
                                    onClick={() => setSelectedRecipients(prev => prev.filter(id => id !== recipientId))}
                                    className="ml-1 hover:text-destructive"
                                  >
                                    ×
                                  </button>
                                </Badge>
                              ) : null;
                            })}
                          </div>
                        )}
                        <Select 
                          onValueChange={(value) => {
                            if (!selectedRecipients.includes(value)) {
                              setSelectedRecipients(prev => [...prev, value]);
                            }
                          }}
                        >
                          <SelectTrigger className="border-0 shadow-none p-0 h-auto">
                            <SelectValue placeholder="Select recipients..." />
                          </SelectTrigger>
                          <SelectContent className="z-50 bg-background border shadow-lg max-h-[300px] overflow-y-auto">
                            <div className="p-2 text-xs font-medium text-muted-foreground border-b">Individual Users</div>
                            {users.filter(u => ['fan', 'member', 'alumna', 'admin', 'super-admin'].includes(u.role)).map((user) => (
                              <SelectItem 
                                key={user.id} 
                                value={user.id}
                                disabled={selectedRecipients.includes(user.id)}
                              >
                                <div className="flex items-center gap-2">
                                  <Avatar className="w-6 h-6">
                                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                                      {user.name.charAt(0)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <div className="font-medium">{user.name}</div>
                                    <div className="text-xs text-muted-foreground">{user.email}</div>
                                  </div>
                                </div>
                              </SelectItem>
                            ))}
                            <div className="p-2 text-xs font-medium text-muted-foreground border-b border-t">Groups</div>
                            {users.filter(u => ['Group', 'Department'].includes(u.role)).map((user) => (
                              <SelectItem 
                                key={user.id} 
                                value={user.id}
                                disabled={selectedRecipients.includes(user.id)}
                              >
                                <div className="flex items-center gap-2">
                                  <Avatar className="w-6 h-6">
                                    <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                                      {user.name.charAt(0)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <div className="font-medium">{user.name}</div>
                                    <div className="text-xs text-muted-foreground">{user.email}</div>
                                  </div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                      id="subject"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Enter subject..."
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="message">Message</Label>
                    <Textarea
                      id="message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Type your message here..."
                      className="mt-1 min-h-[200px] resize-none"
                    />
                  </div>
                  
                  <div className="flex gap-2 pt-4">
                    <Button 
                      onClick={handleSendEmail} 
                      disabled={sending}
                      className="flex-1"
                    >
                      {sending ? "Sending..." : "Send"}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={handleSaveDraft}
                      disabled={sending}
                    >
                      Save Draft
                    </Button>
                    <Button 
                      variant="ghost" 
                      onClick={() => {
                        clearForm();
                        setShowCompose(false);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Email List Content */}
        <ScrollArea className="flex-1">
          <div className="divide-y divide-border">
            {currentView === 'drafts' ? (
              // Drafts view
              loadingDrafts ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Mail className="w-8 h-8 mx-auto mb-2 animate-pulse" />
                  <p>Loading drafts...</p>
                </div>
              ) : drafts.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Mail className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium mb-1">No drafts</p>
                  <p className="text-sm">Compose an email and save it as a draft</p>
                </div>
              ) : (
                drafts.map((draft) => (
                  <Card key={draft.id} className="m-2 p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-sm truncate">
                            {draft.subject || 'No Subject'}
                          </h4>
                          <Badge variant="outline">Draft</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">
                          To: {draft.recipients?.length ? `${draft.recipients.length} recipient${draft.recipients.length > 1 ? 's' : ''}` : 'No recipients'}
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {draft.message || 'No content'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(draft.updated_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-1 ml-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLoadDraft(draft);
                          }}
                          className="h-8 w-8 p-0"
                        >
                          ✏️
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteDraft(draft.id);
                          }}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )
            ) : (
              // Regular emails view
              filteredEmails.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Mail className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium mb-1">
                    {currentView === 'archived' ? 'No archived emails' : 'No emails'}
                  </p>
                  <p className="text-sm">
                    {currentView === 'archived' 
                      ? 'Archived emails will appear here' 
                      : 'New emails will appear here'}
                  </p>
                </div>
              ) : (
                filteredEmails.map((email) => (
                  <div
                    key={email.id}
                    onClick={() => setSelectedEmail(email.id)}
                    className={`p-4 cursor-pointer transition-colors hover:bg-muted/50 ${
                      selectedEmail === email.id ? 'bg-muted border-l-2 border-l-primary' : ''
                    } ${email.unread ? 'bg-blue-50/30' : ''}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Avatar className="w-8 h-8 flex-shrink-0">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {email.sender.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className={`text-sm truncate ${email.unread ? 'font-semibold' : 'font-medium'}`}>
                              {email.sender}
                            </h4>
                            {email.starred && <Star className="w-3 h-3 text-yellow-500 fill-current flex-shrink-0" />}
                            {email.hasAttachment && <Paperclip className="w-3 h-3 text-muted-foreground flex-shrink-0" />}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-muted-foreground">{email.timestamp}</span>
                        {email.unread && <div className="w-2 h-2 bg-primary rounded-full"></div>}
                      </div>
                    </div>
                    
                    <div className="ml-10">
                      <h5 className={`text-sm mb-1 line-clamp-1 ${email.unread ? 'font-medium' : ''}`}>
                        {email.subject}
                      </h5>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {email.preview}
                      </p>
                    </div>
                  </div>
                ))
              )
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Email View - 40% width on desktop */}
      <div className={`${!selectedEmail ? 'hidden lg:flex' : 'flex'} flex-col w-full lg:w-[40%] bg-background`}>
        {selectedEmail && selectedEmailData ? (
          <>
            {/* Email Header */}
            <div className="p-4 border-b border-border bg-gradient-to-r from-blue-50/30 to-background">
              <div className="flex items-center justify-between mb-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedEmail(null)}
                  className="lg:hidden"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => handleArchiveEmail(selectedEmailData.id)}>
                    <Archive className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteEmail(selectedEmailData.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Reply className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Forward className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <div className="space-y-3">
                <h1 className="text-lg font-semibold leading-tight">{selectedEmailData.subject}</h1>
                
                <div className="flex items-start gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {selectedEmailData.sender.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-sm">{selectedEmailData.sender}</h3>
                        <p className="text-xs text-muted-foreground">to: you</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">{selectedEmailData.timestamp}</p>
                        {selectedEmailData.starred && <Star className="w-4 h-4 text-yellow-500 fill-current ml-auto mt-1" />}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Email Content */}
            <ScrollArea className="flex-1">
              <div className="p-6">
                <div className="prose prose-sm max-w-none">
                  <p className="mb-4">{selectedEmailData.preview}</p>
                  
                  {/* Mock email content based on subject */}
                  {selectedEmailData.subject.includes('Rehearsal Schedule') && (
                    <div className="space-y-4">
                      <p>Dear Glee Club Members,</p>
                      <p>I hope this message finds you well. I wanted to update you on some important changes to our rehearsal schedule for this week:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li><strong>Tuesday, March 19:</strong> Rehearsal moved to 7:00 PM (Room 205)</li>
                        <li><strong>Thursday, March 21:</strong> Extended rehearsal until 9:30 PM</li>
                        <li><strong>Saturday, March 23:</strong> Special sectional rehearsals starting at 2:00 PM</li>
                      </ul>
                      <p>Please make note of these changes in your calendars. We're preparing for our upcoming spring concert, and these adjustments will help us perfect our performances.</p>
                      <p>Thank you for your flexibility and dedication.</p>
                      <p>Best regards,<br />Dr. Johnson<br />Director, Spelman College Glee Club</p>
                    </div>
                  )}

                  {selectedEmailData.subject.includes('Tour Preparations') && (
                    <div className="space-y-4">
                      <p>Hello Everyone,</p>
                      <p>As we approach our upcoming tour, there are several important updates and preparations that need your immediate attention:</p>
                      
                      <h4 className="font-semibold mt-6 mb-2">Travel Documents</h4>
                      <p>Please ensure all travel documents are submitted by <strong>Friday, March 22</strong>. This includes:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Photo ID or passport</li>
                        <li>Emergency contact information</li>
                        <li>Dietary restrictions form</li>
                        <li>Medical information and medications</li>
                      </ul>
                      
                      <h4 className="font-semibold mt-6 mb-2">Performance Attire</h4>
                      <p>Final wardrobe fittings will be scheduled next week. Please check your email for your assigned time slot.</p>
                      
                      <h4 className="font-semibold mt-6 mb-2">Itinerary</h4>
                      <p>The complete tour itinerary will be distributed by Wednesday. Please review it carefully and reach out with any questions.</p>
                      
                      <p>Thank you for your continued excellence and professionalism.</p>
                      <p>Sarah Williams<br />Tour Coordinator</p>
                    </div>
                  )}

                  {selectedEmailData.subject.includes('Wardrobe Fitting') && (
                    <div className="space-y-4">
                      <p>Dear Glee Club Members,</p>
                      <p>Individual wardrobe fittings for our upcoming performances will begin next week. Please find your scheduled appointment below:</p>
                      
                      <div className="bg-muted p-4 rounded-lg my-4">
                        <h4 className="font-semibold mb-2">Fitting Schedule</h4>
                        <p><strong>Week of March 25-29</strong></p>
                        <p>Location: Wardrobe Department, Fine Arts Building</p>
                        <p>Duration: Approximately 30 minutes per person</p>
                      </div>
                      
                      <p>Your individual appointment time will be sent in a separate email. Please arrive promptly and bring:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>The undergarments you plan to wear during performances</li>
                        <li>Performance shoes (if you have them)</li>
                        <li>Any questions about garment care</li>
                      </ul>
                      
                      <p>If you cannot make your assigned time, please contact the wardrobe department immediately to reschedule.</p>
                      
                      <p>Best regards,<br />Executive Board</p>
                    </div>
                  )}

                  {selectedEmailData.subject.includes('New Sheet Music') && (
                    <div className="space-y-4">
                      <p>Hello Musicians,</p>
                      <p>We're excited to announce that several new pieces have been added to our digital music library. These selections will be part of our upcoming spring repertoire:</p>
                      
                      <div className="bg-muted p-4 rounded-lg my-4">
                        <h4 className="font-semibold mb-2">New Additions</h4>
                        <ul className="space-y-1">
                          <li>• "Lift Every Voice and Sing" - J. Rosamond Johnson (4-part arrangement)</li>
                          <li>• "Wade in the Water" - Traditional Spiritual (SATB)</li>
                          <li>• "Total Praise" - Richard Smallwood (Contemporary Gospel)</li>
                          <li>• "How Great Thou Art" - Carl Gustav Boberg (Hymn arrangement)</li>
                        </ul>
                      </div>
                      
                      <p>All sheet music is now available in your digital folders. Please download and begin familiarizing yourself with these pieces, as we'll start working on them in next week's rehearsals.</p>
                      
                      <p>Audio practice tracks will be available by Thursday on the music portal.</p>
                      
                      <p>Happy practicing!</p>
                      <p>Music Library Team</p>
                    </div>
                  )}

                  {selectedEmailData.hasAttachment && (
                    <div className="mt-6 p-4 bg-muted rounded-lg">
                      <div className="flex items-center gap-2">
                        <Paperclip className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Attachments</span>
                      </div>
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <div className="w-6 h-6 bg-primary/10 rounded flex items-center justify-center">
                            📄
                          </div>
                          <span>rehearsal-schedule-march.pdf</span>
                          <span className="text-xs">(245 KB)</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>
          </>
        ) : (
          // No email selected state
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center text-muted-foreground max-w-sm">
              <Mail className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">Select an email to read</h3>
              <p className="text-sm">Choose an email from the list to view its full content here.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};