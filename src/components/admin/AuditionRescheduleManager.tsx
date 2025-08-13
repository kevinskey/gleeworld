import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Mail, Calendar, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { sendRescheduleEmail } from '@/utils/sendRescheduleEmail';
import { format, parseISO } from 'date-fns';

interface AuditionerToReschedule {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  audition_date: string;
  audition_time: string;
  status: string;
}

export const AuditionRescheduleManager = () => {
  const [auditioners, setAuditioners] = useState<AuditionerToReschedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  // New audition time windows
  const newAuditionWindows = [
    { date: '2025-08-16', startTime: '14:30', endTime: '16:30', displayTime: '2:30 PM - 4:30 PM' },
    { date: '2025-08-17', startTime: '11:00', endTime: '13:00', displayTime: '11:00 AM - 1:00 PM' }
  ];

  const loadAuditionersNeedingReschedule = async () => {
    setLoading(true);
    try {
      const { data: allAuditioners, error } = await supabase
        .from('gw_auditions')
        .select('id, first_name, last_name, email, audition_date, audition_time, status')
        .neq('status', 'cancelled');

      if (error) throw error;

      // Filter auditioners who need rescheduling (outside new time windows)
      const needingReschedule = allAuditioners?.filter(auditioner => {
        if (!auditioner.audition_date || !auditioner.audition_time) return false;

        const auditionDate = format(parseISO(auditioner.audition_date), 'yyyy-MM-dd');
        const auditionTime = auditioner.audition_time;

        // Check if they're within the new time windows
        const isInNewWindow = newAuditionWindows.some(window => {
          if (auditionDate !== window.date) return false;
          
          // Convert audition time to comparable format
          let timeToCheck = auditionTime;
          if (timeToCheck.includes('PM') || timeToCheck.includes('AM')) {
            // Handle 12-hour format
            const [time, period] = timeToCheck.split(' ');
            const [hours, minutes] = time.split(':');
            let hour24 = parseInt(hours);
            if (period === 'PM' && hour24 !== 12) hour24 += 12;
            if (period === 'AM' && hour24 === 12) hour24 = 0;
            timeToCheck = `${hour24.toString().padStart(2, '0')}:${minutes || '00'}`;
          }

          return timeToCheck >= window.startTime && timeToCheck <= window.endTime;
        });

        return !isInNewWindow;
      }) || [];

      setAuditioners(needingReschedule);
      
      toast({
        title: "Auditioners Loaded",
        description: `Found ${needingReschedule.length} auditioners who need to reschedule`,
      });

    } catch (error) {
      console.error('Error loading auditioners:', error);
      toast({
        title: "Error",
        description: "Failed to load auditioners",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const sendRescheduleEmails = async () => {
    setSending(true);
    try {
      let successCount = 0;
      let errorCount = 0;

      for (const auditioner of auditioners) {
        try {
          const formattedDate = format(parseISO(auditioner.audition_date), 'EEEE, MMMM dd, yyyy');
          
          await sendRescheduleEmail({
            recipientEmail: auditioner.email,
            recipientName: `${auditioner.first_name} ${auditioner.last_name}`,
            currentDate: formattedDate,
            currentTime: auditioner.audition_time,
            copyEmail: 'kpj64110@gmail.com' // Send copy to specified email
          });

          successCount++;
          
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (error) {
          console.error(`Failed to send email to ${auditioner.email}:`, error);
          errorCount++;
        }
      }

      toast({
        title: "Emails Sent",
        description: `Successfully sent ${successCount} emails. ${errorCount > 0 ? `${errorCount} failed.` : ''}`,
        variant: errorCount > 0 ? "destructive" : "default"
      });

    } catch (error) {
      console.error('Error sending emails:', error);
      toast({
        title: "Error",
        description: "Failed to send reschedule emails",
        variant: "destructive"
      });
    } finally {
      setSending(false);
    }
  };

  const formatAuditionDateTime = (date: string, time: string) => {
    try {
      const formattedDate = format(parseISO(date), 'MMM dd');
      return `${formattedDate} at ${time}`;
    } catch {
      return `${date} at ${time}`;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-warning" />
            Audition Reschedule Manager
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">New Audition Windows:</h3>
            <ul className="text-blue-800 space-y-1">
              <li>• <strong>Friday, August 16:</strong> 2:30 PM - 4:30 PM</li>
              <li>• <strong>Saturday, August 17:</strong> 11:00 AM - 1:00 PM</li>
            </ul>
          </div>

          <div className="flex gap-3">
            <Button onClick={loadAuditionersNeedingReschedule} disabled={loading}>
              {loading ? 'Loading...' : 'Load Auditioners Needing Reschedule'}
            </Button>

            {auditioners.length > 0 && (
              <Button 
                onClick={sendRescheduleEmails} 
                disabled={sending}
                variant="destructive"
              >
                <Mail className="w-4 h-4 mr-2" />
                {sending ? 'Sending...' : `Send Reschedule Emails (${auditioners.length})`}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {auditioners.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Auditioners Needing Reschedule ({auditioners.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {auditioners.map((auditioner) => (
                <div key={auditioner.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-medium">{auditioner.first_name} {auditioner.last_name}</p>
                        <p className="text-sm text-muted-foreground">{auditioner.email}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="w-4 h-4" />
                        {formatAuditionDateTime(auditioner.audition_date, auditioner.audition_time)}
                      </div>
                      <Badge variant="outline" className="mt-1">
                        {auditioner.status}
                      </Badge>
                    </div>
                    <Clock className="w-4 h-4 text-warning" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};