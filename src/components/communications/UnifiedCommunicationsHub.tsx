import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Mail, 
  MessageSquare, 
  Send, 
  Users, 
  User, 
  Settings,
  Globe,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import PhoneNumberInput from '@/components/notifications/PhoneNumberInput';

interface Recipient {
  id: string;
  email: string;
  full_name: string;
  role: string;
  phone?: string;
}

export const UnifiedCommunicationsHub = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  
  // Form state
  const [communicationType, setCommunicationType] = useState<'email' | 'sms'>('email');
  const [recipientType, setRecipientType] = useState<'all' | 'admins' | 'members' | 'specific' | 'custom'>('all');
  const [customContact, setCustomContact] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<'normal' | 'high' | 'urgent'>('normal');
  const [scheduleTime, setScheduleTime] = useState('');

  useEffect(() => {
    loadRecipients();
  }, []);

  const loadRecipients = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_profiles')
        .select('user_id, email, full_name, role, phone')
        .order('full_name');

      if (error) throw error;
      
      // Transform the data to match our interface
      const transformedData = (data || []).map(item => ({
        id: item.user_id,
        email: item.email,
        full_name: item.full_name,
        role: item.role,
        phone: item.phone
      }));
      
      setRecipients(transformedData);
    } catch (error) {
      console.error('Error loading recipients:', error);
      toast({
        title: "Error",
        description: "Failed to load recipients",
        variant: "destructive",
      });
    }
  };

  const getRecipientsByType = () => {
    switch (recipientType) {
      case 'all':
        return recipients;
      case 'admins':
        return recipients.filter(r => ['admin', 'super-admin'].includes(r.role));
      case 'members':
        return recipients.filter(r => r.role === 'member' || r.role === 'user');
      case 'specific':
        return recipients.filter(r => selectedRecipients.includes(r.id));
      case 'custom':
        return [{
          id: 'custom',
          email: customContact,
          full_name: customContact,
          role: 'external',
          phone: customContact
        }];
      default:
        return [];
    }
  };

  const finalRecipients = getRecipientsByType();
  const recipientCount = finalRecipients.length;

  const handleSend = async () => {
    if (!message.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a message",
        variant: "destructive",
      });
      return;
    }

    if (communicationType === 'email' && !subject.trim()) {
      toast({
        title: "Validation Error", 
        description: "Please enter a subject for the email",
        variant: "destructive",
      });
      return;
    }

    if (recipientCount === 0) {
      toast({
        title: "No Recipients",
        description: "Please select recipients for your message",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      if (communicationType === 'email') {
        const { error } = await supabase.functions.invoke('send-elastic-email', {
          body: {
            subject: subject,
            content: message,
            recipients: finalRecipients.map(r => ({ email: r.email, name: r.full_name })),
            priority: priority,
            scheduleTime: scheduleTime || null,
            sender: user?.id,
          }
        });

        if (error) throw error;
      } else {
        // For SMS, send to each recipient individually
        for (const recipient of finalRecipients) {
          const phone = recipientType === 'custom' ? customContact : recipient.phone;
          if (phone) {
            const { error } = await supabase.functions.invoke('send-sms', {
              body: {
                to: phone,
                message: message,
                sender: user?.id,
              }
            });

            if (error) {
              console.error(`Failed to send SMS to ${phone}:`, error);
            }
          }
        }
      }

      toast({
        title: "Message Sent Successfully",
        description: `${communicationType.toUpperCase()} sent to ${recipientCount} recipient${recipientCount !== 1 ? 's' : ''}`,
      });

      // Reset form
      setSubject('');
      setMessage('');
      setCustomContact('');
      setSelectedRecipients([]);
      setScheduleTime('');

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: `Failed to send ${communicationType}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const characterCount = message.length;
  const maxChars = communicationType === 'sms' ? 320 : 5000;

  return (
    <div className="h-full max-h-screen overflow-hidden">
      <Card className="h-full">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-xl">
            <div className="flex items-center gap-1">
              {communicationType === 'email' ? (
                <Mail className="h-5 w-5 text-blue-600" />
              ) : (
                <MessageSquare className="h-5 w-5 text-green-600" />
              )}
            </div>
            Communications Center
            <Badge variant="outline" className="ml-auto">
              {recipientCount} recipient{recipientCount !== 1 ? 's' : ''}
            </Badge>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6 h-full pb-6">
          {/* Communication Type Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Communication Type</Label>
            <RadioGroup 
              value={communicationType} 
              onValueChange={(value: 'email' | 'sms') => setCommunicationType(value)}
              className="flex gap-6"
            >
              <div className="flex items-center space-x-2 bg-blue-50 p-3 rounded-lg border-2 border-transparent data-[state=checked]:border-blue-500">
                <RadioGroupItem value="email" id="email" />
                <Label htmlFor="email" className="flex items-center gap-2 cursor-pointer">
                  <Mail className="h-4 w-4 text-blue-600" />
                  Email
                </Label>
              </div>
              <div className="flex items-center space-x-2 bg-green-50 p-3 rounded-lg border-2 border-transparent data-[state=checked]:border-green-500">
                <RadioGroupItem value="sms" id="sms" />
                <Label htmlFor="sms" className="flex items-center gap-2 cursor-pointer">
                  <MessageSquare className="h-4 w-4 text-green-600" />
                  SMS
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Send To Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Send To</Label>
            <RadioGroup 
              value={recipientType} 
              onValueChange={(value: any) => setRecipientType(value)}
              className="grid grid-cols-2 lg:grid-cols-5 gap-3"
            >
              <div className="flex items-center space-x-2 bg-purple-50 p-3 rounded-lg border-2 border-transparent data-[state=checked]:border-purple-500">
                <RadioGroupItem value="all" id="all" />
                <Label htmlFor="all" className="flex items-center gap-2 cursor-pointer text-sm">
                  <Globe className="h-4 w-4 text-purple-600" />
                  All ({recipients.length})
                </Label>
              </div>
              <div className="flex items-center space-x-2 bg-red-50 p-3 rounded-lg border-2 border-transparent data-[state=checked]:border-red-500">
                <RadioGroupItem value="admins" id="admins" />
                <Label htmlFor="admins" className="flex items-center gap-2 cursor-pointer text-sm">
                  <Settings className="h-4 w-4 text-red-600" />
                  Admins ({recipients.filter(r => ['admin', 'super-admin'].includes(r.role)).length})
                </Label>
              </div>
              <div className="flex items-center space-x-2 bg-blue-50 p-3 rounded-lg border-2 border-transparent data-[state=checked]:border-blue-500">
                <RadioGroupItem value="members" id="members" />
                <Label htmlFor="members" className="flex items-center gap-2 cursor-pointer text-sm">
                  <Users className="h-4 w-4 text-blue-600" />
                  Members ({recipients.filter(r => r.role === 'member' || r.role === 'user').length})
                </Label>
              </div>
              <div className="flex items-center space-x-2 bg-orange-50 p-3 rounded-lg border-2 border-transparent data-[state=checked]:border-orange-500">
                <RadioGroupItem value="specific" id="specific" />
                <Label htmlFor="specific" className="flex items-center gap-2 cursor-pointer text-sm">
                  <User className="h-4 w-4 text-orange-600" />
                  Select ({selectedRecipients.length})
                </Label>
              </div>
              <div className="flex items-center space-x-2 bg-gray-50 p-3 rounded-lg border-2 border-transparent data-[state=checked]:border-gray-500">
                <RadioGroupItem value="custom" id="custom" />
                <Label htmlFor="custom" className="flex items-center gap-2 cursor-pointer text-sm">
                  <Mail className="h-4 w-4 text-gray-600" />
                  Custom
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Specific Recipients or Custom Contact */}
          {recipientType === 'specific' && (
            <div className="max-h-32 overflow-y-auto border rounded-lg p-3 bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {recipients.map((recipient) => (
                  <div key={recipient.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`recipient-${recipient.id}`}
                      checked={selectedRecipients.includes(recipient.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedRecipients(prev => [...prev, recipient.id]);
                        } else {
                          setSelectedRecipients(prev => prev.filter(id => id !== recipient.id));
                        }
                      }}
                    />
                    <Label htmlFor={`recipient-${recipient.id}`} className="cursor-pointer text-sm">
                      {recipient.full_name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {recipientType === 'custom' && (
            <div>
              <Label htmlFor="custom-contact">
                {communicationType === 'email' ? 'Email Address' : 'Phone Number'}
              </Label>
              {communicationType === 'email' ? (
                <Input
                  id="custom-contact"
                  type="email"
                  placeholder="Enter email address"
                  value={customContact}
                  onChange={(e) => setCustomContact(e.target.value)}
                />
              ) : (
                <PhoneNumberInput
                  value={customContact}
                  onChange={setCustomContact}
                  placeholder="Enter phone number"
                />
              )}
            </div>
          )}

          {/* Message Content */}
          <div className="space-y-4">
            {communicationType === 'email' && (
              <div>
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  placeholder="Enter email subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
            )}

            <div>
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                placeholder={communicationType === 'email' ? 'Enter your email message' : 'Enter your SMS message (320 characters max)'}
                className="resize-none h-32"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={maxChars}
              />
              <div className="flex justify-between items-center mt-1">
                <p className="text-sm text-muted-foreground">
                  {characterCount}/{maxChars} characters
                </p>
                {communicationType === 'sms' && characterCount > 160 && (
                  <Badge variant="outline" className="text-yellow-600">
                    Multiple SMS ({Math.ceil(characterCount / 160)} parts)
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Options and Send */}
          <div className="flex flex-col lg:flex-row gap-4 items-end">
            <div className="flex gap-4 flex-1">
              <div className="space-y-2">
                <Label className="text-sm">Priority</Label>
                <RadioGroup value={priority} onValueChange={(value: any) => setPriority(value)} className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="normal" id="normal" />
                    <Label htmlFor="normal" className="text-sm">Normal</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="high" id="high" />
                    <Label htmlFor="high" className="text-sm">High</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="urgent" id="urgent" />
                    <Label htmlFor="urgent" className="text-sm">Urgent</Label>
                  </div>
                </RadioGroup>
              </div>

              {communicationType === 'email' && (
                <div className="space-y-2">
                  <Label htmlFor="schedule" className="text-sm">Schedule (Optional)</Label>
                  <Input
                    id="schedule"
                    type="datetime-local"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="text-sm"
                  />
                </div>
              )}
            </div>

            <Button 
              onClick={handleSend} 
              disabled={loading || recipientCount === 0}
              size="lg"
              className="flex items-center gap-2 min-w-40"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {loading ? 'Sending...' : `Send ${communicationType.toUpperCase()}`}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};