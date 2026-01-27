import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { QrCode, RefreshCw, Clock, AlertCircle } from 'lucide-react';
import QRCode from 'qrcode';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface AttendanceQRDisplayProps {
  sessionId: string;
  generateToken?: (sessionId: string, expiresInMinutes?: number) => Promise<{ qr_token: string; expires_at: string } | undefined>;
  isSessionOpen: boolean;
}

export const AttendanceQRDisplay: React.FC<AttendanceQRDisplayProps> = ({
  sessionId,
  generateToken,
  isSessionOpen,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const refreshQR = useCallback(async () => {
    if (!isSessionOpen || !user) return;
    
    setLoading(true);
    try {
      // Use the new unified generate_session_qr_code function
      const { data, error } = await supabase.rpc('generate_session_qr_code', {
        p_session_id: sessionId,
        p_generated_by: user.id,
        p_expires_in_minutes: 2, // 2 minute expiry for rotating QR
      });

      if (error) throw error;

      const result = data as { success: boolean; qr_token?: string; expires_at?: string; error?: string };
      
      if (result?.success && result.qr_token) {
        setToken(result.qr_token);
        setExpiresAt(new Date(result.expires_at!));
        
        // Use production domain for QR codes
        const baseUrl = window.location.hostname.includes('lovable') 
          ? 'https://gleeworld.lovable.app' 
          : window.location.origin;
        const checkInUrl = `${baseUrl}/qr-scanner?token=${encodeURIComponent(result.qr_token)}`;
        const dataUrl = await QRCode.toDataURL(checkInUrl, {
          width: 300,
          margin: 2,
          color: { dark: '#000000', light: '#ffffff' },
        });
        setQrDataUrl(dataUrl);
      } else if (generateToken) {
        // Fallback to legacy generateToken if provided
        const legacyResult = await generateToken(sessionId, 2);
        if (legacyResult) {
          setToken(legacyResult.qr_token);
          setExpiresAt(new Date(legacyResult.expires_at));
          
          const baseUrl = window.location.hostname.includes('lovable') 
            ? 'https://gleeworld.lovable.app' 
            : window.location.origin;
          const checkInUrl = `${baseUrl}/attendance/check-in?token=${legacyResult.qr_token}&session=${sessionId}`;
          const dataUrl = await QRCode.toDataURL(checkInUrl, {
            width: 300,
            margin: 2,
            color: { dark: '#000000', light: '#ffffff' },
          });
          setQrDataUrl(dataUrl);
        }
      }
    } catch (error) {
      console.error('Error generating QR:', error);
      toast({ title: 'Error', description: 'Failed to generate QR code', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [sessionId, generateToken, isSessionOpen, toast, user]);

  // Auto-refresh QR before expiry
  useEffect(() => {
    if (!isSessionOpen) return;
    
    refreshQR();
    
    // Refresh every 90 seconds (before 2-minute expiry)
    const refreshInterval = setInterval(refreshQR, 90000);
    
    return () => clearInterval(refreshInterval);
  }, [refreshQR, isSessionOpen]);

  // Countdown timer
  useEffect(() => {
    if (!expiresAt) return;
    
    const updateTimer = () => {
      const now = new Date();
      const diff = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));
      setTimeLeft(diff);
    };
    
    updateTimer();
    const timerInterval = setInterval(updateTimer, 1000);
    
    return () => clearInterval(timerInterval);
  }, [expiresAt]);

  if (!isSessionOpen) {
    return (
      <Card className="bg-muted/50">
        <CardContent className="p-8 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Session must be open to display QR code</p>
        </CardContent>
      </Card>
    );
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-lg">
          <span className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-primary" />
            Scan to Check In
          </span>
          <Badge variant={timeLeft > 30 ? 'default' : 'destructive'} className="font-mono">
            <Clock className="h-3 w-3 mr-1" />
            {formatTime(timeLeft)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        {loading ? (
          <div className="w-[300px] h-[300px] flex items-center justify-center bg-muted rounded-lg">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : qrDataUrl ? (
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <img src={qrDataUrl} alt="Attendance QR Code" className="w-[300px] h-[300px]" />
          </div>
        ) : (
          <div className="w-[300px] h-[300px] flex items-center justify-center bg-muted rounded-lg">
            <p className="text-muted-foreground">No QR code generated</p>
          </div>
        )}
        
        <Button
          variant="outline"
          size="sm"
          onClick={refreshQR}
          disabled={loading}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Now
        </Button>
        
        <p className="text-xs text-muted-foreground text-center">
          QR code auto-refreshes every 90 seconds for security
        </p>
      </CardContent>
    </Card>
  );
};
