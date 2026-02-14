import { useState, useEffect, useRef, useCallback } from 'react';
import QRCode from 'qrcode';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { QrCode, Download, Printer, RefreshCw, Play, Pause, Timer, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface EventQRCodeProps {
  eventId: string;
  eventTitle: string;
  eventQrToken?: string; // Legacy token, kept for backward compatibility
}

export const EventQRCode = ({ eventId, eventTitle }: EventQRCodeProps) => {
  const [open, setOpen] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [encodedUrl, setEncodedUrl] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  
  const rotationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  
  const { toast } = useToast();
  const { user } = useAuth();

  const ROTATE_INTERVAL = 60; // 60 seconds default

  // Generate secure QR code using the RPC function
  const generateSecureQR = useCallback(async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to generate a secure QR code",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await (supabase.rpc as any)('generate_rotating_qr_code', {
        p_event_id: eventId,
        p_created_by: user.id,
        p_rotate_interval_seconds: autoRotate ? ROTATE_INTERVAL : 3600, // 1 hour if not rotating
        p_time_window_enabled: false,
        p_time_window_minutes: 15,
        p_geofence_enabled: false,
        p_geofence_latitude: null,
        p_geofence_longitude: null,
        p_geofence_radius_meters: 100
      });

      if (error) throw error;

      console.log('generate_rotating_qr_code raw response:', JSON.stringify(data));
      
      // The RPC returns a JSON object with qr_token, pin_code, qr_id, expires_at
      const result = (typeof data === 'string' ? JSON.parse(data) : data) as { qr_token: string; pin_code: string; qr_id: string; expires_at: string; token?: string };
      
      // Support both field names for safety
      const tokenValue = result.qr_token || result.token;
      
      if (!tokenValue) {
        console.error('No token found in QR generation response:', result);
        throw new Error('QR token generation failed - no token in response');
      }
      
      console.log('QR token extracted:', tokenValue.substring(0, 20) + '...');
      
      setPinCode(result.pin_code);
      setExpiresAt(new Date(result.expires_at));
      
      // Generate QR image pointing to secure attendance route
      const baseUrl = window.location.hostname.includes('lovable') 
        ? 'https://gleeworld.org' 
        : window.location.origin;
      const attendanceUrl = `${baseUrl}/attendance/scan?token=${encodeURIComponent(tokenValue)}`;
      
      console.log('QR attendance URL:', attendanceUrl);
      setEncodedUrl(attendanceUrl);
      
      const qrDataUrl = await QRCode.toDataURL(attendanceUrl, {
        width: 400,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'H'
      });
      
      setQrCodeUrl(qrDataUrl);
      setCountdown(autoRotate ? ROTATE_INTERVAL : 0);
    } catch (error) {
      console.error('Error generating secure QR code:', error);
      toast({
        title: "Error",
        description: "Failed to generate secure QR code",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [eventId, user, autoRotate, toast]);

  // Start/stop rotation loop
  const startRotation = useCallback(() => {
    setIsRotating(true);
    setCountdown(ROTATE_INTERVAL);
    
    // Countdown timer
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) return ROTATE_INTERVAL;
        return prev - 1;
      });
    }, 1000);
    
    // Rotation timer
    rotationTimerRef.current = setInterval(() => {
      generateSecureQR();
    }, ROTATE_INTERVAL * 1000);
  }, [generateSecureQR]);

  const stopRotation = useCallback(() => {
    setIsRotating(false);
    if (rotationTimerRef.current) {
      clearInterval(rotationTimerRef.current);
      rotationTimerRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  // Generate QR when dialog opens
  useEffect(() => {
    if (open && user) {
      generateSecureQR();
    }
    return () => {
      stopRotation();
    };
  }, [open, user]);

  // Handle auto-rotate toggle
  useEffect(() => {
    if (open && autoRotate && !isRotating) {
      startRotation();
    } else if (!autoRotate && isRotating) {
      stopRotation();
    }
  }, [autoRotate, open, isRotating, startRotation, stopRotation]);

  const downloadQRCode = () => {
    if (!qrCodeUrl) return;
    
    const link = document.createElement('a');
    const safeTitle = eventTitle.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    link.download = `${safeTitle}-qr-code.png`;
    link.href = qrCodeUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Downloaded",
      description: "QR code saved to your downloads",
    });
  };

  const printQRCode = () => {
    if (!qrCodeUrl) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: "Error",
        description: "Please allow popups to print the QR code",
        variant: "destructive",
      });
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code - ${eventTitle}</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              padding: 20px;
              font-family: system-ui, -apple-system, sans-serif;
            }
            img {
              max-width: 400px;
              width: 100%;
            }
            h1 {
              font-size: 24px;
              margin-bottom: 10px;
              text-align: center;
            }
            .pin-container {
              margin-top: 20px;
              padding: 15px 30px;
              background: #f3f4f6;
              border-radius: 8px;
            }
            .pin-label {
              font-size: 14px;
              color: #666;
              margin-bottom: 5px;
            }
            .pin-code {
              font-size: 36px;
              font-weight: bold;
              letter-spacing: 8px;
              font-family: monospace;
            }
            p {
              color: #666;
              font-size: 14px;
              margin-top: 20px;
              text-align: center;
            }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <h1>${eventTitle}</h1>
          <img src="${qrCodeUrl}" alt="Event Check-in QR Code" />
          <div class="pin-container">
            <div class="pin-label">Backup PIN Code</div>
            <div class="pin-code">${pinCode}</div>
          </div>
          <p>Scan QR code or enter PIN to check in</p>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline"
          className="h-auto py-4 flex-col gap-2 hover:bg-secondary/80"
        >
          <QrCode className="h-5 w-5 text-muted-foreground" />
          <span className="font-medium">QR Code</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center flex items-center justify-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Secure Attendance QR
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            Scan to check in to <strong>{eventTitle}</strong>
          </p>
          
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="flex flex-col items-center gap-2">
                <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                <span className="text-muted-foreground">Generating secure QR...</span>
              </div>
            </div>
          ) : qrCodeUrl ? (
            <div className="space-y-4">
              {/* QR Code Display */}
              <div className="flex justify-center">
                <div className="p-4 bg-white rounded-lg shadow-sm border">
                  <img 
                    src={qrCodeUrl} 
                    alt="Secure Check-in QR Code" 
                    className="w-56 h-56"
                  />
                </div>
              </div>
              
              {/* PIN Code Display */}
              <div className="flex flex-col items-center">
                <span className="text-xs text-muted-foreground mb-1">Backup PIN</span>
                <div className="bg-secondary px-6 py-3 rounded-lg">
                  <span className="text-3xl font-mono font-bold tracking-[0.3em]">
                    {pinCode}
                  </span>
                </div>
              </div>
              
              {/* Auto-rotate toggle and countdown */}
              <div className="flex items-center justify-between px-4 py-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Switch
                    id="auto-rotate"
                    checked={autoRotate}
                    onCheckedChange={setAutoRotate}
                  />
                  <Label htmlFor="auto-rotate" className="text-sm">
                    Auto-rotate ({ROTATE_INTERVAL}s)
                  </Label>
                </div>
                
                {autoRotate && isRotating && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Timer className="h-3 w-3" />
                    {countdown}s
                  </Badge>
                )}
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-2 justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={generateSecureQR}
                  disabled={loading}
                  className="gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  Regenerate
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadQRCode}
                  disabled={loading || !qrCodeUrl}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={printQRCode}
                  disabled={loading || !qrCodeUrl}
                  className="gap-2"
                >
                  <Printer className="h-4 w-4" />
                  Print
                </Button>
              </div>
            </div>
          ) : null}
          
          <p className="text-xs text-muted-foreground text-center">
            This QR code links to the secure attendance system with PIN backup.
          </p>
          {encodedUrl && (
            <p className="text-[10px] text-muted-foreground text-center break-all px-2 max-h-12 overflow-auto">
              Debug URL: {encodedUrl.substring(0, 80)}...
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
