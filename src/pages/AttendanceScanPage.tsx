import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  QrCode, 
  CheckCircle, 
  XCircle, 
  User,
  Calendar,
  Clock,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';

const AttendanceScanPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [error, setError] = useState<string>('');
  
  const token = searchParams.get('token');

  // Debug logging
  console.log('AttendanceScanPage mounted:', { 
    token: token ? token.substring(0, 10) + '...' : 'none',
    user: !!user,
    userEmail: user?.email 
  });

  useEffect(() => {
    console.log('AttendanceScanPage useEffect triggered:', { token: !!token, user: !!user });
    if (token && user) {
      processAttendanceScan();
    }
  }, [token, user]);

  const processAttendanceScan = async () => {
    if (!token || !user) return;

    setLoading(true);
    setError('');

    try {
      console.log('Processing QR attendance scan:', { token: token.substring(0, 10) + '...', userId: user.id });

      // Call the secure scanning function
      const { data, error } = await supabase.rpc('process_qr_attendance_scan', {
        qr_token_param: token,
        user_id_param: user.id,
        scan_location_param: null,
        user_agent_param: navigator.userAgent,
        ip_address_param: null
      });

      if (error) throw error;

      if (!data) {
        throw new Error('No response from server');
      }

      const result = typeof data === 'object' && data !== null && !Array.isArray(data) 
        ? data as any 
        : { success: false, message: 'Invalid response format' };

      console.log('Scan result:', result);
      setScanResult(result);

      if (result.success) {
        toast({
          title: "Attendance Recorded!",
          description: result.message || "Your attendance has been successfully recorded.",
        });
      } else {
        setError(result.message || 'Failed to record attendance');
        toast({
          title: "Scan Failed",
          description: result.message || "Failed to record attendance",
          variant: "destructive",
        });
      }

    } catch (err) {
      console.error('Error processing attendance scan:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      toast({
        title: "Scan Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Login Required
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              You need to be logged in to record attendance.
            </p>
            <Button 
              onClick={() => navigate(`/auth?returnTo=${encodeURIComponent(window.location.href)}`)} 
              className="w-full"
            >
              Sign In to Record Attendance
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              Invalid QR Code
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              This QR code doesn't contain a valid attendance token.
            </p>
            <Button 
              onClick={() => navigate('/dashboard')} 
              className="w-full"
            >
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            QR Code Attendance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading && (
            <div className="text-center py-6">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Processing attendance scan...</p>
            </div>
          )}

          {error && (
            <Alert className="border-red-200 bg-red-50">
              <XCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {scanResult && !loading && (
            <div className="space-y-4">
              {scanResult.success ? (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    {scanResult.message || 'Attendance recorded successfully!'}
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="border-red-200 bg-red-50">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    {scanResult.message || 'Failed to record attendance'}
                  </AlertDescription>
                </Alert>
              )}

              {scanResult.event_info && (
                <Card className="bg-muted/50">
                  <CardContent className="pt-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{scanResult.event_info.title}</span>
                      </div>
                      {scanResult.event_info.start_date && (
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(scanResult.event_info.start_date), 'PPp')}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          Recorded for {user.email}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <Button 
              onClick={() => navigate('/dashboard')} 
              variant="outline"
              className="flex-1"
            >
              Dashboard
            </Button>
            <Button 
              onClick={() => navigate('/member/attendance')} 
              className="flex-1"
            >
              View Attendance
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AttendanceScanPage;