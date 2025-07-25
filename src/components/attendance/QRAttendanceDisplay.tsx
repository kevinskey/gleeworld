import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import QRCode from 'qrcode';
import { 
  QrCode, 
  Download, 
  RefreshCw, 
  Users, 
  Eye,
  Clock,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';

interface QRCodeData {
  id: string;
  qr_token: string;
  generated_at: string;
  expires_at: string;
  scan_count: number;
  is_active: boolean;
}

interface QRAttendanceDisplayProps {
  eventId: string;
  eventTitle: string;
  onScanUpdate?: () => void;
}

export const QRAttendanceDisplay: React.FC<QRAttendanceDisplayProps> = ({
  eventId,
  eventTitle,
  onScanUpdate
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [qrCode, setQrCode] = useState<QRCodeData | null>(null);
  const [qrImageData, setQrImageData] = useState<string>('');
  const [generating, setGenerating] = useState(false);
  const [expiryMinutes, setExpiryMinutes] = useState(60);
  const [liveScans, setLiveScans] = useState<any[]>([]);
  const [showLiveUpdates, setShowLiveUpdates] = useState(false);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    loadExistingQRCode();
  }, [eventId]);

  useEffect(() => {
    let channel: any = null;
    
    if (qrCode && showLiveUpdates) {
      // Set up real-time subscription for scan updates
      channel = supabase
        .channel('qr-scans')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'gw_attendance_qr_scans',
            filter: `qr_code_id=eq.${qrCode.id}`
          },
          (payload) => {
            console.log('New scan detected:', payload);
            loadRecentScans();
            onScanUpdate?.();
          }
        )
        .subscribe();
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [qrCode, showLiveUpdates, onScanUpdate]);

  const loadExistingQRCode = async () => {
    if (!eventId) return;

    try {
      const { data, error } = await supabase
        .from('gw_attendance_qr_codes')
        .select('*')
        .eq('event_id', eventId)
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setQrCode(data);
        await generateQRImage(data.qr_token);
        if (showLiveUpdates) {
          loadRecentScans();
        }
      }
    } catch (error) {
      console.error('Error loading existing QR code:', error);
    }
  };

  const generateNewQRCode = async () => {
    if (!user || !eventId) return;

    setGenerating(true);
    try {
      // Generate new QR token using the database function
      const { data: tokenData, error: tokenError } = await supabase.rpc('generate_qr_token', {
        event_id_param: eventId
      });

      if (tokenError) throw tokenError;

      const token = tokenData as string;
      const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000).toISOString();

      // Create QR code record
      const { data: qrData, error: qrError } = await supabase
        .from('gw_attendance_qr_codes')
        .insert({
          event_id: eventId,
          qr_token: token,
          generated_by: user.id,
          expires_at: expiresAt
        })
        .select()
        .single();

      if (qrError) throw qrError;

      setQrCode(qrData);
      await generateQRImage(token);

      toast({
        title: "QR Code Generated",
        description: `New QR code created, expires in ${expiryMinutes} minutes`,
      });

    } catch (error) {
      console.error('Error generating QR code:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate QR code",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const generateQRImage = async (token: string) => {
    try {
      const qrDataURL = await QRCode.toDataURL(token, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
      setQrImageData(qrDataURL);
    } catch (error) {
      console.error('Error generating QR image:', error);
    }
  };

  const loadRecentScans = async () => {
    if (!qrCode) return;

    try {
      const { data, error } = await supabase
        .from('gw_attendance_qr_scans')
        .select(`
          *,
          gw_profiles!inner(full_name, avatar_url)
        `)
        .eq('qr_code_id', qrCode.id)
        .order('scanned_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setLiveScans(data || []);
    } catch (error) {
      console.error('Error loading recent scans:', error);
    }
  };

  const deactivateQRCode = async () => {
    if (!qrCode) return;

    try {
      const { error } = await supabase
        .from('gw_attendance_qr_codes')
        .update({ is_active: false })
        .eq('id', qrCode.id);

      if (error) throw error;

      setQrCode(null);
      setQrImageData('');
      toast({
        title: "QR Code Deactivated",
        description: "QR code has been deactivated",
      });

    } catch (error) {
      console.error('Error deactivating QR code:', error);
      toast({
        title: "Deactivation Failed",
        description: "Failed to deactivate QR code",
        variant: "destructive",
      });
    }
  };

  const downloadQRCode = () => {
    if (!qrImageData) return;

    const link = document.createElement('a');
    link.download = `${eventTitle}-qr-code.png`;
    link.href = qrImageData;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isExpired = qrCode ? new Date(qrCode.expires_at) <= new Date() : false;
  const timeRemaining = qrCode ? Math.max(0, Math.floor((new Date(qrCode.expires_at).getTime() - Date.now()) / 1000 / 60)) : 0;

  return (
    <div className="space-y-6">
      {/* QR Code Generation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            QR Code for {eventTitle}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!qrCode || isExpired ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="expiry">Expiry (minutes)</Label>
                  <Input
                    id="expiry"
                    type="number"
                    value={expiryMinutes}
                    onChange={(e) => setExpiryMinutes(parseInt(e.target.value) || 60)}
                    min={5}
                    max={480}
                  />
                </div>
              </div>
              
              <Button 
                onClick={generateNewQRCode} 
                disabled={generating}
                className="w-full"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <QrCode className="h-4 w-4 mr-2" />
                    Generate QR Code
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* QR Code Display */}
              <div className="flex justify-center">
                <div className="bg-white p-4 rounded-lg border">
                  {qrImageData && (
                    <img 
                      src={qrImageData} 
                      alt="QR Code" 
                      className="w-64 h-64"
                    />
                  )}
                </div>
              </div>

              {/* QR Code Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label>Generated</Label>
                  <p>{format(new Date(qrCode.generated_at), 'MMM dd, h:mm a')}</p>
                </div>
                <div>
                  <Label>Expires</Label>
                  <p>{format(new Date(qrCode.expires_at), 'MMM dd, h:mm a')}</p>
                </div>
                <div>
                  <Label>Scan Count</Label>
                  <p>{qrCode.scan_count} scans</p>
                </div>
                <div>
                  <Label>Time Remaining</Label>
                  <p className={timeRemaining < 10 ? 'text-red-600 font-medium' : ''}>
                    {timeRemaining} minutes
                  </p>
                </div>
              </div>

              {timeRemaining < 10 && (
                <Alert className="border-orange-200 bg-orange-50">
                  <Clock className="h-4 w-4" />
                  <AlertDescription>
                    QR code expires soon! Generate a new one if needed.
                  </AlertDescription>
                </Alert>
              )}

              {/* Controls */}
              <div className="flex gap-2">
                <Button onClick={downloadQRCode} variant="outline" className="flex-1">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button 
                  onClick={() => setShowLiveUpdates(!showLiveUpdates)} 
                  variant="outline"
                  className="flex-1"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  {showLiveUpdates ? 'Hide' : 'Show'} Live Updates
                </Button>
                <Button onClick={deactivateQRCode} variant="destructive" className="flex-1">
                  Deactivate
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Live Scan Updates */}
      {showLiveUpdates && qrCode && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Recent Scans ({liveScans.length})
            </CardTitle>
            <Button onClick={loadRecentScans} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {liveScans.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No scans yet. QR code is ready for scanning.
              </p>
            ) : (
              <div className="space-y-2">
                {liveScans.map((scan) => (
                  <div key={scan.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                        <Users className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium">{scan.gw_profiles?.full_name || 'Unknown'}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(scan.scanned_at), 'h:mm:ss a')}
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-green-100 text-green-800">
                      Present
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};