import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { QRAttendanceScanner } from '@/components/attendance/QRAttendanceScanner';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const COURSE_ROUTES: Record<string, string> = {
  'a0000000-0000-0000-0000-000000000070': '/academy/mus-070',
  '23c4ee3c-7bbb-4534-8c0a-eecd88298d37': '/academy/mus-240',
  'a0000000-0000-0000-0000-000000000210': '/academy/mus-210',
  'a0000000-0000-0000-0000-000000000001': '/academy/mus-001',
  'a0000000-0000-0000-0000-0000000e0101': '/academy/glee-101',
  'a0000000-0000-0000-0000-0000000e0000': '/academy/glee-000',
  'a0000000-0000-0000-0000-000000000100': '/academy/lh-100',
};

const QRScannerPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [autoProcessing, setAutoProcessing] = useState(false);
  const [autoResult, setAutoResult] = useState<any>(null);
  const [autoError, setAutoError] = useState('');

  useEffect(() => {
    if (token && user && !autoProcessing && !autoResult && !autoError) {
      processTokenDirectly();
    }
  }, [token, user]);

  const processTokenDirectly = async () => {
    if (!token || !user) return;
    setAutoProcessing(true);

    try {
      console.log('QRScannerPage: auto-processing token from URL', token.substring(0, 15) + '...');

      const { data, error } = await supabase.rpc('process_qr_checkout_scan', {
        p_qr_token: token,
        p_user_id: user.id,
        p_user_agent: navigator.userAgent,
      });

      if (error) throw error;
      if (!data) throw new Error('No response from server');

      let result: any;
      if (typeof data === 'string') {
        try { result = JSON.parse(data); } catch { result = { success: false, message: 'Invalid response' }; }
      } else {
        result = data;
      }

      console.log('QRScannerPage auto-process result:', result);
      setAutoResult(result);

      if (result.success) {
        const isCheckout = result.checkout === true;
        const isInRehearsal = result.status === 'in_rehearsal';

        toast({
          title: isCheckout ? "✅ Attendance Confirmed" : isInRehearsal ? "🎵 Checked In — In Rehearsal" : "Attendance Recorded",
          description: isCheckout
            ? `You're marked present for ${result.event_title || 'this session'}. Redirecting...`
            : isInRehearsal
            ? `Scan the checkout QR at end of class to confirm attendance. Redirecting...`
            : `Successfully marked for ${result.event_title || 'this event'}. Redirecting...`,
        });

        const courseRoute = result.course_id ? COURSE_ROUTES[result.course_id] : null;
        const target = courseRoute || '/dashboard?module=glee-academy';

        setTimeout(() => {
          navigate(target, { replace: true });
        }, 1200);
      } else {
        setAutoError(result.message || 'Failed to record attendance');
      }
    } catch (err) {
      console.error('QRScannerPage auto-process error:', err);
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setAutoError(msg);
      toast({ title: "Scan Error", description: msg, variant: "destructive" });
    } finally {
      setAutoProcessing(false);
    }
  };

  // If token is in URL, show auto-processing UI instead of camera
  if (token) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="max-w-md mx-auto">
          <Card>
            <CardContent className="pt-6">
              {autoProcessing && (
                <div className="flex flex-col items-center gap-4 py-8">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  <p className="text-lg font-medium">Processing check-in...</p>
                </div>
              )}
              {autoResult?.success && (
                <div className="flex flex-col items-center gap-4 py-8 text-center">
                  <CheckCircle className="h-12 w-12 text-primary" />
                  <p className="text-lg font-semibold">{autoResult.message}</p>
                  <p className="text-sm text-muted-foreground">Redirecting to your course...</p>
                </div>
              )}
              {autoError && (
                <div className="flex flex-col items-center gap-4 py-8 text-center">
                  <XCircle className="h-12 w-12 text-destructive" />
                  <p className="text-lg font-semibold">Check-in Failed</p>
                  <p className="text-sm text-muted-foreground">{autoError}</p>
                  <div className="flex flex-col gap-2 w-full">
                    {autoResult?.course_id && COURSE_ROUTES[autoResult.course_id] ? (
                      <Button onClick={() => navigate(COURSE_ROUTES[autoResult.course_id])} className="w-full">
                        Back to Class
                      </Button>
                    ) : (
                      <Button onClick={() => navigate('/dashboard?module=glee-academy')} className="w-full">
                        Back to Academy
                      </Button>
                    )}
                    <Button onClick={() => { setAutoError(''); setAutoResult(null); }} variant="outline" className="w-full">
                      Try Camera Scanner
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Scan for Attendance</h1>
          <p className="text-muted-foreground">
            Use your device camera to scan QR codes and mark your attendance at events.
          </p>
        </div>
        
        <QRAttendanceScanner />
      </div>
    </div>
  );
};

export default QRScannerPage;
