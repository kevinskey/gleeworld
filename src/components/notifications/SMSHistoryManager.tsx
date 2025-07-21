import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MessageSquare, Phone, Send, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNotificationDelivery } from '@/hooks/useNotificationDelivery';
import PhoneNumberInput from '@/components/notifications/PhoneNumberInput';
import SMSDeliveryStatus from '@/components/notifications/SMSDeliveryStatus';

export const SMSHistoryManager = () => {
  const { toast } = useToast();
  const { deliveryLogs, loading, sendSMSNotification } = useNotificationDelivery();
  const [sending, setSending] = useState(false);
  const [smsData, setSmsData] = useState({
    phoneNumber: '',
    message: '',
  });

  const smsDeliveryLogs = deliveryLogs.filter(log => log.delivery_method === 'sms');

  const handleSendSMS = async () => {
    if (!smsData.phoneNumber.trim() || !smsData.message.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in both phone number and message",
        variant: "destructive",
      });
      return;
    }

    setSending(true);
    try {
      const success = await sendSMSNotification(smsData.phoneNumber, smsData.message);
      if (success) {
        setSmsData({ phoneNumber: '', message: '' });
      }
    } catch (error) {
      console.error('Error sending SMS:', error);
    } finally {
      setSending(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'sent':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'sent':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'pending':
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Send New SMS */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Send SMS Notification
          </CardTitle>
          <CardDescription>
            Send text messages to members with instant delivery tracking
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="phone">Phone Number</Label>
            <PhoneNumberInput
              value={smsData.phoneNumber}
              onChange={(value) => setSmsData(prev => ({ ...prev, phoneNumber: value }))}
              placeholder="Enter phone number"
            />
          </div>

          <div>
            <Label htmlFor="sms-message">Message</Label>
            <Textarea
              id="sms-message"
              placeholder="Enter your SMS message (160 characters recommended)"
              value={smsData.message}
              onChange={(e) => setSmsData(prev => ({ ...prev, message: e.target.value }))}
              maxLength={320}
            />
            <p className="text-sm text-muted-foreground mt-1">
              {smsData.message.length}/320 characters
            </p>
          </div>

          <div className="flex justify-end">
            <Button 
              onClick={handleSendSMS}
              disabled={sending || !smsData.phoneNumber || !smsData.message}
              className="flex items-center gap-2"
            >
              <Send className="h-4 w-4" />
              {sending ? 'Sending...' : 'Send SMS'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* SMS History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            SMS Delivery History
          </CardTitle>
          <CardDescription>
            Track all SMS notifications and their delivery status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Loading SMS history...</p>
            </div>
          ) : smsDeliveryLogs.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No SMS messages sent yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {smsDeliveryLogs.map((log) => (
                <div key={log.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(log.status)}
                      <Badge className={getStatusColor(log.status)}>
                        {log.status.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(log.created_at).toLocaleDateString()} at{' '}
                      {new Date(log.created_at).toLocaleTimeString()}
                    </div>
                  </div>

                   <SMSDeliveryStatus 
                     notification_id={log.notification_id}
                     delivery_method="sms"
                   />

                  {log.error_message && (
                    <div className="bg-red-50 border border-red-200 rounded p-3">
                      <p className="text-sm text-red-800">
                        <strong>Error:</strong> {log.error_message}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    {log.sent_at && (
                      <div>
                        <span className="font-medium">Sent:</span>
                        <p className="text-muted-foreground">
                          {new Date(log.sent_at).toLocaleString()}
                        </p>
                      </div>
                    )}
                    {log.delivered_at && (
                      <div>
                        <span className="font-medium">Delivered:</span>
                        <p className="text-muted-foreground">
                          {new Date(log.delivered_at).toLocaleString()}
                        </p>
                      </div>
                    )}
                    {log.external_id && (
                      <div>
                        <span className="font-medium">Message ID:</span>
                        <p className="text-muted-foreground font-mono text-xs">
                          {log.external_id}
                        </p>
                      </div>
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