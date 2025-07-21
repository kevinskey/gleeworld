
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { MessageSquare, Send, Loader2 } from 'lucide-react';

const SMSTestComponent = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [message, setMessage] = useState('Test SMS from Spelman Glee Club notification system');
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const validatePhoneNumber = (phone: string) => {
    // Basic phone number validation
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phone.replace(/\s|-|\(|\)/g, ''));
  };

  const formatPhoneNumber = (phone: string) => {
    // Remove non-numeric characters except +
    const cleaned = phone.replace(/[^\d+]/g, '');
    // Add + if not present and doesn't start with +
    if (!cleaned.startsWith('+')) {
      return '+1' + cleaned;
    }
    return cleaned;
  };

  const handleSendSMS = async () => {
    if (!phoneNumber || !message) {
      toast({
        title: "Error",
        description: "Please enter both phone number and message",
        variant: "destructive",
      });
      return;
    }

    const formattedPhone = formatPhoneNumber(phoneNumber);
    
    if (!validatePhoneNumber(formattedPhone)) {
      toast({
        title: "Error",
        description: "Please enter a valid phone number",
        variant: "destructive",
      });
      return;
    }

    setSending(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('gw-send-sms', {
        body: {
          to: formattedPhone,
          message: message
        }
      });

      if (error) {
        throw error;
      }

      if (data.success) {
        toast({
          title: "Success",
          description: `SMS sent successfully to ${formattedPhone}`,
        });
        console.log('SMS sent successfully:', data);
      } else {
        throw new Error(data.error || 'Failed to send SMS');
      }
    } catch (error) {
      console.error('SMS sending error:', error);
      toast({
        title: "Error",
        description: `Failed to send SMS: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          SMS Test
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="phone">Phone Number</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="+1 (555) 123-4567"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Include country code (e.g., +1 for US)
          </p>
        </div>
        
        <div>
          <Label htmlFor="message">Message</Label>
          <Input
            id="message"
            placeholder="Enter test message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={160}
          />
          <p className="text-xs text-muted-foreground mt-1">
            {message.length}/160 characters
          </p>
        </div>
        
        <Button 
          onClick={handleSendSMS} 
          disabled={sending}
          className="w-full"
        >
          {sending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Send Test SMS
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default SMSTestComponent;
